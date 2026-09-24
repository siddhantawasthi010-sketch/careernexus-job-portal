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
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
let DatabaseService = class DatabaseService {
    constructor() {
        const url = process.env.SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !serviceRoleKey) {
            throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Copy .env.example to .env and configure Supabase.');
        }
        this.client = (0, supabase_js_1.createClient)(url, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    async getUserByEmail(email) {
        const { data, error } = await this.client.from('users').select('id, name, email, role, profile').eq('email', email).maybeSingle();
        if (error) {
            throw new Error(`Unable to load user: ${error.message}`);
        }
        return data;
    }
    async upsertUser(user) {
        const { data, error } = await this.client
            .from('users')
            .upsert(user, { onConflict: 'email' })
            .select('id, name, email, role, profile')
            .single();
        if (error) {
            throw new Error(`Unable to save user: ${error.message}`);
        }
        return data;
    }
    async updateUserProfile(email, profile) {
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
        return data;
    }
    async getLatestOtp(email) {
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
        return data;
    }
    async createOtp(otp) {
        const { error } = await this.client.from('otp_codes').insert(otp);
        if (error) {
            throw new Error(`Unable to save OTP: ${error.message}`);
        }
    }
    async deleteOtps(email) {
        const { error } = await this.client.from('otp_codes').delete().eq('email', email);
        if (error) {
            throw new Error(`Unable to clear OTP: ${error.message}`);
        }
    }
    async getJobs(featured = false) {
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
        return (data || []);
    }
    async getLibraryTopics() {
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
        }));
    }
    async getCourses() {
        const { data, error } = await this.client
            .from('courses')
            .select('id, title, topic, provider, level, duration, url')
            .eq('is_active', true)
            .order('topic', { ascending: true })
            .order('title', { ascending: true });
        if (error) {
            throw new Error(`Unable to load courses: ${error.message}`);
        }
        return (data || []);
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DatabaseService);
//# sourceMappingURL=database.service.js.map