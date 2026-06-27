/**
 * Vapi integration — AI-powered voice calling
 *
 * Triggers outbound calls via the VAPI REST API.
 * Injects the lead's business name into the agent's first message
 * and system prompt as a dynamic variable.
 *
 * When VAPI_ASSISTANT_ID is set, it uses that assistant with
 * variableValues override. Otherwise it creates a transient
 * assistant inline with the full system prompt baked in.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import config from '../config/index.js';

const VAPI_BASE = 'https://api.vapi.ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const knowledgeDir = join(__dirname, '..', 'knowledge');

// ── Knowledge files (loaded once at startup) ────────────

function loadKnowledge(filename) {
  try {
    return readFileSync(join(knowledgeDir, filename), 'utf-8');
  } catch {
    return '';
  }
}

const PERSONA = loadKnowledge('agent-persona.md');
const CALL_SCRIPT = loadKnowledge('call-script.md');
const OBJECTION_HANDLING = loadKnowledge('objection-handling.md');
const COMPANY_INFO = loadKnowledge('company-info.md');

/**
 * Build the system prompt with all knowledge files.
 * {{businessName}} is left as a literal placeholder so VAPI's
 * variable substitution replaces it at call time.
 */
function buildSystemPrompt() {
  return [
    'You are Alex, a Business Development Representative.',
    'You are calling the owner of {{businessName}}.',
    'You built a free landing page mockup for their business before this call.',
    'Your goal on THIS call is to schedule a short 5-minute video call for tomorrow',
    'where you will share your screen and walk them through the mockup live.',
    'You CANNOT share your screen or show anything on this phone call.',
    'If they want to see the mockup now, explain you need a video call for that',
    'and offer to schedule one for tomorrow, or send the link via email.',
    '',
    '## Persona',
    PERSONA,
    '',
    '## Call Script',
    CALL_SCRIPT,
    '',
    '## Objection Handling',
    OBJECTION_HANDLING,
    '',
    '## Company Info',
    COMPANY_INFO,
  ].join('\n');
}

const FIRST_MESSAGE =
  'Hi, this is Alex — I\'m a web developer. I came across {{businessName}} ' +
  'and I noticed you don\'t have a website yet. I actually went ahead and ' +
  'put together a free landing page concept for your business. I\'d love to ' +
  'hop on a quick video call tomorrow to walk you through it — it would only ' +
  'take about 5 minutes. Would you be open to that?';

// ── Public API ──────────────────────────────────────────

/**
 * Initiate an outbound call to a lead via VAPI.
 *
 * @param {object} lead - Lead record from Supabase (must have phone_number, business_name)
 * @returns {Promise<{ callId: string | null }>}
 */
export async function initiateCall(lead) {
  const phoneNumber = resolvePhoneNumber(lead);

  if (!phoneNumber) {
    console.error(`[vapi] no phone number for lead "${lead.business_name}" — skipping`);
    return { callId: null };
  }

  // ── TEST MODE ─────────────────────────────────────
  if (config.testing.testMode) {
    console.log(`[vapi] TEST MODE active`);
    console.log(`[vapi]   lead phone : ${lead.phone_number}`);
    console.log(`[vapi]   dialling   : ${phoneNumber} (test override)`);
    console.log(`[vapi]   business   : ${lead.business_name}`);
    console.log(`[vapi]   VAPI will call: ${phoneNumber}`);
  } else {
    console.log(`[vapi] calling ${phoneNumber} for "${lead.business_name}"…`);
  }

  const body = buildRequestBody(lead, phoneNumber);
  const res = await fetch(`${VAPI_BASE}/call/phone`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.vapi.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[vapi] API error ${res.status}: ${text}`);
    return { callId: null };
  }

  const data = await res.json();
  const callId = data.id || null;

  console.log(`[vapi] call created — id: ${callId}`);
  return { callId };
}

/**
 * Retrieve call details (transcript, recording, outcome).
 *
 * @param {string} callId - VAPI call ID
 * @returns {Promise<object | null>}
 */
export async function getCallDetails(callId) {
  console.log(`[vapi] fetching details for call ${callId}…`);

  const res = await fetch(`${VAPI_BASE}/call/${callId}`, {
    headers: {
      Authorization: `Bearer ${config.vapi.apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[vapi] GET /call/${callId} failed ${res.status}: ${text}`);
    return null;
  }

  return res.json();
}

// ── Internals ───────────────────────────────────────────

/**
 * Decide which phone number to dial.
 * In TEST_MODE, swap to TEST_PHONE_NUMBER.
 */
function resolvePhoneNumber(lead) {
  if (config.testing.testMode) {
    return config.testing.phoneNumber || null;
  }
  return lead.phone_number || null;
}

/**
 * Build the VAPI POST /call/phone request body.
 *
 * Two modes:
 *   1. If VAPI_ASSISTANT_ID is set → reference that assistant and pass
 *      variableValues to inject {{businessName}}.
 *   2. Otherwise → send a full transient assistant inline.
 */
function buildRequestBody(lead, phoneNumber) {
  const variableValues = {
    businessName: lead.business_name,
  };

  const base = {
    phoneNumberId: config.vapi.phoneNumberId,
    customer: { number: phoneNumber },
  };

  if (config.vapi.assistantId) {
    // Mode 1: reference a pre-built assistant, override variables
    return {
      ...base,
      assistantId: config.vapi.assistantId,
      assistantOverrides: {
        variableValues,
        firstMessage: FIRST_MESSAGE,
      },
    };
  }

  // Mode 2: transient inline assistant
  return {
    ...base,
    assistant: {
      firstMessage: FIRST_MESSAGE,
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: 'burt',
      },
      variableValues,
    },
  };
}
