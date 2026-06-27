/**
 * Krayin CRM Integration
 *
 * Pushes every newly-scraped lead into Krayin CRM via its REST API
 * (Laravel Sanctum Bearer token auth).
 *
 * API base path: /api/admin/  (NOT /api/v1/)
 * Docs: https://devdocs.krayincrm.com/2.2/api/getting-started-with-the-api.html
 *
 * Mapping:
 *   Supabase lead  →  Krayin Lead  +  Krayin Person (contact)
 *
 * All failures are non-blocking — if Krayin is unreachable the crawl
 * still succeeds; only a warning is logged and the push is skipped.
 *
 * Environment variables (set in root .env):
 *   KRAYIN_BASE_URL      — e.g. http://localhost:8000
 *   KRAYIN_API_TOKEN     — Sanctum personal access token
 *                          (POST /api/admin/login → data.token)
 *   KRAYIN_PIPELINE_ID   — default pipeline (default: 1)
 *   KRAYIN_STAGE_ID      — default stage (default: 1)
 *   KRAYIN_SOURCE_ID     — source id for "Web Crawler" (default: 1)
 */

import config from '../config/index.js';

// ── Public API ──────────────────────────────────────────

/**
 * Push a newly-scraped lead into Krayin CRM.
 *
 * @param {object} lead  - Row returned from Supabase insert
 * @param {string} lead.business_name
 * @param {string|null} lead.phone_number
 * @param {string|null} lead.email
 * @param {string|null} lead.location
 * @param {string|null} lead.source_url
 * @param {string|null} lead.website
 *
 * @returns {Promise<{ krayinLeadId: string|null }>}
 */
export async function pushLeadToKrayin(lead) {
  const { baseUrl, apiToken } = config.krayin;

  if (!baseUrl || !apiToken) {
    console.warn('[krayin] KRAYIN_BASE_URL or KRAYIN_API_TOKEN not set — skipping CRM push');
    return { krayinLeadId: null };
  }

  try {
    const payload = buildPayload(lead);

    const res = await fetch(`${baseUrl}/api/v1/leads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[krayin] API error ${res.status} for "${lead.business_name}": ${body}`);
      return { krayinLeadId: null };
    }

    const data = await res.json();
    const krayinLeadId = data?.data?.id?.toString() ?? null;

    if (krayinLeadId) {
      console.log(`[krayin] lead pushed — id: ${krayinLeadId} ("${lead.business_name}")`);
      
      // Assign tags if provided
      if (lead.category) {
        const catTagId = await getOrCreateTag(lead.category);
        if (catTagId) await assignTagToLead(krayinLeadId, catTagId);
      }
      if (lead.city) {
        const cityTagId = await getOrCreateTag(lead.city);
        if (cityTagId) await assignTagToLead(krayinLeadId, cityTagId);
      }
    }

    return { krayinLeadId };
  } catch (err) {
    // Timeouts, connection refused, etc. — log and continue
    console.error(`[krayin] failed to push "${lead.business_name}": ${err.message}`);
    return { krayinLeadId: null };
  }
}

// ── Payload builder ─────────────────────────────────────

/**
 * Map a Supabase lead row to the Krayin REST API payload format.
 */
function buildPayload(lead) {
  const { pipelineId, stageId, sourceId } = config.krayin;

  const payload = {
    title: `${lead.business_name}${lead.location ? ' — ' + lead.location : ''}`,
    lead_value: 0,
    entity_type: 'leads',
    lead_pipeline_id: pipelineId,
    lead_pipeline_stage_id: stageId,
    lead_source_id: sourceId,
    description: buildDescription(lead),
    person: {
      name: lead.business_name,
      // Always send arrays — Krayin's blade view does foreach() on these
      // and crashes with a null. Empty array = safe, null = ViewException.
      emails: lead.email
        ? [{ value: lead.email, label: 'work' }]
        : [],
      contact_numbers: lead.phone_number
        ? [{ value: lead.phone_number, label: 'mobile' }]
        : [],
    },
  };

  return payload;
}

/**
 * Build a human-readable description with all available context.
 */
function buildDescription(lead) {
  const lines = ['Automatically scraped via Lead Gen Crawler.', ''];

  if (lead.website) lines.push(`Website: ${lead.website}`);
  if (lead.location) lines.push(`Location: ${lead.location}`);
  if (lead.source_url) lines.push(`Google Maps: ${lead.source_url}`);

  return lines.join('\n');
}

// ── Tag Management ──────────────────────────────────────

const tagCache = new Map();

async function getOrCreateTag(name) {
  const { baseUrl, apiToken } = config.krayin;
  if (!name) return null;
  const tagName = name.trim();
  
  if (tagCache.has(tagName)) {
    return tagCache.get(tagName);
  }
  
  try {
    // 1. Search if tag exists
    const searchRes = await fetch(`${baseUrl}/api/v1/settings/tags?search=${encodeURIComponent(tagName)}`, {
      headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const existing = searchData?.data?.find(t => t.name.toLowerCase() === tagName.toLowerCase());
      if (existing) {
        tagCache.set(tagName, existing.id);
        return existing.id;
      }
    }

    // 2. Create new tag
    const createRes = await fetch(`${baseUrl}/api/v1/settings/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ name: tagName, color: '#336699' }),
    });
    
    if (createRes.ok) {
      const createData = await createRes.json();
      const newTagId = createData?.data?.id;
      if (newTagId) {
        tagCache.set(tagName, newTagId);
        return newTagId;
      }
    }
  } catch (err) {
    console.error(`[krayin] failed to get/create tag "${tagName}": ${err.message}`);
  }
  return null;
}

async function assignTagToLead(leadId, tagId) {
  const { baseUrl, apiToken } = config.krayin;
  if (!leadId || !tagId) return;

  try {
    const res = await fetch(`${baseUrl}/api/v1/leads/${leadId}/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ tag_id: tagId }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[krayin] failed to assign tag ${tagId} to lead ${leadId}: ${body}`);
    }
  } catch (err) {
    console.error(`[krayin] failed to assign tag ${tagId} to lead ${leadId}: ${err.message}`);
  }
}
