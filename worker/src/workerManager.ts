import { getTasksReceiver } from './tasksReceiver.js';
import { Worker } from 'worker_threads';

interface IWorkerManager {
    init(): Promise<void>;
}

class WorkerManager implements IWorkerManager {
    protected tasksReceiver = getTasksReceiver();

    async init(): Promise<void> {
        await this.tasksReceiver.init();
        await this.tasksReceiver.consumeEmit(this.handleWorkerState);
    }

    protected handleWorkerState = async (workerData: object): Promise<object | null> => {
        const data = await new Promise<string | null>((resolve) => {
            const worker = new Worker('./dist/worker.js', { workerData });
            worker.on('message', (data: string) => {
                resolve(data);
            });
            worker.on('exit', () => resolve(null));
            worker.on('error', () => resolve(null));
        });

        if (!data) {
            return null;
        }

        const typedData = workerData as {
            requestId: string;
            partCount: number;
            partNumber: number;
            hash: string;
            maxLength: number;
        };

        return { word: data, requestId: typedData.requestId };
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
