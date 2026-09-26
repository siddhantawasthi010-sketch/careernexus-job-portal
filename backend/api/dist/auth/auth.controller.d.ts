import { AuthService } from './auth.service';
interface ResumeUploadFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}
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
    updateProfilePhoto(body: {
        email: string;
        photo: string;
    }): Promise<{
        user: import("../database/database.service").StoredUser;
    }>;
    uploadResume(email: string, file: ResumeUploadFile | undefined): Promise<{
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
}
export {};
