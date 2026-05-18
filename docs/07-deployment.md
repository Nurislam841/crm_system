# 07 — Deployment

Solo-dev deployment: as simple as it can be while staying credible for a paying customer eventually. Two viable shapes — pick one in week 1 and don't second-guess.

## Two shapes (pick one)

### Shape A — Vercel + managed Postgres (recommended)

- **App**: Vercel (free tier covers Phase 1–3 easily).
- **DB**: Neon, Supabase, or Render Postgres (free or ~$15/mo).
- **Bot**: Telegram webhook → Vercel route (`app/api/telegram/webhook`).
- **Cron**: Vercel Cron triggers `app/api/cron/*` routes.
- **Sentry**: 5-line Next.js integration.

Total monthly cost during Phase 1–3: ~$0–$25.

Strengths: zero infra work. Push-to-deploy. Automatic preview deployments on PRs. SSL handled.

Weaknesses: vendor lock-in (mild — it's still a normal Next.js app), and you eventually pay per usage (irrelevant until ~Phase 5).

### Shape B — Single VPS + docker-compose

- **App**: docker-compose on a $5–10/mo VPS (Hetzner, Linode).
- **DB**: same compose file runs Postgres.
- **Reverse proxy**: Caddy (auto-SSL via Let's Encrypt).
- **Cron**: `crontab` calling `curl` on the cron routes.

```yaml
# docker-compose.yml — Shape B
services:
  app:
    build: .
    env_file: .env
    ports: ["3000:3000"]
    depends_on: [postgres]
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    env_file: .env
    volumes: ["pgdata:/var/lib/postgresql/data"]
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

volumes:
  pgdata: {}
  caddy_data: {}
```

Strengths: full control, predictable cost, no vendor lock-in. Solid choice if your school's data must stay in Kazakhstan.

Weaknesses: you maintain it. SSL renewal works automatically with Caddy, but you still have to upgrade OS, patch Docker, monitor disk. ~30 min/month of overhead in steady state, hours during incidents.

**Recommendation: Shape A.** Time saved on infra in Phase 1–3 is the difference between shipping Phase 1 on schedule and dragging it out.

## Deploy on Day 1 — the rule

The single largest cause of solo-dev project failure is "I'll set up deployment later." Later turns into Friday night before a school launch, finding out your env-var setup doesn't survive `next build` on Vercel.

Day 1 checklist:

- [ ] Repo on GitHub
- [ ] Vercel project (or VPS) connected to the repo
- [ ] Managed Postgres provisioned, `DATABASE_URL` in Vercel env
- [ ] One Prisma migration applied to prod (`Tenant` table only is fine)
- [ ] A `/health` route returning `200` from prod
- [ ] DNS pointing to it with HTTPS

Day 5 of Phase 0 the prod URL shows your login page. Phase 1 week 1 deploys real features into the same pipeline.

## Environment variables

Use `lib/env.ts` with Zod to **crash on boot** if anything is missing — never run with `process.env.X` returning `undefined`.

```typescript
// lib/env.ts
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  CRON_SECRET: z.string().min(20),
  TELEGRAM_BOT_TOKEN: z.string().optional(),       // optional until Phase 3
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  KASPI_API_KEY: z.string().optional(),            // Phase 2+
})

export const env = schema.parse(process.env)
```

`.env.example` mirrors this so a fresh clone can see what's needed.

## Database migration discipline in prod

- Migrations run automatically on deploy via a `postbuild` script: `prisma migrate deploy` (not `migrate dev` — that prompts).
- **Always two deploys for destructive changes** — see [04-database.md](04-database.md).
- Take a manual backup of prod Postgres before a non-trivial migration. Both Neon and Supabase have one-click backups; for VPS, `pg_dump | gzip > backup-YYYYMMDD.sql.gz` to S3 or local disk.

## Monitoring (lightweight)

| Concern | Tool | Setup time |
|---|---|---|
| Crashes & unhandled errors | **Sentry** | 5 min — `@sentry/nextjs init` |
| Slow queries | **Postgres slow query log** | Set `log_min_duration_statement = 500` in DB config |
| Uptime | **UptimeRobot** free tier hitting `/health` every 5 min | 10 min |
| User-visible errors | Top-level `app/(dashboard)/error.tsx` rendering message + Sentry capture | bundled with Sentry setup |

**Deliberately deferred:** ELK, Grafana, Prometheus, Datadog. These exist for ops teams. You don't have one. Reach for them when the school has paying customers and an SLA.

## Backup strategy

- **Database**: daily snapshot retained for 7 days (managed Postgres providers do this by default; verify it's on).
- **Excel imports** (Phase 2 migration): keep the original `.xlsx` files in `scripts/data/` (gitignored if they contain real names) or a private S3 bucket.
- **Code**: in GitHub, so already covered.

Practice a restore once before Phase 2 ships. "We have backups" is not the same as "we can restore."

## CI/CD

GitHub Actions, simplest possible:

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm run typecheck
      - run: pnpm run build
```

No tests step until you have tests. No lint step that blocks merges (lint warnings are fine; lint errors should fail the build because they're not warnings).

Deploy is automatic from Vercel's GitHub integration — no separate deploy job needed.

## Cost ceiling

Phase 1–3 (one school): ~$0–$30/month total.
Phase 4 (if built): same.
Phase 5 (multi-tenant, first paying customer): expect $50–$150/month as users grow — Vercel Pro tier ($20), Postgres ~$25, Sentry growth tier ~$26, the rest is buffer.

If costs run ahead of revenue, you're failing at sales, not at engineering.
