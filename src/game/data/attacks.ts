// Movelist data-driven (FASE 2). Frames en ticks a 60 Hz.
// startup -> active -> recovery. La hitbox sólo existe durante `active`.

export type AttackKind = "light" | "heavy" | "kick" | "grab";
export type Height = "high" | "mid" | "low";

export interface AttackDef {
  id: string;
  name: string;
  kind: AttackKind;
  height: Height;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  /** daño al bloquear */
  chip: number;
  staminaCost: number;
  /** stamina que consume al defensor al bloquear */
  guardDrain: number;
  hitstun: number;
  blockstun: number;
  /** alcance desde el centro del atacante */
  reach: number;
  radius: number;
  /** altura del centro de la hitbox */
  height3d: number;
  knockback: number;
  /** empuje del atacante al golpear */
  advance: number;
  /** ataques a los que se puede cancelar tras confirmar impacto */
  cancelInto: string[];
}

const A = (d: AttackDef) => d;

/** Movelist base compartida; cada personaje escala daño/velocidad. */
export const BASE_MOVES: Record<string, AttackDef> = {
  light: A({
    id: "light",
    name: "Jab",
    kind: "light",
    height: "high",
    startup: 5,
    active: 4,
    recovery: 9,
    damage: 5,
    chip: 0.6,
    staminaCost: 5,
    guardDrain: 4,
    hitstun: 14,
    blockstun: 9,
    reach: 1.05,
    radius: 0.5,
    height3d: 1.35,
    knockback: 1.6,
    advance: 0.6,
    cancelInto: ["light", "heavy", "kick"],
  }),
  heavy: A({
    id: "heavy",
    name: "Cross",
    kind: "heavy",
    height: "high",
    startup: 13,
    active: 5,
    recovery: 20,
    damage: 13,
    chip: 2,
    staminaCost: 16,
    guardDrain: 14,
    hitstun: 26,
    blockstun: 14,
    reach: 1.25,
    radius: 0.55,
    height3d: 1.4,
    knockback: 5.2,
    advance: 1.1,
    cancelInto: [],
  }),
  kick: A({
    id: "kick",
    name: "Roundhouse",
    kind: "kick",
    height: "mid",
    startup: 10,
    active: 5,
    recovery: 17,
    damage: 10,
    chip: 1.5,
    staminaCost: 13,
    guardDrain: 11,
    hitstun: 22,
    blockstun: 12,
    reach: 1.6,
    radius: 0.55,
    height3d: 1.0,
    knockback: 4.4,
    advance: 0.8,
    cancelInto: ["heavy"],
  }),
  grab: A({
    id: "grab",
    name: "Throw",
    kind: "grab",
    height: "mid",
    startup: 9,
    active: 4,
    recovery: 28,
    damage: 16,
    chip: 0,
    staminaCost: 20,
    guardDrain: 0,
    hitstun: 40,
    blockstun: 0,
    reach: 0.95,
    radius: 0.45,
    height3d: 1.1,
    knockback: 7.5,
    advance: 0.3,
    cancelInto: [],
  }),
};

/** Ajustes por personaje: multiplicadores y overrides puntuales. */
export interface MoveTuning {
  damage?: number;
  reach?: number;
  speed?: number;
}

export const CHARACTER_TUNING: Record<string, Partial<Record<string, MoveTuning>>> = {
  vulcan: {
    light: { damage: 1.15, speed: 0.85 },
    heavy: { damage: 1.2 },
    kick: { damage: 0.85, reach: 0.9 },
  },
  kestrel: {
    kick: { damage: 1.2, reach: 1.25, speed: 0.9 },
    light: { reach: 1.1 },
    grab: { damage: 0.85 },
  },
  bolt: {
    grab: { damage: 1.6, reach: 1.15 },
    heavy: { damage: 1.25, speed: 1.15 },
    light: { speed: 1.15 },
  },
  ash: {},
};

const cache = new Map<string, AttackDef>();

export function getAttack(characterId: string, attackId: string): AttackDef {
  const key = `${characterId}:${attackId}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const base = BASE_MOVES[attackId] ?? BASE_MOVES["light"]!;
  const t = CHARACTER_TUNING[characterId]?.[attackId] ?? {};
  const speed = t.speed ?? 1;
  const def: AttackDef = {
    ...base,
    damage: Math.round(base.damage * (t.damage ?? 1) * 10) / 10,
    chip: Math.round(base.chip * (t.damage ?? 1) * 10) / 10,
    reach: base.reach * (t.reach ?? 1),
    startup: Math.max(3, Math.round(base.startup * speed)),
    recovery: Math.max(4, Math.round(base.recovery * speed)),
  };
  cache.set(key, def);
  return def;
}

export function attackDuration(a: AttackDef) {
  return a.startup + a.active + a.recovery;
}
