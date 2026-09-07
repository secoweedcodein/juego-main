// IA del rival (FASE 2/3). Determinista salvo por un RNG con semilla propia.
// Toma decisiones sobre el estado real: distancia, ataques del rival,
// cooldowns propios, stamina y dificultad.

import type { FighterState, InputIntent } from "../core/types";
import { EMPTY_INTENT } from "../core/types";

export type AiLevel = "idle" | "easy" | "normal";

/** Claves de InputIntent con tipo booleano (ataques). */
type AttackKeys = "light" | "heavy" | "kick" | "grab";

const KEEP_AWAY = 1.9;
const ATTACK_RANGE = 1.9;
const GOOD_RANGE = 1.35;

export class DummyAI {
  private seed = 1337;
  private cooldown = 0;

  constructor(private level: AiLevel = "normal") {}

  private rand() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  /** Activa una acción de un solo uso con pequeña probabilidad de secuencia. */
  private action(r: number, slots: Array<[number, AttackKeys]>): AttackKeys | null {
    let acc = 0;
    for (const [p, key] of slots) {
      acc += p;
      if (r < acc) return key;
    }
    return null;
  }

  think(self: FighterState, foe: FighterState): InputIntent {
    if (this.level === "idle") return EMPTY_INTENT;
    const intent: InputIntent = { ...EMPTY_INTENT };
    if (this.cooldown > 0) this.cooldown--;

    // Durante hitstun/knockdown no puede hacer nada.
    if (self.hitstun > 0 || self.blockstun > 0 || self.downTicks > 0) return intent;

    const dist = Math.abs(foe.x - self.x);
    const aggression = this.level === "easy" ? 0.5 : 1;
    const r = this.rand();
    const foeAttacking = foe.action !== null && dist < 2.3;

    // Acercarse / mantener distancia (agresividad según dificultad).
    const approachDist = KEEP_AWAY + 0.4 * r;
    if (dist > approachDist) {
      intent.forward = 1;
    } else if (dist < 1.0) {
      intent.forward = -1;
    }

    // Bloqueo reactivo: cuando el rival ataca cerca o tras fallar el ataque.
    const wantsBlock = foeAttacking && r > 0.42;
    if (wantsBlock) intent.block = true;

    const canEngage = self.action === null && self.dodgeTicks === 0 && this.cooldown === 0;

    if (canEngage && !wantsBlock) {
      if (dist < ATTACK_RANGE) {
        const chance = (this.level === "easy" ? 0.035 : 0.055) * aggression;
        const move = this.action(r, [
          [0.4, "light"],
          [0.7, "kick"],
          [0.9, "heavy"],
          [1, "grab"],
        ]);
        if (move && r < chance) {
          intent[move] = true;
          // Presión: el impacto rellena el buffer de combo del jugador.
          this.cooldown = this.level === "easy" ? 78 : 40;
        }
      }

      // Esquivar golpes ajenos que vienen de frente.
      if (foeAttacking && r > 0.985 && dist < 2.2) intent.dodge = true;

      // Movilidad ocasional hacia un lateral.
      if (dist < ATTACK_RANGE && r > 0.93) {
        intent.lateral = r > 0.965 ? 1 : -1;
      }
    }

    // Apoyos de distancia: hacia el rival cuando se acerca poco a poco.
    if (dist > GOOD_RANGE + 0.5 && !foeAttacking && r > 0.6) intent.forward = 1;

    // Evita pasarse del borde del escenario.
    const bounds = 8.0;
    if (self.x > bounds * 0.8) intent.forward = -1;
    if (self.x < -bounds * 0.8) intent.forward = 1;

    return intent;
  }
}
