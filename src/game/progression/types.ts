// FASE 8 — Tipos de progresión del jugador.
// Data model independiente del almacenamiento: lo consume igualmente un
// store local (localStorage) o un backend futuro.

export type MatchResult = "win" | "loss" | "draw";

export interface MatchRecord {
  /** ISO timestamp */
  date: string;
  playerCharacter: string;
  opponentCharacter: string;
  stageId: string;
  result: MatchResult;
  /** duración del combate en segundos */
  durationSeconds: number;
  roundsWon: number;
  roundsLost: number;
  damageDealt: number;
  damageTaken: number;
  /** el combate terminó por KO del rival */
  ko: boolean;
  /** variación de rating del jugador */
  ratingDelta: number;
  /** rating tras el combate */
  ratingAfter: number;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  kos: number;
  damageDealt: number;
  damageTaken: number;
  currentStreak: number;
  bestStreak: number;
  rating: number;
}

export interface RankDef {
  id: string;
  label: string;
  /** rating mínimo para alcanzar este rango */
  min: number;
  color: string;
}

export interface RankProgress {
  rank: RankDef;
  next: RankDef | null;
  /** 0..1 hacia el siguiente rango */
  intoNext: number;
}

export const STARTING_RATING = 800;

export const RANKS: RankDef[] = [
  { id: "bronze", label: "BRONZE", min: 0, color: "#cd7f32" },
  { id: "silver", label: "SILVER", min: 1000, color: "#c0c8d4" },
  { id: "gold", label: "GOLD", min: 1200, color: "#ffc84a" },
  { id: "platinum", label: "PLATINUM", min: 1400, color: "#8fe0c9" },
  { id: "diamond", label: "DIAMOND", min: 1600, color: "#6fd3ff" },
  { id: "master", label: "MASTER", min: 1800, color: "#ff5ad0" },
];
