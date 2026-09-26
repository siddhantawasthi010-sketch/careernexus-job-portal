# Job Portal API

This NestJS backend provides the API layer for the Job Portal project.

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

For an existing database, rerun the current [`supabase.sql`](supabase.sql) in the SQL Editor to create the employment/project tables, `user_job_applications`, and private `user-resumes` storage bucket. Profile fields, skills, and resume metadata are stored in `users.profile`; resume file contents are stored in the private bucket.

The service-role key is backend-only. Do not put it in either frontend application or commit it to source control.

## Endpoints

- `GET /health` → health check
- `GET /jobs` → list jobs
- `GET /jobs/featured` → list featured jobs
- `GET /jobs/recommendations?email=...` → fetch live career-portal listings and score them against the signed-in profile
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

## Live job sources

The recommendations endpoint fetches public Greenhouse boards on each request. By default it queries the verified boards `figma`, `cloudflare`, `datadog`, `duolingo`, `robinhood`, `anthropic`, `stripe`, `asana`, and `mongodb`. Override them with the comma-separated `GREENHOUSE_BOARD_SLUGS` environment variable. Optional Lever postings can be added through `LEVER_COMPANY_SITES`; each value must be the company's Lever site identifier. No portal API keys are used for these public feeds.

Recommendations require a profile headline or preferred job role and at least one preferred city. Home displays matches at 50% or higher; Apply → Recommended displays matches at 70% or higher. A click on Apply is saved locally in `user_job_applications` before opening the employer's listing. It records the handoff, not completion of the external application form.

## Port

The API runs on port 5000 by default.

## Adding Library topics

Add a row to `public.library_topics` with a unique `name`, `brief_description`, `explanation`, and `example`, then set `is_active` to `true`. The web and mobile Library components fetch this endpoint and automatically render new rows with search, A-Z filtering, and expand/collapse behavior.

Add a row to `public.courses` with a unique `title`, `topic`, `provider`, `level`, `duration`, and `url`, then set `is_active` to `true`. The web and mobile Courses components fetch this endpoint and automatically render new rows with search and external course links.
