// HUD (FASES 1-3): vida, stamina, timer real, pips de round, combos y anuncios.

import { useEffect, useRef, useState } from "react";
import type { MatchState } from "../../game/core/types";
import { ROUNDS_TO_WIN, TICK_RATE } from "../../game/core/types";
import { getCharacter } from "../../game/data/characters";
import { PROP_STATS, getStage, type PropKind } from "../../game/data/stages";

function Bar({
  value,
  max,
  mirrored,
  tone,
}: {
  value: number;
  max: number;
  mirrored?: boolean;
  tone: "health" | "stamina";
}) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div
      className={`h-full w-full overflow-hidden border border-border bg-muted ${
        tone === "health" ? "shadow-neon" : ""
      }`}
    >
      <div
        className={`h-full transition-[width] duration-150 ${
          tone === "health" ? "bg-hud-health" : "bg-hud-stamina"
        }`}
        style={{ width: `${pct}%`, marginLeft: mirrored ? `${100 - pct}%` : undefined }}
      />
    </div>
  );
}

function Pips({ wins, mirrored }: { wins: number; mirrored?: boolean }) {
  return (
    <div className={`mt-1 flex gap-1 ${mirrored ? "justify-end" : ""}`}>
      {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rotate-45 border border-border ${
            i < wins ? "bg-hud-timer shadow-neon" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function CoreHud({ match }: { match: React.RefObject<MatchState> }) {
  const [, force] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const loop = () => {
      if (!mounted) return;
      force((n) => (n + 1) % 1000);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const m = match.current;
  if (!m) return null;
  const [p1, p2] = m.fighters;
  const c1 = getCharacter(p1.characterId);
  const c2 = getCharacter(p2.characterId);
  const seconds = Math.ceil(m.timer / TICK_RATE);
  const stage = getStage(m.stageId);

  const weaponLabel = (weapon: string | null) => {
    if (!weapon) return null;
    const prop = m.props.find((p) => p.id === weapon);
    if (!prop) return null;
    return (PROP_STATS[prop.kind as PropKind] ?? PROP_STATS.crate).label;
  };
  const w1 = weaponLabel(p1.weapon);
  const w2 = weaponLabel(p2.weapon);

  const showAnnounce =
    m.phase === "intro" ||
    m.phase === "roundEnd" ||
    m.phase === "matchEnd" ||
    (m.phase === "fight" && m.phaseTicks > 0);

  const matchWinner =
    m.phase === "matchEnd" ? (m.wins[0] > m.wins[1] ? c1.name : c2.name) : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      <div className="flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="w-[38%] max-w-md">
          <div className="mb-1 font-display text-sm tracking-[0.25em] text-foreground">
            {c1.name}
          </div>
          <div className="h-4">
            <Bar value={p1.health} max={c1.maxHealth} tone="health" />
          </div>
          <div className="mt-1 h-2">
            <Bar value={p1.stamina} max={c1.maxStamina} tone="stamina" />
          </div>
          <Pips wins={m.wins[0]} />
          {w1 && (
            <div className="mt-2 inline-block border border-hud-timer/60 px-2 py-0.5 text-[10px] tracking-[0.25em] text-hud-timer">
              {w1}
            </div>
          )}
          {p1.comboCount > 1 && (
            <div className="mt-2 font-display text-lg text-hud-timer">{p1.comboCount} HITS</div>
          )}
        </div>

        <div className="text-center">
          <div className="font-display text-3xl leading-none text-hud-timer md:text-4xl">
            {seconds}
          </div>
          <div className="mt-1 text-[0.65rem] tracking-[0.35em] text-muted-foreground">
            ROUND {m.round}
          </div>
          <div className="mt-1 text-[0.6rem] tracking-[0.3em] text-muted-foreground/70">
            {stage.name}
          </div>
          {m.hazardWarning && (
            <div className="mt-2 animate-pulse border border-destructive/70 px-2 py-1 text-[0.65rem] tracking-[0.3em] text-destructive">
              {m.hazardWarning}
            </div>
          )}
        </div>

        <div className="w-[38%] max-w-md text-right">
          <div className="mb-1 font-display text-sm tracking-[0.25em] text-foreground">
            {c2.name}
          </div>
          <div className="h-4">
            <Bar value={p2.health} max={c2.maxHealth} tone="health" mirrored />
          </div>
          <div className="mt-1 h-2">
            <Bar value={p2.stamina} max={c2.maxStamina} tone="stamina" mirrored />
          </div>
          <Pips wins={m.wins[1]} mirrored />
          {w2 && (
            <div className="mt-2 inline-block border border-hud-timer/60 px-2 py-0.5 text-[10px] tracking-[0.25em] text-hud-timer">
              {w2}
            </div>
          )}
          {p2.comboCount > 1 && (
            <div className="mt-2 font-display text-lg text-hud-timer">{p2.comboCount} HITS</div>
          )}
        </div>
      </div>

      {showAnnounce && (
        <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="font-display text-5xl tracking-[0.2em] text-hud-timer drop-shadow-[0_0_18px_currentColor] md:text-7xl">
            {m.announce}
          </div>
          {matchWinner && (
            <div className="mt-3 font-display text-xl tracking-[0.3em] text-foreground">
              {matchWinner} GANA EL COMBATE
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded border border-border bg-card/70 px-4 py-2 text-center text-[0.7rem] tracking-[0.2em] text-muted-foreground backdrop-blur">
        W/S AVANZAR (S = BLOQUEAR) · A/D LATERAL · SPACE SALTO · SHIFT ESQUIVA · CTRL AGACHARSE
        <br />J GOLPE · K FUERTE · L PATADA · U AGARRE · F RECOGER/LANZAR
      </div>
    </div>
  );
}
