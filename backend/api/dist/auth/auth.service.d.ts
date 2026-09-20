import { EmailService } from '../email/email.service';
export declare class AuthService {
    private readonly emailService;
    private readonly otpLifetimeMs;
    private readonly resendCooldownMs;
    constructor(emailService: EmailService);
    private otpStore;
    private generateOtp;
    private buildUserForEmail;
    sendOtp(email: string, role?: string): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: string;
    }>;
    verifyOtp(email: string, otp: string): {
        accessToken: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
    resendOtp(email: string, role?: string): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: string;
    }>;
}
