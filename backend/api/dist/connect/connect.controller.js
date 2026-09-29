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
exports.ConnectController = ConnectController = __decorate([
    (0, common_1.Controller)('connect'),
    __metadata("design:paramtypes", [connect_service_1.ConnectService])
], ConnectController);
//# sourceMappingURL=connect.controller.js.map