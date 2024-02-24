import { z } from "zod";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const subscriptionsRouter = createTRPCRouter({
  predictions: publicProcedure
    .input(z.object({ userId: z.string(), sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.account.findFirst({
        where: {
          userId: input.userId,
        },
      });
      if (account?.access_token) {
        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.set("Client-Id", env.TWITCH_CLIENT_ID);
        headers.set("Authorization", "Bearer " + account.access_token);

        const data = {
          type: "channel.prediction.begin",
          version: 1,
          condition: {
            broadcaster_user_id: account.providerAccountId,
          },
          transport: {
            method: "websocket",
            session_id: input.sessionId,
          },
        };

        const requestOptions = {
          method: "POST",
          headers: headers,
          body: JSON.stringify(data),
        };
        const url = "https://api.twitch.tv/helix/eventsub/subscriptions";
        await fetch(url, requestOptions);

        data.type = "channel.prediction.progress";
        requestOptions.body = JSON.stringify(data);
        await fetch(url, requestOptions);

        data.type = "channel.prediction.lock";
        requestOptions.body = JSON.stringify(data);
        await fetch(url, requestOptions);

        data.type = "channel.prediction.end";
        requestOptions.body = JSON.stringify(data);
        await fetch(url, requestOptions);
      }
    }),
});
