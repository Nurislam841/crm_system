'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

import { LEAD_STAGES, STAGE_LABEL_RU } from '../lib/stages'

export function StageFilter({ counts }: { counts: Record<string, number> }) {
  const router = useRouter()
  const params = useSearchParams()
  const active = params.get('stage') ?? ''

  function setStage(value: string) {
    const next = new URLSearchParams(Array.from(params.entries()))
    if (value) next.set('stage', value)
    else next.delete('stage')
    const qs = next.toString()
    router.push(qs ? `/leads?${qs}` : '/leads')
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="flex flex-wrap gap-1.5 text-sm">
      <Chip active={active === ''} onClick={() => setStage('')}>
        Все <span className="text-muted-foreground">{total}</span>
      </Chip>
      {LEAD_STAGES.map((s) => (
        <Chip key={s} active={active === s} onClick={() => setStage(s)}>
          {STAGE_LABEL_RU[s]} <span className="text-muted-foreground">{counts[s] ?? 0}</span>
        </Chip>
      ))}
    </div>
  )
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition',
        active
          ? 'border-foreground/30 bg-foreground text-background'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
