import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { status: string; service: string; message: string } {
    return {
      status: 'ok',
      service: 'job-portal-api',
      message: 'API is running successfully.',
    };
  }
}
