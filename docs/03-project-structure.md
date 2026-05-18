# 03 — Project Structure

This is the file you'll re-open more than any other. Every code-where-does-this-go question is answered here.

## TL;DR

- **Pages** live in `app/` and stay thin — they import from `features/` and render.
- **Business logic** lives in `features/<capability>/` — one folder per business capability (`leads`, `parents`, `payments`, …). Each contains `actions.ts` (mutations), `queries.ts` (reads), `schemas.ts` (Zod), `components/` (UI), optional `lib/` (helpers).
- **Cross-feature utilities** (`prisma` client, `withTenant()`, env, money/date helpers) live in `lib/`.
- **Generic UI primitives** (button, input, table — shadcn/ui) live in `components/ui/`. Anything feature-specific lives under `features/X/components/`.

## Why feature-based, not layer-based

The NestJS/Clean-Architecture-style split (`controllers/`, `services/`, `repositories/`, `entities/`, `dtos/`) was designed for teams with many people, sharp role boundaries, and a long code lifetime. For a solo full-stack developer building a CRUD-shaped product, those layers add navigation cost without giving anything back.

Feature-based pays off three ways:

1. **Delete = `rm -r features/X`.** Want to drop the schedule module entirely? One command. No leftover services in `app/services/schedule.service.ts` to hunt.
2. **Roadmap → folders, 1:1.** Phase 1 of the [roadmap](06-roadmap.md) is "leads." So you create `features/leads/` and nothing else. Phase 2 adds `features/payments/`. The folder tree literally is the project plan.
3. **3-months-later readability.** When you come back to the `payments` module after working on the bot for a month, opening `features/payments/` shows you everything: schemas, actions, queries, components. No tab-jumping.

## Full tree

```
crm_system/
├── app/                                # Next.js App Router (pages = thin)
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── leads/
│   │   │   ├── page.tsx                # kanban
│   │   │   └── [id]/page.tsx           # lead detail
│   │   ├── parents/
│   │   ├── students/
│   │   ├── payments/
│   │   ├── groups/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── layout.tsx                  # nav, sidebar, auth check
│   ├── api/                            # ONLY for webhooks / public endpoints
│   │   ├── telegram/webhook/route.ts   # Telegram bot receives updates
│   │   ├── lead-intake/route.ts        # public form / Instagram bridge
│   │   └── cron/payment-reminders/route.ts
│   ├── layout.tsx
│   └── page.tsx                        # landing → redirect to /leads or /login
│
├── features/                           # ← the heart of the app
│   ├── auth/
│   │   ├── actions.ts                  # login, logout
│   │   ├── queries.ts                  # getSession, requireUser
│   │   ├── schemas.ts                  # loginSchema (Zod)
│   │   └── components/
│   │       ├── login-form.tsx
│   │       └── user-menu.tsx
│   │
│   ├── leads/
│   │   ├── actions.ts                  # createLead, updateLead, convertLead, assignLead
│   │   ├── queries.ts                  # listLeads, getLead, leadsByStage, leadStats
│   │   ├── schemas.ts                  # createLeadSchema, updateLeadSchema
│   │   ├── components/
│   │   │   ├── lead-form.tsx
│   │   │   ├── lead-kanban.tsx
│   │   │   ├── lead-card.tsx
│   │   │   ├── lead-list.tsx
│   │   │   └── lead-detail.tsx
│   │   └── lib/
│   │       ├── stages.ts               # LEAD_STAGES const + transitions
│   │       └── dedup.ts                # findExistingByPhone(tenantId, phone)
│   │
│   ├── parents/                        # Phase 2
│   ├── students/                       # Phase 2
│   ├── payments/                       # Phase 2
│   │   ├── actions.ts                  # recordPayment, createInstallmentPlan
│   │   ├── queries.ts                  # balance, dueWithin, overdue
│   │   ├── schemas.ts
│   │   ├── components/
│   │   └── lib/
│   │       └── money.ts                # Decimal → display KZT
│   │
│   ├── groups/                         # Phase 4 (maybe)
│   ├── lessons/                        # Phase 4 (maybe)
│   ├── attendance/                     # Phase 4 (maybe)
│   ├── analytics/                      # Phase 5
│   │
│   ├── notifications/                  # Phase 2/3
│   │   ├── actions.ts                  # send()
│   │   ├── queries.ts                  # auditLog
│   │   ├── schemas.ts
│   │   ├── channels/
│   │   │   ├── telegram.ts
│   │   │   ├── sms.ts                  # placeholder until Phase 5
│   │   │   └── email.ts
│   │   └── lib/
│   │       └── dedup.ts                # triggerType + triggerId guard
│   │
│   ├── tenant/                         # current-tenant resolution
│   │   ├── queries.ts                  # currentTenant()
│   │   └── lib/
│   │       └── context.ts              # AsyncLocalStorage-based tenant ctx
│   │
│   └── telegram-bot/                   # Phase 3 — bot handlers
│       ├── handlers/
│       │   ├── start.ts
│       │   ├── balance.ts
│       │   ├── schedule.ts
│       │   └── talk-to-manager.ts
│       ├── lib/
│       │   └── link-parent.ts          # links chatId to Parent row
│       └── bot.ts                      # bot instance + dispatcher
│
├── lib/                                # cross-feature utilities (no business logic)
│   ├── db/
│   │   ├── prisma.ts                   # PrismaClient singleton
│   │   └── with-tenant.ts              # tenant-scoped query helper
│   ├── auth/
│   │   └── server.ts                   # auth() + requireUser()
│   ├── env.ts                          # Zod-validated process.env
│   ├── money.ts                        # Prisma.Decimal helpers
│   ├── dates.ts                        # Asia/Almaty formatters
│   └── errors.ts                       # AppError, NotFoundError, …
│
├── components/                         # shared UI ONLY (no business logic)
│   ├── ui/                             # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   └── …
│   ├── layout/
│   │   ├── nav.tsx
│   │   └── sidebar.tsx
│   └── forms/
│       ├── form-field.tsx
│       └── submit-button.tsx
│
├── prisma/
│   ├── schema.prisma                   # see docs/04-database.md
│   ├── migrations/
│   └── seed.ts                         # creates `my_school` tenant + first admin
│
├── scripts/                            # one-offs (Excel imports, etc.)
│   └── import-students-from-excel.ts
│
├── public/
├── .env.example
├── next.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## `app/` walkthrough — pages stay thin

Pages do three things only: pull the session, call a `features/*` query, render a `features/*` component. No DB calls, no business logic.

```tsx
// app/(dashboard)/leads/page.tsx
import { requireUser } from '@/lib/auth/server'
import { listLeads } from '@/features/leads/queries'
import { LeadKanban } from '@/features/leads/components/lead-kanban'

export default async function LeadsPage() {
  const user = await requireUser()
  const leads = await listLeads({ tenantId: user.tenantId })
  return <LeadKanban leads={leads} />
}
```

`app/api/` is reserved for things that can't be Server Actions: webhooks (Telegram, public form), cron triggers. Internal mutations from your own forms never go through `app/api/` — they call Server Actions directly.

## `features/` walkthrough — one folder per capability

Each feature folder has the same shape. Predictability beats cleverness.

```
features/leads/
├── actions.ts        ← 'use server' — mutations, called from forms
├── queries.ts        ← read functions, called from server components
├── schemas.ts        ← Zod schemas — one source of truth for the shape
├── components/       ← React components for this feature
└── lib/              ← feature-private helpers (stages, dedup, …)
```

**What goes in each file** (rules of thumb):

- `actions.ts` — any function that mutates state. Always `'use server'` at the top. Always validates input with the matching Zod schema. Always tenant-scoped via the session.
- `queries.ts` — pure reads. Tenant-scoped too. Return shapes use `Prisma.LeadGetPayload<{...}>` for type safety.
- `schemas.ts` — Zod schemas + inferred types. Reused by `actions.ts` and by client forms.
- `components/` — both server and client components. Client ones marked `'use client'` only when they need state, effects, or event handlers.
- `lib/` — anything that doesn't fit the above and is feature-private (constants, transitions, small helpers).

A feature **never imports from another feature's internals**. If `payments` needs lead info, it imports from `features/leads/queries.ts` — the public surface. This keeps the "delete a folder, nothing breaks" property.

## `lib/` walkthrough — cross-feature utilities

This folder is for things that legitimately every feature needs and that have no business logic. If you find yourself adding business rules here, it belongs in a `features/*` folder instead.

- `lib/db/prisma.ts` — PrismaClient singleton (avoid the dev hot-reload connection leak).
- `lib/db/with-tenant.ts` — helper that auto-scopes a Prisma operation to the current tenant.
- `lib/auth/server.ts` — `auth()` returns the session, `requireUser()` throws if there is none.
- `lib/env.ts` — Zod-validated `process.env`. Crashes on boot if a var is missing.
- `lib/money.ts` — `Decimal` → `"125 000 ₸"` for display; never use `Float` for money.
- `lib/dates.ts` — `Asia/Almaty` formatters. Don't reach for `Intl.DateTimeFormat` inline in components.

## `components/` walkthrough — generic UI only

`components/ui/` is shadcn/ui primitives (`Button`, `Input`, `Table`, `Dialog`, …). No business knowledge.
`components/layout/` is the app shell (`Nav`, `Sidebar`).
`components/forms/` is reusable form scaffolding (`FormField`, `SubmitButton`).

If a component knows what a "lead" is, it belongs in `features/leads/components/` instead.

## Key patterns + snippets

### Pattern 1: Server Action

```typescript
// features/leads/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/prisma'
import { requireUser } from '@/lib/auth/server'
import { createLeadSchema } from './schemas'
import { findExistingByPhone } from './lib/dedup'

export async function createLead(input: unknown) {
  const user = await requireUser()
  const data = createLeadSchema.parse(input)

  const existing = await findExistingByPhone(user.tenantId, data.parentPhone)
  if (existing) {
    return { ok: false, reason: 'duplicate', existingId: existing.id }
  }

  const lead = await db.lead.create({
    data: {
      ...data,
      tenantId: user.tenantId,
      assignedTo: data.assignedTo ?? user.id,
      stage: 'NEW',
    },
  })

  revalidatePath('/leads')
  return { ok: true, leadId: lead.id }
}
```

Form calls it directly — no fetch, no `/api/leads/create` route:

```tsx
// features/leads/components/lead-form.tsx
'use client'

import { createLead } from '../actions'
import { useFormState } from 'react-dom'

export function LeadForm() {
  const [state, action] = useFormState(createLead, null)
  return (
    <form action={action}>
      <input name="parentName" required />
      <input name="parentPhone" required />
      <select name="acquisitionSource">
        <option value="instagram">Instagram</option>
        <option value="website">Website</option>
        <option value="referral">Referral</option>
      </select>
      <button type="submit">Create</button>
      {state?.reason === 'duplicate' && <p>Already exists.</p>}
    </form>
  )
}
```

### Pattern 2: Co-located Zod schema

```typescript
// features/leads/schemas.ts
import { z } from 'zod'

export const createLeadSchema = z.object({
  parentName: z.string().min(2),
  parentPhone: z.string().regex(/^\+7\d{10}$/, 'Format: +7XXXXXXXXXX'),
  childName: z.string().optional(),
  acquisitionSource: z.enum(['instagram', 'website', 'referral', 'walk_in', 'other']),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
```

The same schema validates the form on the client (via `react-hook-form` + `zodResolver`) and the action on the server (`createLeadSchema.parse(input)`). No drift.

### Pattern 3: Tenant-scoped query helper

```typescript
// lib/db/with-tenant.ts
import { db } from './prisma'
import { requireUser } from '@/lib/auth/server'

export async function withTenant<T>(fn: (tenantId: string, userId: string) => Promise<T>): Promise<T> {
  const user = await requireUser()
  return fn(user.tenantId, user.id)
}
```

```typescript
// features/leads/queries.ts
import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export async function listLeads(opts?: { stage?: string }) {
  return withTenant(async (tenantId) =>
    db.lead.findMany({
      where: { tenantId, stage: opts?.stage, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { assignee: { select: { id: true, fullName: true } } },
    })
  )
}
```

Every query goes through `withTenant`. If you forget, the cross-tenant filter is absent — that's the kind of bug you want to make impossible.

### Pattern 4: Notification dedup

```typescript
// features/notifications/lib/dedup.ts
import { db } from '@/lib/db/prisma'

export async function alreadySentRecently(opts: {
  tenantId: string
  triggerType: string         // e.g. 'payment_due'
  triggerId: string           // e.g. paymentId
  withinHours: number
}) {
  const since = new Date(Date.now() - opts.withinHours * 3_600_000)
  const row = await db.notification.findFirst({
    where: {
      tenantId: opts.tenantId,
      triggerType: opts.triggerType,
      triggerId: opts.triggerId,
      sentAt: { gte: since },
    },
    select: { id: true },
  })
  return row !== null
}
```

This guards against the classic "cron retried and now mom got 5 identical reminders" bug. Always check before sending; always write the `Notification` row on success.

### Pattern 5: Prisma singleton

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

Standard Next.js trick — avoids exhausting Postgres connections during hot reload.

### Pattern 6: Money handling

```typescript
// lib/money.ts
import { Prisma } from '@prisma/client'

const KZT = new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 })

export function formatKzt(value: Prisma.Decimal | number | string): string {
  return KZT.format(typeof value === 'object' ? Number(value.toString()) : Number(value))
}
```

Money columns are `Decimal(12, 2)` in Prisma — never `Float`. See [04-database.md](04-database.md).

### Pattern 7: Server-only auth check

```typescript
// lib/auth/server.ts
import { auth } from '@/auth'                     // NextAuth v5 export
import { redirect } from 'next/navigation'

export async function requireUser() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user                              // contains id, tenantId, role
}
```

Called at the top of every protected `page.tsx` and every Server Action.

## Features → roadmap phase

Which folders exist when:

| Phase | New `features/*` folders |
|---|---|
| 0 — Setup | `auth/`, `tenant/` |
| 1 — Leads | `leads/`, (still just `auth/` + `tenant/` + `leads/`) |
| 2 — Payments & students | `parents/`, `students/`, `payments/`, `notifications/` |
| 3 — Telegram bot for parents | `telegram-bot/` (uses existing `notifications/`, `payments/`) |
| 4 — Schedule (maybe) | `groups/`, `lessons/`, `attendance/` |
| 5 — Multi-tenant SaaS | `analytics/`, tenant signup pages under `app/(public)/` |

When a folder doesn't exist, the feature doesn't exist. Period. No half-built `features/schedule/` lying around.

## Conventions cheat sheet

- Imports use `@/` for the project root (TS path alias in `tsconfig.json`).
- `'use server'` at the top of every `actions.ts`. `'use client'` only on components that need it.
- One Zod schema per shape, in `schemas.ts`. `z.infer<typeof X>` for the type.
- Every mutation: validate → check tenant → mutate → `revalidatePath()`.
- Every read: through `withTenant` (which already pulls the session).
- Money: `Decimal`. Dates: `Asia/Almaty`. Phone: `+7XXXXXXXXXX`. Currency display: `formatKzt()`.
- No `any`. No `// @ts-ignore`. If TypeScript complains, fix the type.
