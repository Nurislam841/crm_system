import { db } from '@/lib/db/prisma'
import { withTenant } from '@/lib/db/with-tenant'

export async function listMyNotifications(opts: { onlyUnread?: boolean; limit?: number } = {}) {
  return withTenant((tenantId, userId) =>
    db.notification.findMany({
      where: {
        tenantId,
        userId,
        ...(opts.onlyUnread ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
    }),
  )
}

export async function countMyUnread(): Promise<number> {
  return withTenant((tenantId, userId) =>
    db.notification.count({
      where: { tenantId, userId, readAt: null },
    }),
  )
}
