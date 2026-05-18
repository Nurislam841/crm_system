'use server'

import { revalidatePath } from 'next/cache'

import { logActivity } from '@/features/leads/lib/activity'
import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { bookTrialSchema, setTrialStatusSchema } from './schemas'

export type TrialFormState =
  | null
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>> }
  | { ok: true }

function flatten(error: import('zod').ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function bookTrialAction(
  leadId: string,
  _prev: TrialFormState,
  form: FormData,
): Promise<TrialFormState> {
  const user = await requireUser()
  const parsed = bookTrialSchema.safeParse({
    scheduledAt: form.get('scheduledAt'),
    notes: form.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId: user.tenantId, deletedAt: null },
    select: { id: true, stage: true },
  })
  if (!lead) return { ok: false, message: 'Лид не найден' }

  const trial = await db.trialLesson.create({
    data: {
      tenantId: user.tenantId,
      leadId,
      scheduledAt: parsed.data.scheduledAt,
      notes: parsed.data.notes ?? null,
      status: 'BOOKED',
    },
  })

  // Auto-hint: if lead is still NEW or CONTACTED, advance to TRIAL_BOOKED
  if (lead.stage === 'NEW' || lead.stage === 'CONTACTED') {
    await db.lead.update({
      where: { id: leadId },
      data: { stage: 'TRIAL_BOOKED' },
    })
    await logActivity({
      tenantId: user.tenantId,
      leadId,
      authorId: user.id,
      type: 'stage_changed',
      payload: { from: lead.stage, to: 'TRIAL_BOOKED', reason: 'trial_booked' },
    })
  }

  await logActivity({
    tenantId: user.tenantId,
    leadId,
    authorId: user.id,
    type: 'trial_booked',
    payload: {
      trialId: trial.id,
      scheduledAt: trial.scheduledAt.toISOString(),
    },
  })

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
  return { ok: true }
}

export async function setTrialStatusAction(input: { trialId: string; status: string }) {
  const user = await requireUser()
  const parsed = setTrialStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, message: 'Некорректные данные' }
  }

  const trial = await db.trialLesson.findFirst({
    where: { id: parsed.data.trialId, tenantId: user.tenantId },
    select: { id: true, leadId: true, status: true },
  })
  if (!trial) return { ok: false as const, message: 'Пробный не найден' }
  if (trial.status === parsed.data.status) return { ok: true as const }

  await db.trialLesson.update({
    where: { id: trial.id },
    data: { status: parsed.data.status },
  })

  await logActivity({
    tenantId: user.tenantId,
    leadId: trial.leadId,
    authorId: user.id,
    type: 'trial_status_changed',
    payload: { trialId: trial.id, from: trial.status, to: parsed.data.status },
  })

  // Auto-hint: BOOKED → DONE bumps the lead to TRIAL_DONE if it's still TRIAL_BOOKED
  if (parsed.data.status === 'DONE') {
    const lead = await db.lead.findFirst({
      where: { id: trial.leadId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, stage: true },
    })
    if (lead && lead.stage === 'TRIAL_BOOKED') {
      await db.lead.update({
        where: { id: lead.id },
        data: { stage: 'TRIAL_DONE' },
      })
      await logActivity({
        tenantId: user.tenantId,
        leadId: lead.id,
        authorId: user.id,
        type: 'stage_changed',
        payload: { from: 'TRIAL_BOOKED', to: 'TRIAL_DONE', reason: 'trial_done' },
      })
    }
  }

  revalidatePath(`/leads/${trial.leadId}`)
  revalidatePath('/leads')
  return { ok: true as const }
}
