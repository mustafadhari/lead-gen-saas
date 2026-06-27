# Email Templates — Outreach Sequences

## Design Principles

1. **Plain text first** — no heavy HTML, no image-only emails (spam trigger)
2. **One clear CTA** per email — don't split attention
3. **Short** — under 120 words for cold emails, under 200 for follow-ups
4. **Personalised** — use `{{business_name}}`, `{{location}}`, `{{website}}`
5. **Value-first** — lead with what you've done for them, not what you want

---

## Sequence 1: Cold Outreach (Post-Call / No Answer)

### Email 1 — "I built something for you" (Day 0)

**Subject A**: I made a quick landing page for {{business_name}}
**Subject B**: {{first_name}}, take a look at this

```
Hi {{first_name}},

I'm Alex — I came across {{business_name}} while browsing
{{source_context}} and wanted to reach out.

I actually went ahead and put together a landing page concept
for your business. It took about 20 minutes and it's live here:

→ {{demo_url}}

No strings attached — it's yours either way. If you like it and
want me to turn it into a full site, I'd love to chat for 2 minutes.

You can grab a time here: {{calendar_link}}

Cheers,
Alex
```

---

### Email 2 — "Quick follow-up" (Day 3)

**Subject A**: Did you get a chance to look?
**Subject B**: The landing page I built for {{business_name}}

```
Hi {{first_name}},

Just floating this back up — I put together a free landing page
mockup for {{business_name}} a few days ago:

→ {{demo_url}}

Would love your honest feedback, even if it's 'not for us right now.'

Either way — happy to help if you ever need a hand with your
online presence.

Alex
```

---

### Email 3 — "Last one, I promise" (Day 7)

**Subject A**: Last note from me
**Subject B**: Closing the loop on {{business_name}}

```
Hi {{first_name}},

I'll keep this short — I built a free landing page mockup for
{{business_name}} ({{demo_url}}) and wanted to make sure
you saw it.

If it's not the right time, no worries at all. I'll leave the
mockup live for another 30 days in case you change your mind.

If you'd like to explore it further:
→ Book a 5-min call: {{calendar_link}}

All the best,
Alex

P.S. If you'd rather I didn't email again, just reply "stop"
and I'll remove you immediately.
```

---

## Sequence 2: Post-Demo Follow-Up (Lead Said "Maybe")

### Email 1 — "Recap + Proposal" (Same Day)

**Subject**: Here's what we discussed, {{first_name}}

```
Hi {{first_name}},

Great chatting with you earlier! As promised, here's a quick recap:

  • Your mockup: {{demo_url}}
  • What's included: {{tier_summary}}
  • Investment: {{price_range}}
  • Timeline: {{turnaround}}

Next step: If you'd like to move forward, just reply "let's go"
and I'll send over a simple agreement.

No rush — the mockup stays live and you can share it with
your team.

Alex
```

---

### Email 2 — "Gentle nudge" (Day 4)

**Subject**: Quick question about the mockup

```
Hi {{first_name}},

Just checking in — any thoughts on the landing page I built
for {{business_name}}?

If there's anything you'd want changed (colours, layout, copy),
happy to tweak it as a next step.

Alex
```

---

### Email 3 — "Social proof + close" (Day 10)

**Subject**: What {{similar_business}} did with their new site

```
Hi {{first_name}},

Wanted to share a quick story — I built a similar landing page
for {{similar_business}} in {{similar_location}} last month.

Within 3 weeks, they saw a {{result_metric}} increase in
{{result_type}}.

Your mockup ({{demo_url}}) uses the same approach. If you
want to put it live, I can have the full site ready in
{{turnaround}}.

Book a quick call: {{calendar_link}}

Alex
```

---

## Sequence 3: Re-Engagement (Lead Gone Cold — 30+ Days)

### Single Email — "Checking in"

**Subject A**: Still thinking about a new website?
**Subject B**: {{business_name}} — your mockup is still live

```
Hi {{first_name}},

A while back I put together a landing page concept for
{{business_name}}:

→ {{demo_url}}

I'm still offering the same deal — if you like it, I can turn
it into a full site in {{turnaround}} starting at {{starter_price}}.

If your needs have changed or you've already got this covered,
just let me know and I'll close this out.

Alex
```

---

## Template Variables Reference

| Variable | Source | Example |
|---|---|---|
| `{{first_name}}` | Lead record or fallback to "there" | "Sarah" |
| `{{business_name}}` | `leads.business_name` | "Bloom Beauty Studio" |
| `{{location}}` | `leads.location` | "Melbourne, AU" |
| `{{demo_url}}` | Generated demo page URL | "https://demos.yoursite.com/bloom-beauty" |
| `{{calendar_link}}` | From `company-info.md` | "https://cal.com/yourname" |
| `{{source_context}}` | Derived from `leads.source_url` | "Google Maps" |
| `{{tier_summary}}` | From `company-info.md` tiers | "Starter Landing Page" |
| `{{price_range}}` | From `company-info.md` tiers | "$300 – $600" |
| `{{turnaround}}` | From `company-info.md` tiers | "24–48 hours" |
| `{{starter_price}}` | Lowest tier price | "$300" |
| `{{similar_business}}` | Past client (anonymised if needed) | "a dental clinic in Sydney" |
| `{{similar_location}}` | Past client location | "Sydney, AU" |
| `{{result_metric}}` | Real metric | "35%" |
| `{{result_type}}` | What improved | "enquiries from their website" |

---

## Deliverability Checklist

> Applied automatically by the email integration (`src/integrations/resend.js`)

- [x] Send as **plain text** (or minimal HTML with plain-text fallback)
- [x] Include **unsubscribe mechanism** (reply "stop")
- [x] Use a **custom domain** with SPF, DKIM, and DMARC configured
- [x] **Warm up** new sending domains — start with 20/day, scale over 2 weeks
- [x] Respect a **max of 50 cold emails/day** per domain in the first month
- [x] Never send to addresses that have **bounced** before
- [x] Space emails **at least 60 seconds apart** (no bulk blasts)
- [x] Include a **physical mailing address** in the footer (CAN-SPAM / GDPR)
