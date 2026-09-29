"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let ConnectService = class ConnectService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    search(email, role, query) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to search members.');
        if (role !== 'candidate' && role !== 'recruiter')
            throw new common_1.BadRequestException('Choose candidates or recruiters to search.');
        if (!query?.trim() || query.trim().length < 2)
            return Promise.resolve([]);
        return this.databaseService.searchConnectPeople(email, role, query.trim());
    }
    getOverview(email) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to load connections.');
        return this.databaseService.getConnectionOverview(email);
    }
    sendRequest(email, targetEmail) {
        if (!email?.trim() || !targetEmail?.trim())
            throw new common_1.BadRequestException('Your account and the selected member are required.');
        return this.databaseService.createConnectionRequest(email, targetEmail);
    }
    respond(email, requestId, status) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to respond to a request.');
        if (status !== 'accepted' && status !== 'declined')
            throw new common_1.BadRequestException('Choose accept or decline.');
        return this.databaseService.respondToConnectionRequest(email, requestId, status);
    }
    cancelRequest(email, requestId) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to cancel a request.');
        return this.databaseService.cancelConnectionRequest(email, requestId);
    }
    getReferrals(email) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to load referrals.');
        return this.databaseService.getReferralsForUser(email);
    }
    sendReferral(email, targetEmail, job) {
        if (!email?.trim() || !targetEmail?.trim())
            throw new common_1.BadRequestException('Your account and the selected candidate are required.');
        if (!job || typeof job !== 'object' || typeof job.id !== 'string' && typeof job.id !== 'number' || typeof job.title !== 'string') {
            throw new common_1.BadRequestException('A valid job id and title are required.');
        }
        if (job.source === 'career-nexus') {
            if (typeof job.recruiterJobId !== 'string' || !job.recruiterJobId)
                throw new common_1.BadRequestException('A recruiter job opening id is required.');
        }
        else {
            try {
                const jobUrl = new URL(String(job.url || ''));
                if (jobUrl.protocol !== 'http:' && jobUrl.protocol !== 'https:')
                    throw new Error('Invalid protocol');
            }
            catch {
                throw new common_1.BadRequestException('The referral job URL must use HTTP or HTTPS.');
            }
        }
        return this.databaseService.createJobReferral(email, targetEmail, job);
    }
    removeConnection(email, targetEmail) {
        if (!email?.trim() || !targetEmail?.trim())
            throw new common_1.BadRequestException('Your account and the selected member are required.');
        return this.databaseService.removeConnection(email, targetEmail);
    }
    sendMessage(email, targetEmail, body, job) {
        if (!email?.trim() || !targetEmail?.trim())
            throw new common_1.BadRequestException('Your account and the selected member are required.');
        return this.databaseService.sendUserMessage(email, targetEmail, body || '', job);
    }
    getMessages(email) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to load messages.');
        return this.databaseService.getUserMessages(email);
    }
    approveMessages(email, candidateEmail) {
        if (!email?.trim() || !candidateEmail?.trim())
            throw new common_1.BadRequestException('The recruiter and candidate accounts are required.');
        return this.databaseService.approveCandidateMessages(email, candidateEmail);
    }
    getNotifications(email) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to load notifications.');
        return this.databaseService.getUserNotifications(email);
    }
};
exports.ConnectService = ConnectService;
exports.ConnectService = ConnectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], ConnectService);
//# sourceMappingURL=connect.service.js.map