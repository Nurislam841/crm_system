'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

type FilterValue = 'all' | 'overdue' | 'this_week' | 'this_month' | 'paid_this_month'

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'overdue', label: 'Просроченные' },
  { value: 'this_week', label: 'На этой неделе' },
  { value: 'this_month', label: 'В этом месяце' },
  { value: 'paid_this_month', label: 'Получено в этом месяце' },
  { value: 'all', label: 'Все' },
]

export function PaymentFilterChips({ active }: { active: FilterValue }) {
  const router = useRouter()
  const params = useSearchParams()

  function set(value: FilterValue) {
    const next = new URLSearchParams(Array.from(params.entries()))
    if (value === 'overdue') next.delete('filter')
    else next.set('filter', value)
    const qs = next.toString()
    router.push(qs ? `/payments?${qs}` : '/payments')
  }

  return (
    <div className="flex flex-wrap gap-1.5 text-sm">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => set(f.value)}
          className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-1 text-xs transition',
            active === f.value
              ? 'border-foreground/30 bg-foreground text-background'
              : 'border-border bg-background text-foreground hover:bg-muted',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
