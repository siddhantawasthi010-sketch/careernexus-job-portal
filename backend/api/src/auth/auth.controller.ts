import { Body, Controller, Post, Put } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() body: { email: string; role?: string }) {
    return this.authService.sendOtp(body.email, body.role);
  }

  @Post('resend-otp')
  resendOtp(@Body() body: { email: string; role?: string }) {
    return this.authService.resendOtp(body.email, body.role);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Put('profile')
  updateProfile(@Body() body: { email: string; profile: Record<string, unknown> }) {
    return this.authService.updateProfile(body.email, body.profile);
  }
}
