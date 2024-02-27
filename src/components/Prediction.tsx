import { type TwitchOutcome } from "~/utils/types/twitch";

export enum Layout {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export enum Direction {
  START = "start",
  END = "end",
}

type PredictionProps = {
  title: string;
  outcomes: TwitchOutcome[];
  winner?: string;
  status: PredictionState;
  layout: Layout;
  direction: Direction;
};

export function Prediction({
  title,
  outcomes,
  winner,
  status,
  layout,
  direction,
}: PredictionProps) {
  const colors: string[] = [
    "bg-blue-600",
    "bg-red-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-teal-600",
    "bg-yellow-600",
  ];
  let classes =
    "flex flex-col gap-2 text-center font-sans text-2xl font-bold text-zinc-50 transition-opacity duration-300 h-full";
  if (status === PredictionState.STARTED || status == PredictionState.ENDED) {
    classes += " opacity-100";
  } else {
    classes += " opacity-0";
  }
  if (direction == Direction.END && layout == Layout.HORIZONTAL) {
    classes += " justify-end";
  }
  const listTopPredictors = (winner: string, outcomes: TwitchOutcome[]) => {
    const outcome = outcomes.find((outcome) => {
      return outcome.id === winner;
    });
    return outcome?.top_predictors?.map((predictor) => {
      return (
        <div
          key={predictor.user_id}
          className="bg-zinc-900 bg-opacity-35 p-2 font-bold text-green-500"
        >
          {predictor.user_name} +{predictor.channel_points_won ?? 0} pts
        </div>
      );
    });
  };

  outcomes.sort((a, b) => {
    if ((a.channel_points ?? 0) < (b.channel_points ?? 0)) {
      return 1;
    } else if ((a.channel_points ?? 0) > (b.channel_points ?? 0)) {
      return -1;
    }
    return 0;
  });

  if (layout === Layout.HORIZONTAL) {
    let outcomesClasses = "flex gap-3 p-2";
    if (direction === Direction.END) {
      outcomesClasses += " flex-col-reverse";
    } else {
      outcomesClasses += " flex-col";
    }
    return (
      <div className={classes}>
        <div className="m-2 rounded-2xl bg-zinc-800 bg-opacity-35 p-2">
          {title}
        </div>
        <div className={outcomesClasses}>
          <div className="flex justify-stretch gap-2">
            {outcomes.map((outcome, index) => {
              let outcomeClasses =
                "flex flex-col flex-grow w-48 min-w-0 rounded-2xl p-2 text-center text-zinc-50 justify-stretch ";
              outcomeClasses += colors[index % colors.length];

              return (
                <div key={outcome.id} className={outcomeClasses}>
                  <div className="truncate font-sans text-xl">
                    {outcome.channel_points ?? 0} pts
                  </div>
                  <div className="truncate text-nowrap font-sans text-lg">
                    {outcome.title}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex w-1/2 flex-grow">
            {winner && listTopPredictors(winner, outcomes)}
          </div>
        </div>
      </div>
    );
  } else {
    // Layout.VERTICAL
    let outcomesClasses = "flex gap-2 p-2";
    if (direction === Direction.END) {
      outcomesClasses += " flex-row-reverse";
    }
    return (
      <div className={classes}>
        <div className="m-2 rounded-2xl bg-zinc-800 bg-opacity-35 p-2">
          {title}
        </div>
        <div className={outcomesClasses}>
          <div className="flex w-1/2 flex-grow flex-col justify-stretch gap-3">
            {outcomes.map((outcome, index) => {
              let classes =
                "flex flex-grow rounded-2xl p-4 text-center text-zinc-50 transition-transform ";
              classes += colors[index % colors.length];

              return (
                <div key={outcome.id} className={classes}>
                  <div className="w-1/2 font-sans text-xl">
                    {outcome.channel_points ?? 0} pts
                  </div>
                  <div className="font-sans text-lg">{outcome.title}</div>
                </div>
              );
            })}
          </div>
          <div className="flex w-1/2 flex-grow flex-col">
            {winner && listTopPredictors(winner, outcomes)}
          </div>
        </div>
      </div>
    );
  }
}

export enum PredictionState {
  NOT_STARTED,
  STARTED,
  LOCKED,
  ENDED,
}
