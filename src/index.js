/**
 * Lead Gen SaaS — Main Entry Point
 *
 * Starts the orchestrator (cron poller) and the BullMQ worker.
 * The poller fetches leads with status='new' every 5 minutes
 * and pushes them into the queue. The worker processes them
 * (call / email) with rate limiting and retry logic.
 *
 * Usage:
 *   node src/index.js                      # start poller + worker
 *   node src/crawler/index.js <type> <city> # crawl only (separate process)
 */

import config from './config/index.js';
import { startPolling, stopPolling } from './orchestrator/index.js';

console.log('Lead Gen SaaS starting…');
console.log(`  Test mode : ${config.testing.testMode ? 'ON' : 'OFF'}`);
console.log(`  Poll cron : ${config.queue.pollIntervalMin}`);
console.log('');

// Start the cron-based Supabase poller
startPolling();

// ── Graceful shutdown ─────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[main] ${signal} received — shutting down…`);
  stopPolling();
  console.log('[main] goodbye');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

