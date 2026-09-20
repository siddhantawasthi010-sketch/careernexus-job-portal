export declare class EmailService {
    private readonly logger;
    private getTransporter;
    sendOtpEmail(email: string, otp: string, role: string): Promise<{
        delivered: boolean;
        fallback: boolean;
        message: string;
    }>;
}
