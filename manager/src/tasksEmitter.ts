import { Channel, connect, Connection, ConsumeMessage, Replies } from 'amqplib';
import { logger } from './logger.js';

interface ITasksEmitter {
    init(): Promise<void>;
    getConsumersCount(): Promise<number>;
    consumeResult(resultCallback: (result: object) => Promise<void>): Promise<void>;
    emitTask(taskData: object, expirationLimit: number): boolean;
}

class TasksEmiter implements ITasksEmitter {
    private _connection: Connection | null = null;
    private _channel: Channel | null = null;

    private exchangeName: string = process.env['RMQ_EXCHANGE']!;
    private tasksResultConsumeQueue: string = process.env['RMQ_RESULT_QUEUE']!;
    private tasksEmitQueue: string = process.env['RMQ_EMIT_QUEUE']!;
    private tasksEmitRoutingKey: string = process.env['RMQ_TASK_EMIT_KEY']!;
    private tasksResultBindingKey: string = process.env['RMQ_TASK_RESULT_KEY']!;

    async init(): Promise<void> {
        try {
            this._connection = await connect(process.env['RMQ_CONNECT_URL']!);
            this._channel = await this.initChannel();
            await this.initBindings();
        } catch(err) {
            logger.error(err);
        }
    }

    async getConsumersCount(): Promise<number> {
        return (await this.channel.assertQueue(this.tasksEmitQueue, { durable: true }))
            .consumerCount;
    }

    async consumeResult(resultCallback: (result: object) => Promise<void>): Promise<void> {
        const consumeCallback = async (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const result = JSON.parse(msg.content.toString());
            try {
                await resultCallback(result);
            } catch(err) {
                logger.error(err);
                this.channel.nack(msg);
                return;
            }

            this.channel.ack(msg);
        };

        await this.channel.consume(
            this.tasksResultConsumeQueue,
            consumeCallback,
            { noAck: false },
        );
    }

    emitTask(taskData: object, expirationLimit: number): boolean {
        const data = JSON.stringify(taskData);

        return this.channel.publish(
            this.exchangeName,
            this.tasksEmitRoutingKey,
            Buffer.from(data),
            {
                persistent: true,
                expiration: expirationLimit,
            },
        );
    }

    protected async initChannel(): Promise<Channel> {
        if (!this._connection) {
            throw Error('Connection to message broker unavailable now.');
        }

        const channel = await this._connection.createChannel();
        channel.prefetch(1);

        return channel;
    }

    protected get channel(): Channel {
        if (!this._channel) {
            throw Error('Channel not initialized yet.');
        }
        return this._channel;
    }


    protected async initBindings() {
        await Promise.all([
            this.channel.assertQueue(this.tasksResultConsumeQueue, { durable: true }),
            this.channel.assertExchange(this.exchangeName, 'direct', { durable: true }),
        ]);

        await this.channel.bindQueue(
            this.tasksResultConsumeQueue,
            this.exchangeName,
            this.tasksResultBindingKey,
        );
    }
}

let tasksEmitter: ITasksEmitter;

const getTasksEmitter = (): ITasksEmitter => {
    if (!tasksEmitter) {
        tasksEmitter = new TasksEmiter();
    }
    return tasksEmitter;
};

export { getTasksEmitter, ITasksEmitter };
