import { Channel, connect, Connection, ConsumeMessage } from 'amqplib';
import { errorLogger, logger } from './logger.js';

interface ITasksReceiver {
    consumeEmit(
        emitCallback: (taskData: object) => Promise<object | null>,
        stopCb: () => void): Promise<void>;
    consumeStopTask(stopCallback: (data: { requestId: string }) => void): Promise<void>;
}

type HeartBeatStatus = 'ALIVE' | 'INIT' | 'BROKE';

class TasksReceiver implements ITasksReceiver {
    private _connection: Connection | null = null;
    private _channel: Channel | null = null;

    private directExchange: string = process.env['RMQ_DIRECT_EXCHANGE']!;

    private tasksStopConsumeQueue: string = '';
    private tasksEmitConsumeQueue: string = process.env['RMQ_EMIT_QUEUE']!;

    private tasksResultRoutingKey: string = process.env['RMQ_TASK_RESULT_KEY']!;
    private tasksEmitBindingKey: string = process.env['RMQ_TASK_EMIT_KEY']!;
    private tasksStopBindingKey: string = process.env['RMQ_TASK_STOP_KEY']!;

    private completedTasks: string[] = [];

    constructor(initCallback: () => Promise<void>) {
        setInterval(async () => {
            const heartBeatStatus = await this.heartbeatCb();
            if (heartBeatStatus === 'INIT') {
                await initCallback();
            }
        }, 60 * 1000* Number(process.env['RMQ_CONNECTION_CHECK_MINS']));
    }

    protected heartbeatCb = async (): Promise<HeartBeatStatus> => {
        try {
            try {
                if (await this._channel?.checkQueue(this.tasksEmitConsumeQueue)) {
                    await this.initBindings();
                    return 'ALIVE';
                }
            } catch (err) {
                errorLogger.error(`Heartbeat broken, error: ${err}`);
            }

            let isConnectionUpdate = false;
            let isChannelUpdate = false;
            if (!this._connection) {
                this._connection = await connect(process.env['RMQ_CONNECT_URL']!);
                isConnectionUpdate = true;
            }
            if (!this._channel || isConnectionUpdate) {
                this._channel = await this.initChannel();
                isChannelUpdate = true;
            }

            if (isConnectionUpdate) {
                this._connection.on('close', () => {
                    logger.info('RMQ connection closed.');
                    this._connection = null;
                });
                this._connection.on('error', (error) => {
                    errorLogger.error(`RMQ connection error: ${error}`);
                    this._connection = null;
                });
            }
            if (isChannelUpdate) {
                this._channel.on('close', () => {
                    logger.info('RMQ channel closed.');
                    this._channel = null;
                    this.tasksStopConsumeQueue = '';
                });
                this._channel.on('error', (error) => {
                    errorLogger.error(`RMQ channel error: ${error}`);
                    this._channel = null;
                });
            }

            await this.initBindings();
            if (isChannelUpdate) {
                await this._channel.recover();
            }

            return 'INIT';
        } catch(err) {
            errorLogger.error(`Failed to init task receiver ${err}`);
            return 'BROKE';
        }
    };

    async consumeEmit(
        emitCallback: (taskData: object) => Promise<object | null>,
        stopCb: (taskData: { requestId: string }) => void,
    ): Promise<void> {
        const consumeCallback = async (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const taskStringData = msg.content.toString();
            const taskData = JSON.parse(taskStringData);
            // Handles compute task
            try {
                const result = await emitCallback(taskData);
                stopCb(taskData);

                if (!result) {
                    this.channel.ack(msg);
                    logger.info(`Message ${taskStringData} succesfully acked.`);
                    return;
                }

                this.channel.ack(msg);
                logger.info(`Message ${taskStringData} succesfully acked.`);

                // Sends response to emitter
                this.publishTaskResult(result);
            } catch(err) {
                try {
                    this.channel.nack(msg);
                    errorLogger.error(`Message ${taskStringData} nacked, error: ${err}`);
                } catch(rmqError) {
                    errorLogger.error(`Task consumption ${taskStringData} failed, error: ${err}`);
                }

                stopCb(taskData);
            }
        };

        await this.channel.consume(
            this.tasksEmitConsumeQueue,
            consumeCallback,
            { noAck: false, priority: 1 },
        );
    }

    /** Stops task part if emitter sends message about it */
    async consumeStopTask(stopCallback: (data: { requestId: string }) => void): Promise<void> {
        const consumeCallback = (msg: ConsumeMessage | null) => {
            if (!msg) {
                return;
            }

            const requestId = msg.content.toString();
            if (!this.completedTasks.includes(requestId)) {
                stopCallback({ requestId });
                logger.info(`Task ${requestId} stopped.`);
            } else {
                const currentTaskIndex = this.completedTasks.indexOf(requestId);
                this.completedTasks.splice(currentTaskIndex, 1);
            }
        };

        await this.channel.consume(this.tasksStopConsumeQueue, consumeCallback, {
            priority: 2,
            noAck: true,
        });
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

        const channel = await this._connection.createConfirmChannel();
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
            this.channel.assertExchange(this.directExchange, 'direct', { durable: true }),
        ]);

        if (!this.tasksStopConsumeQueue) {
            const { queue } = await this.channel.assertQueue('', { durable: false, exclusive: true });
            this.tasksStopConsumeQueue = queue;
        }

        await Promise.all([
            this.channel.bindQueue(
                this.tasksEmitConsumeQueue,
                this.directExchange,
                this.tasksEmitBindingKey,
            ),
            this.channel.bindQueue(
                this.tasksStopConsumeQueue,
                this.directExchange,
                this.tasksStopBindingKey,
            ),
        ]);
    }
}

export { TasksReceiver, ITasksReceiver };
