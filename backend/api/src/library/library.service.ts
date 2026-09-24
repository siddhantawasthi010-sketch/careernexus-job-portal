import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class LibraryService {
  constructor(private readonly databaseService: DatabaseService) {}

  getTopics() {
    return this.databaseService.getLibraryTopics().catch((error: Error) => {
      if (error.message.includes("Could not find the table 'public.library_topics'")) {
        throw new ServiceUnavailableException('Library topics table is missing. Run backend/api/supabase.sql in the Supabase SQL Editor, then restart the API.');
      }
      throw error;
    });
  }
}