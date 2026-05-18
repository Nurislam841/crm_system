import { NextResponse } from 'next/server'

import { handleUpdate } from '@/features/telegram-bot/lib/handlers'

// Telegram retries on non-2xx. Always 200 once we've accepted the update —
// errors get logged but don't trigger retry storms.

export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { secret } = await params
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  // Optional header double-check
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token')
  if (headerSecret && headerSecret !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: unknown
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    await handleUpdate(update as Parameters<typeof handleUpdate>[0])
  } catch (e) {
    console.error('[telegram webhook]', e)
  }
  return NextResponse.json({ ok: true })
}
