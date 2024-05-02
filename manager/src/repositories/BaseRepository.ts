import {
    Collection,
    Document,
    Filter,
    FindCursor,
    InsertOneResult,
    OptionalUnlessRequiredId,
    UpdateFilter,
    UpdateResult,
    WithId,
} from 'mongodb';
import { getClient } from './Client.js';
import type { IRepository } from './types.d.ts';
import { dbLoger, errorLogger } from '../logger.js';

const { MONGO_DB_NAME } = process.env;

class BaseRepository<T extends Document> implements IRepository<T> {
    private collectionName: string;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
    }

    protected async getCollection(): Promise<Collection<T>> {
        return (await getClient()).db(MONGO_DB_NAME).collection(this.collectionName, {
            readConcern: 'majority',
            writeConcern: { w: 'majority' },
        });
    }

    async findOne(filter: Filter<T>): Promise<WithId<T> | null> {
        const filterString = JSON.stringify(filter, null, 2);

        try {
            const result = (await this.getCollection()).findOne(filter);
            const resultString = JSON.stringify(result, null, 2);
            dbLoger.info(`Succesfully find document, filter: ${filterString}, result: ${resultString}`);

            return result;
        } catch (err) {
            errorLogger.error(`Failed to find document in DB, filter: ${filterString}, error: ${err}`);
            return null;
        }
    }

    async find(filter: Filter<T>): Promise<FindCursor<WithId<T>> | null> {
        const filterString = JSON.stringify(filter, null, 2);

        try {
            const result = (await this.getCollection()).find(filter);
            const resultString = JSON.stringify(result, null, 2);
            dbLoger.info(`Succesfully find documents, filter: ${filterString}, result: ${resultString}`);

            return result;
        } catch (err) {
            errorLogger.error(`Failed to find documents in DB, filter: ${filterString}, error: ${err}`);
            return null;
        }
    }

    async insertOne(data: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T> | null> {
        const dataString = JSON.stringify(data, null, 2);

        try {
            const result = (await this.getCollection()).insertOne(data);
            const resultString = JSON.stringify(result, null, 2);
            dbLoger.info(`Succesfully insert document, data: ${dataString}, result: ${resultString}`);

            return result;
        } catch (err) {
            errorLogger.error(`Failed to insert document, data: ${dataString}, error: ${err}`);
            return null;
        }
    }

    async updateOne(filter: Filter<T>, data: UpdateFilter<T>): Promise<UpdateResult<T> | null> {
        const dataString = JSON.stringify(data, null, 2);
        const filterString = JSON.stringify(filter, null, 2);

        try {
            const result = (await this.getCollection()).updateOne(filter, data);
            dbLoger.info(`Succesfully update document, data: ${dataString}, filter: ${filterString}`);

            return result;
        } catch (err) {
            errorLogger.error(`Failed to update document, data: ${dataString}, filter: ${filterString}, error: ${err}`);
            return null;
        }
    }
}

export { BaseRepository };
