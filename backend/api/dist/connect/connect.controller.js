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
exports.ConnectController = void 0;
const common_1 = require("@nestjs/common");
const connect_service_1 = require("./connect.service");
const connect_token_guard_1 = require("./connect-token.guard");
let ConnectController = class ConnectController {
    constructor(connectService) {
        this.connectService = connectService;
    }
    search(email, role, query) {
        return this.connectService.search(email, role, query);
    }
    getOverview(email) {
        return this.connectService.getOverview(email);
    }
    sendRequest(body) {
        return this.connectService.sendRequest(body.email, body.targetEmail);
    }
    respond(requestId, body) {
        return this.connectService.respond(body.email, requestId, body.status);
    }
    cancelRequest(requestId, email) {
        return this.connectService.cancelRequest(email, requestId);
    }
    getReferrals(email) {
        return this.connectService.getReferrals(email);
    }
    sendReferral(body) {
        return this.connectService.sendReferral(body.email, body.targetEmail, body.job);
    }
    removeConnection(targetEmail, email) {
        return this.connectService.removeConnection(email, targetEmail);
    }
    getMessages(email) {
        return this.connectService.getMessages(email);
    }
    sendMessage(body) {
        return this.connectService.sendMessage(body.email, body.targetEmail, body.body, body.job);
    }
    approveMessages(candidateEmail, body) {
        return this.connectService.approveMessages(body.email, candidateEmail);
    }
    getNotifications(email) {
        return this.connectService.getNotifications(email);
    }
};
exports.ConnectController = ConnectController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('email')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Post)('requests'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "sendRequest", null);
__decorate([
    (0, common_1.Patch)('requests/:requestId'),
    __param(0, (0, common_1.Param)('requestId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "respond", null);
__decorate([
    (0, common_1.Delete)('requests/:requestId'),
    __param(0, (0, common_1.Param)('requestId')),
    __param(1, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "cancelRequest", null);
__decorate([
    (0, common_1.Get)('referrals'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "getReferrals", null);
__decorate([
    (0, common_1.Post)('referrals'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "sendReferral", null);
__decorate([
    (0, common_1.Delete)('connections/:targetEmail'),
    __param(0, (0, common_1.Param)('targetEmail')),
    __param(1, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "removeConnection", null);
__decorate([
    (0, common_1.Get)('messages'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Patch)('messages/permissions/:candidateEmail'),
    __param(0, (0, common_1.Param)('candidateEmail')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "approveMessages", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConnectController.prototype, "getNotifications", null);
exports.ConnectController = ConnectController = __decorate([
    (0, common_1.Controller)('connect'),
    (0, common_1.UseGuards)(connect_token_guard_1.ConnectTokenGuard),
    __metadata("design:paramtypes", [connect_service_1.ConnectService])
], ConnectController);
//# sourceMappingURL=connect.controller.js.map