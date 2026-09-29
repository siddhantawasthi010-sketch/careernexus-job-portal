import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
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
      await this.databaseService.deleteOtps(normalizedEmail);
      throw new InternalServerErrorException('Unable to send OTP email. Please try again later.');
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
    const existingUser = await this.databaseService.getUserByEmail(normalizedEmail);
    const user = await this.buildUserForEmail(normalizedEmail, otpEntry.role);

    return {
      accessToken: 'demo-jwt-token-for-careernexus-job-portal',
      isNewUser: !existingUser,
      user,
    };
  }

  async updateProfile(email: string, profile: Record<string, unknown>) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !profile || typeof profile !== 'object') {
      throw new UnauthorizedException('A valid email and profile are required.');
    }

    const user = await this.databaseService.updateUserProfile(normalizedEmail, profile);
    return { user };
  }

  async getProfile(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new UnauthorizedException('A valid email is required to load this profile.');
    const user = await this.databaseService.getUserByEmail(normalizedEmail);
    if (!user) throw new UnauthorizedException('This account could not be found. Please sign in again.');
    return { user };
  }

  async updateProfilePhoto(email: string, photo: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || typeof photo !== 'string' || !photo) {
      throw new UnauthorizedException('A valid email and profile photo are required.');
    }
    const user = await this.databaseService.updateUserProfilePhoto(normalizedEmail, photo);
    return { user };
  }

  async uploadResume(email: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    if (!email?.trim()) throw new BadRequestException('A valid email is required.');
    try {
      return await this.databaseService.uploadUserResume(email, file);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Resume')) throw new BadRequestException(error.message);
      throw error;
    }
  }

  async getResume(email: string) {
    if (!email?.trim()) throw new BadRequestException('A valid email is required.');
    return (await this.databaseService.getUserResume(email)) || { resume: null, downloadUrl: null };
  }

  async deleteResume(email: string) {
    if (!email?.trim()) throw new BadRequestException('A valid email is required.');
    return this.databaseService.deleteUserResume(email);
  }

  async resendOtp(email: string, role?: string) {
    return this.sendOtp(email, role);
  }

  private hashOtp(otp: string) {
    return createHash('sha256').update(otp).digest('hex');
  }
}
