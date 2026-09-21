# Job Portal

A hybrid job portal project with a web frontend, mobile frontend, and backend API.

## Project structure

```text
job-portal/
├── frontend/
│   ├── web/
│   └── mobile/
├── backend/
│   └── api/
├── docs/
│   └── architecture/
├── .gitignore
├── README.md
```

## Recommended architecture

- Frontend: React + React Native
- Backend: Node.js + Express/NestJS
- Database: PostgreSQL + Elasticsearch/MongoDB
- Hosting: AWS / Azure / GCP
- Version control: GitHub/GitLab/Bitbucket

## Branch strategy

- `main` → stable production code
- `develop` → integration branch
- `feature/*` → feature-specific work such as `feature/auth`, `feature/jobs`

## Protecting `main`

`main` must only accept reviewed pull requests. Direct pushes should be disabled in the remote repository settings.

## Getting started

### Frontend

```bash
cd frontend/web
npm install
npm run dev
```

### Backend

```bash
cd backend/api
npm install
copy .env.example .env
npm run start:dev
```

Run [`backend/api/supabase.sql`](backend/api/supabase.sql) in the Supabase SQL Editor first, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/api/.env`.

### API health check

```bash
http://localhost:5000/api/health
```
