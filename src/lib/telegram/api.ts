const API_BASE = 'https://api.telegram.org/bot'

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  return t
}

type TgResponse<T> = { ok: true; result: T } | { ok: false; description: string }

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${token()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as TgResponse<T>
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description}`)
  }
  return json.result
}

export type TgChatId = number | string

export async function sendMessage(
  chatId: TgChatId,
  text: string,
  opts: { parse_mode?: 'HTML' | 'MarkdownV2'; disable_web_page_preview?: boolean } = {},
) {
  return call<{ message_id: number }>('sendMessage', {
    chat_id: chatId,
    text,
    ...opts,
  })
}

export async function getMe() {
  return call<{ id: number; username: string; first_name: string }>('getMe', {})
}

export async function setWebhook(url: string, secretToken?: string) {
  return call<true>('setWebhook', {
    url,
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
  })
}

export async function deleteWebhook() {
  return call<true>('deleteWebhook', {})
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
