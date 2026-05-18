import { LogOut } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { signOut } from '@/auth'

export function Topbar({ email, role }: { email: string; role: string }) {
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-5">
      <div className="text-sm text-muted-foreground">{labelForRole(role)}</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 text-sm">
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-foreground sm:inline">{email}</span>
        </div>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            <LogOut />
            Выйти
          </Button>
        </form>
      </div>
    </header>
  )
}

function labelForRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'Администратор школы'
    case 'MANAGER':
      return 'Менеджер'
    case 'TEACHER':
      return 'Преподаватель'
    default:
      return role
  }
}
