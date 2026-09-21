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
    resendOtp(email: string, role?: string): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: UserRole;
    }>;
    private hashOtp;
}
