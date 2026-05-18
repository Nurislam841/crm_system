import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const user = await db.user.findFirst({
          where: { email, deletedAt: null },
        })
        if (!user) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          tenantId: user.tenantId,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; tenantId: string; role: string }
        token.id = u.id
        token.tenantId = u.tenantId
        token.role = u.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as { id?: string; tenantId?: string; role?: string }
        ;(session.user as { id?: string }).id = t.id
        ;(session.user as { tenantId?: string }).tenantId = t.tenantId
        ;(session.user as { role?: string }).role = t.role
      }
      return session
    },
  },
})
