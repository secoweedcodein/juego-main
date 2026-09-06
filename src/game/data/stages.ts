// FASE 5 — Mapas data-driven. Añadir un mapa = añadir un objeto aquí + su
// componente de render en src/game/render/stages.

export type HazardKind = "none" | "strike" | "fence";
export type PropKind = "pipe" | "crate" | "bottle" | "barrel";

export interface PropSpawn {
  id: string;
  kind: PropKind;
  x: number;
  z: number;
}

export interface HazardDef {
  kind: HazardKind;
  /** ticks entre activaciones (strike) */
  interval: number;
  /** ticks de aviso previo */
  warn: number;
  /** ticks de daño activo */
  active: number;
  damage: number;
  /** radio de la zona de daño (strike) o margen del borde (fence) */
  radius: number;
  label: string;
}

export interface StageDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  bounds: { x: number; z: number };
  /** los luchadores pueden caer fuera del escenario */
  ringOut: boolean;
  hazard: HazardDef;
  props: PropSpawn[];
  /** paleta usada por el menú y el HUD */
  palette: { primary: string; secondary: string; sky: string };
}

const NO_HAZARD: HazardDef = {
  kind: "none",
  interval: 0,
  warn: 0,
  active: 0,
  damage: 0,
  radius: 0,
  label: "",
};

export const STAGES: Record<string, StageDef> = {
  neon: {
    id: "neon",
    name: "NEON DISTRICT",
    subtitle: "Calle comercial · lluvia",
    description:
      "Callejón de neón bajo la lluvia. Los carteles rotos descargan chispazos eléctricos sobre el asfalto.",
    bounds: { x: 8.5, z: 2.6 },
    ringOut: false,
    hazard: {
      kind: "strike",
      interval: 60 * 11,
      warn: 90,
      active: 26,
      damage: 9,
      radius: 1.5,
      label: "DESCARGA",
    },
    props: [
      { id: "pipe-a", kind: "pipe", x: -5.4, z: 1.4 },
      { id: "bottle-a", kind: "bottle", x: 5.6, z: -1.3 },
      { id: "crate-a", kind: "crate", x: 0.4, z: 2.0 },
    ],
    palette: { primary: "#00e5ff", secondary: "#ff2f8e", sky: "#05070d" },
  },
  iron: {
    id: "iron",
    name: "IRON YARD",
    subtitle: "Patio de prisión · vallas electrificadas",
    description:
      "Patio cerrado con público al otro lado de la reja. Los límites están electrificados: no te dejes acorralar.",
    bounds: { x: 7.4, z: 2.4 },
    ringOut: false,
    hazard: {
      kind: "fence",
      interval: 0,
      warn: 0,
      active: 0,
      damage: 4,
      radius: 0.35,
      label: "VALLA ELÉCTRICA",
    },
    props: [
      { id: "pipe-b", kind: "pipe", x: -4.2, z: -1.6 },
      { id: "barrel-b", kind: "barrel", x: 4.6, z: 1.5 },
      { id: "crate-b", kind: "crate", x: -0.6, z: 1.9 },
    ],
    palette: { primary: "#ffb02e", secondary: "#7cff5c", sky: "#0a0b0e" },
  },
  docks: {
    id: "docks",
    name: "BLACKWATER DOCKS",
    subtitle: "Muelle industrial · ring-out",
    description:
      "Plataforma de carga sobre agua negra y niebla. Un golpe fuerte cerca del borde termina el round.",
    bounds: { x: 6.6, z: 2.3 },
    ringOut: true,
    hazard: NO_HAZARD,
    props: [
      { id: "crate-c", kind: "crate", x: -3.6, z: 1.5 },
      { id: "barrel-c", kind: "barrel", x: 3.8, z: -1.4 },
      { id: "pipe-c", kind: "pipe", x: 0.2, z: -1.9 },
    ],
    palette: { primary: "#5ad2ff", secondary: "#8be0c0", sky: "#060a0c" },
  },
};

export const STAGE_LIST = Object.values(STAGES);
export const DEFAULT_STAGE_ID = "neon";

export function getStage(id: string): StageDef {
  return STAGES[id] ?? (STAGES[DEFAULT_STAGE_ID] as StageDef);
}

/** Estadísticas de cada objeto recogible (FASE 6). */
export const PROP_STATS: Record<
  PropKind,
  {
    label: string;
    /** daño extra al golpear con el objeto en mano */
    meleeBonus: number;
    /** alcance extra */
    reachBonus: number;
    /** daño al lanzarlo */
    throwDamage: number;
    /** golpes que aguanta antes de romperse */
    durability: number;
    color: string;
    size: [number, number, number];
  }
> = {
  pipe: {
    label: "TUBO",
    meleeBonus: 7,
    reachBonus: 0.35,
    throwDamage: 11,
    durability: 4,
    color: "#9fb2c6",
    size: [0.11, 1.35, 0.11],
  },
  crate: {
    label: "CAJA",
    meleeBonus: 4,
    reachBonus: 0.1,
    throwDamage: 13,
    durability: 1,
    color: "#8a6a3f",
    size: [0.6, 0.6, 0.6],
  },
  bottle: {
    label: "BOTELLA",
    meleeBonus: 3,
    reachBonus: 0.05,
    throwDamage: 8,
    durability: 1,
    color: "#5ad2a0",
    size: [0.16, 0.42, 0.16],
  },
  barrel: {
    label: "BIDÓN",
    meleeBonus: 6,
    reachBonus: 0.15,
    throwDamage: 16,
    durability: 2,
    color: "#b8532f",
    size: [0.55, 0.8, 0.55],
  },
};
