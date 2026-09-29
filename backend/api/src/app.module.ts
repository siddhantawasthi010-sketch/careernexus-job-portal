import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { DatabaseModule } from './database/database.module';
import { LibraryModule } from './library/library.module';
import { CoursesModule } from './courses/courses.module';
import { ConnectModule } from './connect/connect.module';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, AuthModule, JobsModule, LibraryModule, CoursesModule, ConnectModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
