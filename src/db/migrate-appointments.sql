-- ================================================================
-- Migration: Add appointments table
-- Run this against an existing database where the tables already exist.
-- ================================================================

-- Create appointments table
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

-- Indexes
create index if not exists idx_appointments_lead_id on appointments (lead_id);
create index if not exists idx_appointments_scheduled_at on appointments (scheduled_at);
create index if not exists idx_appointments_status on appointments (status);

-- Trigger for updated_at
drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at
  before update on appointments
  for each row
  execute function update_updated_at_column();
