import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from './db'
import { sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        try {
          const result = await db.execute(
            sql`SELECT id, email, password, full_name, account_type FROM profiles WHERE email = ${email}`
          )

          const rows = result.rows as unknown as Array<{
            id: string
            email: string
            password?: string
            full_name: string | null
            account_type: string | null
          }>

          if (!rows || rows.length === 0) {
            return null
          }

          const user = rows[0]

          const isValid = await bcrypt.compare(password, user.password || '')
          if (!isValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            account_type: user.account_type,
          }
        } catch (error) {
          console.error('Auth authorization error:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.account_type = (user as { account_type?: string }).account_type
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { account_type?: string }).account_type = token.account_type as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET || 'fallback-secret-for-development-only-12345',
})
