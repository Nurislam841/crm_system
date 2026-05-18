import Link from 'next/link'
import { Bell } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countMyUnread } from '../queries'

export async function NotificationBell() {
  const unread = await countMyUnread()
  return (
    <Link
      href="/notifications"
      aria-label={`Уведомления${unread > 0 ? ` (${unread} непрочитанных)` : ''}`}
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'relative')}
    >
      <Bell />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
