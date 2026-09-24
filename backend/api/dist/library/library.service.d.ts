import { DatabaseService } from '../database/database.service';
export declare class LibraryService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getTopics(): Promise<import("../database/database.service").LibraryTopicRecord[]>;
}
