import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"
import { signInSchema } from "@/app/lib/validations/auth"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        try {
          if (!credentials) return null
          const { email, password } = await signInSchema.parseAsync(credentials)
          //Find user with email
          const user = await prisma.user.findUnique({
            where: { email: email }
          })
          if (!user) {
            throw new Error("Invalid email or password")
          }
          if (!user.password) {
            throw new Error("Please sign in with OAuth provider")
          }

          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
            throw new Error("Invalid email or password")
          }

          return user
        } catch (error) {
          throw error
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    }
  },
  pages: {
    signIn: "/signin"
  }
})