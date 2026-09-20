export declare class JobsService {
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
