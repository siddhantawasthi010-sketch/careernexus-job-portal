import { Injectable } from '@nestjs/common';

@Injectable()
export class JobsService {
  getJobs() {
    return [
      {
        id: 1,
        title: 'Frontend Developer',
        company: 'NovaLabs',
        location: 'Remote',
        type: 'Full-time',
        salary: '$120k - $150k',
      },
      {
        id: 2,
        title: 'Backend Engineer',
        company: 'Streamline AI',
        location: 'Bengaluru',
        type: 'Full-time',
        salary: '$130k - $160k',
      },
      {
        id: 3,
        title: 'UI/UX Designer',
        company: 'Motive Studio',
        location: 'Hyderabad',
        type: 'Contract',
        salary: '$80k - $110k',
      },
    ];
  }

  getFeaturedJobs() {
    return [
      {
        id: 101,
        title: 'Senior React Engineer',
        company: 'PixelForge',
        location: 'Remote',
        type: 'Hybrid',
      },
      {
        id: 102,
        title: 'Product Designer',
        company: 'BluePeak',
        location: 'Pune',
        type: 'Full-time',
      },
    ];
  }
}
