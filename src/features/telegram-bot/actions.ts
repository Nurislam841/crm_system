'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/server'
import { db } from '@/lib/db/prisma'

import { createParentLink } from './lib/tokens'

export type LinkParentState =
  | null
  | { ok: false; message: string }
  | { ok: true; deeplink: string; expiresAt: string }

export async function createParentLinkAction(
  parentId: string,
  _prev: LinkParentState,
  _form: FormData,
): Promise<LinkParentState> {
  try {
    const user = await requireUser()
    const parent = await db.parent.findFirst({
      where: { id: parentId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!parent) return { ok: false, message: 'Семья не найдена' }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME
    if (!botUsername) {
      return {
        ok: false,
        message: 'TELEGRAM_BOT_USERNAME не настроен в .env',
      }
    }

    const { token, expiresAt } = await createParentLink({
      tenantId: user.tenantId,
      parentId,
    })
    const deeplink = `https://t.me/${botUsername}?start=${token}`

    revalidatePath(`/parents/${parentId}`)
    return { ok: true, deeplink, expiresAt: expiresAt.toISOString() }
  } catch (e) {
    console.error('[createParentLinkAction]', e)
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Не удалось создать ссылку',
    }
  }
}

export async function unlinkParentTelegramAction(parentId: string) {
  const user = await requireUser()
  await db.parent.updateMany({
    where: { id: parentId, tenantId: user.tenantId, deletedAt: null },
    data: { telegramChatId: null },
  })
  revalidatePath(`/parents/${parentId}`)
  return { ok: true as const }
}
