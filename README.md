# School CRM

Internal CRM for a private school (500+ students, 5+ managers), built solo and designed to be sold as a multi-tenant SaaS once the home school is running on it.

## Stack

- **Web**: Next.js 15 (App Router + Server Actions)
- **DB**: PostgreSQL + Prisma
- **Parent-facing**: Telegram bot (no native mobile app — saves ~3.5 months vs. React Native)
- **Multi-tenant from day 1**: `tenantId` on every business table
- **Locale**: KZT, Asia/Almaty, Kaspi in payment providers

## Documentation

| # | Doc | Read it when… |
|---|---|---|
| 01 | [Context](docs/01-context.md) | You forgot why this project exists or who it serves |
| 02 | [Architecture](docs/02-architecture.md) | You're about to make a stack/structural decision |
| 03 | **[Project Structure](docs/03-project-structure.md)** | **You're writing or reading code — this is the file you'll re-open most** |
| 04 | [Database](docs/04-database.md) | You're touching the schema or writing a query |
| 05 | [Backend Patterns](docs/05-backend-patterns.md) | You're writing a Server Action, query, or feature module |
| 06 | [Roadmap](docs/06-roadmap.md) | You need to decide what to build next |
| 07 | [Deployment](docs/07-deployment.md) | You're setting up env / deploy / monitoring |
| 08 | [Business Model](docs/08-business-model.md) | Tenant onboarding, billing, AI roadmap |

## Status

Greenfield. Docs in place; implementation starts at Phase 0 (Setup) — see [roadmap](docs/06-roadmap.md).
