-- Run this script in Supabase SQL Editor before starting the API.
-- The API uses the service role key, while RLS blocks direct client access.

create extension if not exists pgcrypto;

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

alter table public.users enable row level security;
alter table public.otp_codes enable row level security;
alter table public.jobs enable row level security;

insert into public.jobs (id, title, company, location, type, salary, featured)
values
  (1, 'Frontend Developer', 'NovaLabs', 'Remote', 'Full-time', '$120k - $150k', false),
  (2, 'Backend Engineer', 'Streamline AI', 'Bengaluru', 'Full-time', '$130k - $160k', false),
  (3, 'UI/UX Designer', 'Motive Studio', 'Hyderabad', 'Contract', '$80k - $110k', false),
  (101, 'Senior React Engineer', 'PixelForge', 'Remote', 'Hybrid', null, true),
  (102, 'Product Designer', 'BluePeak', 'Pune', 'Full-time', null, true)
on conflict (id) do update set
  title = excluded.title,
  company = excluded.company,
  location = excluded.location,
  type = excluded.type,
  salary = excluded.salary,
  featured = excluded.featured;
