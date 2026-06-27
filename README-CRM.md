# Krayin CRM Integration — Setup Guide

This project integrates **Krayin CRM** (a self-hosted Laravel-based CRM) with the Google Maps lead crawler. Every lead scraped is automatically pushed into Krayin CRM in real-time, and crawl jobs can be triggered directly from within the CRM UI.

---

## Architecture

```
Lead Gen SaaS/
├── crm/              ← Krayin CRM (PHP 8.4 / Laravel) — self-hosted CRM
│   └── packages/Webkul/LeadGenCrawler/   ← Custom crawl-trigger module
├── src/              ← Node.js crawler + queue + orchestrator
│   └── integrations/krayin.js            ← REST API bridge to Krayin
├── dashboard/        ← DEPRECATED (use Krayin CRM UI instead)
├── .env              ← Root env (includes KRAYIN_* vars)
└── README-CRM.md     ← This file
```

**Data flow:**
1. Team opens Krayin CRM → clicks **Crawl Jobs** in sidebar
2. Submits a crawl (business type + city + filter)
3. PHP controller inserts a `crawl_jobs` row in Supabase (`status='pending'`)
4. Node.js orchestrator polls Supabase every 60s → picks up the job → runs Playwright crawler
5. Each scraped lead is saved to Supabase AND pushed to Krayin CRM via REST API in real-time
6. Team manages leads in Krayin's Kanban pipeline, adds notes, schedules follow-ups, etc.

---

## 1. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| PHP | 8.3+ | `brew install php` |
| Composer | 2.x | `brew install composer` |
| MySQL | 8.0+ | `brew install mysql` |
| Node.js | 18+ | `brew install node` |

---

## 2. First-Time CRM Setup

```bash
# 1. Go into the CRM folder
cd crm

# 2. Install PHP dependencies (already done if you cloned the repo)
composer install

# 3. Configure the CRM database (already done — credentials below)
#    DB: krayin_crm | User: krayin | Pass: krayin_secret_2024
#    These are set in crm/.env (not tracked in git)

# 4. Generate app key (already done)
php artisan key:generate

# 5. Run migrations & seed default data (already done)
php artisan migrate --seed

# 6. Start the CRM server
php artisan serve --port=8000
```

> **CRM Login:** `http://localhost:8000/admin`
> Default credentials from seed: `admin@example.com` / `admin123`

---

## 3. API Token (Already Auto-Generated)

The Sanctum API token that lets the Node.js crawler push leads into Krayin is **already set** in your root `.env`:

```env
KRAYIN_API_TOKEN=1|vhr0ETggFybcLwPYCRu2krMkJ1i6gt4WxHKisSkm8356f90b
```

If you ever need to regenerate it:
```bash
cd crm
php artisan tinker --execute="
\$user = \Webkul\User\Models\User::first();
\$token = \$user->createToken('lead-gen-crawler')->plainTextToken;
echo 'TOKEN:' . \$token . PHP_EOL;
"
```
Then paste the output into `KRAYIN_API_TOKEN=` in your root `.env`.

---

## 4. Running Everything

You need **two terminals**:

**Terminal 1 — Krayin CRM:**
```bash
cd crm
php artisan serve --port=8000
```

**Terminal 2 — Lead Gen Crawler (Node.js):**
```bash
node src/index.js
```

Then open `http://localhost:8000/admin` → log in → click **Crawl Jobs** in the sidebar.

---

## 5. Supabase Migration

Run this once in your **Supabase SQL editor** (Dashboard → SQL Editor) to add the cross-reference column:

```sql
-- File: src/db/migrate-krayin.sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS krayin_lead_id TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_krayin_lead_id ON leads (krayin_lead_id);
```

---

## 6. Krayin CRM — Default IDs

After seeding, Krayin creates these defaults (IDs match the `.env` defaults):

| Setting | ID | Value |
|---------|-----|-------|
| Pipeline | 1 | Default Pipeline |
| Stage | 1 | New |
| Source | 1 | Email |

You can change the source to "Web Crawler" by:
1. Opening Krayin → Settings → Lead → Sources → Add Source → name it "Web Crawler"
2. Note the new ID and update `KRAYIN_SOURCE_ID` in root `.env`

---

## 7. Folder Structure — Clean Overview

```
crm/                                      ← Krayin CRM (PHP/Laravel)
├── app/Exceptions/Handler.php            ← Compatibility stub
├── packages/Webkul/LeadGenCrawler/       ← Custom crawl-trigger module
│   └── src/
│       ├── Config/menu.php               ← Adds "Crawl Jobs" to sidebar
│       ├── Http/Controllers/
│       │   └── CrawlJobController.php    ← Submit/list/cancel crawl jobs
│       ├── Providers/
│       │   └── LeadGenCrawlerServiceProvider.php
│       ├── Resources/views/admin/
│       │   └── index.blade.php           ← Crawl job dashboard UI
│       └── Routes/admin-routes.php
└── bootstrap/providers.php               ← LeadGenCrawler registered here

src/                                      ← Node.js crawler
├── integrations/krayin.js                ← Krayin REST API client
├── crawler/index.js                      ← Calls pushLeadToKrayin() on each save
├── config/index.js                       ← krayin.* config block
└── db/migrate-krayin.sql                 ← Supabase krayin_lead_id column
```

---

## 8. Troubleshooting

**CRM can't connect to MySQL:**
```bash
mysql -u root -e "SHOW DATABASES;"  # verify MySQL is running
brew services start mysql            # start if needed
```

**Leads not appearing in Krayin:**
1. Check `KRAYIN_BASE_URL` and `KRAYIN_API_TOKEN` in root `.env`
2. Make sure `php artisan serve` is running on port 8000
3. Check Node.js console for `[krayin]` log lines

**Crawl jobs not picking up:**
- The Node.js orchestrator polls every 60 seconds — wait a moment
- Check `node src/index.js` is running
- Verify Supabase `crawl_jobs` table has the job with `status='pending'`

**Reset Krayin DB:**
```bash
cd crm && php artisan migrate:fresh --seed
```
