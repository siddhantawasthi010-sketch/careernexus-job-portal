export type UserRole = 'candidate' | 'recruiter';
export interface StoredUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profile: Record<string, unknown>;
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
    getUserJobApplications(email: string): Promise<Record<string, unknown>[]>;
    applyUserToJob(email: string, job: Record<string, unknown>): Promise<{
        id: string;
        appliedAt: string;
    } | {
        appliedAt: any;
    }>;
    getLibraryTopics(): Promise<LibraryTopicRecord[]>;
    getCourses(): Promise<CourseRecord[]>;
}
