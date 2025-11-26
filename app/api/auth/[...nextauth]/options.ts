import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextAuthOptions } from "next-auth";

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: "Password",
    credentials: {
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      // Simple password check for friends/family
      // In a real app, you'd want something more robust, but for a personal site this is often enough
      if (credentials?.password === process.env.GUEST_PASSWORD) {
        return { id: "guest", name: "Guest", email: "guest@example.com", role: "guest" };
      }
      if (credentials?.password === process.env.ADMIN_PASSWORD) {
        return { id: "admin", name: "Admin", email: "admin@example.com", role: "admin" };
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
