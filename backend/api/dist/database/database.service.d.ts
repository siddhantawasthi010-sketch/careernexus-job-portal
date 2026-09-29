export type UserRole = 'candidate' | 'recruiter';
export interface StoredUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profile: Record<string, unknown>;
    updated_at: string;
}
export interface ConnectPersonRecord {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    headline: string;
    company: string;
}
export interface ConnectionRequestRecord {
    id: string;
    requester_user_id: string;
    recipient_user_id: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    updated_at: string;
}
export interface StoredOtp {
    otp_hash: string;
    role: UserRole;
    expires_at: string;
    sent_at: string;
}
export interface JobRecord {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string;
    salary: string | null;
    featured: boolean;
}
export interface CareerPortalRecord {
    slug: string;
    companyName: string;
    industry: string;
    careerUrl: string;
}
export interface FeedJobRecord {
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
    matchScore: number;
}
export interface LibraryTopicRecord {
    id: number;
    name: string;
    briefDescription: string;
    explanation: string;
    example: string;
}
export interface CourseRecord {
    id: number;
    title: string;
    topic: string;
    provider: string;
    level: string;
    duration: string;
    url: string;
}
export declare class DatabaseService {
    private readonly client;
    constructor();
    getUserByEmail(email: string): Promise<StoredUser | null>;
    private getConnectIdentity;
    private toConnectPerson;
    private getConnectionRequestsForUser;
    searchConnectPeople(email: string, role: UserRole, query: string): Promise<{
        connectionState: string;
        requestId: string;
        id: string;
        name: string;
        email: string;
        role: UserRole;
        headline: string;
        company: string;
    }[]>;
    getConnectionOverview(email: string): Promise<{
        incoming: any[];
        outgoing: any[];
        connections: any[];
    }>;
    createConnectionRequest(email: string, targetEmail: string): Promise<{
        request: ConnectionRequestRecord;
        state: "connected";
    } | {
        request: ConnectionRequestRecord;
        state: "sent" | "received";
    }>;
    respondToConnectionRequest(email: string, requestId: string, status: 'accepted' | 'declined'): Promise<ConnectionRequestRecord>;
    getCandidateJobSearchProfiles(): Promise<Record<string, unknown>[]>;
    upsertUser(user: {
        email: string;
        name: string;
        role: UserRole;
    }): Promise<StoredUser>;
    updateUserProfile(email: string, profile: Record<string, unknown>): Promise<StoredUser>;
    updateUserProfilePhoto(email: string, photo: string): Promise<StoredUser>;
    private ensureResumeBucket;
    uploadUserResume(email: string, file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }): Promise<{
        resume: any;
        downloadUrl: string;
        updated_at: any;
    }>;
    getUserResume(email: string): Promise<{
        resume: {
            storagePath?: string;
        };
        downloadUrl: string;
    }>;
    deleteUserResume(email: string): Promise<{
        updated_at: any;
    }>;
    getLatestOtp(email: string): Promise<StoredOtp | null>;
    createOtp(otp: {
        email: string;
        otp_hash: string;
        role: UserRole;
        expires_at: string;
        sent_at: string;
    }): Promise<void>;
    deleteOtps(email: string): Promise<void>;
    getJobs(featured?: boolean): Promise<JobRecord[]>;
    getCareerPortals(): Promise<CareerPortalRecord[]>;
    saveFeedJobs(jobs: FeedJobRecord[]): Promise<void>;
    deleteStaleFeedJobs(source: string, fetchedAfter: string): Promise<void>;
    getRecentFeedJobs(): Promise<FeedJobRecord[]>;
    getUserJobApplications(email: string): Promise<Record<string, unknown>[]>;
    applyUserToJob(email: string, job: Record<string, unknown>): Promise<{
        id: string;
        appliedAt: string;
    } | {
        appliedAt: any;
    }>;
    getLibraryTopics(): Promise<LibraryTopicRecord[]>;
    getCourses(): Promise<CourseRecord[]>;
    addMissingJobLearningContent(topics: Omit<LibraryTopicRecord, 'id'>[], courses: Omit<CourseRecord, 'id'>[]): Promise<void>;
}
