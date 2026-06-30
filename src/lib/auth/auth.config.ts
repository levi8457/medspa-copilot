import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Edge-compatible auth config (no Node.js modules: no Prisma, no bcrypt)
// Used by middleware.ts which runs in edge runtime
export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phone: { label: "手机号", type: "tel" },
        password: { label: "密码", type: "password" },
      },
      async authorize() {
        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.orgId = (user as unknown as Record<string, unknown>).orgId as string
        token.role = (user as unknown as Record<string, unknown>).role as string
        token.phone = (user as unknown as Record<string, unknown>).phone as string | null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.orgId = token.orgId as string
        session.user.role = token.role as "super_admin" | "org_admin" | "consultant"
        session.user.phone = token.phone as string | null
      }
      return session
    },
  },
} satisfies NextAuthConfig
