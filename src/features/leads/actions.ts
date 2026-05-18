'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'
import { notifyUser } from '@/features/notifications/lib/notify'

import { logActivity } from './lib/activity'
import { ensureParentForLead } from './lib/convert'
import { findExistingByPhone } from './lib/dedup'
import { makeIntakeSecret } from './lib/intake'
import {
  addActivitySchema,
  createLeadSchema,
  moveStageSchema,
  updateLeadSchema,
} from './schemas'

export type LeadFormState =
  | null
  | {
      ok: false
      message?: string
      fieldErrors?: Partial<Record<string, string>>
      duplicateOfId?: string
    }
  | { ok: true }

function readCreateForm(form: FormData) {
  return {
    parentName: form.get('parentName'),
    parentPhone: form.get('parentPhone'),
    parentEmail: form.get('parentEmail'),
    childName: form.get('childName'),
    childAge: form.get('childAge'),
    acquisitionSource: form.get('acquisitionSource'),
    notes: form.get('notes'),
  }
}

function readUpdateForm(form: FormData) {
  return {
    ...readCreateForm(form),
    stage: form.get('stage'),
    assignedTo: form.get('assignedTo'),
    nextContactAt: form.get('nextContactAt'),
  }
}

function flatten(error: import('zod').ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function createLeadAction(
  _prev: LeadFormState,
  form: FormData,
): Promise<LeadFormState> {
  const user = await requireUser()
  const parsed = createLeadSchema.safeParse(readCreateForm(form))
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const dup = await findExistingByPhone(user.tenantId, parsed.data.parentPhone)
  if (dup) {
    return {
      ok: false,
      message: `Лид с этим номером уже есть: ${dup.parentName}`,
      duplicateOfId: dup.id,
    }
  }

  const lead = await db.lead.create({
    data: {
      tenantId: user.tenantId,
      parentName: parsed.data.parentName,
      parentPhone: parsed.data.parentPhone,
      parentEmail: parsed.data.parentEmail ?? null,
      childName: parsed.data.childName ?? null,
      childAge: parsed.data.childAge ?? null,
      acquisitionSource: parsed.data.acquisitionSource,
      notes: parsed.data.notes ?? null,
      stage: 'NEW',
      assignedTo: user.id,
    },
  })

  await logActivity({
    tenantId: user.tenantId,
    leadId: lead.id,
    authorId: user.id,
    type: 'lead_created',
    payload: { source: parsed.data.acquisitionSource },
  })

  revalidatePath('/leads')
  revalidatePath('/dashboard')
  redirect(`/leads/${lead.id}`)
}

export async function updateLeadAction(
  id: string,
  _prev: LeadFormState,
  form: FormData,
): Promise<LeadFormState> {
  const user = await requireUser()
  const parsed = updateLeadSchema.safeParse(readUpdateForm(form))
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const existing = await db.lead.findFirst({
    where: { id, tenantId: user.tenantId, deletedAt: null },
    select: {
      id: true,
      parentPhone: true,
      stage: true,
      assignedTo: true,
      nextContactAt: true,
    },
  })
  if (!existing) return { ok: false, message: 'Лид не найден' }

  if (existing.parentPhone !== parsed.data.parentPhone) {
    const dup = await findExistingByPhone(user.tenantId, parsed.data.parentPhone)
    if (dup && dup.id !== id) {
      return {
        ok: false,
        message: `Другой лид уже использует этот номер: ${dup.parentName}`,
        duplicateOfId: dup.id,
      }
    }
  }

  if (parsed.data.assignedTo) {
    const assignee = await db.user.findFirst({
      where: {
        id: parsed.data.assignedTo,
        tenantId: user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (!assignee) {
      return {
        ok: false,
        fieldErrors: { assignedTo: 'Сотрудник не найден в этой школе' },
      }
    }
  }

  await db.lead.update({
    where: { id },
    data: {
      parentName: parsed.data.parentName,
      parentPhone: parsed.data.parentPhone,
      parentEmail: parsed.data.parentEmail ?? null,
      childName: parsed.data.childName ?? null,
      childAge: parsed.data.childAge ?? null,
      acquisitionSource: parsed.data.acquisitionSource,
      notes: parsed.data.notes ?? null,
      stage: parsed.data.stage,
      assignedTo: parsed.data.assignedTo ?? null,
      nextContactAt: parsed.data.nextContactAt ?? null,
    },
  })

  if (existing.stage !== parsed.data.stage) {
    await logActivity({
      tenantId: user.tenantId,
      leadId: id,
      authorId: user.id,
      type: 'stage_changed',
      payload: { from: existing.stage, to: parsed.data.stage },
    })
    if (parsed.data.stage === 'WON') {
      await ensureParentForLead({
        tenantId: user.tenantId,
        leadId: id,
        actorUserId: user.id,
      })
    }
  }
  if ((existing.assignedTo ?? null) !== (parsed.data.assignedTo ?? null)) {
    await logActivity({
      tenantId: user.tenantId,
      leadId: id,
      authorId: user.id,
      type: 'assignment_changed',
      payload: {
        fromUserId: existing.assignedTo ?? null,
        toUserId: parsed.data.assignedTo ?? null,
      },
    })
    if (parsed.data.assignedTo && parsed.data.assignedTo !== user.id) {
      await notifyUser({
        tenantId: user.tenantId,
        userId: parsed.data.assignedTo,
        type: 'LEAD_ASSIGNED',
        title: `Назначен лид: ${parsed.data.parentName}`,
        body: parsed.data.childName
          ? `Ребёнок: ${parsed.data.childName}`
          : `Телефон: ${parsed.data.parentPhone}`,
        link: `/leads/${id}`,
        triggerType: 'LeadAssignment',
        triggerId: `${id}:${parsed.data.assignedTo}:${Date.now()}`,
      })
    }
  }
  const prevAt = existing.nextContactAt?.toISOString() ?? null
  const nextAt = parsed.data.nextContactAt?.toISOString() ?? null
  if (prevAt !== nextAt) {
    await logActivity({
      tenantId: user.tenantId,
      leadId: id,
      authorId: user.id,
      type: 'next_contact_set',
      payload: { at: nextAt },
    })
  }

  revalidatePath('/leads')
  revalidatePath(`/leads/${id}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function deleteLeadAction(id: string) {
  const user = await requireUser()
  await db.lead.updateMany({
    where: { id, tenantId: user.tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidatePath('/leads')
  redirect('/leads')
}

export type AddActivityState =
  | null
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>> }
  | { ok: true }

export async function addActivityAction(
  leadId: string,
  _prev: AddActivityState,
  form: FormData,
): Promise<AddActivityState> {
  const user = await requireUser()
  const parsed = addActivitySchema.safeParse({
    type: form.get('type'),
    body: form.get('body'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId: user.tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!lead) return { ok: false, message: 'Лид не найден' }

  await logActivity({
    tenantId: user.tenantId,
    leadId,
    authorId: user.id,
    type: parsed.data.type,
    payload: { body: parsed.data.body },
  })

  revalidatePath(`/leads/${leadId}`)
  return { ok: true }
}

export async function moveLeadStageAction(input: { leadId: string; stage: string }) {
  const user = await requireUser()
  const parsed = moveStageSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, message: 'Некорректные данные' }
  }
  const existing = await db.lead.findFirst({
    where: { id: parsed.data.leadId, tenantId: user.tenantId, deletedAt: null },
    select: { id: true, stage: true },
  })
  if (!existing) return { ok: false as const, message: 'Лид не найден' }
  if (existing.stage === parsed.data.stage) return { ok: true as const }

  await db.lead.update({
    where: { id: parsed.data.leadId },
    data: { stage: parsed.data.stage },
  })
  await logActivity({
    tenantId: user.tenantId,
    leadId: parsed.data.leadId,
    authorId: user.id,
    type: 'stage_changed',
    payload: { from: existing.stage, to: parsed.data.stage },
  })
  if (parsed.data.stage === 'WON') {
    await ensureParentForLead({
      tenantId: user.tenantId,
      leadId: parsed.data.leadId,
      actorUserId: user.id,
    })
  }
  revalidatePath('/leads')
  revalidatePath(`/leads/${parsed.data.leadId}`)
  return { ok: true as const }
}

export async function regenerateIntakeSecretAction() {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    return { ok: false as const, message: 'Только администратор может менять секрет' }
  }
  const secret = makeIntakeSecret()
  await db.tenant.update({
    where: { id: user.tenantId },
    data: { intakeSecret: secret },
  })
  revalidatePath('/leads/intake')
  return { ok: true as const, secret }
}
