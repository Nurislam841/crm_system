import { db } from '@/lib/db/prisma'

export async function findExistingByPhone(tenantId: string, parentPhone: string) {
  return db.lead.findFirst({
    where: { tenantId, parentPhone, deletedAt: null },
    select: { id: true, parentName: true, stage: true, createdAt: true },
  })
}
