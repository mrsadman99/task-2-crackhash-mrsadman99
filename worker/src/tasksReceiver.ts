import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import { errorLogger, logger } from './logger.js';

interface ITasksReceiver {
    init(): Promise<void>;
    consumeEmit(emitCallback: (taskData: object) => Promise<object | null>): Promise<void>;
}

class TasksReceiver implements ITasksReceiver {
    private _connection: Connection | null = null;
    private _channel: Channel | null = null;

    private exchangeName: string = process.env['RMQ_EXCHANGE']!;
    private tasksEmitConsumeQueue: string = process.env['RMQ_EMIT_QUEUE']!;
    private tasksResultRoutingKey: string = process.env['RMQ_TASK_RESULT_KEY']!;
    private tasksEmitBindingKey: string = process.env['RMQ_TASK_EMIT_KEY']!;

    async init(): Promise<void> {
        try {
            this._connection = await connect(process.env['RMQ_CONNECT_URL']!);
            this._channel = await this.initChannel();
            await this.initBindings();
        } catch(err) {
            errorLogger.error(err);
        }
    }

    async consumeEmit(emitCallback: (taskData: object) => Promise<object | null>): Promise<void> {
        const consumeCallback = (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const taskStringData = msg.content.toString();
            const taskData = JSON.parse(taskStringData);
            // Handles compute task
            emitCallback(taskData).then(result => {
                if (!result) {
                    this.channel.nack(msg);
                    logger.info(`Message ${taskStringData} nacked.`);
                    return;
                }
                this.channel.ack(msg);
                logger.info(`Message ${taskStringData} succesfully acked.`);
    
                // Sends response to emitter
                this.publishTaskResult(result);
            }).catch(err => {
                errorLogger.error(err);
                this.channel.nack(msg);
                errorLogger.error(`Message ${taskStringData} nacked, error: ${err}`);
            });

        };

        await this.channel.consume(
            this.tasksEmitConsumeQueue,
            consumeCallback,
            { noAck: false },
        );
    }

    protected publishTaskResult(taskResultData: object): boolean {
        const data = JSON.stringify(taskResultData);

        return this.channel.publish(
            this.exchangeName,
            this.tasksResultRoutingKey,
            Buffer.from(data),
            { persistent: true },
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
            this.channel.assertQueue(this.tasksEmitConsumeQueue, { durable: true }),
            this.channel.assertExchange(this.exchangeName, 'direct', { durable: true }),
        ]);

        await this.channel.bindQueue(
            this.tasksEmitConsumeQueue,
            this.exchangeName,
            this.tasksEmitBindingKey,
        );
    }
}

let tasksReceiver: ITasksReceiver;

const getTasksReceiver = (): ITasksReceiver => {
    if (!tasksReceiver) {
        tasksReceiver = new TasksReceiver();
    }
    return tasksReceiver;
};

export { getTasksReceiver, ITasksReceiver };
