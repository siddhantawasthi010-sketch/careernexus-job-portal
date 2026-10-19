export interface JobLearningSkill {
  name: string;
  matchers: string[];
  briefDescription: string;
  explanation: string;
  subtopics?: string[];
  realWorldFlow?: string;
  example: string;
}

const softwareTestingTopics = [
  'API Testing',
  'Automation Testing',
  'Black-box Testing',
  'Boundary Value Analysis',
  'Exploratory Testing',
  'Integration Testing',
  'Load Testing',
  'Manual Testing',
  'Performance Testing',
  'Regression Testing',
  'Smoke Testing',
  'Test Case Design',
  'Test-Driven Development',
  'Unit Testing',
  'User Acceptance Testing',
  'Selenium',
  'Cypress',
  'Playwright',
  'Jest',
  'JUnit',
  'Postman',
  'Apache JMeter',
];

const softwareTestingSignals = [
  'software tester',
  'software testing',
  'quality assurance',
  'qa engineer',
  'test engineer',
  'automation tester',
  'test automation',
  'sdet',
  'manual tester',
  'cucumber',
  'bdd',
  'istqb',
];

const mentionsTerm = (text: string, term: string) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(text);
};

export const getRelatedLearningSkills = (profileTerms: string[]) => {
  const profileText = profileTerms.join(' ').toLowerCase();
  const hasTestingRole = softwareTestingSignals.some((signal) => mentionsTerm(profileText, signal));
  const hasTestingTool = ['selenium', 'cypress', 'playwright', 'cucumber', 'bdd', 'istqb', 'postman', 'jmeter']
    .some((signal) => mentionsTerm(profileText, signal));
  const relatedTopicNames = hasTestingRole || hasTestingTool ? softwareTestingTopics : [];

  return jobLearningCatalog.filter((skill) => relatedTopicNames.includes(skill.name));
};

export const jobLearningCatalog: JobLearningSkill[] = [
  {
    name: 'API Testing',
    matchers: ['api testing', 'api test', 'api tests'],
    briefDescription: 'Verifies an API request from input validation through authorization, response contract, and persisted result.',
    explanation: 'Treat an API as a contract between a client and server. Test valid and invalid inputs, authentication and ownership, status codes, response fields, persistence, duplicate requests, and dependency failures. Use isolated test records and assert observable behavior rather than private implementation details.',
    subtopics: ['HTTP methods, routes, headers, and payloads', 'Authentication, authorization, and ownership', 'Validation, status codes, and response schemas', 'Persistence, idempotency, and error behavior', 'Fixtures, cleanup, and safe test credentials'],
    realWorldFlow: 'Create an isolated user, authenticate, update a profile through the API, read it back to verify persistence, then send invalid and unauthorized requests and verify they do not change stored data.',
    example: `import assert from 'node:assert/strict';

const response = await fetch('http://localhost:5000/jobs?limit=1');
assert.equal(response.status, 200);
const jobs = await response.json();
assert.ok(Array.isArray(jobs));`,
  },
  {
    name: 'Automation Testing',
    matchers: ['automation testing', 'test automation', 'automated testing'],
    briefDescription: 'Uses repeatable test code to check important software behavior quickly and consistently.',
    explanation: 'Choose a test level that matches the risk: unit tests for isolated rules, API/integration tests for service boundaries, and browser tests for user journeys. Reliable automation uses deterministic data, stable accessible selectors, explicit assertions, cleanup, and useful failure output. It complements exploratory and usability testing.',
    subtopics: ['Unit, API, integration, and browser test levels', 'Fixtures and deterministic test data', 'Assertions and accessible selectors', 'Waiting, flakiness, parallel runs, and cleanup', 'CI reporting and risk-based coverage'],
    realWorldFlow: 'Seed a disposable candidate, sign in, update a profile field, reload to prove persistence, and assert the saved value. Run the test in CI against an isolated environment and clean up its records.',
    example: `import { test, expect } from '@playwright/test';

test('profile changes persist after reload', async ({ page }) => {
  await page.goto('/profile');
  await page.getByLabel('Location').fill('Pune');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Location')).toHaveValue('Pune');
});`,
  },
  {
    name: 'Black-box Testing',
    matchers: ['black-box testing', 'black box testing'],
    briefDescription: 'Checks a feature through its documented inputs and visible results without relying on its internal code.',
    explanation: 'Start from a requirement and identify input classes, actions, expected results, state changes, and errors. Equivalence classes reduce redundant cases; boundary checks target limits; decision tables cover combinations; state-transition checks validate workflows. This approach works even when implementation details are unavailable.',
    subtopics: ['Requirements and observable acceptance criteria', 'Input partitions and expected outputs', 'Boundary and decision-table techniques', 'State transitions and recovery', 'Evidence independent of implementation'],
    realWorldFlow: 'For password reset, request a link for a test account, set a new password, and sign in. Repeat with unknown email, expired link, reused link, and invalid password; compare each visible result with the acceptance criteria.',
    example: `const response = await fetch('http://localhost:5000/auth/password-reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'qa@example.test' }),
});
console.assert(response.status === 202);`,
  },
  {
    name: 'Boundary Value Analysis',
    matchers: ['boundary value analysis', 'boundary testing'],
    briefDescription: 'Targets defects at the edges of accepted values, such as minimums, maximums, and values immediately outside them.',
    explanation: 'For an allowed interval [min, max], check min-1, min, min+1, max-1, max, and max+1. Include empty, null, malformed, and wrong-type inputs where relevant. Boundaries also apply to string lengths, dates, uploads, and pagination. State the expected behavior for every test value.',
    subtopics: ['Inclusive and exclusive limits', 'One-below, at, and one-above values', 'Empty and wrong-type inputs', 'String, date, upload, and pagination limits', 'Off-by-one and unit-conversion risks'],
    realWorldFlow: 'If job search accepts page sizes from 1 through 50, request 0, 1, 2, 49, 50, and 51. Valid requests should return no more than the requested count; invalid requests should return a client error without triggering an unbounded query.',
    example: `import assert from 'node:assert/strict';

for (const limit of [1, 2, 49, 50]) {
  const response = await fetch(\`http://localhost:5000/jobs?limit=\${limit}\`);
  assert.equal(response.status, 200);
  assert.ok((await response.json()).length <= limit);
}
for (const limit of [0, 51]) {
  const response = await fetch(\`http://localhost:5000/jobs?limit=\${limit}\`);
  assert.equal(response.status, 400);
}`,
  },
  {
    name: 'Exploratory Testing',
    matchers: ['exploratory testing'],
    briefDescription: 'Combines product learning, adaptive test design, and execution in a focused investigation.',
    explanation: 'Use a charter and time box to focus investigation. Observe normal behavior, vary data and action order, probe interruptions and recovery, and record evidence. Explore risks such as permissions, repeated actions, slow networks, refresh/back navigation, and invalid state. Turn important discoveries into reproducible defects or regression checks.',
    subtopics: ['Charters, scope, and time boxes', 'Risk heuristics and adaptive probing', 'Timing, state, permissions, and recovery', 'Session notes and reproducible evidence', 'Converting findings into regression tests'],
    realWorldFlow: 'Explore checkout for 30 minutes with a duplicate-charge charter. Double-click Pay, refresh during processing, interrupt the network, return from the payment provider, and retry. Record transaction IDs, exact steps, expected/actual behavior, and evidence.',
    example: `const charter = {
  goal: 'Find duplicate-charge defects',
  probes: ['double-click Pay', 'refresh while processing', 'disconnect network', 'retry after failure'],
};
for (const probe of charter.probes) console.log('Investigate:', probe);`,
  },
  {
    name: 'Integration Testing',
    matchers: ['integration testing', 'integration test', 'integration tests'],
    briefDescription: 'Verifies that connected services and components exchange data correctly across real boundaries.',
    explanation: 'Integration tests exercise real collaborating components such as an API and database, including serialization, constraints, transactions, middleware, and configuration. Use a temporary database or isolated environment, production-like migrations, controlled fixtures, and cleanup. Test failures and rollback as well as successful integration.',
    subtopics: ['Component contracts and data mapping', 'Database schema, queries, and transactions', 'Middleware, serialization, and configuration', 'Queues and external service adapters', 'Isolation, cleanup, rollback, and failure paths'],
    realWorldFlow: 'Submit an authenticated application through the actual API, then query a temporary database to verify the user/job relationship and initial status. Force a database constraint failure and confirm no partial application remains.',
    example: `BEGIN;
INSERT INTO applications (candidate_id, job_id, status)
VALUES (42, 108, 'submitted');
SELECT status FROM applications
WHERE candidate_id = 42 AND job_id = 108;
ROLLBACK;`,
  },
  {
    name: 'Load Testing',
    matchers: ['load testing', 'load test', 'load tests'],
    briefDescription: 'Measures service behavior under a defined expected workload and concurrency level.',
    explanation: 'Model realistic arrival rates, user journeys, ramp-up, duration, and data mix. Track latency percentiles, throughput, error rate, CPU, memory, database pools, and queue depth. Keep tests in a controlled environment with synthetic data. Load testing differs from stress and spike testing; define thresholds before running.',
    subtopics: ['Workload, concurrency, and arrival rate', 'Ramp-up and steady-state duration', 'Latency percentiles, throughput, and errors', 'Application and database resource metrics', 'Safe environments and capacity decisions'],
    realWorldFlow: 'Model 100 users per second searching jobs for 10 minutes, ramping up gradually. Compare p95 latency and error-rate thresholds to baseline, identify bottlenecks from metrics, make one change, and repeat the same workload.',
    example: `import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [{ duration: '2m', target: 100 }, { duration: '10m', target: 100 }],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};
export default function () {
  check(http.get(\`\${__ENV.BASE_URL}/jobs?limit=20\`), { 'HTTP 200': r => r.status === 200 });
}`,
  },
  {
    name: 'Manual Testing',
    matchers: ['manual testing', 'manual tester'],
    briefDescription: 'Uses deliberate human interaction to evaluate behavior, usability, accessibility, and presentation.',
    explanation: 'Manual testing is valuable for new features, exploratory work, visual quality, accessibility, and situations requiring human judgment. Define the goal, environment, preconditions, test data, steps, expected result, and evidence. Check error, empty, loading, keyboard, persistence, and recovery states; retest fixes and automate stable repetitive checks.',
    subtopics: ['Scope, build, environment, and preconditions', 'Test data, actions, and expected results', 'Usability, accessibility, and visual review', 'Negative, loading, empty, and recovery states', 'Evidence, retesting, and automation candidates'],
    realWorldFlow: 'Sign in, change a profile location, save, reload, and verify persistence. Repeat with keyboard-only navigation, empty input, simulated network failure, and a narrow viewport. Record browser/build and reproducible evidence for each defect.',
    example: `const manualCheck = {
  steps: ['Change location to Pune', 'Save profile', 'Reload the page'],
  expected: 'Location remains Pune after reload',
  evidence: 'Record browser, build, steps, and screenshot on failure',
};
console.log(manualCheck);`,
  },
  {
    name: 'Performance Testing',
    matchers: ['performance testing', 'performance test', 'performance tests'],
    briefDescription: 'Measures response time, throughput, resource use, scalability, and stability under different workloads.',
    explanation: 'Set measurable objectives such as p95/p99 latency, throughput, error rate, and resource ceilings. Run realistic load, stress, spike, or soak scenarios in a controlled environment. Monitor the full dependency path, use traces to identify bottlenecks, and compare identical workloads before and after changes. Averages alone can hide slow user experiences.',
    subtopics: ['Latency percentiles and service objectives', 'Throughput, concurrency, and queueing', 'Load, stress, spike, and soak testing', 'CPU, memory, database, and network monitoring', 'Profiling and repeatable comparisons'],
    realWorldFlow: 'Measure job search at expected and peak traffic, record p50/p95/p99 latency and resource use, trace a slow database filter, add an appropriate index, and rerun the same workload to prove the change improved latency without unacceptable resource cost.',
    example: `import http from 'k6/http';
export const options = {
  vus: 40,
  duration: '5m',
  thresholds: { http_req_duration: ['p(95)<400', 'p(99)<800'] },
};
export default function () {
  http.get(\`\${__ENV.BASE_URL}/jobs?limit=20\`);
}`,
  },
  {
    name: 'Regression Testing',
    matchers: ['regression testing', 'regression test', 'regression tests'],
    briefDescription: 'Rechecks important existing behavior after a change to catch unintended breakage.',
    explanation: 'Select tests by business impact, code-change scope, defect history, and integration risk. A small smoke suite covers critical journeys; focused unit/API tests protect changed logic; broader regression suites run before release. Keep tests deterministic and maintainable, and assign ownership to flaky checks rather than silently ignoring them.',
    subtopics: ['Change-impact and risk-based selection', 'Critical user journeys and business invariants', 'Focused checks near changed logic', 'Fixtures and deterministic assertions', 'CI release gates and flaky-test ownership'],
    realWorldFlow: 'After changing application submission, run validation and persistence tests, then verify a candidate can search and apply and a recruiter receives the application. Block release on a high-risk regression and preserve the failing test evidence.',
    example: `const checks = [
  testRequiredProfileFields,
  testApplicationSavedOnce,
  testCandidateSeesAppliedStatus,
  testRecruiterReceivesApplication,
];
for (const check of checks) await check();`,
  },
  {
    name: 'Smoke Testing',
    matchers: ['smoke testing', 'smoke test', 'smoke tests'],
    briefDescription: 'Runs a fast health check after a build or deployment to decide whether deeper testing can proceed.',
    explanation: 'Check that the application starts, core endpoints and dependencies respond, sign-in works in a safe test environment, core data loads, and one basic action succeeds. Smoke tests should be fast, stable, diagnostic, and non-destructive. A failure blocks deeper testing because the build may not be testable.',
    subtopics: ['Build and deployment health', 'Core endpoints and dependencies', 'One essential authenticated journey', 'Fast, reversible, diagnostic checks', 'Release blocking and safe test accounts'],
    realWorldFlow: 'After staging deployment, check API health and database connectivity, sign in with a disposable user, load the dashboard, and open a job. If any step fails, stop release promotion and investigate before running full regression.',
    example: `const health = await fetch(\`\${process.env.BASE_URL}/health\`);
if (!health.ok) throw new Error('Health check failed');
const jobs = await fetch(\`\${process.env.BASE_URL}/jobs?limit=1\`);
if (!jobs.ok || !Array.isArray(await jobs.json())) throw new Error('Job smoke check failed');`,
  },
  {
    name: 'Test Case Design',
    matchers: ['test case design', 'test case', 'test cases'],
    briefDescription: 'Turns requirements and risks into reproducible tests with explicit inputs, actions, and expected results.',
    explanation: 'A useful test is traceable to a requirement and has unambiguous pass/fail criteria. Capture actor, initial state, test data, actions, visible result, persisted side effect, and cleanup. Use equivalence classes, boundary analysis, decision tables, and state transitions to cover risk without unnecessary duplication. Include negative, permission, and recovery cases.',
    subtopics: ['Requirement traceability and risk priority', 'Actors, preconditions, and test data', 'Actions and observable expected results', 'Equivalence classes and boundaries', 'Decision tables, state transitions, and cleanup'],
    realWorldFlow: 'Translate “a candidate may apply once to an open job” into cases for eligible, missing resume, closed job, and duplicate submissions. Specify initial records, requests, expected messages/status, and the invariant that only one application exists.',
    example: `const testCase = {
  objective: 'Prevent duplicate applications',
  precondition: 'Open job; candidate has no existing application',
  actions: ['Submit application', 'Submit the same application again'],
  expected: ['First creates one record', 'Second is reported as duplicate', 'Exactly one record remains'],
};
console.log(testCase);`,
  },
  {
    name: 'Test-Driven Development',
    matchers: ['test-driven development', 'tdd'],
    briefDescription: 'Builds behavior incrementally through a failing test, minimal implementation, and refactoring.',
    explanation: 'Red: write a focused test that describes desired behavior and fails for the expected reason. Green: make the smallest correct implementation. Refactor: improve design while keeping the test green. Assert observable behavior rather than private implementation. TDD benefits from fast feedback but does not replace integration, security, or acceptance testing.',
    subtopics: ['Red: specify behavior with a failing test', 'Green: minimal passing implementation', 'Refactor while keeping tests green', 'Normal, boundary, and error cases', 'Fast feedback and complementary integration tests'],
    realWorldFlow: 'For a salary formatter, first test conversion from rupees to lakhs, implement only that behavior, add zero and invalid-value cases, refactor, and run profile UI checks to verify the formatted value appears in the real workflow.',
    example: `import assert from 'node:assert/strict';
function formatLpa(rupees) {
  if (!Number.isFinite(rupees) || rupees < 0) throw new RangeError();
  return \`\${(rupees / 100000).toFixed(1)} LPA\`;
}
assert.equal(formatLpa(1800000), '18.0 LPA');
assert.throws(() => formatLpa(-1), RangeError);`,
  },
  {
    name: 'Unit Testing',
    matchers: ['unit testing', 'unit test', 'unit tests'],
    briefDescription: 'Checks one small function, class, or component in isolation for fast, precise feedback.',
    explanation: 'Control inputs and external dependencies, call one unit, and assert its observable result. Cover representative valid values, edge cases, and errors. Keep tests deterministic and fast; use test doubles at external boundaries such as time, network, or storage, not to recreate the implementation. A failure should point to one behavior.',
    subtopics: ['Unit boundary and behavior contract', 'Arrange, act, and assert', 'Representative, boundary, and error inputs', 'Dependency doubles and isolation', 'Determinism and clear failure messages'],
    realWorldFlow: 'Test a profile-completion calculator with empty, partial, and complete profiles. Then run a component test to verify the resulting percentage is displayed correctly in the profile UI.',
    example: `import assert from 'node:assert/strict';
function completion(profile) {
  const fields = ['name', 'headline', 'location', 'skills'];
  const filled = fields.filter((key) => Boolean(profile[key])).length;
  return Math.round(filled / fields.length * 100);
}
assert.equal(completion({}), 0);
assert.equal(completion({ name: 'Asha', skills: ['SQL'] }), 50);`,
  },
  {
    name: 'User Acceptance Testing',
    matchers: ['user acceptance testing', 'uat'],
    briefDescription: 'Confirms with representative users that a complete feature meets business goals and agreed acceptance criteria.',
    explanation: 'UAT validates business fitness, not just technical correctness. Define measurable acceptance criteria before implementation, use realistic roles and data in a production-like environment, and execute complete journeys. Record evidence, blockers, and decisions; authorized stakeholders approve or block release. UAT does not replace security, performance, or developer testing.',
    subtopics: ['Business goals and acceptance criteria', 'Representative users, roles, and realistic data', 'Complete user journeys and downstream effects', 'Evidence, defect triage, and approval ownership', 'Relationship to QA, security, and performance testing'],
    realWorldFlow: 'A candidate searches and applies to a job, sees confirmation, and finds it under Applied Jobs. A recruiter sees the correct candidate and resume. Stakeholders verify every criterion with evidence and record release approval or blockers.',
    example: `const criteria = [
  ['candidate', 'apply to an open job', 'one application and confirmation'],
  ['candidate', 'open Applied Jobs', 'job appears with submitted status'],
  ['recruiter', 'open the application', 'candidate details and resume are visible'],
];
for (const [role, action, expected] of criteria) console.log({ role, action, expected });`,
  },
  { name: 'JavaScript', matchers: ['javascript', 'ecmascript'], briefDescription: 'A programming language used for interactive web applications and server-side services.', explanation: 'JavaScript runs in web browsers and on server runtimes such as Node.js. Job requirements commonly include asynchronous programming, modules, data handling, and working with browser or service APIs.', example: 'Use async/await to fetch profile data and render the response after it resolves.' },
  { name: 'TypeScript', matchers: ['typescript'], briefDescription: 'JavaScript with a static type system for safer application development.', explanation: 'TypeScript adds compile-time types, interfaces, and generics to JavaScript. Teams use it to make contracts explicit and catch many data-shape mistakes before code runs.', example: 'Define a Job interface so title, company, and application URL are checked by the compiler.' },
  { name: 'Python', matchers: ['python'], briefDescription: 'A general-purpose language used in backend services, automation, data, and AI.', explanation: 'Python is valued for its readable syntax and broad ecosystem. Common work includes APIs, scripts, data processing, testing, and machine-learning applications.', example: 'Write a Python service that validates incoming JSON and stores normalized records.' },
  { name: 'Java', matchers: ['java'], briefDescription: 'A strongly typed language widely used for backend and enterprise systems.', explanation: 'Java applications commonly use object-oriented design, the JVM, automated tests, and frameworks such as Spring. Roles often require building maintainable services and integrating databases or messaging systems.', example: 'Implement a Spring service that validates an order and persists it transactionally.' },
  { name: 'C++', matchers: ['c++', 'cpp'], briefDescription: 'A compiled language used where performance and low-level control matter.', explanation: 'C++ provides direct control over memory and runtime behavior while supporting abstraction and generic programming. It is common in systems software, embedded products, graphics, and performance-sensitive services.', example: 'Use RAII and smart pointers to manage a resource safely across error paths.' },
  { name: 'C#', matchers: ['c#', 'c sharp'], briefDescription: 'A modern language commonly used with .NET for services, desktop, and cloud apps.', explanation: 'C# provides static typing, async programming, and a mature .NET ecosystem. Employers often pair it with ASP.NET Core, Entity Framework, cloud hosting, and automated tests.', example: 'Build an ASP.NET Core endpoint that validates a request and returns a typed response.' },
  { name: 'React', matchers: ['react', 'react.js', 'reactjs'], briefDescription: 'A component-based JavaScript library for building user interfaces.', explanation: 'React applications compose reusable components and render from state. Relevant skills include props, state, effects, accessible controls, and managing asynchronous UI states.', example: 'Render a job list from state and show a loading state while the next page is fetched.' },
  { name: 'Angular', matchers: ['angular'], briefDescription: 'A TypeScript framework for building structured web applications.', explanation: 'Angular includes routing, dependency injection, forms, and a component model. Production work often involves RxJS, testing, and organizing applications into maintainable feature modules.', example: 'Create a typed service that retrieves jobs and exposes loading and error states.' },
  { name: 'Node.js', matchers: ['node.js', 'nodejs'], briefDescription: 'A JavaScript runtime used to build servers, APIs, and developer tools.', explanation: 'Node.js uses an event-driven runtime suited to I/O-heavy applications. Backend roles commonly cover HTTP APIs, asynchronous work, package management, security, and observability.', example: 'Create an API route that validates query parameters before reading from a database.' },
  { name: '.NET', matchers: ['.net', 'dotnet', 'asp.net'], briefDescription: 'Microsoft’s development platform for web, cloud, desktop, and service applications.', explanation: '.NET provides runtimes, libraries, and tooling for applications commonly written in C#. Backend work often uses ASP.NET Core, dependency injection, data access, and automated testing.', example: 'Register a repository with dependency injection and use it from an ASP.NET controller.' },
  { name: 'Spring Boot', matchers: ['spring boot', 'springboot'], briefDescription: 'A Java framework for creating production-ready services with minimal setup.', explanation: 'Spring Boot configures common application infrastructure and integrates with Spring MVC, data stores, security, and testing tools. Developers build APIs and services with clear dependency boundaries.', example: 'Expose a REST controller backed by a service and repository.' },
  { name: 'SQL', matchers: ['sql', 'structured query language'], briefDescription: 'A language for querying and changing data in relational databases.', explanation: 'SQL skills include filtering, joins, grouping, transactions, and understanding indexes. Strong query design helps applications return correct data efficiently.', example: 'Join users to applications, group by user, and count applications per month.' },
  { name: 'PostgreSQL', matchers: ['postgresql', 'postgres'], briefDescription: 'An open-source relational database with strong SQL and JSON support.', explanation: 'PostgreSQL provides transactions, constraints, indexes, JSONB, and extensibility. Application developers use these features to preserve data integrity and query structured or semi-structured data.', example: 'Add a unique constraint on a normalized email so duplicate accounts cannot be inserted.' },
  { name: 'MySQL', matchers: ['mysql'], briefDescription: 'A widely used relational database for web and business applications.', explanation: 'MySQL stores data in relational tables and supports transactions, indexes, and SQL queries. Job requirements often include schema design, query performance, and safe migrations.', example: 'Add an index to a frequently filtered column and compare query plans.' },
  { name: 'MongoDB', matchers: ['mongodb', 'mongo db'], briefDescription: 'A document database that stores flexible JSON-like records.', explanation: 'MongoDB groups related data into documents and supports indexes, validation, and aggregation pipelines. Engineers must choose document boundaries that support expected access patterns.', example: 'Use an aggregation pipeline to group event documents by account and day.' },
  { name: 'Redis', matchers: ['redis'], briefDescription: 'An in-memory data store used for caching, queues, and fast lookups.', explanation: 'Redis supports data structures such as strings, hashes, sets, and streams. Production use requires sensible TTLs, cache invalidation, and understanding persistence and availability trade-offs.', example: 'Cache a frequently requested profile for five minutes and invalidate it on update.' },
  { name: 'Amazon Web Services', matchers: ['aws', 'amazon web services'], briefDescription: 'A cloud platform offering compute, storage, databases, networking, and managed services.', explanation: 'AWS work involves selecting services, securing identity and network access, deploying workloads, and monitoring cost and reliability. Role requirements often name services such as S3, EC2, Lambda, or RDS.', example: 'Store uploads in a private S3 bucket and grant access through a short-lived signed URL.' },
  { name: 'Microsoft Azure', matchers: ['azure', 'microsoft azure'], briefDescription: 'Microsoft’s cloud platform for hosting applications, data, and identity services.', explanation: 'Azure provides managed compute, storage, databases, networking, and identity. Engineers commonly deploy services, configure least-privilege access, and monitor operational health.', example: 'Deploy a web API with managed identity access to a storage account.' },
  { name: 'Google Cloud Platform', matchers: ['gcp', 'google cloud', 'google cloud platform'], briefDescription: 'Google’s cloud platform for compute, data, networking, and AI services.', explanation: 'GCP work includes deploying applications, configuring IAM, connecting managed data services, and observing workloads. Service selection should match security, reliability, and cost needs.', example: 'Run a containerized API on Cloud Run with access to a managed database.' },
  { name: 'Docker', matchers: ['docker', 'docker containers'], briefDescription: 'A tool for packaging applications and dependencies into portable containers.', explanation: 'Docker images describe reproducible runtime environments. Teams use containers in local development, CI, and production while keeping images small and secrets outside the image.', example: 'Build an API image from a lockfile and run it with configuration supplied at runtime.' },
  { name: 'Kubernetes', matchers: ['kubernetes', 'k8s'], briefDescription: 'A platform for deploying and managing containerized workloads across clusters.', explanation: 'Kubernetes manages deployments, services, configuration, health checks, and scaling. Operators need to understand resource requests, rollout behavior, networking, and access control.', example: 'Deploy three API replicas with readiness probes and a rolling update strategy.' },
  { name: 'Terraform', matchers: ['terraform', 'infrastructure as code'], briefDescription: 'An infrastructure-as-code tool for defining and managing cloud resources.', explanation: 'Terraform describes infrastructure declaratively and tracks it in state. Safe workflows review plans, protect state, modularize reusable resources, and avoid committing secrets.', example: 'Define a storage bucket and its access policy, then review the plan before applying it.' },
  { name: 'Git', matchers: ['git', 'github', 'gitlab', 'version control'], briefDescription: 'A version-control system for tracking and collaborating on code changes.', explanation: 'Git records project history through commits and branches. Team workflows rely on clear commits, conflict resolution, code review, and keeping sensitive data out of repository history.', example: 'Create a feature branch, commit a focused change, and rebase it before review.' },
  { name: 'CI/CD', matchers: ['ci/cd', 'continuous integration', 'continuous delivery', 'continuous deployment'], briefDescription: 'Automated workflows that build, test, and deliver software changes.', explanation: 'CI/CD pipelines give fast feedback by running repeatable checks on every change and automating releases. Reliable pipelines protect credentials and make failures diagnosable.', example: 'Run lint, tests, and a production build before publishing a release artifact.' },
  { name: 'Linux', matchers: ['linux'], briefDescription: 'An operating system commonly used for servers, containers, and development.', explanation: 'Linux skills include navigating the filesystem, managing processes and permissions, using shell tools, and diagnosing network or service issues.', example: 'Inspect service logs and identify which process is listening on a port.' },
  { name: 'REST APIs', matchers: ['rest api', 'rest apis', 'restful api', 'restful apis'], briefDescription: 'HTTP interfaces organized around resources and standard methods.', explanation: 'REST API design uses meaningful resource URLs, HTTP methods, status codes, validation, and consistent error responses. Good APIs also consider authentication, pagination, and backward compatibility.', example: 'Use GET /jobs?limit=20&offset=20 to retrieve the next page of listings.' },
  { name: 'GraphQL', matchers: ['graphql'], briefDescription: 'A query language and runtime for clients to request structured API data.', explanation: 'GraphQL exposes a typed schema and lets clients select fields. Server design must control authorization, query complexity, resolver performance, and error behavior.', example: 'Query a job title and employer name without fetching unrelated fields.' },
  { name: 'Apache Kafka', matchers: ['kafka', 'apache kafka'], briefDescription: 'A distributed event-streaming platform for high-throughput data pipelines.', explanation: 'Kafka organizes events into topics and partitions. Engineers design producer and consumer behavior, delivery guarantees, schema evolution, and recovery from processing failures.', example: 'Publish an order-created event and let an independent service consume it.' },
  { name: 'Selenium', matchers: ['selenium', 'webdriver'], briefDescription: 'A browser automation framework for testing web applications.', explanation: 'Selenium drives browsers through WebDriver. Reliable tests use stable locators, explicit waits, isolated test data, and assertions tied to user-visible behavior.', example: 'Automate signing in and verify that the account dashboard appears.' },
  { name: 'Cypress', matchers: ['cypress'], briefDescription: 'A browser-based framework for end-to-end and component testing.', explanation: 'Cypress runs tests alongside the application and provides automatic waiting and debugging tools. Tests should use stable selectors and cover important user workflows.', example: 'Verify a candidate can filter jobs and open a matching listing.' },
  { name: 'Playwright', matchers: ['playwright'], briefDescription: 'A browser automation framework for reliable end-to-end testing.', explanation: 'Playwright controls Chromium, Firefox, and WebKit with auto-waiting, isolated browser contexts, and trace tooling. It supports robust cross-browser user-flow tests.', example: 'Test profile persistence after reload in separate authenticated browser contexts.' },
  { name: 'Jest', matchers: ['jest'], briefDescription: 'A JavaScript testing framework for unit and integration tests.', explanation: 'Jest provides assertions, mocks, and test discovery for JavaScript and TypeScript projects. Tests should verify observable behavior and isolate external dependencies where appropriate.', example: 'Mock a provider response and assert that the adapter maps its URL correctly.' },
  { name: 'JUnit', matchers: ['junit'], briefDescription: 'A testing framework for writing and running Java tests.', explanation: 'JUnit supports automated unit and integration testing with assertions, lifecycle hooks, and parameterized cases. Tests help catch regressions at the class and service boundaries.', example: 'Test that an invalid request returns a validation error without writing to the repository.' },
  { name: 'Postman', matchers: ['postman'], briefDescription: 'A platform for designing, sending, and testing HTTP API requests.', explanation: 'Postman collections organize API requests and can run assertions against status codes, response bodies, and authentication behavior. They are useful for exploratory API checks and repeatable smoke tests.', example: 'Assert that a recommendations endpoint returns a jobs array and a next-page offset.' },
  { name: 'Apache JMeter', matchers: ['jmeter', 'apache jmeter'], briefDescription: 'A tool for load and performance testing of services and applications.', explanation: 'JMeter simulates concurrent users and records throughput, latency, and errors. Useful tests model realistic traffic patterns and establish clear performance thresholds.', example: 'Run a steady API load and track the 95th-percentile response time.' },
  { name: 'Power BI', matchers: ['power bi', 'powerbi'], briefDescription: 'Microsoft’s business intelligence platform for data modeling and reports.', explanation: 'Power BI connects data sources, transforms data, builds semantic models, and presents interactive reports. Useful skills include data modeling, DAX, refresh behavior, and access control.', example: 'Create a report that compares monthly hiring volume by department.' },
  { name: 'Tableau', matchers: ['tableau'], briefDescription: 'A platform for visual analytics and interactive dashboards.', explanation: 'Tableau connects to data, builds visual analyses, and publishes dashboards. Effective work selects appropriate chart types, validates measures, and communicates trends clearly.', example: 'Build a dashboard comparing role demand by location and experience level.' },
];