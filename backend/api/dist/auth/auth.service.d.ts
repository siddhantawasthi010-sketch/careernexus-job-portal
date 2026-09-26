import { EmailService } from '../email/email.service';
import { DatabaseService, UserRole } from '../database/database.service';
export declare class AuthService {
    private readonly emailService;
    private readonly databaseService;
    private readonly otpLifetimeMs;
    private readonly resendCooldownMs;
    constructor(emailService: EmailService, databaseService: DatabaseService);
    private generateOtp;
    private buildUserForEmail;
    sendOtp(email: string, role?: string): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: UserRole;
    }>;
    verifyOtp(email: string, otp: string): Promise<{
        accessToken: string;
        isNewUser: boolean;
        user: import("../database/database.service").StoredUser;
    }>;
    updateProfile(email: string, profile: Record<string, unknown>): Promise<{
        user: import("../database/database.service").StoredUser;
    }>;
    updateProfilePhoto(email: string, photo: string): Promise<{
        user: import("../database/database.service").StoredUser;
    }>;
    uploadResume(email: string, file: {
        originalname: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
    }): Promise<{
        resume: any;
        downloadUrl: string;
        updated_at: any;
    }>;
    getResume(email: string): Promise<{
        resume: {
            storagePath?: string;
        };
        downloadUrl: string;
    }>;
    deleteResume(email: string): Promise<{
        updated_at: any;
    }>;
    resendOtp(email: string, role?: string): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: UserRole;
    }>;
    private hashOtp;
}
