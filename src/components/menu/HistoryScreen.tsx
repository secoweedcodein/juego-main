// FASE 8 — Pantalla de historial de combates.

import { useMemo } from "react";
import { loadMatchHistory } from "../../game/progression/storage";
import { getCharacter } from "../../game/data/characters";
import { getStage } from "../../game/data/stages";
import { MenuShell } from "./MenuShell";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const history = useMemo(() => loadMatchHistory(), []);

  return (
    <MenuShell title="HISTORIAL" subtitle="Últimos combates" onBack={onBack}>
      {history.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
          <div className="font-display text-sm tracking-[0.3em] text-muted-foreground">
            AÚN NO HAY COMBATES
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            Termina un combate para que quede registrado aquí.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((r, i) => {
            const p = getCharacter(r.playerCharacter);
            const o = getCharacter(r.opponentCharacter);
            const s = getStage(r.stageId);
            const resultColor =
              r.result === "win"
                ? "text-hud-stamina"
                : r.result === "loss"
                  ? "text-destructive"
                  : "text-hud-timer";
            return (
              <li
                key={`${r.date}-${i}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-border/60 bg-card/60 px-4 py-3"
              >
                <span className={`w-14 font-display text-sm tracking-[0.2em] ${resultColor}`}>
                  {r.result === "win" ? "VICT." : r.result === "loss" ? "DERROTA" : "EMPATE"}
                </span>
                <span
                  className="font-display text-sm tracking-widest"
                  style={{ color: p.colors.accent }}
                >
                  {p.name}
                </span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span
                  className="font-display text-sm tracking-widest"
                  style={{ color: o.colors.accent }}
                >
                  {o.name}
                </span>
                <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {r.roundsWon}-{r.roundsLost} · {s.name} · {r.durationSeconds}s
                </span>
                <span className="ml-auto text-[0.62rem] tracking-[0.15em] text-muted-foreground/70">
                  {fmtDate(r.date)}
                </span>
                <span
                  className={`text-xs tabular-nums ${
                    r.ratingDelta > 0
                      ? "text-hud-stamina"
                      : r.ratingDelta < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {r.ratingDelta > 0 ? "+" : ""}
                  {r.ratingDelta}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </MenuShell>
  );
}
