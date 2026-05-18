# 08 — Business Model

The CRM is built for one school first. Phase 5 turns it into a SaaS that other schools pay for. Every architectural choice (`tenantId` everywhere, KZT default, Kaspi in the payment enum) was made so Phase 5 is a feature, not a rewrite.

## The path

```
Phase 0–4 (single tenant)        Phase 5 (multi-tenant SaaS)
my_school is the only tenant  →  N schools sign up, each is a tenant
Hard-coded admin in seed.ts   →  Self-serve signup creates Tenant + first admin
Free, internal use            →  Stripe / Kaspi subscription per tenant
```

There is no "rewrite to multi-tenant" step. The schema, the queries, the auth all already key on `tenantId`. Phase 5 is signup pages, billing, isolation tests, and a marketing site.

## Tenant isolation strategy

### Shared database, scoped by `tenantId` column

Every business table has `tenantId String`. Every query goes through `withTenant()` (see [05-backend-patterns.md](05-backend-patterns.md)). This is **soft isolation** — strong enough for a SaaS that holds business-operations data (lead names, payment amounts), not for HIPAA / banking grade isolation.

**Trade-off accepted:** one buggy query without `tenantId` can leak across tenants. Mitigation: every query goes through `withTenant()`, code review your own queries, and Phase 5 adds a test suite that proves cross-tenant queries return empty.

### When to upgrade to row-level security (RLS)

Postgres RLS pushes the `tenant_id = current_setting('app.current_tenant')` check into the database itself. The app sets the variable per session; queries that "forget" the tenantId silently return nothing instead of leaking data.

Upgrade trigger: the first time a prospect asks "how is my data isolated from other schools?" and the answer "we filter in app code" doesn't satisfy them.

### When to upgrade to per-tenant databases

Enterprise tier only. Some prospects (large school chains, government contracts) require their data in their own DB. That's a $1,000+/mo plan with its own deploy pipeline — design it when you have such a prospect, not before.

## Subscription tiers

Plan only in outline until you have at least 3 prospect conversations. Initial sketch:

| Tier | Target | Price band (per month) | What's in it |
|---|---|---|---|
| Free | < 30 students | 0 | Leads + parents + students. No bot. No reminders. |
| Pro | 30–500 students | $30–80 | Everything above + Telegram bot + auto-reminders + payments + installments |
| Enterprise | 500+ students, custom needs | $200+ | Pro + per-tenant DB option + onboarding support + custom integrations |

**Pricing is hypothesis until validated.** Don't build a price selector or a checkout flow until two prospects have said "yes, at $X". Phase 5 ships with **one** plan and manual invoicing; tiered self-serve plans are Phase 6.

## Payment providers

| Provider | Used for | Phase |
|---|---|---|
| **Kaspi** | KZ school **parents** paying tuition (always) | 2 |
| **Kaspi Business** | KZ tenants paying *you* for the SaaS | 5 |
| **Stripe** | International tenants paying for the SaaS | 5+ |
| **Paddle** | Considered for tax compliance (handles VAT/MOSS) — only if Stripe's tax burden becomes real | 6+ |

Distinguish two payment flows:

1. **Parent → school** (the school's revenue) — Phase 2. The CRM **records** these payments; integration with Kaspi for auto-detection happens in Phase 3+ (today it's manager-marked).
2. **Tenant → you** (your revenue) — Phase 5. New domain entirely; new tables (`TenantSubscription`, `TenantInvoice`); new admin UI.

Don't confuse the two — they're built at different times and have different stakeholders.

## Onboarding a new tenant (Phase 5 flow)

```
Marketing site (or referral) → signup page
        ↓
Create Tenant row (slug, name, timezone, currency)
        ↓
Create first User as ADMIN
        ↓
Send welcome email with login link + setup checklist
        ↓
Self-serve Excel import (re-uses scripts/import-students-from-excel.ts logic via UI)
        ↓
Trial period (e.g. 14 days, no card)
        ↓
Activate subscription → Stripe/Kaspi
```

Each step is one feature; ship them in order, don't try to deliver the whole flow in one PR.

## AI roadmap (Phase 6+, not before)

These are *long-term* differentiators. They are not in scope until the SaaS is real:

- **Lead scoring** — predict conversion probability from `acquisitionSource`, time-to-first-contact, age of child, etc. Pure tabular ML problem. Useful only once there are hundreds of resolved leads (won/lost) to train on.
- **Predictive churn** — flag enrollments likely to drop next month based on attendance + payment delay patterns. Same data dependency.
- **AI assistant for managers** — natural language over the manager's data ("show me all parents who paid late twice in a row"). LLM + DB schema + read-only tools. Easier than the predictive models, but lower ROI.
- **Recommendation engine** — courses to recommend to a parent based on the child's age + previous enrollments. Marketing fluff at this scale; revisit at 10+ tenants.

**Discipline rule:** an AI feature ships only when (a) the manual workflow it replaces is visible and painful, (b) you have at least 6 months of clean data in production. Premature AI features burn money and trust.

## Defensibility (why a tenant won't churn to AmoCRM)

Be honest with yourself about why this CRM wins, because it informs feature priorities:

1. **The parent–student–payment data model is correct.** Generic CRMs treat every contact as a customer; we treat one parent + their students as a unit. This is the *only* irreplaceable feature.
2. **Telegram bot for parents** removes the "parents constantly ping us" workload — but only if your tenant's parents use Telegram (true in KZ/RU markets, less true elsewhere).
3. **Installments + Kaspi integration** maps to how KZ schools actually charge. Generic CRMs don't.

The 1st point is enough to justify the build. The 2nd and 3rd are why this is a regional product, not a "globalCRM-for-schools" play. Pricing and marketing should match that — focus on KZ/CIS schools first.

## Anti-features

Things prospects will ask for that you should resist:

- **Mobile app for managers** — they have a phone with a browser. PWA-ify the existing app, don't build native.
- **Whitelabel branding** — tells you your prospect is reselling. Different business; revisit in 2 years.
- **Generic plugin/integration system** — every prospect wants "an integration with X." Build the top 2 (Kaspi, Telegram). Say no to the rest until 3 different prospects ask for the same X.
- **AI sales assistant for cold outreach** — different product entirely.

## Success metric to track from day 1

One number: **months of school revenue that the CRM has processed without errors**. Manual reconciliation against the previous Excel sheet is how you measure it during Phase 2. Once it's 3 months of clean reconciliation, the CRM is trusted internally — and that's the asset Phase 5 sells to other schools.
