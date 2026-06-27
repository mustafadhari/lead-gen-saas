-- Krayin CRM Integration Migration
-- Adds a cross-reference column to the leads table so each Supabase lead
-- row can be linked back to the corresponding Krayin CRM lead entry.
--
-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor).

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS krayin_lead_id TEXT DEFAULT NULL;

-- Optional: index for fast lookup by Krayin lead ID
CREATE INDEX IF NOT EXISTS idx_leads_krayin_lead_id
  ON leads (krayin_lead_id);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name = 'krayin_lead_id';
