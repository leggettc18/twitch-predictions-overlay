import { type Account } from "@prisma/client";
import { type TokenSet } from "next-auth";
import { env } from "~/env";
import { db } from "~/server/db";

type ValidateResponse = {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
};

export default async function validateAndRefreshToken(account: Account) {
  const validateRes = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `Bearer ${account.access_token}` },
  });
  const validStatus: ValidateResponse =
    (await validateRes.json()) as ValidateResponse;
  if (validateRes.status == 200 || validStatus.expires_in < 86400) {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: account?.refresh_token ?? "",
      }),
      method: "POST",
    });

    const tokens: TokenSet = (await response.json()) as TokenSet;

    if (!response.ok) throw tokens;

    await db.account.update({
      data: {
        access_token: tokens.access_token,
        expires_at: tokens.expires_at,
        refresh_token: tokens.refresh_token ?? account?.refresh_token,
      },
      where: {
        provider_providerAccountId: {
          provider: "twitch",
          providerAccountId: account?.providerAccountId ?? "",
        },
      },
    });
  }
}
