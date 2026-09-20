import { Injectable, UnauthorizedException } from '@nestjs/common';

const users = {
  'recruiter@jobportal.com': {
    password: 'recruiter123',
    name: 'Recruiter User',
    role: 'recruiter',
  },
  'candidate@jobportal.com': {
    password: 'candidate123',
    name: 'Candidate User',
    role: 'candidate',
  },
};

@Injectable()
export class AuthService {
  login(email: string, password: string) {
    const user = users[email as keyof typeof users];

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      accessToken: 'demo-jwt-token-for-job-portal',
      user: {
        id: user.role === 'recruiter' ? 1 : 2,
        name: user.name,
        email,
        role: user.role,
      },
    };
  }
}
