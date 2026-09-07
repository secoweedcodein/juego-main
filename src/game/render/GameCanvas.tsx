// Bucle principal: tick fijo 60 Hz, input -> simulación -> render.

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createMatchState, stepMatch } from "../core/sim";
import { EMPTY_INTENT, TICK_DT, type MatchState } from "../core/types";
import { KeyboardInput } from "../systems/input";
import { DummyAI, type AiLevel } from "../systems/ai";
import { Fighter } from "./Fighter";
import { HitSparks } from "./HitSparks";
import { SideCamera } from "./SideCamera";
import { StageView } from "./stages";
import { PropsView } from "./Props";
import { HazardFx } from "./HazardFx";
import { CoreHud } from "../../components/hud/CoreHud";

/** Bucle de simulación independiente del render (rAF + tick fijo). */
function useSimulationLoop(
  match: React.RefObject<MatchState>,
  input: React.RefObject<KeyboardInput>,
  ai: React.RefObject<DummyAI>,
) {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += delta;
      let steps = 0;
      while (acc >= TICK_DT && steps < 6) {
        const m = match.current;
        const intent = input.current?.readIntent() ?? EMPTY_INTENT;
        const foe = ai.current?.think(m.fighters[1], m.fighters[0]) ?? EMPTY_INTENT;
        stepMatch(m, [intent, foe]);
        acc -= TICK_DT;
        steps++;
      }
      if (steps === 6) acc = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [match, input, ai]);
}

export function GameCanvas({
  playerCharacter = "ash",
  opponentCharacter = "vulcan",
  stageId = "neon",
  aiLevel = "normal",
  onExit,
  onRematch,
}: {
  playerCharacter?: string;
  opponentCharacter?: string;
  stageId?: string;
  aiLevel?: AiLevel;
  onExit?: () => void;
  onRematch?: () => void;
}) {
  const match = useRef<MatchState>(
    createMatchState(playerCharacter, opponentCharacter, stageId),
  );
  const input = useRef<KeyboardInput>(new KeyboardInput());
  const ai = useRef<DummyAI>(new DummyAI(aiLevel));
  const p1 = useRef(match.current.fighters[0]);
  const p2 = useRef(match.current.fighters[1]);
  const [over, setOver] = useState(false);

  useSimulationLoop(match, input, ai);

  useEffect(() => {
    const kb = input.current;
    kb.attach(window);
    const esc = (e: KeyboardEvent) => {
      if (e.code === "Escape") onExit?.();
    };
    window.addEventListener("keydown", esc);
    const poll = window.setInterval(() => {
      setOver(match.current.phase === "matchEnd");
    }, 250);
    return () => {
      kb.dispose();
      window.removeEventListener("keydown", esc);
      window.clearInterval(poll);
    };
  }, [onExit]);

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 2.4, 12], fov: 52 }}>
        <StageView stageId={stageId} />
        <SideCamera match={match} />
        <Fighter state={p1} />
        <Fighter state={p2} />
        <PropsView match={match} />
        <HazardFx match={match} />
        <HitSparks match={match} />
      </Canvas>
      <CoreHud match={match} />

      {over && (
        <div className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 gap-3">
          <button
            type="button"
            onClick={() => onRematch?.()}
            className="rounded-sm border border-hud-stamina bg-hud-stamina/10 px-6 py-2 font-display tracking-[0.25em] text-hud-stamina"
          >
            REVANCHA
          </button>
          <button
            type="button"
            onClick={() => onExit?.()}
            className="rounded-sm border border-border bg-card/70 px-6 py-2 font-display tracking-[0.25em] text-foreground"
          >
            MENÚ
          </button>
        </div>
      )}
    </div>
  );
}
