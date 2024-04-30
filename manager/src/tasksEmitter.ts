import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import { errorLogger, logger } from './logger.js';

interface ITasksEmitter {
    init(): Promise<void>;
    getConsumersCount(): Promise<number>;
    consumeResult(resultCallback: (result: object) => Promise<boolean>): Promise<void>;
    emitTask(taskData: object, expirationLimit: number): boolean;
}

class TasksEmiter implements ITasksEmitter {
    private _connection: Connection | null = null;
    private _channel: Channel | null = null;

    private directExchange: string = process.env['RMQ_DIRECT_EXCHANGE']!;
    private fanoutExchange: string = process.env['RMQ_FANOUT_EXCHANGE']!;

    private tasksResultConsumeQueue: string = process.env['RMQ_RESULT_QUEUE']!;
    private tasksEmitQueue: string = process.env['RMQ_EMIT_QUEUE']!;

    private tasksEmitRoutingKey: string = process.env['RMQ_TASK_EMIT_KEY']!;
    private tasksResultBindingKey: string = process.env['RMQ_TASK_RESULT_KEY']!;
    private tasksStopRoutingKey: string = process.env['RMQ_TASK_STOP_KEY']!;

    async init(): Promise<void> {
        try {
            this._connection = await connect(process.env['RMQ_CONNECT_URL']!);
            this._channel = await this.initChannel();
            this._channel.on('error', (error) => errorLogger.error(`RMQ channel error: ${error}`));
            this._connection.on('error', (error) => errorLogger.error(`RMQ connection error: ${error}`));

            await this.initBindings();
        } catch(err) {
            errorLogger.error(`Failed to init task emitter error: ${err}`);
        }
    }

    async getConsumersCount(): Promise<number> {
        try {
            return (await this.channel.checkQueue(this.tasksEmitQueue)).consumerCount;
        } catch {
            return 0;
        }
    }

    async consumeResult(resultCallback: (result: object) => Promise<boolean>): Promise<void> {
        const consumeCallback = async (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const result: { requestId: string; word: string } = JSON.parse(msg.content.toString());
            try {
                const isUpdated = await resultCallback(result);
                this.channel.ack(msg);

                // Push stop message to other workers with current task if gets word
                if (result.word && isUpdated) {
                    this.channel.publish(
                        this.fanoutExchange,
                        this.tasksStopRoutingKey,
                        Buffer.from(result.requestId),
                        { persistent: true },
                    );
                    logger.info(`Task ${result.requestId} completes.`);
                }

            } catch(err) {
                errorLogger
                    .error(`Message from ${this.tasksResultConsumeQueue} nacked, error: ${err}`);
                this.channel.nack(msg);
                return;
            }
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
            this.directExchange,
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
            this.channel.assertExchange(this.directExchange, 'direct', { durable: true }),
            this.channel.assertExchange(this.fanoutExchange, 'fanout', { durable: true }),
        ]);

        await this.channel.bindQueue(
            this.tasksResultConsumeQueue,
            this.directExchange,
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
