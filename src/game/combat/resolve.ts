// Resolución de golpes (FASE 2). Determinista y sin dependencias de render.

import { getAttack, type AttackDef } from "../data/attacks";
import { getCharacter } from "../data/characters";
import type { FighterState, HitEvent, MatchState } from "../core/types";
import { contactPoint, hitbox, hurtbox, sphereHitsBox } from "./hitbox";
import { useWeapon, weaponBonus } from "../systems/props";

const COMBO_WINDOW = 45;
const GUARD_BREAK_TICKS = 40;

/** ¿El defensor está bloqueando este golpe? */
function isBlocking(def: FighterState, atk: AttackDef) {
  if (def.guardBroken > 0 || def.hitstun > 0) return false;
  if (!def.grounded) return false;
  if (atk.kind === "grab") return false;
  // Bloquea si retrocede (aleja del rival) y no está atacando.
  if (def.action) return false;
  if (!def.blocking) return false;
  // Los golpes bajos requieren agacharse; los altos requieren estar de pie.
  if (atk.height === "low" && !def.crouching) return false;
  return true;
}

export function startAttack(f: FighterState, attackId: string) {
  const atk = getAttack(f.characterId, attackId);
  if (f.stamina < atk.staminaCost) return false;
  f.stamina -= atk.staminaCost;
  f.action = { attackId, frame: 0, connected: false, hitConfirmed: false };
  f.crouching = false;
  return true;
}

/** Avanza la acción y resuelve impactos. Devuelve eventos generados. */
export function stepCombat(
  state: MatchState,
  attacker: FighterState,
  defender: FighterState,
): HitEvent[] {
  const events: HitEvent[] = [];
  const act = attacker.action;
  if (!act) return events;

  const atk = getAttack(attacker.characterId, act.attackId);
  act.frame++;

  const activeStart = atk.startup;
  const activeEnd = atk.startup + atk.active;
  const isActive = act.frame > activeStart && act.frame <= activeEnd;

  if (isActive && !act.connected) {
    const s = hitbox(attacker, atk);
    const wpn = atk.kind === "grab" ? { damage: 0, reach: 0 } : weaponBonus(state, attacker);
    s.cx += attacker.facing * wpn.reach;
    const b = hurtbox(defender);
    const invulnerable = defender.dodgeTicks > 0;
    if (!invulnerable && sphereHitsBox(s, b)) {
      act.connected = true;
      act.hitConfirmed = true;
      const blocked = isBlocking(defender, atk);
      const p = contactPoint(s, b);

      if (blocked) {
        defender.health = Math.max(0, defender.health - atk.chip);
        defender.stamina = Math.max(0, defender.stamina - atk.guardDrain);
        defender.blockstun = atk.blockstun;
        defender.vx += attacker.facing * atk.knockback * 0.25;
        if (defender.stamina <= 0) {
          defender.guardBroken = GUARD_BREAK_TICKS;
          defender.hitstun = GUARD_BREAK_TICKS;
        }
      } else {
        const scale = 1 - Math.min(0.5, attacker.comboCount * 0.07);
        defender.health = Math.max(0, defender.health - (atk.damage + wpn.damage) * scale);
        defender.hitstun = atk.hitstun;
        defender.flash = 8;
        defender.blocking = false;
        defender.vx += attacker.facing * atk.knockback * 0.35;
        if (atk.kind === "grab") defender.vy = 4.5;
        attacker.comboCount++;
        attacker.comboTimer = COMBO_WINDOW;
      }

      if (wpn.damage > 0) useWeapon(state, attacker);

      attacker.x += attacker.facing * atk.advance * 0.08;

      events.push({
        tick: state.tick,
        attackerId: attacker.id,
        defenderId: defender.id,
        attackId: atk.id,
        damage: blocked ? atk.chip : atk.damage + wpn.damage,
        blocked,
        combo: attacker.comboCount,
        x: p.x,
        y: p.y,
        z: p.z,
      });
    }
  }

  const total = atk.startup + atk.active + atk.recovery;
  // Cancel de combo: tras confirmar impacto, puede encadenar durante el recovery.
  if (attacker.attackBuffer && act.hitConfirmed && act.frame > activeEnd) {
    if (atk.cancelInto.includes(attacker.attackBuffer)) {
      const next = attacker.attackBuffer;
      attacker.attackBuffer = null;
      attacker.bufferTicks = 0;
      startAttack(attacker, next);
      return events;
    }
  }

  if (act.frame >= total) {
    attacker.action = null;
    // Buffer: encadena el siguiente ataque al terminar la recuperación.
    if (attacker.attackBuffer && attacker.bufferTicks > 0) {
      const next = attacker.attackBuffer;
      attacker.attackBuffer = null;
      attacker.bufferTicks = 0;
      startAttack(attacker, next);
    }
  }

  return events;
}

export function maxHealth(f: FighterState) {
  return getCharacter(f.characterId).maxHealth;
}
