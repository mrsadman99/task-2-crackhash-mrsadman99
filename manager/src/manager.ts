import axios, { AxiosResponse } from 'axios';
import type { IRepository, TaskData, TaskState } from './repositories/types.d.ts';
import { getRepository as getTaskRepository } from './repositories/TaskRepository.js';
import { v4 as uuid } from 'uuid';

const {
    INTERNAL_WORKER_HOST,
    WORKER_PORT,
} = process.env;
const CREATE_TASK_WORKER_URL = `http://${INTERNAL_WORKER_HOST}:${WORKER_PORT}/internal/api/worker/hash/crack/task`;

// Sets task timout to 10 mins
const TASK_TIMEOUT = 10 * 60 * 1000;

type CreateTaskStatus = { result: 'CREATE' | 'EXIST' };

interface IManager {
    createTask(hash: string, maxLength: number): Promise<TaskState & CreateTaskStatus | null>;
    getTaskStatus(requestId: string): Promise<TaskData | null>;
    saveTaskResult(requestId: string, word: string): Promise<boolean>;
}

class Manager implements IManager {
    private tasksTimeout: { [requestId: string]: NodeJS.Timeout } = {};
    protected taskRepository: IRepository<TaskState> = getTaskRepository();

    async createTask(
        hash: string,
        maxLength: number,
    ): Promise<TaskState & CreateTaskStatus | null> {
        const requestId = uuid();

        const existingTask = await this.getExistingTask(hash);
        if (existingTask) {
            return { ...existingTask, result: 'EXIST' };
        }

        const result = await this.sendTaskToWorker(
            CREATE_TASK_WORKER_URL,
            requestId,
            hash,
            maxLength,
        );
        if (!result) {
            return null;
        }
        const taskState: TaskState = {
            requestId,
            hash,
            status: 'IN_PROGRESS',
            maxLength,
            data: null,
        };

        // Exits from function if task state not inserted into db
        if (!await this.taskRepository.insertOne(taskState)) {
            return null;
        }
        // Sets timeouts for error status task in database
        this.tasksTimeout[requestId] = setTimeout(() => this.updateTask(
            requestId,
            { status: 'ERROR' },
        ), TASK_TIMEOUT);


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

    async saveTaskResult(requestId: string, word: string): Promise<boolean> {
        const isUpdated = await this.updateTask(requestId, { data: word, status: 'READY' });
        if (isUpdated) {
            clearTimeout(this.tasksTimeout[requestId]);
            delete this.tasksTimeout[requestId];
        }

        return isUpdated;
    }

    protected async updateTask(requestId: string, taskState: Partial<TaskState>): Promise<boolean> {
        const updateStatus = await this.taskRepository.updateOne({ requestId }, taskState);

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
        createTaskWorkerUrl: string,
        requestId: string,
        hash: string,
        maxLength: number,
    ): Promise<boolean> {
        // Sends request to worker
        let result: AxiosResponse | null = null;
        try {
            result = await axios.post(createTaskWorkerUrl, {
                requestId,
                hash,
                maxLength,
            });
        } catch (err) {
            return false;
        }

        return result?.status === 200;
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
