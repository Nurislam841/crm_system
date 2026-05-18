# 01 — Context

## The business

A private school — **500+ active students, 5+ managers**. This is a working business, not a startup MVP. It already has revenue, real operational pain, and customers (parents) who can't wait for a 6-month rewrite.

## The pain points (what we're actually solving)

| Pain | Reality today | Why it hurts |
|---|---|---|
| **Lead intake from 3 channels** | Instagram DMs, website form, inbound Telegram — managed in heads + scattered chats | Leads get lost or worked twice by two managers |
| **No accountability across 5 managers** | "Who's handling this family?" answered by Slack message or memory | Slow follow-up = lost conversions |
| **Payments + installments in Excel** | One sheet, 500 rows, manual reconciliation, monthly chaos | One typo can swallow a payment; no audit trail |
| **Schedule on 500 students** | Google Calendar / Excel hybrid | Replacements, conflicts, attendance untracked |
| **Parent communication** | Manual: managers message parents one-by-one about payments, replacements, schedule changes | Doesn't scale; reminders forgotten; parents complain |

## The constraints (what shapes every decision)

1. **Solo developer.** One person builds and maintains. No tickets for "someone else." Every architectural choice is judged by *can I ship this alone and still keep the school running*.
2. **The school can't pause.** Migration is incremental. Excel and the new system run side-by-side until each module is trusted.
3. **Budget is operating cash, not VC.** No K8s, no Kafka, no 5-service microservice circus. One Next.js app on one server (or Vercel) until that's actually the bottleneck.
4. **End goal: sell as SaaS to other schools.** Hence multi-tenant from day 1 — but the first tenant is the home school, and that's all that exists for the first 5 months.

## Principles that fall out of these constraints

These are non-negotiable and reappear in [Architecture](02-architecture.md), [Project Structure](03-project-structure.md), [Roadmap](06-roadmap.md):

- **Incremental migration, never a big bang.** Each phase replaces one Excel sheet at a time. Old and new co-exist.
- **Telegram bot replaces a native mobile app for parents.** Parents want: schedule, balance, reminders, "message the manager." All four ship in a bot in ~2 weeks vs. ~4 months for React Native. Native is deferred to Phase 4+ at the earliest, and probably never for parents.
- **Server Actions over REST.** No `/api/leads/create` + `fetch` from the form — just `async function createLead(data) { 'use server' }` called directly. ~30% less code.
- **Telegram intake for inbound leads, not WhatsApp Business API.** Meta approval takes weeks, paid per message, template-restricted. Telegram bot ships in 2 days. WhatsApp Business is a Phase 5 problem.
- **Deploy on Day 1, not Day 35.** Prod env, DNS, env vars, migrations — all working in week 1, before any feature is real. Distributes the pain over 5 weeks instead of jamming it into the last 3 days.
- **Show a manager the system on week 3.** Ugly UI is fine. One hour of their feedback saves a week of building the wrong thing.
- **Honest about Phase 4 (schedule).** Scheduling 500 students with groups, replacements, attendance is an LMS — ~2 months of work. Seriously consider keeping Google Calendar for scheduling and only recording *enrollment* in the CRM. Saves the MVP by 6–8 weeks.

## Why a custom build at all

Existing CRMs (AmoCRM, Bitrix24) don't model **parent ↔ student ↔ payment** correctly. They think every contact is a customer. For a school:

- The **decision-maker** (parent) and the **service recipient** (student) are different people.
- One parent often has **2–3 students** in the school — important for sibling discounts and a unified balance.
- **Notifications** and **invoices** go to the parent. **Attendance** is recorded on the student.
- A **lead** is a parent inquiring about lessons for a child — neither a generic "contact" nor a "company deal."

This data shape is core to the school's workflow and isn't reachable by configuring a generic CRM. So we build it.
