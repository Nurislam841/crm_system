import { db } from '@/lib/db/prisma'
import { formatKzt } from '@/lib/money'
import { escapeHtml, sendMessage, type TgChatId } from '@/lib/telegram/api'

import { consumeLink } from './tokens'

type TgUpdate = {
  update_id: number
  message?: {
    message_id: number
    from?: { id: number; first_name?: string; username?: string }
    chat: { id: number; type: string }
    text?: string
  }
}

const HELP = [
  '<b>Команды:</b>',
  '/balance — узнать баланс',
  '/help — список команд',
  '',
  'Если вы новый родитель, попросите менеджера выслать вам ссылку для привязки аккаунта.',
].join('\n')

export async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message
  if (!msg || !msg.text) return
  const chatId = msg.chat.id
  const text = msg.text.trim()

  if (text.startsWith('/start')) {
    return handleStart(chatId, text)
  }
  if (text === '/balance' || text.startsWith('/balance@')) {
    return handleBalance(chatId)
  }
  if (text === '/help' || text.startsWith('/help@')) {
    await sendMessage(chatId, HELP, { parse_mode: 'HTML' })
    return
  }
  await sendMessage(
    chatId,
    'Не понимаю команду. Напишите /help.',
  )
}

async function handleStart(chatId: TgChatId, text: string) {
  // /start <token> deeplinks come from t.me/<bot>?start=<token>
  const arg = text.split(/\s+/)[1]
  if (!arg) {
    await sendMessage(
      chatId,
      'Здравствуйте! Этот бот для родителей школы. Привязать аккаунт можно только по одноразовой ссылке от менеджера.',
    )
    return
  }

  const linked = await consumeLink(arg)
  if (!linked) {
    await sendMessage(
      chatId,
      'Ссылка недействительна или истекла. Попросите менеджера выслать новую.',
    )
    return
  }

  await db.parent.update({
    where: { id: linked.parentId },
    data: { telegramChatId: String(chatId) },
  })

  const parent = await db.parent.findUnique({
    where: { id: linked.parentId },
    select: { fullName: true },
  })

  await sendMessage(
    chatId,
    `Готово, ${escapeHtml(parent?.fullName ?? 'добро пожаловать')}! Аккаунт привязан.\n\n${HELP}`,
    { parse_mode: 'HTML' },
  )
}

async function handleBalance(chatId: TgChatId) {
  const parent = await db.parent.findFirst({
    where: { telegramChatId: String(chatId), deletedAt: null },
    include: {
      students: {
        where: { deletedAt: null },
        include: {
          enrollments: {
            where: { endedAt: null },
            include: { course: { select: { name: true } } },
          },
        },
      },
    },
  })
  if (!parent) {
    await sendMessage(
      chatId,
      'Аккаунт не привязан. Попросите менеджера выслать одноразовую ссылку.',
    )
    return
  }

  const payments = await db.payment.findMany({
    where: { tenantId: parent.tenantId, parentId: parent.id },
    select: {
      amount: true,
      paidAt: true,
      dueAt: true,
      refundedAt: true,
      refundedAmount: true,
      enrollment: {
        select: {
          student: { select: { id: true, fullName: true } },
          course: { select: { name: true } },
        },
      },
    },
  })

  const now = Date.now()
  let paid = 0
  let scheduled = 0
  let overdue = 0
  let overdueCount = 0
  const overdueLines: string[] = []
  const upcomingLines: string[] = []

  for (const p of payments) {
    const n = Number(p.amount.toString())
    const refundN = p.refundedAmount ? Number(p.refundedAmount.toString()) : 0
    if (p.refundedAt) {
      paid += n - refundN
    } else if (p.paidAt) {
      paid += n
    } else {
      scheduled += n
      const due = p.dueAt
      const studentName = p.enrollment?.student.fullName ?? ''
      const courseName = p.enrollment?.course.name ?? ''
      const label = `${formatKzt(n)} — до ${due.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'Asia/Almaty',
      })}${studentName ? ` (${escapeHtml(studentName)} · ${escapeHtml(courseName)})` : ''}`
      if (due.getTime() < now) {
        overdue += n
        overdueCount += 1
        overdueLines.push(`❗ ${label}`)
      } else {
        upcomingLines.push(`• ${label}`)
      }
    }
  }

  const lines: string[] = []
  lines.push(`<b>Баланс семьи ${escapeHtml(parent.fullName)}</b>`)
  lines.push('')
  if (overdue > 0) {
    lines.push(`<b>Просрочено: ${formatKzt(overdue)}</b> (${overdueCount})`)
    lines.push(...overdueLines.slice(0, 10))
    lines.push('')
  }
  if (scheduled - overdue > 0) {
    lines.push(`<b>Ожидается:</b> ${formatKzt(scheduled - overdue)}`)
    lines.push(...upcomingLines.slice(0, 10))
    lines.push('')
  }
  lines.push(`<i>Оплачено всего: ${formatKzt(paid)}</i>`)

  if (parent.students.length > 0) {
    lines.push('')
    lines.push('<b>Дети:</b>')
    for (const s of parent.students) {
      const courses = s.enrollments.map((e) => e.course.name).join(', ')
      lines.push(`• ${escapeHtml(s.fullName)}${courses ? ` — ${escapeHtml(courses)}` : ''}`)
    }
  }

  await sendMessage(chatId, lines.join('\n'), {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  })
}
