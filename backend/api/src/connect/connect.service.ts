import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService, UserRole } from '../database/database.service';

@Injectable()
export class ConnectService {
  constructor(private readonly databaseService: DatabaseService) {}

  search(email: string, role: string, query: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to search members.');
    if (role !== 'candidate' && role !== 'recruiter') throw new BadRequestException('Choose candidates or recruiters to search.');
    if (!query?.trim() || query.trim().length < 2) return Promise.resolve([]);
    return this.databaseService.searchConnectPeople(email, role as UserRole, query.trim());
  }

  getOverview(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to load connections.');
    return this.databaseService.getConnectionOverview(email);
  }

  sendRequest(email: string, targetEmail: string) {
    if (!email?.trim() || !targetEmail?.trim()) throw new BadRequestException('Your account and the selected member are required.');
    return this.databaseService.createConnectionRequest(email, targetEmail);
  }

  respond(email: string, requestId: string, status: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to respond to a request.');
    if (status !== 'accepted' && status !== 'declined') throw new BadRequestException('Choose accept or decline.');
    return this.databaseService.respondToConnectionRequest(email, requestId, status);
  }

  cancelRequest(email: string, requestId: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to cancel a request.');
    return this.databaseService.cancelConnectionRequest(email, requestId);
  }

  getReferrals(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to load referrals.');
    return this.databaseService.getReferralsForUser(email);
  }

  sendReferral(email: string, targetEmail: string, job: Record<string, unknown>) {
    if (!email?.trim() || !targetEmail?.trim()) throw new BadRequestException('Your account and the selected candidate are required.');
    if (!job || typeof job !== 'object' || typeof job.id !== 'string' && typeof job.id !== 'number' || typeof job.title !== 'string') {
      throw new BadRequestException('A valid job id and title are required.');
    }
    if (job.source === 'career-nexus') {
      if (typeof job.recruiterJobId !== 'string' || !job.recruiterJobId) throw new BadRequestException('A recruiter job opening id is required.');
    } else {
      try {
        const jobUrl = new URL(String(job.url || ''));
        if (jobUrl.protocol !== 'http:' && jobUrl.protocol !== 'https:') throw new Error('Invalid protocol');
      } catch {
        throw new BadRequestException('The referral job URL must use HTTP or HTTPS.');
      }
    }
    return this.databaseService.createJobReferral(email, targetEmail, job);
  }

  removeConnection(email: string, targetEmail: string) {
    if (!email?.trim() || !targetEmail?.trim()) throw new BadRequestException('Your account and the selected member are required.');
    return this.databaseService.removeConnection(email, targetEmail);
  }

  sendMessage(email: string, targetEmail: string, body: string, job?: Record<string, unknown>) {
    if (!email?.trim() || !targetEmail?.trim()) throw new BadRequestException('Your account and the selected member are required.');
    return this.databaseService.sendUserMessage(email, targetEmail, body || '', job);
  }

  getMessages(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to load messages.');
    return this.databaseService.getUserMessages(email);
  }

  approveMessages(email: string, candidateEmail: string) {
    if (!email?.trim() || !candidateEmail?.trim()) throw new BadRequestException('The recruiter and candidate accounts are required.');
    return this.databaseService.approveCandidateMessages(email, candidateEmail);
  }

  getNotifications(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to load notifications.');
    return this.databaseService.getUserNotifications(email);
  }
}
