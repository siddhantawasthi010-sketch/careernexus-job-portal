import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'candidate' | 'recruiter';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile: Record<string, unknown>;
  updated_at: string;
}

interface EmploymentProfileEntry {
  isCurrent?: boolean;
  employmentType?: string;
  companyName?: string;
  jobTitle?: string;
  joiningDate?: string;
  relievingDate?: string;
  ctc?: string;
  skills?: string[];
  jobProfile?: string;
  noticePeriod?: string;
}

interface MajorProjectProfileEntry {
  projectTitle?: string;
  companyName?: string;
  clientName?: string;
  status?: string;
  workedFrom?: string;
  workedTill?: string;
  projectDetails?: string;
}

export interface StoredOtp {
  otp_hash: string;
  role: UserRole;
  expires_at: string;
  sent_at: string;
}

export interface JobRecord {
  id: number;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string | null;
  featured: boolean;
}

export interface CareerPortalRecord {
  slug: string;
  companyName: string;
  industry: string;
  careerUrl: string;
}

export interface FeedJobRecord {
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

export interface LibraryTopicRecord {
  id: number;
  name: string;
  briefDescription: string;
  explanation: string;
  example: string;
}

export interface CourseRecord {
  id: number;
  title: string;
  topic: string;
  provider: string;
  level: string;
  duration: string;
  url: string;
}

const toSqlDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};

const toSqlTimestamp = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value.trim())) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

@Injectable()
export class DatabaseService {
  private readonly client: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Copy .env.example to .env and configure Supabase.');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const { data, error } = await this.client.from('users').select('id, name, email, role, profile, updated_at').eq('email', email).maybeSingle();
    if (error) {
      throw new Error(`Unable to load user: ${error.message}`);
    }
    if (!data) return null;

    const [employmentResult, projectsResult] = await Promise.all([
      this.client.from('user_employment_details').select('is_current, employment_type, company_name, job_title, joining_date, relieving_date, ctc, skills, job_profile, notice_period').eq('user_id', data.id).order('created_at', { ascending: true }),
      this.client.from('user_major_projects').select('project_title, company_name, client_name, status, worked_from, worked_till, project_details').eq('user_id', data.id).order('created_at', { ascending: true }),
    ]);

    if (employmentResult.error) throw new Error(`Unable to load employment details: ${employmentResult.error.message}`);
    if (projectsResult.error) throw new Error(`Unable to load major projects: ${projectsResult.error.message}`);

    return {
      ...data,
      profile: {
        ...(data.profile || {}),
        employmentDetails: (employmentResult.data || []).map((row) => ({
          isCurrent: row.is_current,
          employmentType: row.employment_type,
          companyName: row.company_name,
          jobTitle: row.job_title,
          joiningDate: row.joining_date,
          relievingDate: row.relieving_date,
          ctc: row.ctc,
          skills: row.skills,
          jobProfile: row.job_profile,
          noticePeriod: row.notice_period,
        })),
        majorProjects: (projectsResult.data || []).map((row) => ({
          projectTitle: row.project_title,
          companyName: row.company_name,
          clientName: row.client_name,
          status: row.status,
          workedFrom: row.worked_from,
          workedTill: row.worked_till,
          projectDetails: row.project_details,
        })),
      },
    } as StoredUser;
  }

  async upsertUser(user: { email: string; name: string; role: UserRole }): Promise<StoredUser> {
    const { data, error } = await this.client
      .from('users')
      .upsert(user, { onConflict: 'email' })
      .select('id, name, email, role, profile, updated_at')
      .single();

    if (error) {
      throw new Error(`Unable to save user: ${error.message}`);
    }
    return data as StoredUser;
  }

  async updateUserProfile(email: string, profile: Record<string, unknown>): Promise<StoredUser> {
    const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : undefined;
    const update = name ? { name, profile, updated_at: new Date().toISOString() } : { profile, updated_at: new Date().toISOString() };
    const { data, error } = await this.client
      .from('users')
      .update(update)
      .eq('email', email)
      .select('id, name, email, role, profile, updated_at')
      .single();

    if (error) {
      throw new Error(`Unable to update user profile: ${error.message}`);
    }

    const userId = data.id;
    const employmentDetails = Array.isArray(profile.employmentDetails) ? profile.employmentDetails as EmploymentProfileEntry[] : [];
    const majorProjects = Array.isArray(profile.majorProjects) ? profile.majorProjects as MajorProjectProfileEntry[] : [];
    const employmentRows = employmentDetails.filter((entry) => entry.companyName?.trim() && entry.jobTitle?.trim()).map((entry) => ({
      user_id: userId,
      is_current: Boolean(entry.isCurrent),
      employment_type: ['Full Time', 'Part Time'].includes(entry.employmentType || '') ? entry.employmentType : null,
      company_name: entry.companyName.trim(),
      job_title: entry.jobTitle.trim(),
      joining_date: toSqlDate(entry.joiningDate),
      relieving_date: entry.isCurrent ? null : toSqlDate(entry.relievingDate),
      ctc: entry.ctc || null,
      skills: Array.isArray(entry.skills) ? entry.skills : [],
      job_profile: entry.jobProfile || null,
      notice_period: entry.isCurrent ? entry.noticePeriod || null : null,
    }));
    const projectRows = majorProjects.filter((entry) => entry.projectTitle?.trim()).map((entry) => ({
      user_id: userId,
      project_title: entry.projectTitle.trim(),
      company_name: entry.companyName || null,
      client_name: entry.clientName || null,
      status: ['In progress', 'Finished'].includes(entry.status || '') ? entry.status : null,
      worked_from: toSqlDate(entry.workedFrom),
      worked_till: toSqlDate(entry.workedTill),
      project_details: entry.projectDetails || null,
    }));

    const [employmentDelete, projectsDelete] = await Promise.all([
      this.client.from('user_employment_details').delete().eq('user_id', userId),
      this.client.from('user_major_projects').delete().eq('user_id', userId),
    ]);
    if (employmentDelete.error) throw new Error(`Unable to replace employment details: ${employmentDelete.error.message}`);
    if (projectsDelete.error) throw new Error(`Unable to replace major projects: ${projectsDelete.error.message}`);

    const [employmentInsert, projectsInsert] = await Promise.all([
      employmentRows.length ? this.client.from('user_employment_details').insert(employmentRows) : Promise.resolve({ error: null }),
      projectRows.length ? this.client.from('user_major_projects').insert(projectRows) : Promise.resolve({ error: null }),
    ]);
    if (employmentInsert.error) throw new Error(`Unable to save employment details: ${employmentInsert.error.message}`);
    if (projectsInsert.error) throw new Error(`Unable to save major projects: ${projectsInsert.error.message}`);

    return data as StoredUser;
  }

  async updateUserProfilePhoto(email: string, photo: string): Promise<StoredUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error: loadError } = await this.client
      .from('users')
      .select('id, name, email, role, profile')
      .eq('email', normalizedEmail)
      .single();
    if (loadError) throw new Error(`Unable to load profile before photo update: ${loadError.message}`);

    const profile = { ...(user.profile || {}), photo };
    const { data, error } = await this.client
      .from('users')
      .update({ profile, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, name, email, role, profile, updated_at')
      .single();
    if (error) throw new Error(`Unable to update profile photo: ${error.message}`);
    return data as StoredUser;
  }

  private async ensureResumeBucket() {
    const { data } = await this.client.storage.getBucket('user-resumes');
    if (data) return;

    const { error } = await this.client.storage.createBucket('user-resumes', {
      public: false,
      fileSizeLimit: 2 * 1024 * 1024,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
      ],
    });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      throw new Error(`Unable to initialize resume storage bucket: ${error.message}`);
    }
  }

  async uploadUserResume(email: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error: userError } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
    if (userError) throw new Error(`Unable to load user for resume upload: ${userError.message}`);

    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rtf: 'application/rtf',
    };
    const contentType = contentTypes[extension];
    if (!contentType) throw new Error('Resume must be a PDF, DOC, DOCX, or RTF file.');
    if (file.size > 2 * 1024 * 1024) throw new Error('Resume file must be 2 MB or smaller.');
    await this.ensureResumeBucket();

    const safeName = file.originalname.replace(/[\\/]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const storagePath = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await this.client.storage.from('user-resumes').upload(storagePath, file.buffer, {
      contentType,
      upsert: false,
    });
    if (uploadError) throw new Error(`Unable to upload resume: ${uploadError.message}`);

    const previousResume = user.profile?.resume as { storagePath?: string } | undefined;
    const profile = { ...(user.profile || {}), resume: { fileName: file.originalname, size: file.size, contentType, storagePath, uploadedAt: new Date().toISOString() } };
    const { data, error } = await this.client.from('users').update({ profile, updated_at: new Date().toISOString() }).eq('id', user.id).select('updated_at').single();
    if (error) {
      await this.client.storage.from('user-resumes').remove([storagePath]);
      throw new Error(`Unable to save resume details: ${error.message}`);
    }

    if (previousResume?.storagePath) await this.client.storage.from('user-resumes').remove([previousResume.storagePath]);
    const { data: signedUrlData, error: signedUrlError } = await this.client.storage.from('user-resumes').createSignedUrl(storagePath, 3600);
    if (signedUrlError) throw new Error(`Unable to create resume download link: ${signedUrlError.message}`);

    return { resume: profile.resume, downloadUrl: signedUrlData.signedUrl, updated_at: data.updated_at };
  }

  async getUserResume(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error } = await this.client.from('users').select('profile').eq('email', normalizedEmail).single();
    if (error) throw new Error(`Unable to load resume: ${error.message}`);
    const resume = user.profile?.resume as { storagePath?: string } | undefined;
    if (!resume?.storagePath) return null;

    const { data, error: signedUrlError } = await this.client.storage.from('user-resumes').createSignedUrl(resume.storagePath, 3600);
    if (signedUrlError) throw new Error(`Unable to create resume download link: ${signedUrlError.message}`);
    return { resume, downloadUrl: data.signedUrl };
  }

  async deleteUserResume(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
    if (error) throw new Error(`Unable to load user for resume removal: ${error.message}`);
    const resume = user.profile?.resume as { storagePath?: string } | undefined;
    if (resume?.storagePath) {
      const { error: removeError } = await this.client.storage.from('user-resumes').remove([resume.storagePath]);
      if (removeError) throw new Error(`Unable to remove resume file: ${removeError.message}`);
    }

    const profile = { ...(user.profile || {}) };
    delete profile.resume;
    const { data: updatedUser, error: updateError } = await this.client.from('users').update({ profile, updated_at: new Date().toISOString() }).eq('id', user.id).select('updated_at').single();
    if (updateError) throw new Error(`Unable to remove resume details: ${updateError.message}`);
    return { updated_at: updatedUser.updated_at };
  }

  async getLatestOtp(email: string): Promise<StoredOtp | null> {
    const { data, error } = await this.client
      .from('otp_codes')
      .select('otp_hash, role, expires_at, sent_at')
      .eq('email', email)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load OTP: ${error.message}`);
    }
    return data as StoredOtp | null;
  }

  async createOtp(otp: { email: string; otp_hash: string; role: UserRole; expires_at: string; sent_at: string }) {
    const { error } = await this.client.from('otp_codes').insert(otp);
    if (error) {
      throw new Error(`Unable to save OTP: ${error.message}`);
    }
  }

  async deleteOtps(email: string) {
    const { error } = await this.client.from('otp_codes').delete().eq('email', email);
    if (error) {
      throw new Error(`Unable to clear OTP: ${error.message}`);
    }
  }

  async getJobs(featured = false): Promise<JobRecord[]> {
    let query = this.client
      .from('jobs')
      .select('id, title, company, location, type, salary, featured')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (featured) {
      query = query.eq('featured', true);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Unable to load jobs: ${error.message}`);
    }
    return (data || []) as JobRecord[];
  }

  async getCareerPortals(): Promise<CareerPortalRecord[]> {
    const { data, error } = await this.client
      .from('career_portals')
      .select('slug, company_name, industry, career_url')
      .eq('is_active', true)
      .order('company_name', { ascending: true });
    if (error) throw new Error(`Unable to load career portals: ${error.message}`);
    return (data || []).map((portal) => ({
      slug: portal.slug,
      companyName: portal.company_name,
      industry: portal.industry,
      careerUrl: portal.career_url,
    }));
  }

  async saveFeedJobs(jobs: FeedJobRecord[]): Promise<void> {
    if (!jobs.length) return;
    const rows = jobs.map((job) => ({
      id: job.id,
      source: job.source,
      source_id: job.sourceId,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      job_type: job.jobType,
      employment_type: job.employmentType,
      preferred_shift: job.preferredShift,
      description: job.description,
      salary: job.salary,
      url: job.url,
      posted_at: toSqlTimestamp(job.postedAt),
      fetched_at: new Date().toISOString(),
    }));
    for (let start = 0; start < rows.length; start += 100) {
      const { error } = await this.client.from('job_feed_items').upsert(rows.slice(start, start + 100), { onConflict: 'id' });
      if (error) throw new Error(`Unable to cache fetched jobs: ${error.message}`);
    }
  }

  async getRecentFeedJobs(): Promise<FeedJobRecord[]> {
    const fetchedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const pageSize = 1000;
    const jobs: FeedJobRecord[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await this.client
        .from('job_feed_items')
        .select('id, source, source_id, title, company, location, type, job_type, employment_type, preferred_shift, description, salary, url, posted_at')
        .gte('fetched_at', fetchedAfter)
        .order('fetched_at', { ascending: false })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(`Unable to load cached jobs: ${error.message}`);
      const page = data || [];
      jobs.push(...page.map((job) => ({
        id: job.id,
        source: job.source,
        sourceId: job.source_id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        jobType: job.job_type,
        employmentType: job.employment_type,
        preferredShift: job.preferred_shift,
        description: job.description,
        salary: job.salary,
        url: job.url,
        postedAt: job.posted_at,
        matchScore: 0,
      })));
      if (page.length < pageSize) break;
    }
    return jobs;
  }

  async getUserJobApplications(email: string): Promise<Record<string, unknown>[]> {
    const normalizedEmail = email.trim().toLowerCase();
    const { data: user, error: userError } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
    if (userError) throw new Error(`Unable to load user applications: ${userError.message}`);
    const { data, error } = await this.client
      .from('user_job_applications')
      .select('job_snapshot, applied_at')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false });
    if (error) {
      if (error.message.includes("Could not find the table 'public.user_job_applications'")) {
        return Array.isArray(user.profile?.appliedJobs) ? user.profile.appliedJobs as Record<string, unknown>[] : [];
      }
      throw new Error(`Unable to load user applications: ${error.message}`);
    }
    return (data || []).map((application) => ({ ...(application.job_snapshot as Record<string, unknown>), appliedAt: application.applied_at }));
  }

  async applyUserToJob(email: string, job: Record<string, unknown>) {
    const normalizedEmail = email.trim().toLowerCase();
    const jobId = typeof job.id === 'string' || typeof job.id === 'number' ? String(job.id) : '';
    if (!jobId || typeof job.title !== 'string' || typeof job.url !== 'string') {
      throw new Error('A valid job id, title, and URL are required.');
    }
    const { data: user, error: userError } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
    if (userError) throw new Error(`Unable to load user for application: ${userError.message}`);
    const { data, error } = await this.client.from('user_job_applications').upsert({
      user_id: user.id,
      job_id: jobId,
      job_source: typeof job.source === 'string' ? job.source : 'career-portal',
      job_snapshot: job,
      applied_at: new Date().toISOString(),
    }, { onConflict: 'user_id,job_id' }).select('job_snapshot, applied_at').single();
    if (error) {
      if (error.message.includes("Could not find the table 'public.user_job_applications'")) {
        const applications = Array.isArray(user.profile?.appliedJobs) ? user.profile.appliedJobs as Record<string, unknown>[] : [];
        const application = { ...job, id: jobId, appliedAt: new Date().toISOString() };
        const nextApplications = [application, ...applications.filter((existing) => String(existing.id) !== jobId)];
        const profile = { ...(user.profile || {}), appliedJobs: nextApplications };
        const { error: profileError } = await this.client.from('users').update({ profile, updated_at: new Date().toISOString() }).eq('id', user.id);
        if (profileError) throw new Error(`Unable to save job application: ${profileError.message}`);
        return application;
      }
      throw new Error(`Unable to save job application: ${error.message}`);
    }
    return { ...(data.job_snapshot as Record<string, unknown>), appliedAt: data.applied_at };
  }

  async getLibraryTopics(): Promise<LibraryTopicRecord[]> {
    const { data, error } = await this.client
      .from('library_topics')
      .select('id, name, brief_description, explanation, example')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Unable to load library topics: ${error.message}`);
    }

    return (data || []).map((topic) => ({
      id: topic.id,
      name: topic.name,
      briefDescription: topic.brief_description,
      explanation: topic.explanation,
      example: topic.example,
    })) as LibraryTopicRecord[];
  }

  async getCourses(): Promise<CourseRecord[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('id, title, topic, provider, level, duration, url')
      .eq('is_active', true)
      .order('topic', { ascending: true })
      .order('title', { ascending: true });

    if (error) {
      throw new Error(`Unable to load courses: ${error.message}`);
    }

    return (data || []) as CourseRecord[];
  }
}
