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
    createRecruiterOpening(body: {
        email: string;
        position: string;
        location: string;
        workMode: string;
        description: string;
        companyAbout: string;
    }): Promise<{
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
    closeRecruiterOpening(openingId: string, body: {
        email: string;
    }): Promise<{
        id: string;
        status: string;
    }>;
    applyToRecruiterOpening(openingId: string, body: {
        email: string;
        details: Record<string, unknown>;
    }): Promise<{
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
    setApplicationStatus(applicationId: string, body: {
        email: string;
        status: string;
    }): Promise<{
        id: any;
        reviewStatus: any;
    }>;
}
