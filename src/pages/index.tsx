import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Direction,
  Layout,
  Prediction,
  PredictionState,
} from "~/components/Prediction";

import { api } from "~/utils/api";
import { type TwitchOutcome } from "~/utils/types/twitch";

/* eslint-disable @next/next/no-page-custom-font */

export default function Home() {
  api.post.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Twitch Predictions Overlay</title>
        <meta
          name="description"
          content="Twitch Predictions Overlay supporting more than 2 outcomes"
        />
        <meta
          name="og:description"
          content="Twitch Predictions Overlay supporting more than 2 outcomes"
        />
        <meta name="og:title" content="Twitch Predictions Overlay" />
        <meta
          name="og:image"
          content="https://twitch.leggett.dev/_next/image?url=%2Fdemo.png&w=384&q=75"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@leggettc18" />
        <meta name="twitter:title" content="Twitch Predictions Overlay" />
        <meta
          name="twitter:image"
          content="https://twitch.leggett.dev/_next/image?url=%2Fdemo.png&w=384&q=75"
        />
        <meta
          name="twitter:description"
          content="Twitch Predictions Overlay supporting more than 2 outcomes"
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css?family=Allerta Stencil&display=optional"
          rel="stylesheet"
        />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text p-3 font-display text-5xl font-bold tracking-tight text-transparent sm:text-[5rem]">
            Twitch Prediction Overlay
          </h1>
          <div className="flex flex-col items-center justify-center gap-4 text-3xl text-zinc-100 sm:grid-cols-2 md:gap-8">
            <p>
              A Browser Source overlay for Twitch Predictions that supports more
              than two outcomes.
            </p>
            <p>
              If you like what you see and want this project to stay online and
              get more features,{" "}
              <a
                className="text-purple-300 hover:text-purple-500"
                href="https://ko-fi.com/leggettc18"
              >
                please donate to my Ko-Fi
              </a>
              !
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <AuthShowcase />
          </div>
        </div>
      </main>
    </>
  );
}

function AuthShowcase() {
  const { data: sessionData } = useSession();
  const [demoLayout, setDemoLayout] = useState(Layout.VERTICAL);
  const [demoDirection, setDemoDirection] = useState(Direction.END);

  useEffect(() => {
    if (sessionData?.error === "RefreshAccessTokenError") {
      void signIn();
    }
  }, [sessionData]);

  const url =
    "https://twitch.leggett.dev/" +
    sessionData?.user.id +
    "/overlays/prediction";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    alert("URL Copied");
  };

  const sample: TwitchOutcome[] = [
    {
      id: "1",
      title: "Outcome 1",
      color: "blue",
      users: 3,
      channel_points: 500,
      top_predictors: [
        {
          user_id: "1",
          user_login: "winner1",
          user_name: "winner1",
          channel_points_won: 1000,
          channel_points_used: 200,
        },
        {
          user_id: "2",
          user_login: "hunter2",
          user_name: "hunter2",
          channel_points_won: 500,
          channel_points_used: 100,
        },
        {
          user_id: "3",
          user_login: "waldo3",
          user_name: "waldo3",
          channel_points_won: 100,
          channel_points_used: 20,
        },
      ],
    },
    {
      id: "2",
      title: "Outcome 2",
      color: "blue",
      users: 0,
      channel_points: 0,
    },
    {
      id: "3",
      title: "Outcome 3",
      color: "blue",
      users: 0,
      channel_points: 0,
    },
  ];
  const getUrl = () => {
    return url + "?layout=" + demoLayout + "&direction=" + demoDirection;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && (
          <div>
            <div className="flex gap-2">
              <select
                className="bg-zinc-800"
                value={demoLayout}
                onChange={(e) => {
                  if (e.target.value === "horizontal") {
                    setDemoLayout(Layout.HORIZONTAL);
                  } else {
                    setDemoLayout(Layout.VERTICAL);
                  }
                }}
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
              <select
                className="bg-zinc-800"
                value={demoDirection}
                onChange={(e) => {
                  if (e.target.value === "start") {
                    setDemoDirection(Direction.START);
                  } else {
                    setDemoDirection(Direction.END);
                  }
                }}
              >
                <option value="start">Start (top/left)</option>
                <option value="end">End (bottom/right)</option>
              </select>
            </div>
            <span>
              Add the following URL as a Browser Source (Click to Copy):{" "}
              <a
                className="text-purple-300 hover:text-purple-500"
                href="#"
                onClick={copy}
              >
                {getUrl()}
              </a>
            </span>
            <div className="h-[30rem] bg-zinc-700">
              <Prediction
                title={"Demo Prediction"}
                outcomes={sample}
                winner={"1"}
                status={PredictionState.ENDED}
                layout={demoLayout}
                direction={demoDirection}
              />
            </div>
          </div>
        )}
        {!sessionData && (
          <div className="flex w-full items-center justify-evenly">
            <p className="w-1/2">
              Here&apos;s what it looks like in OBS with a 4 outcome prediction
              with default layout and direction sesttings. When the prediction
              ends, the top predictors for the winning outcome appear on the
              left for 30 seconds. Link your Twitch account below for a demo you
              can use and then copy the URL into a Browser Source in OBS.
            </p>
            <Image
              src="/demo.png"
              width={300}
              height={300}
              alt="Demo of the overlay"
            />
          </div>
        )}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Link your Twitch Account!"}
      </button>
    </div>
  );
}
