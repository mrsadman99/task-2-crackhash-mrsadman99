import {
    Collection,
    Document,
    Filter,
    InsertOneResult,
    OptionalUnlessRequiredId,
    UpdateFilter,
    UpdateResult,
    WithId,
} from 'mongodb';
import { getClient } from './Client.js';
import type { IRepository } from './types.d.ts';

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
        try {
            const result = (await this.getCollection()).findOne(filter);
            return result;
        } catch {
            return null;
        }
    }

    async insertOne(data: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T> | null> {
        try {
            const result = (await this.getCollection()).insertOne(data);
            return result;
        } catch {
            return null;
        }
    }

    async updateOne(filter: Filter<T>, data: UpdateFilter<T>): Promise<UpdateResult<T> | null> {
        try {
            const result = (await this.getCollection()).updateOne(filter, data);
            return result;
        } catch {
            return null;
        }
    }
}

export { BaseRepository };
