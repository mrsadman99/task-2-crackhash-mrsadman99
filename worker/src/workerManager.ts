import { logger } from './logger.js';
import { TasksReceiver } from './tasksReceiver.js';
import { Worker } from 'worker_threads';


class WorkerManager {
    protected init = async (): Promise<void> => {
        await this.tasksReceiver.consumeEmit(this.handleWorkerState, this.handleStopTask);
        await this.tasksReceiver.consumeStopTask(this.handleStopTask);

        logger.info('Succesfully initialized worker manager');
    };
    protected tasksReceiver = new TasksReceiver(this.init);
    protected activeWorkers: { [requestId: string]: Worker } = {};

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

    protected handleStopTask = (data: { requestId: string }) => {
        const { requestId } = data;
        if (requestId in this.activeWorkers) {
            const activeWorker = this.activeWorkers[requestId];
            activeWorker.postMessage({ exit: true, requestId });
        }
    };
}


export { WorkerManager };
