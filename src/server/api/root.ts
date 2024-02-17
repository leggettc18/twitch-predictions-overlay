import { postRouter } from "~/server/api/routers/post";
import { subscriptionsRouter } from "~/server/api/routers/subscriptions";
import { createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  subscriptions: subscriptionsRouter,
  post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
