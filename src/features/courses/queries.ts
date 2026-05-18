import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export async function listCourses(opts: { includeArchived?: boolean } = {}) {
  return withTenant((tenantId) =>
    db.course.findMany({
      where: {
        tenantId,
        ...(opts.includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [{ archivedAt: 'asc' }, { name: 'asc' }],
    }),
  )
}

export async function getCourse(id: string) {
  return withTenant((tenantId) =>
    db.course.findFirst({
      where: { id, tenantId },
    }),
  )
}
