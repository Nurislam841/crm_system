'use client'

import { useActionState, useState } from 'react'
import { Copy, Send, Unlink } from 'lucide-react'

import { Button } from '@/components/ui/button'

import {
  createParentLinkAction,
  unlinkParentTelegramAction,
  type LinkParentState,
} from '../actions'

const DATE_FMT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Almaty',
})

export function LinkParentButton({
  parentId,
  isLinked,
}: {
  parentId: string
  isLinked: boolean
}) {
  const action = createParentLinkAction.bind(null, parentId)
  const [state, formAction, isPending] = useActionState<LinkParentState, FormData>(
    action,
    null,
  )
  const [copied, setCopied] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Скопируйте ссылку:', text)
    }
  }

  async function unlink() {
    if (!confirm('Отвязать Telegram? Родитель перестанет получать уведомления.')) return
    setUnlinking(true)
    try {
      await unlinkParentTelegramAction(parentId)
    } finally {
      setUnlinking(false)
    }
  }

  if (isLinked) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200">
          <Send className="size-3" />
          Telegram привязан
        </span>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={unlink}
          disabled={unlinking}
          title="Отвязать"
        >
          <Unlink />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          <Send />
          {isPending ? 'Создаём ссылку…' : 'Привязать Telegram'}
        </Button>
      </form>

      {state?.ok && (
        <div className="rounded-md border border-border bg-muted/40 p-2 text-xs space-y-1.5">
          <p className="text-muted-foreground">
            Пришлите эту ссылку родителю. Действует до {DATE_FMT.format(new Date(state.expiresAt))}.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-[11px]">
              {state.deeplink}
            </code>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => copy(state.deeplink)}
            >
              <Copy />
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
          </div>
        </div>
      )}
      {state && !state.ok && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {state.message}
        </p>
      )}
    </div>
  )
}
