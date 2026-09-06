// FASE 6 — Objetos interactivos, armas improvisadas y peligros del escenario.
// Determinista y sin dependencias de render (reutilizable en servidor).

import { PROP_STATS, getStage, type PropKind, type StageDef } from "../data/stages";
import { hurtbox } from "../combat/hitbox";
import { TICK_DT, TICK_RATE, type FighterState, type HitEvent, type MatchState, type PropState, type HazardState } from "../core/types";

const PICKUP_RANGE = 1.15;
const INTERACT_COOLDOWN = 18;
const THROW_SPEED = 13;
const RESPAWN_TICKS = TICK_RATE * 8;
const GRAVITY = 20;

export function propStats(kind: string) {
  return PROP_STATS[kind as PropKind] ?? PROP_STATS.crate;
}

export function createProps(stage: StageDef): PropState[] {
  return stage.props.map((p) => ({
    id: p.id,
    kind: p.kind,
    x: p.x,
    y: 0,
    z: p.z,
    vx: 0,
    vy: 0,
    vz: 0,
    phase: "ground" as const,
    holder: null,
    hp: propStats(p.kind).durability,
    respawn: 0,
    spin: 0,
  }));
}

export function createHazard(stage: StageDef): HazardState {
  return {
    timer: stage.hazard.kind === "strike" ? stage.hazard.interval : 0,
    phase: "idle",
    x: 0,
    ticks: 0,
  };
}

/** Objeto que lleva un luchador en la mano. */
export function heldProp(state: MatchState, f: FighterState): PropState | null {
  if (!f.weapon) return null;
  return state.props.find((p) => p.id === f.weapon && p.phase === "held") ?? null;
}

/** Bonus de arma aplicado a los ataques cuerpo a cuerpo. */
export function weaponBonus(state: MatchState, f: FighterState) {
  const prop = heldProp(state, f);
  if (!prop) return { damage: 0, reach: 0, prop: null as PropState | null };
  const st = propStats(prop.kind);
  return { damage: st.meleeBonus, reach: st.reachBonus, prop };
}

/** Consume durabilidad al golpear con el arma; la rompe si se agota. */
export function useWeapon(state: MatchState, f: FighterState) {
  const prop = heldProp(state, f);
  if (!prop) return;
  prop.hp -= 1;
  if (prop.hp <= 0) breakProp(state, prop);
}

function breakProp(state: MatchState, prop: PropState) {
  const holder = state.fighters.find((f) => f.weapon === prop.id);
  if (holder) holder.weapon = null;
  prop.phase = "broken";
  prop.holder = null;
  prop.respawn = RESPAWN_TICKS;
  prop.vx = 0;
  prop.vy = 0;
  prop.vz = 0;
}

/** F: recoge el objeto más cercano, o lanza el que ya lleva. */
function tryInteract(state: MatchState, f: FighterState) {
  if (f.interactCooldown > 0) return;
  const held = heldProp(state, f);
  if (held) {
    held.phase = "flying";
    held.holder = f.id;
    held.x = f.x + f.facing * 0.55;
    held.y = f.y + 1.15;
    held.z = f.z;
    held.vx = f.facing * THROW_SPEED;
    held.vy = 2.4;
    held.vz = 0;
    f.weapon = null;
    f.interactCooldown = INTERACT_COOLDOWN;
    return;
  }
  let best: PropState | null = null;
  let bestDist = PICKUP_RANGE;
  for (const p of state.props) {
    if (p.phase !== "ground") continue;
    const d = Math.hypot(p.x - f.x, p.z - f.z);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  if (best) {
    best.phase = "held";
    best.holder = f.id;
    f.weapon = best.id;
    f.interactCooldown = INTERACT_COOLDOWN;
  }
}

/** Avanza objetos: sostenidos, en vuelo, rotos y reapariciones. */
export function stepProps(
  state: MatchState,
  interacts: [boolean, boolean],
  stage: StageDef,
): HitEvent[] {
  const events: HitEvent[] = [];
  const fighters = state.fighters;

  fighters.forEach((f, i) => {
    if (f.interactCooldown > 0) f.interactCooldown--;
    const canAct = state.phase === "fight" && f.hitstun === 0 && !f.action && f.grounded;
    if (interacts[i] && canAct) tryInteract(state, f);
    // Al ser golpeado con fuerza se suelta el arma.
    if (f.weapon && f.hitstun > 14) {
      const prop = heldProp(state, f);
      if (prop) {
        prop.phase = "ground";
        prop.holder = null;
        prop.x = f.x - f.facing * 0.6;
        prop.z = f.z;
        prop.y = 0;
        f.weapon = null;
      }
    }
  });

  for (const p of state.props) {
    if (p.phase === "broken") {
      p.respawn--;
      if (p.respawn <= 0) {
        const spawn = stage.props.find((s) => s.id === p.id);
        p.phase = "ground";
        p.hp = propStats(p.kind).durability;
        p.x = spawn?.x ?? 0;
        p.z = spawn?.z ?? 0;
        p.y = 0;
        p.vx = 0;
        p.vy = 0;
      }
      continue;
    }

    if (p.phase === "held") {
      const holder = fighters.find((f) => f.id === p.holder);
      if (!holder) {
        p.phase = "ground";
        p.holder = null;
        continue;
      }
      p.x = holder.x + holder.facing * 0.42;
      p.y = holder.y + 1.0;
      p.z = holder.z + 0.18;
      p.spin = holder.facing === 1 ? 0.4 : -0.4;
      continue;
    }

    if (p.phase === "flying") {
      p.vy -= GRAVITY * TICK_DT;
      p.x += p.vx * TICK_DT;
      p.y += p.vy * TICK_DT;
      p.z += p.vz * TICK_DT;
      p.spin += 18 * TICK_DT;

      const target = fighters.find((f) => f.id !== p.holder);
      if (target && target.dodgeTicks === 0) {
        const b = hurtbox(target);
        const near =
          Math.abs(p.x - b.cx) < b.hx + 0.3 &&
          Math.abs(p.y - b.cy) < b.hy + 0.3 &&
          Math.abs(p.z - b.cz) < b.hz + 0.4;
        if (near) {
          const st = propStats(p.kind);
          const blocked = target.blocking;
          const dmg = blocked ? Math.round(st.throwDamage * 0.25) : st.throwDamage;
          target.health = Math.max(0, target.health - dmg);
          if (!blocked) {
            target.hitstun = 20;
            target.flash = 8;
            target.vx += Math.sign(p.vx) * 2.6;
          } else {
            target.blockstun = 12;
          }
          events.push({
            tick: state.tick,
            attackerId: p.holder ?? "prop",
            defenderId: target.id,
            attackId: `throw-${p.kind}`,
            damage: dmg,
            blocked,
            combo: 0,
            x: p.x,
            y: p.y,
            z: p.z,
          });
          breakProp(state, p);
          continue;
        }
      }

      if (p.y <= 0.2 || Math.abs(p.x) > stage.bounds.x + 1) {
        breakProp(state, p);
      }
    }
  }

  return events;
}

/** Peligros del escenario: descargas periódicas o límites electrificados. */
export function stepHazard(state: MatchState, stage: StageDef): HitEvent[] {
  const events: HitEvent[] = [];
  const def = stage.hazard;
  const h = state.hazard;
  state.hazardWarning = "";
  if (def.kind === "none" || state.phase !== "fight") return events;

  if (def.kind === "fence") {
    for (const f of state.fighters) {
      const edge = stage.bounds.x - def.radius;
      if (Math.abs(f.x) >= edge) {
        state.hazardWarning = def.label;
        if (state.tick % 22 === 0) {
          f.health = Math.max(0, f.health - def.damage);
          f.flash = 8;
          f.hitstun = Math.max(f.hitstun, 10);
          f.vx = -Math.sign(f.x) * 5.5;
          events.push({
            tick: state.tick,
            attackerId: "stage",
            defenderId: f.id,
            attackId: "fence",
            damage: def.damage,
            blocked: false,
            combo: 0,
            x: Math.sign(f.x) * stage.bounds.x,
            y: f.y + 1,
            z: f.z,
          });
        }
      }
    }
    return events;
  }

  // strike: aviso -> descarga en una posición del suelo
  if (h.phase === "idle") {
    h.timer--;
    if (h.timer <= 0) {
      h.phase = "warn";
      h.ticks = def.warn;
      const mid = (state.fighters[0].x + state.fighters[1].x) / 2;
      h.x = Math.max(-stage.bounds.x + 1, Math.min(stage.bounds.x - 1, mid));
    }
  } else if (h.phase === "warn") {
    state.hazardWarning = `${def.label} INMINENTE`;
    h.ticks--;
    if (h.ticks <= 0) {
      h.phase = "active";
      h.ticks = def.active;
    }
  } else {
    state.hazardWarning = def.label;
    h.ticks--;
    for (const f of state.fighters) {
      if (Math.abs(f.x - h.x) < def.radius && f.y < 1.2 && state.tick % 12 === 0) {
        f.health = Math.max(0, f.health - def.damage);
        f.flash = 10;
        f.hitstun = Math.max(f.hitstun, 16);
        f.vx += Math.sign(f.x - h.x || 1) * 4;
        events.push({
          tick: state.tick,
          attackerId: "stage",
          defenderId: f.id,
          attackId: "strike",
          damage: def.damage,
          blocked: false,
          combo: 0,
          x: f.x,
          y: f.y + 1,
          z: f.z,
        });
      }
    }
    if (h.ticks <= 0) {
      h.phase = "idle";
      h.timer = def.interval;
    }
  }

  return events;
}

export function resetHazard(state: MatchState, stageId: string) {
  const stage = getStage(stageId);
  state.hazard = createHazard(stage);
  state.props = createProps(stage);
  state.hazardWarning = "";
}
