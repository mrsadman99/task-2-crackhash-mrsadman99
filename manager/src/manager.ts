import axios, { AxiosResponse } from 'axios';
import { v4 as uuid } from 'uuid';

type TaskStatus = {
    status: 'IN_PROGRESS' | 'READY' | 'ERROR';
    data: string | null;
};

type CreateTaskStatus = { result: 'CREATE' | 'EXIST' };

type TaskState = {
    requestId: string;
    hash: string;
    maxLength: number;
} & TaskStatus;

interface IManager {
    createTask(createTaskWorkerUrl: string, hash: string, maxLength: number): Promise<TaskState & CreateTaskStatus | null>;
    getTaskStatus(requestId: string): TaskStatus | null;
    saveTaskResult(requestId: string, word: string): boolean;
}

// Sets task timout to 10 mins
const TASK_TIMEOUT = 10 * 60 * 1000;
// Task metadata stores in memory at 30 mins
const TASK_METADATA_TIMEOUT = 30 * 60 * 1000;

class Manager implements IManager {
    private tasksStatus: { [requestId: string]: TaskState & { errTimeoutId: NodeJS.Timeout } } = {};

    async createTask(createTaskWorkerUrl: string, hash: string, maxLength: number): Promise<TaskState & CreateTaskStatus | null> {
        const requestId = uuid();

        // Returns existing task state if task status not ERROR
        const existingTaskState = Object.values(this.tasksStatus).find((taskState) => {
            return taskState.hash === hash && taskState.status !== 'ERROR';
        });

        if (existingTaskState) {
            const { errTimeoutId, ...taskState } = existingTaskState;
            return { ...taskState, result: 'EXIST' };
        }

        const result = await this.sendTaskToWorker(createTaskWorkerUrl, requestId, hash, maxLength);
        if (!result) {
            return null;
        }
        // Sets timeouts for error status and persisting task metadata in memory
        const errTimeoutId = setTimeout(() => this.tasksStatus[requestId].status = 'ERROR', TASK_TIMEOUT);
        setTimeout(() => delete this.tasksStatus[requestId], TASK_METADATA_TIMEOUT);

        const taskState: TaskState = {
            requestId,
            hash,
            status: 'IN_PROGRESS',
            maxLength,
            data: null,
        };
        this.tasksStatus[requestId] = { ...taskState, errTimeoutId };

        return { ...taskState, result: 'CREATE' };
    }

    getTaskStatus(requestId: string): TaskStatus | null {
        const taskStatus = this.tasksStatus[requestId];
        if (!taskStatus) {
            return null;
        }
        const { data, status } = taskStatus;

        return { data, status };
    }

    saveTaskResult(requestId: string, word: string): boolean {
        if (requestId in this.tasksStatus) {
            const taskStatus = this.tasksStatus[requestId];
            clearTimeout(taskStatus.errTimeoutId);

            taskStatus.data = word;
            taskStatus.status = 'READY';

            return true;
        }

        return false;
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
