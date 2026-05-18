'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'
import { formatKzt } from '@/lib/money'
import { notifyManagers } from '@/features/notifications/lib/notify'

import {
  markPaidSchema,
  recordPaymentSchema,
  refundPaymentSchema,
  schedulePaymentSchema,
  updatePaymentSchema,
} from './schemas'

export type PaymentFormState =
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

async function validateParent(tenantId: string, parentId: string) {
  return db.parent.findFirst({
    where: { id: parentId, tenantId, deletedAt: null },
    select: { id: true },
  })
}

async function validateEnrollment(
  tenantId: string,
  enrollmentId: string | undefined,
) {
  if (!enrollmentId) return true
  const e = await db.enrollment.findFirst({
    where: { id: enrollmentId, tenantId },
    select: { id: true },
  })
  return e !== null
}

export async function recordPaymentAction(
  parentId: string,
  _prev: PaymentFormState,
  form: FormData,
): Promise<PaymentFormState> {
  const user = await requireUser()
  const parsed = recordPaymentSchema.safeParse({
    parentId,
    amount: form.get('amount'),
    paidAt: form.get('paidAt'),
    method: form.get('method'),
    enrollmentId: form.get('enrollmentId'),
    reference: form.get('reference'),
    notes: form.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const parentRow = await db.parent.findFirst({
    where: { id: parentId, tenantId: user.tenantId, deletedAt: null },
    select: { id: true, fullName: true },
  })
  if (!parentRow) return { ok: false, message: 'Семья не найдена' }
  if (!(await validateEnrollment(user.tenantId, parsed.data.enrollmentId))) {
    return { ok: false, fieldErrors: { enrollmentId: 'Зачисление не найдено' } }
  }

  const payment = await db.payment.create({
    data: {
      tenantId: user.tenantId,
      parentId,
      amount: parsed.data.amount.toFixed(2),
      paidAt: parsed.data.paidAt,
      dueAt: parsed.data.paidAt,
      method: parsed.data.method,
      enrollmentId: parsed.data.enrollmentId ?? null,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
    },
  })

  await notifyManagers({
    tenantId: user.tenantId,
    type: 'PAYMENT_RECEIVED',
    title: `Платёж: ${parentRow.fullName} · ${formatKzt(parsed.data.amount)}`,
    body: parsed.data.method ? `Метод: ${parsed.data.method}` : null,
    link: `/parents/${parentId}`,
    triggerType: 'Payment',
    triggerId: payment.id,
    excludeUserId: user.id,
  })

  revalidatePath(`/parents/${parentId}`)
  revalidatePath('/payments')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function schedulePaymentAction(
  parentId: string,
  _prev: PaymentFormState,
  form: FormData,
): Promise<PaymentFormState> {
  const user = await requireUser()
  const parsed = schedulePaymentSchema.safeParse({
    parentId,
    amount: form.get('amount'),
    dueAt: form.get('dueAt'),
    enrollmentId: form.get('enrollmentId'),
    notes: form.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }

  const parent = await validateParent(user.tenantId, parentId)
  if (!parent) return { ok: false, message: 'Семья не найдена' }
  if (!(await validateEnrollment(user.tenantId, parsed.data.enrollmentId))) {
    return { ok: false, fieldErrors: { enrollmentId: 'Зачисление не найдено' } }
  }

  await db.payment.create({
    data: {
      tenantId: user.tenantId,
      parentId,
      amount: parsed.data.amount.toFixed(2),
      dueAt: parsed.data.dueAt,
      paidAt: null,
      enrollmentId: parsed.data.enrollmentId ?? null,
      notes: parsed.data.notes ?? null,
    },
  })

  revalidatePath(`/parents/${parentId}`)
  revalidatePath('/payments')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function markPaidAction(input: {
  paymentId: string
  paidAt?: string
  method: string
  reference?: string
}) {
  const user = await requireUser()
  const parsed = markPaidSchema.safeParse({
    paymentId: input.paymentId,
    paidAt: input.paidAt ?? new Date(),
    method: input.method,
    reference: input.reference,
  })
  if (!parsed.success) return { ok: false as const, message: 'Некорректные данные' }

  const payment = await db.payment.findFirst({
    where: { id: parsed.data.paymentId, tenantId: user.tenantId },
    select: {
      id: true,
      parentId: true,
      amount: true,
      paidAt: true,
      parent: { select: { fullName: true } },
    },
  })
  if (!payment) return { ok: false as const, message: 'Платёж не найден' }
  const wasUnpaid = !payment.paidAt

  await db.payment.update({
    where: { id: payment.id },
    data: {
      paidAt: parsed.data.paidAt,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
    },
  })

  if (wasUnpaid) {
    await notifyManagers({
      tenantId: user.tenantId,
      type: 'PAYMENT_RECEIVED',
      title: `Платёж: ${payment.parent.fullName} · ${formatKzt(payment.amount)}`,
      body: parsed.data.method ? `Метод: ${parsed.data.method}` : null,
      link: `/parents/${payment.parentId}`,
      triggerType: 'Payment',
      triggerId: payment.id,
      excludeUserId: user.id,
    })
  }

  revalidatePath(`/parents/${payment.parentId}`)
  revalidatePath('/payments')
  revalidatePath('/dashboard')
  return { ok: true as const }
}

export async function deletePaymentAction(paymentId: string) {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    return { ok: false as const, message: 'Удалять платежи может только администратор' }
  }
  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId: user.tenantId },
    select: {
      id: true,
      parentId: true,
      amount: true,
      parent: { select: { fullName: true } },
    },
  })
  if (!payment) return { ok: false as const, message: 'Платёж не найден' }
  await db.payment.delete({ where: { id: paymentId } })

  await notifyManagers({
    tenantId: user.tenantId,
    type: 'PAYMENT_DELETED',
    title: `Удалён платёж: ${payment.parent.fullName} · ${formatKzt(payment.amount)}`,
    body: `Удалил(а): ${user.email}`,
    link: `/parents/${payment.parentId}`,
    triggerType: 'PaymentDeletion',
    triggerId: `${payment.id}:${Date.now()}`,
    excludeUserId: user.id,
  })

  revalidatePath(`/parents/${payment.parentId}`)
  revalidatePath('/payments')
  return { ok: true as const }
}

export async function updatePaymentAction(
  paymentId: string,
  _prev: PaymentFormState,
  form: FormData,
): Promise<PaymentFormState> {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    return { ok: false, message: 'Редактировать платежи может только администратор' }
  }
  const parsed = updatePaymentSchema.safeParse({
    paymentId,
    amount: form.get('amount'),
    dueAt: form.get('dueAt'),
    paidAt: form.get('paidAt'),
    method: form.get('method'),
    reference: form.get('reference'),
    notes: form.get('notes'),
  })
  if (!parsed.success) {
    return { ok: false, fieldErrors: flatten(parsed.error) }
  }
  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId: user.tenantId },
    select: {
      id: true,
      parentId: true,
      amount: true,
      parent: { select: { fullName: true } },
    },
  })
  if (!payment) return { ok: false, message: 'Платёж не найден' }

  const prevAmount = Number(payment.amount.toString())
  const newAmount = parsed.data.amount

  await db.payment.update({
    where: { id: paymentId },
    data: {
      amount: newAmount.toFixed(2),
      dueAt: parsed.data.dueAt,
      paidAt: parsed.data.paidAt ?? null,
      method: parsed.data.method ?? null,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
    },
  })

  if (prevAmount !== newAmount) {
    await notifyManagers({
      tenantId: user.tenantId,
      type: 'PAYMENT_EDITED',
      title: `Сумма изменена: ${payment.parent.fullName}`,
      body: `Было ${formatKzt(prevAmount)} → стало ${formatKzt(newAmount)}. ${user.email}`,
      link: `/parents/${payment.parentId}`,
      triggerType: 'PaymentEdit',
      triggerId: `${payment.id}:${Date.now()}`,
      excludeUserId: user.id,
    })
  }

  revalidatePath(`/parents/${payment.parentId}`)
  revalidatePath('/payments')
  return { ok: true }
}

export async function refundPaymentAction(
  paymentId: string,
  _prev: PaymentFormState,
  form: FormData,
): Promise<PaymentFormState> {
  try {
    const user = await requireUser()
    if (user.role !== 'ADMIN') {
      return { ok: false, message: 'Возврат может оформить только администратор' }
    }
    const parsed = refundPaymentSchema.safeParse({
      paymentId,
      refundedAmount: form.get('refundedAmount'),
      refundedAt: form.get('refundedAt'),
      refundReason: form.get('refundReason'),
    })
    if (!parsed.success) {
      return { ok: false, fieldErrors: flatten(parsed.error) }
    }

    const payment = await db.payment.findFirst({
      where: { id: paymentId, tenantId: user.tenantId },
      select: {
        id: true,
        parentId: true,
        amount: true,
        paidAt: true,
        refundedAt: true,
        parent: { select: { fullName: true } },
      },
    })
    if (!payment) return { ok: false, message: 'Платёж не найден' }
    if (!payment.paidAt) {
      return { ok: false, message: 'Возврат возможен только для оплаченного платежа' }
    }
    if (payment.refundedAt) {
      return { ok: false, message: 'Этот платёж уже возвращён' }
    }
    const max = Number(payment.amount.toString())
    if (parsed.data.refundedAmount > max) {
      return {
        ok: false,
        fieldErrors: { refundedAmount: `Не больше ${max}` },
      }
    }

    await db.payment.update({
      where: { id: paymentId },
      data: {
        refundedAt: parsed.data.refundedAt,
        refundedAmount: parsed.data.refundedAmount.toFixed(2),
        refundReason: parsed.data.refundReason ?? null,
      },
    })

    await notifyManagers({
      tenantId: user.tenantId,
      type: 'PAYMENT_REFUNDED',
      title: `Возврат: ${payment.parent.fullName} · ${formatKzt(parsed.data.refundedAmount)}`,
      body: parsed.data.refundReason ?? `Оформил(а): ${user.email}`,
      link: `/parents/${payment.parentId}`,
      triggerType: 'PaymentRefund',
      triggerId: payment.id,
      excludeUserId: user.id,
    })

    revalidatePath(`/parents/${payment.parentId}`)
    revalidatePath('/payments')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    console.error('[refundPaymentAction]', e)
    const msg = e instanceof Error ? e.message : 'Не удалось оформить возврат'
    return { ok: false, message: msg }
  }
}
