// Hitboxes / hurtboxes (FASE 2). Geometría simple y determinista: esferas de
// golpe contra cajas de cuerpo. Sin dependencias de render.

import type { AttackDef } from "../data/attacks";
import type { FighterState } from "../core/types";

export interface Box {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
}

export interface Sphere {
  cx: number;
  cy: number;
  cz: number;
  r: number;
}

/** Hurtbox del defensor: cambia al agacharse. */
export function hurtbox(f: FighterState): Box {
  const height = f.crouching ? 1.2 : 1.9;
  return {
    cx: f.x,
    cy: f.y + height / 2,
    cz: f.z,
    hx: 0.36,
    hy: height / 2,
    hz: 0.36,
  };
}

/** Hitbox activa del atacante. */
export function hitbox(f: FighterState, a: AttackDef): Sphere {
  return {
    cx: f.x + f.facing * a.reach,
    cy: f.y + a.height3d * (f.crouching ? 0.75 : 1),
    cz: f.z,
    r: a.radius,
  };
}

export function sphereHitsBox(s: Sphere, b: Box): boolean {
  const dx = Math.max(0, Math.abs(s.cx - b.cx) - b.hx);
  const dy = Math.max(0, Math.abs(s.cy - b.cy) - b.hy);
  const dz = Math.max(0, Math.abs(s.cz - b.cz) - b.hz);
  return dx * dx + dy * dy + dz * dz <= s.r * s.r;
}

/** Punto medio del contacto, usado por los VFX de impacto. */
export function contactPoint(s: Sphere, b: Box) {
  return {
    x: (s.cx + b.cx) / 2,
    y: (s.cy + Math.min(Math.max(s.cy, b.cy - b.hy), b.cy + b.hy)) / 2,
    z: (s.cz + b.cz) / 2,
  };
}
