import { ConfirmChannel, connect, Connection, ConsumeMessage, Replies } from 'amqplib';
import { errorLogger, logger } from './logger.js';

interface ITasksEmitter {
    get consumersCount(): number;
    consumeResult(resultCallback: (result: object) => Promise<boolean>): Promise<void>;
    emitTask(
        taskData: object,
        expirationLimit: number,
        confirmCallback: (err: unknown, _: Replies.Empty) => void
    ): boolean;
}

type HeartBeatStatus = 'ALIVE' | 'INIT' | 'BROKE';

class TasksEmiter implements ITasksEmitter {
    private _connection: Connection | null = null;
    private _channel: ConfirmChannel | null = null;

    private directExchange: string = process.env['RMQ_DIRECT_EXCHANGE']!;

    private tasksResultConsumeQueue: string = process.env['RMQ_RESULT_QUEUE']!;
    private tasksEmitQueue: string = process.env['RMQ_EMIT_QUEUE']!;

    private tasksEmitRoutingKey: string = process.env['RMQ_TASK_EMIT_KEY']!;
    private tasksResultBindingKey: string = process.env['RMQ_TASK_RESULT_KEY']!;
    private tasksStopRoutingKey: string = process.env['RMQ_TASK_STOP_KEY']!;
    private _consumersCount: number = 0;

    constructor(initCb: () => Promise<void>, aliveCb: () => Promise<void>) {
        const emitterHeartbeat = async () => {
            const heartBeatStatus = await this.heartbeatCb();
            if (heartBeatStatus === 'ALIVE') {
                await aliveCb();
            } else if (heartBeatStatus === 'INIT') {
                await initCb();
                await aliveCb();
            }
        };

        emitterHeartbeat();
        setInterval(emitterHeartbeat, 60 * 1000 * Number(process.env['RMQ_CONNECTION_CHECK_MINS']));
    }

    protected heartbeatCb = async (): Promise<HeartBeatStatus> => {
        try {
            try {
                const emitQueueResults = await this._channel?.checkQueue(this.tasksEmitQueue);
                if (emitQueueResults) {
                    this._consumersCount = emitQueueResults.consumerCount;
                    await this.initBindings();
        
                    logger.info(`Heartbeat tasks emitter consumers count ${this._consumersCount}`);
                    return 'ALIVE';
                }
            } catch (err) {
                this._consumersCount = 0;
                errorLogger.error(`Heartbeat broken, error: ${err}`);
            }

            let isConnectionUpdate = false;
            let isChannelUpdate = false;
            if (!this._connection) {
                this._connection = await connect(process.env['RMQ_CONNECT_URL']!);
                isConnectionUpdate = true;
            }
            if (!this._channel) {
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
                });
                this._channel.on('error', (error) => {
                    errorLogger.error(`RMQ channel error: ${error}`);
                    this._channel = null;
                });
            }

            await this.initBindings();
            if (isChannelUpdate) {
                await this.channel.recover();
            }

            logger.info('Completely inits tasks emitter.');
            return 'INIT';
        } catch(err) {
            errorLogger.error(`Failed to init task receiver ${err}`);
            return 'BROKE';
        }
    };

    get consumersCount(): number {
        return this._consumersCount;
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
                        this.directExchange,
                        this.tasksStopRoutingKey,
                        Buffer.from(result.requestId),
                        { persistent: false },
                    );
                    logger.info(`Task ${result.requestId} completed.`);
                }

            } catch (err) {
                try {
                    errorLogger
                        .error(`Task result from ${this.tasksResultConsumeQueue} nacked, error: ${err}`);
                    this.channel.nack(msg);
                } catch (rmqError){
                    errorLogger.error(`Task result from ${this.tasksResultConsumeQueue} cannot processed, error: ${rmqError}`);
                }
            }
        };

        await this.channel.consume(
            this.tasksResultConsumeQueue,
            consumeCallback,
            { noAck: false },
        );
    }

    emitTask(
        taskData: object,
        expirationLimit: number,
        confirmCallback: (err: unknown, _: Replies.Empty) => void,
    ): boolean {
        const data = JSON.stringify(taskData);

        return this.channel.publish(
            this.directExchange,
            this.tasksEmitRoutingKey,
            Buffer.from(data),
            {
                persistent: true,
                expiration: expirationLimit,
            },
            confirmCallback,
        );
    }

    protected async initChannel(): Promise<ConfirmChannel> {
        if (!this._connection) {
            throw Error('Connection to message broker unavailable now.');
        }

        const channel = await this._connection.createConfirmChannel();
        channel.prefetch(1);

        return channel;
    }

    protected get channel(): ConfirmChannel {
        if (!this._channel) {
            throw Error('ConfirmChannel not initialized yet.');
        }
        return this._channel;
    }


    protected async initBindings() {
        await Promise.all([
            this.channel.assertQueue(this.tasksResultConsumeQueue, { durable: true }),
            this.channel.assertExchange(this.directExchange, 'direct', { durable: true }),
        ]);

        await this.channel.bindQueue(
            this.tasksResultConsumeQueue,
            this.directExchange,
            this.tasksResultBindingKey,
        );
    }
}

export { TasksEmiter, ITasksEmitter };
