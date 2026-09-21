import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    getJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getFeaturedJobs(): Promise<import("../database/database.service").JobRecord[]>;
}
