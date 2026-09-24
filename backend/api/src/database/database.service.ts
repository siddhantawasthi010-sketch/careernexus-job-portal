import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'candidate' | 'recruiter';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile: Record<string, unknown>;
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
    const { data, error } = await this.client.from('users').select('id, name, email, role, profile').eq('email', email).maybeSingle();
    if (error) {
      throw new Error(`Unable to load user: ${error.message}`);
    }
    return data as StoredUser | null;
  }

  async upsertUser(user: { email: string; name: string; role: UserRole }): Promise<StoredUser> {
    const { data, error } = await this.client
      .from('users')
      .upsert(user, { onConflict: 'email' })
      .select('id, name, email, role, profile')
      .single();

    if (error) {
      throw new Error(`Unable to save user: ${error.message}`);
    }
    return data as StoredUser;
  }

  async updateUserProfile(email: string, profile: Record<string, unknown>): Promise<StoredUser> {
    const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : undefined;
    const update = name ? { name, profile } : { profile };
    const { data, error } = await this.client
      .from('users')
      .update(update)
      .eq('email', email)
      .select('id, name, email, role, profile')
      .single();

    if (error) {
      throw new Error(`Unable to update user profile: ${error.message}`);
    }
    return data as StoredUser;
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
