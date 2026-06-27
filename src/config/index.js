import 'dotenv/config';

const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  vapi: {
    apiKey: process.env.VAPI_API_KEY,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    assistantId: process.env.VAPI_ASSISTANT_ID || null,
    dailyLimit: parseInt(process.env.VAPI_DAILY_CALL_LIMIT || '10', 10),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'alex@yourdomain.com',
    fromName: process.env.RESEND_FROM_NAME || 'Alex',
  },
  upstash: {
    redisUrl: process.env.UPSTASH_REDIS_URL,
    redisToken: process.env.UPSTASH_REDIS_TOKEN || null,
  },
  queue: {
    maxPerHour: parseInt(process.env.QUEUE_MAX_PER_HOUR || '10', 10),
    jobRetries: parseInt(process.env.QUEUE_JOB_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.QUEUE_RETRY_DELAY_MS || '60000', 10),
    pollIntervalMin: process.env.POLL_INTERVAL_CRON || '*/5 * * * *',
  },
  crawler: {
    delayMs: parseInt(process.env.CRAWL_DELAY_MS || '2000', 10),
    maxRetries: parseInt(process.env.CRAWL_MAX_RETRIES || '3', 10),
  },
  testing: {
    testMode: process.env.TEST_MODE === 'true',
    phoneNumber: process.env.TEST_PHONE_NUMBER,
    email: process.env.TEST_EMAIL,
  },
  krayin: {
    baseUrl: process.env.KRAYIN_BASE_URL || null,
    apiToken: process.env.KRAYIN_API_TOKEN || null,
    pipelineId: parseInt(process.env.KRAYIN_PIPELINE_ID || '1', 10),
    stageId: parseInt(process.env.KRAYIN_STAGE_ID || '1', 10),
    sourceId: parseInt(process.env.KRAYIN_SOURCE_ID || '1', 10),
  },
};

export default config;
