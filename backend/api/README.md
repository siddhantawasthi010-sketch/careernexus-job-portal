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

Configure provider credentials in the backend `.env` file. Adzuna requires `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`; Jooble requires `JOOBLE_API_KEY`; RapidAPI JSearch requires `RAPIDAPI_KEY`. Greenhouse board slugs go in `GREENHOUSE_BOARD_SLUGS`, Lever site identifiers go in `LEVER_COMPANY_SITES`, and Workday tenant/site configurations go in `WORKDAY_TENANTS` as a JSON array. These ATS identifiers are separate from career portal URLs. Providers without configuration are skipped; source failures are isolated and returned in `sourcesFailed`.

`/jobs/recommendations` searches using the signed-in profile's preferred role, headline, skills, and cities. Results from all configured providers are normalized and deduplicated into `job_feed_items`, then filtered and ranked against preferred city, role, professional summary, skills, notice period (when a job explicitly states availability), and available job-type/shift data. Each result includes a `matchScore` percentage used as the shortlist score. Recent stored listings are used as a fallback when all live provider requests fail. Home displays matches at 50% or higher; Apply → Recommended displays matches at 70% or higher.

The `career_portals` table contains the 34 official employer links supplied for this project. Career pages are shown separately from job postings because they do not all provide public job-feed APIs. A click on Apply is saved in `user_job_applications` before opening the employer's listing; it records the handoff, not completion of the external application form.

## Port

The API runs on port 5000 by default.

## Adding Library topics

Add a row to `public.library_topics` with a unique `name`, `brief_description`, `explanation`, and `example`, then set `is_active` to `true`. The web and mobile Library components fetch this endpoint and automatically render new rows with search, A-Z filtering, and expand/collapse behavior.

Add a row to `public.courses` with a unique `title`, `topic`, `provider`, `level`, `duration`, and `url`, then set `is_active` to `true`. The web and mobile Courses components fetch this endpoint and automatically render new rows with search and external course links.
