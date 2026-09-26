import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private getTransporter() {
    const provider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();

    if (provider === 'mailtrap') {
      const host = process.env.MAILTRAP_HOST;
      const port = Number(process.env.MAILTRAP_PORT || 2525);
      const user = process.env.MAILTRAP_USER;
      const pass = process.env.MAILTRAP_PASS;

      if (!host || !user || !pass || user.startsWith('your-') || pass.startsWith('your-')) {
        this.logger.warn('Mailtrap configuration is missing or still uses placeholders. Set MAILTRAP_USER and MAILTRAP_PASS in your .env file.');
        return null;
      }

      return nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: {
          user,
          pass,
        },
      });
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    if (!user || !pass || pass.startsWith('replace-with-') || user === 'your-email@gmail.com') {
      this.logger.warn('Gmail SMTP configuration is missing or still uses placeholders. Set SMTP_USER and a Google App Password in your .env file.');
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendOtpEmail(email: string, otp: string, role: string) {
    const transporter = this.getTransporter();
    const provider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase();
    const from = provider === 'mailtrap'
      ? process.env.MAILTRAP_FROM || process.env.MAILTRAP_USER
      : process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!transporter || !from) {
      this.logger.log(`SMTP not configured. OTP fallback for ${email} (${role}): ${otp}`);
      return {
        delivered: false,
        fallback: true,
        message: 'Email not sent because SMTP is not configured. OTP printed in server logs for dev testing.',
      };
    }

    const mailOptions = {
      from,
      to: email,
      subject: `Your CareerNexus OTP for ${role} login`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc;">
          <h2 style="margin-bottom: 12px; color: #0f172a;">CareerNexus OTP</h2>
          <p style="font-size: 16px; color: #334155; margin: 0 0 18px;">
            Your one-time password for ${role} login is:
          </p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; background: #111827; color: white; padding: 18px 16px; border-radius: 10px; text-align: center;">
            ${otp}
          </div>
          <p style="margin-top: 18px; color: #64748b; font-size: 14px;">
            This OTP is valid for 5 minutes.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent successfully to ${email} via ${provider}`);
      return {
        delivered: true,
        fallback: false,
        message: 'OTP email sent successfully.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMTP error';

      if (provider === 'gmail' && /(535|BadCredentials|Invalid login)/i.test(message)) {
        this.logger.error(
          'Gmail SMTP authentication failed. If 2-Step Verification is enabled, generate a 16-character Google App Password at myaccount.google.com/apppasswords and use that instead of your normal Gmail password.',
        );
      }

      this.logger.error(`Failed to send OTP to ${email}: ${message}`);
      throw new Error(`Failed to send email via ${provider}: ${message}`);
    }
  }
}
