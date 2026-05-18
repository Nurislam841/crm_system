import { db } from '@/lib/db/prisma'

import { logActivity } from './activity'

/**
 * Idempotent: ensures a Parent row exists for a WON-stage lead.
 * Reuses an existing Parent (by tenant+phone) if present.
 * Sets Lead.convertedParentId on success.
 */
export async function ensureParentForLead(args: {
  tenantId: string
  leadId: string
  actorUserId: string
}): Promise<{ parentId: string; created: boolean } | null> {
  const lead = await db.lead.findFirst({
    where: { id: args.leadId, tenantId: args.tenantId, deletedAt: null },
    select: {
      id: true,
      parentName: true,
      parentPhone: true,
      parentEmail: true,
      acquisitionSource: true,
      convertedParentId: true,
    },
  })
  if (!lead) return null
  if (lead.convertedParentId) {
    return { parentId: lead.convertedParentId, created: false }
  }

  const existing = await db.parent.findFirst({
    where: { tenantId: args.tenantId, phone: lead.parentPhone, deletedAt: null },
    select: { id: true },
  })

  let parentId: string
  let created = false
  if (existing) {
    parentId = existing.id
  } else {
    const parent = await db.parent.create({
      data: {
        tenantId: args.tenantId,
        fullName: lead.parentName,
        phone: lead.parentPhone,
        email: lead.parentEmail ?? null,
        acquisitionSource: lead.acquisitionSource,
      },
    })
    parentId = parent.id
    created = true
  }

  await db.lead.update({
    where: { id: lead.id },
    data: { convertedParentId: parentId },
  })

  await logActivity({
    tenantId: args.tenantId,
    leadId: lead.id,
    authorId: args.actorUserId,
    type: 'converted_to_parent',
    payload: { parentId, reused: !created },
  })

  return { parentId, created }
}
