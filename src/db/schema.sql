-- ================================================================
-- Lead Gen SaaS — Supabase Schema
-- ================================================================

-- Enable uuid generation if not already enabled
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────
-- Shared trigger function (must exist before triggers)
-- ────────────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ────────────────────────────────────────────────────
-- Leads table
-- ────────────────────────────────────────────────────
create table if not exists leads (
  id              uuid primary key default uuid_generate_v4(),
  business_name   text not null,
  phone_number    text,
  email           text,
  website         text,
  location        text,
  source_url      text,
  crawl_job_id    uuid references crawl_jobs(id) on delete set null,
  status          text not null default 'new'
                    check (status in ('new','queued','called','emailed','completed','uncontactable','failed')),
  contact_method  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_crawl_job_id on leads (crawl_job_id);

drop trigger if exists trg_leads_updated_at on leads;
create trigger trg_leads_updated_at
  before update on leads
  for each row
  execute function update_updated_at_column();

-- ────────────────────────────────────────────────────
-- Call logs table
-- ────────────────────────────────────────────────────
create table if not exists call_logs (
  id                uuid primary key default uuid_generate_v4(),
  lead_id           uuid not null references leads(id) on delete cascade,
  vapi_call_id      text,
  outcome           text,
  transcript        text,
  recording_url     text,
  duration_seconds  integer,
  created_at        timestamptz not null default now()
);

create index if not exists idx_call_logs_lead_id on call_logs (lead_id);

-- ────────────────────────────────────────────────────
-- Appointments table
-- ────────────────────────────────────────────────────
create table if not exists appointments (
  id              uuid primary key default uuid_generate_v4(),
  lead_id         uuid not null references leads(id) on delete cascade,
  call_log_id     uuid references call_logs(id) on delete set null,
  scheduled_at    timestamptz not null,
  customer_email  text,
  video_link      text,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','completed','cancelled','no_show')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_appointments_lead_id on appointments (lead_id);
create index if not exists idx_appointments_scheduled_at on appointments (scheduled_at);
create index if not exists idx_appointments_status on appointments (status);

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at
  before update on appointments
  for each row
  execute function update_updated_at_column();

-- ────────────────────────────────────────────────────
-- Crawl Jobs table
-- ────────────────────────────────────────────────────
create table if not exists crawl_jobs (
  id              uuid primary key default uuid_generate_v4(),
  business_type   text not null,
  city            text not null,
  status          text not null default 'pending'
                    check (status in ('pending','running','completed','failed','cancelled')),
  website_filter  text not null default 'no_website'
                    check (website_filter in ('no_website','has_website','any')),
  leads_found     integer default 0,
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_crawl_jobs_status on crawl_jobs (status);

drop trigger if exists trg_crawl_jobs_updated_at on crawl_jobs;
create trigger trg_crawl_jobs_updated_at
  before update on crawl_jobs
  for each row
  execute function update_updated_at_column();
