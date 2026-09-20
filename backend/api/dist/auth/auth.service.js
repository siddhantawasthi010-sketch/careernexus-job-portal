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
const email_service_1 = require("../email/email.service");
const users = {
    'recruiter@jobportal.com': {
        name: 'Recruiter User',
        role: 'recruiter',
    },
    'candidate@jobportal.com': {
        name: 'Candidate User',
        role: 'candidate',
    },
};
let AuthService = class AuthService {
    constructor(emailService) {
        this.emailService = emailService;
        this.otpLifetimeMs = 5 * 60 * 1000;
        this.resendCooldownMs = 30 * 1000;
        this.otpStore = new Map();
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    buildUserForEmail(email, requestedRole) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = users[normalizedEmail];
        if (existingUser) {
            return {
                id: existingUser.role === 'recruiter' ? 1 : 2,
                name: existingUser.name,
                email: normalizedEmail,
                role: existingUser.role,
            };
        }
        const finalRole = requestedRole === 'recruiter' ? 'recruiter' : 'candidate';
        const firstName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
        return {
            id: Date.now(),
            name: firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'New User',
            email: normalizedEmail,
            role: finalRole,
        };
    }
    async sendOtp(email, role) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            throw new common_1.UnauthorizedException('Please enter a valid email address.');
        }
        const existingOtp = this.otpStore.get(normalizedEmail);
        if (existingOtp && Date.now() - existingOtp.sentAt < this.resendCooldownMs) {
            const remainingSeconds = Math.ceil((this.resendCooldownMs - (Date.now() - existingOtp.sentAt)) / 1000);
            throw new common_1.UnauthorizedException(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
        }
        const otp = this.generateOtp();
        const expiresAt = Date.now() + this.otpLifetimeMs;
        const selectedRole = role === 'recruiter' ? 'recruiter' : 'candidate';
        this.otpStore.set(normalizedEmail, {
            otp,
            expiresAt,
            role: selectedRole,
            sentAt: Date.now(),
        });
        try {
            await this.emailService.sendOtpEmail(normalizedEmail, otp, selectedRole);
        }
        catch (error) {
            console.log(`OTP for ${normalizedEmail} [${selectedRole}]: ${otp}`);
        }
        return {
            message: 'OTP sent to your email successfully.',
            email: normalizedEmail,
            expiresInSeconds: Math.floor(this.otpLifetimeMs / 1000),
            isNewUser: !users[normalizedEmail],
            role: selectedRole,
        };
    }
    verifyOtp(email, otp) {
        const normalizedEmail = email.trim().toLowerCase();
        const otpEntry = this.otpStore.get(normalizedEmail);
        if (!otpEntry) {
            throw new common_1.UnauthorizedException('No OTP was requested for this email. Please send OTP again.');
        }
        if (Date.now() > otpEntry.expiresAt) {
            this.otpStore.delete(normalizedEmail);
            throw new common_1.UnauthorizedException('OTP has expired. Please request a new one.');
        }
        if (otpEntry.otp !== otp.trim()) {
            throw new common_1.UnauthorizedException('Invalid OTP. Please enter the correct code.');
        }
        this.otpStore.delete(normalizedEmail);
        const user = this.buildUserForEmail(normalizedEmail, otpEntry.role);
        return {
            accessToken: 'demo-jwt-token-for-job-portal',
            user,
        };
    }
    async resendOtp(email, role) {
        return this.sendOtp(email, role);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map