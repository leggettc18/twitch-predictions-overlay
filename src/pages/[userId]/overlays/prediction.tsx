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
  title: string;
  outcomes: TwitchOutcome[];
};

function Prediction({ title, outcomes }: PredictionProps) {
  const colors: string[] = [
    "bg-blue-600",
    "bg-red-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-teal-600",
    "bg-yellow-600",
  ];
  return (
    <div className="flex-col gap-2 text-center font-sans text-2xl font-bold text-zinc-50">
      <div className="m-2 rounded-full bg-zinc-800 bg-opacity-35 p-2">
        {title}
      </div>
      <div className="flex flex-wrap justify-stretch gap-3 p-2">
        {outcomes.map((outcome, index) => {
          let classes =
            "min-w-36 flex-grow flex-col rounded-3xl p-4 text-center text-zinc-50 ";
          classes += colors[index % colors.length];

          return (
            <div key={outcome.id} className={classes}>
              <div className="font-sans text-xl">{outcome.title}</div>
              <div className="font-sans text-lg">
                {outcome.channel_points ?? 0}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
    await subscribeToPredictions.mutateAsync({
      userId,
      sessionId,
    });
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
        } else if (
          parsed.metadata.subscription_type === "channel.prediction.progress"
        ) {
          setPredictionEvent(parsed);
        } else if (
          parsed.metadata.subscription_type === "channel.prediction.lock"
        ) {
          setPredictionState(PredictionState.LOCKED);
          setPredictionEvent(parsed);
        } else if (
          parsed.metadata.subscription_type === "channel.prediction.end"
        ) {
          setPredictionState(PredictionState.ENDED);
          setPredictionEvent(parsed);
        }
      }
    }
  };

  useEffect(() => {
    void handleWebsocketMessage(lastMessage);
  }, [lastMessage]);

  if (
    predictionEvent?.payload.event &&
    (predictionState == PredictionState.STARTED ||
      predictionState == PredictionState.ENDED)
  ) {
    return (
      <Prediction
        title={predictionEvent?.payload.event?.title}
        outcomes={predictionEvent?.payload.event?.outcomes}
      />
    );
  }
}
