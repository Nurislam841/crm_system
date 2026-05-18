# 05 — Backend Patterns

How code is actually written in this project. Each pattern has a one-paragraph "what" and a "why" — the why is what keeps you from drifting back into REST + service classes when you're tired.

## Mutations: always a Server Action

Every state change is a function in `features/X/actions.ts` with `'use server'` at the top. Called directly from forms or other server code. No REST route. No `fetch`.

**Why.** A REST route + `fetch` is two layers of `JSON.stringify`/`parse`, an HTTP round-trip, and two places to keep types in sync. A Server Action is a plain async function the bundler turns into an RPC. Same network cost, half the code, all the types.

**Skeleton:**

```typescript
// features/X/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/prisma'
import { requireUser } from '@/lib/auth/server'
import { fooSchema } from './schemas'

export async function createFoo(input: unknown) {
  const user = await requireUser()                           // auth
  const data = fooSchema.parse(input)                        // validate
  // ... business rule checks (dedup, allowance, etc.)
  const foo = await db.foo.create({                          // tenant-scoped mutation
    data: { ...data, tenantId: user.tenantId },
  })
  revalidatePath('/foos')                                    // cache bust
  return { ok: true, id: foo.id }
}
```

`app/api/` is reserved for **webhooks and public endpoints** (Telegram webhook, public form intake, cron triggers). Anything called from your own UI is a Server Action.

## Reads: always tenant-scoped

Every `queries.ts` function calls `withTenant` (which pulls the session) and filters by `tenantId`.

```typescript
// features/leads/queries.ts
import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export async function listLeads(opts: { stage?: string } = {}) {
  return withTenant((tenantId) =>
    db.lead.findMany({
      where: { tenantId, stage: opts.stage, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  )
}
```

**Why a wrapper instead of "just remember to filter."** Forgetting `tenantId` in *one* query in Phase 5 leaks one school's data to another. The wrapper makes the omission a compile error because there's no other way to get a tenantId in scope.

For the rare query that intentionally crosses tenants (e.g., Phase 5 admin "list all tenants"), use `db` directly with a comment explaining why.

## Validation: Zod schemas co-located with the feature

One Zod schema per shape, in `features/X/schemas.ts`. Reused by the client form (`react-hook-form` + `zodResolver`) and the Server Action (`schema.parse(input)`). Type derived via `z.infer<typeof X>`.

**Why.** The form and the action have to agree on what's valid. Two definitions drift; one definition can't.

## Auth: NextAuth (Auth.js v5), DB-backed sessions

```typescript
// auth.ts (project root)
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'database' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await db.user.findFirst({
          where: { email: c.email as string, deletedAt: null },
        })
        if (!user) return null
        const ok = await bcrypt.compare(c.password as string, user.passwordHash)
        return ok ? { id: user.id, email: user.email, tenantId: user.tenantId, role: user.role } : null
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.tenantId = (user as any).tenantId
      session.user.role = (user as any).role
      return session
    },
  },
})
```

**Why DB sessions, not JWT.** Server Actions need to invalidate a compromised session immediately. JWTs can't be revoked without a denylist, which is just a worse DB session. Postgres handles session reads in microseconds at this scale — the "JWT is faster" argument doesn't apply.

## Notifications: send through one service, always with dedup

```typescript
// features/notifications/actions.ts
'use server'

import { db } from '@/lib/db/prisma'
import { alreadySentRecently } from './lib/dedup'
import { sendTelegram } from './channels/telegram'

type SendInput = {
  tenantId: string
  channel: 'telegram' | 'sms' | 'email'
  recipientType: 'parent' | 'user'
  recipientId: string
  triggerType: string                 // 'payment_due'
  triggerId: string                   // payment.id
  payload: Record<string, unknown>
  dedupHours?: number                 // default 24
}

export async function send(input: SendInput) {
  if (await alreadySentRecently({ ...input, withinHours: input.dedupHours ?? 24 })) {
    return { ok: true, skipped: 'duplicate' as const }
  }

  switch (input.channel) {
    case 'telegram':
      await sendTelegram(input)
      break
    // case 'sms': ...
    // case 'email': ...
  }

  await db.notification.create({
    data: {
      tenantId: input.tenantId,
      channel: input.channel,
      recipientType: input.recipientType,
      recipientId: input.recipientId,
      triggerType: input.triggerType,
      triggerId: input.triggerId,
      payload: input.payload,
      sentAt: new Date(),
      status: 'sent',
    },
  })

  return { ok: true }
}
```

**Why a single funnel.** Every notification goes through `send()`, every send gets a `Notification` row, every row has the dedup keys. That's the audit log, the dedup index, and the rate-limiter all in one. Bypassing this function (sending to Telegram directly from another action) is the bug that produces 5-identical-messages-at-3am, so don't.

## Cron / background work: a Vercel cron route + plain functions

```typescript
// app/api/cron/payment-reminders/route.ts
import { dueWithin } from '@/features/payments/queries'
import { send } from '@/features/notifications/actions'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 })
  }

  const upcoming = await dueWithin({ hours: 48 })
  for (const p of upcoming) {
    await send({
      tenantId: p.tenantId,
      channel: 'telegram',
      recipientType: 'parent',
      recipientId: p.parentId,
      triggerType: 'payment_due',
      triggerId: p.id,
      payload: { amount: p.amount.toString(), dueAt: p.dueAt.toISOString() },
    })
  }

  return Response.json({ ok: true, count: upcoming.length })
}
```

Scheduled via `vercel.json` `crons` — no separate worker process. Dedup makes retries safe.

**Why not a queue / `pg-boss` / BullMQ yet.** A cron + dedup handles "send overdue reminders" cleanly. The day you actually have backpressure (10s of thousands of notifications per minute), introduce a queue. Until then, that's a tool whose only effect is consuming evenings.

## Telegram bot: webhook + handler dispatcher

```typescript
// app/api/telegram/webhook/route.ts
import { bot } from '@/features/telegram-bot/bot'

export async function POST(req: Request) {
  const update = await req.json()
  await bot.handleUpdate(update)
  return new Response('ok')
}
```

Handlers live in `features/telegram-bot/handlers/*.ts`. Each one calls into normal `features/*/queries.ts` and `features/notifications/actions.ts` — bot logic doesn't duplicate business logic, it consumes it.

**Linking a Telegram chat to a `Parent` row** happens once: the parent receives a unique link from a manager → opens the bot → bot stores `chatId → parentId` mapping on `Parent.telegramChatId`. After that, the bot resolves the parent from `chatId` on every message.

## Security: what's already handled vs. what you must do

| Concern | Handled by | What you still do |
|---|---|---|
| SQL injection | Prisma parameterized queries | Nothing. Don't ever use `$queryRawUnsafe` with user input. |
| XSS in JSX | React auto-escapes | Don't use `dangerouslySetInnerHTML` with user input. |
| CSRF | Server Actions sign+verify a token automatically | Nothing — but only because Server Actions handle it. If you add a public `app/api/` POST endpoint, **you** verify origin / token there. |
| Password storage | `bcryptjs` in auth | Set `BCRYPT_ROUNDS=12` in env. |
| Rate limiting | Not built in | Add Upstash rate limit or `@vercel/firewall` rules in front of `app/api/lead-intake/` (public) and `app/api/telegram/webhook/` (signed by Telegram secret). |
| Tenant isolation | `withTenant` wrapper | Never use raw `db.X.findMany({ where: { ... } })` without tenantId. Code review your own queries with that question in mind. |
| Session theft | DB sessions, HTTPS-only cookies | Set `Secure`, `HttpOnly`, `SameSite=Lax` on session cookies (NextAuth does this by default; verify after deploy). |

## Errors: throw, don't return

```typescript
// lib/errors.ts
export class NotFoundError extends Error { status = 404 }
export class ForbiddenError extends Error { status = 403 }
export class ConflictError extends Error { status = 409 }
```

Server Actions throw these; a top-level error UI (`app/(dashboard)/error.tsx`) renders the message. Don't smuggle `{ ok: false, error: '...' }` everywhere — `try { result = await action(...) } catch { ... }` is shorter and more honest.

**Exception:** validation errors return `{ ok: false, fieldErrors: ... }` so the form can render per-field messages without an unhandled-promise red banner.

## Testing strategy (write it later, not now)

Phase 1 is not the time to set up Vitest. The whole app is small enough that you can manually test every page in 10 minutes. Add tests when:

1. **Bug regressions** — a real bug, a test pinning the fix. One test per real bug; never speculative.
2. **Phase 2 payments arithmetic** — `installments[]` summing to `totalAmount`, balance math. These are pure functions; they cost nothing to test and breaking them costs the school real money.
3. **Phase 3 dedup logic** — once notifications are real, the dedup helper is the kind of thing you absolutely want a test on.

Skip "we should have 80% coverage" as a goal. You don't have 80% time.

## Audit log

Every `Notification` row is an audit event for outbound messages. For state changes (stage moves, payment recorded), use `LeadActivity` and similar per-feature activity tables. Don't build a generic `AuditLog` table until you actually need to search across all changes — premature genericness is its own bug source.
