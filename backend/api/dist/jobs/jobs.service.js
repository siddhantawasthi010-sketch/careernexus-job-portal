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
const asString = (value) => typeof value === 'string' ? value : '';
const asRecord = (value) => value && typeof value === 'object' ? value : {};
const asArray = (value) => Array.isArray(value) ? value.map(asRecord) : [];
const asStrings = (value) => Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && Boolean(item.trim()))
    : typeof value === 'string' && value.trim() ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').replace(/\s+/g, ' ').trim();
const stripMarkup = (value) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const cityAliases = {
    bengaluru: ['bangalore'], bangalore: ['bengaluru'],
    gurugram: ['gurgaon'], gurgaon: ['gurugram'],
    noida: ['greater noida'], 'greater noida': ['noida'],
    'delhi ncr': ['delhi', 'new delhi', 'noida', 'greater noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
    mumbai: ['bombay'], bombay: ['mumbai'],
    kolkata: ['calcutta'], calcutta: ['kolkata'],
};
const inferJobType = (text) => {
    if (/\b(contract|contractor|temporary|fixed.term|freelance)\b/i.test(text))
        return 'Contractual';
    if (/\b(permanent|regular employment)\b/i.test(text))
        return 'Permanent';
    return null;
};
const inferEmploymentType = (text) => {
    if (/\bpart[\s.-]?time\b/i.test(text))
        return 'Part Time';
    if (/\bfull[\s.-]?time\b/i.test(text))
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
const textMatch = (query, haystack) => {
    const normalizedQuery = normalize(query);
    const normalizedHaystack = normalize(haystack);
    if (normalizedQuery && normalizedHaystack.includes(normalizedQuery))
        return 1;
    const terms = normalizedQuery.split(' ').filter((term) => term.length > 2 && !['the', 'and', 'for', 'with', 'senior', 'junior'].includes(term));
    if (!terms.length)
        return 0;
    const hits = terms.filter((term) => normalizedHaystack.includes(term)).length;
    return hits / terms.length;
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
        this.providerJobCache = new Map();
        this.providerRetryAfter = new Map();
    }
    getJobs() {
        return this.databaseService.getJobs();
    }
    getFeaturedJobs() {
        return this.databaseService.getJobs(true);
    }
    getCareerPortals() {
        return this.databaseService.getCareerPortals();
    }
    async getRecommendations(email) {
        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail)
            throw new common_1.UnauthorizedException('A valid email is required to find matching jobs.');
        const user = await this.databaseService.getUserByEmail(normalizedEmail);
        if (!user)
            throw new common_1.NotFoundException('Profile not found for this email.');
        const search = this.getProfileSearch(user.profile);
        if (!search.locations.length || !search.keywords) {
            return {
                jobs: [],
                updatedAt: new Date().toISOString(),
                sourcesConfigured: 0,
                sourcesFailed: [],
                diagnostic: 'Add a preferred city or current location and at least one preferred role, profile headline, or skill to search for jobs.',
            };
        }
        const providers = this.getProviders(search.keywords, search.locations);
        if (providers.length) {
            try {
                const cachedJobs = await this.databaseService.getRecentFeedJobs();
                const cachedMatches = cachedJobs
                    .map((job) => ({ ...job, matchScore: this.scoreJob(job, user.profile) }))
                    .filter((job) => job.matchScore > 0)
                    .sort((left, right) => right.matchScore - left.matchScore);
                if (cachedMatches.length) {
                    void Promise.allSettled(providers.map((provider) => this.getProviderJobs(provider)))
                        .then(async (results) => {
                        const refreshedJobs = Array.from(new Map(results
                            .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
                            .map((job) => [`${normalize(job.title)}|${normalize(job.company)}|${normalize(job.location)}`, job])).values());
                        if (refreshedJobs.length)
                            await this.databaseService.saveFeedJobs(refreshedJobs);
                    })
                        .catch((error) => console.warn('Unable to refresh cached job recommendations:', error));
                    return {
                        jobs: cachedMatches,
                        updatedAt: new Date().toISOString(),
                        sourcesConfigured: providers.length,
                        sourcesFailed: [],
                        fetchedCount: 0,
                        matchedCount: cachedMatches.length,
                        homeMatchCount: cachedMatches.length,
                        diagnostic: 'Showing recent matches while job sources refresh.',
                    };
                }
            }
            catch (error) {
                console.warn('Unable to read cached job recommendations:', error);
            }
        }
        const results = await Promise.allSettled(providers.map((provider) => this.getProviderJobs(provider)));
        const fetchedJobs = Array.from(new Map(results
            .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
            .map((job) => [`${normalize(job.title)}|${normalize(job.company)}|${normalize(job.location)}`, job])).values());
        const sourcesFailed = results.flatMap((result, index) => {
            if (result.status !== 'rejected')
                return [];
            const message = result.reason instanceof Error ? result.reason.message : 'Provider request failed.';
            if (providers[index].name === 'JSearch' && /HTTP (403|429)/.test(message))
                return [];
            return [{ source: providers[index].name, message: this.formatProviderFailure(providers[index].name, result.reason) }];
        });
        let recentJobs = fetchedJobs;
        if (fetchedJobs.length) {
            try {
                await this.databaseService.saveFeedJobs(fetchedJobs);
            }
            catch (error) {
                sourcesFailed.push({ source: 'PostgreSQL cache', message: error instanceof Error ? error.message : 'Unable to cache fetched jobs.' });
            }
        }
        else {
            try {
                recentJobs = await this.databaseService.getRecentFeedJobs();
            }
            catch (error) {
                sourcesFailed.push({ source: 'PostgreSQL cache', message: error instanceof Error ? error.message : 'Unable to load cached jobs.' });
            }
        }
        const jobs = recentJobs
            .map((job) => ({ ...job, matchScore: this.scoreJob(job, user.profile) }))
            .filter((job) => job.matchScore > 0)
            .sort((left, right) => right.matchScore - left.matchScore);
        const homeMatchCount = jobs.length;
        let diagnostic = '';
        if (!providers.length) {
            diagnostic = 'No job feed providers are configured. Add provider credentials or ATS board identifiers to the backend environment.';
        }
        else if (!recentJobs.length && sourcesFailed.length) {
            diagnostic = 'All configured job feeds failed. Check the provider errors below.';
        }
        else if (!recentJobs.length) {
            diagnostic = 'The configured providers returned no postings for this search. Try a broader role or another preferred city.';
        }
        else if (!homeMatchCount) {
            diagnostic = `Fetched ${recentJobs.length} postings, but none matched the required city and profile criteria.`;
        }
        else if (!fetchedJobs.length) {
            diagnostic = 'Showing recently cached matches because no new postings were returned.';
        }
        return {
            jobs,
            updatedAt: new Date().toISOString(),
            sourcesConfigured: providers.length,
            sourcesFailed,
            fetchedCount: fetchedJobs.length,
            matchedCount: jobs.length,
            homeMatchCount,
            diagnostic,
        };
    }
    getProfileSearch(profile) {
        const preferredCities = asStrings(profile.preferredCity).slice(0, 3);
        const currentLocation = asString(profile.location).trim();
        const locations = [...preferredCities, currentLocation]
            .filter(Boolean)
            .filter((location, index, values) => values.findIndex((item) => normalize(item) === normalize(location)) === index);
        const employmentDetails = Array.isArray(profile.employmentDetails) ? profile.employmentDetails.map(asRecord) : [];
        const skills = [
            ...asStrings(profile.skills),
            ...employmentDetails.flatMap((entry) => asStrings(entry.skills)),
        ].filter((skill, index, allSkills) => allSkills.findIndex((item) => normalize(item) === normalize(skill)) === index);
        const keywords = [
            asString(profile.preferredJobRole),
            asString(profile.currentJobTitle),
            asString(profile.currentRole),
            asString(profile.currentlyWorkingAs),
            asString(profile.headline),
        ].find(Boolean) || skills.slice(0, 3).join(' ');
        return { locations, keywords, skills };
    }
    getProviders(keywords, locations) {
        const providers = [];
        const searchKey = `${normalize(keywords)}|${locations.map(normalize).join(',')}`;
        const adzunaAppId = process.env.ADZUNA_APP_ID;
        const adzunaAppKey = process.env.ADZUNA_APP_KEY;
        if (adzunaAppId && adzunaAppKey)
            providers.push({ name: 'Adzuna', cacheKey: `adzuna:${searchKey}`, fetchJobs: () => this.fetchAdzuna(adzunaAppId, adzunaAppKey, keywords, locations) });
        if (process.env.JOOBLE_API_KEY)
            providers.push({ name: 'Jooble', cacheKey: `jooble:${searchKey}`, fetchJobs: () => this.fetchJooble(process.env.JOOBLE_API_KEY, keywords, locations) });
        if (process.env.RAPIDAPI_KEY)
            providers.push({ name: 'JSearch', cacheKey: `jsearch:${searchKey}`, fetchJobs: () => this.fetchJSearch(process.env.RAPIDAPI_KEY, keywords, locations) });
        const greenhouseBoards = asStrings(process.env.GREENHOUSE_BOARD_SLUGS);
        if (greenhouseBoards.length)
            providers.push({ name: 'Greenhouse', cacheKey: `greenhouse:${greenhouseBoards.slice().sort().join(',')}`, fetchJobs: () => this.fetchGreenhouse(greenhouseBoards) });
        const leverSites = asStrings(process.env.LEVER_COMPANY_SITES);
        if (leverSites.length)
            providers.push({ name: 'Lever', cacheKey: `lever:${leverSites.slice().sort().join(',')}:${locations.map(normalize).join(',')}`, fetchJobs: () => this.fetchLever(leverSites, locations) });
        const workdayTenants = this.getWorkdayTenants();
        if (workdayTenants.length)
            providers.push({ name: 'Workday', cacheKey: `workday:${JSON.stringify(workdayTenants)}:${searchKey}`, fetchJobs: () => this.fetchWorkday(workdayTenants, keywords, locations) });
        return providers;
    }
    async getProviderJobs(provider) {
        const now = Date.now();
        const cached = this.providerJobCache.get(provider.cacheKey);
        const staleJobs = cached?.jobs || [];
        if (cached?.pending)
            return cached.pending;
        if (cached && cached.expiresAt > now)
            return cached.jobs;
        const retryAfter = this.providerRetryAfter.get(provider.name) || 0;
        if (retryAfter > now)
            return staleJobs;
        const pending = provider.fetchJobs();
        this.providerJobCache.set(provider.cacheKey, { expiresAt: 0, jobs: staleJobs, pending });
        try {
            const jobs = await pending;
            this.providerJobCache.set(provider.cacheKey, { expiresAt: Date.now() + 15 * 60 * 1000, jobs });
            return jobs;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (provider.name === 'JSearch' && /HTTP (403|429)/.test(message)) {
                this.providerRetryAfter.set(provider.name, Date.now() + 60 * 60 * 1000);
            }
            else if (/timed out|timeout|aborted/i.test(message)) {
                this.providerRetryAfter.set(provider.name, Date.now() + 5 * 60 * 1000);
            }
            this.providerJobCache.set(provider.cacheKey, { expiresAt: 0, jobs: staleJobs });
            throw error;
        }
    }
    formatProviderFailure(provider, error) {
        const message = error instanceof Error ? error.message : 'Provider request failed.';
        if (provider === 'JSearch' && message.includes('HTTP 429')) {
            return 'RapidAPI rate limit or plan quota reached (HTTP 429). JSearch will pause for one hour; check your RapidAPI usage/plan.';
        }
        if (/timed out|timeout|aborted/i.test(message)) {
            return 'The provider request timed out. Other sources remain available; cached results will be used when possible.';
        }
        return message;
    }
    async requestJson(url, init, timeoutMs = 12000) {
        const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok)
            throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
        return response.json();
    }
    createJob(source, sourceId, title, company, location, description, url, options = {}) {
        if (!sourceId || !title || !url)
            return null;
        const classification = `${title} ${description} ${options.type || ''}`;
        return {
            id: `${source}:${sourceId}`,
            source,
            sourceId,
            title,
            company: company || source,
            location,
            type: options.type || options.employmentType || options.jobType || 'Not specified',
            jobType: options.jobType ?? inferJobType(classification),
            employmentType: options.employmentType ?? inferEmploymentType(classification),
            preferredShift: options.preferredShift ?? inferShift(classification),
            description,
            salary: options.salary || null,
            url,
            postedAt: options.postedAt || null,
            matchScore: 0,
        };
    }
    async fetchAdzuna(appId, appKey, keywords, locations) {
        const country = (process.env.ADZUNA_COUNTRY || 'in').toLowerCase();
        const batches = await Promise.all(locations.map(async (location) => {
            const params = new URLSearchParams({ app_id: appId, app_key: appKey, what: keywords, where: location, results_per_page: '30', 'content-type': 'application/json' });
            const data = asRecord(await this.requestJson(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/1?${params}`));
            return asArray(data.results).map((job) => {
                const company = asRecord(job.company);
                const place = asRecord(job.location);
                return this.createJob('Adzuna', asString(job.id), asString(job.title), asString(company.display_name), asString(place.display_name), asString(job.description), asString(job.redirect_url), {
                    salary: typeof job.salary_min === 'number' && typeof job.salary_max === 'number' ? `${job.salary_min} - ${job.salary_max}` : null,
                    postedAt: asString(job.created) || null,
                });
            }).filter((job) => job !== null);
        }));
        return batches.flat();
    }
    async fetchJooble(apiKey, keywords, locations) {
        const batches = await Promise.all(locations.map(async (location) => {
            const data = asRecord(await this.requestJson(`https://jooble.org/api/${encodeURIComponent(apiKey)}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, location }),
            }));
            return asArray(data.jobs).map((job) => this.createJob('Jooble', asString(job.id) || asString(job.link), asString(job.title), asString(job.company), asString(job.location), asString(job.snippet), asString(job.link), {
                type: asString(job.type), salary: asString(job.salary) || null, postedAt: asString(job.updated) || null,
            })).filter((job) => job !== null);
        }));
        return batches.flat();
    }
    async fetchJSearch(apiKey, keywords, locations) {
        const batches = [];
        for (const location of locations) {
            const params = new URLSearchParams({ query: `${keywords} jobs in ${location}`, page: '1', num_pages: '1', country: 'in' });
            const data = asRecord(await this.requestJson(`https://jsearch.p.rapidapi.com/search?${params}`, {
                headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
            }));
            const jobs = asArray(data.data).map((job) => {
                const place = [asString(job.job_city), asString(job.job_state), asString(job.job_country)].filter(Boolean).join(', ');
                return this.createJob('JSearch', asString(job.job_id), asString(job.job_title), asString(job.employer_name), job.job_is_remote ? `${place} Remote`.trim() : place, asString(job.job_description), asString(job.job_apply_link), {
                    type: asString(job.job_employment_type), employmentType: asString(job.job_employment_type) || null,
                    salary: asString(job.job_salary) || null, postedAt: asString(job.job_posted_at_datetime_utc) || null,
                });
            }).filter((job) => job !== null);
            batches.push(jobs);
        }
        return batches.flat();
    }
    async fetchGreenhouse(boards) {
        const batches = await Promise.all(boards.map(async (board) => {
            const data = asRecord(await this.requestJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`));
            return asArray(data.jobs).map((job) => {
                const place = asRecord(job.location);
                const title = asString(job.title);
                const description = stripMarkup(asString(job.content));
                return this.createJob('Greenhouse', String(job.id || ''), title, board.replace(/[-_]/g, ' '), asString(place.name), description, asString(job.absolute_url), { postedAt: asString(job.updated_at) || null });
            }).filter((job) => job !== null);
        }));
        return batches.flat();
    }
    async fetchLever(sites, locations) {
        const batches = await Promise.all(sites.map(async (site) => {
            const params = new URLSearchParams({ mode: 'json' });
            locations.forEach((location) => params.append('location', location));
            const data = await this.requestJson(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?${params}`, undefined, 25000);
            return asArray(data).map((job) => {
                const categories = asRecord(job.categories);
                const commitment = asString(categories.commitment);
                const timestamp = typeof job.createdAt === 'number' ? new Date(job.createdAt).toISOString() : null;
                return this.createJob('Lever', asString(job.id), asString(job.text), site, asString(categories.location), `${asString(job.descriptionPlain)} ${asString(job.additionalPlain)}`.trim(), asString(job.hostedUrl), {
                    type: commitment, employmentType: commitment || null, postedAt: timestamp,
                });
            }).filter((job) => job !== null);
        }));
        return batches.flat();
    }
    getWorkdayTenants() {
        if (!process.env.WORKDAY_TENANTS)
            return [];
        try {
            const tenants = JSON.parse(process.env.WORKDAY_TENANTS);
            return asArray(tenants).map((tenant) => ({
                tenant: asString(tenant.tenant),
                host: asString(tenant.host),
                site: asString(tenant.site),
                company: asString(tenant.company) || undefined,
            })).filter((tenant) => tenant.tenant && tenant.host && tenant.site);
        }
        catch {
            return [];
        }
    }
    async fetchWorkday(tenants, keywords, locations) {
        const batches = await Promise.all(tenants.map(async (tenant) => {
            const host = tenant.host.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const url = `https://${host}/wday/cxs/${encodeURIComponent(tenant.tenant)}/${encodeURIComponent(tenant.site)}/jobs`;
            const locationBatches = await Promise.all(locations.map(async (location) => {
                const data = asRecord(await this.requestJson(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: `${keywords} ${location}` }),
                }));
                return asArray(data.jobPostings).map((job) => {
                    const externalPath = asString(job.externalPath);
                    const listedLocation = asString(job.locationsText) || asString(job.location) || asString(job.locationName);
                    const searchableLocation = `${asStrings(job.bulletFields).join(' ')} ${externalPath}`;
                    const matchingCandidateLocation = locations.find((candidateLocation) => [
                        candidateLocation,
                        ...(cityAliases[normalize(candidateLocation)] || []),
                    ].some((city) => normalize(searchableLocation).includes(normalize(city))));
                    const pathLocation = externalPath.split('/').filter(Boolean)[1]?.replace(/-/g, ' ') || '';
                    const jobLocation = listedLocation || matchingCandidateLocation || pathLocation || asStrings(job.bulletFields).join(', ');
                    const jobUrl = externalPath.startsWith('http') ? externalPath : `https://${host}${externalPath}`;
                    return this.createJob('Workday', externalPath || asString(job.title), asString(job.title), tenant.company || tenant.tenant, jobLocation, asString(job.jobDescription) || asString(job.bulletFields), jobUrl, {
                        postedAt: asString(job.postedOn) || null,
                    });
                }).filter((job) => job !== null);
            }));
            return locationBatches.flat();
        }));
        return batches.flat();
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
    scoreJob(job, profile) {
        const text = `${job.title} ${job.description}`;
        const preferredRole = asString(profile.preferredJobRole);
        const employmentDetails = Array.isArray(profile.employmentDetails)
            ? profile.employmentDetails.map((entry) => asRecord(entry))
            : [];
        const projects = Array.isArray(profile.majorProjects) ? profile.majorProjects.map((entry) => asRecord(entry)) : [];
        const headlineSignals = [
            asString(profile.headline), asString(profile.currentlyWorkingAs), asString(profile.currentRole), asString(profile.currentJobTitle),
            ...employmentDetails.flatMap((entry) => [asString(entry.jobTitle), asString(entry.jobProfile)]),
            ...projects.flatMap((entry) => [asString(entry.projectTitle), asString(entry.projectDetails)]),
        ].filter(Boolean);
        const candidateLocations = [
            ...asStrings(profile.preferredCity),
            asString(profile.location),
        ].filter((location, index, locations) => location.trim() && locations.findIndex((item) => normalize(item) === normalize(location)) === index);
        const skills = [
            ...asStrings(profile.skills),
            ...employmentDetails.flatMap((entry) => asStrings(entry.skills)),
        ].filter((skill, index, allSkills) => allSkills.findIndex((item) => normalize(item) === normalize(skill)) === index);
        if (!preferredRole && !headlineSignals.length && !skills.length)
            return 0;
        if (!candidateLocations.length)
            return 0;
        const jobLocation = normalize(job.location);
        const locationMatches = candidateLocations.some((city) => {
            const cityName = normalize(city);
            return [cityName, ...(cityAliases[cityName] || []).map(normalize)].some((variant) => variant && jobLocation.includes(variant));
        });
        if (!locationMatches)
            return 0;
        const roleScore = preferredRole ? textMatch(preferredRole, text) : null;
        const headlineScore = headlineSignals.length ? Math.max(...headlineSignals.map((signal) => textMatch(signal, text))) : null;
        const skillsScore = skills.length
            ? Math.min(1, skills.filter((skill) => textMatch(skill, text) > 0).length / Math.min(skills.length, 5))
            : null;
        const coreScores = [roleScore, headlineScore, skillsScore].filter((score) => score !== null);
        if (!coreScores.some((score) => score > 0))
            return 0;
        let availableWeight = 0;
        let earnedWeight = 0;
        const add = (weight, score) => {
            availableWeight += weight;
            earnedWeight += weight * score;
        };
        add(45, 1);
        const coreStrength = Math.max(...coreScores);
        const coreCoverage = coreScores.reduce((total, score) => total + score, 0) / coreScores.length;
        const profileScore = coreStrength * 0.75 + coreCoverage * 0.25;
        add(55, profileScore);
        const preferredJobType = asString(profile.jobType);
        if (preferredJobType && job.jobType)
            add(10, normalize(preferredJobType) === normalize(job.jobType) ? 1 : 0);
        const preferredEmploymentType = asString(profile.employmentType);
        if (preferredEmploymentType && job.employmentType)
            add(10, normalize(preferredEmploymentType) === normalize(job.employmentType) ? 1 : 0);
        const preferredShift = asString(profile.preferredShift);
        if (preferredShift && job.preferredShift)
            add(5, normalize(preferredShift) === normalize(job.preferredShift) ? 1 : 0);
        const currentEmployment = employmentDetails.find((entry) => entry.isCurrent);
        const noticePeriod = asString(profile.noticePeriod) || asString(currentEmployment?.noticePeriod);
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