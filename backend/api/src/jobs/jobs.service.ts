import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class JobsService {
  constructor(private readonly databaseService: DatabaseService) {}

  getJobs() {
    return this.databaseService.getJobs();
  }

  getFeaturedJobs() {
    return this.databaseService.getJobs(true);
  }
}
