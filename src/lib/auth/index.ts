import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import prisma from "@/lib/db"
import { authConfig } from "./auth.config"

// 扩展 NextAuth 类型
declare module "next-auth" {
  interface User {
    id: string
    orgId: string
    role: "super_admin" | "org_admin" | "consultant"
    phone?: string | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      orgId: string
      role: "super_admin" | "org_admin" | "consultant"
      phone?: string | null
    }
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phone: { label: "手机号", type: "tel" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          return null
        }

        const phone = credentials.phone as string
        const password = credentials.password as string

        const user = await prisma.user.findFirst({
          where: { phone },
          include: { organization: true },
        })

        if (!user || !user.password || !user.isActive) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
          return null
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId,
          role: user.role as "super_admin" | "org_admin" | "consultant",
          phone: user.phone,
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      console.log(`[Auth] User signed in: ${user.phone || user.email}`)
    },
  },
  debug: process.env.NODE_ENV === "development",
})

export type { Session } from "next-auth"
