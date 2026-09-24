export type UserRole = 'candidate' | 'recruiter';
export interface StoredUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profile: Record<string, unknown>;
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
    getLibraryTopics(): Promise<LibraryTopicRecord[]>;
    getCourses(): Promise<CourseRecord[]>;
}
