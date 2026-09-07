// FASE 8 — Cálculo de rango a partir del rating interno.
// Modular: el rating lo decide el store; aquí sólo se deriva el rango.

import { RANKS, type RankDef, type RankProgress } from "./types";

export function getRank(rating: number): RankDef {
  let rank = RANKS[0] as RankDef;
  for (const r of RANKS) {
    if (rating >= r.min) rank = r;
  }
  return rank;
}

/** Progreso hacia el siguiente rango (null si ya es el máximo). */
export function rankProgress(rating: number): RankProgress {
  const current = getRank(rating);
  const idx = RANKS.findIndex((r) => r.id === current.id);
  const next = idx >= 0 && idx < RANKS.length - 1 ? (RANKS[idx + 1] as RankDef) : null;
  let intoNext = 0;
  if (next) {
    const span = next.min - current.min;
    intoNext = Math.max(0, Math.min(1, (rating - current.min) / span));
  }
  return { rank: current, next, intoNext };
}

/** Rating base de los rivales CPU según dificultad. */
export const OPPONENT_RATING: Record<string, number> = {
  idle: 500,
  easy: 700,
  normal: 1000,
};

/**
 * Variación Elo-lite del rating del jugador.
 * `opponentRating` es el rating base del rival (los CPU tienen un fijo).
 */
export function ratingDelta(
  result: "win" | "loss" | "draw",
  opponentRating: number,
  playerRating: number,
): number {
  const K = 40;
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const s = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  const delta = Math.round(K * (s - expected));
  return Math.max(-50, Math.min(50, delta));
}
