'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser()
  await db.notification.updateMany({
    where: {
      id: notificationId,
      tenantId: user.tenantId,
      userId: user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  })
  revalidatePath('/notifications')
  revalidatePath('/dashboard')
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser()
  await db.notification.updateMany({
    where: {
      tenantId: user.tenantId,
      userId: user.id,
      readAt: null,
    },
    data: { readAt: new Date() },
  })
  revalidatePath('/notifications')
  revalidatePath('/dashboard')
}
