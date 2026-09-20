"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
let JobsService = class JobsService {
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
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)()
], JobsService);
//# sourceMappingURL=jobs.service.js.map