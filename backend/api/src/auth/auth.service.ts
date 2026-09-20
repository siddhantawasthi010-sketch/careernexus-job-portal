import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailService } from '../email/email.service';

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

@Injectable()
export class AuthService {
  private readonly otpLifetimeMs = 5 * 60 * 1000;
  private readonly resendCooldownMs = 30 * 1000;

  constructor(private readonly emailService: EmailService) {}

  private otpStore = new Map<string, { otp: string; expiresAt: number; role: string; sentAt: number }>();

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private buildUserForEmail(email: string, requestedRole?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = users[normalizedEmail as keyof typeof users];

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

  async sendOtp(email: string, role?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new UnauthorizedException('Please enter a valid email address.');
    }

    const existingOtp = this.otpStore.get(normalizedEmail);
    if (existingOtp && Date.now() - existingOtp.sentAt < this.resendCooldownMs) {
      const remainingSeconds = Math.ceil((this.resendCooldownMs - (Date.now() - existingOtp.sentAt)) / 1000);
      throw new UnauthorizedException(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
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
    } catch (error) {
      console.log(`OTP for ${normalizedEmail} [${selectedRole}]: ${otp}`);
    }

    return {
      message: 'OTP sent to your email successfully.',
      email: normalizedEmail,
      expiresInSeconds: Math.floor(this.otpLifetimeMs / 1000),
      isNewUser: !users[normalizedEmail as keyof typeof users],
      role: selectedRole,
    };
  }

  verifyOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otpEntry = this.otpStore.get(normalizedEmail);

    if (!otpEntry) {
      throw new UnauthorizedException('No OTP was requested for this email. Please send OTP again.');
    }

    if (Date.now() > otpEntry.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    if (otpEntry.otp !== otp.trim()) {
      throw new UnauthorizedException('Invalid OTP. Please enter the correct code.');
    }

    this.otpStore.delete(normalizedEmail);

    const user = this.buildUserForEmail(normalizedEmail, otpEntry.role);

    return {
      accessToken: 'demo-jwt-token-for-job-portal',
      user,
    };
  }

  async resendOtp(email: string, role?: string) {
    return this.sendOtp(email, role);
  }
}
