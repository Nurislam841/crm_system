import type { LeadStage } from '@prisma/client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { STAGE_LABEL_RU, STAGE_TONE } from '../lib/stages'

const TONE_CLASS: Record<'neutral' | 'progress' | 'success' | 'danger', string> = {
  neutral: 'bg-muted text-foreground',
  progress: 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200',
  success: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
  danger: 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200',
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <Badge variant="secondary" className={cn(TONE_CLASS[STAGE_TONE[stage]], 'border-none')}>
      {STAGE_LABEL_RU[stage]}
    </Badge>
  )
}
