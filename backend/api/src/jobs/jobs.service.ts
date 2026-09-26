import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface PortalJob {
  id: string;
  source: 'Greenhouse' | 'Lever';
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

const defaultGreenhouseBoards = [
  'figma', 'cloudflare', 'datadog', 'duolingo', 'robinhood', 'anthropic', 'stripe', 'asana', 'mongodb',
];

const companyNames: Record<string, string> = {
  figma: 'Figma', cloudflare: 'Cloudflare', datadog: 'Datadog', duolingo: 'Duolingo',
  robinhood: 'Robinhood', anthropic: 'Anthropic', stripe: 'Stripe', asana: 'Asana', mongodb: 'MongoDB',
};

const asString = (value: unknown) => typeof value === 'string' ? value : '';
const stripMarkup = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').replace(/\s+/g, ' ').trim();

const textMatch = (query: string, haystack: string) => {
  const terms = normalize(query).split(' ').filter((term) => term.length > 2 && !['the', 'and', 'for', 'with', 'senior', 'junior'].includes(term));
  if (!terms.length) return 0;
  const normalizedHaystack = normalize(haystack);
  const hits = terms.filter((term) => normalizedHaystack.includes(term)).length;
  return Math.max(normalizedHaystack.includes(normalize(query)) ? 1 : 0, hits / terms.length);
};

const inferJobType = (text: string): string | null => {
  if (/\b(contract|contractor|temporary|fixed.term|freelance)\b/i.test(text)) return 'Contractual';
  if (/\b(permanent|regular employment)\b/i.test(text)) return 'Permanent';
  return null;
};

const inferEmploymentType = (text: string): string | null => {
  if (/\b(part.time|part time)\b/i.test(text)) return 'Part Time';
  if (/\b(full.time|full time)\b/i.test(text)) return 'Full Time';
  return null;
};

const inferShift = (text: string): string | null => {
  if (/\b(rotational|rotating shift)\b/i.test(text)) return 'Rotational';
  if (/\b(night shift|overnight)\b/i.test(text)) return 'Night';
  if (/\b(day shift)\b/i.test(text)) return 'Day';
  return null;
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
export class JobsService {
  constructor(private readonly databaseService: DatabaseService) {}

  getJobs() {
    return this.databaseService.getJobs();
  }

  getFeaturedJobs() {
    return this.databaseService.getJobs(true);
  }

  async getRecommendations(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new UnauthorizedException('A valid email is required to find matching jobs.');
    const user = await this.databaseService.getUserByEmail(normalizedEmail);
    if (!user) throw new NotFoundException('Profile not found for this email.');

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

  getApplications(email: string) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to load applied jobs.');
    return this.databaseService.getUserJobApplications(email);
  }

  apply(email: string, job: Record<string, unknown>) {
    if (!email?.trim()) throw new UnauthorizedException('A valid email is required to apply.');
    return this.databaseService.applyUserToJob(email, job);
  }

  private async fetchGreenhouse(board: string): Promise<PortalJob[]> {
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Greenhouse board ${board} returned ${response.status}`);
    const data = await response.json() as { jobs?: Array<Record<string, unknown>> };
    return (data.jobs || []).map((raw) => {
      const title = asString(raw.title);
      const location = asString((raw.location as Record<string, unknown> | undefined)?.name);
      const description = stripMarkup(asString(raw.content));
      const classification = `${title} ${description}`;
      const id = raw.id === undefined || raw.id === null ? '' : String(raw.id);
      return {
        id: `greenhouse:${board}:${id}`,
        source: 'Greenhouse' as const,
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

  private async fetchLever(site: string): Promise<PortalJob[]> {
    const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Lever site ${site} returned ${response.status}`);
    const data = await response.json() as Array<Record<string, unknown>>;
    return (Array.isArray(data) ? data : []).map((raw) => {
      const categories = raw.categories as Record<string, unknown> | undefined;
      const title = asString(raw.text);
      const location = asString(categories?.location);
      const commitment = asString(categories?.commitment);
      const description = `${asString(raw.descriptionPlain)} ${asString(raw.additionalPlain)}`.trim();
      const classification = `${title} ${commitment} ${description}`;
      const sourceId = asString(raw.id);
      return {
        id: `lever:${site}:${sourceId}`,
        source: 'Lever' as const,
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

  private scoreJob(job: PortalJob, profile: Record<string, unknown>) {
    const text = `${job.title} ${job.description}`;
    const preferredRole = asString(profile.preferredJobRole);
    const headline = asString(profile.headline);
    const preferredCities = Array.isArray(profile.preferredCity)
      ? profile.preferredCity.map(asString)
      : [asString(profile.preferredCity)].filter(Boolean);
    if ((!preferredRole && !headline) || !preferredCities.length) return 0;
    const locationMatches = preferredCities.some((city) => normalize(job.location).includes(normalize(city))) || /\bremote\b/i.test(job.location);
    if (!locationMatches) return 0;

    let availableWeight = 0;
    let earnedWeight = 0;
    const add = (weight: number, score: number) => {
      availableWeight += weight;
      earnedWeight += weight * score;
    };

    if (headline) add(15, textMatch(headline, text));
    if (preferredRole) add(20, textMatch(preferredRole, text));
    add(25, 1);

    const preferredJobType = asString(profile.jobType);
    if (preferredJobType && job.jobType) add(10, normalize(preferredJobType) === normalize(job.jobType) ? 1 : 0);
    const preferredEmploymentType = asString(profile.employmentType);
    if (preferredEmploymentType && job.employmentType) add(10, normalize(preferredEmploymentType) === normalize(job.employmentType) ? 1 : 0);
    const preferredShift = asString(profile.preferredShift);
    if (preferredShift && job.preferredShift) add(5, normalize(preferredShift) === normalize(job.preferredShift) ? 1 : 0);
    const noticePeriod = asString(profile.noticePeriod);
    if (noticePeriod && /\b(immediate|within \d+ days|\d+ days|\d+ months?|one month|two months|three months)\b/i.test(text)) {
      add(15, noticeSignal(noticePeriod, text));
    }

    return availableWeight ? Math.round((earnedWeight / availableWeight) * 100) : 0;
  }
}
