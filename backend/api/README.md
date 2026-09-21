# Job Portal API

This NestJS backend provides the API layer for the Job Portal project.

## Scripts

```bash
npm install
npm run start:dev
```

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase.sql`](supabase.sql) to create and seed the `users`, `otp_codes`, and `jobs` tables.
3. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key is backend-only. Do not put it in either frontend application or commit it to source control.

## Endpoints

- `GET /health` → health check
- `GET /jobs` → list jobs
- `GET /jobs/featured` → list featured jobs
- `POST /auth/send-otp` → create and email an OTP
- `POST /auth/resend-otp` → resend an OTP after the cooldown
- `POST /auth/verify-otp` → verify an OTP and persist the user

## Port

The API runs on port 5000 by default.
