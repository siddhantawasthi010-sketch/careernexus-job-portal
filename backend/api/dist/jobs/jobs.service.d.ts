import { DatabaseService } from '../database/database.service';
export declare class JobsService {
    private readonly databaseService;
    private readonly providerJobCache;
    private readonly providerRetryAfter;
    constructor(databaseService: DatabaseService);
    getJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getFeaturedJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getCareerPortals(): Promise<import("../database/database.service").CareerPortalRecord[]>;
    getRecommendations(email: string): Promise<{
        jobs: any[];
        updatedAt: string;
        sourcesConfigured: number;
        sourcesFailed: any[];
        diagnostic: string;
        fetchedCount?: undefined;
        matchedCount?: undefined;
        homeMatchCount?: undefined;
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
        diagnostic: string;
    }>;
    private getProfileSearch;
    private getProviders;
    private getProviderJobs;
    private formatProviderFailure;
    private requestJson;
    private createJob;
    private fetchAdzuna;
    private fetchJooble;
    private fetchJSearch;
    private fetchGreenhouse;
    private fetchLever;
    private getWorkdayTenants;
    private fetchWorkday;
    getApplications(email: string): Promise<Record<string, unknown>[]>;
    apply(email: string, job: Record<string, unknown>): Promise<{
        id: string;
        appliedAt: string;
    } | {
        appliedAt: any;
    }>;
    private scoreJob;
}
