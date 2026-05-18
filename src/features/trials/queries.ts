import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export async function listTrialsForLead(leadId: string) {
  return withTenant((tenantId) =>
    db.trialLesson.findMany({
      where: { tenantId, leadId },
      orderBy: { scheduledAt: 'desc' },
    }),
  )
}
