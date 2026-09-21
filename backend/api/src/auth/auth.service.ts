import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { EmailService } from '../email/email.service';
import { DatabaseService, UserRole } from '../database/database.service';

@Injectable()
export class AuthService {
  private readonly otpLifetimeMs = 5 * 60 * 1000;
  private readonly resendCooldownMs = 30 * 1000;

  constructor(
    private readonly emailService: EmailService,
    private readonly databaseService: DatabaseService,
  ) {}

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async buildUserForEmail(email: string, requestedRole: UserRole) {
    const existingUser = await this.databaseService.getUserByEmail(email);
    if (existingUser) {
      return existingUser;
    }

    const firstName = email.split('@')[0].replace(/[._-]/g, ' ');
    const name = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'New User';

    return this.databaseService.upsertUser({ email, name, role: requestedRole });
  }

  async sendOtp(email: string, role?: string) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new UnauthorizedException('Please enter a valid email address.');
    }

    const existingOtp = await this.databaseService.getLatestOtp(normalizedEmail);
    const sentAt = existingOtp ? new Date(existingOtp.sent_at).getTime() : 0;
    if (existingOtp && Date.now() - sentAt < this.resendCooldownMs) {
      const remainingSeconds = Math.ceil((this.resendCooldownMs - (Date.now() - sentAt)) / 1000);
      throw new UnauthorizedException(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
    }

    const otp = this.generateOtp();
    const selectedRole: UserRole = role === 'recruiter' ? 'recruiter' : 'candidate';
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
    } catch (error) {
      console.log(`OTP for ${normalizedEmail} [${selectedRole}]: ${otp}`);
    }

    return {
      message: 'OTP sent to your email successfully.',
      email: normalizedEmail,
      expiresInSeconds: Math.floor(this.otpLifetimeMs / 1000),
      isNewUser: !user,
      role: selectedRole,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const otpEntry = await this.databaseService.getLatestOtp(normalizedEmail);

    if (!otpEntry) {
      throw new UnauthorizedException('No OTP was requested for this email. Please send OTP again.');
    }

    if (Date.now() > new Date(otpEntry.expires_at).getTime()) {
      await this.databaseService.deleteOtps(normalizedEmail);
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    if (this.hashOtp(otp.trim()) !== otpEntry.otp_hash) {
      throw new UnauthorizedException('Invalid OTP. Please enter the correct code.');
    }

    await this.databaseService.deleteOtps(normalizedEmail);
    const user = await this.buildUserForEmail(normalizedEmail, otpEntry.role);

    return {
      accessToken: 'demo-jwt-token-for-job-portal',
      user,
    };
  }

  async resendOtp(email: string, role?: string) {
    return this.sendOtp(email, role);
  }

  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }
}
