-- Run this script in Supabase SQL Editor before starting the API.
-- The API uses the service role key, while RLS blocks direct client access.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-resumes',
  'user-resumes',
  false,
  2097152,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/rtf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  role text not null check (role in ('candidate', 'recruiter')),
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists profile jsonb not null default '{}'::jsonb;

create table if not exists public.user_employment_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  is_current boolean not null default false,
  employment_type text check (employment_type in ('Full Time', 'Part Time')),
  company_name text not null,
  job_title text not null,
  joining_date date,
  relieving_date date,
  ctc text,
  skills text[] not null default '{}',
  job_profile text,
  notice_period text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_major_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_title text not null,
  company_name text,
  client_name text,
  status text check (status in ('In progress', 'Finished')),
  worked_from date,
  worked_till date,
  project_details text,
  created_at timestamptz not null default now()
);

create index if not exists user_employment_details_user_idx on public.user_employment_details (user_id, created_at);
create index if not exists user_major_projects_user_idx on public.user_major_projects (user_id, created_at);

create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  role text not null check (role in ('candidate', 'recruiter')),
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_email_sent_at_idx on public.otp_codes (email, sent_at desc);

create table if not exists public.jobs (
  id bigint primary key,
  title text not null,
  company text not null,
  location text not null,
  type text not null,
  salary text,
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.career_portals (
  slug text primary key,
  company_name text not null,
  industry text not null,
  career_url text not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.job_feed_items (
  id text primary key,
  source text not null,
  source_id text not null,
  title text not null,
  company text not null,
  location text not null default '',
  type text not null default 'Not specified',
  job_type text,
  employment_type text,
  preferred_shift text,
  description text not null default '',
  salary text,
  url text not null,
  posted_at timestamptz,
  fetched_at timestamptz not null default now()
);

create index if not exists job_feed_items_fetched_at_idx on public.job_feed_items (fetched_at desc);
create index if not exists job_feed_items_company_idx on public.job_feed_items (company);

create table if not exists public.recruiter_job_openings (
  id uuid primary key default gen_random_uuid(),
  recruiter_user_id uuid not null references public.users(id) on delete cascade,
  company_name text not null,
  position text not null,
  location text not null,
  work_mode text not null check (work_mode in ('Hybrid', 'Full-time')),
  job_description text not null,
  company_about text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruiter_job_openings_status_created_idx on public.recruiter_job_openings (status, created_at desc);
create index if not exists recruiter_job_openings_recruiter_idx on public.recruiter_job_openings (recruiter_user_id, created_at desc);

create table if not exists public.user_job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id text not null,
  job_source text not null,
  job_snapshot jsonb not null,
  applied_at timestamptz not null default now(),
  unique (user_id, job_id)
);

alter table public.user_job_applications add column if not exists application_details jsonb not null default '{}'::jsonb;
alter table public.user_job_applications add column if not exists review_status text not null default 'submitted'
  check (review_status in ('submitted', 'viewed', 'resume_downloaded', 'shortlisted', 'not_shortlisted'));

create index if not exists user_job_applications_user_applied_idx on public.user_job_applications (user_id, applied_at desc);
create index if not exists user_job_applications_job_idx on public.user_job_applications (job_id, applied_at desc);

create table if not exists public.user_connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.users(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_user_id, recipient_user_id),
  check (requester_user_id <> recipient_user_id)
);

create index if not exists user_connection_requests_recipient_status_idx on public.user_connection_requests (recipient_user_id, status, updated_at desc);
create index if not exists user_connection_requests_requester_status_idx on public.user_connection_requests (requester_user_id, status, updated_at desc);

create table if not exists public.user_message_permissions (
  candidate_user_id uuid not null references public.users(id) on delete cascade,
  recruiter_user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (candidate_user_id, recruiter_user_id),
  check (candidate_user_id <> recruiter_user_id)
);

create table if not exists public.user_messages (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.users(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  message_body text not null,
  job_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_user_id <> recipient_user_id)
);

create index if not exists user_messages_recipient_created_idx on public.user_messages (recipient_user_id, created_at desc);
create index if not exists user_messages_sender_recipient_created_idx on public.user_messages (sender_user_id, recipient_user_id, created_at desc);
create index if not exists user_message_permissions_recruiter_status_idx on public.user_message_permissions (recruiter_user_id, status, updated_at desc);

create table if not exists public.user_job_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  job_id text not null,
  job_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  check (referrer_user_id <> recipient_user_id)
);

create index if not exists user_job_referrals_recipient_created_idx on public.user_job_referrals (recipient_user_id, created_at desc);

create table if not exists public.library_topics (
  id bigint generated by default as identity primary key,
  name text not null unique,
  brief_description text not null,
  explanation text not null,
  subtopics text[] not null default '{}',
  real_world_flow text not null default '',
  example text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_topics
  add column if not exists subtopics text[] not null default '{}',
  add column if not exists real_world_flow text not null default '';

create index if not exists library_topics_name_idx on public.library_topics (name);

create table if not exists public.courses (
  id bigint generated by default as identity primary key,
  title text not null unique,
  topic text not null,
  provider text not null,
  level text not null,
  duration text not null,
  url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_topic_title_idx on public.courses (topic, title);

alter table public.users enable row level security;
alter table public.user_employment_details enable row level security;
alter table public.user_major_projects enable row level security;
alter table public.otp_codes enable row level security;
alter table public.jobs enable row level security;
alter table public.career_portals enable row level security;
alter table public.job_feed_items enable row level security;
alter table public.recruiter_job_openings enable row level security;
alter table public.user_job_applications enable row level security;
alter table public.user_connection_requests enable row level security;
alter table public.user_message_permissions enable row level security;
alter table public.user_messages enable row level security;
alter table public.user_job_referrals enable row level security;
alter table public.library_topics enable row level security;
alter table public.courses enable row level security;

delete from public.jobs where company in ('NovaLabs', 'Streamline AI', 'Motive Studio', 'PixelForge', 'BluePeak');

delete from public.career_portals where slug not in (
  'tcs', 'infosys', 'hcltech', 'wipro', 'tech-mahindra', 'ltimindtree', 'cognizant', 'mphasis', 'persistent-systems', 'coforge',
  'tata-motors', 'mahindra-group', 'bajaj-auto', 'tvs-motor', 'tata-steel', 'jsw-group', 'aditya-birla-group', 'reliance-industries', 'jindal-steel-power', 'larsen-toubro',
  'tata-communications', 'bharti-airtel', 'indus-towers', 'dr-reddys', 'sun-pharma', 'cipla', 'lupin', 'biocon',
  'asian-paints', 'titan-company', 'marico', 'godrej-group', 'dabur', 'tata-consumer-products'
);

insert into public.career_portals (slug, company_name, industry, career_url)
values
  ('tcs', 'Tata Consultancy Services (TCS)', 'IT Services', 'https://www.tcs.com/careers'),
  ('infosys', 'Infosys', 'IT Services', 'https://www.infosys.com/careers.html'),
  ('hcltech', 'HCLTech', 'IT Services', 'https://careers.hcltech.com/job/'),
  ('wipro', 'Wipro', 'IT Services', 'https://careers.wipro.com/'),
  ('tech-mahindra', 'Tech Mahindra', 'IT Services', 'https://careers.techmahindra.com/'),
  ('ltimindtree', 'LTIMindtree', 'IT Services', 'https://www.ltimindtree.com/careers/'),
  ('cognizant', 'Cognizant India', 'IT Services', 'https://careers.cognizant.com/'),
  ('mphasis', 'Mphasis', 'IT Services', 'https://careers.mphasis.com/'),
  ('persistent-systems', 'Persistent Systems', 'IT Services', 'https://www.persistent.com/careers/'),
  ('coforge', 'Coforge', 'IT Services', 'https://www.coforge.com/careers'),
  ('tata-motors', 'Tata Motors', 'Automotive', 'https://careers.tatamotors.com/'),
  ('mahindra-group', 'Mahindra Group', 'Conglomerate', 'https://jobs.mahindracareers.com/'),
  ('bajaj-auto', 'Bajaj Auto', 'Automotive', 'https://www.bajajauto.com/careers'),
  ('tvs-motor', 'TVS Motor', 'Automotive', 'https://www.tvsmotor.com/careers'),
  ('tata-steel', 'Tata Steel', 'Steel', 'https://www.tatasteel.com/careers/'),
  ('jsw-group', 'JSW Group', 'Diversified', 'https://www.jsw.in/careers'),
  ('aditya-birla-group', 'Aditya Birla Group', 'Conglomerate', 'https://careers.adityabirla.com/'),
  ('reliance-industries', 'Reliance Industries', 'Energy/Retail/Telecom', 'https://careers.ril.com/'),
  ('jindal-steel-power', 'Jindal Steel & Power', 'Steel', 'https://www.jindalsteelpower.com/careers.html'),
  ('larsen-toubro', 'Larsen & Toubro (L&T)', 'Engineering', 'https://careers.larsentoubro.com/'),
  ('tata-communications', 'Tata Communications', 'Telecom', 'https://www.tatacommunications.com/careers/'),
  ('bharti-airtel', 'Bharti Airtel', 'Telecom', 'https://www.airtel.com/careers'),
  ('indus-towers', 'Indus Towers', 'Telecom Infrastructure', 'https://www.industowers.com/careers'),
  ('dr-reddys', 'Dr. Reddy''s', 'Pharmaceuticals', 'https://careers.drreddys.com/'),
  ('sun-pharma', 'Sun Pharma', 'Pharmaceuticals', 'https://sunpharma.com/careers'),
  ('cipla', 'Cipla', 'Pharmaceuticals', 'https://www.cipla.com/careers'),
  ('lupin', 'Lupin', 'Pharmaceuticals', 'https://www.lupin.com/careers'),
  ('biocon', 'Biocon', 'Biotechnology', 'https://www.biocon.com/careers'),
  ('asian-paints', 'Asian Paints', 'Manufacturing', 'https://www.asianpaints.com/careers.html'),
  ('titan-company', 'Titan Company', 'Consumer Goods', 'https://www.titancompany.in/careers/'),
  ('marico', 'Marico', 'FMCG', 'https://marico.com/india/careers'),
  ('godrej-group', 'Godrej Group', 'Conglomerate', 'https://www.godrejcareers.com/'),
  ('dabur', 'Dabur', 'FMCG', 'https://www.dabur.com/careers'),
  ('tata-consumer-products', 'Tata Consumer Products', 'FMCG', 'https://www.tataconsumer.com/careers')
on conflict (slug) do update set
  company_name = excluded.company_name,
  industry = excluded.industry,
  career_url = excluded.career_url,
  is_active = true,
  updated_at = now();

insert into public.library_topics (name, brief_description, explanation, subtopics, real_world_flow, example)
values
  ('API Testing', 'A practical discipline for proving that an HTTP service accepts valid requests, rejects invalid ones, enforces access rules, and returns a stable contract.', 'An API is a contract between a client and a server. Test the complete request/response boundary: HTTP method and route, headers and authentication, input parsing and validation, status code, response body and types, persistence side effects, and error behavior. Use representative valid, invalid, unauthorized, duplicate, and boundary inputs. Keep tests isolated with disposable records, avoid asserting incidental fields, and never put production credentials in a collection. A useful API test explains which contract failed, not merely that a request returned a non-200 status.', ARRAY['HTTP methods, routes, headers, and content types', 'Authentication, authorization, and ownership checks', 'Request validation, required fields, types, and boundaries', 'Status codes, response schemas, and stable error formats', 'Persistence, idempotency, pagination, and filtering', 'Test data setup, cleanup, and safe secrets'], 'Real-world flow: create a test account, authenticate, submit a valid profile update, read the profile back, then submit a malformed update and confirm it returns a validation error without changing stored data. Repeat with no token and with a different user’s resource to verify authorization.', $$import assert from 'node:assert/strict';
const baseUrl = process.env.API_URL ?? 'http://localhost:5000';

const created = await fetch(`${baseUrl}/test-users`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: `qa-${Date.now()}@example.test` }),
});
assert.equal(created.status, 201);
const user = await created.json();

const updated = await fetch(`${baseUrl}/users/${user.id}/profile`, {
  method: 'PUT',
  headers: { authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ location: 'Pune' }),
});
assert.equal(updated.status, 200);
assert.equal((await updated.json()).location, 'Pune');

const invalid = await fetch(`${baseUrl}/users/${user.id}/profile`, {
  method: 'PUT',
  headers: { authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ location: '' }),
});
assert.equal(invalid.status, 400);
$$),
  ('Automation Testing', 'Uses repeatable code to check software behavior consistently and quickly, especially for important flows that must keep working after changes.', 'Automation turns a defined check into executable steps with assertions. Select the right level: unit tests for isolated rules, API/integration tests for service boundaries, and browser end-to-end tests for critical user journeys. Reliable suites use deterministic test data, stable accessible selectors, explicit expectations, cleanup, and useful failure output. Avoid automating unstable flows before requirements settle; automation complements exploratory and usability testing rather than replacing them.', ARRAY['Choosing unit, API, integration, or browser test level', 'Fixtures, test accounts, and deterministic data', 'Actions, assertions, and meaningful failure messages', 'Stable selectors, waits, retries, and flakiness control', 'Parallel execution, cleanup, and CI reporting', 'Coverage of risk rather than maximizing test count'], 'Real-world flow: seed an isolated candidate account, open the application, sign in, update a profile field, reload to prove persistence, and assert the saved value. Run the same test in CI against a disposable environment and remove its data even when an assertion fails.', $$import { test, expect } from '@playwright/test';

test('candidate profile changes persist after reload', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('qa-candidate@example.test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Location').fill('Pune');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Profile saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Location')).toHaveValue('Pune');
});
$$),
  ('Black-box Testing', 'Evaluates a feature only through its documented inputs and externally visible outputs, without depending on its internal code or architecture.', 'Start from a requirement or user contract and treat the system as a black box. Identify input classes, expected outputs, state changes, and failure messages. Use equivalence classes to avoid redundant values, boundary checks for limits, decision tables for combinations, and state-transition tests for workflows. Observe both the user-visible response and permitted external effects, such as a saved record or emitted notification. This approach works even when source code is unavailable and helps independent testers find requirement gaps.', ARRAY['Requirements and observable acceptance criteria', 'Input partitions and expected output classes', 'Boundary, decision-table, and state-transition techniques', 'Error messages and recovery behavior', 'External side effects and persisted state', 'Reproducible evidence independent of implementation'], 'Real-world flow: for password reset, begin with a registered email, request a reset, use the delivered link once, set a valid password, then sign in with the new password. Also try an unknown email, expired link, reused link, and invalid password; compare each observable result to the acceptance criteria.', $$import assert from 'node:assert/strict';

const response = await fetch('http://localhost:5000/auth/password-reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'known-user@example.test' }),
});
assert.equal(response.status, 202);
assert.deepEqual(await response.json(), { message: 'If the account exists, reset instructions were sent.' });
$$),
  ('Boundary Value Analysis', 'Finds defects at the edges of accepted ranges by testing the minimum, maximum, and values immediately around each limit.', 'Many bugs occur at transitions: an inclusive limit implemented as exclusive, an off-by-one error, a missing empty check, or a value parsed in the wrong unit. For an allowed range [min, max], test min-1, min, min+1, max-1, max, and max+1, plus null/empty and wrong types when relevant. Combine boundary tests with equivalence classes and state the expected result for every point. Boundaries also apply to string lengths, file sizes, dates, pagination, and rate limits—not only numeric fields.', ARRAY['Inclusive and exclusive limits', 'One-below, at, and one-above values', 'Empty, null, malformed, and wrong-type inputs', 'String length, date, file-size, and pagination limits', 'Expected result and validation message for each value', 'Unit conversion and off-by-one risks'], 'Real-world flow: a job portal accepts page sizes from 1 through 50. Test 0, 1, 2, 49, 50, and 51; confirm valid values return the requested count and invalid values return a clear client error without an expensive unbounded query.', $$import assert from 'node:assert/strict';

const acceptedPageSizes = [1, 2, 49, 50];
const rejectedPageSizes = [0, 51];
for (const limit of acceptedPageSizes) {
  const response = await fetch(`http://localhost:5000/jobs?limit=${limit}`);
  assert.equal(response.status, 200);
  assert.ok((await response.json()).length <= limit);
}
for (const limit of rejectedPageSizes) {
  const response = await fetch(`http://localhost:5000/jobs?limit=${limit}`);
  assert.equal(response.status, 400);
}
$$),
  ('Exploratory Testing', 'Uses purposeful investigation to learn a product while testing it, adapting the next test based on evidence instead of following only a fixed script.', 'Exploratory testing combines a charter, a time box, test design, execution, and note taking. Start with a risk-focused question, learn how the feature behaves, vary data and sequence, probe interruptions and recovery, and record exact observations. Use heuristics such as CRUD, permissions, state transitions, slow networks, repeated actions, and back/refresh navigation. Capture enough environment, account, steps, and evidence for another person to reproduce findings. Convert important discoveries into regression tests after triage.', ARRAY['Charters, scope, and time boxes', 'Product learning and hypothesis-driven probing', 'Risk heuristics: data, permissions, timing, and state', 'Evidence, reproducibility, and defect reports', 'Session notes and coverage tracking', 'Turning discoveries into automated regression checks'], 'Real-world flow: explore checkout for 30 minutes with a charter focused on duplicate charges and recovery. Try double-clicking Pay, refreshing during processing, losing network access, returning from the payment provider, and retrying. Record transaction IDs, timestamps, expected/actual outcomes, and report each reproducible risk.', $$const charter = {
  goal: 'Find duplicate-charge and recovery defects in checkout',
  timeboxMinutes: 30,
  probes: [
    'double-click Pay',
    'refresh while payment is processing',
    'disconnect and restore the network',
    'use browser Back from the payment provider',
    'retry after a displayed failure',
  ],
};

for (const probe of charter.probes) {
  console.log(`Run probe: ${probe}`);
  // Record account, exact steps, transaction ID, expected result, and evidence.
}
$$),
  ('Integration Testing', 'Verifies that collaborating parts of a system exchange data and behave correctly together across a real boundary.', 'Unit tests can prove a function in isolation but cannot prove that serialization, database constraints, transactions, authentication middleware, queues, or service configuration agree. Integration tests run real collaborating components—often with a temporary database or container—and assert both the response and resulting state. Keep fixtures isolated, use migrations identical to production, test rollback and failure paths, and clean up. Mock only external systems that cannot safely run in the test environment.', ARRAY['Component boundaries and contracts', 'Real database schema, queries, and transactions', 'Serialization, validation, and middleware', 'Queues, event delivery, and external adapters', 'Isolation, fixture cleanup, and test containers', 'Failure handling and rollback behavior'], 'Real-world flow: issue an authenticated POST to create an application, let the actual API service write to a temporary database, then query the database to verify user/job foreign keys and initial status. Force a constraint failure and check the transaction leaves no partial application row.', $$import assert from 'node:assert/strict';
import { createTestDatabase, startApi } from './test-support.js';

const database = await createTestDatabase();
const api = await startApi({ databaseUrl: database.url });
try {
  const response = await fetch(`${api.url}/applications`, {
    method: 'POST',
    headers: { authorization: `Bearer ${api.candidateToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ jobId: api.seededJobId }),
  });
  assert.equal(response.status, 201);
  const saved = await database.one('select status from applications where id = $1', [(await response.json()).id]);
  assert.equal(saved.status, 'submitted');
} finally {
  await api.stop();
  await database.destroy();
}
$$),
  ('Load Testing', 'Measures service behavior under a specified amount and pattern of concurrent work so capacity and bottlenecks can be understood before production traffic arrives.', 'A load test models realistic user journeys and arrival rates, not just a large number of requests. Define baseline, expected peak, ramp-up, duration, data mix, and success thresholds. Monitor latency percentiles (especially p95/p99), throughput, error rate, CPU, memory, database pools, and queue depth. Separate steady-state load, spike, stress, and soak tests. Use a controlled environment and synthetic accounts; a test that overloads production or ignores downstream limits is unsafe and misleading.', ARRAY['Workload model, concurrency, and arrival rate', 'Ramp-up, steady-state, spike, stress, and soak', 'Latency percentiles, throughput, and errors', 'Application, database, and queue resource metrics', 'Safe test environment and representative test data', 'Bottleneck diagnosis and capacity decisions'], 'Real-world flow: model a weekday morning when 100 users per second search jobs for 10 minutes, with a gradual ramp-up. Compare p95 latency and error-rate thresholds to baseline, correlate slow responses with database pool saturation, fix the bottleneck, and repeat the identical workload to prove improvement.', $$import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [{ duration: '2m', target: 100 }, { duration: '10m', target: 100 }, { duration: '2m', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL}/jobs?limit=20`);
  check(response, { 'search succeeded': (res) => res.status === 200 });
  sleep(1);
}
$$),
  ('Manual Testing', 'A person executes a planned or exploratory workflow and judges the actual product behavior, usability, and presentation directly.', 'Manual testing is especially useful for new or changing requirements, visual quality, accessibility, exploratory behavior, and cases where human judgment matters. It still needs a clear objective, build/environment, preconditions, test account/data, steps, expected result, actual result, and evidence. Check more than the happy path: errors, keyboard interaction, loading, empty states, persistence, and recovery. Record defects precisely and retest fixes, while automating stable repetitive checks where appropriate.', ARRAY['Test objective, build, environment, and preconditions', 'Steps, test data, expected and actual results', 'Usability, accessibility, visual, and content review', 'Negative paths, loading, empty, and recovery states', 'Evidence capture and reproducible defect reports', 'Retesting fixes and identifying automation candidates'], 'Real-world flow: sign in as a candidate, edit location, save, refresh, and confirm it persists. Repeat using keyboard-only navigation, an empty location, a simulated network failure, and a narrow viewport. Capture the exact steps and screenshot for any mismatch, then retest after the fix.', $$const manualCheck = {
  precondition: 'Signed in as a candidate with an existing profile',
  steps: [
    'Open Profile and change Current location to Pune',
    'Save and wait for the success confirmation',
    'Refresh the page and reopen Profile',
  ],
  expected: 'Current location remains Pune after reload',
  evidence: 'Record build, browser, account ID, steps, and screenshot if it fails',
};
console.log(manualCheck);
$$),
  ('Performance Testing', 'Evaluates responsiveness, throughput, resource use, and stability across workload levels and over time.', 'Performance testing is an umbrella covering load, stress, spike, endurance/soak, and scalability tests. Agree on measurable service-level objectives before running: response-time percentiles, throughput, error budget, and resource ceilings. Warm caches consistently, use realistic payloads, isolate the environment, and monitor the full dependency path. Analyze distributions rather than averages; use traces and metrics to find whether compute, database, network, locks, or downstream services dominate. Repeat after changes with the same workload.', ARRAY['Latency percentiles and service-level objectives', 'Throughput, concurrency, and queueing', 'Load, stress, spike, and endurance tests', 'CPU, memory, database, network, and dependency metrics', 'Warm-up, caching, realistic payloads, and environment control', 'Profiling, bottleneck removal, and repeatable comparison'], 'Real-world flow: measure job search at expected and peak traffic, record p50/p95/p99, error rate, and database utilization, identify an unindexed filter through traces, add and validate the index, then rerun the same test to compare latency and resource cost.', $$import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 40,
  duration: '5m',
  thresholds: { http_req_duration: ['p(95)<400', 'p(99)<800'], http_req_failed: ['rate<0.005'] },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL}/jobs?city=Pune&limit=20`);
  check(response, { 'returns jobs': (res) => res.status === 200 });
}
$$),
  ('Regression Testing', 'Rechecks previously working behavior after a code, configuration, data, or dependency change to detect unintended breakage.', 'A regression suite protects valuable behavior, not every historical detail. Select tests by user/business criticality, code-change impact, defect history, and integration risk. Cover critical end-to-end journeys at a small smoke level, then add focused unit/API checks for changed logic. Keep cases deterministic and maintainable; remove obsolete checks and quarantine flaky tests with ownership rather than silently ignoring them. Run the fastest relevant tests early and broader suites before release.', ARRAY['Change-impact and risk-based test selection', 'Critical user journeys and business invariants', 'Unit/API checks close to changed logic', 'Deterministic fixtures and stable assertions', 'Test ordering, CI feedback, and release gates', 'Flaky-test ownership, maintenance, and removal'], 'Real-world flow: after changing application submission, run focused validation and persistence tests, then the critical candidate journey (search, apply, verify Applied status), followed by recruiter receipt checks. Block release if a high-risk contract regresses and capture the failing commit and test evidence.', $$const regressionChecks = [
  { name: 'required profile validation', run: testRequiredProfileFields },
  { name: 'application persistence', run: testApplicationSavedOnce },
  { name: 'candidate sees applied status', run: testAppliedJobsView },
  { name: 'recruiter receives application', run: testRecruiterInbox },
];

for (const check of regressionChecks) {
  await check.run();
  console.log(`Passed: ${check.name}`);
}
$$),
  ('Smoke Testing', 'Runs a small, fast set of checks after a build or deployment to establish whether the system is healthy enough for deeper testing.', 'Smoke tests verify essential availability and one or two critical paths: application starts, health endpoint responds, sign-in works in a test environment, core data loads, and a basic action succeeds. They should be stable, quick, and diagnostic. A failure blocks further validation because deeper results would be unreliable. Keep smoke coverage separate from exhaustive regression or load tests, and never run destructive checks against production accounts.', ARRAY['Build and deployment health', 'Critical service availability and dependencies', 'One essential authenticated user journey', 'Core data access and a reversible action', 'Fast, stable checks with actionable failure output', 'Release blocking and safe environment selection'], 'Real-world flow: deploy to staging, verify the health endpoint and database connectivity, sign in with a disposable user, load the dashboard, and open a job listing. If any check fails, stop release promotion and attach logs so the problem is fixed before full regression.', $$import assert from 'node:assert/strict';

const health = await fetch(`${process.env.BASE_URL}/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).status, 'ok');

const jobs = await fetch(`${process.env.BASE_URL}/jobs?limit=1`);
assert.equal(jobs.status, 200);
assert.ok(Array.isArray(await jobs.json()));
$$),
  ('Test Case Design', 'Transforms requirements, risks, and user workflows into concise tests with explicit preconditions, inputs, actions, and observable expected results.', 'A strong test case is traceable to a requirement and makes pass/fail unambiguous. Identify the actor, starting state, meaningful input, action, expected UI/API result, persisted side effect, and cleanup. Reduce redundant cases with equivalence partitioning; focus edges with boundary analysis; cover combinations with decision tables; and test workflow changes with state transitions. Prioritize by probability and impact, then include negative, permission, and recovery paths. Keep expected results specific enough that another person can execute the case.', ARRAY['Requirement traceability and risk priority', 'Preconditions, actors, test data, and environment', 'Actions and observable expected results', 'Equivalence classes and boundary analysis', 'Decision tables, state transitions, and negative paths', 'Cleanup, reproducibility, and coverage review'], 'Real-world flow: translate “a candidate can apply once to an open job” into cases for eligible candidate, missing resume, closed job, duplicate submission, and recruiter account. State initial job/application records, submit actions, expected status/message, and database invariants for each case.', $$const testCase = {
  id: 'APP-004',
  objective: 'Prevent duplicate applications to the same open job',
  precondition: 'Candidate is signed in; job is open; no application exists',
  steps: ['Submit application', 'Submit the same application again'],
  expected: [
    'First request creates one application and returns 201',
    'Second request returns the documented duplicate response',
    'Exactly one application record exists for candidate and job',
  ],
  priority: 'High',
};
console.log(testCase);
$$),
  ('Test-Driven Development', 'A development practice that uses a failing test, the smallest passing implementation, and a cleanup/refactoring step to build behavior incrementally.', 'The red-green-refactor loop starts with a test that expresses an observable requirement and fails for the right reason. Write only enough production code to pass, then improve names and structure while keeping the test green. Tests should assert behavior, not private implementation. Add cases for normal, boundary, and failure conditions as the contract becomes clear. TDD works best with fast feedback and testable design; it is not a substitute for integration, security, or user acceptance testing.', ARRAY['Red: write a focused failing behavior test', 'Green: implement the minimum correct behavior', 'Refactor: simplify while preserving the passing test', 'Test doubles and choosing useful boundaries', 'Normal, boundary, and failure examples', 'Fast feedback and complementary integration tests'], 'Real-world flow: implement a salary formatter. First specify INR conversion and rounding with a failing unit test; implement the formatter; add tests for zero and invalid values; refactor; then run the broader profile UI tests to confirm formatted salary is displayed correctly.', $$import assert from 'node:assert/strict';

function formatSalaryInLakhs(rupees) {
  if (!Number.isFinite(rupees) || rupees < 0) throw new RangeError('Salary must be a non-negative number');
  return `${(rupees / 100000).toFixed(1)} LPA`;
}

assert.equal(formatSalaryInLakhs(1800000), '18.0 LPA');
assert.equal(formatSalaryInLakhs(0), '0.0 LPA');
assert.throws(() => formatSalaryInLakhs(-1), RangeError);
$$),
  ('Unit Testing', 'Checks one small function, class, or component in isolation so its contract can be verified quickly and failures are easy to diagnose.', 'A unit test controls inputs and dependencies, invokes one unit, and asserts observable output or state change. Keep tests fast and deterministic; use test doubles only at external boundaries such as time, network, or storage. Cover representative valid values, edge cases, and errors. Avoid coupling to private methods or duplicating implementation logic in assertions. A failing unit test should point to one behavior. Unit tests complement integration tests, which prove real components work together.', ARRAY['Unit boundary and behavior contract', 'Arrange, act, and assert structure', 'Representative inputs, edges, and exceptions', 'Mocks, stubs, and fakes at dependency boundaries', 'Determinism, isolation, and readable failure messages', 'Unit versus integration test responsibilities'], 'Real-world flow: test a profile-completion calculator with empty, partial, and complete profiles. Control no external dependencies, verify exact percentages, run the unit suite during every edit, then confirm profile completion is rendered correctly in a component test.', $$import assert from 'node:assert/strict';

function profileCompletion(profile) {
  const fields = ['name', 'headline', 'location', 'skills'];
  const complete = fields.filter((key) => {
    const value = profile[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
  }).length;
  return Math.round((complete / fields.length) * 100);
}

assert.equal(profileCompletion({}), 0);
assert.equal(profileCompletion({ name: 'Asha', skills: ['SQL'] }), 50);
assert.equal(profileCompletion({ name: 'Asha', headline: 'QA', location: 'Pune', skills: ['SQL'] }), 100);
$$),
  ('User Acceptance Testing', 'Confirms with representative users or business owners that a complete feature solves the intended problem and meets agreed acceptance criteria.', 'UAT validates business fitness, not just technical correctness. Define acceptance criteria before implementation, use realistic roles and data in a production-like environment, and execute end-to-end journeys. Record whether each criterion passes, the evidence, blockers, and decisions. Include usability, permissions, business rules, notifications, and downstream effects. Defects should be triaged by business impact; approval must come from an authorized stakeholder. UAT does not replace security, performance, or developer testing.', ARRAY['Business goals and measurable acceptance criteria', 'Representative roles, realistic data, and environment', 'Complete end-to-end user journeys', 'Business rules, permissions, and downstream effects', 'Evidence, defect triage, and approval ownership', 'Relationship to QA, security, and performance sign-off'], 'Real-world flow: a hiring manager and candidate validate a job application release. The candidate searches, reviews requirements, submits an application, and sees confirmation; the recruiter sees the correct candidate and resume. Stakeholders record evidence against each criterion and approve or block release.', $$const acceptanceCriteria = [
  { role: 'candidate', action: 'apply to an open matching job', expected: 'confirmation appears and application is saved once' },
  { role: 'recruiter', action: 'open the new application', expected: 'candidate details and attached resume are visible' },
  { role: 'candidate', action: 'open Applied Jobs', expected: 'the job is listed with submitted status' },
];

for (const criterion of acceptanceCriteria) {
  console.log(`UAT: ${criterion.role} must ${criterion.action}`);
  console.log(`Accept when: ${criterion.expected}`);
}
$$)
on conflict (name) do update set
  brief_description = excluded.brief_description,
  explanation = excluded.explanation,
  subtopics = excluded.subtopics,
  real_world_flow = excluded.real_world_flow,
  example = excluded.example,
  is_active = true,
  updated_at = now();

insert into public.courses (title, topic, provider, level, duration, url)
values
  ('API Testing with Postman', 'API Testing', 'Postman Academy', 'Beginner', 'Self-paced', 'https://academy.postman.com/'),
  ('Automated Software Testing', 'Automation Testing', 'Coursera', 'Beginner', '4 weeks', 'https://www.coursera.org/search?query=automated%20software%20testing'),
  ('Agile with Scrum', 'Agile and Scrum', 'Scrum.org', 'Beginner', 'Self-paced', 'https://www.scrum.org/resources/what-is-scrum'),
  ('Black-box Testing Techniques', 'Black-box Testing', 'Udemy', 'Intermediate', '6 hours', 'https://www.udemy.com/courses/search/?q=black%20box%20testing'),
  ('Boundary Value Analysis and Equivalence Partitioning', 'Boundary Value Analysis', 'Guru99', 'Beginner', '2 hours', 'https://www.guru99.com/equivalence-partitioning-boundary-value-analysis.html'),
  ('Cypress End-to-End Testing', 'Cypress', 'Cypress Learn', 'Intermediate', 'Self-paced', 'https://learn.cypress.io/'),
  ('Docker for Developers', 'Docker', 'Docker', 'Beginner', 'Self-paced', 'https://www.docker.com/101-tutorial/'),
  ('Exploratory Testing Essentials', 'Exploratory Testing', 'Ministry of Testing', 'Intermediate', 'Self-paced', 'https://www.ministryoftesting.com/dojo'),
  ('Git and GitHub Fundamentals', 'Git and GitHub', 'GitHub Skills', 'Beginner', 'Self-paced', 'https://skills.github.com/'),
  ('Integration Testing with JavaScript', 'Integration Testing', 'Pluralsight', 'Intermediate', '3 hours', 'https://www.pluralsight.com/search?q=integration%20testing%20javascript'),
  ('Java Programming for Testers', 'Java', 'Codecademy', 'Beginner', '25 hours', 'https://www.codecademy.com/learn/learn-java'),
  ('JMeter Load Testing', 'Load Testing', 'Udemy', 'Intermediate', '8 hours', 'https://www.udemy.com/courses/search/?q=jmeter%20load%20testing'),
  ('Manual Testing and Test Case Design', 'Manual Testing', 'Test Automation University', 'Beginner', 'Self-paced', 'https://testautomationu.applitools.com/'),
  ('Performance Testing Fundamentals', 'Performance Testing', 'Coursera', 'Intermediate', '6 weeks', 'https://www.coursera.org/search?query=performance%20testing'),
  ('Playwright Web Testing', 'Playwright', 'Microsoft Learn', 'Intermediate', 'Self-paced', 'https://learn.microsoft.com/en-us/training/modules/build-with-playwright/'),
  ('Postman API Fundamentals Student Expert', 'Postman', 'Postman Academy', 'Beginner', 'Self-paced', 'https://academy.postman.com/path/postman-api-fundamentals-student-expert'),
  ('Python for Everybody', 'Python', 'Coursera', 'Beginner', '8 months', 'https://www.coursera.org/specializations/python'),
  ('Regression Testing Strategy', 'Regression Testing', 'Ministry of Testing', 'Intermediate', 'Self-paced', 'https://www.ministryoftesting.com/dojo'),
  ('Selenium WebDriver with Java', 'Selenium', 'Selenium Documentation', 'Intermediate', 'Self-paced', 'https://www.selenium.dev/documentation/webdriver/'),
  ('Smoke Testing and Release Readiness', 'Smoke Testing', 'Test Automation University', 'Beginner', 'Self-paced', 'https://testautomationu.applitools.com/'),
  ('SQL for Data and QA Engineers', 'SQL', 'Khan Academy', 'Beginner', 'Self-paced', 'https://www.khanacademy.org/computing/computer-programming/sql'),
  ('Test-Driven Development in JavaScript', 'Test-Driven Development', 'Pluralsight', 'Intermediate', '3 hours', 'https://www.pluralsight.com/search?q=test%20driven%20development%20javascript'),
  ('Unit Testing with Jest', 'Unit Testing', 'Jest Documentation', 'Beginner', 'Self-paced', 'https://jestjs.io/docs/getting-started'),
  ('User Acceptance Testing', 'User Acceptance Testing', 'Coursera', 'Intermediate', '4 weeks', 'https://www.coursera.org/search?query=user%20acceptance%20testing'),
  ('TypeScript for JavaScript Developers', 'TypeScript', 'Microsoft Learn', 'Intermediate', 'Self-paced', 'https://www.typescriptlang.org/docs/handbook/intro.html')
on conflict (title) do update set
  topic = excluded.topic,
  provider = excluded.provider,
  level = excluded.level,
  duration = excluded.duration,
  url = excluded.url,
  is_active = true,
  updated_at = now();
