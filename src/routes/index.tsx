import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameCanvas } from "../game/render/GameCanvas";
import { CharacterSelect, type MatchSetup } from "../components/menu/CharacterSelect";

export const Route = createFileRoute("/")({
  // El Canvas WebGL nunca debe renderizarse en el servidor.
  ssr: false,
  head: () => ({
    meta: [
      { title: "NEON CIRCUIT — Fighting 3D cyberpunk 1v1" },
      {
        name: "description",
        content:
          "NEON CIRCUIT: juego de peleas 3D 1v1 en una ciudad futurista. Combos, esquivas, stamina y rounds.",
      },
      { property: "og:title", content: "NEON CIRCUIT — Fighting 3D cyberpunk 1v1" },
      {
        property: "og:description",
        content:
          "Pelea cuerpo a cuerpo en un distrito de neón. Cámara lateral 3D, combos y combate competitivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Play,
});

function Play() {
  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const [runId, setRunId] = useState(0);

  if (!setup) return <CharacterSelect onStart={setSetup} />;

  return (
    <GameCanvas
      key={runId}
      playerCharacter={setup.player}
      opponentCharacter={setup.opponent}
      stageId={setup.stage}
      aiLevel={setup.ai}
      onExit={() => setSetup(null)}
      onRematch={() => setRunId((n) => n + 1)}
    />
  );
}
