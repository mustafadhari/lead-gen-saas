/**
 * Universal Webhook Handler — Supabase Edge Function
 *
 * Receives events from:
 * 1. VAPI (call-completed events)
 * 2. Resend (email delivery events: delivered, bounced, complained)
 *
 * It parses the payloads, updates or inserts logs, and transitions
 * the lead's status to 'completed' or 'failed'.
 *
 * Deploy: supabase functions deploy vapi-webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // ── Route the Webhook ────────────────────────────────

    // Resend webhooks typically have a type starting with "email."
    if (payload.type && payload.type.startsWith('email.')) {
      return await handleResendWebhook(payload);
    }

    // Default to VAPI handling
    return await handleVapiWebhook(payload);

  } catch (err) {
    console.error('Webhook processing error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── VAPI Handling ─────────────────────────────────────────

async function handleVapiWebhook(payload) {
  // VAPI sends different event types — we care about "end-of-call-report"
  const eventType = payload.message?.type || payload.type;

  if (eventType !== 'end-of-call-report') {
    return new Response(JSON.stringify({ status: 'ignored', eventType }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const callData = payload.message || payload;

  const callId = callData.call?.id || callData.callId;
  const transcript = callData.transcript || null;
  const recordingUrl = callData.recordingUrl || null;
  const durationSeconds = callData.call?.duration
    ? Math.round(callData.call.duration)
    : null;

  // Determine outcome
  const rawOutcome = callData.analysis?.outcome || callData.call?.status || 'completed';
  const outcome = rawOutcome.toLowerCase();

  // 1. Find the matching lead by VAPI call ID
  const { data: initialLog, error: lookupError } = await supabase
    .from('call_logs')
    .select('lead_id')
    .eq('vapi_call_id', callId)
    .limit(1)
    .single();

  if (lookupError || !initialLog) {
    console.error(`Could not find lead for call ID: ${callId}`);
    return new Response(JSON.stringify({ error: 'Lead not found for call ID' }), { status: 404 });
  }

  const leadId = initialLog.lead_id;

  // 2. Insert a new row into call_logs for the completed call
  const { error: insertError } = await supabase
    .from('call_logs')
    .insert({
      lead_id: leadId,
      vapi_call_id: callId,
      outcome: outcome,
      transcript: transcript,
      recording_url: recordingUrl,
      duration_seconds: durationSeconds,
    });

  if (insertError) {
    console.error('Failed to insert into call_logs:', insertError.message);
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  // 3. Update the lead status to completed or failed
  const failedOutcomes = ['failed', 'error', 'no_answer', 'wrong_number', 'busy'];
  const newStatus = failedOutcomes.includes(outcome) ? 'failed' : 'completed';

  await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('id', leadId);

  return new Response(JSON.stringify({ status: 'ok', leadId, newStatus }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Resend Handling ───────────────────────────────────────

async function handleResendWebhook(payload) {
  const type = payload.type; // e.g. "email.delivered", "email.bounced"

  // Resend webhook payload has { data: { to: ["email@example.com"] } }
  const emailTo = payload.data?.to?.[0];

  if (!emailTo) {
    return new Response(JSON.stringify({ error: 'No recipient found in Resend payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let newStatus;
  if (type === 'email.delivered') {
    newStatus = 'completed';
  } else if (type === 'email.bounced' || type === 'email.complained') {
    newStatus = 'failed';
  } else {
    // Ignore other events like email.sent, email.opened
    return new Response(JSON.stringify({ status: 'ignored', type }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Find the lead by email and update status
  const { error } = await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('email', emailTo);

  if (error) {
    console.error(`Failed to update lead for email ${emailTo}:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ status: 'ok', email: emailTo, newStatus }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
