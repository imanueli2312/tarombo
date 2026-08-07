import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sqlite } from "./database";
import { ensureSeeded } from "./seed";
import { getRoleById } from "./auth";

ensureSeeded();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const row = sqlite
          .prepare("SELECT * FROM users WHERE email = ?")
          .get(credentials.email) as any;
        if (!row) return null;
        if (!row.is_active) return null;
        const ok = bcrypt.compareSync(credentials.password, row.password_hash);
        if (!ok) return null;
        return {
          id: row.id,
          email: row.email,
          name: row.name,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET || "hariandja-tarombo-secret-dev-key-2024",
};
