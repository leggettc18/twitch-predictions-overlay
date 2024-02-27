import { z } from "zod";

const twitchWebsocketMessageMetadataSchema = z.object({
  message_id: z.string(),
  message_type: z.string(),
  message_timestamp: z.string(),
  subscription_type: z.optional(z.string()),
  subscription_version: z.optional(z.string()),
});

const twitchWebsocketMessageSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  connected_at: z.string(),
  keepalive_timeout_seconds: z.number(),
  reconnect_url: z.nullable(z.string()),
});

const twitchWebsocketMessageTopPredictorsSchema = z.object({
  user_id: z.string(),
  user_login: z.string(),
  user_name: z.string(),
  channel_points_won: z.nullable(z.number()),
  channel_points_used: z.number(),
});

const twitchWebsocketMessageOutcomeSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  users: z.optional(z.number()),
  channel_points: z.optional(z.number()),
  top_predictors: z.optional(twitchWebsocketMessageTopPredictorsSchema.array()),
});

export type TwitchOutcome = z.infer<typeof twitchWebsocketMessageOutcomeSchema>;

const twitchWebsocketMessageSubscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  type: z.string(),
  version: z.string(),
  condition: z.object({
    broadcaster_user_id: z.string(),
  }),
  transport: z.object({
    method: z.string(),
    session_id: z.string(),
  }),
  created_at: z.string(),
});

const twitchWebsocketMessageEventSchema = z.object({
  id: z.string(),
  broadcaster_user_id: z.string(),
  broadcaster_user_login: z.string(),
  broadcaster_user_name: z.string(),
  title: z.string(),
  winning_outcome_id: z.optional(z.string()),
  outcomes: twitchWebsocketMessageOutcomeSchema.array(),
  started_at: z.string(),
  locks_at: z.optional(z.string()),
  locked_at: z.optional(z.string()),
  ended_at: z.optional(z.string()),
});

const twitchWebsocketMessagePayloadSchema = z.object({
  session: z.optional(twitchWebsocketMessageSessionSchema),
  subscription: z.optional(twitchWebsocketMessageSubscriptionSchema),
  event: z.optional(twitchWebsocketMessageEventSchema),
});

export const twitchWebsocketMessageSchema = z.object({
  metadata: twitchWebsocketMessageMetadataSchema,
  payload: twitchWebsocketMessagePayloadSchema,
});

export type TwitchWebsocketMessage = z.infer<
  typeof twitchWebsocketMessageSchema
>;
