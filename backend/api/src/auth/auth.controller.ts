import { BadRequestException, Body, Controller, Delete, Get, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';

interface ResumeUploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

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

  @Put('profile/photo')
  updateProfilePhoto(@Body() body: { email: string; photo: string }) {
    return this.authService.updateProfilePhoto(body.email, body.photo);
  }

  @Post('profile/resume')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadResume(@Body('email') email: string, @UploadedFile() file: ResumeUploadFile | undefined) {
    if (!file) throw new BadRequestException('Select a resume file to upload.');
    return this.authService.uploadResume(email, file);
  }

  @Get('profile/resume')
  getResume(@Query('email') email: string) {
    return this.authService.getResume(email);
  }

  @Delete('profile/resume')
  deleteResume(@Body('email') email: string) {
    return this.authService.deleteResume(email);
  }
}
