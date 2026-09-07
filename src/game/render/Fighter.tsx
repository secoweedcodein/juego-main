// FASE 9+12 — Luchador humanoid con identidad visual propia y animación conectada
// al estado real del juego (no decorativa).
//
//   GAME STATE -> FighterState -> Animation Controller -> Joints -> CharacterModel
//
// El controlador deriva las poses desde el estado real de la simulación y mueve
// el rig común (joints). La geometría visible la monta `CharacterModel`, que da
// a cada luchador una silueta, proporciones, cabeza y equipamiento distintos.
// El gameplay, los hitboxes y el resto de sistemas no dependen de esta capa.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FighterState, MatchState } from "../core/types";
import { getCharacter, type CharacterDef } from "../data/characters";
import { getAttack } from "../data/attacks";
import { CharacterModel, shadowRadius, type RigRefs } from "./CharacterModels";

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
  if (match.phase === "matchEnd") {
    const isWinner =
      (s.id === "p1" && match.wins[0] > match.wins[1]) ||
      (s.id === "p2" && match.wins[1] > match.wins[0]);
    if (isWinner) return "victory";
    if (s.health <= 0) return "ko";
    return "defeat";
  }
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
  const amp = clamp01(speed / 6.2);
  const id = s.characterId;

  // Postura base de combate.
  j.armRx = -1.1 - Math.sin(t * 2.4) * 0.06;
  j.armLz = 0.1 + Math.sin(t * 2.4) * 0.04;
  j.legL = 0.12;
  j.legR = -0.12;
  j.kneeL = 0.1;
  j.kneeR = 0.1;

  // Guardia y presencia propios de cada luchador.
  if (kind === "idle") {
    if (id === "vulcan") {
      // Guardia alta de boxeador, listo para encadenar.
      j.armRx = -1.28 - Math.sin(t * 2.4) * 0.05;
      j.armLz = 0.3 + Math.sin(t * 2.4) * 0.03;
      j.armRz = 0.1;
      j.spineX = 0.07;
      j.elbowL = 0.9;
      j.elbowR = 1;
      j.crouch = 0.02;
    } else if (id === "kestrel") {
      // Postura larga de kickboxer: piernas más escalonadas y guardia alta.
      j.armRx = -1.35 - Math.sin(t * 2.3) * 0.05;
      j.armLz = 0.12;
      j.armRz = -0.12;
      j.legL = 0.22;
      j.legR = -0.26;
      j.kneeL = 0.18;
      j.kneeR = 0.18;
      j.spineX = -0.02;
    } else if (id === "bolt") {
      // Peso muerto con guardia abierta y amenazante.
      j.armRx = -0.72;
      j.armLz = 0.42;
      j.armRz = 0.34;
      j.legL = 0.34;
      j.legR = -0.34;
      j.kneeL = 0.16;
      j.kneeR = 0.16;
      j.spineX = 0.03;
    } else {
      // Viva y asimétrica: nunca queda quieta.
      j.armRx = -1.32;
      j.armLz = 0.5;
      j.armRz = 0.16;
      j.armRx = -1.32 - Math.sin(t * 3.1) * 0.03;
      j.legL = 0.06;
      j.legR = -0.3;
      j.kneeL = 0.2;
      j.kneeR = 0.12;
      j.crouch = 0.08;
      j.spineX = Math.sin(t * 2.8) * 0.02;
    }
  }

  switch (kind) {
    case "walk": {
      const phase = t * (4 + speed * 2.2);
      const step = Math.sin(phase) * 0.62 * amp;
      const stepScale = id === "bolt" ? 0.8 : id === "ash" ? 1.12 : 1;
      const sStep = step * stepScale;
      j.legL = 0.12 + sStep;
      j.legR = -0.12 + sStep;
      j.kneeL = 0.1 + Math.max(0, -sStep) * 0.5;
      j.kneeR = 0.1 + Math.max(0, sStep) * 0.5;
      j.armRx = (id === "bolt" ? -1.05 : -1.1) - sStep * 0.3;
      j.armLz = (id === "bolt" ? 0.36 : 0.18) - sStep * 0.22;
      if (id === "bolt") j.armRz = 0.3;
      j.spineX = 0.08 * amp + (id === "bolt" ? 0.05 : 0);
      const movingForward = Math.sign(s.vx) !== -s.facing;
      if (!movingForward) j.spineX = -0.1;
      if (Math.abs(s.vz) > 0.6) j.pivotRoll = 0.22 * Math.sign(s.vz) * amp;
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
      j.armRz = id === "bolt" ? 0.8 : 0.5;
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
      j.pivotRoll = Math.sin(t * 14) * (id === "ash" ? 0.18 : 0.12);
      break;
    case "block":
      j.armRz = id === "bolt" ? 0.8 : 0.55;
      j.armRx = id === "bolt" ? -1.6 : -1.85;
      j.elbowR = 1.1;
      j.armLz = id === "bolt" ? 0.75 : 0.5;
      j.spineX = -0.12;
      j.headX = -0.15;
      j.kneeL = id === "bolt" ? 0.4 : 0.3;
      j.kneeR = id === "bolt" ? 0.4 : 0.3;
      break;
    case "crouch":
      j.crouch = 1;
      j.kneeL = 1.25;
      j.kneeR = 1.25;
      j.legL = id === "bolt" ? 0.55 : 0.45;
      j.legR = id === "bolt" ? -0.55 : -0.45;
      j.spineX = id === "bolt" ? 0.14 : 0.22;
      j.armRz = id === "bolt" ? 0.8 : 0.62;
      j.armRx = id === "bolt" ? -1.6 : -1.9;
      j.armLz = id === "bolt" ? 0.7 : 0.56;
      j.elbowR = 0.9;
      j.headX = 0.1;
      break;
    case "dodge": {
      const p = clamp01(s.dodgeTicks / 18);
      const roll = id === "ash" ? 0.85 : id === "bolt" ? 0.34 : 0.55;
      j.pivotRoll = roll * p * Math.sign(s.vx || s.vz || 1);
      j.spineX = 0.2 * p;
      j.kneeL = (id === "ash" ? 1.25 : 0.9) * p;
      j.kneeR = (id === "ash" ? 1.25 : 0.9) * p;
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
      if (id === "bolt") {
        j.armRz = -1.35;
        j.armRx = -2.5;
        j.armLz = -1.35;
        j.headX = -0.08;
        j.spineX = -0.18;
        j.pivotRoll = Math.sin(t * 3) * 0.06;
      } else if (id === "kestrel") {
        j.armRz = 0.9;
        j.armRx = -1.6;
        j.armLz = -0.5;
        j.legL = 0.5;
        j.headX = -0.1;
        j.spineX = -0.14;
        j.pivotRoll = Math.sin(t * 3) * 0.08;
      } else {
        j.armRz = 1.45;
        j.armRx = -2.35;
        j.armLz = -1.45;
        j.headX = -0.12;
        j.spineX = -0.16;
        j.pivotRoll = Math.sin(t * 3) * 0.06;
      }
      break;
    }
    case "defeat": {
      j.crouch = 0.75;
      j.kneeL = 1.35;
      j.kneeR = 1.1;
      j.legL = 0.45;
      j.legR = -0.3;
      j.spineX = 0.45;
      j.headX = 0.55;
      j.armRz = 0.25;
      j.armRx = -0.3;
      j.armLz = -0.25;
      j.elbowR = 0.6;
      j.elbowL = 0.6;
      break;
    }
    case "light":
    case "heavy": {
      const p = attackProgress(s);
      j.armRz = id === "bolt" ? 0.4 : 0.12;
      j.armRx = -1.35 + p * 3.1;
      j.elbowR = 0.1 + (1 - p) * 0.8;
      j.spineX = 0.28 * clamp01(p);
      j.armLz = id === "bolt" ? 0.5 : 0.62;
      j.legL = 0.3;
      j.legR = -0.3;
      break;
    }
    case "kick": {
      const p = attackProgress(s);
      const reach = id === "kestrel" ? 2.2 : id === "bolt" ? 1.7 : 1.9;
      j.spineX = -0.55 * clamp01(p);
      j.legR = p * reach;
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
      const reach = id === "bolt" ? 3.1 : 2.6;
      j.armRz = 0;
      j.armRx = -1.6 + p * reach;
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
  const rootRef = useRef<THREE.Group>(null);
  const refs: RigRefs = {
    pivot: useRef<THREE.Group>(null),
    chest: useRef<THREE.Mesh>(null),
    head: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    forearmL: useRef<THREE.Group>(null),
    forearmR: useRef<THREE.Group>(null),
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
    shinL: useRef<THREE.Group>(null),
    shinR: useRef<THREE.Group>(null),
    footL: useRef<THREE.Group>(null),
    footR: useRef<THREE.Group>(null),
  };
  const t = useRef(0);

  const char: CharacterDef = getCharacter(state.current.characterId);
  const suit = useRef(new THREE.Color(char.colors.suit));
  const white = useRef(new THREE.Color("#ffffff"));

  const current = useRef<Joints>(J());

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const s = state.current;
    const m = match.current;
    if (!rootRef.current || !refs.pivot.current || !s || !m) return;
    t.current += delta;

    rootRef.current.position.set(s.x, s.y, s.z);
    const targetYaw = s.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    rootRef.current.rotation.y +=
      (targetYaw - rootRef.current.rotation.y) * (1 - Math.exp(-14 * delta));

    // Controlador de animación: pose objetivo -> suavizado -> aplicado.
    const target = computeJoints({ t: t.current, s, match: m });
    const cur = current.current;
    const blend = 1 - Math.exp(-(s.action ? 26 : 14) * delta);
    Object.keys(target).forEach((key) => {
      const k = key as keyof Joints;
      cur[k] += (target[k] - cur[k]) * blend;
    });

    const pivot = refs.pivot.current;
    pivot.rotation.set(cur.pivotPitch, 0, cur.pivotRoll);
    pivot.scale.set(1, 1 - cur.crouch * 0.16, 1);
    pivot.position.y = 0.02 + Math.abs(s.vx) * 0.004 + (s.downTicks > 0 ? -0.05 : 0);

    if (refs.chest.current) refs.chest.current.rotation.x = cur.spineX;
    if (refs.head.current) refs.head.current.rotation.x = cur.headX + (s.hitstun > 0 ? -0.3 : 0);

    if (refs.armL.current) {
      refs.armL.current.rotation.z = cur.armLz;
      refs.armL.current.rotation.x = cur.armRx;
    }
    if (refs.armR.current) {
      refs.armR.current.rotation.z = -cur.armRz;
      refs.armR.current.rotation.x = cur.armRx;
    }
    if (refs.forearmL.current) refs.forearmL.current.rotation.x = cur.elbowL;
    if (refs.forearmR.current) refs.forearmR.current.rotation.x = -cur.elbowR;

    if (refs.legL.current) refs.legL.current.rotation.x = cur.legL;
    if (refs.legR.current) refs.legR.current.rotation.x = cur.legR;
    if (refs.shinL.current) refs.shinL.current.rotation.x = cur.kneeL;
    if (refs.shinR.current) refs.shinR.current.rotation.x = cur.kneeR;
    if (refs.footL.current) refs.footL.current.rotation.x = cur.footL;
    if (refs.footR.current) refs.footR.current.rotation.x = cur.footR;

    // Flash de impacto y retroceso del material del pecho.
    const hit = s.flash > 0 ? s.flash / 8 : 0;
    if (refs.chest.current) {
      const mat = refs.chest.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + hit * 3.4;
      mat.color.lerpColors(suit.current, white.current, hit * 0.7);
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={refs.pivot}>
        <CharacterModel char={char} rig={refs} />
      </group>

      {/* Sombra de contacto dinámica que atenúa suavemente con la altura del luchador */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[shadowRadius(char.id), 24]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={Math.max(0.08, 0.45 - (state.current?.y ?? 0) * 0.12)}
        />
      </mesh>
    </group>
  );
}
