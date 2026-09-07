// Diseño data-driven: cada luchador es datos, no lógica duplicada.
// La FASE 4 amplía este archivo con movelists, combos y habilidades.

export interface MovementStats {
  accel: number;
  maxForward: number;
  maxBackward: number;
  maxLateral: number;
  /** coeficiente de amortiguación exponencial */
  drag: number;
  jumpVelocity: number;
  gravity: number;
  dodgeImpulse: number;
  dodgeStamina: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  archetype: string;
  description: string;
  /** 1-5, mostrado en la pantalla de selección */
  stats: { power: number; speed: number; range: number; defense: number; tech: number };
  colors: {
    suit: string;
    accent: string;
    skin: string;
    pants: string;
    hair: string;
    gloves: string;
    trim: string;
  };
  movement: MovementStats;
  maxHealth: number;
  maxStamina: number;
}

const BASE_MOVEMENT: MovementStats = {
  accel: 46,
  maxForward: 6.2,
  maxBackward: 4.4,
  maxLateral: 3.6,
  drag: 9,
  jumpVelocity: 8.4,
  gravity: 23,
  dodgeImpulse: 11,
  dodgeStamina: 22,
};

export const CHARACTERS: Record<string, CharacterDef> = {
  vulcan: {
    id: "vulcan",
    name: "VULCAN",
    archetype: "Boxer",
    description: "Presión constante y combos cortos. Poco alcance, mucha amenaza.",
    stats: { power: 4, speed: 5, range: 2, defense: 3, tech: 3 },
    colors: {
      suit: "#182030",
      accent: "#00f0ff",
      skin: "#c68a5c",
      pants: "#111625",
      hair: "#1e2433",
      gloves: "#00d4eb",
      trim: "#ffd15c",
    },
    movement: { ...BASE_MOVEMENT, maxForward: 6.8, accel: 52 },
    maxHealth: 100,
    maxStamina: 100,
  },
  kestrel: {
    id: "kestrel",
    name: "KESTREL",
    archetype: "Kickboxer",
    description: "Control de distancia con patadas largas y movilidad.",
    stats: { power: 3, speed: 4, range: 5, defense: 3, tech: 3 },
    colors: {
      suit: "#23152c",
      accent: "#ff2d87",
      skin: "#a0694e",
      pants: "#180e20",
      hair: "#2a1738",
      gloves: "#ff3b94",
      trim: "#ffffff",
    },
    movement: { ...BASE_MOVEMENT, maxLateral: 4.2 },
    maxHealth: 100,
    maxStamina: 100,
  },
  bolt: {
    id: "bolt",
    name: "BOLT",
    archetype: "Grappler",
    description: "Agarres y castigos demoledores. Lento pero devastador.",
    stats: { power: 5, speed: 2, range: 2, defense: 5, tech: 2 },
    colors: {
      suit: "#241b12",
      accent: "#ff9e1b",
      skin: "#855535",
      pants: "#18120c",
      hair: "#140f0a",
      gloves: "#e07a00",
      trim: "#ffc83b",
    },
    movement: { ...BASE_MOVEMENT, accel: 34, maxForward: 4.8, maxBackward: 3.4, jumpVelocity: 7.4 },
    maxHealth: 120,
    maxStamina: 90,
  },
  ash: {
    id: "ash",
    name: "ASH",
    archetype: "Street Fighter",
    description: "Equilibrado y recomendado para empezar. Golpes, patadas y tecnología.",
    stats: { power: 3, speed: 4, range: 3, defense: 4, tech: 4 },
    colors: {
      suit: "#12241e",
      accent: "#38ef7d",
      skin: "#b47b59",
      pants: "#0e1c17",
      hair: "#1c2420",
      gloves: "#2bd66b",
      trim: "#f1faee",
    },
    movement: BASE_MOVEMENT,
    maxHealth: 100,
    maxStamina: 110,
  },
};

export const DEFAULT_CHARACTER_ID = "ash";

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS[id] ?? (CHARACTERS[DEFAULT_CHARACTER_ID] as CharacterDef);
}
