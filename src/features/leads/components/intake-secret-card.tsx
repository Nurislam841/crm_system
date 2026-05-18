'use client'

import { useState, useTransition } from 'react'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { regenerateIntakeSecretAction } from '../actions'

export function IntakeSecretCard({
  initialSecret,
  intakeUrl,
}: {
  initialSecret: string
  intakeUrl: string
}) {
  const [secret, setSecret] = useState(initialSecret)
  const [revealed, setRevealed] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState<'secret' | 'curl' | null>(null)

  function regenerate() {
    if (!confirm('Сгенерировать новый секрет? Старый перестанет работать.')) return
    startTransition(async () => {
      const res = await regenerateIntakeSecretAction()
      if (res.ok) {
        setSecret(res.secret)
        setRevealed(true)
      } else {
        alert(res.message)
      }
    })
  }

  function copy(value: string, kind: 'secret' | 'curl') {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const masked = '•'.repeat(Math.min(secret.length, 32))
  const curl = makeCurl(intakeUrl, secret)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Intake URL (вставить в action формы на сайте)
        </label>
        <div className="flex gap-2">
          <Input readOnly value={intakeUrl} className="font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(intakeUrl, 'curl')}
            title="Скопировать"
          >
            <Copy />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Секрет (header <span className="font-mono">X-Intake-Secret</span>)
        </label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={revealed ? secret : masked}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealed((v) => !v)}
            title={revealed ? 'Скрыть' : 'Показать'}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(secret, 'secret')}
            title="Скопировать"
          >
            <Copy />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={regenerate}
            disabled={isPending}
            title="Сгенерировать новый секрет"
          >
            <RefreshCw />
            {isPending ? 'Меняем…' : 'Заменить'}
          </Button>
        </div>
        {copied === 'secret' && (
          <p className="text-xs text-emerald-600">Секрет скопирован</p>
        )}
        {copied === 'curl' && (
          <p className="text-xs text-emerald-600">Скопировано</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Пример curl
        </label>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
          <code>{curl}</code>
        </pre>
      </div>
    </div>
  )
}

function makeCurl(url: string, secret: string) {
  return [
    `curl -X POST '${url}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'X-Intake-Secret: ${secret}' \\`,
    `  -d '{`,
    `    "parentName": "Айбек Алимов",`,
    `    "parentPhone": "+77001234567",`,
    `    "childName": "Алина",`,
    `    "childAge": 9,`,
    `    "source": "WEBSITE",`,
    `    "notes": "Хочет на курсы английского, утро"`,
    `  }'`,
  ].join('\n')
}
