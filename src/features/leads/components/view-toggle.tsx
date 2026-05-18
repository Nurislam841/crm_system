'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Columns3, List } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ViewToggle({ value }: { value: 'kanban' | 'list' }) {
  const router = useRouter()
  const params = useSearchParams()

  function setView(v: 'kanban' | 'list') {
    const next = new URLSearchParams(Array.from(params.entries()))
    if (v === 'kanban') next.delete('view')
    else next.set('view', v)
    const qs = next.toString()
    router.push(qs ? `/leads?${qs}` : '/leads')
  }

  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-sm">
      <Tab active={value === 'kanban'} onClick={() => setView('kanban')}>
        <Columns3 className="size-3.5" />
        Канбан
      </Tab>
      <Tab active={value === 'list'} onClick={() => setView('list')}>
        <List className="size-3.5" />
        Список
      </Tab>
    </div>
  )
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition',
        active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
