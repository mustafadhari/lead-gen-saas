-- ================================================================
-- Migration: Add crawl_job_id to leads table
-- Run this to link leads to their source crawl jobs.
-- ================================================================

-- Add crawl_job_id column (safe: does nothing if column exists)
alter table leads
  add column if not exists crawl_job_id uuid references crawl_jobs(id) on delete set null;

-- Add index for faster lookups
create index if not exists idx_leads_crawl_job_id on leads (crawl_job_id);
