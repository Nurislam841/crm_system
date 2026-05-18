import { db } from '@/lib/db/prisma'

export type NotifyInput = {
  tenantId: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  triggerType: string
  triggerId: string
  excludeUserId?: string | null
}

export async function notifyManagers(input: NotifyInput) {
  const recipients = await db.user.findMany({
    where: {
      tenantId: input.tenantId,
      deletedAt: null,
      role: { in: ['ADMIN', 'MANAGER'] },
      ...(input.excludeUserId ? { NOT: { id: input.excludeUserId } } : {}),
    },
    select: { id: true },
  })
  if (recipients.length === 0) return

  await db.notification.createMany({
    data: recipients.map((u) => ({
      tenantId: input.tenantId,
      userId: u.id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      triggerType: input.triggerType,
      triggerId: input.triggerId,
    })),
    skipDuplicates: true,
  })
}

export async function notifyUser(input: NotifyInput & { userId: string }) {
  try {
    await db.notification.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        triggerType: input.triggerType,
        triggerId: input.triggerId,
      },
    })
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === 'P2002'
    ) {
      return
    }
    throw e
  }
}
