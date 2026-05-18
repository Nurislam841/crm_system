'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { createPlanSchema } from './schemas'

export type PlanFormState =
  | null
  | { ok: false; message?: string; fieldErrors?: Partial<Record<string, string>> }
  | { ok: true; planId: string }

function flatten(error: import('zod').ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

function addMonths(base: Date, months: number) {
  // preserve calendar day where possible (e.g., due day = 1 → always 1st)
  const day = base.getDate()
  const d = new Date(base)
  d.setDate(1) // avoid month overflow when target month is shorter
  d.setMonth(d.getMonth() + months)
  const daysInTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, daysInTarget))
  return d
}

export async function createPlanAction(
  _prev: PlanFormState,
  form: FormData,
): Promise<PlanFormState> {
  try {
    const user = await requireUser()
    const parsed = createPlanSchema.safeParse({
      enrollmentId: form.get('enrollmentId'),
      monthlyAmount: form.get('monthlyAmount'),
      installments: form.get('installments'),
      firstDueAt: form.get('firstDueAt'),
    })
    if (!parsed.success) {
      return { ok: false, fieldErrors: flatten(parsed.error) }
    }

    const enrollment = await db.enrollment.findFirst({
      where: {
        id: parsed.data.enrollmentId,
        tenantId: user.tenantId,
        endedAt: null,
      },
      include: { student: { select: { parentId: true } } },
    })
    if (!enrollment) {
      return { ok: false, message: 'Зачисление не найдено или уже завершено' }
    }

    const monthly = parsed.data.monthlyAmount
    const count = parsed.data.installments
    const total = (monthly * count).toFixed(2)
    const amountStr = monthly.toFixed(2)
    const firstDue = parsed.data.firstDueAt

    // Build N Payment rows + one InstallmentPlan inside a transaction
    const result = await db.$transaction(async (tx) => {
      const plan = await tx.installmentPlan.create({
        data: {
          tenantId: user.tenantId,
          enrollmentId: enrollment.id,
          totalAmount: total,
          installments: count,
        },
      })
      for (let i = 0; i < count; i++) {
        await tx.payment.create({
          data: {
            tenantId: user.tenantId,
            parentId: enrollment.student.parentId,
            enrollmentId: enrollment.id,
            planId: plan.id,
            amount: amountStr,
            dueAt: addMonths(firstDue, i),
            paidAt: null,
            notes: `Рассрочка ${i + 1}/${count}`,
          },
        })
      }
      return plan
    })

    revalidatePath(`/parents/${enrollment.student.parentId}`)
    revalidatePath('/payments')
    return { ok: true, planId: result.id }
  } catch (e) {
    console.error('[createPlanAction]', e)
    const msg = e instanceof Error ? e.message : 'Не удалось создать рассрочку'
    return { ok: false, message: msg }
  }
}

export async function cancelPlanAction(planId: string) {
  try {
    const user = await requireUser()
    const plan = await db.installmentPlan.findFirst({
      where: { id: planId, tenantId: user.tenantId },
      include: { enrollment: { include: { student: { select: { parentId: true } } } } },
    })
    if (!plan) return { ok: false as const, message: 'План не найден' }
    // Delete only UNPAID payments tied to this plan. Paid ones stay as history.
    await db.payment.deleteMany({
      where: {
        tenantId: user.tenantId,
        planId: plan.id,
        paidAt: null,
      },
    })
    await db.installmentPlan.delete({ where: { id: plan.id } })
    revalidatePath(`/parents/${plan.enrollment.student.parentId}`)
    revalidatePath('/payments')
    return { ok: true as const }
  } catch (e) {
    console.error('[cancelPlanAction]', e)
    return { ok: false as const, message: 'Не удалось отменить план' }
  }
}
