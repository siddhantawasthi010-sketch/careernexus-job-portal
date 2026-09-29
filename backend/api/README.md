# CareerNexus Job Portal API

This NestJS backend provides the API layer for the CareerNexus Job Portal project.

## Scripts

```bash
npm install
npm run start:dev
```

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase.sql`](supabase.sql) to create and seed the application tables, including user employment and major project records.
3. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

If OTP requests fail with `column users.profile does not exist`, the database was created from an older schema. Run the following in the same Supabase project's SQL Editor, then restart the API:

```sql
alter table public.users
add column if not exists profile jsonb not null default '{}'::jsonb;
```

For an existing database, rerun the current [`supabase.sql`](supabase.sql) in the SQL Editor to create the employment/project tables, `user_job_applications`, `career_portals`, `job_feed_items`, and private `user-resumes` storage bucket. Profile fields, skills, and resume metadata are stored in `users.profile`; resume file contents are stored in the private bucket.

The service-role key is backend-only. Do not put it in either frontend application or commit it to source control.

## Endpoints

- `GET /health` → health check
- `GET /jobs` → list jobs
- `GET /jobs/featured` → list featured jobs
- `GET /jobs/career-portals` → list official employer career portals
- `GET /jobs/recommendations?email=...` → return profile-matched job listings
- `GET /jobs/applications?email=...` → list jobs the candidate has applied to
- `POST /jobs/applications` → save a candidate's Apply action and job snapshot
- `GET /connect?email=...` → list incoming/outgoing requests and approved connections
- `GET /connect/search?email=...&role=candidate|recruiter&q=...` → search members by name, email, or company
- `POST /connect/requests` → send a connection request with `{ "email": "...", "targetEmail": "..." }`
- `PATCH /connect/requests/:requestId` → accept or decline a pending request with `{ "email": "...", "status": "accepted|declined" }`
- `GET /library/topics` → list active Library topics ordered alphabetically
- `GET /courses` → list active online courses ordered by topic and title
- `POST /auth/send-otp` → create and email an OTP
- `POST /auth/resend-otp` → resend an OTP after the cooldown
- `POST /auth/verify-otp` → verify an OTP and persist the user
- `PUT /auth/profile` → save profile fields, skills, employment history, and major projects
- `POST /auth/profile/resume` → upload a PDF, DOC, DOCX, or RTF resume (maximum 2 MB)
- `GET /auth/profile/resume?email=...` → create a short-lived signed download link
- `DELETE /auth/profile/resume` → remove the uploaded resume

## Job feed integrations

Configure provider settings in Render's backend environment (or the backend `.env` for local development). Arbeitnow runs from its public job-board API without a key; its coverage is stronger in Europe than India, and its source label and original listing URL are displayed. Adzuna requires `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`; Jooble requires `JOOBLE_API_KEY`; RapidAPI JSearch requires `RAPIDAPI_KEY`; and Google Jobs through SerpApi requires `SERPAPI_API_KEY`. SerpApi searches Google Jobs using the candidate's first preferred location by default; `GOOGLE_JOBS_COUNTRY`, `GOOGLE_JOBS_LANGUAGE`, and `GOOGLE_JOBS_MAX_LOCATIONS` can customize the search (maximum three locations, each consuming a search when not served from SerpApi's cache).

Public company ATS boards can also be added without API keys: put Ashby job-board names in `ASHBY_JOB_BOARDS` and SmartRecruiters career-page company identifiers in `SMARTRECRUITERS_COMPANIES`, as comma-separated lists. Example: the board name is the last path segment of `https://jobs.ashbyhq.com/<board-name>`, and the SmartRecruiters identifier is the path after `https://careers.smartrecruiters.com/`. SmartRecruiters fetches full details for up to `SMARTRECRUITERS_MAX_POSTINGS` recent postings per company (default 20, capped at 50) to provide the employer's real posting/application URL. Only use public board identifiers belonging to employers whose postings you are authorized to display. Greenhouse board slugs go in `GREENHOUSE_BOARD_SLUGS`, Lever site identifiers go in `LEVER_COMPANY_SITES`, and Workday tenant/site configurations go in `WORKDAY_TENANTS` as a JSON array. ATS identifiers are separate from employer career-portal URLs. Providers without configuration are skipped; source failures are isolated and returned in `sourcesFailed`.

Google Jobs/SerpApi is a paid third-party API after any trial quota and its results may link to other job boards. Review SerpApi's current plan and redistribution terms before enabling it in production. This project does not scrape LinkedIn, Naukri, Shine, or other portals; use their official partner programs if you need their listings directly. Large job portals do not provide equivalent unrestricted public APIs, so public feeds cannot guarantee their volume or freshness. Each listing exposes its source and links candidates to the provider/employer posting.

Provider feeds are refreshed once at backend startup and then every two hours by Nest's scheduler. Successful refreshes are upserted in `job_feed_items`; stale rows for a source are removed only after that source refresh succeeds. User recommendation requests do not call external job providers: they read, rank, and return the cached feed. The first page defaults to 12 jobs; pass `limit` (maximum 30) and `offset` to `/jobs/recommendations` for subsequent pages.

After each scheduled refresh, recent cached job descriptions are checked against the curated skill catalog in `src/jobs/job-learning-catalog.ts`. Detected skills are added to `library_topics` with an explanation and example, and receive Coursera and Udemy course-search links in `courses`; unique constraints make this safe to repeat. This is a curated recognizer, not an LLM extraction pass, so uncommon skills not yet in the catalog will not be auto-added until the catalog is extended.

`/jobs/recommendations` searches the cached feed using the signed-in profile's preferred role, headline, skills, and cities. It requires a profile location and role/headline/skills signal, filters out nonmatching locations and jobs with no role/skill match, then ranks by relevance and available preferences such as expected salary (`expectedSalaryLpa` in the profile, INR lakhs per year), total experience (`totalExperienceYears`, or dates in employment history), job type, shift, and notice period. Salary and experience improve ranking when the posting includes comparable details; missing listing data is not treated as a mismatch. Each result includes a `matchScore` percentage used as the shortlist score.

The `career_portals` table contains the 34 official employer links supplied for this project. Career pages are shown separately from job postings because they do not all provide public job-feed APIs. A click on Apply is saved in `user_job_applications` before opening the employer's listing; it records the handoff, not completion of the external application form.

## Port

The API runs on port 5000 by default.

## Adding Library topics

Add a row to `public.library_topics` with a unique `name`, `brief_description`, `explanation`, and `example`, then set `is_active` to `true`. The web and mobile Library components fetch this endpoint and automatically render new rows with search, A-Z filtering, and expand/collapse behavior.

Add a row to `public.courses` with a unique `title`, `topic`, `provider`, `level`, `duration`, and `url`, then set `is_active` to `true`. The web and mobile Courses components fetch this endpoint and automatically render new rows with search and external course links.
