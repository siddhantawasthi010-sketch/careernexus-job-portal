"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
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
let AuthService = class AuthService {
    login(email, password) {
        const user = users[email];
        if (!user || user.password !== password) {
            throw new common_1.UnauthorizedException('Invalid email or password');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map