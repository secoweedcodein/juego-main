// Tipos base de la simulación. Sin dependencias de render: esta capa puede
// ejecutarse igual en el cliente (predicción) y en el servidor (autoridad).

export type Facing = 1 | -1;

export interface InputIntent {
  /** -1 atrás, +1 adelante (relativo al enfrentamiento) */
  forward: number;
  /** -1 / +1 desplazamiento lateral en profundidad */
  lateral: number;
  jump: boolean;
  dodge: boolean;
  crouch: boolean;
  /** ataques (FASE 2) */
  light: boolean;
  heavy: boolean;
  kick: boolean;
  grab: boolean;
  /** recoger / lanzar objeto (FASE 6) */
  interact: boolean;
}

export const EMPTY_INTENT: InputIntent = {
  forward: 0,
  lateral: 0,
  jump: false,
  dodge: false,
  crouch: false,
  light: false,
  heavy: false,
  kick: false,
  grab: false,
  interact: false,
};


export interface ActionState {
  attackId: string;
  /** tick actual dentro de la animación del ataque */
  frame: number;
  /** ya conectó (evita multi-hit del mismo golpe) */
  connected: boolean;
  /** el golpe acertó -> se habilitan cancels de combo */
  hitConfirmed: boolean;
}

export interface FighterState {
  id: string;
  characterId: string;
  /** eje principal del combate (izquierda/derecha en cámara lateral) */
  x: number;
  /** profundidad (movimiento lateral corto) */
  z: number;
  /** altura */
  y: number;
  vx: number;
  vz: number;
  vy: number;
  facing: Facing;
  grounded: boolean;
  crouching: boolean;
  /** ticks restantes de i-frames / desplazamiento de esquiva */
  dodgeTicks: number;
  dodgeCooldown: number;
  health: number;
  stamina: number;

  /* --- FASE 2: combate --- */
  action: ActionState | null;
  hitstun: number;
  blockstun: number;
  blocking: boolean;
  guardBroken: number;
  comboCount: number;
  comboTimer: number;
  /** ticks de feedback visual tras recibir un golpe */
  flash: number;
  attackBuffer: string | null;
  bufferTicks: number;
}

export type MatchPhase = "intro" | "fight" | "roundEnd" | "matchEnd";

export interface HitEvent {
  tick: number;
  attackerId: string;
  defenderId: string;
  attackId: string;
  damage: number;
  blocked: boolean;
  combo: number;
  /** posición mundial del impacto (para VFX) */
  x: number;
  y: number;
  z: number;
}

export interface MatchState {
  tick: number;
  fighters: [FighterState, FighterState];

  /* --- FASE 3: rounds --- */
  phase: MatchPhase;
  /** ticks restantes de la fase actual (intro / roundEnd / matchEnd) */
  phaseTicks: number;
  round: number;
  wins: [number, number];
  /** ticks restantes de reloj de round */
  timer: number;
  /** 0 = p1, 1 = p2, -1 = empate/doble KO */
  lastRoundWinner: number;
  announce: string;
  /** eventos consumidos por render/audio cada frame */
  events: HitEvent[];
}

export const TICK_RATE = 60;
export const TICK_DT = 1 / TICK_RATE;

/** Límites del área jugable (se sobreescriben por mapa en la FASE 5). */
export const STAGE_BOUNDS = { x: 8.5, z: 2.6 };

/* Reglas de match (FASE 3) */
export const ROUND_SECONDS = 99;
export const ROUNDS_TO_WIN = 2;
export const INTRO_TICKS = TICK_RATE * 2;
export const ROUND_END_TICKS = TICK_RATE * 3;
