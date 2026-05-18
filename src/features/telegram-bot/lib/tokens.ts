import { randomBytes } from 'node:crypto'

import { db } from '@/lib/db/prisma'

const TOKEN_BYTES = 16 // 22-char base64url
const TTL_HOURS = 72

export function makeLinkToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export async function createParentLink(args: {
  tenantId: string
  parentId: string
}): Promise<{ token: string; expiresAt: Date }> {
  const token = makeLinkToken()
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000)
  await db.telegramLink.create({
    data: {
      tenantId: args.tenantId,
      parentId: args.parentId,
      token,
      expiresAt,
    },
  })
  return { token, expiresAt }
}

export async function consumeLink(token: string): Promise<{
  parentId: string
  tenantId: string
} | null> {
  const link = await db.telegramLink.findUnique({ where: { token } })
  if (!link) return null
  if (link.consumedAt) return null
  if (link.expiresAt.getTime() < Date.now()) return null

  await db.telegramLink.update({
    where: { id: link.id },
    data: { consumedAt: new Date() },
  })
  return { parentId: link.parentId, tenantId: link.tenantId }
}
