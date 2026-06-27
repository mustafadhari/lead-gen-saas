-- ================================================================
-- Migration: Add website_filter to crawl_jobs + fix status constraint
-- Run this against an existing database where the tables already exist.
-- ================================================================

-- 1. Add website_filter column (safe: does nothing if column exists)
alter table crawl_jobs
  add column if not exists website_filter text not null default 'no_website';

-- 2. Drop the old status check and replace with one that includes 'cancelled'
alter table crawl_jobs
  drop constraint if exists crawl_jobs_status_check;

alter table crawl_jobs
  add constraint crawl_jobs_status_check
  check (status in ('pending','running','completed','failed','cancelled'));

-- 3. Add check constraint for website_filter values
alter table crawl_jobs
  drop constraint if exists crawl_jobs_website_filter_check;

alter table crawl_jobs
  add constraint crawl_jobs_website_filter_check
  check (website_filter in ('no_website','has_website','any'));
