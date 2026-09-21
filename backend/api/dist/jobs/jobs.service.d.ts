import { DatabaseService } from '../database/database.service';
export declare class JobsService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getFeaturedJobs(): Promise<import("../database/database.service").JobRecord[]>;
}
