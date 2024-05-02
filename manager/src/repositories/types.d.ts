
import type {
    Document,
    Filter,
    InsertOneResult,
    OptionalUnlessRequiredId,
    UpdateResult,
    WithId,
    FindCursor,
} from 'mongodb';

type TaskStatus = 'IN_PROGRESS' | 'READY' | 'ERROR' | 'WAITING';
type TaskData = {
    status: TaskStatus;
    data: string | null;
};
type TaskState = {
    requestId: string;
    hash: string;
    maxLength: number;
} & TaskData;


interface IRepository<T extends Document> {
    findOne(filter: Filter<T>): Promise<WithId<T> | null>;
    find(filter: Filter<T>): Promise<FindCursor<WithId<T>> | null>;
    insertOne(data: OptionalUnlessRequiredId<T>): Promise<InsertOneResult<T> | null>;
    updateOne(filter: Filter<T>, data: UpdateFilter<T>): Promise<UpdateResult<T> | null>;
}

export { TaskState, TaskData, TaskStatus, IRepository };
