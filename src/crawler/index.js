/**
 * Google Maps Crawler — Playwright-based lead scraper
 *
 * Usage (CLI):
 *   node src/crawler/index.js <businessType> <city>
 *   node src/crawler/index.js "plumber" "Austin TX"
 *
 * Usage (programmatic):
 *   import { crawlLeads } from './crawler/index.js';
 *   const leads = await crawlLeads('plumber', 'Austin TX');
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import supabase from '../db/client.js';
import config from '../config/index.js';
import { pushLeadToKrayin } from '../integrations/krayin.js';

const MAX_RETRIES = config.crawler.maxRetries;
const DELAY_MS = config.crawler.delayMs;
const SCROLL_PAUSE_MS = 2000;

// ── Public API ──────────────────────────────────────────

/**
 * Crawl Google Maps for businesses of a given type in a given city.
 * Extracts name, phone, website, and address, deduplicates against
 * existing DB records, and inserts new leads with status = 'new'.
 *
 * @param {string} businessType - e.g. "plumber", "dentist"
 * @param {string} city         - e.g. "Austin TX", "London UK"
 * @returns {Promise<object[]>} Array of inserted lead rows
 */
export async function crawlLeads(businessType, city, jobId = null, websiteFilter = 'any') {
  if (!businessType || !city) {
    throw new Error('businessType and city are required');
  }

  console.log(`[crawler] searching Google Maps for "${businessType}" in "${city}" (filter: ${websiteFilter})…`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);

    // 1. Navigate to Google Maps search
    const query = encodeURIComponent(`${businessType} in ${city}`);
    const searchUrl = `https://www.google.com/maps/search/${query}/`;
    await navigateWithRetry(page, searchUrl);

    // 2. Dismiss cookie / consent dialogs
    await dismissConsent(page);

    // 3. Scroll the results feed and collect place URLs
    const placeUrls = await scrollAndCollectUrls(page);
    console.log(`[crawler] found ${placeUrls.length} listings`);

    if (placeUrls.length === 0) {
      console.log('[crawler] no results — check your query or try a different city');
      return [];
    }

    // 4. Load existing leads for deduplication
    const existing = await loadExistingLeads();

    // 5. Visit each place page and extract details
    const saved = [];

    for (let i = 0; i < placeUrls.length; i++) {
      // Check for job cancellation
      if (jobId) {
        const { data: jobCheck } = await supabase
          .from('crawl_jobs')
          .select('status')
          .eq('id', jobId)
          .single();

        if (jobCheck && jobCheck.status === 'cancelled') {
          console.log(`[crawler] job ${jobId} was cancelled. Aborting.`);
          break; // Stop scraping
        }
      }

      const url = placeUrls[i];
      console.log(`[crawler] (${i + 1}/${placeUrls.length}) scraping…`);

      const details = await extractWithRetry(page, url);
      if (!details) continue;

      // Website filter check
      if (websiteFilter === 'no_website' && details.website) {
        console.log(`[crawler]   skip (has website): ${details.business_name}`);
        continue;
      }
      if (websiteFilter === 'has_website' && !details.website) {
        console.log(`[crawler]   skip (no website): ${details.business_name}`);
        continue;
      }

      // Dedup check
      const nameLower = details.business_name.toLowerCase();
      if (existing.names.has(nameLower)) {
        console.log(`[crawler]   skip (duplicate name): ${details.business_name}`);
        continue;
      }
      if (details.phone_number && existing.phones.has(details.phone_number)) {
        console.log(`[crawler]   skip (duplicate phone): ${details.business_name}`);
        continue;
      }

      // Quick fetch of the website to look for an email address
      let email = null;
      if (details.website) {
        email = await extractEmailFromWebsite(details.website);
        if (email) console.log(`[crawler]   found email: ${email}`);
      }

      // Determine contact method
      let contactMethod = 'none';
      if (details.phone_number) contactMethod = 'call';
      else if (email) contactMethod = 'email';

      // Insert into Supabase
      const { data, error } = await supabase
        .from('leads')
        .insert({
          business_name: details.business_name,
          phone_number: details.phone_number || null,
          email: email,
          website: details.website || null,
          location: details.location || city,
          source_url: url,
          crawl_job_id: jobId || null,
          status: 'new',
          contact_method: contactMethod,
        })
        .select()
        .single();

      if (error) {
        console.error(`[crawler]   insert failed: ${error.message}`);
        continue;
      }

      saved.push(data);
      existing.names.add(nameLower);
      if (details.phone_number) existing.phones.add(details.phone_number);
      console.log(`[crawler]   saved: ${details.business_name}`);

      // ── Push to Krayin CRM (real-time, non-blocking) ──
      const krayinPayload = { ...data, category: businessType, city: city };
      pushLeadToKrayin(krayinPayload).then(({ krayinLeadId }) => {
        if (krayinLeadId) {
          // Store the Krayin lead ID back in Supabase for cross-reference
          supabase
            .from('leads')
            .update({ krayin_lead_id: krayinLeadId })
            .eq('id', data.id)
            .then(({ error }) => {
              if (error) console.error(`[krayin] failed to store krayin_lead_id: ${error.message}`);
            });
        }
      }).catch((err) => {
        console.error(`[krayin] push threw unexpectedly: ${err.message}`);
      });

      // Configurable delay between requests
      if (i < placeUrls.length - 1) {
        await delay(DELAY_MS);
      }
    }

    console.log(`\n[crawler] done — ${saved.length} new leads saved out of ${placeUrls.length} found`);
    return saved;
  } finally {
    await browser.close();
  }
}

// ── Navigation ──────────────────────────────────────────

async function navigateWithRetry(page, url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      return;
    } catch (err) {
      console.error(`[crawler] navigate attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await delay(3000 * attempt);
    }
  }
}

async function dismissConsent(page) {
  try {
    // Google cookie / consent banner
    const btn = page.locator(
      'form[action*="consent"] button, ' +
      'button[aria-label*="Accept all"], ' +
      'button[aria-label*="Reject all"]'
    );
    const first = btn.first();
    if (await first.isVisible({ timeout: 3000 })) {
      await first.click();
      await delay(1000);
    }
  } catch {
    // No consent dialog — continue
  }
}

// ── Scroll & collect URLs ───────────────────────────────

async function scrollAndCollectUrls(page) {
  const feed = page.locator('div[role="feed"]');

  try {
    await feed.waitFor({ timeout: 10_000 });
  } catch {
    // Might be a single-result page or no results
    console.log('[crawler] no results feed found');
    return collectSingleResult(page);
  }

  // Scroll until no more results load
  let previousCount = 0;
  let staleRounds = 0;

  while (staleRounds < 3) {
    await feed.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await delay(SCROLL_PAUSE_MS);

    // Check for "end of results" or "You've reached the end"
    const endMarker = await page
      .locator('div[role="feed"] span, div[role="feed"] p')
      .filter({ hasText: /end of results|you['']ve reached the end|no more results/i })
      .count();
    if (endMarker > 0) break;

    const currentCount = await page
      .locator('div[role="feed"] a[href*="/maps/place/"]')
      .count();

    if (currentCount === previousCount) {
      staleRounds++;
    } else {
      staleRounds = 0;
      previousCount = currentCount;
    }
  }

  // Collect unique place URLs
  const anchors = page.locator('div[role="feed"] a[href*="/maps/place/"]');
  const count = await anchors.count();
  const seen = new Set();
  const urls = [];

  for (let i = 0; i < count; i++) {
    const href = await anchors.nth(i).getAttribute('href');
    if (!href || seen.has(href)) continue;
    seen.add(href);
    urls.push(href.startsWith('http') ? href : `https://www.google.com${href}`);
  }

  return urls;
}

/**
 * If the search redirected straight to a single place page,
 * return that URL so we still extract it.
 */
async function collectSingleResult(page) {
  const currentUrl = page.url();
  if (currentUrl.includes('/maps/place/')) {
    return [currentUrl];
  }
  return [];
}

// ── Detail extraction ───────────────────────────────────

async function extractWithRetry(page, url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await extractPlaceDetails(page, url);
    } catch (err) {
      console.error(`[crawler]   attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error(`[crawler]   giving up on this listing`);
        return null;
      }
      await delay(2000 * attempt);
    }
  }
  return null;
}

async function extractPlaceDetails(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Wait for the heading to confirm the page loaded
  const h1 = page.locator('h1').first();
  await h1.waitFor({ timeout: 10_000 });

  // Brief pause for the info panel to fully render
  await delay(800);

  const businessName = await h1.textContent();
  if (!businessName?.trim()) {
    throw new Error('Could not extract business name');
  }

  const phone = await extractPhone(page);
  const website = await extractWebsite(page);
  const address = await extractAddress(page);

  return {
    business_name: businessName.trim(),
    phone_number: normalisePhone(phone),
    website,
    location: address,
  };
}

async function extractPhone(page) {
  // Strategy 1: button with copy-phone tooltip
  const byTooltip = page.locator('button[data-tooltip="Copy phone number"]').first();
  if (await safeVisible(byTooltip)) {
    return parseAriaLabel(await byTooltip.getAttribute('aria-label'));
  }

  // Strategy 2: button with aria-label starting with "Phone"
  const byAria = page.locator('button[aria-label^="Phone:"]').first();
  if (await safeVisible(byAria)) {
    return parseAriaLabel(await byAria.getAttribute('aria-label'));
  }

  // Strategy 3: tel: link
  const telLink = page.locator('a[href^="tel:"]').first();
  if (await safeVisible(telLink)) {
    const href = await telLink.getAttribute('href');
    return href?.replace('tel:', '') || null;
  }

  // Strategy 4: data-item-id containing "phone"
  const byDataId = page.locator('button[data-item-id^="phone"]').first();
  if (await safeVisible(byDataId)) {
    return parseAriaLabel(await byDataId.getAttribute('aria-label'));
  }

  return null;
}

async function extractWebsite(page) {
  // Strategy 1: link with open-website tooltip
  const byTooltip = page.locator('a[data-tooltip="Open website"]').first();
  if (await safeVisible(byTooltip)) {
    const href = await byTooltip.getAttribute('href');
    if (href && !href.includes('google.com/maps')) return href;
  }

  // Strategy 2: link with aria-label starting with "Website"
  const byAria = page.locator('a[aria-label^="Website:"]').first();
  if (await safeVisible(byAria)) {
    const href = await byAria.getAttribute('href');
    if (href && !href.includes('google.com/maps')) return href;
  }

  // Strategy 3: data-item-id="authority"
  const byDataId = page.locator('a[data-item-id="authority"]').first();
  if (await safeVisible(byDataId)) {
    const href = await byDataId.getAttribute('href');
    if (href && !href.includes('google.com/maps')) return href;
  }

  return null;
}

async function extractAddress(page) {
  // Strategy 1: button with copy-address tooltip
  const byTooltip = page.locator('button[data-tooltip="Copy address"]').first();
  if (await safeVisible(byTooltip)) {
    return parseAriaLabel(await byTooltip.getAttribute('aria-label'));
  }

  // Strategy 2: button with aria-label starting with "Address"
  const byAria = page.locator('button[aria-label^="Address:"]').first();
  if (await safeVisible(byAria)) {
    return parseAriaLabel(await byAria.getAttribute('aria-label'));
  }

  // Strategy 3: data-item-id="address"
  const byDataId = page.locator('button[data-item-id="address"]').first();
  if (await safeVisible(byDataId)) {
    return parseAriaLabel(await byDataId.getAttribute('aria-label'));
  }

  return null;
}

// ── Deduplication ───────────────────────────────────────

/**
 * Perform a quick HTTP GET to the website and look for an email address.
 * Extremely basic regex approach to keep scraping fast.
 */
async function extractEmailFromWebsite(url) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

    // We use a fake user agent because many sites block generic fetch
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const text = await response.text();
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    if (emailMatch) {
      // Basic sanity checks to avoid image filenames or common fake emails
      const email = emailMatch[0].toLowerCase();
      if (!email.endsWith('.png') && !email.endsWith('.jpg') && !email.includes('sentry.io')) {
        return email;
      }
    }
    return null;
  } catch (err) {
    // Ignore fetch errors (timeout, SSL, blocking, etc.)
    return null;
  }
}

async function loadExistingLeads() {
  const names = new Set();
  const phones = new Set();

  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('business_name, phone_number')
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('[crawler] failed to load existing leads:', error.message);
      break;
    }

    for (const row of data) {
      if (row.business_name) names.add(row.business_name.toLowerCase());
      if (row.phone_number) phones.add(row.phone_number);
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }

  console.log(`[crawler] loaded ${names.size} existing leads for dedup`);
  return { names, phones };
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Parse a value from an aria-label like "Phone: (512) 555-1234".
 */
function parseAriaLabel(label) {
  if (!label) return null;
  const colonIdx = label.indexOf(':');
  if (colonIdx === -1) return label.trim();
  return label.slice(colonIdx + 1).trim() || null;
}

/**
 * Normalise a raw phone string to E.164 format (+91XXXXXXXXXX for India).
 *
 * Google Maps India returns numbers in these formats:
 *   "08454958813"   → local with leading 0  → +918454958813
 *   "9326540498"    → 10-digit mobile       → +919326540498
 *   "+91 98765 43210" → already international → +919876543210
 *   "022-12345678"  → landline              → kept as-is after stripping
 */
function normalisePhone(raw) {
  if (!raw) return null;

  // Keep only digits and a leading +
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;

  // Already E.164 with country code
  if (digits.startsWith('+')) return digits;

  // Strip leading 91 if it looks like someone prepended the country code
  // without the +  e.g. "919876543210" (12 digits starting with 91)
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+' + digits;
  }

  // Indian local: leading 0 + 10 digits = 11 digits
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+91' + digits.slice(1);
  }

  // Plain 10-digit Indian mobile (no leading 0)
  if (digits.length === 10) {
    return '+91' + digits;
  }

  // Anything else — return cleaned digits as-is
  return digits;
}

/**
 * Check element visibility without throwing.
 */
async function safeVisible(locator) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── CLI entry point ─────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [businessType, city] = process.argv.slice(2);

  if (!businessType || !city) {
    console.error('Usage: node src/crawler/index.js <businessType> <city>');
    console.error('Example: node src/crawler/index.js "plumber" "Austin TX"');
    process.exit(1);
  }

  crawlLeads(businessType, city).catch((err) => {
    console.error('[crawler] fatal:', err);
    process.exit(1);
  });
}
