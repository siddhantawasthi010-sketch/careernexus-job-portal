import { JobsService } from './jobs.service';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    getJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getFeaturedJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getCareerPortals(): Promise<import("../database/database.service").CareerPortalRecord[]>;
    getRecommendations(email: string, limit?: string, offset?: string): Promise<{
        jobs: any[];
        updatedAt: string;
        sourcesConfigured: number;
        sourcesFailed: any[];
        diagnostic: string;
        fetchedCount?: undefined;
        matchedCount?: undefined;
        homeMatchCount?: undefined;
        limit?: undefined;
        offset?: undefined;
        hasMore?: undefined;
        nextOffset?: undefined;
    } | {
        jobs: {
            matchScore: number;
            id: string;
            source: string;
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
        sourcesFailed: {
            source: string;
            message: string;
        }[];
        fetchedCount: number;
        matchedCount: number;
        homeMatchCount: number;
        limit: number;
        offset: number;
        hasMore: boolean;
        nextOffset: number;
        diagnostic: string;
    }>;
    getApplications(email: string): Promise<Record<string, unknown>[]>;
    apply(body: {
        email: string;
        job: Record<string, unknown>;
    }): Promise<{
        id: string;
        appliedAt: string;
    } | {
        appliedAt: any;
    }>;
}
