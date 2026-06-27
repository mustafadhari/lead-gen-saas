# LeadFlow — Claude Code Instructions

## Project Overview

LeadFlow is an AI-powered lead outreach SaaS built for freelance web developers who want to close clients fast. It crawls business directories (Google Maps, Yelp, Yellow Pages) across multiple countries, then contacts leads automatically via AI voice calls (VAPI) or cold email (Resend) depending on what contact info is available. The core strategy: build a free landing page mockup for each lead *before* reaching out, then offer a quick screen share to show it. Results are logged back to Supabase and displayed on a dashboard.

---

## Tech Stack

- **Crawler:** Playwright (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Orchestrator:** node-cron
- **CRM Integration:** Krayin CRM (Laravel)
- **Voice Calling:** VAPI REST API
- **Cold Email:** Resend SDK
- **Results Logger:** Supabase Edge Functions
- **Dashboard:** Krayin CRM Admin Panel (Next.js dashboard replaced)
- **Hosting:** Railway
- **Config:** dotenv

---

## Project Structure

```
leadflow/
  /crawler
    index.js            ← Playwright scraper
  /orchestrator
    index.js            ← node-cron polling logic (polls for crawl_jobs from CRM)
  /integrations
    krayin.js           ← Krayin CRM REST API bridge
    vapi.js             ← VAPI call trigger module
    resend.js           ← Resend email module
  /db
    client.js           ← Supabase singleton
    schema.sql          ← DDL for leads + call_logs
    migrate.js          ← Migration runner
  /webhooks
    vapi-webhook/
      index.ts          ← Supabase Edge Function
  /config
    index.js            ← Centralised env config
  /knowledge
    agent-persona.md
    call-script.md
    objection-handling.md
    email-template.md
    company-info.md
  /crm                  ← Krayin CRM Laravel application
CLAUDE.md
.env
.env.example
.gitignore
package.json
```

---

## Database Schema

### leads table

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key, auto generated |
| business\_name | text | scraped from Google Maps |
| phone\_number | text | nullable |
| email | text | nullable |
| website | text | nullable |
| location | text | city and state |
| source\_url | text | Google Maps listing URL |
| status | text | new, queued, called, emailed, completed, uncontactable |
| contact\_method | text | call, email, none |
| created\_at | timestamp | auto generated |
| updated\_at | timestamp | auto updated |

### call\_logs table

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key, auto generated |
| lead\_id | uuid | foreign key → leads.id |
| vapi\_call\_id | text | returned by VAPI on call trigger |
| outcome | text | interested, maybe, not\_interested, voicemail, no\_answer, callback, do\_not\_contact |
| transcript | text | full call transcript from VAPI |
| recording\_url | text | URL to call recording |
| duration\_seconds | integer | call length in seconds |
| created\_at | timestamp | auto generated |

---

## Key Conventions

- **ES Modules** — All files use `import/export`, not `require()`
- **Config** — All env vars accessed via `src/config/index.js`, never `process.env` directly
- **Supabase client** — Single instance exported from `src/db/client.js`
- **Test mode** — When `TEST_MODE=true`, calls and emails are simulated (logged, not sent)
- **Knowledge files** — The AI agent's persona, scripts, and templates live in `src/knowledge/` and should be treated as the source of truth for all outreach behaviour

---

## Agent Behaviour

The AI voice agent ("Alex") follows these rules:

1. **Always lead with value** — "I built something for you", never "I want to sell you something"
2. **Keep calls under 3 minutes** — respect the lead's time
3. **Offer an out** — always give the lead a graceful exit
4. **Never fabricate** — no fake stats, no made-up pricing, no imaginary clients
5. **Log everything** — every call outcome goes into `call_logs`, every email status is tracked

See `src/knowledge/agent-persona.md` and `src/knowledge/call-script.md` for full scripts.

---

## Email Rules

- Plain text preferred (no image-heavy HTML)
- Max 50 cold emails/day per domain during warm-up
- Always include unsubscribe mechanism
- Space emails 60+ seconds apart
- Never email a previously bounced address

See `src/knowledge/email-template.md` for sequences and variables.

---

## Commands

```bash
npm run dev        # Start with file watching
npm run migrate    # Run Supabase schema migration
npm start          # Production start
```
