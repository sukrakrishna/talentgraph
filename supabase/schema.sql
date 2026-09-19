-- TalentGraph schema — REFERENCE ONLY.
--
-- These tables already exist in the target Supabase project (created manually).
-- Do NOT run this file against that project. It documents the live shape of the
-- database so the app code and scripts/seed.ts stay honest about column names.
-- RLS is off for all tables for the duration of the hackathon.

create table if not exists skills (
  id       text primary key,
  name     text not null,
  category text not null
);

create table if not exists employees (
  id         text primary key,
  name       text not null,
  job_title  text not null,
  department text not null,
  bio        text not null default ''
);

create table if not exists employee_skills (
  employee_id text not null references employees (id) on delete cascade,
  skill_id    text not null references skills (id) on delete cascade,
  source      text not null check (source in ('explicit', 'inferred', 'verified')),
  evidence    text,
  proficiency int not null check (proficiency between 1 and 3),
  linked_to   text[] not null default '{}',
  primary key (employee_id, skill_id)
);

create table if not exists roles (
  id          text primary key,
  title       text not null,
  team        text not null,
  description text not null default ''
);

create table if not exists role_skills (
  role_id    text not null references roles (id) on delete cascade,
  skill_id   text not null references skills (id) on delete cascade,
  importance text not null check (importance in ('required', 'preferred')),
  primary key (role_id, skill_id)
);

create table if not exists courses (
  id       text primary key,
  title    text not null,
  hours    int not null,
  skill_id text not null references skills (id) on delete cascade
);

create table if not exists llm_cache (
  hash       text primary key,
  json       jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  employee_id text not null references employees (id) on delete cascade,
  action      text not null check (action in ('confirmed', 'not_accurate')),
  skill_id    text not null references skills (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table skills disable row level security;
alter table employees disable row level security;
alter table employee_skills disable row level security;
alter table roles disable row level security;
alter table role_skills disable row level security;
alter table courses disable row level security;
alter table llm_cache disable row level security;
alter table audit_logs disable row level security;
