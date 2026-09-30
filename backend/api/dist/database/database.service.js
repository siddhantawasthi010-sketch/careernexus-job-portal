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
const toSqlDate = (value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};
const toSqlTimestamp = (value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value.trim()))
        return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
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
        const { data, error } = await this.client.from('users').select('id, name, email, role, profile, updated_at').eq('email', email).maybeSingle();
        if (error) {
            throw new Error(`Unable to load user: ${error.message}`);
        }
        if (!data)
            return null;
        const [employmentResult, projectsResult] = await Promise.all([
            this.client.from('user_employment_details').select('is_current, employment_type, company_name, job_title, joining_date, relieving_date, ctc, skills, job_profile, notice_period').eq('user_id', data.id).order('created_at', { ascending: true }),
            this.client.from('user_major_projects').select('project_title, company_name, client_name, status, worked_from, worked_till, project_details').eq('user_id', data.id).order('created_at', { ascending: true }),
        ]);
        if (employmentResult.error)
            throw new Error(`Unable to load employment details: ${employmentResult.error.message}`);
        if (projectsResult.error)
            throw new Error(`Unable to load major projects: ${projectsResult.error.message}`);
        const storedProfile = data.profile && typeof data.profile === 'object' ? data.profile : {};
        const employmentFromTables = (employmentResult.data || []).map((row) => ({
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
        }));
        const projectsFromTables = (projectsResult.data || []).map((row) => ({
            projectTitle: row.project_title,
            companyName: row.company_name,
            clientName: row.client_name,
            status: row.status,
            workedFrom: row.worked_from,
            workedTill: row.worked_till,
            projectDetails: row.project_details,
        }));
        const storedEmployment = Array.isArray(storedProfile.employmentDetails) ? storedProfile.employmentDetails : null;
        const storedProjects = Array.isArray(storedProfile.majorProjects) ? storedProfile.majorProjects : null;
        return {
            ...data,
            profile: {
                ...storedProfile,
                employmentDetails: storedEmployment?.length || !employmentFromTables.length ? storedEmployment || employmentFromTables : employmentFromTables,
                majorProjects: storedProjects?.length || !projectsFromTables.length ? storedProjects || projectsFromTables : projectsFromTables,
            },
        };
    }
    async getConnectIdentity(email) {
        const { data, error } = await this.client.from('users').select('id, email, name, role').eq('email', email.trim().toLowerCase()).maybeSingle();
        if (error)
            throw new Error(`Unable to load connection account: ${error.message}`);
        return data;
    }
    toRecruiterJob(row) {
        const id = String(row.id);
        return {
            id: `career-nexus:${id}`,
            recruiterJobId: id,
            source: 'career-nexus',
            sourceId: id,
            title: String(row.position || ''),
            company: String(row.company_name || ''),
            location: String(row.location || ''),
            type: String(row.work_mode || ''),
            jobType: null,
            employmentType: String(row.work_mode || ''),
            preferredShift: null,
            description: `${String(row.job_description || '')} ${String(row.company_about || '')}`.trim(),
            companyAbout: String(row.company_about || ''),
            salary: null,
            url: '',
            postedAt: String(row.created_at || ''),
            status: String(row.status || 'open'),
            matchScore: 0,
        };
    }
    async getRecruiterJobListings() {
        const { data, error } = await this.client.from('recruiter_job_openings')
            .select('id, company_name, position, location, work_mode, job_description, company_about, status, created_at')
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(`Unable to load recruiter job openings: ${error.message}`);
        return (data || []).map((row) => this.toRecruiterJob(row));
    }
    async getRecruiterJobOpenings(email) {
        const identity = await this.getConnectIdentity(email);
        if (!identity || identity.role !== 'recruiter')
            throw new Error('A recruiter account is required to manage job openings.');
        const { data, error } = await this.client.from('recruiter_job_openings')
            .select('id, company_name, position, location, work_mode, job_description, company_about, status, created_at')
            .eq('recruiter_user_id', identity.id)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(`Unable to load your job openings: ${error.message}`);
        const openings = (data || []).map((row) => this.toRecruiterJob(row));
        if (!openings.length)
            return [];
        const jobIds = openings.map((job) => job.id);
        const { data: applications, error: applicationError } = await this.client.from('user_job_applications')
            .select('job_id')
            .eq('job_source', 'career-nexus')
            .in('job_id', jobIds);
        if (applicationError)
            throw new Error(`Unable to count job applicants: ${applicationError.message}`);
        const applicantCounts = new Map();
        for (const application of applications || [])
            applicantCounts.set(application.job_id, (applicantCounts.get(application.job_id) || 0) + 1);
        return openings.map((job) => ({ ...job, applicantsCount: applicantCounts.get(job.id) || 0 }));
    }
    async createRecruiterJobOpening(email, input) {
        const { data: recruiter, error: recruiterError } = await this.client.from('users')
            .select('id, role, profile')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();
        if (recruiterError)
            throw new Error(`Unable to load recruiter profile: ${recruiterError.message}`);
        if (!recruiter || recruiter.role !== 'recruiter')
            throw new Error('A recruiter account is required to post a job.');
        const profile = recruiter.profile && typeof recruiter.profile === 'object' ? recruiter.profile : {};
        const employmentDetails = Array.isArray(profile.employmentDetails)
            ? profile.employmentDetails.filter((entry) => Boolean(entry) && typeof entry === 'object')
            : [];
        const currentOrganization = employmentDetails.find((entry) => entry.isCurrent)?.companyName || profile.companyName || profile.currentCompany;
        if (typeof currentOrganization !== 'string' || !currentOrganization.trim())
            throw new Error('Add your current organization under Employment Details before posting a job.');
        const { data, error } = await this.client.from('recruiter_job_openings').insert({
            recruiter_user_id: recruiter.id,
            company_name: currentOrganization.trim(),
            position: String(input.position).trim(),
            location: String(input.location).trim(),
            work_mode: input.workMode,
            job_description: String(input.description).trim(),
            company_about: String(input.companyAbout).trim(),
        }).select('id, company_name, position, location, work_mode, job_description, company_about, status, created_at').single();
        if (error)
            throw new Error(`Unable to post job opening: ${error.message}`);
        return { ...this.toRecruiterJob(data), applicantsCount: 0 };
    }
    async closeRecruiterJobOpening(email, openingId) {
        const identity = await this.getConnectIdentity(email);
        if (!identity || identity.role !== 'recruiter')
            throw new Error('A recruiter account is required to close a job opening.');
        const { data, error } = await this.client.from('recruiter_job_openings')
            .update({ status: 'closed', updated_at: new Date().toISOString() })
            .eq('id', openingId)
            .eq('recruiter_user_id', identity.id)
            .eq('status', 'open')
            .select('id')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to close job opening: ${error.message}`);
        if (!data)
            throw new Error('This open job could not be found in your account.');
        return { id: `career-nexus:${data.id}`, status: 'closed' };
    }
    async applyToRecruiterJob(email, openingId, details) {
        const { data: candidate, error: candidateError } = await this.client.from('users')
            .select('id, role, name, email, profile')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();
        if (candidateError)
            throw new Error(`Unable to load candidate profile: ${candidateError.message}`);
        if (!candidate || candidate.role !== 'candidate')
            throw new Error('Only candidate accounts can apply to recruiter job openings.');
        const { data: opening, error: openingError } = await this.client.from('recruiter_job_openings')
            .select('id, company_name, position, location, work_mode, job_description, company_about, status, created_at')
            .eq('id', openingId)
            .maybeSingle();
        if (openingError)
            throw new Error(`Unable to load job opening: ${openingError.message}`);
        if (!opening || opening.status !== 'open')
            throw new Error('This job opening is closed and no longer accepting applications.');
        const requiredFields = ['fullName', 'email', 'expectedSalary', 'actualSalary', 'totalExperienceYears', 'relevantExperienceYears', 'currentlyServingNotice', 'noticePeriodDays'];
        if (requiredFields.some((field) => details[field] === undefined || String(details[field]).trim() === ''))
            throw new Error('Complete all required application details.');
        const job = this.toRecruiterJob(opening);
        const applicationDetails = { ...details, fullName: String(details.fullName).trim(), email: String(details.email).trim() };
        const { data, error } = await this.client.from('user_job_applications').upsert({
            user_id: candidate.id,
            job_id: job.id,
            job_source: 'career-nexus',
            job_snapshot: job,
            application_details: applicationDetails,
            review_status: 'submitted',
            applied_at: new Date().toISOString(),
        }, { onConflict: 'user_id,job_id' }).select('job_snapshot, applied_at, application_details, review_status').single();
        if (error)
            throw new Error(`Unable to submit application: ${error.message}`);
        return { ...data.job_snapshot, appliedAt: data.applied_at, applicationDetails: data.application_details, reviewStatus: data.review_status };
    }
    async getRecruiterApplications(email) {
        const identity = await this.getConnectIdentity(email);
        if (!identity || identity.role !== 'recruiter')
            throw new Error('A recruiter account is required to view applications.');
        const openings = await this.getRecruiterJobOpenings(email);
        if (!openings.length)
            return [];
        const { data: applications, error } = await this.client.from('user_job_applications')
            .select('id, user_id, job_id, job_snapshot, applied_at, application_details, review_status')
            .eq('job_source', 'career-nexus')
            .in('job_id', openings.map((job) => job.id))
            .order('applied_at', { ascending: false });
        if (error)
            throw new Error(`Unable to load received applications: ${error.message}`);
        const applicantIds = Array.from(new Set((applications || []).map((application) => application.user_id)));
        const applicantsById = new Map();
        if (applicantIds.length) {
            const { data: users, error: usersError } = await this.client.from('users').select('id, name, email, role, profile').in('id', applicantIds);
            if (usersError)
                throw new Error(`Unable to load applicant profiles: ${usersError.message}`);
            for (const user of users || [])
                applicantsById.set(user.id, user);
        }
        const applicationsByJob = new Map();
        for (const application of applications || []) {
            const user = applicantsById.get(application.user_id);
            if (!user)
                continue;
            const entry = {
                id: application.id,
                jobId: application.job_id,
                job: application.job_snapshot,
                appliedAt: application.applied_at,
                applicationDetails: application.application_details,
                reviewStatus: application.review_status,
                candidate: { id: user.id, name: user.name, email: user.email, profile: user.profile },
            };
            const group = applicationsByJob.get(application.job_id) || [];
            group.push(entry);
            applicationsByJob.set(application.job_id, group);
        }
        return openings.map((job) => ({ ...job, applicants: applicationsByJob.get(job.id) || [] }));
    }
    async getRecruiterApplicationDetails(email, applicationId) {
        const identity = await this.getConnectIdentity(email);
        if (!identity || identity.role !== 'recruiter')
            throw new Error('A recruiter account is required to view candidate details.');
        const { data: application, error } = await this.client.from('user_job_applications')
            .select('id, user_id, job_id, job_snapshot, applied_at, application_details, review_status')
            .eq('id', applicationId)
            .eq('job_source', 'career-nexus')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to load application: ${error.message}`);
        if (!application)
            throw new Error('Application not found.');
        const openingId = application.job_id.replace(/^career-nexus:/, '');
        const { data: opening, error: openingError } = await this.client.from('recruiter_job_openings').select('id')
            .eq('id', openingId).eq('recruiter_user_id', identity.id).maybeSingle();
        if (openingError)
            throw new Error(`Unable to verify job ownership: ${openingError.message}`);
        if (!opening)
            throw new Error('This application does not belong to one of your job openings.');
        const { data: candidate, error: candidateError } = await this.client.from('users').select('id, name, email, profile').eq('id', application.user_id).single();
        if (candidateError)
            throw new Error(`Unable to load candidate details: ${candidateError.message}`);
        const resume = application.application_details?.includeResume === true ? await this.getUserResume(candidate.email) : null;
        const candidateProfile = candidate.profile && typeof candidate.profile === 'object' ? { ...candidate.profile } : {};
        delete candidateProfile.resume;
        delete candidateProfile.photo;
        delete candidateProfile.appliedJobs;
        return {
            id: application.id,
            job: application.job_snapshot,
            appliedAt: application.applied_at,
            applicationDetails: application.application_details,
            reviewStatus: application.review_status,
            candidate: { id: candidate.id, name: candidate.name, email: candidate.email, profile: candidateProfile },
            resume,
        };
    }
    async updateRecruiterApplicationStatus(email, applicationId, status) {
        if (!['viewed', 'resume_downloaded', 'shortlisted', 'not_shortlisted'].includes(status))
            throw new Error('Choose a valid application status.');
        const identity = await this.getConnectIdentity(email);
        if (!identity || identity.role !== 'recruiter')
            throw new Error('A recruiter account is required to review applications.');
        const details = await this.getRecruiterApplicationDetails(email, applicationId);
        const { data, error } = await this.client.from('user_job_applications').update({ review_status: status })
            .eq('id', applicationId).select('review_status').single();
        if (error)
            throw new Error(`Unable to update application status: ${error.message}`);
        return { id: details.id, reviewStatus: data.review_status };
    }
    toConnectPerson(user) {
        const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
        const employmentDetails = Array.isArray(profile.employmentDetails)
            ? profile.employmentDetails.filter((entry) => Boolean(entry) && typeof entry === 'object')
            : [];
        const currentEmployment = employmentDetails.find((entry) => entry.isCurrent) || employmentDetails[0] || {};
        const email = String(user.email || '');
        return {
            id: String(user.id),
            name: String(user.name || profile.name || email.split('@')[0] || 'CareerNexus member'),
            email,
            role: user.role === 'recruiter' ? 'recruiter' : 'candidate',
            headline: String(profile.headline || profile.currentlyWorkingAs || profile.currentRole || profile.currentJobTitle || ''),
            company: String(profile.companyName || profile.currentCompany || currentEmployment.companyName || ''),
        };
    }
    async getConnectionRequestsForUser(userId) {
        const { data, error } = await this.client
            .from('user_connection_requests')
            .select('id, requester_user_id, recipient_user_id, status, created_at, updated_at')
            .or(`requester_user_id.eq.${userId},recipient_user_id.eq.${userId}`)
            .order('updated_at', { ascending: false });
        if (error)
            throw new Error(`Unable to load connection requests: ${error.message}`);
        return (data || []);
    }
    async searchConnectPeople(email, role, query) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery.length < 2)
            return [];
        const matches = [];
        const pageSize = 500;
        for (let offset = 0;; offset += pageSize) {
            const { data, error } = await this.client.from('users')
                .select('id, name, email, role, profile')
                .eq('role', role)
                .neq('id', currentUser.id)
                .order('name', { ascending: true })
                .range(offset, offset + pageSize - 1);
            if (error)
                throw new Error(`Unable to search ${role}s: ${error.message}`);
            const page = (data || []);
            for (const user of page) {
                const person = this.toConnectPerson(user);
                if ([person.name, person.email, person.company, person.headline].some((value) => value.toLowerCase().includes(normalizedQuery))) {
                    matches.push(user);
                }
                if (matches.length >= 30)
                    break;
            }
            if (matches.length >= 30 || page.length < pageSize)
                break;
        }
        const people = matches.map((user) => this.toConnectPerson(user));
        const requests = await this.getConnectionRequestsForUser(currentUser.id);
        const relationByPerson = new Map();
        for (const request of requests) {
            const personId = request.requester_user_id === currentUser.id ? request.recipient_user_id : request.requester_user_id;
            const previous = relationByPerson.get(personId);
            if (!previous || request.status === 'accepted' || (request.status === 'pending' && previous.status === 'declined'))
                relationByPerson.set(personId, request);
        }
        return people.map((person) => {
            const relation = relationByPerson.get(person.id);
            const state = relation?.status === 'accepted'
                ? 'connected'
                : relation?.status === 'pending'
                    ? relation.requester_user_id === currentUser.id ? 'sent' : 'received'
                    : null;
            return { ...person, connectionState: state, requestId: state === 'received' ? relation?.id : null };
        });
    }
    async getConnectionOverview(email) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const requests = await this.getConnectionRequestsForUser(currentUser.id);
        const otherIds = Array.from(new Set(requests.map((request) => request.requester_user_id === currentUser.id ? request.recipient_user_id : request.requester_user_id)));
        const peopleById = new Map();
        if (otherIds.length) {
            const { data, error } = await this.client.from('users').select('id, name, email, role, profile').in('id', otherIds);
            if (error)
                throw new Error(`Unable to load connection profiles: ${error.message}`);
            for (const user of (data || []))
                peopleById.set(String(user.id), this.toConnectPerson(user));
        }
        const incoming = [];
        const outgoing = [];
        const connections = [];
        for (const request of requests) {
            const isRequester = request.requester_user_id === currentUser.id;
            const person = peopleById.get(isRequester ? request.recipient_user_id : request.requester_user_id);
            if (!person)
                continue;
            const entry = { requestId: request.id, person, createdAt: request.created_at };
            if (request.status === 'accepted')
                connections.push({ ...entry, connectedAt: request.updated_at });
            else if (request.status === 'pending' && isRequester)
                outgoing.push(entry);
            else if (request.status === 'pending')
                incoming.push(entry);
        }
        return { incoming, outgoing, connections };
    }
    async createConnectionRequest(email, targetEmail) {
        const requester = await this.getConnectIdentity(email);
        const recipient = await this.getConnectIdentity(targetEmail);
        if (!requester || !recipient)
            throw new Error('The selected account could not be found.');
        if (requester.id === recipient.id)
            throw new Error('You cannot connect with your own account.');
        const currentRequests = await this.getConnectionRequestsForUser(requester.id);
        const existingRelation = currentRequests.find((request) => ((request.requester_user_id === requester.id && request.recipient_user_id === recipient.id)
            || (request.requester_user_id === recipient.id && request.recipient_user_id === requester.id)));
        if (existingRelation?.status === 'accepted')
            return { request: existingRelation, state: 'connected' };
        if (existingRelation?.status === 'pending') {
            return { request: existingRelation, state: existingRelation.requester_user_id === requester.id ? 'sent' : 'received' };
        }
        const now = new Date().toISOString();
        const { data, error } = await this.client.from('user_connection_requests').upsert({
            requester_user_id: requester.id,
            recipient_user_id: recipient.id,
            status: 'pending',
            updated_at: now,
        }, { onConflict: 'requester_user_id,recipient_user_id' })
            .select('id, requester_user_id, recipient_user_id, status, created_at, updated_at')
            .single();
        if (error)
            throw new Error(`Unable to send connection request: ${error.message}`);
        return { request: data, state: 'sent' };
    }
    async respondToConnectionRequest(email, requestId, status) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const { data, error } = await this.client.from('user_connection_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('recipient_user_id', currentUser.id)
            .eq('status', 'pending')
            .select('id, requester_user_id, recipient_user_id, status, created_at, updated_at')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to update connection request: ${error.message}`);
        if (!data)
            throw new Error('This pending request could not be found for your account.');
        return data;
    }
    async removeConnection(email, targetEmail) {
        const currentUser = await this.getConnectIdentity(email);
        const targetUser = await this.getConnectIdentity(targetEmail);
        if (!currentUser || !targetUser)
            throw new Error('The selected account could not be found.');
        const { data, error } = await this.client.from('user_connection_requests')
            .update({ status: 'declined', updated_at: new Date().toISOString() })
            .or(`and(requester_user_id.eq.${currentUser.id},recipient_user_id.eq.${targetUser.id}),and(requester_user_id.eq.${targetUser.id},recipient_user_id.eq.${currentUser.id})`)
            .eq('status', 'accepted')
            .select('id')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to remove connection: ${error.message}`);
        if (!data)
            throw new Error('This accepted connection could not be found.');
        if (currentUser.role !== targetUser.role) {
            const candidate = currentUser.role === 'candidate' ? currentUser : targetUser;
            const recruiter = currentUser.role === 'recruiter' ? currentUser : targetUser;
            const { error: permissionError } = await this.client.from('user_message_permissions')
                .update({ status: 'pending', updated_at: new Date().toISOString() })
                .eq('candidate_user_id', candidate.id)
                .eq('recruiter_user_id', recruiter.id);
            if (permissionError)
                throw new Error(`Unable to reset message approval: ${permissionError.message}`);
        }
        return { id: data.id, status: 'removed' };
    }
    async sendUserMessage(email, targetEmail, body, job = {}) {
        const sender = await this.getConnectIdentity(email);
        const recipient = await this.getConnectIdentity(targetEmail);
        const message = body.trim();
        if (!sender || !recipient)
            throw new Error('The selected account could not be found.');
        if (sender.id === recipient.id)
            throw new Error('You cannot message your own account.');
        if (!message || message.length > 5000)
            throw new Error('Messages must contain between 1 and 5000 characters.');
        if (sender.role === 'candidate' && recipient.role === 'recruiter') {
            const { data: permission, error: permissionError } = await this.client.from('user_message_permissions')
                .select('status, updated_at')
                .eq('candidate_user_id', sender.id)
                .eq('recruiter_user_id', recipient.id)
                .maybeSingle();
            if (permissionError)
                throw new Error(`Unable to check message permission: ${permissionError.message}`);
            if (permission?.status !== 'approved') {
                const { error: savePermissionError } = await this.client.from('user_message_permissions').upsert({
                    candidate_user_id: sender.id,
                    recruiter_user_id: recipient.id,
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'candidate_user_id,recruiter_user_id', ignoreDuplicates: true });
                if (savePermissionError)
                    throw new Error(`Unable to create message request: ${savePermissionError.message}`);
                const { data: pendingPermission, error: pendingError } = await this.client.from('user_message_permissions')
                    .select('updated_at')
                    .eq('candidate_user_id', sender.id)
                    .eq('recruiter_user_id', recipient.id)
                    .single();
                if (pendingError)
                    throw new Error(`Unable to load message request: ${pendingError.message}`);
                let countQuery = this.client.from('user_messages').select('id', { count: 'exact', head: true })
                    .eq('sender_user_id', sender.id)
                    .eq('recipient_user_id', recipient.id);
                if (pendingPermission?.updated_at || permission?.updated_at)
                    countQuery = countQuery.gte('created_at', pendingPermission?.updated_at || permission?.updated_at);
                const { count, error: countError } = await countQuery;
                if (countError)
                    throw new Error(`Unable to check message limit: ${countError.message}`);
                if ((count || 0) >= 2)
                    throw new Error('You have reached the two-message limit until the recruiter approves your message request.');
            }
        }
        const { data, error } = await this.client.from('user_messages').insert({
            sender_user_id: sender.id,
            recipient_user_id: recipient.id,
            message_body: message,
            job_snapshot: job,
        }).select('id, created_at').single();
        if (error)
            throw new Error(`Unable to send message: ${error.message}`);
        return { id: data.id, createdAt: data.created_at };
    }
    async getUserMessages(email) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const { data, error } = await this.client.from('user_messages')
            .select('id, sender_user_id, recipient_user_id, message_body, job_snapshot, created_at, read_at')
            .or(`sender_user_id.eq.${currentUser.id},recipient_user_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(`Unable to load messages: ${error.message}`);
        const rows = data || [];
        const memberIds = Array.from(new Set(rows.flatMap((row) => [row.sender_user_id, row.recipient_user_id])));
        const membersById = new Map();
        if (memberIds.length) {
            const { data: users, error: usersError } = await this.client.from('users').select('id, name, email, role, profile').in('id', memberIds);
            if (usersError)
                throw new Error(`Unable to load message participants: ${usersError.message}`);
            for (const user of (users || []))
                membersById.set(String(user.id), this.toConnectPerson(user));
        }
        const { data: permissions, error: permissionsError } = await this.client.from('user_message_permissions')
            .select('candidate_user_id, recruiter_user_id, status')
            .or(`candidate_user_id.eq.${currentUser.id},recruiter_user_id.eq.${currentUser.id}`);
        if (permissionsError)
            throw new Error(`Unable to load message approvals: ${permissionsError.message}`);
        const permissionByPair = new Map((permissions || []).map((permission) => [`${permission.candidate_user_id}:${permission.recruiter_user_id}`, permission.status]));
        return rows.map((row) => {
            const sender = membersById.get(row.sender_user_id);
            const recipient = membersById.get(row.recipient_user_id);
            const candidateId = sender?.role === 'candidate' ? row.sender_user_id : row.recipient_user_id;
            const recruiterId = sender?.role === 'recruiter' ? row.sender_user_id : row.recipient_user_id;
            return {
                id: row.id,
                sender,
                recipient,
                body: row.message_body,
                job: row.job_snapshot,
                createdAt: row.created_at,
                readAt: row.read_at,
                isReceived: row.recipient_user_id === currentUser.id,
                permissionStatus: permissionByPair.get(`${candidateId}:${recruiterId}`) || null,
            };
        });
    }
    async approveCandidateMessages(recruiterEmail, candidateEmail) {
        const recruiter = await this.getConnectIdentity(recruiterEmail);
        const candidate = await this.getConnectIdentity(candidateEmail);
        if (!recruiter || recruiter.role !== 'recruiter' || !candidate || candidate.role !== 'candidate')
            throw new Error('Only a recruiter can approve a candidate message request.');
        const { data, error } = await this.client.from('user_message_permissions').update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('candidate_user_id', candidate.id)
            .eq('recruiter_user_id', recruiter.id)
            .eq('status', 'pending')
            .select('status')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to approve message request: ${error.message}`);
        if (!data)
            throw new Error('No pending message request was found.');
        return { candidateEmail: candidate.email, status: data.status };
    }
    async getUserNotifications(email) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const messages = await this.getUserMessages(email);
        const notifications = messages.filter((message) => message.isReceived).map((message) => ({
            id: `message:${message.id}`,
            type: 'message',
            title: 'New message',
            description: `${message.sender?.name || 'A member'} sent you a message.`,
            createdAt: String(message.createdAt),
            messageId: message.id,
            person: message.sender,
            job: message.job,
        }));
        if (currentUser.role === 'recruiter') {
            const openings = await this.getRecruiterApplications(email);
            for (const opening of openings) {
                for (const application of opening.applicants) {
                    const candidate = application.candidate;
                    notifications.push({
                        id: `application:${String(application.id)}`,
                        type: 'application',
                        title: 'New job application',
                        description: `${String(candidate.name || 'A candidate')} applied for ${String(opening.title)}.`,
                        createdAt: String(application.appliedAt),
                        applicationId: String(application.id),
                        job: opening,
                    });
                }
            }
        }
        return notifications.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    }
    async cancelConnectionRequest(email, requestId) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const { data, error } = await this.client.from('user_connection_requests')
            .delete()
            .eq('id', requestId)
            .eq('requester_user_id', currentUser.id)
            .eq('status', 'pending')
            .select('id')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to cancel connection request: ${error.message}`);
        if (!data)
            throw new Error('This pending request could not be found for your account.');
        return { id: data.id, state: 'cancelled' };
    }
    async getReferralsForUser(email) {
        const currentUser = await this.getConnectIdentity(email);
        if (!currentUser)
            throw new Error('The signed-in account could not be found.');
        const { data, error } = await this.client.from('user_job_referrals')
            .select('id, referrer_user_id, job_snapshot, created_at')
            .eq('recipient_user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(`Unable to load job referrals: ${error.message}`);
        const rows = data || [];
        const referrerIds = Array.from(new Set(rows.map((row) => row.referrer_user_id)));
        const peopleById = new Map();
        if (referrerIds.length) {
            const { data: users, error: usersError } = await this.client.from('users').select('id, name, email, role, profile').in('id', referrerIds);
            if (usersError)
                throw new Error(`Unable to load referral profiles: ${usersError.message}`);
            for (const user of (users || []))
                peopleById.set(String(user.id), this.toConnectPerson(user));
        }
        return rows.map((row) => ({
            id: row.id,
            job: row.job_snapshot,
            referrer: peopleById.get(row.referrer_user_id),
            createdAt: row.created_at,
        })).filter((referral) => referral.referrer);
    }
    async createJobReferral(email, targetEmail, job) {
        const referrer = await this.getConnectIdentity(email);
        const recipient = await this.getConnectIdentity(targetEmail);
        if (!referrer || !recipient)
            throw new Error('The selected account could not be found.');
        if (recipient.id === referrer.id || recipient.role !== 'candidate')
            throw new Error('Choose a connected candidate to refer.');
        const requests = await this.getConnectionRequestsForUser(referrer.id);
        const isConnected = requests.some((request) => request.status === 'accepted'
            && ((request.requester_user_id === referrer.id && request.recipient_user_id === recipient.id)
                || (request.requester_user_id === recipient.id && request.recipient_user_id === referrer.id)));
        if (!isConnected)
            throw new Error('You can only refer candidates in your connections.');
        const jobId = String(job.id);
        const { data, error } = await this.client.from('user_job_referrals').insert({
            referrer_user_id: referrer.id,
            recipient_user_id: recipient.id,
            job_id: jobId,
            job_snapshot: { ...job, id: jobId },
        }).select('id, created_at').single();
        if (error)
            throw new Error(`Unable to send job referral: ${error.message}`);
        return { id: data.id, createdAt: data.created_at };
    }
    async getCandidateJobSearchProfiles() {
        const { data, error } = await this.client.from('users').select('profile').eq('role', 'candidate');
        if (error)
            throw new Error(`Unable to load candidate search profiles: ${error.message}`);
        return (data || []).map((user) => (user.profile || {}));
    }
    async upsertUser(user) {
        const { data, error } = await this.client
            .from('users')
            .upsert(user, { onConflict: 'email' })
            .select('id, name, email, role, profile, updated_at')
            .single();
        if (error) {
            throw new Error(`Unable to save user: ${error.message}`);
        }
        return data;
    }
    async updateUserRole(email, role) {
        const { data, error } = await this.client
            .from('users')
            .update({ role })
            .eq('email', email)
            .select('id')
            .maybeSingle();
        if (error)
            throw new Error(`Unable to update user role: ${error.message}`);
        if (!data)
            throw new Error('Unable to update user role: account could not be found.');
    }
    async updateUserProfile(email, profile) {
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
        const employmentDetails = Array.isArray(profile.employmentDetails) ? profile.employmentDetails : [];
        const majorProjects = Array.isArray(profile.majorProjects) ? profile.majorProjects : [];
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
        if (employmentDelete.error)
            throw new Error(`Unable to replace employment details: ${employmentDelete.error.message}`);
        if (projectsDelete.error)
            throw new Error(`Unable to replace major projects: ${projectsDelete.error.message}`);
        const [employmentInsert, projectsInsert] = await Promise.all([
            employmentRows.length ? this.client.from('user_employment_details').insert(employmentRows) : Promise.resolve({ error: null }),
            projectRows.length ? this.client.from('user_major_projects').insert(projectRows) : Promise.resolve({ error: null }),
        ]);
        if (employmentInsert.error)
            throw new Error(`Unable to save employment details: ${employmentInsert.error.message}`);
        if (projectsInsert.error)
            throw new Error(`Unable to save major projects: ${projectsInsert.error.message}`);
        return data;
    }
    async updateUserProfilePhoto(email, photo) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: user, error: loadError } = await this.client
            .from('users')
            .select('id, name, email, role, profile')
            .eq('email', normalizedEmail)
            .single();
        if (loadError)
            throw new Error(`Unable to load profile before photo update: ${loadError.message}`);
        const profile = { ...(user.profile || {}), photo };
        const { data, error } = await this.client
            .from('users')
            .update({ profile, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select('id, name, email, role, profile, updated_at')
            .single();
        if (error)
            throw new Error(`Unable to update profile photo: ${error.message}`);
        return data;
    }
    async ensureResumeBucket() {
        const { data } = await this.client.storage.getBucket('user-resumes');
        if (data)
            return;
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
    async uploadUserResume(email, file) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: user, error: userError } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
        if (userError)
            throw new Error(`Unable to load user for resume upload: ${userError.message}`);
        const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
        const contentTypes = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            rtf: 'application/rtf',
        };
        const contentType = contentTypes[extension];
        if (!contentType)
            throw new Error('Resume must be a PDF, DOC, DOCX, or RTF file.');
        if (file.size > 2 * 1024 * 1024)
            throw new Error('Resume file must be 2 MB or smaller.');
        await this.ensureResumeBucket();
        const safeName = file.originalname.replace(/[\\/]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
        const storagePath = `${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await this.client.storage.from('user-resumes').upload(storagePath, file.buffer, {
            contentType,
            upsert: false,
        });
        if (uploadError)
            throw new Error(`Unable to upload resume: ${uploadError.message}`);
        const previousResume = user.profile?.resume;
        const profile = { ...(user.profile || {}), resume: { fileName: file.originalname, size: file.size, contentType, storagePath, uploadedAt: new Date().toISOString() } };
        const { data, error } = await this.client.from('users').update({ profile, updated_at: new Date().toISOString() }).eq('id', user.id).select('updated_at').single();
        if (error) {
            await this.client.storage.from('user-resumes').remove([storagePath]);
            throw new Error(`Unable to save resume details: ${error.message}`);
        }
        if (previousResume?.storagePath)
            await this.client.storage.from('user-resumes').remove([previousResume.storagePath]);
        const { data: signedUrlData, error: signedUrlError } = await this.client.storage.from('user-resumes').createSignedUrl(storagePath, 3600);
        if (signedUrlError)
            throw new Error(`Unable to create resume download link: ${signedUrlError.message}`);
        return { resume: profile.resume, downloadUrl: signedUrlData.signedUrl, updated_at: data.updated_at };
    }
    async getUserResume(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: user, error } = await this.client.from('users').select('profile').eq('email', normalizedEmail).single();
        if (error)
            throw new Error(`Unable to load resume: ${error.message}`);
        const resume = user.profile?.resume;
        if (!resume?.storagePath)
            return null;
        const { data, error: signedUrlError } = await this.client.storage.from('user-resumes').createSignedUrl(resume.storagePath, 3600);
        if (signedUrlError)
            throw new Error(`Unable to create resume download link: ${signedUrlError.message}`);
        return { resume, downloadUrl: data.signedUrl };
    }
    async deleteUserResume(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: user, error } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
        if (error)
            throw new Error(`Unable to load user for resume removal: ${error.message}`);
        const resume = user.profile?.resume;
        if (resume?.storagePath) {
            const { error: removeError } = await this.client.storage.from('user-resumes').remove([resume.storagePath]);
            if (removeError)
                throw new Error(`Unable to remove resume file: ${removeError.message}`);
        }
        const profile = { ...(user.profile || {}) };
        delete profile.resume;
        const { data: updatedUser, error: updateError } = await this.client.from('users').update({ profile, updated_at: new Date().toISOString() }).eq('id', user.id).select('updated_at').single();
        if (updateError)
            throw new Error(`Unable to remove resume details: ${updateError.message}`);
        return { updated_at: updatedUser.updated_at };
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
    async getCareerPortals() {
        const { data, error } = await this.client
            .from('career_portals')
            .select('slug, company_name, industry, career_url')
            .eq('is_active', true)
            .order('company_name', { ascending: true });
        if (error)
            throw new Error(`Unable to load career portals: ${error.message}`);
        return (data || []).map((portal) => ({
            slug: portal.slug,
            companyName: portal.company_name,
            industry: portal.industry,
            careerUrl: portal.career_url,
        }));
    }
    async saveFeedJobs(jobs) {
        if (!jobs.length)
            return;
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
            if (error)
                throw new Error(`Unable to cache fetched jobs: ${error.message}`);
        }
    }
    async deleteStaleFeedJobs(source, fetchedAfter) {
        const { error } = await this.client
            .from('job_feed_items')
            .delete()
            .eq('source', source)
            .lt('fetched_at', fetchedAfter);
        if (error)
            throw new Error(`Unable to remove stale ${source} jobs: ${error.message}`);
    }
    async getRecentFeedJobs() {
        const fetchedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const pageSize = 1000;
        const jobs = [];
        for (let offset = 0;; offset += pageSize) {
            const { data, error } = await this.client
                .from('job_feed_items')
                .select('id, source, source_id, title, company, location, type, job_type, employment_type, preferred_shift, description, salary, url, posted_at')
                .gte('fetched_at', fetchedAfter)
                .order('fetched_at', { ascending: false })
                .order('id', { ascending: true })
                .range(offset, offset + pageSize - 1);
            if (error)
                throw new Error(`Unable to load cached jobs: ${error.message}`);
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
            if (page.length < pageSize)
                break;
        }
        return jobs;
    }
    async getUserJobApplications(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: user, error: userError } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
        if (userError)
            throw new Error(`Unable to load user applications: ${userError.message}`);
        const { data, error } = await this.client
            .from('user_job_applications')
            .select('job_snapshot, applied_at, application_details, review_status')
            .eq('user_id', user.id)
            .order('applied_at', { ascending: false });
        if (error) {
            if (error.message.includes("Could not find the table 'public.user_job_applications'")) {
                return Array.isArray(user.profile?.appliedJobs) ? user.profile.appliedJobs : [];
            }
            throw new Error(`Unable to load user applications: ${error.message}`);
        }
        return (data || []).map((application) => ({ ...application.job_snapshot, appliedAt: application.applied_at, applicationDetails: application.application_details, reviewStatus: application.review_status }));
    }
    async applyUserToJob(email, job) {
        const normalizedEmail = email.trim().toLowerCase();
        const jobId = typeof job.id === 'string' || typeof job.id === 'number' ? String(job.id) : '';
        if (!jobId || typeof job.title !== 'string' || typeof job.url !== 'string') {
            throw new Error('A valid job id, title, and URL are required.');
        }
        const { data: user, error: userError } = await this.client.from('users').select('id, profile').eq('email', normalizedEmail).single();
        if (userError)
            throw new Error(`Unable to load user for application: ${userError.message}`);
        const { data, error } = await this.client.from('user_job_applications').upsert({
            user_id: user.id,
            job_id: jobId,
            job_source: typeof job.source === 'string' ? job.source : 'career-portal',
            job_snapshot: job,
            applied_at: new Date().toISOString(),
        }, { onConflict: 'user_id,job_id' }).select('job_snapshot, applied_at').single();
        if (error) {
            if (error.message.includes("Could not find the table 'public.user_job_applications'")) {
                const applications = Array.isArray(user.profile?.appliedJobs) ? user.profile.appliedJobs : [];
                const application = { ...job, id: jobId, appliedAt: new Date().toISOString() };
                const nextApplications = [application, ...applications.filter((existing) => String(existing.id) !== jobId)];
                const profile = { ...(user.profile || {}), appliedJobs: nextApplications };
                const { error: profileError } = await this.client.from('users').update({ profile, updated_at: new Date().toISOString() }).eq('id', user.id);
                if (profileError)
                    throw new Error(`Unable to save job application: ${profileError.message}`);
                return application;
            }
            throw new Error(`Unable to save job application: ${error.message}`);
        }
        return { ...data.job_snapshot, appliedAt: data.applied_at };
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
    async addMissingJobLearningContent(topics, courses) {
        if (topics.length) {
            const topicRows = topics.map((topic) => ({
                name: topic.name,
                brief_description: topic.briefDescription,
                explanation: topic.explanation,
                example: topic.example,
                is_active: true,
            }));
            const { error } = await this.client.from('library_topics').upsert(topicRows, { onConflict: 'name', ignoreDuplicates: true });
            if (error)
                throw new Error(`Unable to add job-skill library topics: ${error.message}`);
        }
        if (courses.length) {
            const courseRows = courses.map((course) => ({
                title: course.title,
                topic: course.topic,
                provider: course.provider,
                level: course.level,
                duration: course.duration,
                url: course.url,
                is_active: true,
            }));
            const { error } = await this.client.from('courses').upsert(courseRows, { onConflict: 'title', ignoreDuplicates: true });
            if (error)
                throw new Error(`Unable to add job-skill courses: ${error.message}`);
        }
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DatabaseService);
//# sourceMappingURL=database.service.js.map