// FASE 8 — Pantalla de estadísticas del jugador y ranking.

import { useMemo } from "react";
import { loadPlayerStats, resetProgress, winRate } from "../../game/progression/storage";
import { rankProgress } from "../../game/progression/ranking";
import { RANKS } from "../../game/progression/types";
import { MenuShell } from "./MenuShell";
import { audio } from "../../game/audio/AudioManager";

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const stats = useMemo(() => loadPlayerStats(), []);
  const rank = useMemo(() => rankProgress(stats.rating), [stats.rating]);
  const rate = winRate(stats);

  const wipe = () => {
    audio.ensureInit();
    audio.playSfx("menu");
    if (window.confirm("¿Borrar toda tu progresión? Esta acción no se puede deshacer.")) {
      resetProgress();
      window.location.reload();
    }
  };

  const StatCard = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-sm border border-border/60 bg-card/60 px-4 py-3">
      <div className="font-display text-2xl tracking-wider text-hud-timer">{value}</div>
      <div className="mt-1 text-[0.62rem] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
    </div>
  );

  return (
    <MenuShell title="ESTADÍSTICAS" subtitle="Progresión y ranking" onBack={onBack}>
      {/* Tarjeta de rango */}
      <div className="mb-6 rounded-md border border-border/70 bg-card/70 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-display text-4xl tracking-[0.2em]"
              style={{ color: rank.rank.color }}
            >
              {rank.rank.label}
            </div>
            <div className="mt-1 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
              Rating {stats.rating} · Rango local #{Math.max(1, 1600 - stats.rating)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-lg text-hud-stamina">{stats.rating}</div>
            <div className="text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
              PUNTOS
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-sm bg-muted">
          {rank.next ? (
            <div
              className="h-full"
              style={{
                width: `${Math.round(rank.intoNext * 100)}%`,
                background: rank.next.color,
              }}
            />
          ) : (
            <div className="h-full w-full" style={{ background: rank.rank.color }} />
          )}
        </div>
        <div className="mt-1 flex justify-between text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          <span>{rank.next ? `Próximo: ${rank.next.label}` : "Rango máximo"}</span>
          <span>{rank.next ? `${rank.next.min} pts` : ""}</span>
        </div>
      </div>

      {/* Fila principal */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Victorias" value={stats.wins} />
        <StatCard label="Derrotas" value={stats.losses} />
        <StatCard label="% Victoria" value={`${rate.toFixed(0)}%`} />
        <StatCard label="Combates" value={stats.matches} />
        <StatCard label="KOs" value={stats.kos} />
        <StatCard label="Racha actual" value={`${stats.currentStreak}`} />
        <StatCard label="Mejor racha" value={`${stats.bestStreak}`} />
        <StatCard label="Rating" value={stats.rating} />
        <StatCard label="Daño infligido" value={Math.round(stats.damageDealt)} />
        <StatCard label="Daño recibido" value={Math.round(stats.damageTaken)} />
      </div>

      {/* Leyenda de rangos */}
      <div className="mt-6 rounded-md border border-border/60 bg-card/40 p-4">
        <div className="mb-2 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
          Rangos
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {RANKS.map((r, i) => (
            <span key={r.id} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
              <span style={{ color: r.color }}>
                {r.label} <span className="text-muted-foreground">({r.min})</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={wipe}
        className="mt-6 rounded-sm border border-destructive/60 bg-destructive/10 px-4 py-2 text-[0.7rem] uppercase tracking-[0.25em] text-destructive transition hover:bg-destructive/20"
      >
        Borrar progreso
      </button>
    </MenuShell>
  );
}
