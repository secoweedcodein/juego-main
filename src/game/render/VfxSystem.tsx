// FASE 10 — Sistema de VFX conectado al combate real.
// Lee match.events y el estado de los luchadores cada frame: chispas de
// impacto, polvo al caminar/caer, anillos de bloqueo, rastro de esquiva,
// ráfaga de KO y columnas de victoria. Reutiliza un pool fijo de meshes.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FighterState, MatchState } from "../core/types";
import { getAttack } from "../data/attacks";
import { loadSettings } from "../config/settings";

interface FxParticle {
  life: number;
  max: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: THREE.Color;
  soft: boolean;
}

const SPARK_POOL = 30;
const MAX_LIFE = 0.5;

const tmpColor = new THREE.Color();
const DEFAULT_COLOR = new THREE.Color("#fff3b0");
const BLOCK_COLOR = new THREE.Color("#7dd3fc");
const CYAN = new THREE.Color("#00e5ff");
const MAGENTA = new THREE.Color("#ff2f8e");
const DUST = new THREE.Color("#5b6470");
const SOFT_GRAY = new THREE.Color("#9aa6b5");

export function VfxSystem({ match }: { match: React.RefObject<MatchState> }) {
  const particles = useRef<FxParticle[]>(
    Array.from({ length: SPARK_POOL }, () => ({
      life: 0,
      max: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 0.4,
      color: DEFAULT_COLOR.clone(),
      soft: false,
    })),
  );
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const cursor = useRef(0);
  const lastTick = useRef(-1);
  const timeAcc = useRef(0);
  const dustAcc = useRef(0);
  const prevAirborne = useRef<[boolean, boolean]>([false, false]);
  const prevDown = useRef<[boolean, boolean]>([false, false]);
  const updateClock = useRef(0);

  function spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    color: THREE.Color,
    soft: boolean,
    life = 0.34,
  ) {
    const p = particles.current[cursor.current % SPARK_POOL]!;
    cursor.current++;
    p.life = life;
    p.max = life;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.size = size;
    p.color.copy(color);
    p.soft = soft;
  }

  function burst(
    x: number,
    y: number,
    z: number,
    facing: number,
    power: number,
    color: THREE.Color,
    soft = false,
  ) {
    const n = Math.round(power * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spread = Math.random() * power;
      spawn(
        x,
        y,
        z,
        facing * (2 + Math.random() * 6) + Math.cos(a) * spread,
        Math.abs(Math.random() * 5 - 1.5) * power,
        Math.sin(a) * spread,
        0.1 + Math.random() * (soft ? 0.22 : 0.3),
        color,
        soft,
        soft ? 0.5 : 0.3 + Math.random() * 0.16,
      );
    }
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const m = match.current;
    if (!m) return;
    if (!loadSettings().particles) {
      for (const p of particles.current) p.life = 0;
      return;
    }
    updateClock.current += delta;

    // 1) Eventos de impacto -> chispas.
    for (const e of m.events) {
      if (e.tick === lastTick.current) continue;
      if (e.attackerId === "stage") continue;
      const attacker = m.fighters.find((f) => f.id === e.attackerId);
      const atk =
        attacker && KNOWN_ATTACKS.has(e.attackId)
          ? getAttack(attacker.characterId, e.attackId)
          : null;
      const power = e.blocked ? 0.5 : atk?.id === "heavy" ? 1.6 : atk?.id === "kick" ? 1.2 : 0.9;
      const color = e.blocked ? BLOCK_COLOR : atk?.id === "heavy" ? MAGENTA : DEFAULT_COLOR;
      const facing = attacker?.facing ?? 1;
      burst(e.x, e.y, e.z, facing, power, color, e.blocked);
      if (!e.blocked && (atk?.id === "heavy" || atk?.id === "kick")) {
        burst(e.x, e.y, e.z, facing, 0.9, SOFT_GRAY, true);
      }
    }
    if (m.events.length > 0) lastTick.current = m.events[0]!.tick;

    // 2) Polvo al caminar / anillo al caer / nubes en knockdown.
    m.fighters.forEach((f: FighterState, i: number) => {
      const airborne = !f.grounded && f.fallingOut === false;

      // Transición de aire a suelo -> anillo de polvo.
      if (prevAirborne.current[i] && !airborne && f.grounded) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          spawn(
            f.x,
            0.1,
            f.z,
            Math.cos(a) * (1.2 + Math.random() * 1.2),
            Math.random() * 2,
            Math.sin(a) * (1.2 + Math.random() * 1.2),
            0.2 + Math.random() * 0.15,
            DUST,
            true,
            0.55,
          );
        }
      }
      prevAirborne.current[i] = airborne;

      // Polvo al caminar/deslizarse por el suelo.
      const speed = Math.abs(f.vx) + Math.abs(f.vz);
      if (f.grounded && f.downTicks === 0 && speed > 2.4) {
        dustAcc.current += delta;
        if (dustAcc.current > 0.13) {
          dustAcc.current = 0;
          spawn(
            f.x - f.facing * 0.3,
            0.08,
            f.z,
            -f.facing * 0.5,
            0.3,
            (Math.random() - 0.5) * 0.6,
            0.16 + Math.random() * 0.12,
            DUST,
            true,
            0.4,
          );
        }
      }

      // Ráfaga de KO al caer KO.
      const downJustSet = f.downTicks > 0 && !prevDown.current[i];
      if (downJustSet && f.health <= 0) {
        burst(f.x, f.y + 1, f.z, 0, 2, MAGENTA, false);
        burst(f.x, f.y + 0.4, f.z, 0, 1.6, SOFT_GRAY, true);
      }
      prevDown.current[i] = f.downTicks > 0;
    });

    // 3) Rastro de esquiva y brillo al bloquear.
    const [a, b] = m.fighters;
    for (const f of [a, b]) {
      if (f.dodgeTicks > 0 && updateClock.current % 0.033 < delta) {
        spawn(f.x, f.y + 0.9, f.z, 0, 0, 0, 0.3, CYAN, true, 0.32);
      }
      if (f.blocking && f.dodgeTicks === 0 && updateClock.current % 0.14 < delta) {
        spawn(f.x + f.facing * 0.55, f.y + 1.1, f.z, 0, 0, 0, 0.22, BLOCK_COLOR, true, 0.25);
      }
      // Columna de victoria en el matchEnd.
      if (m.phase === "matchEnd" && m.wins[0] !== m.wins[1]) {
        const winnerWon =
          (f.id === "p1" && m.wins[0] > m.wins[1]) || (f.id === "p2" && m.wins[1] > m.wins[0]);
        if (winnerWon && updateClock.current % 0.12 < delta) {
          spawn(
            f.x + (Math.random() - 0.5) * 1.2,
            f.y + Math.random() * 2.4,
            f.z + (Math.random() - 0.5) * 0.6,
            0,
            3.2,
            0,
            0.22,
            f.characterId === "kestrel" ? MAGENTA : CYAN,
            false,
            0.6,
          );
        }
      }
    }

    // 4) Integración física de partículas + render.
    particles.current.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      if (p.life <= 0) {
        mesh.visible = false;
        return;
      }
      p.life -= delta;
      const g = p.soft ? 9 : 22;
      p.vy -= g * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;
      if (p.y < 0.05 && !p.soft && p.vy < 0) {
        p.vy *= -0.4;
        p.y = 0.05;
      }
      const k = Math.max(0, p.life / p.max);
      mesh.position.set(p.x, p.y, p.z);
      mesh.scale.setScalar(p.size * (p.soft ? 1.6 : 1) * (1.25 - k * 0.4));
      mesh.visible = true;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      tmpColor.copy(p.color);
      tmpColor.lerp(COLOR_RAMP, 1 - k * 0.9);
      mat.color.copy(tmpColor);
      mat.opacity = k * (p.soft ? 0.4 : 0.9);
    });
  });

  return (
    <>
      {Array.from({ length: SPARK_POOL }).map((_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          {i % 3 === 0 ? (
            <icosahedronGeometry args={[0.26, 0]} />
          ) : (
            <sphereGeometry args={[0.18, 8, 6]} />
          )}
          <meshBasicMaterial transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

const COLOR_RAMP = new THREE.Color("#ffffff");
const KNOWN_ATTACKS = new Set(["light", "heavy", "kick", "grab"]);
