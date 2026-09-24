import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { DatabaseModule } from './database/database.module';
import { LibraryModule } from './library/library.module';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [DatabaseModule, AuthModule, JobsModule, LibraryModule, CoursesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
