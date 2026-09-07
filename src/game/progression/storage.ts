// FASE 8 — Almacenamiento de progresión (localStorage).
// Interfaz mínima: el resto del juego sólo llama a recordMatch/buildSummary.
// Para conectar un backend bastaría con reimplementar estas funciones.

import { STARTING_RATING, type MatchRecord, type PlayerStats } from "./types";
import { OPPONENT_RATING, ratingDelta } from "./ranking";

const STATS_KEY = "neon-circuit:stats:v1";
const HISTORY_KEY = "neon-circuit:history:v1";
const HISTORY_CAP = 100;

function defaultStats(): PlayerStats {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    matches: 0,
    kos: 0,
    damageDealt: 0,
    damageTaken: 0,
    currentStreak: 0,
    bestStreak: 0,
    rating: STARTING_RATING,
  };
}

export function loadPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...(JSON.parse(raw) as Partial<PlayerStats>) };
  } catch {
    return defaultStats();
  }
}

export function savePlayerStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // noop
  }
}

export function loadMatchHistory(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as MatchRecord[];
    return Array.isArray(list) ? list.slice(0, HISTORY_CAP) : [];
  } catch {
    return [];
  }
}

function saveMatchHistory(records: MatchRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, HISTORY_CAP)));
  } catch {
    // noop
  }
}

/** Básico del combate terminado, recogido por GameCanvas. */
export interface MatchSummary {
  playerCharacter: string;
  opponentCharacter: string;
  stageId: string;
  result: "win" | "loss" | "draw";
  aiLevel: string;
  durationSeconds: number;
  roundsWon: number;
  roundsLost: number;
  damageDealt: number;
  damageTaken: number;
  ko: boolean;
}

/**
 * Registra un combate terminado: actualiza estadísticas, historial y rating.
 * Devuelve lo que cambió (para la pantalla de resultados).
 */
export function recordMatch(summary: MatchSummary): { stats: PlayerStats; record: MatchRecord } {
  const stats = loadPlayerStats();
  const history = loadMatchHistory();
  const opRating = OPPONENT_RATING[summary.aiLevel] ?? 800;
  const delta = ratingDelta(summary.result, opRating, stats.rating);
  const ratingAfter = Math.max(0, stats.rating + delta);

  const record: MatchRecord = {
    date: new Date().toISOString(),
    playerCharacter: summary.playerCharacter,
    opponentCharacter: summary.opponentCharacter,
    stageId: summary.stageId,
    result: summary.result,
    durationSeconds: Math.round(summary.durationSeconds),
    roundsWon: summary.roundsWon,
    roundsLost: summary.roundsLost,
    damageDealt: Math.round(summary.damageDealt),
    damageTaken: Math.round(summary.damageTaken),
    ko: summary.ko,
    ratingDelta: delta,
    ratingAfter,
  };

  stats.matches += 1;
  if (summary.result === "win") {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    if (summary.ko) stats.kos += 1;
  } else if (summary.result === "loss") {
    stats.losses += 1;
    stats.currentStreak = 0;
  } else {
    stats.draws += 1;
    stats.currentStreak = 0;
  }
  stats.damageDealt += Math.round(summary.damageDealt);
  stats.damageTaken += Math.round(summary.damageTaken);
  stats.rating = ratingAfter;

  savePlayerStats(stats);
  history.unshift(record);
  saveMatchHistory(history);

  return { stats, record };
}

/** Borra toda la progresión (opción en la pantalla de estadísticas). */
export function resetProgress() {
  savePlayerStats(defaultStats());
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // noop
  }
}

/** Estadísticas derivadas que consume la UI. */
export function winRate(stats: PlayerStats): number {
  if (stats.matches === 0) return 0;
  return (stats.wins / stats.matches) * 100;
}
