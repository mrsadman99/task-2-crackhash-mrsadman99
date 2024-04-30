import { getTasksEmitter, ITasksEmitter } from './tasksEmitter.js';
import type { IRepository, TaskData, TaskState, TaskStatus } from './repositories/types.d.ts';
import { errorLogger } from './logger.js';
import { getRepository as getTaskRepository } from './repositories/TaskRepository.js';
import { Replies } from 'amqplib';
import { v4 as uuid } from 'uuid';

// Sets task timout to 10 mins
const TASK_TIMEOUT = 10 * 60 * 1000;

type CreateTaskStatus = { result: 'CREATE' | 'EXIST' };

interface IManager {
    createTask(hash: string, maxLength: number): Promise<TaskState & CreateTaskStatus | null>;
    getTaskStatus(requestId: string): Promise<TaskData | null>;
    init(): Promise<void>;
}

class Manager implements IManager {
    private tasksTimeout: { [requestId: string]: NodeJS.Timeout } = {};
    protected taskRepository: IRepository<TaskState> = getTaskRepository();
    protected tasksEmitter: ITasksEmitter = getTasksEmitter();

    async init(): Promise<void> {
        await this.tasksEmitter.init();
        await this.tasksEmitter.consumeResult((result: object) => {
            const { requestId, word } = result as { requestId: string; word: string };
            return this.saveTaskResult(requestId, word);
        });
    }

    async createTask(
        hash: string,
        maxLength: number,
    ): Promise<TaskState & CreateTaskStatus | null> {
        const requestId = uuid();

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
        const isUpdated = await this.updateTask(requestId, { data: word, status: 'READY' });
        if (isUpdated) {
            clearTimeout(this.tasksTimeout[requestId]);
            delete this.tasksTimeout[requestId];
        }

        return isUpdated;
    }

    protected async updateTask(requestId: string, taskState: Partial<TaskState>): Promise<boolean> {
        const updateStatus = await this.taskRepository.updateOne(
            { requestId },
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

    protected async sendTaskToWorker(taskMetadata: {
        requestId: string;
        hash: string;
        maxLength: number;
    }): Promise<TaskState | null> {
        const workersCount = await this.tasksEmitter.getConsumersCount();
        const partCount = workersCount > 0 ? workersCount : 1;
        
        return new Promise((resolve) => {
            let status: TaskStatus = 'IN_PROGRESS';
            let confirmedCount = 0;

            const confirmCallback = async (err: unknown, _: Replies.Empty): Promise<void> => {
                if (err) {
                    errorLogger.error(`Failed to push task ${JSON.stringify(taskMetadata, null, 2)}`);
                    status = 'WAITING';
                }
                confirmedCount++;

                // Manipulates with database only when handle all publishing messages
                if (confirmedCount !== workersCount) {
                    return;
                }

                const tmpTaskState = { ...taskMetadata, data: null, status };
                if (await this.taskRepository.insertOne(tmpTaskState)) {
                    // Sets timeout for error status task in database
                    this.tasksTimeout[taskMetadata.requestId] = setTimeout(() => this.updateTask(
                        taskMetadata.requestId,
                        { status: 'ERROR' },
                    ), TASK_TIMEOUT);
        
                    resolve(tmpTaskState);
                }
                resolve(null);
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
                resolve(null);
            }
        });
    }
}

let manager: IManager | null = null;

const getManager = async (): Promise<IManager> => {
    if (!manager) {
        manager = new Manager();
        await manager.init();
    }
    return manager;
};

export { IManager, Manager, getManager };
