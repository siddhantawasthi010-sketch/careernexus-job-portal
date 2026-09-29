import { OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
export declare class JobsService implements OnModuleInit {
    private readonly databaseService;
    private readonly providerJobCache;
    private readonly providerRetryAfter;
    private readonly logger;
    private feedRefreshRunning;
    private lastFeedRefreshAt;
    private lastFeedRefreshFailures;
    constructor(databaseService: DatabaseService);
    onModuleInit(): void;
    refreshJobFeedsOnSchedule(): Promise<void>;
    getJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getFeaturedJobs(): Promise<import("../database/database.service").JobRecord[]>;
    getCareerPortals(): Promise<import("../database/database.service").CareerPortalRecord[]>;
    getRecommendations(email: string, requestedLimit?: number, requestedOffset?: number): Promise<{
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
    private refreshJobFeeds;
    private syncLearningContentFromJobs;
    private getProfileSearch;
    private getProviders;
    private getProviderJobs;
    private formatProviderFailure;
    private requestJson;
    private createJob;
    private fetchAdzuna;
    private fetchJooble;
    private fetchJSearch;
    private fetchGoogleJobs;
    private fetchArbeitnow;
    private fetchAshby;
    private fetchSmartRecruiters;
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
    getRecruiterOpenings(email: string): Promise<{
        applicantsCount: number;
        id: string;
        recruiterJobId: string;
        source: string;
        sourceId: string;
        title: string;
        company: string;
        location: string;
        type: string;
        jobType: any;
        employmentType: string;
        preferredShift: any;
        description: string;
        companyAbout: string;
        salary: any;
        url: string;
        postedAt: string;
        status: string;
        matchScore: number;
    }[]>;
    createRecruiterOpening(email: string, input: Record<string, unknown>): Promise<{
        applicantsCount: number;
        id: string;
        recruiterJobId: string;
        source: string;
        sourceId: string;
        title: string;
        company: string;
        location: string;
        type: string;
        jobType: any;
        employmentType: string;
        preferredShift: any;
        description: string;
        companyAbout: string;
        salary: any;
        url: string;
        postedAt: string;
        status: string;
        matchScore: number;
    }>;
    closeRecruiterOpening(email: string, openingId: string): Promise<{
        id: string;
        status: string;
    }>;
    applyToRecruiterOpening(email: string, openingId: string, details: Record<string, unknown>): Promise<{
        appliedAt: any;
        applicationDetails: any;
        reviewStatus: any;
    }>;
    getReceivedApplications(email: string): Promise<{
        applicants: {
            matchScore: number;
            candidate: {
                id: unknown;
                name: unknown;
                email: unknown;
                headline: string;
                company: string;
            };
        }[];
        applicantsCount: number;
        id: string;
        recruiterJobId: string;
        source: string;
        sourceId: string;
        title: string;
        company: string;
        location: string;
        type: string;
        jobType: any;
        employmentType: string;
        preferredShift: any;
        description: string;
        companyAbout: string;
        salary: any;
        url: string;
        postedAt: string;
        status: string;
        matchScore: number;
    }[]>;
    getReceivedApplication(email: string, applicationId: string): Promise<{
        id: any;
        job: any;
        appliedAt: any;
        applicationDetails: any;
        reviewStatus: any;
        candidate: {
            id: any;
            name: any;
            email: any;
            profile: Record<string, unknown>;
        };
        resume: {
            resume: {
                storagePath?: string;
            };
            downloadUrl: string;
        };
    }>;
    setApplicationStatus(email: string, applicationId: string, status: string): Promise<{
        id: any;
        reviewStatus: any;
    }>;
    private scoreJob;
}
