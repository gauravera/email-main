import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/generative-language.retriever",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && user) {
        // Check for required scopes
        const requiredScopes = [
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
        ];
        const grantedScopes = account.scope?.split(" ") || [];
        const hasAllScopes = requiredScopes.every(scope => grantedScopes.includes(scope));

        if (!hasAllScopes) {
          // Clear token if user revoked permissions
          const existingAccount = await prisma.account.findFirst({
            where: { provider: account.provider, providerAccountId: account.providerAccountId }
          });
          if (existingAccount) {
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                access_token: null,
                refresh_token: null,
                expires_at: null,
                scope: account.scope,
              }
            });
          }
          return "/auth/signin?error=MissingPermissions";
        }

        try {
          const existingAccount = await prisma.account.findFirst({
            where: { provider: account.provider, providerAccountId: account.providerAccountId }
          });
          
          if (existingAccount) {
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                access_token: account.access_token,
                refresh_token: account.refresh_token ?? existingAccount.refresh_token,
                expires_at: account.expires_at,
                scope: account.scope,
              }
            });
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          refreshToken: account.refresh_token,
          userId: user.id,
          name: user.name,
          email: user.email,
          picture: user.image,
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user = {
          id: token.userId,
          name: token.name,
          email: token.email,
          image: token.picture,
        };
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
