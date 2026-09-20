# Job Portal System Design

## 1. Architecture

### Hybrid Application

The portal should support both web and mobile users from a single product vision.

- Web frontend: React
- Mobile frontend: React Native
- Shared business rules and UI design system where possible

This gives one product experience across browser and mobile while keeping maintenance manageable.

### Backend

Use a scalable backend for APIs, user authentication, job management, recruiter workflows, and candidate services.

Recommended stack:
- Node.js with Express or NestJS
- Modular services for:
  - authentication
  - jobs
  - candidates
  - recruiters
  - matching and recommendations
  - course integration

### Database

Use a relational database for structured records and a search/indexing store for fast lookup.

Recommended data storage:
- PostgreSQL/MySQL for core application data
- MongoDB or Elasticsearch for job search, skill matching, and recommendation queries

### Cloud Hosting

Deploy on managed cloud infrastructure to reduce operational overhead.

Recommended hosting:
- AWS / Azure / GCP
- Managed databases
- Auto-scaling services
- Serverless APIs when appropriate

---

## 2. Recommended implementation stack

### Frontend
- React for web app
- React Native for mobile app
- Redux Toolkit or Zustand for state management
- Axios or TanStack Query for API calls

### Backend
- Node.js + NestJS
- REST APIs with clear module boundaries
- JWT or OAuth-based authentication

### Data
- PostgreSQL for users, jobs, applications, recruiter records
- Elasticsearch for job indexing and search relevance

### DevOps
- GitHub/GitLab/Bitbucket
- CI/CD pipelines
- Docker containers
- Cloud deployment with environment-based configs

---

## 3. Proposed system flow

1. Candidate logs in and creates a profile.
2. Recruiter posts a job listing.
3. Search and matching services index jobs and candidate profiles.
4. Candidate recommendations are generated using skill and profile matching.
5. Recruiters review applicants and update application status.
6. Admins manage users, policies, and platform configuration.

---

## 4. Best practical choice

For this project, the best fit is:

- Frontend: React + React Native
- Backend: Node.js + NestJS
- Database: PostgreSQL + Elasticsearch
- Deployment: AWS or Azure

This approach balances speed, maintainability, and scalability.
