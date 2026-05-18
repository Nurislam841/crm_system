import type { Prisma } from '@prisma/client'

import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export type PaymentRow = Prisma.PaymentGetPayload<{
  include: {
    parent: { select: { id: true; fullName: true; phone: true } }
    enrollment: {
      include: {
        student: { select: { id: true; fullName: true } }
        course: { select: { id: true; name: true } }
      }
    }
  }
}>

export async function listPaymentsForParent(parentId: string) {
  return withTenant<PaymentRow[]>((tenantId) =>
    db.payment.findMany({
      where: { tenantId, parentId },
      orderBy: [{ paidAt: 'asc' }, { dueAt: 'desc' }],
      include: {
        parent: { select: { id: true, fullName: true, phone: true } },
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true } },
            course: { select: { id: true, name: true } },
          },
        },
      },
    }),
  )
}

export type ParentBalance = {
  paidTotal: number
  scheduledTotal: number
  overdueTotal: number
  overdueCount: number
}

export async function getParentBalance(parentId: string): Promise<ParentBalance> {
  return withTenant(async (tenantId) => {
    const rows = await db.payment.findMany({
      where: { tenantId, parentId },
      select: { amount: true, paidAt: true, dueAt: true },
    })
    const now = Date.now()
    let paid = 0,
      scheduled = 0,
      overdue = 0,
      overdueCount = 0
    for (const r of rows) {
      const n = Number(r.amount.toString())
      if (r.paidAt) {
        paid += n
      } else {
        scheduled += n
        if (r.dueAt.getTime() < now) {
          overdue += n
          overdueCount += 1
        }
      }
    }
    return {
      paidTotal: paid,
      scheduledTotal: scheduled,
      overdueTotal: overdue,
      overdueCount,
    }
  })
}

export type PaymentFilter = 'overdue' | 'this_week' | 'this_month' | 'paid_this_month' | 'all'

export async function listPayments(filter: PaymentFilter = 'all'): Promise<PaymentRow[]> {
  return withTenant<PaymentRow[]>((tenantId) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay() // 0 (Sun) - 6 (Sat)
    const diff = day === 0 ? -6 : 1 - day
    startOfWeek.setDate(startOfWeek.getDate() + diff)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    let where: Prisma.PaymentWhereInput = { tenantId }
    let orderBy: Prisma.PaymentOrderByWithRelationInput = { dueAt: 'asc' }

    switch (filter) {
      case 'overdue':
        where = { tenantId, paidAt: null, dueAt: { lt: now } }
        break
      case 'this_week':
        where = {
          tenantId,
          paidAt: null,
          dueAt: { gte: startOfWeek, lt: endOfWeek },
        }
        break
      case 'this_month':
        where = {
          tenantId,
          paidAt: null,
          dueAt: { gte: startOfMonth, lt: startOfNextMonth },
        }
        break
      case 'paid_this_month':
        where = {
          tenantId,
          paidAt: { gte: startOfMonth, lt: startOfNextMonth },
        }
        orderBy = { paidAt: 'desc' }
        break
    }

    return db.payment.findMany({
      where,
      orderBy,
      take: 200,
      include: {
        parent: { select: { id: true, fullName: true, phone: true } },
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true } },
            course: { select: { id: true, name: true } },
          },
        },
      },
    })
  })
}

export async function paymentStats() {
  return withTenant(async (tenantId) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [overdue, dueThisMonth, paidThisMonth] = await Promise.all([
      db.payment.aggregate({
        where: { tenantId, paidAt: null, dueAt: { lt: now } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.payment.aggregate({
        where: {
          tenantId,
          paidAt: null,
          dueAt: { gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.payment.aggregate({
        where: { tenantId, paidAt: { gte: startOfMonth, lt: startOfNextMonth } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ])
    const toNum = (v: Prisma.Decimal | null) => (v ? Number(v.toString()) : 0)
    return {
      overdueAmount: toNum(overdue._sum.amount),
      overdueCount: overdue._count._all,
      dueThisMonthAmount: toNum(dueThisMonth._sum.amount),
      dueThisMonthCount: dueThisMonth._count._all,
      paidThisMonthAmount: toNum(paidThisMonth._sum.amount),
      paidThisMonthCount: paidThisMonth._count._all,
    }
  })
}
