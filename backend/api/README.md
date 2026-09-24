# Job Portal API

This NestJS backend provides the API layer for the Job Portal project.

## Scripts

```bash
npm install
npm run start:dev
```

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase.sql`](supabase.sql) to create and seed the `users`, `otp_codes`, `jobs`, `library_topics`, and `courses` tables.
3. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

If OTP requests fail with `column users.profile does not exist`, the database was created from an older schema. Run the following in the same Supabase project's SQL Editor, then restart the API:

```sql
alter table public.users
add column if not exists profile jsonb not null default '{}'::jsonb;
```

The service-role key is backend-only. Do not put it in either frontend application or commit it to source control.

## Endpoints

- `GET /health` → health check
- `GET /jobs` → list jobs
- `GET /jobs/featured` → list featured jobs
- `GET /library/topics` → list active Library topics ordered alphabetically
- `GET /courses` → list active online courses ordered by topic and title
- `POST /auth/send-otp` → create and email an OTP
- `POST /auth/resend-otp` → resend an OTP after the cooldown
- `POST /auth/verify-otp` → verify an OTP and persist the user

## Port

The API runs on port 5000 by default.

## Adding Library topics

Add a row to `public.library_topics` with a unique `name`, `brief_description`, `explanation`, and `example`, then set `is_active` to `true`. The web and mobile Library components fetch this endpoint and automatically render new rows with search, A-Z filtering, and expand/collapse behavior.

Add a row to `public.courses` with a unique `title`, `topic`, `provider`, `level`, `duration`, and `url`, then set `is_active` to `true`. The web and mobile Courses components fetch this endpoint and automatically render new rows with search and external course links.
