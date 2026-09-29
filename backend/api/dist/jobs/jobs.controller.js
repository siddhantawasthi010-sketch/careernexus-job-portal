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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const jobs_service_1 = require("./jobs.service");
const connect_token_guard_1 = require("../connect/connect-token.guard");
let JobsController = class JobsController {
    constructor(jobsService) {
        this.jobsService = jobsService;
    }
    getJobs() {
        return this.jobsService.getJobs();
    }
    getFeaturedJobs() {
        return this.jobsService.getFeaturedJobs();
    }
    getCareerPortals() {
        return this.jobsService.getCareerPortals();
    }
    getRecommendations(email, limit, offset) {
        return this.jobsService.getRecommendations(email, Number(limit), Number(offset));
    }
    getApplications(email) {
        return this.jobsService.getApplications(email);
    }
    apply(body) {
        return this.jobsService.apply(body.email, body.job);
    }
    getRecruiterOpenings(email) {
        return this.jobsService.getRecruiterOpenings(email);
    }
    createRecruiterOpening(body) {
        return this.jobsService.createRecruiterOpening(body.email, body);
    }
    closeRecruiterOpening(openingId, body) {
        return this.jobsService.closeRecruiterOpening(body.email, openingId);
    }
    applyToRecruiterOpening(openingId, body) {
        return this.jobsService.applyToRecruiterOpening(body.email, openingId, body.details);
    }
    getReceivedApplications(email) {
        return this.jobsService.getReceivedApplications(email);
    }
    getReceivedApplication(email, applicationId) {
        return this.jobsService.getReceivedApplication(email, applicationId);
    }
    setApplicationStatus(applicationId, body) {
        return this.jobsService.setApplicationStatus(body.email, applicationId, body.status);
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getJobs", null);
__decorate([
    (0, common_1.Get)('featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getFeaturedJobs", null);
__decorate([
    (0, common_1.Get)('career-portals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getCareerPortals", null);
__decorate([
    (0, common_1.Get)('recommendations'),
    __param(0, (0, common_1.Query)('email')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)('applications'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getApplications", null);
__decorate([
    (0, common_1.Post)('applications'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)('recruiter'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getRecruiterOpenings", null);
__decorate([
    (0, common_1.Post)('recruiter'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "createRecruiterOpening", null);
__decorate([
    (0, common_1.Patch)('recruiter/:openingId/close'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Param)('openingId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "closeRecruiterOpening", null);
__decorate([
    (0, common_1.Post)('recruiter/:openingId/applications'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Param)('openingId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "applyToRecruiterOpening", null);
__decorate([
    (0, common_1.Get)('recruiter/applications'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getReceivedApplications", null);
__decorate([
    (0, common_1.Get)('recruiter/applications/:applicationId'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Query)('email')),
    __param(1, (0, common_1.Param)('applicationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "getReceivedApplication", null);
__decorate([
    (0, common_1.Patch)('recruiter/applications/:applicationId/status'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __param(0, (0, common_1.Param)('applicationId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "setApplicationStatus", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    __metadata("design:paramtypes", [jobs_service_1.JobsService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map