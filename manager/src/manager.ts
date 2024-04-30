import { getTasksEmitter, ITasksEmitter } from './tasksEmitter.js';
import type { IRepository, TaskData, TaskState } from './repositories/types.d.ts';
import { errorLogger } from './logger.js';
import { getRepository as getTaskRepository } from './repositories/TaskRepository.js';
import { v4 as uuid } from 'uuid';

const TASK_TIMEOUT = 60 * 1000 * Number(process.env['TASK_TIMEOUT_MINS']);

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
        try {
            await this.tasksEmitter.init();
            await this.tasksEmitter.consumeResult((result: object): Promise<boolean> => {
                const { requestId, word } = result as { requestId: string; word: string };
                return this.saveTaskResult(requestId, word);
            });
        }catch(err) {
            errorLogger.error(`Failed to init task emitter error: ${err}`);
        }
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

        // Inserts task into database
        const taskState: TaskState = {
            requestId,
            hash,
            status: 'IN_PROGRESS',
            maxLength,
            data: null,
        };
        if (!await this.taskRepository.insertOne(taskState)) {
            return null;
        }

        // Sets timeout for error status task in database
        this.tasksTimeout[requestId] = setTimeout(() => this.updateTask(
            requestId,
            { status: 'ERROR' },
        ), TASK_TIMEOUT);

        // Sends task to worker
        const result = await this.sendTaskToWorker(
            requestId,
            hash,
            maxLength,
        );
        if (!result) {
            return null;
        }

        return { ...taskState, result: 'CREATE' };
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
        if (!word) {
            return false;
        }

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

    protected async sendTaskToWorker(
        requestId: string,
        hash: string,
        maxLength: number,
    ): Promise<boolean> {
        const workersCount = await this.tasksEmitter.getConsumersCount();
        const partCount = workersCount > 0 ? workersCount : 1;
        const taskMetadata = {
            requestId,
            hash,
            maxLength,
            partCount,
        };
        let partNumber = 1;

        try {
            // Sends request to workers
            for (; partNumber <= partCount; partNumber++) {
                this.tasksEmitter.emitTask({ ...taskMetadata, partNumber }, TASK_TIMEOUT);
            }
            return true;
        } catch (err) {
            errorLogger.error(`Failed to post task ${{ ...taskMetadata, partNumber }}`);
            return false;
        }
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
