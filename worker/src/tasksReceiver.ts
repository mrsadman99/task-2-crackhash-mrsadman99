import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import { errorLogger, logger } from './logger.js';

interface ITasksReceiver {
    init(): Promise<void>;
    consumeEmit(emitCallback: (taskData: object) => Promise<object | null>): Promise<void>;
    consumeStopTask(stopCallback: (requestId: string) => void): Promise<void>;
}

class TasksReceiver implements ITasksReceiver {
    private _connection: Connection | null = null;
    private _channel: Channel | null = null;

    private directExchange: string = process.env['RMQ_DIRECT_EXCHANGE']!;
    private fanoutExchange: string = process.env['RMQ_FANOUT_EXCHANGE']!;

    private tasksStopConsumeQueue: string = process.env['RMQ_STOP_QUEUE']!;
    private tasksEmitConsumeQueue: string = process.env['RMQ_EMIT_QUEUE']!;

    private tasksResultRoutingKey: string = process.env['RMQ_TASK_RESULT_KEY']!;
    private tasksEmitBindingKey: string = process.env['RMQ_TASK_EMIT_KEY']!;
    private tasksStopBindingKey: string = process.env['RMQ_TASK_STOP_KEY']!;

    async init(): Promise<void> {
        try {
            this._connection = await connect(process.env['RMQ_CONNECT_URL']!);
            this._channel = await this.initChannel();
            this._channel.on('error', (error) => errorLogger.error(`RMQ channel error: ${error}`));
            this._connection.on('error', (error) => errorLogger.error(`RMQ connection error: ${error}`));

            await this.initBindings();
        } catch(err) {
            errorLogger.error(`Failed to init task receiver ${err}`);
        }
    }

    async consumeEmit(emitCallback: (taskData: object) => Promise<object | null>): Promise<void> {
        const consumeCallback = async (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const taskStringData = msg.content.toString();
            const taskData = JSON.parse(taskStringData);
            // Handles compute task
            try {
                const result = await emitCallback(taskData);

                if (!result) {
                    this.channel.ack(msg);
                    return;
                }
                this.channel.ack(msg);
                logger.info(`Message ${taskStringData} succesfully acked.`);

                // Sends response to emitter
                this.publishTaskResult(result);
            } catch(err) {
                errorLogger.error(err);
                this.channel.nack(msg);
                errorLogger.error(`Message ${taskStringData} nacked, error: ${err}`);
            }
        };

        await this.channel.consume(
            this.tasksEmitConsumeQueue,
            consumeCallback,
            { noAck: false },
        );
    }

    async consumeStopTask(stopCallback: (requestId: string) => void): Promise<void> {
        const consumeCallback = (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const requestId = msg.content.toString();
            stopCallback(requestId);
            logger.info(`Task ${requestId} stopped.`);
        };

        await this.channel.consume(this.tasksStopConsumeQueue, consumeCallback, { noAck: true });
    }

    protected publishTaskResult(taskResultData: object): boolean {
        const data = JSON.stringify(taskResultData);

        return this.channel.publish(
            this.directExchange,
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
            this.channel.assertQueue(this.tasksStopConsumeQueue, { durable: true }),
            this.channel.assertExchange(this.directExchange, 'direct', { durable: true }),
            this.channel.assertExchange(this.fanoutExchange, 'fanout', { durable: true }),
        ]);

        await Promise.all([
            this.channel.bindQueue(
                this.tasksEmitConsumeQueue,
                this.directExchange,
                this.tasksEmitBindingKey,
            ),
            this.channel.bindQueue(
                this.tasksStopConsumeQueue,
                this.fanoutExchange,
                this.tasksStopBindingKey,
            ),
        ]);
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
