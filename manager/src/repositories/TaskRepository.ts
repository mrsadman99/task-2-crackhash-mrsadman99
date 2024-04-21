import type { IRepository, TaskState } from './types.d.ts';
import { BaseRepository } from './BaseRepository.js';

class TaskRepository extends BaseRepository<TaskState> {
    constructor() {
        super('tasks');
    }
}

let repository: IRepository<TaskState>;
const getRepository = () => {
    if (!repository) {
        repository = new TaskRepository();
    }
    return repository;
};

export { getRepository };
