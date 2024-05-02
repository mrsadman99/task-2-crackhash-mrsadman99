import { errorLogger, logger } from './logger.js';
import type { IRepository, TaskData, TaskState, TaskStatus } from './repositories/types.d.ts';
import { ITasksEmitter, TasksEmiter } from './tasksEmitter.js';
import { Filter } from 'mongodb';
import { getRepository as getTaskRepository } from './repositories/TaskRepository.js';
import { randomUUID } from 'crypto';
import { Replies } from 'amqplib';

// Sets task timout
const TASK_TIMEOUT = 1000 * 60 * Number(process.env['TASK_TIMEOUT_MINS']);

type CreateTaskStatus = { result: 'CREATE' | 'EXIST' };

interface IManager {
    createTask(hash: string, maxLength: number): Promise<TaskState & CreateTaskStatus | null>;
    getTaskStatus(requestId: string): Promise<TaskData | null>;
}

class Manager implements IManager {
    protected sendTaskToDb = async (
        taskState: TaskState,
        existsInDB: boolean,
    ): Promise<TaskState | null> => {
        let dbOpResult = false;
        const { status, requestId } = taskState;

        if (existsInDB && status === 'IN_PROGRESS') {
            dbOpResult =  await this.updateTask(requestId, {}, { status });
        } else if (!existsInDB) {
            dbOpResult = !!await this.taskRepository.insertOne(taskState);
        }

        if (status === 'IN_PROGRESS' && dbOpResult) {
            // Sets timeout for error status task in database
            this.tasksTimeout[taskState.requestId] = setTimeout(() => this.updateTask(
                taskState.requestId,
                {},
                { status: 'ERROR' },
            ), TASK_TIMEOUT);
        }

        if (dbOpResult) {
            logger.info(`Task ${JSON.stringify(taskState, null, 2)} ${existsInDB ? 'updated' : 'saved' } in database.`);
            return taskState;
        }
        return null;
    };

    /**
     * Emits all waiting tasks to workers
     */
    protected emitWaitingTasks = async () => {
        const waitingTasks = await this.taskRepository.find({ status: 'WAITING' });
        if (waitingTasks) {
            for await (const waitingTask of waitingTasks) {
                const { _id, status, data, ...taskState } = waitingTask;
                await this.sendTaskToWorker(taskState, true);
            }
        }
    };

    protected initEmmitterCb = async (): Promise<void> => {
        await this.tasksEmitter.consumeResult((result: object) => {
            const { requestId, word } = result as { requestId: string; word: string };
            return this.saveTaskResult(requestId, word);
        });
        // Emits tasks when emitter initialized
    };

    private tasksTimeout: { [requestId: string]: NodeJS.Timeout } = {};
    protected taskRepository: IRepository<TaskState> = getTaskRepository();
    protected tasksEmitter: ITasksEmitter = new TasksEmiter(
        this.initEmmitterCb,
        this.emitWaitingTasks,
    );

    async createTask(
        hash: string,
        maxLength: number,
    ): Promise<TaskState & CreateTaskStatus | null> {
        const requestId = randomUUID();

        // Checks if task was started earlier
        const existingTask = await this.getExistingTask(hash);
        if (existingTask) {
            return { ...existingTask, result: 'EXIST' };
        }
        const taskMetadata = {
            requestId,
            hash,
            maxLength,
        };

        // Sends task to worker
        const result = await this.sendTaskToWorker(taskMetadata);
        if (!result) {
            return null;
        }

        return { ...result, result: 'CREATE' };
    }

    async getTaskStatus(requestId: string): Promise<TaskData | null> {
        const taskStatus = await this.taskRepository.findOne({ requestId });
        if (!taskStatus) {
            return null;
        }
        const { data, status } = taskStatus;

        return { data, status };
    }

    protected async saveTaskResult(requestId: string, word: string): Promise<boolean> {
        const isUpdated = await this.updateTask(requestId, { status: 'IN_PROGRESS' }, { data: word, status: 'READY' });
        if (isUpdated) {
            clearTimeout(this.tasksTimeout[requestId]);
            delete this.tasksTimeout[requestId];
        }

        return isUpdated;
    }

    protected async updateTask(
        requestId: string,
        filter: Filter<TaskState>,
        taskState: Partial<TaskState>,
    ): Promise<boolean> {
        const updateStatus = await this.taskRepository.updateOne(
            { requestId, ...filter },
            { $set: taskState },
        );

        return updateStatus !== null;
    }

    protected async getExistingTask(hash: string): Promise<TaskState | undefined> {
        // Returns existing task state if task status not ERROR
        const existingTaskState = await this.taskRepository.findOne({
            hash,
            status: { '$ne': 'ERROR' },
        });

        if (existingTaskState) {
            const { _id, ...taskState } = existingTaskState;
            return taskState;
        }
    }

    protected sendTaskToWorker(taskMetadata: {
        requestId: string;
        hash: string;
        maxLength: number;
    }, existsInDB = false): Promise<TaskState | null> {
        const workersCount = this.tasksEmitter.consumersCount;
        const partCount = workersCount > 0 ? workersCount : 1;

        return new Promise((resolve) => {
            let status: TaskStatus = 'IN_PROGRESS';
            let confirmedCount = 0;
            const taskMetadataString = JSON.stringify(taskMetadata, null, 2);
            const errorMsg = `Failed to push task ${JSON.stringify(taskMetadata, null, 2)} into queue`;

            const confirmCallback = (err: unknown, _: Replies.Empty): void => {
                confirmedCount++;
                if (err) {
                    errorLogger.error(errorMsg);
                    status = 'WAITING';
                }

                if (confirmedCount === partCount) {
                    const confirmStatus = status === 'WAITING' ? 'Failed' : 'Success';
                    logger.info(`${confirmStatus} to publish confirm task ${taskMetadataString}.`);
                }
                // Manipulates with database only when handle all publishing messages
                // or task exists in Database and have status waiting
                if (confirmedCount !== partCount || (existsInDB && status === 'WAITING')) {
                    return;
                }

                resolve(this.sendTaskToDb({ ...taskMetadata, data: null, status }, existsInDB));
            };

            try {
                // Sends request to workers
                for (let partNumber = 1; partNumber <= partCount; partNumber++) {
                    this.tasksEmitter.emitTask({
                        ...taskMetadata,
                        partNumber,
                        partCount,
                    }, TASK_TIMEOUT, confirmCallback);
                }
            } catch (err) {
                errorLogger.error(`${errorMsg}, error: ${err}`);

                if (existsInDB) {
                    resolve(null);
                    return;
                }
                resolve(this.sendTaskToDb({ ...taskMetadata, data: null, status: 'WAITING' }, false));
            }
        });
    }
}

let manager: IManager | null = null;

const getManager = (): IManager => {
    if (!manager) {
        manager = new Manager();
    }
    return manager;
};

export { IManager, Manager, getManager };
