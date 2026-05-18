import type { Prisma } from '@prisma/client'

import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export type ParentListItem = Prisma.ParentGetPayload<{
  include: { _count: { select: { students: true } } }
}>

export type ParentDetail = Prisma.ParentGetPayload<{
  include: {
    students: {
      include: {
        enrollments: {
          include: { course: { select: { id: true; name: true } } }
        }
      }
    }
  }
}>

export async function listParents() {
  return withTenant<ParentListItem[]>((tenantId) =>
    db.parent.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { students: true } } },
    }),
  )
}

export async function getParent(id: string) {
  return withTenant<ParentDetail | null>((tenantId) =>
    db.parent.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        students: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            enrollments: {
              where: { endedAt: null },
              include: { course: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
  )
}

export async function countParents() {
  return withTenant((tenantId) =>
    db.parent.count({ where: { tenantId, deletedAt: null } }),
  )
}
