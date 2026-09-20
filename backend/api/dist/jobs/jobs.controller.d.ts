import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    getJobs(): {
        id: number;
        title: string;
        company: string;
        location: string;
        type: string;
        salary: string;
    }[];
    getFeaturedJobs(): {
        id: number;
        title: string;
        company: string;
        location: string;
        type: string;
    }[];
}
