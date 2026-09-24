import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CoursesService {
  constructor(private readonly databaseService: DatabaseService) {}

  getCourses() {
    return this.databaseService.getCourses().catch((error: Error) => {
      if (error.message.includes("Could not find the table 'public.courses'")) {
        throw new ServiceUnavailableException('Courses table is missing. Run backend/api/supabase.sql in the Supabase SQL Editor, then restart the API.');
      }
      throw error;
    });
  }
}