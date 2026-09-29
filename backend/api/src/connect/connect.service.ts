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
}
