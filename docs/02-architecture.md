# 02 — Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | **Next.js 15** (App Router + Server Actions) | One process for SSR pages, forms, and server logic. Server Actions remove the REST boilerplate that NestJS would impose. |
| Database | **PostgreSQL** | Multi-tenant `tenantId` filters, transactional payments, decimal money — all things Postgres handles correctly out of the box. |
| ORM | **Prisma** | Migrations are first-class, types flow into TypeScript automatically, query API protects from SQL injection by default. |
| Validation | **Zod** | Same schema validates the form on the client and the Server Action on the server — no drift. |
| Auth | **NextAuth (Auth.js v5)** with credentials provider | Sessions in the DB (already have one). No need for separate JWT plumbing. |
| Parent app | **Telegram bot** (`grammy` or `telegraf`) | All parent use cases (schedule, balance, reminders, "talk to manager") are text-shaped. Bot ships in days; native app takes months. |
| Background jobs | **Postgres + a polling worker** (or `pg-boss`) initially | No Redis/Kafka until there's a real reason. Reminders run on cron-like polling. |
| Error monitoring | **Sentry** | Cheap, hosted, works on Next.js with one line. |
| Hosting | **Vercel** for the web app + **managed Postgres** (Neon / Supabase / Render) | One person can't run a Kubernetes cluster *and* a school. |

## What we deliberately don't use (yet)

- **NestJS** — too many layers (controllers, services, repositories, modules, DTOs, interceptors) for one developer. Server Actions cover the same ground in less code.
- **React Native** — see [01-context.md](01-context.md). Telegram bot covers parent use cases.
- **Redis** — Postgres is fast enough for caching at this scale. Reach for Redis when you can prove a bottleneck.
- **Kafka / event bus** — there's one app; events are function calls.
- **Kubernetes** — Vercel + managed Postgres scales to thousands of schools before this matters.
- **ELK / Prometheus / Grafana** — Sentry for errors, Postgres logs for queries. Add observability when there's a paying customer demanding an SLA.
- **CQRS / Event Sourcing / DDD aggregates** — pure overhead for a CRUD-shaped business. We have tables and queries; we don't need command/query buses on top.

These all *eventually* might land — but each one is a deferred decision, not a default.

## Architecture pattern: feature-based, not layer-based

**Rejected**: the NestJS-style split — `controllers/`, `services/`, `repositories/`, `entities/`, `modules/`. Working on "leads" means jumping between 5 folders.

**Adopted**: one folder per business capability — `features/leads/`, `features/payments/`, `features/parents/`. Each contains its actions, queries, schemas, and components together.

Three concrete payoffs:

1. **Deleting a feature = deleting one folder.** Phase 4 schedule turns out too expensive? `rm -r features/schedule`. Done.
2. **The [roadmap](06-roadmap.md) maps 1:1 onto folders.** Phase 1 = `features/auth` + `features/leads`. Phase 2 = + `features/parents` + `features/payments`. No mental translation.
3. **3-months-later readability.** When you forget how a feature works, `features/X/` shows everything in one glance.

Full layout is in [03-project-structure.md](03-project-structure.md).

## Multi-tenant from day 1

Every business table has a `tenantId String` column. Every query is scoped through a helper that injects the current tenant from the session:

```typescript
const leads = await db.lead.findMany({ where: { tenantId: ctx.tenantId, ... } })
```

For the first 5 months there is exactly one tenant — the home school — seeded as `tenant_id = 'my_school'`. Phase 5 adds tenant signup, billing, and isolation tests. No schema rewrite needed because the column was always there.

See [04-database.md](04-database.md) for the schema and the FK strategy, [05-backend-patterns.md](05-backend-patterns.md) for the `withTenant()` helper, and [08-business-model.md](08-business-model.md) for the SaaS rollout.

## Three flows the architecture has to support

These are the load-bearing flows; every structural decision is checked against them.

### 1. Lead intake (Phase 1)

```
Instagram DM / website form / Telegram inbound
        ↓
public webhook (app/api/lead-intake/route.ts)
        ↓
features/leads/actions.ts → createLead()
        ↓
DB insert (Lead row, tenantId='my_school') + dedup by parentPhone
        ↓
Manager sees it in kanban (features/leads/components/lead-kanban.tsx)
```

### 2. Payment due reminder (Phase 2 + 3)

```
cron poller (every 15 min)
        ↓
features/payments/queries.ts → dueWithin(48h)
        ↓
features/notifications/lib/dedup.ts → already sent? (triggerType='payment_due', triggerId=paymentId)
        ↓
features/notifications/channels/telegram.ts → send to parent's telegramChatId
        ↓
Notification row written for audit
```

### 3. Manager logs in and works (every day, all phases)

```
NextAuth session (DB-backed) → ctx.userId + ctx.tenantId
        ↓
app/(dashboard)/leads/page.tsx → server component
        ↓
features/leads/queries.ts → listLeads({ tenantId, assignedTo: ctx.userId? })
        ↓
features/leads/components/lead-list.tsx → renders, links to detail
        ↓
Form on detail page calls features/leads/actions.ts → updateLead()
        ↓
revalidatePath() — kanban updates without an extra fetch
```

Every other feature is a variation on these three shapes.
