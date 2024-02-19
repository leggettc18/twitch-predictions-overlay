import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import z from "zod";

import { api } from "~/utils/api";
import { stringToJsonSchema } from "~/utils/stringToJson";

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

const twitchWebsocketMessageOutcomeSchema = z.object({
  id: z.string(),
  title: z.string(),
  color: z.string(),
  users: z.optional(z.number()),
  channel_points: z.optional(z.number()),
  top_predictors: z.optional(
    z
      .object({
        user_id: z.string(),
        user_login: z.string(),
        user_name: z.string(),
        channel_points_won: z.nullable(z.number()),
        channel_points_used: z.number(),
      })
      .array(),
  ),
});

type TwitchOutcome = z.infer<typeof twitchWebsocketMessageOutcomeSchema>;

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

const twitchWebsocketMessageSchema = z.object({
  metadata: twitchWebsocketMessageMetadataSchema,
  payload: twitchWebsocketMessagePayloadSchema,
});

type TwitchWebsocketMessage = z.infer<typeof twitchWebsocketMessageSchema>;

type PredictionProps = {
  outcomes: TwitchOutcome[];
};

function Prediction({ outcomes }: PredictionProps) {
  return (
    <>
      {outcomes.map((outcome) => (
        <p key={outcome.id}>
          {outcome.title} - {outcome.channel_points ?? 0} points;
        </p>
      ))}
    </>
  );
}

enum PredictionState {
  NOT_STARTED,
  STARTED,
  LOCKED,
  ENDED,
}

export default function Page() {
  const [predictionState, setPredictionState] = useState(
    PredictionState.NOT_STARTED,
  );
  const [predictionEvent, setPredictionEvent] =
    useState<TwitchWebsocketMessage | null>(null);
  const router = useRouter();
  const subscribeToPredictions = api.subscriptions.predictions.useMutation();
  const { lastMessage } = useWebSocket("wss://eventsub.wss.twitch.tv/ws");

  const handleSubscribingToPredictions = async (
    userId: string,
    sessionId: string,
  ) => {
    const result = await subscribeToPredictions.mutateAsync({
      userId,
      sessionId,
    });
    console.log(result);
  };

  const handleWebsocketMessage = async (
    message: MessageEvent<string> | null,
  ) => {
    if (message) {
      const parsed = twitchWebsocketMessageSchema.parse(
        JSON.parse(message.data),
      );
      if (parsed.metadata.message_type === "session_welcome") {
        if (parsed.payload.session) {
          await handleSubscribingToPredictions(
            router.query.userId as string,
            parsed.payload.session?.id,
          );
        }
      } else if (parsed.metadata.message_type === "notification") {
        if (parsed.metadata.subscription_type === "channel.prediction.begin") {
          setPredictionState(PredictionState.STARTED);
          setPredictionEvent(parsed);
        }
      }
    }
  };

  useEffect(() => {
    void handleWebsocketMessage(lastMessage);
  }, [lastMessage]);

  if (predictionEvent?.payload.event) {
    return <Prediction outcomes={predictionEvent?.payload.event?.outcomes} />;
  }
}
