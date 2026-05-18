# 06 — Roadmap

Six phases. ~5–7 months solo at ~5 days/week. Sequenced so the school gets value at the end of every phase, not just at the end.

## Phase overview

| Phase | What | Duration | School-visible result |
|---|---|---|---|
| 0 | Setup: Next.js + Prisma + auth + base schema | 1 wk | Login works; empty dashboard |
| 1 | Lead funnel: intake → kanban → trial → contract | 4–6 wk | Managers live in the system; no more lost leads |
| 2 | Payments, installments, students (migrate Excel) | 4–5 wk | Transparent finances; reconciled monthly |
| 3 | Telegram bot for parents + auto-reminders | 2–3 wk | Parents pay on time; manager workload drops |
| 4 | Schedule: groups, lessons, attendance (maybe) | 6–10 wk | Full operations — or skip, see warning below |
| 5 | Analytics, multi-tenant signup, billing | 4–6 wk | Ready to sell to other schools |

**Total: 5–7 months** before there's something to sell to other schools. That's honest. Anyone promising 3 is either much better than you, or lying.

## Honest warning about Phase 4

Scheduling 500 students with groups, teacher replacements, attendance, and parent visibility is **not a CRM feature — it's an LMS module**. Two months of work on its own.

**Hard question to answer before starting:** can Google Calendar (or the current spreadsheet) keep doing scheduling, while the CRM only tracks *enrollment* (which student is in which course)? If yes, **skip Phase 4 entirely** and go straight to Phase 5. This shaves 1.5–2 months off time-to-SaaS.

The cost of building schedule yourself is 6–10 weeks of solo dev time that doesn't make the school any more sellable. The cost of *not* building it is teachers using two tools. For a 500-student school where teachers are already using two tools, this is usually the right trade.

## Phase 0 — Setup (1 week)

Goal: a deployable Next.js app that someone can log in to.

| Day | Done by EOD |
|---|---|
| 1 | `npx create-next-app@latest`, `pnpm add prisma @prisma/client zod next-auth bcryptjs`, `.env.example`, repo on GitHub |
| 2 | Prisma schema for `Tenant`, `User`, `Session`. `prisma migrate dev --name init`. Seed `my_school` tenant + admin user |
| 3 | NextAuth credentials provider, `/login` page, `/` redirect, `requireUser()` helper |
| 4 | Vercel deploy (or VPS + docker-compose), managed Postgres connected, env vars set, prod login works |
| 5 | shadcn/ui init, basic dashboard layout, sidebar with empty links |

**Acceptance:** you can `git push` and 90 seconds later your school admin can log in at the prod URL. Even if the dashboard is empty.

## Phase 1 — Lead funnel (5 weeks, week-by-week)

Goal: 5 managers move all their lead handling into the system.

| Week | Focus | EOW result |
|---|---|---|
| 1 | Foundation: Next.js + Prisma + auth (= finish Phase 0 if it slipped) | Login + empty dashboard live in prod |
| 2 | `features/leads`: schemas, `createLead`, `updateLead`, lead list page, lead detail page | Manager can manually create + edit a lead from their phone |
| 3 | Kanban view, lead activities (call/note logging), assignment, follow-up reminder field | Manager *lives* in the system for one day, sees the value, gives feedback |
| 4 | Public intake: `app/api/lead-intake` (website form), Telegram inbound capture, dedup by phone | Leads from all 3 channels land in the funnel automatically |
| 5 | Trial-lesson booking, "won" → creates `Parent`, polish based on week-3 feedback, manager rollout | All 5 managers using the system in production |

### Phase 1 hard rules

- **Show a manager the UI on week 3.** Not week 4, not week 5. Their feedback in an hour saves you a week of building the wrong kanban interaction.
- **Deploy to prod on week 1.** "I'll deploy when it's ready" turns into 3 lost days when env vars and ESM/CJS configs collide on day 35.
- **Don't build the perfect kanban.** Drag-and-drop is week-2 polish, not week-2 must-have. A `<select>` for stage is acceptable in week 2 and gone by week 3.

## Phase 2 — Payments, installments, students (4–5 weeks)

Goal: kill the Excel sheet. Every payment, every installment, every student is in the CRM.

| Week | Focus |
|---|---|
| 1 | Schema: `Parent`, `Student`, `Course`, `Enrollment`, `Payment`, `InstallmentPlan`. Migration script importing the current Excel data |
| 2 | `features/payments`: record-payment action, balance query, monthly statement view |
| 3 | Installment plans: create plan from `Enrollment`, auto-generate `Payment` rows for each due date |
| 4 | Parent profile page (all students, balance, history). `features/notifications` shell — sending only to managers in-app initially |
| 5 | Reconciliation tools (mark paid, fix wrong amount, refund), permissions on financial actions, run side-by-side with Excel for one billing cycle |

**Acceptance:** at the end of one full billing cycle (a month), the CRM's totals match Excel's totals. From the next month, Excel is read-only / archived.

## Phase 3 — Telegram bot for parents (2–3 weeks)

Goal: parents get reminders + can self-serve balance / schedule queries.

| Week | Focus |
|---|---|
| 1 | `features/telegram-bot`: bot instance, webhook route, link-parent flow (parent receives one-time link from manager), `/balance` command |
| 2 | `/schedule` command (Phase 4 dependent — until then "Connect with Google Calendar"), "Talk to manager" command (forwards to a manager Telegram group), payment-due reminder cron with dedup |
| 3 | Polish, edge cases (parent has 2 kids, balance per child), rollout to first 20 parents, then all |

**Acceptance:** after rollout to all parents, manual reminder messages from managers drop to near zero.

## Phase 4 — Schedule (6–10 weeks, skip if possible)

If you've decided to keep Google Calendar: skip to Phase 5.

If building it: scope tightly. The cheapest version is **planned lessons + attendance + parent visibility**, *not* replacement workflows, *not* teacher availability, *not* room booking. Add those only after the school proves the cheap version isn't enough.

```
features/groups/        # create, edit, list groups (Group + GroupMember)
features/lessons/       # weekly lesson plans, attendance
features/attendance/    # marking, parent-facing absence reports
```

## Phase 5 — Multi-tenant SaaS (4–6 weeks)

Goal: a second school can sign up and use the system in isolation.

| Week | Focus |
|---|---|
| 1 | `app/(public)/` signup flow → creates new `Tenant` + first admin. Domain or subdomain routing |
| 2 | Tenant isolation test suite — write the queries that *should* return nothing across tenants, verify they do |
| 3 | Billing: Stripe (international) + Kaspi (KZ) integration, `TenantSubscription` + `TenantInvoice` tables |
| 4 | Onboarding: import-from-Excel UI, first-tenant-experience polish, marketing landing |
| 5–6 | First paying tenant pilot |

## Execution rules (apply every phase)

1. **One PR per feature, mergeable in a day.** "Big bang refactor PRs" are how a solo dev burns 2 weeks and ships nothing.
2. **Deploy after every merge.** If deploy is hard, fix deploy first. See [07-deployment.md](07-deployment.md).
3. **Migration goes out *before* the code that needs it.** Two deploys: add column → start writing to it. Removes the "code expects column that doesn't exist yet" rollback class of bugs.
4. **Talk to a manager every 2 weeks.** Not "demo session." A 30-min "what's annoying right now" call.
5. **Track your own tasks in plain markdown** in the repo (`TODO.md` or GitHub issues). Don't build yourself a task manager.

## What "done" looks like

End of Phase 1 — managers have stopped using their previous chat-based lead tracking entirely.
End of Phase 2 — the Excel sheet is read-only, archived.
End of Phase 3 — manual reminder messages from managers drop ~90%.
End of Phase 5 — there's a second tenant in production paying you money.
