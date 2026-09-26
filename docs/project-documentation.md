# CareerNexus Job Portal Project Documentation

## 1. Introduction

This project is a full-stack job portal starter built to demonstrate a real-world product architecture with three main parts:

- Web frontend built with React + Vite
- Mobile app built with React Native + Expo
- Backend API built with NestJS

The goal is to create a complete hiring platform workflow where a recruiter can log in, view jobs, and manage hiring activity, while a candidate can log in and browse job openings.

This project is a starter implementation, not a production-ready enterprise system, but it follows the right architecture and workflow patterns for a scalable product.

---

## 2. Business Objective

The portal is designed to support:

- Candidate job discovery
- Recruiter job management
- Authentication and role-based access
- User-friendly screens across web and mobile
- A backend that exposes REST APIs for auth and jobs

The product is intentionally modular so it can be extended with:

- candidate profiles
- recruiter profiles
- job posting system
- application tracking
- notifications
- database persistence
- admin dashboard

---

## 3. Project Structure Overview

```text
careernexus-job-portal/
├── backend/
│   └── api/
│       ├── src/
│       │   ├── app.controller.ts
│       │   ├── app.module.ts
│       │   ├── app.service.ts
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.module.ts
│       │   │   └── auth.service.ts
│       │   ├── jobs/
│       │   │   ├── jobs.controller.ts
│       │   │   ├── jobs.module.ts
│       │   │   └── jobs.service.ts
│       │   ├── main.ts
│       │   └── ...
│       ├── package.json
│       └── tsconfig.json
├── frontend/
│   ├── web/
│   │   ├── src/
│   │   │   ├── main.jsx
│   │   │   └── styles.css
│   │   ├── package.json
│   │   └── vite.config.js
│   └── mobile/
│       ├── App.js
│       ├── package.json
│       └── src/
│           ├── data/
│           │   └── jobs.js
│           └── screens/
│               ├── LoginScreen.js
│               ├── JobsScreen.js
│               └── RecruiterDashboardScreen.js
├── docs/
│   ├── architecture/
│   │   └── system-design.md
│   └── development/
│       └── branching-strategy.md
├── README.md
├── CONTRIBUTING.md
├── .gitignore
└── docs/
    └── project-documentation.md
```

---

## 4. Technology Stack

### Frontend (Web)
- React
- Vite
- JavaScript / JSX

Purpose:
- Build the browser-based portal interface
- Display login, job cards, and recruiter dashboard
- Manage front-end routing using browser hash state

### Frontend (Mobile)
- React Native
- Expo
- React Navigation

Purpose:
- Create a mobile experience for the same business flow
- Support login, jobs listing, recruiter dashboard, and role-based screens

### Backend
- Node.js
- NestJS
- TypeScript

Purpose:
- Expose job and authentication APIs
- Centralize business logic
- Support multiple client apps (web and mobile)

### Version Control
- Git
- GitHub / GitLab / Bitbucket compatible

Purpose:
- Track features, branch changes, and code reviews

---

## 5. Root-Level Project Files

### README.md
This explains the project overview, architecture, setup, and how to get started.

### CONTRIBUTING.md
This documents collaboration rules, including branch naming and the requirement that the main branch should be protected.

### .gitignore
This helps keep the repository clean by excluding folders like node_modules, build outputs, and environment files.

### docs/
This folder contains product and development documentation, such as architecture, strategy, and project guidance.

---

## 6. Backend: NestJS API

The backend is the core system that handles login and job data. It is built with NestJS and runs independently from the frontend apps.

### 6.1 Main entry point: src/main.ts

This file starts the NestJS application.

Functionality:

- Creates the application instance
- Enables CORS so frontend apps can call the backend from different origins or ports
- Reads the port from environment variables or defaults to 5000
- Starts the server

Core code logic:

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
```

This means the backend is available at:

- http://localhost:5000

### 6.2 App module: src/app.module.ts

This is the root NestJS module. It imports all feature modules.

Current modules included:

- AuthModule
- JobsModule

This acts like the registry of all backend features. In a larger system, this would also include:

- candidate module
- recruiter module
- application module
- admin module
- notification module

### 6.3 App controller and service

These are the default NestJS starter files. They represent the root API and standard application service logic.

They are not the main business features in this project, but they are part of the base NestJS structure.

---

## 7. Authentication Module

The authentication layer is implemented in the auth feature folder.

### Files
- auth.controller.ts
- auth.module.ts
- auth.service.ts

### 7.1 auth.module.ts

This module is responsible for registering the controller and the service in NestJS.

It tells the application:
- which controller handles incoming requests
- which service contains the business logic

### 7.2 auth.controller.ts

This is the API endpoint layer.

```ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
```

This means the route is:

- POST /auth/login

When the frontend sends a JSON payload containing email and password, the controller forwards it to the auth service.

### 7.3 auth.service.ts

This is where the business validation logic lives.

The service checks if the email and password match one of the valid demo users.

The available demo users are:

- recruiter@jobportal.com / recruiter123
- candidate@jobportal.com / candidate123

When credentials are valid, the API returns:

- accessToken
- user object with role and basic profile information

Example response:

```json
{
  "accessToken": "demo-jwt-token-for-careernexus-job-portal",
  "user": {
    "id": 1,
    "name": "Recruiter User",
    "email": "recruiter@jobportal.com",
    "role": "recruiter"
  }
}
```

If the credentials are wrong, the service throws an UnauthorizedException.

This is a starter implementation and not a production JWT system, but it correctly simulates the real flow of:

1. validate user
2. generate token
3. return user profile and role

---

## 8. Jobs Module

The jobs feature provides the list of available job openings.

### Files
- jobs.controller.ts
- jobs.module.ts
- jobs.service.ts

### 8.1 jobs.controller.ts

This controller defines job endpoints:

- GET /jobs
- GET /jobs/featured

It forwards logic to the jobs service.

### 8.2 jobs.service.ts

This file holds the actual job data.

The service returns a list of job objects such as:

- Frontend Developer
- Backend Engineer
- UI/UX Designer

Each object contains:

- id
- title
- company
- location
- type
- salary

This is a local in-memory seed dataset used for demo purposes. In a production app, these records would come from a database such as PostgreSQL or MongoDB.

---

## 9. Web Frontend: React + Vite

The web app is built in the folder:

- frontend/web

The main file is:

- src/main.jsx

### 9.1 How it works

The app has a simple screen state engine:

- login screen
- jobs screen
- recruiter dashboard screen

The route is controlled by the browser hash and browser history state.

#### State handling

```jsx
const [screen, setScreen] = useState(getScreenFromHash());
```

This keeps track of the current page.

#### Navigation logic

```jsx
window.history.pushState({ screen: nextScreen }, '', nextHash);
```

This updates the browser URL and maintains back/forward behavior.

### 9.2 Login screen

The login screen includes:

- email input
- password input
- role toggle for recruiter and candidate
- submit button
- error handling

When the user submits the form:

1. The React app calls POST /auth/login on the backend
2. If login is successful, it stores the returned user data
3. It redirects the user based on their role

Example:

- recruiter => jobs screen with dashboard access
- candidate => candidate jobs screen

### 9.3 Jobs screen

This screen renders job cards with:

- title
- company
- location
- type
- salary

It also shows a recruiter dashboard button only for recruiter users.

### 9.4 Recruiter dashboard screen

This screen shows recruiter analytics such as:

- open positions
- interviews
- shortlisted candidates
- recent applicants list

This is a demo dashboard and not connected to a database yet.

### 9.5 Styling: src/styles.css

This file contains all the custom styling for the project, including:

- background colors
- cards
- buttons
- login cards
- header layout
- dashboard styles
- responsive behavior for smaller screen sizes

---

## 10. Mobile Frontend: React Native + Expo

The mobile app is built in:

- frontend/mobile

### 10.1 App.js

This file defines the app container and navigation flow using React Navigation.

It registers screens such as:

- Login
- Jobs
- CandidateJobs
- RecruiterDashboard

This is the central app navigation system for the mobile app.

### 10.2 LoginScreen.js

This screen is the mobile entry point.

It contains:

- email field
- password field
- role toggle
- login button
- API call handler

The login flow:

1. User enters email and password
2. App sends POST request to backend
3. Backend validates credentials
4. App navigates to the correct screen based on user role

For Android emulator, the app uses:

- http://10.0.2.2:5000

This is necessary because Android cannot use localhost the same way the browser can.

### 10.3 JobsScreen.js

This screen displays job cards in the mobile app.

It has role-aware behavior:

- recruiter sees the dashboard button
- candidate sees only job browsing without recruiter dashboard access

It fetches jobs from the backend using:

- GET /jobs

If the backend is unavailable, it falls back to local demo jobs.

### 10.4 RecruiterDashboardScreen.js

This screen mimics a recruiter analytics view.

It displays KPI cards such as:

- Open Positions
- Interviews
- Shortlisted

It also shows a list of recent applicants.

This is a static design layer used to simulate a recruiter dashboard in the starter project.

---

## 11. Data and Demo Logic

This project uses hardcoded demo data instead of a real database.

### Authentication data
Stored in auth.service.ts as user definitions.

### Jobs data
Stored in jobs.service.ts and also in mobile fallback arrays.

This is intentional for a starter project because it lets the product be demonstrated quickly and tested before real database integration.

---

## 12. End-to-End Execution Flow

Here is the full flow from start to finish.

### Step 1: Start backend

From the root folder, run:

```bash
cd backend/api
npm install
npm run start:dev
```

The backend becomes available at:

```text
http://localhost:5000
```

### Step 2: Start web frontend

```bash
cd frontend/web
npm install
npm run dev
```

This opens the React app in the browser.

### Step 3: Start mobile app

```bash
cd frontend/mobile
npm install
npx expo start --lan
```

Then:

- scan the QR code with Expo Go, or
- press a to open Android emulator

### Step 4: Login as recruiter

Use:

- Email: recruiter@jobportal.com
- Password: recruiter123

Expected result:
- recruiter sees jobs page
- recruiter sees dashboard button
- recruiter can access dashboard

### Step 5: Login as candidate

Use:

- Email: candidate@jobportal.com
- Password: candidate123

Expected result:
- candidate sees candidate job list
- recruiter dashboard is hidden or unavailable

### Step 6: Backend handles request

The frontend sends a request to POST /auth/login.

NestJS validates the supplied user and returns a user object and token.

### Step 7: Frontend uses response

The frontend stores the user information and decides which screen to render.

### Step 8: Job list flow

The frontend requests GET /jobs from the backend.

The backend sends job records, which are displayed in cards.

---

## 13. How the Project Actually Functions

At a high level, the system works like this:

1. The browser or mobile app loads a UI
2. The user logs in with role-specific credentials
3. The backend validates the request
4. The backend returns data about the user and job list
5. The UI renders content based on the response
6. The user sees screens tailored to recruiter or candidate access

This is the standard architecture for a full stack product:

- frontend gathers user interaction
- backend validates and serves data
- API acts as central business logic layer

---

## 14. What Is Already Created in This Project

This project currently includes:

- project directory structure
- backend API foundation with NestJS
- auth login API
- jobs API
- React web app UI
- React Native mobile app UI
- recruiter dashboard screen mock
- candidate vs recruiter role separation
- branch strategy and documentation files

This is a strong starter project foundation that can be scaled into a production-ready job portal.

---

## 15. What Is Missing for Production

To make this project fully production-ready, the following components would be added next:

- database integration with PostgreSQL or MongoDB
- persistent user storage
- hashed passwords
- real JWT authentication
- refresh tokens
- job posting APIs for recruiters
- application submission APIs
- candidate profile pages
- resume upload
- filter and search features
- notifications and emails
- admin panel
- deployment pipeline
- cloud hosting configuration
- environment variables
- unit and integration testing

---

## 16. Recommended Future Architecture

A production version of this system would usually have:

- Frontend: React web + React Native mobile
- Backend: NestJS API
- Database: PostgreSQL for relational data
- Search layer: Elasticsearch or MongoDB for job discovery
- Storage: cloud file storage for resumes and media
- Hosting: AWS / Azure / GCP
- CI/CD: GitHub Actions or Azure DevOps

---

## 17. Execution Summary

To run the full project end-to-end:

1. Open terminal in backend/api
2. Run npm install and npm run start:dev
3. Open another terminal in frontend/web
4. Run npm install and npm run dev
5. Open another terminal in frontend/mobile
6. Run npm install and npx expo start --lan
7. Scan the QR code from Expo Go
8. Log in using recruiter or candidate credentials
9. Test the flows end to end

---

## 18. Final Notes

This project is a complete starter for a hybrid portal system. It demonstrates the core concepts of modern product engineering:

- separation of concerns
- multi-platform frontends
- modular backend APIs
- role-based access
- demo data for prototyping
- clean documentation and branch strategy

The project is suitable as a learning foundation, a prototype, and a starting point for a larger real-world hiring platform.
