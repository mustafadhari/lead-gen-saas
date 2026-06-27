/**
 * Orchestrator — node-cron poller
 *
 * Polls Supabase every 5 minutes (configurable via POLL_INTERVAL_CRON)
 * for leads with status = 'new'. Each lead is pushed into the BullMQ
 * outreach queue where the worker handles call/email/uncontactable logic.
 *
 * Also exposes runPipeline() for the crawler → enqueue flow.
 */

import cron from 'node-cron';
import { crawlLeads } from '../crawler/index.js';
import supabase from '../db/client.js';
import config from '../config/index.js';


let cronJob = null;

// ── Cron poller ─────────────────────────────────────────

/**
 * Start the cron-based polling loop.
 * Fetches leads with status = 'new' and enqueues them.
 */
export function startPolling() {
  const schedule = config.queue.pollIntervalMin;

  if (cronJob) {
    console.log('[orchestrator] polling already running');
    return;
  }

  console.log(`[orchestrator] scheduling poll: "${schedule}"`);

  // Run once immediately on startup, then on schedule
  pollCrawlJobs();

  cronJob = cron.schedule(schedule, () => {
    pollCrawlJobs();
  });

  console.log('[orchestrator] polling started');
}

/**
 * Stop the cron poller.
 */
export function stopPolling() {
  if (!cronJob) return;
  cronJob.stop();
  cronJob = null;
  console.log('[orchestrator] polling stopped');
}

/**
 * Single poll cycle — fetch pending crawl jobs and run them.
 */
async function pollCrawlJobs() {
  console.log('[orchestrator] polling for pending crawl jobs…');

  try {
    const { data: jobs, error } = await supabase
      .from('crawl_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[orchestrator] query crawl_jobs failed:', error.message);
      return;
    }

    if (!jobs || jobs.length === 0) {
      return;
    }

    const job = jobs[0];
    console.log(`[orchestrator] found pending crawl job: "${job.business_type}" in "${job.city}"`);

    // Mark as running
    await supabase
      .from('crawl_jobs')
      .update({ status: 'running' })
      .eq('id', job.id);

    try {
      // Run the crawler
      const leads = await crawlLeads(job.business_type, job.city, job.id, job.website_filter || 'any');

      // Check one more time to avoid overwriting a 'cancelled' status
      const { data: finalCheck } = await supabase
        .from('crawl_jobs')
        .select('status')
        .eq('id', job.id)
        .single();

      if (finalCheck?.status !== 'cancelled') {
        // Mark as completed
        await supabase
          .from('crawl_jobs')
          .update({ status: 'completed', leads_found: leads.length })
          .eq('id', job.id);

        console.log(`[orchestrator] crawl job completed successfully`);
      } else {
        console.log(`[orchestrator] crawl job finished but was marked cancelled.`);
      }
    } catch (err) {
      console.error(`[orchestrator] crawl job failed:`, err.message);
      await supabase
        .from('crawl_jobs')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', job.id);
    }
  } catch (err) {
    console.error('[orchestrator] pollCrawlJobs error:', err.message);
  }
}

// ── Crawler pipeline ────────────────────────────────────

/**
 * Run the crawler for a set of targets, then let the poller
 * pick up the new leads on its next cycle.
 *
 * @param {{ businessType: string, city: string }[]} targets
 */
export async function runPipeline(targets = []) {
  console.log('[orchestrator] starting crawl pipeline…');

  for (const { businessType, city } of targets) {
    const leads = await crawlLeads(businessType, city);

    if (leads.length === 0) {
      console.log(`[orchestrator] no new leads for "${businessType}" in "${city}"`);
      continue;
    }

    console.log(`[orchestrator] crawled ${leads.length} leads for "${businessType}" in "${city}"`);
    // Leads are already inserted with status='new' by the crawler.
    // The poller will pick them up on the next cycle.
  }

  console.log('[orchestrator] crawl pipeline complete');
}
