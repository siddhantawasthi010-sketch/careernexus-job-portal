import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    sendOtp(body: {
        email: string;
        role?: string;
    }): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: import("../database/database.service").UserRole;
    }>;
    resendOtp(body: {
        email: string;
        role?: string;
    }): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: import("../database/database.service").UserRole;
    }>;
    verifyOtp(body: {
        email: string;
        otp: string;
    }): Promise<{
        accessToken: string;
        isNewUser: boolean;
        user: import("../database/database.service").StoredUser;
    }>;
    updateProfile(body: {
        email: string;
        profile: Record<string, unknown>;
    }): Promise<{
        user: import("../database/database.service").StoredUser;
    }>;
}
