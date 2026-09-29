import { Body, Controller, Get, Patch, Post, Query, Param, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ConnectTokenGuard } from '../connect/connect-token.guard';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  getJobs() {
    return this.jobsService.getJobs();
  }

  @Get('featured')
  getFeaturedJobs() {
    return this.jobsService.getFeaturedJobs();
  }

  @Get('career-portals')
  getCareerPortals() {
    return this.jobsService.getCareerPortals();
  }

  @Get('recommendations')
  getRecommendations(@Query('email') email: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.jobsService.getRecommendations(email, Number(limit), Number(offset));
  }

  @Get('applications')
  getApplications(@Query('email') email: string) {
    return this.jobsService.getApplications(email);
  }

  @Post('applications')
  apply(@Body() body: { email: string; job: Record<string, unknown> }) {
    return this.jobsService.apply(body.email, body.job);
  }

  @Get('recruiter')
  @UseGuards(ConnectTokenGuard)
  getRecruiterOpenings(@Query('email') email: string) {
    return this.jobsService.getRecruiterOpenings(email);
  }

  @Post('recruiter')
  @UseGuards(ConnectTokenGuard)
  createRecruiterOpening(@Body() body: { email: string; position: string; location: string; workMode: string; description: string; companyAbout: string }) {
    return this.jobsService.createRecruiterOpening(body.email, body);
  }

  @Patch('recruiter/:openingId/close')
  @UseGuards(ConnectTokenGuard)
  closeRecruiterOpening(@Param('openingId') openingId: string, @Body() body: { email: string }) {
    return this.jobsService.closeRecruiterOpening(body.email, openingId);
  }

  @Post('recruiter/:openingId/applications')
  @UseGuards(ConnectTokenGuard)
  applyToRecruiterOpening(@Param('openingId') openingId: string, @Body() body: { email: string; details: Record<string, unknown> }) {
    return this.jobsService.applyToRecruiterOpening(body.email, openingId, body.details);
  }

  @Get('recruiter/applications')
  @UseGuards(ConnectTokenGuard)
  getReceivedApplications(@Query('email') email: string) {
    return this.jobsService.getReceivedApplications(email);
  }

  @Get('recruiter/applications/:applicationId')
  @UseGuards(ConnectTokenGuard)
  getReceivedApplication(@Query('email') email: string, @Param('applicationId') applicationId: string) {
    return this.jobsService.getReceivedApplication(email, applicationId);
  }

  @Patch('recruiter/applications/:applicationId/status')
  @UseGuards(ConnectTokenGuard)
  setApplicationStatus(@Param('applicationId') applicationId: string, @Body() body: { email: string; status: string }) {
    return this.jobsService.setApplicationStatus(body.email, applicationId, body.status);
  }
}
