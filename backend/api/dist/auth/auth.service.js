"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const email_service_1 = require("../email/email.service");
const database_service_1 = require("../database/database.service");
let AuthService = class AuthService {
    constructor(emailService, databaseService) {
        this.emailService = emailService;
        this.databaseService = databaseService;
        this.otpLifetimeMs = 5 * 60 * 1000;
        this.resendCooldownMs = 30 * 1000;
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async buildUserForEmail(email, requestedRole) {
        const existingUser = await this.databaseService.getUserByEmail(email);
        if (existingUser) {
            return existingUser;
        }
        const firstName = email.split('@')[0].replace(/[._-]/g, ' ');
        const name = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'New User';
        return this.databaseService.upsertUser({ email, name, role: requestedRole });
    }
    async sendOtp(email, role) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            throw new common_1.UnauthorizedException('Please enter a valid email address.');
        }
        const existingOtp = await this.databaseService.getLatestOtp(normalizedEmail);
        const sentAt = existingOtp ? new Date(existingOtp.sent_at).getTime() : 0;
        if (existingOtp && Date.now() - sentAt < this.resendCooldownMs) {
            const remainingSeconds = Math.ceil((this.resendCooldownMs - (Date.now() - sentAt)) / 1000);
            throw new common_1.UnauthorizedException(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
        }
        const otp = this.generateOtp();
        const selectedRole = role === 'recruiter' ? 'recruiter' : 'candidate';
        const user = await this.databaseService.getUserByEmail(normalizedEmail);
        await this.databaseService.createOtp({
            email: normalizedEmail,
            otp_hash: this.hashOtp(otp),
            role: selectedRole,
            expires_at: new Date(Date.now() + this.otpLifetimeMs).toISOString(),
            sent_at: new Date().toISOString(),
        });
        try {
            await this.emailService.sendOtpEmail(normalizedEmail, otp, selectedRole);
        }
        catch (error) {
            await this.databaseService.deleteOtps(normalizedEmail);
            throw new common_1.InternalServerErrorException('Unable to send OTP email. Please try again later.');
        }
        return {
            message: 'OTP sent to your email successfully.',
            email: normalizedEmail,
            expiresInSeconds: Math.floor(this.otpLifetimeMs / 1000),
            isNewUser: !user,
            role: selectedRole,
        };
    }
    async verifyOtp(email, otp) {
        const normalizedEmail = email.trim().toLowerCase();
        const otpEntry = await this.databaseService.getLatestOtp(normalizedEmail);
        if (!otpEntry) {
            throw new common_1.UnauthorizedException('No OTP was requested for this email. Please send OTP again.');
        }
        if (Date.now() > new Date(otpEntry.expires_at).getTime()) {
            await this.databaseService.deleteOtps(normalizedEmail);
            throw new common_1.UnauthorizedException('OTP has expired. Please request a new one.');
        }
        if (this.hashOtp(otp.trim()) !== otpEntry.otp_hash) {
            throw new common_1.UnauthorizedException('Invalid OTP. Please enter the correct code.');
        }
        await this.databaseService.deleteOtps(normalizedEmail);
        const existingUser = await this.databaseService.getUserByEmail(normalizedEmail);
        const user = await this.buildUserForEmail(normalizedEmail, otpEntry.role);
        return {
            accessToken: 'demo-jwt-token-for-careernexus-job-portal',
            isNewUser: !existingUser,
            user,
        };
    }
    async updateProfile(email, profile) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !profile || typeof profile !== 'object') {
            throw new common_1.UnauthorizedException('A valid email and profile are required.');
        }
        const user = await this.databaseService.updateUserProfile(normalizedEmail, profile);
        return { user };
    }
    async updateProfilePhoto(email, photo) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || typeof photo !== 'string' || !photo) {
            throw new common_1.UnauthorizedException('A valid email and profile photo are required.');
        }
        const user = await this.databaseService.updateUserProfilePhoto(normalizedEmail, photo);
        return { user };
    }
    async uploadResume(email, file) {
        if (!email?.trim())
            throw new common_1.BadRequestException('A valid email is required.');
        try {
            return await this.databaseService.uploadUserResume(email, file);
        }
        catch (error) {
            if (error instanceof Error && error.message.startsWith('Resume'))
                throw new common_1.BadRequestException(error.message);
            throw error;
        }
    }
    async getResume(email) {
        if (!email?.trim())
            throw new common_1.BadRequestException('A valid email is required.');
        return (await this.databaseService.getUserResume(email)) || { resume: null, downloadUrl: null };
    }
    async deleteResume(email) {
        if (!email?.trim())
            throw new common_1.BadRequestException('A valid email is required.');
        return this.databaseService.deleteUserResume(email);
    }
    async resendOtp(email, role) {
        return this.sendOtp(email, role);
    }
    hashOtp(otp) {
        return (0, crypto_1.createHash)('sha256').update(otp).digest('hex');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        database_service_1.DatabaseService])
], AuthService);
//# sourceMappingURL=auth.service.js.map