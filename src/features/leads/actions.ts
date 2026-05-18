'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { findExistingByPhone } from './lib/dedup'
import { createLeadSchema, updateLeadSchema } from './schemas'

export type LeadFormState =
  | null
  | {
      ok: false
      message?: string
      fieldErrors?: Partial<Record<string, string>>
      duplicateOfId?: string
    }
  | { ok: true }

function readForm(form: FormData) {
  return {
    parentName: form.get('parentName'),
    parentPhone: form.get('parentPhone'),
    parentEmail: form.get('parentEmail'),
    childName: form.get('childName'),
    childAge: form.get('childAge'),
    acquisitionSource: form.get('acquisitionSource'),
    notes: form.get('notes'),
    stage: form.get('stage'),
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
  const parsed = createLeadSchema.safeParse(readForm(form))
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
  const parsed = updateLeadSchema.safeParse(readForm(form))
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const existing = await db.lead.findFirst({
    where: { id, tenantId: user.tenantId, deletedAt: null },
    select: { id: true, parentPhone: true },
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
    },
  })

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
