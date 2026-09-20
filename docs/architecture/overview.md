# Job Portal Architecture

## Overview

This project follows a modular architecture for a hybrid job portal application.

### Frontend
- React web app for browser access
- React Native app for mobile access
- Shared UI components and design system

### Backend
- Node.js API service
- Modules for auth, jobs, candidates, recruiters, and matching

### Data layer
- PostgreSQL for core structured data
- Elasticsearch or MongoDB for flexible search and matching

### Hosting
- AWS, Azure, or GCP-managed infrastructure
- Auto-scaling and managed databases

## Recommended branch strategy

- `main` -> production-ready stable code
- `develop` -> integration branch
- `feature/*` -> feature-specific development

## Version control

- Use GitHub, GitLab, or Bitbucket
- Protect `main` through pull request reviews
