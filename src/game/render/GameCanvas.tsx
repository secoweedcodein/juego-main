// Bucle principal: tick fijo 60 Hz, input -> simulación -> render.
// Integra: pausa (ESC), audio conectado a eventos reales, VFX y el registro
// de progresión al terminar el combate.

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createMatchState, stepMatch } from "../core/sim";
import { EMPTY_INTENT, TICK_DT, TICK_RATE, type MatchState } from "../core/types";
import { KeyboardInput } from "../systems/input";
import { DummyAI, type AiLevel } from "../systems/ai";
import { Fighter } from "./Fighter";
import { VfxSystem } from "./VfxSystem";
import { SideCamera } from "./SideCamera";
import { StageView } from "./stages";
import { PropsView } from "./Props";
import { HazardFx } from "./HazardFx";
import { CoreHud } from "../../components/hud/CoreHud";
import { audio } from "../audio/AudioManager";
import { loadSettings } from "../config/settings";
import { loadKeymap } from "../config/keymap";
import { recordMatch, type MatchSummary } from "../progression/storage";
import { getCharacter } from "../data/characters";
import { getStage } from "../data/stages";

/** Bucle de simulación independiente del render (rAF + tick fijo). */
function useSimulationLoop(
  match: React.RefObject<MatchState>,
  input: React.RefObject<KeyboardInput>,
  ai: React.RefObject<DummyAI>,
  paused: React.RefObject<boolean>,
) {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let prevHealth = [] as number[];
    let prevDodge = [] as boolean[];
    let prevJump = [] as boolean[];
    let prevFalling = [] as boolean[];
    let prevPhase = "";
    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += delta;
      const m = match.current;
      const isPaused = paused.current;
      if (!m) return;

      if (isPaused) {
        acc = 0;
        raf = requestAnimationFrame(loop);
        return;
      }

      let steps = 0;
      while (acc >= TICK_DT && steps < 6) {
        if (prevHealth.length === 0) {
          prevHealth = m.fighters.map((f) => f.health);
          prevDodge = m.fighters.map((f) => f.dodgeTicks > 0);
          prevJump = m.fighters.map((f) => !f.grounded);
          prevFalling = m.fighters.map((f) => f.fallingOut);
          prevPhase = m.phase;
        }
        const intent = input.current?.readIntent() ?? EMPTY_INTENT;
        const foe = ai.current?.think(m.fighters[1], m.fighters[0]) ?? EMPTY_INTENT;
        stepMatch(m, [intent, foe]);

        // Audio conectado a cambios reales de estado.
        const n = m.fighters;
        for (let i = 0; i < n.length; i++) {
          const f = n[i]!;
          // KO del rival (salud llega a 0).
          if (f.health <= 0 && prevHealth[i]! > 0) audio.playSfx("ko");
          // Esquiva.
          if (f.dodgeTicks > 0 && !prevDodge[i]!) audio.playSfx("dodge");
          // Salto y aterrizaje.
          if (!f.grounded && prevJump[i]!) audio.playSfx("jump");
          if (f.grounded && !prevJump[i]! && f.y <= 0.01) audio.playSfx("land");
          // Ring-out al agua.
          if (f.fallingOut && !prevFalling[i]!) audio.playSfx("ringout");
        }
        prevHealth = n.map((f) => f.health);
        prevDodge = n.map((f) => f.dodgeTicks > 0);
        prevJump = n.map((f) => !f.grounded);
        prevFalling = n.map((f) => f.fallingOut);

        // Sonidos de impacto de los eventos generados.
        for (const e of m.events) {
          if (e.attackerId === "stage") {
            audio.playSfx("hitLight");
            continue;
          }
          if (e.attackId.startsWith("throw-")) {
            audio.playSfx("throw");
            continue;
          }
          if (e.blocked) {
            audio.playSfx("block");
          } else if (e.attackId === "heavy") {
            audio.playSfx("hitHeavy");
          } else if (e.attackId === "kick") {
            audio.playSfx("kick");
          } else if (e.attackId === "grab") {
            audio.playSfx("grab");
          } else {
            audio.playSfx("hitLight");
          }
        }

        // Fanfarria de victoria/derrota al llegar al matchEnd.
        if (m.phase === "matchEnd" && prevPhase !== "matchEnd") {
          const playerWon = m.wins[0] > m.wins[1];
          audio.playSfx(playerWon ? "victory" : m.wins[0] === m.wins[1] ? "defeat" : "defeat");
        }
        prevPhase = m.phase;

        acc -= TICK_DT;
        steps++;
      }
      if (steps === 6) acc = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [match, input, ai, paused]);
}

export function GameCanvas({
  playerCharacter = "ash",
  opponentCharacter = "vulcan",
  stageId = "neon",
  aiLevel = "normal",
  onExit,
  onRematch,
  onMenu,
}: {
  playerCharacter?: string;
  opponentCharacter?: string;
  stageId?: string;
  aiLevel?: AiLevel;
  onExit?: () => void;
  onRematch?: () => void;
  onMenu: () => void;
}) {
  const match = useRef<MatchState>(createMatchState(playerCharacter, opponentCharacter, stageId));
  const input = useRef<KeyboardInput>(new KeyboardInput(loadKeymap()));
  const ai = useRef<DummyAI>(new DummyAI(aiLevel));
  const p1 = useRef(match.current.fighters[0]);
  const p2 = useRef(match.current.fighters[1]);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const recorded = useRef(false);
  const matchDuration = useRef(0);
  const settings = loadSettings();
  audio.ensureInit();

  useSimulationLoop(match, input, ai, pausedRef);

  const togglePause = useCallback((value?: boolean) => {
    setPaused((p) => {
      const next = value ?? !p;
      pausedRef.current = next;
      audio.setPaused(next);
      return next;
    });
  }, []);

  // Atrapa la tecla de pausa (configurable) y la vuelca a la AI.
  useEffect(() => {
    const kb = input.current;
    kb.attach(window);
    const keymap = loadKeymap();
    const pauseCodes = new Set(keymap.pause);
    const onDown = (e: KeyboardEvent) => {
      if (pauseCodes.has(e.code)) {
        e.preventDefault();
        if (!over) togglePause();
      }
    };
    window.addEventListener("keydown", onDown);
    const poll = window.setInterval(() => {
      const m = match.current;
      if (m.phase === "matchEnd") {
        matchDuration.current = Math.round((m.tick / TICK_RATE) * 10) / 10;
        if (m.phaseTicks <= 0) setOver(true);
      }
    }, 250);
    return () => {
      kb.dispose();
      window.removeEventListener("keydown", onDown);
      window.clearInterval(poll);
    };
  }, [togglePause, over]);

  // Música del escenario + ambiente. Se detiene al salir.
  useEffect(() => {
    audio.ensureInit();
    audio.playMusic(stageId);
    audio.startAmbience();
    return () => {
      audio.stopMusic();
      audio.stopAmbience();
    };
  }, [stageId]);

  // Registrar el resultado del combate (una sola vez, al terminar).
  useEffect(() => {
    const poll = window.setInterval(() => {
      const m = match.current;
      if (!m || m.phase !== "matchEnd" || recorded.current) return;
      recorded.current = true;
      const winner = m.wins[0] === m.wins[1] ? -1 : m.wins[0] > m.wins[1] ? 0 : 1;
      const summary: MatchSummary = {
        playerCharacter: m.fighters[0].characterId,
        opponentCharacter: m.fighters[1].characterId,
        stageId: m.stageId,
        result: winner === -1 ? "draw" : winner === 0 ? "win" : "loss",
        aiLevel,
        durationSeconds: matchDuration.current,
        roundsWon: m.wins[0],
        roundsLost: m.wins[1],
        damageDealt: m.damageDealt[0],
        damageTaken: m.damageDealt[1],
        ko: winner === 0 && m.announce === "K.O.",
      };
      recordMatch(summary);
    }, 250);
    return () => window.clearInterval(poll);
  }, [aiLevel]);

  const handleMenu = useCallback(() => {
    togglePause(false);
    onMenu();
  }, [onMenu, togglePause]);

  const handleRematch = useCallback(() => {
    togglePause(false);
    onRematch?.();
  }, [onRematch, togglePause]);

  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  const stageColor = getStage(stageId).palette.primary;

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        shadows={settings.shadows}
        dpr={[1, settings.quality === "low" ? 1 : settings.quality === "medium" ? 1.25 : 1.75]}
        camera={{ position: [0, 2.4, 12], fov: 52 }}
      >
        <StageView stageId={stageId} />
        <SideCamera match={match} />
        <Fighter state={p1} match={match} />
        <Fighter state={p2} match={match} />
        <PropsView match={match} />
        <HazardFx match={match} />
        <VfxSystem match={match} />
      </Canvas>
      <CoreHud match={match} />

      {/* Pantalla de pausa */}
      {paused && !over && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mb-6 font-display text-3xl tracking-[0.4em] text-hud-timer drop-shadow-[0_0_16px_currentColor]">
            PAUSA
          </div>
          <div className="flex w-64 flex-col gap-3">
            <button
              type="button"
              onClick={() => togglePause(false)}
              className="rounded-sm border border-hud-stamina bg-hud-stamina/10 py-2.5 font-display tracking-[0.25em] text-hud-stamina shadow-neon transition hover:bg-hud-stamina/20"
            >
              CONTINUAR
            </button>
            <button
              type="button"
              onClick={handleRematch}
              className="rounded-sm border border-border bg-card/70 py-2.5 font-display tracking-[0.25em] text-foreground transition hover:bg-card"
            >
              REINICIAR
            </button>
            <button
              type="button"
              onClick={handleMenu}
              className="rounded-sm border border-border bg-card/70 py-2.5 font-display tracking-[0.25em] text-foreground transition hover:bg-card"
            >
              SALIR AL MENÚ
            </button>
          </div>
          <div className="mt-8 w-64 text-center text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
            Opciones de audio en el menú principal
          </div>
        </div>
      )}

      {/* Resultado final */}
      {over && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRematch}
              className="rounded-sm border border-hud-stamina bg-hud-stamina/10 px-6 py-2 font-display tracking-[0.25em] text-hud-stamina shadow-neon transition hover:bg-hud-stamina/20"
            >
              REVANCHA
            </button>
            <button
              type="button"
              onClick={handleExit}
              className="rounded-sm border border-border bg-card/70 px-6 py-2 font-display tracking-[0.25em] text-foreground"
            >
              SELECCIÓN
            </button>
            <button
              type="button"
              onClick={handleMenu}
              className="rounded-sm border border-hud-timer/70 bg-hud-timer/10 px-6 py-2 font-display tracking-[0.25em] text-hud-timer"
            >
              MENÚ
            </button>
          </div>
          <div className="mt-3 text-[0.65rem] tracking-[0.25em] text-muted-foreground">
            Resultado guardado en tu progreso — ver estadísticas en el menú
          </div>
          <div className="mt-1 flex items-center gap-2 text-[0.6rem] tracking-[0.2em] text-muted-foreground/70">
            <span style={{ color: stageColor }}>{getCharacter(playerCharacter).name}</span>
            <span>@</span>
            <span>{getCharacter(opponentCharacter).name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
