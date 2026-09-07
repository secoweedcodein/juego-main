import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameCanvas } from "../game/render/GameCanvas";
import { CharacterSelect, type MatchSetup } from "../components/menu/CharacterSelect";
import { MainMenu } from "../components/menu/MainMenu";
import { StatsScreen } from "../components/menu/StatsScreen";
import { HistoryScreen } from "../components/menu/HistoryScreen";
import { OptionsScreen } from "../components/menu/OptionsScreen";
import { ControlsScreen } from "../components/menu/ControlsScreen";
import { OnlineLobby, type OnlineMatchSetup } from "../components/menu/OnlineLobby";

export const Route = createFileRoute("/")({
  // El Canvas WebGL nunca debe renderizarse en el servidor.
  ssr: false,
  head: () => ({
    meta: [
      { title: "NEON FURY FIGHT — Fighting 3D cyberpunk 1v1" },
      {
        name: "description",
        content:
          "NEON FURY FIGHT: juego de peleas 3D 1v1 en una ciudad futurista. Multijugador online, combos, esquivas, stamina y rounds.",
      },
      { property: "og:title", content: "NEON FURY FIGHT — Fighting 3D cyberpunk 1v1" },
      {
        property: "og:description",
        content:
          "Pelea cuerpo a cuerpo en un distrito de neón. Cámara lateral 3D, multijugador online con salas y combate competitivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Play,
});

type Screen =
  | "menu"
  | "select"
  | "game"
  | "stats"
  | "history"
  | "options"
  | "controls"
  | "online-lobby"
  | "online-game";

function Play() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const [onlineSetup, setOnlineSetup] = useState<OnlineMatchSetup | null>(null);
  const [runId, setRunId] = useState(0);

  const back = () => setScreen("menu");

  switch (screen) {
    case "game":
      if (!setup) {
        setScreen("menu");
        return null;
      }
      return (
        <GameCanvas
          key={`solo-${runId}`}
          playerCharacter={setup.player}
          opponentCharacter={setup.opponent}
          stageId={setup.stage}
          aiLevel={setup.ai}
          onExit={() => setScreen("select")}
          onMenu={() => setScreen("menu")}
          onRematch={() => {
            setRunId((n) => n + 1);
          }}
        />
      );

    case "online-game":
      if (!onlineSetup) {
        setScreen("online-lobby");
        return null;
      }
      return (
        <GameCanvas
          key={`online-${runId}`}
          playerCharacter={onlineSetup.playerCharacter}
          opponentCharacter={onlineSetup.opponentCharacter}
          stageId={onlineSetup.stageId}
          onExit={() => setScreen("online-lobby")}
          onMenu={() => setScreen("menu")}
          onRematch={() => {
            setRunId((n) => n + 1);
          }}
          onlineConfig={{
            roomId: onlineSetup.roomId,
            roomCode: onlineSetup.roomCode,
            isHost: onlineSetup.isHost,
            onExitOnline: () => setScreen("online-lobby"),
            onRematchOnline: () => setRunId((n) => n + 1),
          }}
        />
      );

    case "online-lobby":
      return (
        <OnlineLobby
          onBack={back}
          onStartMatch={(next) => {
            setOnlineSetup(next);
            setScreen("online-game");
          }}
        />
      );

    case "select":
      return (
        <CharacterSelect
          onStart={(next) => {
            setSetup(next);
            setScreen("game");
          }}
        />
      );

    case "stats":
      return <StatsScreen onBack={back} />;
    case "history":
      return <HistoryScreen onBack={back} />;
    case "options":
      return <OptionsScreen onBack={back} />;
    case "controls":
      return <ControlsScreen onBack={back} />;
    default:
      return (
        <MainMenu
          onPlay={() => setScreen("select")}
          onOnline={() => setScreen("online-lobby")}
          onStats={() => setScreen("stats")}
          onHistory={() => setScreen("history")}
          onOptions={() => setScreen("options")}
          onControls={() => setScreen("controls")}
        />
      );
  }
}
