import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export type SessionUser = {
  id: string
  email: string
  name: string | null
  tenantId: string
  role: 'ADMIN' | 'MANAGER' | 'TEACHER'
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const u = session.user as {
    id?: string
    email?: string
    name?: string | null
    tenantId?: string
    role?: SessionUser['role']
  }
  if (!u.id || !u.email || !u.tenantId || !u.role) redirect('/login')
  return { id: u.id, email: u.email, name: u.name ?? null, tenantId: u.tenantId, role: u.role }
}
