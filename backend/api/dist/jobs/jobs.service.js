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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const defaultGreenhouseBoards = [
    'figma', 'cloudflare', 'datadog', 'duolingo', 'robinhood', 'anthropic', 'stripe', 'asana', 'mongodb',
];
const companyNames = {
    figma: 'Figma', cloudflare: 'Cloudflare', datadog: 'Datadog', duolingo: 'Duolingo',
    robinhood: 'Robinhood', anthropic: 'Anthropic', stripe: 'Stripe', asana: 'Asana', mongodb: 'MongoDB',
};
const asString = (value) => typeof value === 'string' ? value : '';
const stripMarkup = (value) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').replace(/\s+/g, ' ').trim();
const textMatch = (query, haystack) => {
    const terms = normalize(query).split(' ').filter((term) => term.length > 2 && !['the', 'and', 'for', 'with', 'senior', 'junior'].includes(term));
    if (!terms.length)
        return 0;
    const normalizedHaystack = normalize(haystack);
    const hits = terms.filter((term) => normalizedHaystack.includes(term)).length;
    return Math.max(normalizedHaystack.includes(normalize(query)) ? 1 : 0, hits / terms.length);
};
const inferJobType = (text) => {
    if (/\b(contract|contractor|temporary|fixed.term|freelance)\b/i.test(text))
        return 'Contractual';
    if (/\b(permanent|regular employment)\b/i.test(text))
        return 'Permanent';
    return null;
};
const inferEmploymentType = (text) => {
    if (/\b(part.time|part time)\b/i.test(text))
        return 'Part Time';
    if (/\b(full.time|full time)\b/i.test(text))
        return 'Full Time';
    return null;
};
const inferShift = (text) => {
    if (/\b(rotational|rotating shift)\b/i.test(text))
        return 'Rotational';
    if (/\b(night shift|overnight)\b/i.test(text))
        return 'Night';
    if (/\b(day shift)\b/i.test(text))
        return 'Day';
    return null;
};
const noticeSignal = (noticePeriod, text) => {
    const normalized = normalize(text);
    const signals = {
        'less than a month': /\b(immediate|15 days|within 30 days|30 days|one month)\b/,
        '1 month': /\b(within 30 days|30 days|one month|1 month)\b/,
        '2 months': /\b(within 60 days|60 days|two months|2 months)\b/,
        '3 months': /\b(within 90 days|90 days|three months|3 months)\b/,
        'more than 3 months': /\b(more than 90 days|over three months|over 3 months)\b/,
    };
    const pattern = signals[normalize(noticePeriod)];
    return pattern ? (pattern.test(normalized) ? 1 : 0) : 0;
};
let JobsService = class JobsService {
    constructor(databaseService) {
        this.databaseService = databaseService;
    }
    getJobs() {
        return this.databaseService.getJobs();
    }
    getFeaturedJobs() {
        return this.databaseService.getJobs(true);
    }
    async getRecommendations(email) {
        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail)
            throw new common_1.UnauthorizedException('A valid email is required to find matching jobs.');
        const user = await this.databaseService.getUserByEmail(normalizedEmail);
        if (!user)
            throw new common_1.NotFoundException('Profile not found for this email.');
        const greenhouseBoards = (process.env.GREENHOUSE_BOARD_SLUGS || defaultGreenhouseBoards.join(','))
            .split(',').map((value) => value.trim()).filter(Boolean);
        const leverSites = (process.env.LEVER_COMPANY_SITES || '').split(',').map((value) => value.trim()).filter(Boolean);
        const sources = [
            ...greenhouseBoards.map((slug) => this.fetchGreenhouse(slug)),
            ...leverSites.map((site) => this.fetchLever(site)),
        ];
        const fetched = await Promise.allSettled(sources);
        const jobs = fetched.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
        const scored = jobs
            .map((job) => ({ ...job, matchScore: this.scoreJob(job, user.profile) }))
            .filter((job) => job.matchScore >= 50)
            .sort((left, right) => right.matchScore - left.matchScore);
        return { jobs: scored, updatedAt: new Date().toISOString(), sourcesConfigured: sources.length };
    }
    getApplications(email) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to load applied jobs.');
        return this.databaseService.getUserJobApplications(email);
    }
    apply(email, job) {
        if (!email?.trim())
            throw new common_1.UnauthorizedException('A valid email is required to apply.');
        return this.databaseService.applyUserToJob(email, job);
    }
    async fetchGreenhouse(board) {
        const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok)
            throw new Error(`Greenhouse board ${board} returned ${response.status}`);
        const data = await response.json();
        return (data.jobs || []).map((raw) => {
            const title = asString(raw.title);
            const location = asString(raw.location?.name);
            const description = stripMarkup(asString(raw.content));
            const classification = `${title} ${description}`;
            const id = raw.id === undefined || raw.id === null ? '' : String(raw.id);
            return {
                id: `greenhouse:${board}:${id}`,
                source: 'Greenhouse',
                sourceId: id,
                title,
                company: companyNames[board] || board,
                location,
                type: inferEmploymentType(classification) || inferJobType(classification) || 'Full Time',
                jobType: inferJobType(classification),
                employmentType: inferEmploymentType(classification),
                preferredShift: inferShift(classification),
                description,
                salary: null,
                url: asString(raw.absolute_url),
                postedAt: asString(raw.updated_at) || null,
                matchScore: 0,
            };
        }).filter((job) => job.title && job.url);
    }
    async fetchLever(site) {
        const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok)
            throw new Error(`Lever site ${site} returned ${response.status}`);
        const data = await response.json();
        return (Array.isArray(data) ? data : []).map((raw) => {
            const categories = raw.categories;
            const title = asString(raw.text);
            const location = asString(categories?.location);
            const commitment = asString(categories?.commitment);
            const description = `${asString(raw.descriptionPlain)} ${asString(raw.additionalPlain)}`.trim();
            const classification = `${title} ${commitment} ${description}`;
            const sourceId = asString(raw.id);
            return {
                id: `lever:${site}:${sourceId}`,
                source: 'Lever',
                sourceId,
                title,
                company: site,
                location,
                type: inferEmploymentType(classification) || inferJobType(classification) || 'Full Time',
                jobType: inferJobType(classification),
                employmentType: inferEmploymentType(classification),
                preferredShift: inferShift(classification),
                description,
                salary: null,
                url: asString(raw.hostedUrl),
                postedAt: typeof raw.createdAt === 'number' ? new Date(raw.createdAt).toISOString() : null,
                matchScore: 0,
            };
        }).filter((job) => job.title && job.url);
    }
    scoreJob(job, profile) {
        const text = `${job.title} ${job.description}`;
        const preferredRole = asString(profile.preferredJobRole);
        const headline = asString(profile.headline);
        const preferredCities = Array.isArray(profile.preferredCity)
            ? profile.preferredCity.map(asString)
            : [asString(profile.preferredCity)].filter(Boolean);
        if ((!preferredRole && !headline) || !preferredCities.length)
            return 0;
        const locationMatches = preferredCities.some((city) => normalize(job.location).includes(normalize(city))) || /\bremote\b/i.test(job.location);
        if (!locationMatches)
            return 0;
        let availableWeight = 0;
        let earnedWeight = 0;
        const add = (weight, score) => {
            availableWeight += weight;
            earnedWeight += weight * score;
        };
        if (headline)
            add(15, textMatch(headline, text));
        if (preferredRole)
            add(20, textMatch(preferredRole, text));
        add(25, 1);
        const preferredJobType = asString(profile.jobType);
        if (preferredJobType && job.jobType)
            add(10, normalize(preferredJobType) === normalize(job.jobType) ? 1 : 0);
        const preferredEmploymentType = asString(profile.employmentType);
        if (preferredEmploymentType && job.employmentType)
            add(10, normalize(preferredEmploymentType) === normalize(job.employmentType) ? 1 : 0);
        const preferredShift = asString(profile.preferredShift);
        if (preferredShift && job.preferredShift)
            add(5, normalize(preferredShift) === normalize(job.preferredShift) ? 1 : 0);
        const noticePeriod = asString(profile.noticePeriod);
        if (noticePeriod && /\b(immediate|within \d+ days|\d+ days|\d+ months?|one month|two months|three months)\b/i.test(text)) {
            add(15, noticeSignal(noticePeriod, text));
        }
        return availableWeight ? Math.round((earnedWeight / availableWeight) * 100) : 0;
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map