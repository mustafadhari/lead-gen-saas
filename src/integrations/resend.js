/**
 * Resend integration — cold outreach email
 *
 * Sends a personalised cold email to a lead via the Resend REST API.
 * Uses the "I built something for you" template from the email-template
 * knowledge file, with both HTML and plain-text versions.
 *
 * TEST_MODE: when active, sends to TEST_EMAIL instead of the lead's
 * real address — the email is still delivered so you can inspect it.
 */

import config from '../config/index.js';

const RESEND_BASE = 'https://api.resend.com';

// ── Public API ──────────────────────────────────────────

/**
 * Send a cold outreach email to a lead.
 *
 * @param {object} lead
 * @param {string} lead.business_name
 * @param {string} lead.email
 * @param {string} [lead.location]
 * @param {string} [lead.source_url]
 * @returns {Promise<{ id: string | null }>}
 */
export async function sendEmail(lead) {
  const toAddress = resolveRecipient(lead);

  if (!toAddress) {
    console.error(`[resend] no email for lead "${lead.business_name}" — skipping`);
    return { id: null };
  }

  const businessName = lead.business_name;
  const subject = `I made a quick landing page for ${businessName}`;
  const text = buildPlainText(businessName);
  const html = buildHtml(businessName);

  // ── TEST MODE ─────────────────────────────────────
  if (config.testing.testMode) {
    console.log('[resend] TEST MODE active');
    console.log(`[resend]   lead email : ${lead.email}`);
    console.log(`[resend]   sending to : ${toAddress} (test override)`);
    console.log(`[resend]   business   : ${businessName}`);
    console.log(`[resend]   subject    : ${subject}`);
    return { id: `test-${Date.now()}` };
  }

  // ── PRODUCTION ────────────────────────────────────
  console.log(`[resend] emailing ${toAddress} for "${businessName}"…`);

  const from = `${config.resend.fromName} <${config.resend.fromEmail}>`;

  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [toAddress],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[resend] API error ${res.status}: ${body}`);
    return { id: null };
  }

  const data = await res.json();
  const id = data.id || null;

  console.log(`[resend] email sent — id: ${id}`);
  return { id };
}

// ── Internals ───────────────────────────────────────────

/**
 * Decide which email address to deliver to.
 * In TEST_MODE, swap to TEST_EMAIL.
 */
function resolveRecipient(lead) {
  if (config.testing.testMode) {
    return config.testing.email || null;
  }
  return lead.email || null;
}

// ── Templates ───────────────────────────────────────────

/**
 * Plain-text version of the cold outreach email.
 * Follows the knowledge file: under 120 words, value-first,
 * single CTA, includes unsubscribe.
 */
function buildPlainText(businessName) {
  return `Hi,

I'm Alex — I came across ${businessName} and wanted to reach out.

I actually went ahead and put together a landing page concept for your business. It took about 20 minutes and it's ready for you to look at.

No strings attached — it's yours either way. If you like it and want me to turn it into a full site, I'd love to chat for 2 minutes.

Cheers,
Alex

--
If you'd rather not hear from me again, just reply "stop" and I'll remove you immediately.`;
}

/**
 * Clean HTML version of the same email.
 * Minimal markup — no images, no heavy styling. Renders well
 * across all clients (Gmail, Outlook, Apple Mail).
 */
function buildHtml(businessName) {
  // Escape the business name for safe HTML insertion
  const safe = escapeHtml(businessName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing page for ${safe}</title>
</head>
<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#1a1a1a; background-color:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; padding:32px 16px;">
    <tr>
      <td>
        <p style="margin:0 0 16px;">Hi,</p>

        <p style="margin:0 0 16px;">
          I'm Alex &mdash; I came across <strong>${safe}</strong> and wanted to reach out.
        </p>

        <p style="margin:0 0 16px;">
          I actually went ahead and put together a landing page concept
          for your business. It took about 20 minutes and it's ready
          for you to look at.
        </p>

        <p style="margin:0 0 16px;">
          No strings attached &mdash; it's yours either way. If you like it
          and want me to turn it into a full site, I'd love to chat for
          2 minutes.
        </p>

        <p style="margin:0 0 4px;">Cheers,</p>
        <p style="margin:0 0 32px;">Alex</p>

        <hr style="border:none; border-top:1px solid #e0e0e0; margin:0 0 12px;">
        <p style="margin:0; font-size:12px; color:#888888;">
          If you'd rather not hear from me again, just reply &ldquo;stop&rdquo;
          and I'll remove you immediately.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Basic HTML entity escaping to prevent injection via business names.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
