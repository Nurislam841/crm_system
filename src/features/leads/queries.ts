import type { LeadStage, Prisma } from '@prisma/client'

import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export type LeadListItem = Prisma.LeadGetPayload<{
  include: { assignee: { select: { id: true; fullName: true } } }
}>

export async function listLeads(opts: { stage?: LeadStage } = {}) {
  return withTenant<LeadListItem[]>((tenantId) =>
    db.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(opts.stage ? { stage: opts.stage } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { assignee: { select: { id: true, fullName: true } } },
    }),
  )
}

export async function getLead(id: string) {
  return withTenant<LeadListItem | null>((tenantId) =>
    db.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { assignee: { select: { id: true, fullName: true } } },
    }),
  )
}

export async function countLeadsByStage() {
  return withTenant<Record<LeadStage, number>>(async (tenantId) => {
    const rows = await db.lead.groupBy({
      by: ['stage'],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    })
    const result = {
      NEW: 0,
      CONTACTED: 0,
      TRIAL_BOOKED: 0,
      TRIAL_DONE: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0,
    } as Record<LeadStage, number>
    for (const row of rows) result[row.stage] = row._count._all
    return result
  })
}
