import { Injectable, Logger, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { jobLearningCatalog } from './job-learning-catalog';

interface PortalJob {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  company: string;
  location: string;
  type: string;
  jobType: string | null;
  employmentType: string | null;
  preferredShift: string | null;
  description: string;
  salary: string | null;
  url: string;
  postedAt: string | null;
  matchScore: number;
}

interface WorkdayTenant {
  tenant: string;
  host: string;
  site: string;
  company?: string;
}

interface JobProvider {
  name: string;
  cacheKey: string;
  fetchJobs: () => Promise<PortalJob[]>;
}

interface CachedProviderJobs {
  expiresAt: number;
  jobs: PortalJob[];
  pending?: Promise<PortalJob[]>;
}

type UnknownRecord = Record<string, unknown>;

const asString = (value: unknown) => typeof value === 'string' ? value : '';
const asRecord = (value: unknown): UnknownRecord => value && typeof value === 'object' ? value as UnknownRecord : {};
const asArray = (value: unknown): UnknownRecord[] => Array.isArray(value) ? value.map(asRecord) : [];
const asStrings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  : typeof value === 'string' && value.trim() ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').replace(/\s+/g, ' ').trim();
const stripMarkup = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentionsSkill = (text: string, matcher: string) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(matcher)}(?=$|[^a-z0-9])`, 'i').test(text);
const workdayListingUrl = (host: string, site: string, externalPath: string) => {
  if (/^https?:\/\//i.test(externalPath)) return externalPath;
  const path = externalPath.startsWith('/') ? externalPath : `/${externalPath}`;
  const lowerPath = path.toLowerCase();
  const lowerSite = site.toLowerCase();
  const includesSitePath = lowerPath.startsWith(`/en-us/${lowerSite}/`) || lowerPath.startsWith(`/${lowerSite}/`);
  const publicPath = includesSitePath ? path : `/en-US/${site}${path}`;
  return new URL(publicPath, `https://${host.replace(/^https?:\/\//i, '').replace(/\/$/, '')}`).toString();
};
const cityAliases: Record<string, string[]> = {
  bengaluru: ['bangalore'], bangalore: ['bengaluru'],
  gurugram: ['gurgaon'], gurgaon: ['gurugram'],
  noida: ['greater noida'], 'greater noida': ['noida'],
  'delhi ncr': ['delhi', 'new delhi', 'noida', 'greater noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'],
  mumbai: ['bombay'], bombay: ['mumbai'],
  kolkata: ['calcutta'], calcutta: ['kolkata'],
};

const inferJobType = (text: string): string | null => {
  if (/\b(contract|contractor|temporary|fixed.term|freelance)\b/i.test(text)) return 'Contractual';
  if (/\b(permanent|regular employment)\b/i.test(text)) return 'Permanent';
  return null;
};

const inferEmploymentType = (text: string): string | null => {
  if (/\bpart[\s.-]?time\b/i.test(text)) return 'Part Time';
  if (/\bfull[\s.-]?time\b/i.test(text)) return 'Full Time';
  return null;
};

const inferShift = (text: string): string | null => {
  if (/\b(rotational|rotating shift)\b/i.test(text)) return 'Rotational';
  if (/\b(night shift|overnight)\b/i.test(text)) return 'Night';
  if (/\b(day shift)\b/i.test(text)) return 'Day';
  return null;
};

const parseSalaryLpa = (value: string | null) => {
  if (!value || !/(?:\bINR\b|₹|\bLPA\b|\blakhs?\b)/i.test(value)) return null;
  const amounts = Array.from(value.matchAll(/\d[\d,]*(?:\.\d+)?/g), (match) => Number(match[0].replace(/,/g, ''))).filter(Number.isFinite);
  if (!amounts.length) return null;
  if (/\bLPA\b|\blakhs?\b/i.test(value)) return amounts.reduce((total, amount) => total + amount, 0) / amounts.length;
  const multiplier = /\bmonth(?:ly)?\b/i.test(value) ? 12 : 1;
  return amounts.reduce((total, amount) => total + amount, 0) / amounts.length * multiplier / 100000;
};

const getExperienceYears = (profile: Record<string, unknown>) => {
  const explicitExperience = profile.totalExperienceYears;
  const explicitYears = explicitExperience === undefined || explicitExperience === null || String(explicitExperience).trim() === ''
    ? Number.NaN
    : Number(explicitExperience);
  if (Number.isFinite(explicitYears) && explicitYears >= 0) return explicitYears;
  const entries = Array.isArray(profile.employmentDetails) ? profile.employmentDetails.map((entry) => asRecord(entry)) : [];
  const intervals = entries.map((entry) => {
    const start = Date.parse(asString(entry.joiningDate));
    const end = entry.isCurrent ? Date.now() : Date.parse(asString(entry.relievingDate));
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? { start, end } : null;
  }).filter((interval): interval is { start: number; end: number } => interval !== null).sort((left, right) => left.start - right.start);
  if (!intervals.length) return null;
  let totalMilliseconds = 0;
  let mergedStart = intervals[0].start;
  let mergedEnd = intervals[0].end;
  for (const interval of intervals.slice(1)) {
    if (interval.start <= mergedEnd) mergedEnd = Math.max(mergedEnd, interval.end);
    else {
      totalMilliseconds += mergedEnd - mergedStart;
      mergedStart = interval.start;
      mergedEnd = interval.end;
    }
  }
  totalMilliseconds += mergedEnd - mergedStart;
  return totalMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
};

const getRequiredExperience = (text: string) => {
  const ranges = [
    /\b(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:(?:relevant|professional|work|industry)\s+)?experience\b/gi,
    /\b(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?)\s+(?:of\s+)?(?:(?:relevant|professional|work|industry)\s+)?experience\b/gi,
  ];
  for (const pattern of ranges) {
    const match = pattern.exec(text);
    if (match) return { minimum: Number(match[1]), maximum: match[2] ? Number(match[2]) : null };
  }
  return null;
};

const mapWithConcurrency = async <T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }));
  return results;
};

const textMatch = (query: string, haystack: string) => {
  const normalizedQuery = normalize(query);
  const normalizedHaystack = normalize(haystack);
  if (normalizedQuery && normalizedHaystack.includes(normalizedQuery)) return 1;
  const terms = normalizedQuery.split(' ').filter((term) => term.length > 2 && !['the', 'and', 'for', 'with', 'senior', 'junior'].includes(term));
  if (!terms.length) return 0;
  const hits = terms.filter((term) => normalizedHaystack.includes(term)).length;
  return hits / terms.length;
};

const noticeSignal = (noticePeriod: string, text: string) => {
  const normalized = normalize(text);
  const signals: Record<string, RegExp> = {
    'less than a month': /\b(immediate|15 days|within 30 days|30 days|one month)\b/,
    '1 month': /\b(within 30 days|30 days|one month|1 month)\b/,
    '2 months': /\b(within 60 days|60 days|two months|2 months)\b/,
    '3 months': /\b(within 90 days|90 days|three months|3 months)\b/,
    'more than 3 months': /\b(more than 90 days|over three months|over 3 months)\b/,
  };
  const pattern = signals[normalize(noticePeriod)];
  return pattern ? (pattern.test(normalized) ? 1 : 0) : 0;
};

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly providerJobCache = new Map<string, CachedProviderJobs>();
  private readonly providerRetryAfter = new Map<string, number>();
  private readonly logger = new Logger(JobsService.name);
  private feedRefreshRunning = false;
  private lastFeedRefreshAt: string | null = null;
  private lastFeedRefreshFailures: { source: string; message: string }[] = [];

  constructor(private readonly databaseService: DatabaseService) {}

  onModuleInit() {
    void this.refreshJobFeeds();
  }

  @Cron('0 0 */2 * * *')
  async refreshJobFeedsOnSchedule() {
    await this.refreshJobFeeds();
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

  async getRecommendations(email: string, requestedLimit = 12, requestedOffset = 0) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new UnauthorizedException('A valid email is required to find matching jobs.');
    const user = await this.databaseService.getUserByEmail(normalizedEmail);
    if (!user) throw new NotFoundException('Profile not found for this email.');
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
    const availableJobs = [
      ...await this.databaseService.getRecentFeedJobs(),
      ...await this.databaseService.getRecruiterJobListings() as PortalJob[],
    ];
    const allMatches = availableJobs
      .map((job) => ({ ...job, matchScore: this.scoreJob(job, user.profile) }))
      .filter((job) => job.matchScore > 0)
      .sort((left, right) => right.matchScore - left.matchScore);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(30, Math.floor(requestedLimit))) : 12;
    const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0;
    const jobs = allMatches.slice(offset, offset + limit);
    const homeMatchCount = allMatches.length;
    let diagnostic = '';
    if (!providers.length) {
      diagnostic = 'No job feed providers are configured. Add provider credentials or ATS board identifiers to the backend environment.';
    } else if (!homeMatchCount) {
      diagnostic = this.lastFeedRefreshAt
        ? `No cached postings currently match your profile and location. Feed last refreshed ${this.lastFeedRefreshAt}.`
        : 'Job feeds are warming up. Matching postings will appear as the first scheduled refresh completes.';
    }

    return {
      jobs,
      updatedAt: this.lastFeedRefreshAt || new Date().toISOString(),
      sourcesConfigured: providers.length,
      sourcesFailed: this.lastFeedRefreshFailures,
      fetchedCount: 0,
      matchedCount: allMatches.length,
      homeMatchCount,
      limit,
      offset,
      hasMore: offset + jobs.length < allMatches.length,
      nextOffset: offset + jobs.length,
      diagnostic,
    };
  }

  private async refreshJobFeeds() {
    if (this.feedRefreshRunning) return;
    this.feedRefreshRunning = true;
    const refreshStartedAt = new Date().toISOString();
    const failedSources = new Map<string, string>();
    try {
      const profiles = await this.databaseService.getCandidateJobSearchProfiles();
      const searches = Array.from(new Map(profiles
        .map((profile) => this.getProfileSearch(profile))
        .filter((search) => search.locations.length && search.keywords)
        .map((search) => [`${normalize(search.keywords)}|${search.locations.map(normalize).sort().join(',')}`, search])).values());
      const providersByKey = new Map<string, JobProvider>();
      const staticOnlySources = new Set(['Arbeitnow', 'Greenhouse', 'Ashby', 'SmartRecruiters']);
      const searchInputs = searches.length ? searches : [{ keywords: '', locations: [] }];
      for (const search of searchInputs) {
        for (const provider of this.getProviders(search.keywords, search.locations)) {
          if (!searches.length && !staticOnlySources.has(provider.name)) continue;
          providersByKey.set(provider.cacheKey, provider);
        }
      }

      const providers = Array.from(providersByKey.values());
      const outcomes = await mapWithConcurrency(providers, 4, async (provider) => {
        try {
          return { provider, jobs: await this.getProviderJobs(provider), error: '' };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Provider request failed.';
          return { provider, jobs: [] as PortalJob[], error: this.formatProviderFailure(provider.name, error) || message };
        }
      });
      const jobs = outcomes.flatMap((outcome) => outcome.jobs);
      const outcomesBySource = new Map<string, typeof outcomes>();
      for (const outcome of outcomes) {
        const sourceOutcomes = outcomesBySource.get(outcome.provider.name) || [];
        sourceOutcomes.push(outcome);
        outcomesBySource.set(outcome.provider.name, sourceOutcomes);
        if (outcome.error) failedSources.set(outcome.provider.name, outcome.error);
      }
      if (jobs.length) await this.databaseService.saveFeedJobs(jobs);
      for (const [source, sourceOutcomes] of outcomesBySource) {
        if (sourceOutcomes.some((outcome) => outcome.error)) continue;
        await this.databaseService.deleteStaleFeedJobs(source, refreshStartedAt);
      }
      try {
        await this.syncLearningContentFromJobs();
      } catch (error) {
        this.logger.warn(`Unable to synchronize job skills to Library and Courses: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
      this.lastFeedRefreshAt = new Date().toISOString();
      this.lastFeedRefreshFailures = Array.from(failedSources, ([source, message]) => ({ source, message }));
      this.logger.log(`Job feed refresh complete: ${jobs.length} listings from ${providers.length} provider searches.`);
    } catch (error) {
      this.logger.error('Job feed refresh failed.', error instanceof Error ? error.stack : undefined);
      this.lastFeedRefreshFailures = [{ source: 'Job feed scheduler', message: error instanceof Error ? error.message : 'Unable to refresh job feeds.' }];
    } finally {
      this.feedRefreshRunning = false;
    }
  }

  private async syncLearningContentFromJobs() {
    const jobs = await this.databaseService.getRecentFeedJobs();
    const jobText = jobs.map((job) => `${job.title} ${job.description}`).join('\n');
    const discoveredSkills = jobLearningCatalog.filter((skill) => skill.matchers.some((matcher) => mentionsSkill(jobText, matcher)));
    if (!discoveredSkills.length) return;

    const topics = discoveredSkills.map((skill) => ({
      name: skill.name,
      briefDescription: skill.briefDescription,
      explanation: skill.explanation,
      example: skill.example,
    }));
    const courseSearchProviders = [
      { provider: 'Coursera', baseUrl: 'https://www.coursera.org/search?query=' },
      { provider: 'Udemy', baseUrl: 'https://www.udemy.com/courses/search/?q=' },
    ];
    const courses = discoveredSkills.flatMap((skill) => courseSearchProviders.map(({ provider, baseUrl }) => ({
      title: `${skill.name} courses on ${provider}`,
      topic: skill.name,
      provider,
      level: 'All levels',
      duration: 'Self-paced',
      url: `${baseUrl}${encodeURIComponent(skill.name)}`,
    })));

    await this.databaseService.addMissingJobLearningContent(topics, courses);
    this.logger.log(`Synchronized ${discoveredSkills.length} job skills to the Library and Courses.`);
  }

  private getProfileSearch(profile: Record<string, unknown>) {
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

  private getProviders(keywords: string, locations: string[]): JobProvider[] {
    const providers: JobProvider[] = [];
    const searchKey = `${normalize(keywords)}|${locations.map(normalize).join(',')}`;
    providers.push({ name: 'Arbeitnow', cacheKey: 'arbeitnow:public-feed', fetchJobs: () => this.fetchArbeitnow() });
    const serpApiKey = process.env.SERPAPI_API_KEY;
    if (serpApiKey) providers.push({ name: 'Google Jobs (SerpApi)', cacheKey: `google-jobs:${searchKey}`, fetchJobs: () => this.fetchGoogleJobs(serpApiKey, keywords, locations) });

    const adzunaAppId = process.env.ADZUNA_APP_ID;
    const adzunaAppKey = process.env.ADZUNA_APP_KEY;
    if (adzunaAppId && adzunaAppKey) providers.push({ name: 'Adzuna', cacheKey: `adzuna:${searchKey}`, fetchJobs: () => this.fetchAdzuna(adzunaAppId, adzunaAppKey, keywords, locations) });
    if (process.env.JOOBLE_API_KEY) providers.push({ name: 'Jooble', cacheKey: `jooble:${searchKey}`, fetchJobs: () => this.fetchJooble(process.env.JOOBLE_API_KEY as string, keywords, locations) });
    if (process.env.RAPIDAPI_KEY) providers.push({ name: 'JSearch', cacheKey: `jsearch:${searchKey}`, fetchJobs: () => this.fetchJSearch(process.env.RAPIDAPI_KEY as string, keywords, locations) });

    const greenhouseBoards = asStrings(process.env.GREENHOUSE_BOARD_SLUGS);
    for (const board of greenhouseBoards) {
      providers.push({ name: 'Greenhouse', cacheKey: `greenhouse:${board}`, fetchJobs: () => this.fetchGreenhouse(board) });
    }
    const leverSites = asStrings(process.env.LEVER_COMPANY_SITES);
    if (leverSites.length) providers.push({ name: 'Lever', cacheKey: `lever:${leverSites.slice().sort().join(',')}:${locations.map(normalize).join(',')}`, fetchJobs: () => this.fetchLever(leverSites, locations) });
    const ashbyBoards = asStrings(process.env.ASHBY_JOB_BOARDS);
    if (ashbyBoards.length) providers.push({ name: 'Ashby', cacheKey: `ashby:${ashbyBoards.slice().sort().join(',')}`, fetchJobs: () => this.fetchAshby(ashbyBoards) });
    const smartRecruitersCompanies = asStrings(process.env.SMARTRECRUITERS_COMPANIES);
    if (smartRecruitersCompanies.length) providers.push({ name: 'SmartRecruiters', cacheKey: `smartrecruiters:${smartRecruitersCompanies.slice().sort().join(',')}`, fetchJobs: () => this.fetchSmartRecruiters(smartRecruitersCompanies) });
    const workdayTenants = this.getWorkdayTenants();
    if (workdayTenants.length) providers.push({ name: 'Workday', cacheKey: `workday:${JSON.stringify(workdayTenants)}:${searchKey}`, fetchJobs: () => this.fetchWorkday(workdayTenants, keywords, locations) });
    return providers;
  }

  private async getProviderJobs(provider: JobProvider): Promise<PortalJob[]> {
    const now = Date.now();
    const cached = this.providerJobCache.get(provider.cacheKey);
    const staleJobs = cached?.jobs || [];
    if (cached?.pending) return cached.pending;
    if (cached && cached.expiresAt > now) return cached.jobs;

    const retryAfter = Math.max(this.providerRetryAfter.get(provider.name) || 0, this.providerRetryAfter.get(provider.cacheKey) || 0);
    if (retryAfter > now) return staleJobs;

    const pending = provider.fetchJobs();
    this.providerJobCache.set(provider.cacheKey, { expiresAt: 0, jobs: staleJobs, pending });
    try {
      const jobs = await pending;
      this.providerJobCache.set(provider.cacheKey, { expiresAt: Date.now() + 15 * 60 * 1000, jobs });
      return jobs;
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (provider.name === 'JSearch' && /HTTP (403|429)/.test(message)) {
        this.providerRetryAfter.set(provider.name, Date.now() + 60 * 60 * 1000);
      } else if (/timed out|timeout|aborted/i.test(message)) {
        this.providerRetryAfter.set(provider.cacheKey, Date.now() + 5 * 60 * 1000);
      }
      this.providerJobCache.set(provider.cacheKey, { expiresAt: 0, jobs: staleJobs });
      throw error;
    }
  }

  private formatProviderFailure(provider: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'Provider request failed.';
    if (provider === 'JSearch' && message.includes('HTTP 429')) {
      return 'RapidAPI rate limit or plan quota reached (HTTP 429). JSearch will pause for one hour; check your RapidAPI usage/plan.';
    }
    if (/timed out|timeout|aborted/i.test(message)) {
      const greenhouseBoard = message.match(/Greenhouse board ([^:]+):/);
      const providerLabel = greenhouseBoard ? `Greenhouse board ${greenhouseBoard[1]}` : provider;
      return `${providerLabel} request timed out. Other sources remain available; cached results will be used when possible.`;
    }
    return message;
  }

  private async requestJson(url: string, init?: RequestInit, timeoutMs = 12000): Promise<unknown> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
    return response.json();
  }

  private createJob(source: string, sourceId: string, title: string, company: string, location: string, description: string, url: string, options: { type?: string; jobType?: string | null; employmentType?: string | null; preferredShift?: string | null; salary?: string | null; postedAt?: string | null } = {}): PortalJob | null {
    if (!sourceId || !title || !url) return null;
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

  private async fetchAdzuna(appId: string, appKey: string, keywords: string, locations: string[]): Promise<PortalJob[]> {
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
      }).filter((job): job is PortalJob => job !== null);
    }));
    return batches.flat();
  }

  private async fetchJooble(apiKey: string, keywords: string, locations: string[]): Promise<PortalJob[]> {
    const batches = await Promise.all(locations.map(async (location) => {
      const data = asRecord(await this.requestJson(`https://jooble.org/api/${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords, location }),
      }));
      return asArray(data.jobs).map((job) => this.createJob('Jooble', asString(job.id) || asString(job.link), asString(job.title), asString(job.company), asString(job.location), asString(job.snippet), asString(job.link), {
        type: asString(job.type), salary: asString(job.salary) || null, postedAt: asString(job.updated) || null,
      })).filter((job): job is PortalJob => job !== null);
    }));
    return batches.flat();
  }

  private async fetchJSearch(apiKey: string, keywords: string, locations: string[]): Promise<PortalJob[]> {
    const batches: PortalJob[][] = [];
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
      }).filter((job): job is PortalJob => job !== null);
      batches.push(jobs);
    }
    return batches.flat();
  }

  private async fetchGoogleJobs(apiKey: string, keywords: string, locations: string[]): Promise<PortalJob[]> {
    const configuredLimit = Number(process.env.GOOGLE_JOBS_MAX_LOCATIONS || 1);
    const locationLimit = Number.isFinite(configuredLimit) ? Math.max(1, Math.min(3, configuredLimit)) : 1;
    const country = (process.env.GOOGLE_JOBS_COUNTRY || 'in').toLowerCase();
    const language = process.env.GOOGLE_JOBS_LANGUAGE || 'en';
    const batches = await Promise.all(locations.slice(0, locationLimit).map(async (location) => {
      const params = new URLSearchParams({
        engine: 'google_jobs',
        q: `${keywords} jobs`,
        location,
        gl: country,
        hl: language,
        api_key: apiKey,
      });
      const data = asRecord(await this.requestJson(`https://serpapi.com/search.json?${params}`));
      return asArray(data.jobs_results).map((job) => {
        const extensions = asRecord(job.detected_extensions);
        const applyOptions = asArray(job.apply_options);
        const url = asString(applyOptions[0]?.link) || asString(job.share_link);
        const sourceId = asString(job.job_id) || url;
        const highlights = asArray(job.job_highlights).flatMap((section) => asStrings(section.items)).join(' ');
        const description = [asString(job.description), highlights].filter(Boolean).join(' ');
        const employmentType = asString(extensions.schedule_type) || null;
        return this.createJob('Google Jobs (SerpApi)', sourceId, asString(job.title), asString(job.company_name), asString(job.location), description, url, {
          type: employmentType || undefined,
          employmentType,
          salary: asString(extensions.salary) || null,
          postedAt: asString(extensions.posted_at) || null,
        });
      }).filter((job): job is PortalJob => job !== null);
    }));
    return batches.flat();
  }

  private async fetchArbeitnow(): Promise<PortalJob[]> {
    const data = asRecord(await this.requestJson('https://www.arbeitnow.com/api/job-board-api'));
    return asArray(data.data).map((job) => {
      const jobTypes = asStrings(job.job_types);
      const url = asString(job.url);
      const location = [asString(job.location), job.remote === true ? 'Remote' : ''].filter(Boolean).join(' ');
      return this.createJob('Arbeitnow', asString(job.slug) || url, asString(job.title), asString(job.company_name), location, stripMarkup(asString(job.description)), url, {
        type: jobTypes[0],
        employmentType: jobTypes[0] || null,
        postedAt: asString(job.created_at) || null,
      });
    }).filter((job): job is PortalJob => job !== null);
  }

  private async fetchAshby(boards: string[]): Promise<PortalJob[]> {
    const batches = await Promise.all(boards.map(async (board) => {
      const data = asRecord(await this.requestJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`));
      return asArray(data.jobs).filter((job) => job.isListed !== false).map((job) => {
        const address = asRecord(asRecord(job.address).postalAddress);
        const secondaryLocations = asArray(job.secondaryLocations).map((item) => asString(item.location));
        const location = [asString(job.location), ...secondaryLocations, asString(address.addressLocality), asString(address.addressRegion), asString(address.addressCountry)]
          .filter((value, index, values) => value && values.indexOf(value) === index)
          .join(', ');
        const url = asString(job.applyUrl) || asString(job.jobUrl);
        const employmentType = asString(job.employmentType) || null;
        const compensation = asRecord(job.compensation);
        return this.createJob('Ashby', asString(job.jobUrl) || url, asString(job.title), asString(job.companyName) || board, location, asString(job.descriptionPlain) || stripMarkup(asString(job.descriptionHtml)), url, {
          type: employmentType || undefined,
          employmentType,
          salary: asString(compensation.scrapeableCompensationSalarySummary) || null,
          postedAt: asString(job.publishedAt) || null,
        });
      }).filter((job): job is PortalJob => job !== null);
    }));
    return batches.flat();
  }

  private async fetchSmartRecruiters(companies: string[]): Promise<PortalJob[]> {
    const configuredLimit = Number(process.env.SMARTRECRUITERS_MAX_POSTINGS || 20);
    const postingLimit = Number.isFinite(configuredLimit) ? Math.max(1, Math.min(50, configuredLimit)) : 20;
    const batches = await mapWithConcurrency(companies, 3, async (company) => {
      const params = new URLSearchParams({ limit: String(postingLimit), offset: '0' });
      const data = asRecord(await this.requestJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings?${params}`));
      const details = await mapWithConcurrency(asArray(data.content).slice(0, postingLimit), 4, async (posting) => {
        const postingId = asString(posting.id);
        if (!postingId) return null;
        const detail = asRecord(await this.requestJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(postingId)}`));
        const location = asRecord(posting.location);
        const companyInfo = asRecord(detail.company || posting.company);
        const jobAd = asRecord(detail.jobAd);
        const sections = asRecord(jobAd.sections);
        const description = Object.values(sections).map((section) => asString(asRecord(section).text)).filter(Boolean).map(stripMarkup).join(' ');
        const employment = asRecord(posting.typeOfEmployment);
        const locationText = [asString(location.city), asString(location.region), asString(location.country)]
          .filter(Boolean)
          .join(', ') || (location.remote === true ? 'Remote' : '');
        const url = asString(detail.applyUrl) || asString(detail.postingUrl) || asString(posting.applyUrl) || asString(posting.jobAdUrl);
        const employmentType = asString(employment.label) || null;
        return this.createJob('SmartRecruiters', postingId, asString(posting.name), asString(companyInfo.name) || company, locationText, description, url, {
          type: employmentType || undefined,
          employmentType,
          postedAt: asString(posting.releasedDate) || null,
        });
      });
      return details.filter((job): job is PortalJob => job !== null);
    });
    return batches.flat();
  }

  private async fetchGreenhouse(board: string): Promise<PortalJob[]> {
    let data: UnknownRecord;
    try {
      data = asRecord(await this.requestJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`, undefined, 25000));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Provider request failed.';
      throw new Error(`Greenhouse board ${board}: ${message}`);
    }
    return asArray(data.jobs).map((job) => {
      const place = asRecord(job.location);
      const title = asString(job.title);
      const description = stripMarkup(asString(job.content));
      return this.createJob('Greenhouse', String(job.id || ''), title, board.replace(/[-_]/g, ' '), asString(place.name), description, asString(job.absolute_url), { postedAt: asString(job.updated_at) || null });
    }).filter((job): job is PortalJob => job !== null);
  }

  private async fetchLever(sites: string[], locations: string[]): Promise<PortalJob[]> {
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
      }).filter((job): job is PortalJob => job !== null);
    }));
    return batches.flat();
  }

  private getWorkdayTenants(): WorkdayTenant[] {
    if (!process.env.WORKDAY_TENANTS) return [];
    try {
      const tenants = JSON.parse(process.env.WORKDAY_TENANTS) as unknown;
      return asArray(tenants).map((tenant) => ({
        tenant: asString(tenant.tenant),
        host: asString(tenant.host),
        site: asString(tenant.site),
        company: asString(tenant.company) || undefined,
      })).filter((tenant) => tenant.tenant && tenant.host && tenant.site);
    } catch {
      return [];
    }
  }

  private async fetchWorkday(tenants: WorkdayTenant[], keywords: string, locations: string[]): Promise<PortalJob[]> {
    const batches = await Promise.all(tenants.map(async (tenant) => {
      const host = tenant.host.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const url = `https://${host}/wday/cxs/${encodeURIComponent(tenant.tenant)}/${encodeURIComponent(tenant.site)}/jobs`;
      const locationBatches = await Promise.all(locations.map(async (location) => {
        const data = asRecord(await this.requestJson(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: `${keywords} ${location}` }),
        }, 6000));
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
          const jobUrl = workdayListingUrl(host, tenant.site, externalPath);
          return this.createJob('Workday', externalPath || asString(job.title), asString(job.title), tenant.company || tenant.tenant, jobLocation, asString(job.jobDescription) || asString(job.bulletFields), jobUrl, {
            postedAt: asString(job.postedOn) || null,
          });
        }).filter((job): job is PortalJob => job !== null);
      }));
      return locationBatches.flat();
    }));
    return batches.flat();
  }

  getApplications(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to load applied jobs.');
    return this.databaseService.getUserJobApplications(email);
  }

  apply(email: string, job: Record<string, unknown>) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to apply.');
    return this.databaseService.applyUserToJob(email, job);
  }

  getRecruiterOpenings(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid recruiter email is required.');
    return this.databaseService.getRecruiterJobOpenings(email);
  }

  createRecruiterOpening(email: string, input: Record<string, unknown>) {
    if (!email?.trim()) throw new UnauthorizedException('A valid recruiter email is required.');
    if (typeof input.position !== 'string' || !input.position.trim()
      || typeof input.location !== 'string' || !input.location.trim()
      || !['Hybrid', 'Full-time'].includes(String(input.workMode))
      || typeof input.description !== 'string' || !input.description.trim()
      || typeof input.companyAbout !== 'string' || !input.companyAbout.trim()) {
      throw new NotFoundException('Complete all required job opening details.');
    }
    return this.databaseService.createRecruiterJobOpening(email, input);
  }

  closeRecruiterOpening(email: string, openingId: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid recruiter email is required.');
    return this.databaseService.closeRecruiterJobOpening(email, openingId);
  }

  applyToRecruiterOpening(email: string, openingId: string, details: Record<string, unknown>) {
    if (!email?.trim()) throw new UnauthorizedException('A valid candidate email is required.');
    return this.databaseService.applyToRecruiterJob(email, openingId, details || {});
  }

  async getReceivedApplications(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid recruiter email is required.');
    const openings = await this.databaseService.getRecruiterApplications(email);
    return openings.map((opening) => ({
      ...opening,
      applicants: (opening.applicants as Record<string, unknown>[]).map((application) => {
        const candidate = application.candidate as Record<string, unknown>;
        const profile = candidate.profile as Record<string, unknown> || {};
        const score = this.scoreJob(opening as PortalJob, profile);
        const employment = Array.isArray(profile.employmentDetails) ? profile.employmentDetails.map(asRecord) : [];
        const current = employment.find((entry) => entry.isCurrent) || employment[0] || {};
        return {
          ...application,
          matchScore: score,
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            headline: asString(profile.headline || profile.currentlyWorkingAs || profile.currentRole),
            company: asString(profile.companyName || profile.currentCompany || current.companyName),
          },
        };
      }).sort((left, right) => Number(right.matchScore) - Number(left.matchScore)),
    }));
  }

  getReceivedApplication(email: string, applicationId: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid recruiter email is required.');
    return this.databaseService.getRecruiterApplicationDetails(email, applicationId);
  }

  setApplicationStatus(email: string, applicationId: string, status: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid recruiter email is required.');
    if (!['viewed', 'resume_downloaded', 'shortlisted', 'not_shortlisted'].includes(status)) {
      throw new NotFoundException('Choose a valid application status.');
    }
    return this.databaseService.updateRecruiterApplicationStatus(email, applicationId, status);
  }

  private scoreJob(job: PortalJob, profile: Record<string, unknown>) {
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
    if (!preferredRole && !headlineSignals.length && !skills.length) return 0;
    if (!candidateLocations.length) return 0;
    const jobLocation = normalize(job.location);
    const locationMatches = candidateLocations.some((city) => {
      const cityName = normalize(city);
      return [cityName, ...(cityAliases[cityName] || []).map(normalize)].some((variant) => variant && jobLocation.includes(variant));
    });
    if (!locationMatches) return 0;
    const roleScore = preferredRole ? textMatch(preferredRole, text) : null;
    const headlineScore = headlineSignals.length ? Math.max(...headlineSignals.map((signal) => textMatch(signal, text))) : null;
    const skillsScore = skills.length
      ? Math.min(1, skills.filter((skill) => textMatch(skill, text) > 0).length / Math.min(skills.length, 5))
      : null;
    const coreScores = [roleScore, headlineScore, skillsScore].filter((score): score is number => score !== null);
    if (!coreScores.some((score) => score > 0)) return 0;

    let availableWeight = 0;
    let earnedWeight = 0;
    const add = (weight: number, score: number) => {
      availableWeight += weight;
      earnedWeight += weight * score;
    };

    add(45, 1);
    const coreStrength = Math.max(...coreScores);
    const coreCoverage = coreScores.reduce((total, score) => total + score, 0) / coreScores.length;
    const profileScore = coreStrength * 0.75 + coreCoverage * 0.25;
    add(55, profileScore);

    const preferredJobType = asString(profile.jobType);
    if (preferredJobType && job.jobType) add(10, normalize(preferredJobType) === normalize(job.jobType) ? 1 : 0);
    const preferredEmploymentType = asString(profile.employmentType);
    if (preferredEmploymentType && job.employmentType) add(10, normalize(preferredEmploymentType) === normalize(job.employmentType) ? 1 : 0);
    const expectedSalaryLpa = Number(profile.expectedSalaryLpa);
    const listedSalaryLpa = parseSalaryLpa(job.salary);
    if (Number.isFinite(expectedSalaryLpa) && expectedSalaryLpa > 0 && listedSalaryLpa !== null) {
      add(15, Math.min(1, listedSalaryLpa / expectedSalaryLpa));
    }
    const candidateExperienceYears = getExperienceYears(profile);
    const requiredExperience = getRequiredExperience(text);
    if (candidateExperienceYears !== null && requiredExperience) {
      const experienceFit = candidateExperienceYears < requiredExperience.minimum
        ? candidateExperienceYears / Math.max(requiredExperience.minimum, 1)
        : requiredExperience.maximum && candidateExperienceYears > requiredExperience.maximum
          ? requiredExperience.maximum / candidateExperienceYears
          : 1;
      add(15, Math.max(0, Math.min(1, experienceFit)));
    }
    const preferredShift = asString(profile.preferredShift);
    if (preferredShift && job.preferredShift) add(5, normalize(preferredShift) === normalize(job.preferredShift) ? 1 : 0);
    const currentEmployment = employmentDetails.find((entry) => entry.isCurrent);
    const noticePeriod = asString(profile.noticePeriod) || asString(currentEmployment?.noticePeriod);
    if (noticePeriod && /\b(immediate|within \d+ days|\d+ days|\d+ months?|one month|two months|three months)\b/i.test(text)) {
      add(15, noticeSignal(noticePeriod, text));
    }

    return availableWeight ? Math.round((earnedWeight / availableWeight) * 100) : 0;
  }
}
