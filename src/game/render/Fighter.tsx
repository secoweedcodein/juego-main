// FASE 9 — Luchador humanoide procedural con animación conectada al estado
// real del juego (no decorativa). Se sustituye el placeholder de cápsulas por
// un "rig" de joints (grupos) que el controlador de animación mueve según:
//   GAME STATE -> FighterState -> Animation Controller -> Joints
// No se usan modelos externos: la geometría es procedural (CC0 propio) y el
// sistema permite cambiar a modelos GLB/GLTF riggeados sin tocar el combate.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FighterState, MatchState } from "../core/types";
import { getCharacter, type CharacterDef } from "../data/characters";
import { getAttack } from "../data/attacks";

// ---------------- Tipos del controlador ----------------

interface Joints {
  pivotPitch: number;
  pivotRoll: number;
  crouch: number;
  spineX: number;
  headX: number;
  armLz: number;
  armRx: number;
  armRz: number;
  elbowL: number;
  elbowR: number;
  legL: number;
  legR: number;
  kneeL: number;
  kneeR: number;
  footL: number;
  footR: number;
}

const J = (): Joints => ({
  pivotPitch: 0,
  pivotRoll: 0,
  crouch: 0,
  spineX: 0,
  headX: 0,
  armLz: 0,
  armRx: -1.35,
  armRz: 0,
  elbowL: 0.5,
  elbowR: 0.6,
  legL: 0,
  legR: 0,
  kneeL: 0.08,
  kneeR: 0.08,
  footL: 0,
  footR: 0,
});

interface AnimContext {
  t: number;
  s: FighterState;
  match: MatchState;
}

/** Deriva el estado de animación desde el estado real del juego. */
function animKind(s: FighterState, match: MatchState): string {
  if (s.fallingOut) return "fall";
  if (match.phase === "matchEnd" && s.health > 0) {
    const isWinner =
      (s.id === "p1" && match.wins[0] > match.wins[1]) ||
      (s.id === "p2" && match.wins[1] > match.wins[0]);
    return isWinner ? "victory" : "idle";
  }
  if (match.phase === "matchEnd") return "ko";
  if (s.downTicks > 0) return "down";
  if (s.getupTicks > 0) return "getup";
  if (s.dodgeTicks > 0) return "dodge";
  if (s.action) {
    const a = getAttack(s.characterId, s.action.attackId);
    return a.kind === "kick"
      ? "kick"
      : a.kind === "grab"
        ? "grab"
        : a.kind === "heavy"
          ? "heavy"
          : "light";
  }
  if (s.hitstun > 0 || s.blockstun > 0) return "hit";
  if (s.blocking) return "block";
  if (s.crouching) return "crouch";
  if (!s.grounded) return s.vy > 0 ? "jump" : "fall";
  const speed = Math.abs(s.vx) + Math.abs(s.vz);
  if (speed > 1.1) return "walk";
  return "idle";
}

/** Progreso de extensión del ataque (0..1) según el frame real. */
function attackProgress(s: FighterState): number {
  if (!s.action) return 0;
  const a = getAttack(s.characterId, s.action.attackId);
  const f = s.action.frame;
  const total = a.startup + a.active + a.recovery;
  if (f <= a.startup) return -0.4 * (f / Math.max(1, a.startup));
  if (f <= a.startup + a.active) return 1;
  return Math.max(0, 1 - (f - a.startup - a.active) / Math.max(1, total - a.startup - a.active));
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Calcula los ángulos objetivo de cada joint para el estado actual. */
function computeJoints(c: AnimContext): Joints {
  const { s, t } = c;
  const j = J();
  const kind = animKind(s, c.match);
  const speed = Math.sqrt(s.vx * s.vx + s.vz * s.vz);
  const movingForward = Math.sign(s.vx) !== -s.facing;

  // Postura base de combate.
  j.armRx = -1.1 - Math.sin(t * 2.4) * 0.06;
  j.armLz = 0.1 + Math.sin(t * 2.4) * 0.04;
  j.legL = 0.12;
  j.legR = -0.12;
  j.kneeL = 0.1;
  j.kneeR = 0.1;

  switch (kind) {
    case "walk": {
      const amp = clamp01(speed / 6.2);
      const phase = t * (4 + speed * 2.2);
      const step = Math.sin(phase) * 0.62 * amp;
      j.legL = 0.12 + step;
      j.legR = -0.12 + step;
      j.kneeL = 0.1 + Math.max(0, -step) * 0.5;
      j.kneeR = 0.1 + Math.max(0, step) * 0.5;
      j.armRx = -1.1 - step * 0.28;
      j.armLz = 0.1 - step * 0.22;
      j.spineX = 0.08 * amp;
      if (Math.abs(s.vz) > 0.6) j.pivotRoll = 0.22 * Math.sign(s.vz) * amp;
      if (!movingForward) j.spineX = -0.1;
      break;
    }
    case "jump":
      j.legL = 0.5;
      j.legR = -0.5;
      j.kneeL = 1.35;
      j.kneeR = 1.35;
      j.footL = 0.9;
      j.footR = 0.9;
      j.armRx = -1.7;
      j.armRz = 0.5;
      break;
    case "fall":
      j.spineX = -0.3;
      j.armRz = 0.9;
      j.armRx = -1.9;
      j.armLz = -0.9;
      j.legL = 0.4;
      j.legR = -0.4;
      j.kneeL = 0.4;
      j.kneeR = 0.4;
      j.pivotRoll = Math.sin(t * 14) * 0.12;
      break;
    case "block":
      j.armRz = 0.55;
      j.armRx = -1.85;
      j.elbowR = 1.1;
      j.armLz = 0.5;
      j.spineX = -0.12;
      j.headX = -0.15;
      j.kneeL = 0.3;
      j.kneeR = 0.3;
      break;
    case "crouch":
      j.crouch = 1;
      j.kneeL = 1.25;
      j.kneeR = 1.25;
      j.legL = 0.45;
      j.legR = -0.45;
      j.spineX = 0.22;
      j.armRz = 0.62;
      j.armRx = -1.9;
      j.armLz = 0.56;
      j.elbowR = 0.9;
      j.headX = 0.1;
      break;
    case "dodge": {
      const p = clamp01(s.dodgeTicks / 18);
      j.pivotRoll = 0.55 * p * Math.sign(s.vx || s.vz || 1);
      j.spineX = 0.2 * p;
      j.kneeL = 0.9 * p;
      j.kneeR = 0.9 * p;
      j.armRz = 0.7 * p;
      j.armRx = -2 * p;
      break;
    }
    case "hit":
      j.spineX = -0.45 + Math.sin(t * 20) * 0.1;
      j.headX = -0.35;
      j.armRz = 1.1;
      j.armRx = -1.5;
      j.armLz = -0.9;
      j.kneeL = 0.4;
      j.kneeR = 0.4;
      j.pivotRoll = 0.18;
      break;
    case "down":
    case "ko":
      j.pivotPitch = Math.PI / 2;
      j.crouch = 1;
      j.armRz = 0.85;
      j.armRx = -0.4;
      j.armLz = -0.85;
      j.legL = 0.55;
      j.legR = -0.55;
      j.kneeL = 0.75;
      j.kneeR = 0.75;
      j.footL = 0.6;
      j.footR = 0.6;
      j.spineX = 0.2;
      break;
    case "getup": {
      const p = clamp01(s.getupTicks / 20);
      j.pivotPitch = (Math.PI / 2) * p;
      j.crouch = 1;
      j.kneeL = 1.1;
      j.kneeR = 1.1;
      j.legL = 0.6;
      j.legR = -0.6;
      j.armRz = 0.8;
      j.armLz = -0.8;
      j.spineX = 0.5 * (1 - p);
      break;
    }
    case "victory": {
      j.armRz = 1.45;
      j.armRx = -2.35;
      j.armLz = -1.45;
      j.armRx = -2.35;
      j.headX = -0.12;
      j.spineX = -0.16;
      j.pivotRoll = Math.sin(t * 3) * 0.06;
      break;
    }
    case "light":
    case "heavy": {
      const p = attackProgress(s);
      j.armRz = 0.12;
      j.armRx = -1.35 + p * 3.1;
      j.elbowR = 0.1 + (1 - p) * 0.8;
      j.spineX = 0.28 * clamp01(p);
      j.armLz = 0.62;
      j.armLz = 0.62;
      j.legL = 0.3;
      j.legR = -0.3;
      break;
    }
    case "kick": {
      const p = attackProgress(s);
      j.spineX = -0.55 * clamp01(p);
      j.legR = p * 1.9;
      j.kneeR = 0.05 + (1 - p) * 1.5;
      j.armRz = 0.75;
      j.armRx = -2;
      j.armLz = -0.75;
      j.legL = -0.15;
      j.footR = 1 * clamp01(p);
      break;
    }
    case "grab": {
      const p = attackProgress(s);
      j.armRz = 0;
      j.armRx = -1.6 + p * 2.6;
      j.armLz = 0;
      j.elbowR = 0.4 + (1 - p);
      j.elbowL = 0.4 + (1 - p);
      j.spineX = 0.5 * clamp01(p);
      j.legL = 0.5;
      j.legR = -0.5;
      j.kneeL = 0.5;
      j.kneeR = 0.5;
      break;
    }
    default:
      // idle: respiración ligera y guardia.
      j.armRz = -0.05;
      j.armRx = -1.1 - Math.sin(t * 2.4) * 0.06;
      j.armLz = 0.18 + Math.sin(t * 2.4) * 0.04;
      j.spineX = Math.sin(t * 1.9) * 0.02;
      break;
  }

  return j;
}

// ---------------- Componente ----------------

interface Props {
  state: React.RefObject<FighterState>;
  match: React.RefObject<MatchState>;
}

export function Fighter({ state, match }: Props) {
  const root = useRef<THREE.Group>(null);
  const pivot = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const forearmR = useRef<THREE.Group>(null);
  const forearmL = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const shinL = useRef<THREE.Group>(null);
  const shinR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Group>(null);
  const footR = useRef<THREE.Group>(null);
  const t = useRef(0);

  const char: CharacterDef = getCharacter(state.current.characterId);
  const suit = useRef(new THREE.Color(char.colors.suit));
  const white = useRef(new THREE.Color("#ffffff"));

  const current = useRef<Joints>(J());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const s = state.current;
    const m = match.current;
    if (!root.current || !pivot.current || !s || !m) return;
    t.current += delta;

    root.current.position.set(s.x, s.y, s.z);
    const targetYaw = s.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    root.current.rotation.y += (targetYaw - root.current.rotation.y) * (1 - Math.exp(-14 * delta));

    // Controlador de animación: pose objetivo -> suavizado -> aplicado.
    const target = computeJoints({ t: t.current, s, match: m });
    const cur = current.current;
    const blend = 1 - Math.exp(-(s.action ? 26 : 14) * delta);
    Object.keys(target).forEach((key) => {
      const k = key as keyof Joints;
      cur[k] += (target[k] - cur[k]) * blend;
    });

    pivot.current.rotation.set(cur.pivotPitch, 0, cur.pivotRoll);
    pivot.current.scale.set(1, 1 - cur.crouch * 0.16, 1);
    pivot.current.position.y = 0.02 + Math.abs(s.vx) * 0.004 + (s.downTicks > 0 ? -0.05 : 0);

    if (chest.current) chest.current.rotation.x = cur.spineX;
    if (head.current) head.current.rotation.x = cur.headX + (s.hitstun > 0 ? -0.3 : 0);

    if (armL.current) {
      armL.current.rotation.z = cur.armLz;
      armL.current.rotation.x = cur.armRx;
    }
    if (armR.current) {
      armR.current.rotation.z = -cur.armRz;
      armR.current.rotation.x = cur.armRx;
    }
    if (forearmL.current) forearmL.current.rotation.x = cur.elbowL;
    if (forearmR.current) forearmR.current.rotation.x = -cur.elbowR;

    if (legL.current) legL.current.rotation.x = cur.legL;
    if (legR.current) legR.current.rotation.x = cur.legR;
    if (shinL.current) shinL.current.rotation.x = cur.kneeL;
    if (shinR.current) shinR.current.rotation.x = cur.kneeR;
    if (footL.current) footL.current.rotation.x = cur.footL;
    if (footR.current) footR.current.rotation.x = cur.footR;

    // Flash de impacto y retroceso del material del pecho.
    const hit = s.flash > 0 ? s.flash / 8 : 0;
    if (chest.current) {
      const mat = chest.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + hit * 3.4;
      mat.color.lerpColors(suit.current, white.current, hit * 0.7);
    }
  });

  const mat = (
    color: string,
    emissive?: string,
    opts?: { roughness?: number; metalness?: number },
  ): THREE.MeshStandardMaterialParameters => ({
    color,
    emissive: emissive ?? color,
    emissiveIntensity: emissive ? 1.3 : 0,
    roughness: opts?.roughness ?? 0.6,
    metalness: opts?.metalness ?? 0.25,
  });

  const matEl = (
    color: string,
    emissive?: string,
    opts?: { roughness?: number; metalness?: number },
  ) => <meshStandardMaterial {...mat(color, emissive, opts)} />;

  return (
    <group ref={root}>
      <group ref={pivot}>
        {/* cintura */}
        <mesh position={[0, 1.0, 0]} castShadow>
          {matEl(char.colors.suit)}
          <boxGeometry args={[0.34, 0.28, 0.2]} />
        </mesh>
        {/* tórax */}
        <mesh ref={chest} position={[0, 1.34, 0]} castShadow>
          {matEl(char.colors.suit)}
          <capsuleGeometry args={[0.27, 0.36, 6, 14]} />
        </mesh>
        {/* banda de neón del implante */}
        <mesh position={[0, 1.5, 0.19]} castShadow>
          {matEl(char.colors.accent, char.colors.accent)}
          <boxGeometry args={[0.32, 0.05, 0.12]} />
        </mesh>
        {/* hombros */}
        <mesh position={[0, 1.56, 0]} castShadow>
          {matEl(char.colors.suit)}
          <boxGeometry args={[0.5, 0.24, 0.32]} />
        </mesh>
        {/* cabeza */}
        <group ref={head} position={[0, 1.86, 0]}>
          <mesh castShadow>
            {matEl(char.colors.skin, undefined, { roughness: 0.8 })}
            <sphereGeometry args={[0.19, 18, 16]} />
          </mesh>
          <mesh position={[0, 0.02, 0.15]}>
            {matEl(char.colors.accent, char.colors.accent)}
            <boxGeometry args={[0.28, 0.07, 0.07]} />
          </mesh>
        </group>

        {/* Brazos (se atacan/pelean desde el hombro) */}
        <group ref={armL} position={[-0.34, 1.56, 0]}>
          <group position={[0, -0.22, 0]}>
            <mesh castShadow>
              {matEl(char.colors.suit)}
              <capsuleGeometry args={[0.075, 0.4, 4, 8]} />
            </mesh>
            <group ref={forearmL} position={[0, -0.42, 0]}>
              <mesh castShadow>
                {matEl(char.colors.suit)}
                <capsuleGeometry args={[0.065, 0.34, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.36, 0]} castShadow>
                {matEl(char.colors.suit)}
                <sphereGeometry args={[0.08, 10, 8]} />
              </mesh>
            </group>
          </group>
        </group>
        <group ref={armR} position={[0.34, 1.56, 0]}>
          <group position={[0, -0.22, 0]}>
            <mesh castShadow>
              {matEl(char.colors.suit)}
              <capsuleGeometry args={[0.075, 0.4, 4, 8]} />
            </mesh>
            <group ref={forearmR} position={[0, -0.42, 0]}>
              <mesh castShadow>
                {matEl(char.colors.suit)}
                <capsuleGeometry args={[0.065, 0.34, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.36, 0]} castShadow>
                {matEl(char.colors.suit)}
                <sphereGeometry args={[0.08, 10, 8]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Piernas */}
        <group ref={legL} position={[-0.15, 0.98, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            {matEl(char.colors.suit, char.colors.accent, { metalness: 0.4 })}
            <capsuleGeometry args={[0.11, 0.36, 4, 8]} />
          </mesh>
          <group ref={shinL} position={[0, -0.42, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              {matEl(char.colors.suit, char.colors.accent, { metalness: 0.4 })}
              <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
            </mesh>
            <group ref={footL} position={[0, -0.5, 0.04]}>
              <mesh castShadow>
                {matEl(char.colors.suit, undefined, { metalness: 0.5 })}
                <boxGeometry args={[0.12, 0.09, 0.26]} />
              </mesh>
            </group>
          </group>
        </group>
        <group ref={legR} position={[0.15, 0.98, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            {matEl(char.colors.suit, char.colors.accent, { metalness: 0.4 })}
            <capsuleGeometry args={[0.11, 0.36, 4, 8]} />
          </mesh>
          <group ref={shinR} position={[0, -0.42, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              {matEl(char.colors.suit, char.colors.accent, { metalness: 0.4 })}
              <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
            </mesh>
            <group ref={footR} position={[0, -0.5, 0.04]}>
              <mesh castShadow>
                {matEl(char.colors.suit, undefined, { metalness: 0.5 })}
                <boxGeometry args={[0.12, 0.09, 0.26]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      {/* sombra de contacto barata */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
