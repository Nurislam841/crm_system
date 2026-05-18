'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { loginSchema } from './schemas'

export type LoginState = { error?: string } | null

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Некорректные данные' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
    return null
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: 'Неверный email или пароль' }
    }
    throw e
  }
}
