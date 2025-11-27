import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";

import { getUserByEmail } from "@/lib/google-sheets";
import * as bcrypt from "bcryptjs";

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: "Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      // 1. Check for hardcoded admin/guest first (migration path)
      if (credentials.email === process.env.ADMIN_EMAIL && credentials.password === process.env.ADMIN_PASSWORD) {
        return { id: "admin", name: "Admin", email: credentials.email, role: "admin" };
      }
      if (credentials.email === "guest@example.com" && credentials.password === process.env.GUEST_PASSWORD) {
        return { id: "guest", name: "Guest", email: "guest@example.com", role: "guest" };
      }

      // 2. Check Google Sheets
      try {
        const user = await getUserByEmail(credentials.email);
        if (user && user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (isValid) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }
        }
      } catch (error) {
        console.error("Auth error:", error);
      }

      return null;
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
      }
      // If logging in with Google, check if email matches admin email
      if (user?.email === process.env.ADMIN_EMAIL) {
        token.role = "admin";
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
