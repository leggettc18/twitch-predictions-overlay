import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import {
  Direction,
  Layout,
  Prediction,
  PredictionState,
} from "~/components/Prediction";

import { api } from "~/utils/api";
import {
  type TwitchWebsocketMessage,
  twitchWebsocketMessageSchema,
} from "~/utils/types/twitch";

export default function Page() {
  const [predictionState, setPredictionState] = useState(
    PredictionState.NOT_STARTED,
  );
  const [socketUrl, setSocketUrl] = useState("wss://eventsub.wss.twitch.tv/ws");
  const [predictionEvent, setPredictionEvent] =
    useState<TwitchWebsocketMessage | null>(null);
  const router = useRouter();
  const subscribeToPredictions = api.subscriptions.predictions.useMutation();
  const { lastMessage } = useWebSocket(socketUrl);
  const searchParams = useSearchParams();
  const layout = searchParams.get("layout");
  const direction = searchParams.get("direction");

  useEffect(() => {
    const handleSubscribingToPredictions = async (
      userId: string,
      sessionId: string,
    ) => {
      await subscribeToPredictions.mutateAsync({
        userId,
        sessionId,
      });
    };

    const handleReconnectUrl = async (reconnect_url: string | null) => {
      setSocketUrl(reconnect_url ?? socketUrl);
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
        } else if (parsed.metadata.message_type === "session_reconnect") {
          if (parsed.payload.session) {
            await handleReconnectUrl(parsed.payload.session?.reconnect_url);
          }
        } else if (parsed.metadata.message_type === "notification") {
          if (
            parsed.metadata.subscription_type === "channel.prediction.begin"
          ) {
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
            setTimeout(() => {
              setPredictionState(PredictionState.NOT_STARTED);
            }, 30000);
          }
        }
      }
    };
    void handleWebsocketMessage(lastMessage);
  }, [lastMessage, router.query.userId, socketUrl, subscribeToPredictions]);

  return (
    <Prediction
      title={predictionEvent?.payload.event?.title ?? ""}
      outcomes={predictionEvent?.payload.event?.outcomes ?? []}
      winner={predictionEvent?.payload.event?.winning_outcome_id}
      status={predictionState}
      layout={layout === "horizontal" ? Layout.HORIZONTAL : Layout.VERTICAL}
      direction={direction === "start" ? Direction.START : Direction.END}
    />
  );
}
