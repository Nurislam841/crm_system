'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Wallet,
  CalendarDays,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  phase?: number
}

const mainItems: NavItem[] = [
  { label: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Лиды', href: '/leads', icon: Users },
  { label: 'Платежи', href: '/payments', icon: Wallet, phase: 2 },
  { label: 'Ученики', href: '/students', icon: GraduationCap, phase: 2 },
  { label: 'Расписание', href: '/schedule', icon: CalendarDays, phase: 4 },
]

const systemItems: NavItem[] = [
  { label: 'Аналитика', href: '/analytics', icon: BarChart3, phase: 5 },
  { label: 'Настройки', href: '/settings', icon: Settings, phase: 5 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="flex h-14 items-center px-5">
        <Link href="/dashboard" className="text-sm font-semibold">
          School CRM
        </Link>
      </div>
      <nav className="flex-1 space-y-6 px-3 py-3">
        <NavSection title="Главное" items={mainItems} pathname={pathname} />
        <NavSection title="Система" items={systemItems} pathname={pathname} />
      </nav>
      <div className="border-t border-sidebar-border px-5 py-3 text-xs text-muted-foreground">
        Phase 0 · v0.1
      </div>
    </aside>
  )
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string
  items: NavItem[]
  pathname: string
}) {
  return (
    <div>
      <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return <NavLinkItem key={item.href} item={item} active={active} />
        })}
      </ul>
    </div>
  )
}

function NavLinkItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  const disabled = item.phase !== undefined

  const inner = (
    <span
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm',
        active && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
        !active && !disabled && 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
        disabled && 'text-sidebar-foreground/40 cursor-not-allowed',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.phase !== undefined && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          P{item.phase}
        </span>
      )}
    </span>
  )

  if (disabled) {
    return (
      <li aria-disabled="true" title={`Появится на этапе ${item.phase}`}>
        {inner}
      </li>
    )
  }

  return (
    <li>
      <Link href={item.href}>{inner}</Link>
    </li>
  )
}
