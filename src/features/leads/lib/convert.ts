import { db } from '@/lib/db/prisma'

import { logActivity } from './activity'

/**
 * Idempotent: ensures a Parent row exists for a WON-stage lead.
 * - Reuses an existing Parent (by tenant + phone) if present.
 * - Sets Lead.convertedParentId on success.
 * - Also auto-creates a Student under that Parent if the lead has childName
 *   and no student with the same name already exists for that parent.
 */
export async function ensureParentForLead(args: {
  tenantId: string
  leadId: string
  actorUserId: string
}): Promise<{
  parentId: string
  created: boolean
  studentCreated: boolean
} | null> {
  const lead = await db.lead.findFirst({
    where: { id: args.leadId, tenantId: args.tenantId, deletedAt: null },
    select: {
      id: true,
      parentName: true,
      parentPhone: true,
      parentEmail: true,
      childName: true,
      childAge: true,
      acquisitionSource: true,
      convertedParentId: true,
    },
  })
  if (!lead) return null

  // 1) Parent: reuse-or-create
  let parentId: string
  let created = false
  if (lead.convertedParentId) {
    parentId = lead.convertedParentId
  } else {
    const existing = await db.parent.findFirst({
      where: {
        tenantId: args.tenantId,
        phone: lead.parentPhone,
        deletedAt: null,
      },
      select: { id: true },
    })
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
  }

  // 2) Student: auto-create from lead.childName if provided and not duplicated
  let studentCreated = false
  if (lead.childName && lead.childName.trim().length > 0) {
    const normalized = lead.childName.trim()
    const dup = await db.student.findFirst({
      where: {
        tenantId: args.tenantId,
        parentId,
        deletedAt: null,
        fullName: { equals: normalized, mode: 'insensitive' },
      },
      select: { id: true },
    })
    if (!dup) {
      await db.student.create({
        data: {
          tenantId: args.tenantId,
          parentId,
          fullName: normalized,
          notes: lead.childAge ? `Возраст из лида: ${lead.childAge}` : null,
        },
      })
      studentCreated = true
    }
  }

  return { parentId, created, studentCreated }
}
