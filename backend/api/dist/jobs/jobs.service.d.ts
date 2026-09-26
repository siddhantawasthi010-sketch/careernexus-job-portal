import { DatabaseService } from '../database/database.service';
export declare class JobsService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getFeaturedJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getRecommendations(email: string): Promise<{
        jobs: {
            matchScore: number;
            id: string;
            source: "Greenhouse" | "Lever";
            sourceId: string;
            title: string;
            company: string;
            location: string;
            type: string;
            jobType: string | null;
            employmentType: string | null;
            preferredShift: string | null;
            description: string;
            salary: string | null;
            url: string;
            postedAt: string | null;
        }[];
        updatedAt: string;
        sourcesConfigured: number;
    }>;
    getApplications(email: string): Promise<Record<string, unknown>[]>;
    apply(email: string, job: Record<string, unknown>): Promise<{
        id: string;
        appliedAt: string;
    } | {
        appliedAt: any;
    }>;
    private fetchGreenhouse;
    private fetchLever;
    private scoreJob;
}
