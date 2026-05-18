import { requireUser } from '@/lib/auth/server'

export async function withTenant<T>(
  fn: (tenantId: string, userId: string) => Promise<T>,
): Promise<T> {
  const user = await requireUser()
  return fn(user.tenantId, user.id)
}
