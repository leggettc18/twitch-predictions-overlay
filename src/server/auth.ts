import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type GetServerSidePropsContext } from "next";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
  type TokenSet,
} from "next-auth";
import TwitchProvider from "next-auth/providers/twitch";

import { env } from "~/env";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string;
      // ...other properties
      // role: UserRole;
    };
    error?: "RefreshAccessTokenError";
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: async ({ session, user }) => {
      const [twitch] = await db.account.findMany({
        where: { userId: user.id, provider: "twitch" },
      });
      if ((twitch?.expires_at ?? 0) * 1000 < Date.now()) {
        try {
          const response = await fetch("https://id.twitch.tv/oauth2/token", {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: env.TWITCH_CLIENT_ID,
              client_secret: env.TWITCH_CLIENT_SECRET,
              grant_type: "refresh_token",
              refresh_token: twitch?.refresh_token ?? "",
            }),
            method: "POST",
          });

          const tokens: TokenSet = (await response.json()) as TokenSet;

          if (!response.ok) throw tokens;

          await db.account.update({
            data: {
              access_token: tokens.access_token,
              expires_at: tokens.expires_at,
              refresh_token: tokens.refresh_token ?? twitch?.refresh_token,
            },
            where: {
              provider_providerAccountId: {
                provider: "twitch",
                providerAccountId: twitch?.providerAccountId ?? "",
              },
            },
          });
        } catch (error) {
          console.error("Error refreshing access_token", error);
          session.error = "RefreshAccessTokenError";
        }
      }
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
  },
  adapter: PrismaAdapter(db),
  providers: [
    TwitchProvider({
      clientId: env.TWITCH_CLIENT_ID,
      clientSecret: env.TWITCH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid user:read:email channel:read:predictions",
        },
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
