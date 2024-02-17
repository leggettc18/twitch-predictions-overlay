import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import z from "zod";

import { api } from "~/utils/api";

const twitchWebsocketMessageSchema = z.object({
  metadata: z.object({
    message_id: z.string(),
    message_type: z.string(),
    message_timestamp: z.string(),
  }),
  payload: z.object({
    session: z.object({
      id: z.string(),
      status: z.string(),
      connected_at: z.string(),
      keepalive_timeout_seconds: z.number(),
      reconnect_url: z.nullable(z.string()),
    }),
  }),
});

type TwitchWebsocketMessage = z.infer<typeof twitchWebsocketMessageSchema>;

export default function Page() {
  const [predictionState, setPredictionState] = useState("not started");
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
  useEffect(() => {
    if (lastMessage) {
      const parsedMessage = JSON.parse(
        lastMessage.data as string,
      ) as TwitchWebsocketMessage;
      if (parsedMessage.metadata.message_type === "session_welcome") {
        void handleSubscribingToPredictions(
          router.query.userId as string,
          parsedMessage.payload.session.id,
        );
      } else if (parsedMessage.metadata.message_type === "notification") {
        if (
          parsedMessage.metadata.subscription_type ===
          "channel.prediction.begin"
        ) {
          setPredictionState("started");
        }
      }
    }
  }, [lastMessage]);
  return (
    <p>
      Prediction Overlay for user with id {router.query.userId}. Prediction is{" "}
      {predictionState}.
    </p>
  );
}
