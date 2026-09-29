import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';

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
}
