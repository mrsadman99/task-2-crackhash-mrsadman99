import { getTasksReceiver } from './tasksReceiver.js';
import { Worker } from 'worker_threads';

interface IWorkerManager {
    init(): Promise<void>;
}

class WorkerManager implements IWorkerManager {
    protected tasksReceiver = getTasksReceiver();
    protected activeWorkers: { [requestId: string]: Worker } = {};

    async init(): Promise<void> {
        await this.tasksReceiver.init();
        await this.tasksReceiver.consumeEmit(this.handleWorkerState);
        await this.tasksReceiver.consumeStopTask(this.handleStopTask);
    }

    protected handleWorkerState = async (workerData: object): Promise<object | null> => {
        const typedData = workerData as {
            requestId: string;
            partCount: number;
            partNumber: number;
            hash: string;
            maxLength: number;
        };

        const data = await new Promise<string | null>((resolve) => {
            const worker = new Worker('./dist/worker.js', { workerData });
            worker.on('message', (data: string) => {
                resolve(data);
            });
            worker.on('exit', () => {
                delete this.activeWorkers[typedData.requestId];
                resolve(null);
            });
            worker.on('error', () => {
                delete this.activeWorkers[typedData.requestId];
                resolve(null);
            });

            this.activeWorkers[typedData.requestId] = worker;
        });

        if (!data) {
            return null;
        }

        return { word: data, requestId: typedData.requestId };
    };

    protected handleStopTask = (requestId: string) => {
        if (requestId in this.activeWorkers) {
            const activeWorker = this.activeWorkers[requestId];
            activeWorker.postMessage({ exit: true, requestId });
        }
    };
}

let workerManager: IWorkerManager;
const getWorkerManager = () => {
    if (!workerManager) {
        workerManager = new WorkerManager();
    }
    return workerManager;
};

export { IWorkerManager, getWorkerManager };
