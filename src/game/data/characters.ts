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
    name: "VOLT",
    archetype: "Boxer",
    description:
      "Boxeador cibernético que presiona sin tregua. Puños rápidos, visor de anticipación y cortinas de golpes cortos.",
    stats: { power: 4, speed: 5, range: 2, defense: 3, tech: 3 },
    colors: {
      suit: "#14222e",
      accent: "#00f6ff",
      skin: "#c68a5c",
      pants: "#0d141f",
      hair: "#141c26",
      gloves: "#00e0f0",
      trim: "#ffd24d",
    },
    movement: { ...BASE_MOVEMENT, maxForward: 6.8, accel: 52 },
    maxHealth: 100,
    maxStamina: 100,
  },
  kestrel: {
    id: "kestrel",
    name: "NYX",
    archetype: "Kickboxer",
    description:
      "Kickboxer de élite que dicta el ritmo desde lejos. Patadas largas y pasos laterales convierten la distancia en ventaja.",
    stats: { power: 3, speed: 4, range: 5, defense: 3, tech: 3 },
    colors: {
      suit: "#231230",
      accent: "#ff2f9e",
      skin: "#a86a50",
      pants: "#170a1e",
      hair: "#2c143a",
      gloves: "#ff3f96",
      trim: "#ffffff",
    },
    movement: { ...BASE_MOVEMENT, maxLateral: 4.2 },
    maxHealth: 100,
    maxStamina: 100,
  },
  bolt: {
    id: "bolt",
    name: "BRUTE",
    archetype: "Grappler",
    description:
      "La fuerza bruta del circuito. Golpe demoledor, armadura pesada y un agarre que termina las peleas.",
    stats: { power: 5, speed: 2, range: 2, defense: 5, tech: 2 },
    colors: {
      suit: "#2a1c10",
      accent: "#ff9e1b",
      skin: "#8a5636",
      pants: "#1b1109",
      hair: "#120c07",
      gloves: "#ff9c14",
      trim: "#ffd24d",
    },
    movement: { ...BASE_MOVEMENT, accel: 34, maxForward: 4.8, maxBackward: 3.4, jumpVelocity: 7.4 },
    maxHealth: 120,
    maxStamina: 90,
  },
  ash: {
    id: "ash",
    name: "KIRA",
    archetype: "Street Fighter",
    description:
      "Contraatacadora perfecta. Compacta, técnica y letal leyendo los errores del rival. Movimiento constante e imprevisible.",
    stats: { power: 3, speed: 4, range: 3, defense: 4, tech: 4 },
    colors: {
      suit: "#0f2620",
      accent: "#3dff8f",
      skin: "#b57c5a",
      pants: "#091b15",
      hair: "#162420",
      gloves: "#2fe07a",
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
