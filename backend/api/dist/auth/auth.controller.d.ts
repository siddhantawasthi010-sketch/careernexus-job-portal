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
        role: string;
    }>;
    resendOtp(body: {
        email: string;
        role?: string;
    }): Promise<{
        message: string;
        email: string;
        expiresInSeconds: number;
        isNewUser: boolean;
        role: string;
    }>;
    verifyOtp(body: {
        email: string;
        otp: string;
    }): {
        accessToken: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
}
