// Rendering de cada luchador con identidad propia (FASE 12 — visual).
// Cuatro geometrías totalmente independientes: silueta, proporciones, cabeza,
// cabello/casco, guantes, botas y accesorios propios. Cada modelo monta el
// mismo contrato de joints (RigRefs) que el controlador de animación de
// Fighter.tsx mueve, por lo que el gameplay/combate no se toca.
// Los micro-movimientos (respiración, balanceo, rastas, crucetas) son
// internos de cada modelo y no interfieren con los joints del controlador.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CharacterDef } from "../data/characters";
import type { RefObject } from "react";

export interface RigRefs {
  pivot: RefObject<THREE.Group | null>;
  chest: RefObject<THREE.Mesh | null>;
  head: RefObject<THREE.Group | null>;
  armL: RefObject<THREE.Group | null>;
  armR: RefObject<THREE.Group | null>;
  forearmL: RefObject<THREE.Group | null>;
  forearmR: RefObject<THREE.Group | null>;
  legL: RefObject<THREE.Group | null>;
  legR: RefObject<THREE.Group | null>;
  shinL: RefObject<THREE.Group | null>;
  shinR: RefObject<THREE.Group | null>;
  footL: RefObject<THREE.Group | null>;
  footR: RefObject<THREE.Group | null>;
}

function useRig(external?: RigRefs | null): RigRefs {
  const pivot = useRef<THREE.Group | null>(null);
  const chest = useRef<THREE.Mesh | null>(null);
  const head = useRef<THREE.Group | null>(null);
  const armL = useRef<THREE.Group | null>(null);
  const armR = useRef<THREE.Group | null>(null);
  const forearmL = useRef<THREE.Group | null>(null);
  const forearmR = useRef<THREE.Group | null>(null);
  const legL = useRef<THREE.Group | null>(null);
  const legR = useRef<THREE.Group | null>(null);
  const shinL = useRef<THREE.Group | null>(null);
  const shinR = useRef<THREE.Group | null>(null);
  const footL = useRef<THREE.Group | null>(null);
  const footR = useRef<THREE.Group | null>(null);
  if (external) return external;
  return {
    pivot,
    chest,
    head,
    armL,
    armR,
    forearmL,
    forearmR,
    legL,
    legR,
    shinL,
    shinR,
    footL,
    footR,
  };
}

// ---------------- Materiales ----------------

interface MatSpec {
  c: string;
  e?: string;
  rough?: number;
  metal?: number;
  em?: number;
}

function m(s: MatSpec): THREE.MeshStandardMaterialParameters {
  const emissive = s.e ?? "#000000";
  return {
    color: s.c,
    emissive,
    emissiveIntensity: s.em ?? (s.e ? 1.25 : 0),
    roughness: s.rough ?? 0.55,
    metalness: s.metal ?? 0.2,
  };
}

const Mat = ({ s }: { s: MatSpec }) => <meshStandardMaterial {...m(s)} />;

// ---------------- VOLT: Boxer cibernético ----------------

function VoltModel({ char, rig: external }: { char: CharacterDef; rig?: RigRefs | null }) {
  const rig = useRig(external);
  const C = char.colors;
  const bob = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const g = bob.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.position.y = Math.abs(Math.sin(t * 3.4)) * 0.02;
    g.rotation.z = Math.sin(t * 1.8) * 0.012;
  });

  const makeArm = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group
        key={side}
        ref={isL ? rig.armL : rig.armR}
        position={[0.35 * sx, 1.58, 0]}
        rotation={[isL ? -1.02 : -1.25, 0, isL ? 0.2 : -0.04]}
      >
        {/* Deltoide + hombrera ligera */}
        <mesh castShadow>
          <Mat s={{ c: C.suit, rough: 0.45, metal: 0.35 }} />
          <sphereGeometry args={[0.115, 12, 10]} />
        </mesh>
        <mesh position={[-0.03 * sx, 0.09, 0.02]}>
          <Mat s={{ c: C.accent, e: C.accent }} />
          <boxGeometry args={[0.05, 0.015, 0.05]} />
        </mesh>
        <group position={[0, -0.34, 0]}>
          {/* Bíceps de piel */}
          <mesh position={[0, 0.17, 0]} castShadow>
            <Mat s={{ c: C.skin, rough: 0.75, metal: 0.05 }} />
            <capsuleGeometry args={[0.085, 0.34, 6, 12]} />
          </mesh>
          {/* Brazalete de presión */}
          <mesh position={[0, 0.06, 0]}>
            <Mat s={{ c: C.trim, rough: 0.3, metal: 0.65 }} />
            <cylinderGeometry args={[0.088, 0.088, 0.03, 12]} />
          </mesh>
          <group ref={isL ? rig.forearmL : rig.forearmR} position={[0, -0.34, 0]}>
            {/* Antebrazo en manga corta de la chaqueta */}
            <mesh position={[0, -0.14, 0]} castShadow>
              <Mat s={{ c: C.suit, rough: 0.5, metal: 0.28 }} />
              <capsuleGeometry args={[0.078, 0.28, 6, 12]} />
            </mesh>
            {/* Muñequera */}
            <mesh position={[0, -0.27, 0]} castShadow>
              <Mat s={{ c: C.trim, rough: 0.35, metal: 0.55 }} />
              <cylinderGeometry args={[0.09, 0.085, 0.07, 12]} />
            </mesh>
            {/* Guante de boxeo tecnológico */}
            <mesh position={[0, -0.38, 0.015]} castShadow>
              <Mat s={{ c: C.gloves, rough: 0.38, metal: 0.28 }} />
              <capsuleGeometry args={[0.128, 0.18, 8, 16]} />
            </mesh>
            {/* Placa de nudillos neon */}
            <mesh position={[0, -0.42, 0.1]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 2.2 }} />
              <boxGeometry args={[0.17, 0.055, 0.045]} />
            </mesh>
            {/* Anillo de energía del puño */}
            <mesh position={[0, -0.455, 0.02]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.5 }} />
              <boxGeometry args={[0.15, 0.02, 0.07]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  const makeLeg = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group
        key={side}
        ref={isL ? rig.legL : rig.legR}
        position={[0.16 * sx, 0.98, 0]}
        rotation={[isL ? 0.1 : -0.1, 0, 0]}
      >
        {/* Muslo / short de boxeo */}
        <mesh position={[0, -0.2, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.7, metal: 0.1 }} />
          <capsuleGeometry args={[0.125, 0.42, 6, 12]} />
        </mesh>
        {/* Abertura lateral del short con neon */}
        <mesh position={[sx * 0.14, -0.2, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.5 }} />
          <boxGeometry args={[0.018, 0.34, 0.05]} />
        </mesh>
        {/* Rodillera amarilla */}
        <mesh position={[0, -0.44, 0.04]} castShadow>
          <Mat s={{ c: C.trim, rough: 0.3, metal: 0.6 }} />
          <sphereGeometry args={[0.078, 8, 6]} />
        </mesh>
        <group ref={isL ? rig.shinL : rig.shinR} position={[0, -0.44, 0]}>
          {/* Canilla desnuda */}
          <mesh position={[0, -0.21, 0]} castShadow>
            <Mat s={{ c: C.pants, rough: 0.7, metal: 0.1 }} />
            <capsuleGeometry args={[0.095, 0.42, 6, 12]} />
          </mesh>
          {/* Bota de velocidad */}
          <group ref={isL ? rig.footL : rig.footR} position={[0, -0.42, 0.04]}>
            <mesh position={[0, 0.06, -0.02]} castShadow>
              <Mat s={{ c: C.suit, rough: 0.45, metal: 0.4 }} />
              <cylinderGeometry args={[0.1, 0.095, 0.13, 10]} />
            </mesh>
            <mesh position={[0, -0.01, 0.05]} castShadow>
              <Mat s={{ c: "#101317", rough: 0.5, metal: 0.35 }} />
              <boxGeometry args={[0.135, 0.11, 0.26]} />
            </mesh>
            <mesh position={[0, -0.005, 0.135]} castShadow>
              <Mat s={{ c: C.trim, rough: 0.35, metal: 0.7 }} />
              <boxGeometry args={[0.125, 0.08, 0.09]} />
            </mesh>
            <mesh position={[0, -0.065, 0.04]} castShadow>
              <Mat s={{ c: "#08080a", rough: 0.9 }} />
              <boxGeometry args={[0.14, 0.03, 0.28]} />
            </mesh>
            <mesh position={[0, -0.055, -0.05]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 2.2 }} />
              <boxGeometry args={[0.13, 0.015, 0.05]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  return (
    <>
      <group ref={bob}>
        {/* Cadera / trunks de boxeo */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.68, metal: 0.12 }} />
          <boxGeometry args={[0.36, 0.27, 0.24]} />
        </mesh>
        <mesh position={[-0.185, 1.0, 0]} castShadow>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.3 }} />
          <boxGeometry args={[0.016, 0.24, 0.15]} />
        </mesh>
        <mesh position={[0.185, 1.0, 0]} castShadow>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.3 }} />
          <boxGeometry args={[0.016, 0.24, 0.15]} />
        </mesh>
        {/* Cinturón */}
        <mesh position={[0, 1.08, 0]} castShadow>
          <Mat s={{ c: "#141418", rough: 0.4, metal: 0.3 }} />
          <boxGeometry args={[0.38, 0.09, 0.26]} />
        </mesh>
        <mesh position={[0, 1.08, 0.133]}>
          <Mat s={{ c: C.trim, rough: 0.2, metal: 0.85 }} />
          <boxGeometry args={[0.14, 0.07, 0.02]} />
        </mesh>
        <mesh position={[0, 1.08, 0.142]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 2.2 }} />
          <boxGeometry args={[0.055, 0.05, 0.01]} />
        </mesh>

        {/* Torso atlético / chaqueta corta abierta */}
        <mesh ref={rig.chest} position={[0, 1.32, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.5, metal: 0.3 }} />
          <capsuleGeometry args={[0.26, 0.36, 8, 16]} />
        </mesh>
        {/* Solapas de peleador urbano */}
        <mesh position={[-0.14, 1.34, 0.13]} rotation={[0, -0.2, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.45, metal: 0.35 }} />
          <boxGeometry args={[0.12, 0.24, 0.08]} />
        </mesh>
        <mesh position={[0.14, 1.34, 0.13]} rotation={[0, 0.2, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.45, metal: 0.35 }} />
          <boxGeometry args={[0.12, 0.24, 0.08]} />
        </mesh>
        {/* Abdomen desnudo */}
        <mesh position={[0, 1.22, 0.13]} castShadow>
          <Mat s={{ c: C.skin, rough: 0.78, metal: 0.05 }} />
          <boxGeometry args={[0.19, 0.16, 0.06]} />
        </mesh>
        {/* Tirante del arnés + núcleo de energía */}
        <mesh position={[0, 1.48, 0.19]} castShadow>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.7 }} />
          <boxGeometry args={[0.31, 0.045, 0.04]} />
        </mesh>
        <mesh position={[0, 1.4, 0.18]}>
          <Mat s={{ c: "#ffffff", e: C.accent, em: 3 }} />
          <boxGeometry args={[0.11, 0.05, 0.025]} />
        </mesh>
        {/* Columna cibernética trasera */}
        <mesh position={[0, 1.34, -0.17]} castShadow>
          <Mat s={{ c: "#101014", rough: 0.3, metal: 0.7 }} />
          <boxGeometry args={[0.1, 0.3, 0.045]} />
        </mesh>
        <mesh position={[0, 1.34, -0.192]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.6 }} />
          <boxGeometry args={[0.04, 0.24, 0.02]} />
        </mesh>
        {/* Trapecio */}
        <mesh position={[0, 1.57, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.5, metal: 0.3 }} />
          <boxGeometry args={[0.52, 0.22, 0.3]} />
        </mesh>
        {/* Cuello */}
        <mesh position={[0, 1.71, 0]} castShadow>
          <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
          <cylinderGeometry args={[0.09, 0.12, 0.14, 12]} />
        </mesh>

        {/* Cabeza: rostro marcado + visor tecnológico */}
        <group ref={rig.head} position={[0, 1.9, 0]}>
          <mesh castShadow>
            <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
            <sphereGeometry args={[0.185, 18, 16]} />
          </mesh>
          <mesh position={[0, -0.07, 0.05]} castShadow>
            <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
            <boxGeometry args={[0.14, 0.1, 0.15]} />
          </mesh>
          {/* Cresta mohawk tres puntas */}
          <mesh position={[0, 0.12, -0.01]} rotation={[0.15, 0, 0]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.7, metal: 0.25 }} />
            <coneGeometry args={[0.06, 0.15, 5]} />
          </mesh>
          <mesh position={[-0.05, 0.11, 0.0]} rotation={[0.2, -0.25, 0]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.7, metal: 0.25 }} />
            <coneGeometry args={[0.045, 0.11, 5]} />
          </mesh>
          <mesh position={[0.05, 0.11, 0.0]} rotation={[0.2, 0.25, 0]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.7, metal: 0.25 }} />
            <coneGeometry args={[0.045, 0.11, 5]} />
          </mesh>
          {/* Visor de gafas tecnológicas anchas */}
          <mesh position={[0, 0.02, 0.165]} castShadow>
            <Mat s={{ c: "#0a0b0f", rough: 0.2, metal: 0.6 }} />
            <boxGeometry args={[0.24, 0.08, 0.06]} />
          </mesh>
          <mesh position={[0, 0.02, 0.195]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 2.6 }} />
            <boxGeometry args={[0.19, 0.032, 0.02]} />
          </mesh>
          {/* Placas laterales del visor */}
          <mesh position={[-0.14, 0.035, 0.08]} rotation={[0, 0.5, 0]}>
            <Mat s={{ c: C.suit, rough: 0.3, metal: 0.5 }} />
            <boxGeometry args={[0.07, 0.05, 0.07]} />
          </mesh>
          <mesh position={[0.14, 0.035, 0.08]} rotation={[0, -0.5, 0]}>
            <Mat s={{ c: C.suit, rough: 0.3, metal: 0.5 }} />
            <boxGeometry args={[0.07, 0.05, 0.07]} />
          </mesh>
          {/* Auriculares tácticos */}
          <mesh position={[-0.19, 0.0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Mat s={{ c: "#141418", e: C.accent, em: 0.7, rough: 0.3, metal: 0.8 }} />
            <cylinderGeometry args={[0.04, 0.04, 0.02, 8]} />
          </mesh>
          <mesh position={[0.19, 0.0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Mat s={{ c: "#141418", e: C.accent, em: 0.7, rough: 0.3, metal: 0.8 }} />
            <cylinderGeometry args={[0.04, 0.04, 0.02, 8]} />
          </mesh>
        </group>

        {makeArm("L")}
        {makeArm("R")}
        {makeLeg("L")}
        {makeLeg("R")}
      </group>
    </>
  );
}

// ---------------- NYX: Kickboxer / Zoner ----------------

function NyxModel({ char, rig: external }: { char: CharacterDef; rig?: RigRefs | null }) {
  const rig = useRig(external);
  const C = char.colors;
  const sway = useRef<THREE.Group>(null);
  const ponytail = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (sway.current) {
      sway.current.rotation.z = Math.sin(t * 1.9) * 0.03;
      sway.current.position.y = Math.sin(t * 2.4) * 0.012;
    }
    if (ponytail.current) {
      ponytail.current.rotation.x = 0.35 + Math.sin(t * 2.7) * 0.12;
      ponytail.current.rotation.z = Math.sin(t * 1.7) * 0.09;
    }
  });

  const makeArm = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group
        key={side}
        ref={isL ? rig.armL : rig.armR}
        position={[0.34 * sx, 1.63, 0]}
        rotation={[isL ? -1.05 : -1.35, 0, isL ? 0.14 : -0.02]}
      >
        <mesh castShadow>
          <Mat s={{ c: C.suit, rough: 0.45, metal: 0.4 }} />
          <sphereGeometry args={[0.1, 12, 10]} />
        </mesh>
        <mesh position={[sx * 0.03, 0.07, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.2 }} />
          <boxGeometry args={[0.035, 0.02, 0.06]} />
        </mesh>
        <group position={[0, -0.36, 0]}>
          {/* Manga del body elegante */}
          <mesh position={[0, 0.18, 0]} castShadow>
            <Mat s={{ c: C.suit, rough: 0.5, metal: 0.35 }} />
            <capsuleGeometry args={[0.075, 0.36, 6, 12]} />
          </mesh>
          <group ref={isL ? rig.forearmL : rig.forearmR} position={[0, -0.36, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow>
              <Mat s={{ c: C.suit, rough: 0.5, metal: 0.35 }} />
              <capsuleGeometry args={[0.068, 0.3, 6, 12]} />
            </mesh>
            {/* Guarda de antebrazo */}
            <mesh position={[0, -0.16, 0.045]} castShadow>
              <Mat s={{ c: C.trim, rough: 0.3, metal: 0.55 }} />
              <boxGeometry args={[0.085, 0.2, 0.03]} />
            </mesh>
            {/* Vendaje de puño */}
            <mesh position={[0, -0.27, 0]} castShadow>
              <Mat s={{ c: C.gloves, rough: 0.5, metal: 0.15 }} />
              <cylinderGeometry args={[0.078, 0.074, 0.06, 10]} />
            </mesh>
            {/* Puño cerrado */}
            <mesh position={[0, -0.33, 0.01]} castShadow>
              <Mat s={{ c: C.gloves, rough: 0.5, metal: 0.15 }} />
              <capsuleGeometry args={[0.06, 0.09, 6, 12]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  const makeLeg = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group key={side} ref={isL ? rig.legL : rig.legR} position={[0.16 * sx, 0.97, 0]}>
        {/* Muslo largo estilizado */}
        <mesh position={[0, -0.21, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.55, metal: 0.25 }} />
          <capsuleGeometry args={[0.105, 0.44, 6, 12]} />
        </mesh>
        <mesh position={[sx * 0.106, -0.21, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.6 }} />
          <boxGeometry args={[0.014, 0.34, 0.05]} />
        </mesh>
        <group ref={isL ? rig.shinL : rig.shinR} position={[0, -0.46, 0]}>
          {/* Greaves tecnológicos altos */}
          <mesh position={[0, -0.23, 0]} castShadow>
            <Mat s={{ c: C.suit, rough: 0.4, metal: 0.5 }} />
            <capsuleGeometry args={[0.092, 0.46, 8, 14]} />
          </mesh>
          {/* Placa frontal de la espinillera */}
          <mesh position={[0, -0.23, 0.06]} castShadow>
            <Mat s={{ c: C.trim, rough: 0.3, metal: 0.65 }} />
            <boxGeometry args={[0.1, 0.34, 0.035]} />
          </mesh>
          <mesh position={[0, -0.23, 0.08]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 2 }} />
            <boxGeometry args={[0.024, 0.28, 0.012]} />
          </mesh>
          {/* Rodillera */}
          <mesh position={[0, 0, 0.05]} castShadow>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.4, rough: 0.3, metal: 0.5 }} />
            <sphereGeometry args={[0.075, 8, 6]} />
          </mesh>
          {/* Bota de cuello alto */}
          <group ref={isL ? rig.footL : rig.footR} position={[0, -0.46, 0.04]}>
            <mesh position={[0, 0.07, -0.02]} castShadow>
              <Mat s={{ c: C.suit, rough: 0.4, metal: 0.45 }} />
              <cylinderGeometry args={[0.098, 0.092, 0.16, 10]} />
            </mesh>
            <mesh position={[0, -0.02, 0.05]} castShadow>
              <Mat s={{ c: "#171a22", rough: 0.5, metal: 0.4 }} />
              <boxGeometry args={[0.13, 0.1, 0.26]} />
            </mesh>
            <mesh position={[0, -0.01, 0.13]} castShadow>
              <Mat s={{ c: C.gloves, rough: 0.4, metal: 0.2 }} />
              <boxGeometry args={[0.12, 0.07, 0.09]} />
            </mesh>
            <mesh position={[0, -0.065, 0.04]} castShadow>
              <Mat s={{ c: "#08080a", rough: 0.9 }} />
              <boxGeometry args={[0.14, 0.03, 0.28]} />
            </mesh>
            {/* Talón que brilla al girar */}
            <mesh position={[0, -0.055, -0.07]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 2.1 }} />
              <boxGeometry args={[0.12, 0.016, 0.06]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  return (
    <>
      <group ref={sway}>
        {/* Cadera con faldón del body */}
        <mesh position={[0, 1.0, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.5, metal: 0.3 }} />
          <boxGeometry args={[0.34, 0.24, 0.22]} />
        </mesh>
        <mesh position={[0, 1.0, 0.12]} rotation={[-0.2, 0, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.55, metal: 0.3 }} />
          <boxGeometry args={[0.34, 0.12, 0.02]} />
        </mesh>
        {/* Cinturón delgado */}
        <mesh position={[0, 1.09, 0]} castShadow>
          <Mat s={{ c: "#141418", rough: 0.4, metal: 0.4 }} />
          <boxGeometry args={[0.36, 0.06, 0.24]} />
        </mesh>

        {/* Torso: body con costuras de luz */}
        <mesh ref={rig.chest} position={[0, 1.34, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.45, metal: 0.42 }} />
          <capsuleGeometry args={[0.225, 0.4, 8, 16]} />
        </mesh>
        <mesh position={[0, 1.4, 0.175]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.7 }} />
          <boxGeometry args={[0.26, 0.03, 0.03]} />
        </mesh>
        {/* Panel central del pecho */}
        <mesh position={[0, 1.36, 0.14]} castShadow>
          <Mat s={{ c: C.trim, rough: 0.3, metal: 0.6 }} />
          <boxGeometry args={[0.18, 0.2, 0.015]} />
        </mesh>
        <mesh position={[0, 1.36, 0.155]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.4 }} />
          <boxGeometry args={[0.02, 0.16, 0.01]} />
        </mesh>
        {/* Espalda abierta al costado */}
        <mesh position={[0, 1.34, -0.15]} castShadow>
          <Mat s={{ c: "#101014", rough: 0.3, metal: 0.7 }} />
          <boxGeometry args={[0.09, 0.28, 0.035]} />
        </mesh>
        {/* Trapecio */}
        <mesh position={[0, 1.58, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.45, metal: 0.4 }} />
          <boxGeometry args={[0.48, 0.18, 0.26]} />
        </mesh>
        {/* Cuello largo y elegante */}
        <mesh position={[0, 1.73, 0]} castShadow>
          <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
          <cylinderGeometry args={[0.08, 0.11, 0.16, 12]} />
        </mesh>

        {/* Cabeza: pelo largo y máscara luminosa */}
        <group ref={rig.head} position={[0, 1.96, 0]}>
          <mesh castShadow>
            <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
            <sphereGeometry args={[0.17, 18, 16]} />
          </mesh>
          <mesh position={[0, -0.06, 0.045]} castShadow>
            <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
            <boxGeometry args={[0.12, 0.09, 0.13]} />
          </mesh>
          {/* Pelo largo */}
          <mesh position={[0, 0.1, -0.02]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
            <boxGeometry args={[0.2, 0.13, 0.19]} />
          </mesh>
          <mesh position={[-0.05, 0.09, -0.04]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
            <boxGeometry args={[0.07, 0.2, 0.08]} />
          </mesh>
          <mesh position={[0.05, 0.09, -0.04]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
            <boxGeometry args={[0.07, 0.2, 0.08]} />
          </mesh>
          {/* Melena que fluye al moverse */}
          <group ref={ponytail} position={[0, 0.02, -0.16]}>
            <mesh position={[0, -0.14, -0.02]} castShadow>
              <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
              <coneGeometry args={[0.07, 0.3, 7]} />
            </mesh>
            <mesh position={[0, -0.3, -0.04]} castShadow>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.2 }} />
              <coneGeometry args={[0.028, 0.08, 7]} />
            </mesh>
          </group>
          {/* Vincha tecnológica */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.1, rough: 0.4, metal: 0.5 }} />
            <boxGeometry args={[0.36, 0.035, 0.36]} />
          </mesh>
          {/* Visor de una línea */}
          <mesh position={[0, 0.045, 0.155]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 2.5 }} />
            <boxGeometry args={[0.2, 0.025, 0.035]} />
          </mesh>
          {/* Mascarilla inferior */}
          <mesh position={[0, -0.1, 0.09]} castShadow>
            <Mat s={{ c: C.gloves, rough: 0.4, metal: 0.3 }} />
            <boxGeometry args={[0.17, 0.07, 0.08]} />
          </mesh>
          {/* Pendientes / implants */}
          <mesh position={[-0.155, -0.02, 0.05]} rotation={[0, 0, 0.5]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.6 }} />
            <boxGeometry args={[0.02, 0.05, 0.02]} />
          </mesh>
          <mesh position={[0.155, -0.02, 0.05]} rotation={[0, 0, 0.5]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.6 }} />
            <boxGeometry args={[0.02, 0.05, 0.02]} />
          </mesh>
        </group>

        {makeArm("L")}
        {makeArm("R")}
        {makeLeg("L")}
        {makeLeg("R")}
      </group>
    </>
  );
}

// ---------------- BRUTE: Heavy Fighter ----------------

function BruteModel({ char, rig: external }: { char: CharacterDef; rig?: RigRefs | null }) {
  const rig = useRig(external);
  const C = char.colors;
  const sway = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!sway.current) return;
    sway.current.rotation.z = Math.sin(t * 1.25) * 0.02;
    sway.current.position.y = Math.sin(t * 2.2) * 0.008;
  });

  const makeArm = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group
        key={side}
        ref={isL ? rig.armL : rig.armR}
        position={[0.48 * sx, 1.72, 0]}
        rotation={[isL ? -0.7 : -0.95, 0, isL ? 0.28 : -0.1]}
      >
        {/* Hombrera pesada con púas */}
        <mesh position={[sx * 0.03, 0.03, 0.02]} castShadow>
          <Mat s={{ c: "#191206", rough: 0.4, metal: 0.6 }} />
          <sphereGeometry args={[0.15, 12, 10]} />
        </mesh>
        <mesh position={[sx * 0.17, 0.05, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 0.9 }} />
          <boxGeometry args={[0.03, 0.04, 0.09]} />
        </mesh>
        <mesh position={[sx * -0.05, 0.06, 0.13]} rotation={[0, 0, Math.PI / 2]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 0.9 }} />
          <boxGeometry args={[0.03, 0.04, 0.08]} />
        </mesh>
        <group position={[0, -0.38, 0]}>
          {/* Bíceps musculoso blindado */}
          <mesh position={[0, 0.19, 0]} castShadow>
            <Mat s={{ c: C.skin, rough: 0.75, metal: 0.1 }} />
            <capsuleGeometry args={[0.12, 0.38, 6, 12]} />
          </mesh>
          <mesh position={[0, 0.04, 0]} castShadow>
            <Mat s={{ c: C.trim, rough: 0.3, metal: 0.7 }} />
            <cylinderGeometry args={[0.125, 0.125, 0.05, 12]} />
          </mesh>
          <group ref={isL ? rig.forearmL : rig.forearmR} position={[0, -0.38, 0]}>
            {/* Antebrazo con guantelete macizo */}
            <mesh position={[0, -0.16, 0]} castShadow>
              <Mat s={{ c: "#191206", rough: 0.4, metal: 0.65 }} />
              <capsuleGeometry args={[0.11, 0.32, 7, 14]} />
            </mesh>
            {/* Placas del guantelete */}
            <mesh position={[0, -0.18, 0.05]} castShadow>
              <Mat s={{ c: C.trim, rough: 0.35, metal: 0.7 }} />
              <boxGeometry args={[0.13, 0.22, 0.035]} />
            </mesh>
            <mesh position={[0, -0.18, 0.075]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.9 }} />
              <boxGeometry args={[0.035, 0.2, 0.015]} />
            </mesh>
            {/* Puño de potencia */}
            <mesh position={[0, -0.34, 0.02]} castShadow>
              <Mat s={{ c: C.gloves, rough: 0.4, metal: 0.4 }} />
              <boxGeometry args={[0.2, 0.19, 0.16]} />
            </mesh>
            {/* Nudillos de impacto */}
            <mesh position={[0, -0.37, 0.11]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 2.4 }} />
              <boxGeometry args={[0.16, 0.06, 0.04]} />
            </mesh>
            {/* Refuerzo lateral del puño */}
            <mesh position={[sx * -0.11, -0.33, 0]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.3 }} />
              <boxGeometry args={[0.02, 0.12, 0.05]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  const makeLeg = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group key={side} ref={isL ? rig.legL : rig.legR} position={[0.21 * sx, 1.08, 0]}>
        {/* Muslo grueso */}
        <mesh position={[0, -0.23, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.6, metal: 0.25 }} />
          <capsuleGeometry args={[0.15, 0.46, 6, 14]} />
        </mesh>
        <mesh position={[sx * 0.145, -0.2, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.3 }} />
          <boxGeometry args={[0.018, 0.3, 0.06]} />
        </mesh>
        {/* Rodillera blindada */}
        <mesh position={[0, -0.46, 0.055]} castShadow>
          <Mat s={{ c: C.trim, rough: 0.3, metal: 0.7 }} />
          <sphereGeometry args={[0.11, 9, 7]} />
        </mesh>
        <group ref={isL ? rig.shinL : rig.shinR} position={[0, -0.46, 0]}>
          {/* Canilla blindada */}
          <mesh position={[0, -0.23, 0]} castShadow>
            <Mat s={{ c: "#191206", rough: 0.45, metal: 0.6 }} />
            <capsuleGeometry args={[0.125, 0.46, 7, 14]} />
          </mesh>
          <mesh position={[0, -0.23, 0.06]} castShadow>
            <Mat s={{ c: C.gloves, rough: 0.4, metal: 0.5 }} />
            <boxGeometry args={[0.14, 0.34, 0.04]} />
          </mesh>
          <mesh position={[0, -0.23, 0.085]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 2 }} />
            <boxGeometry args={[0.04, 0.28, 0.02]} />
          </mesh>
          {/* Bota de combate pesada */}
          <group ref={isL ? rig.footL : rig.footR} position={[0, -0.46, 0.04]}>
            <mesh position={[0, 0.08, -0.02]} castShadow>
              <Mat s={{ c: "#191206", rough: 0.45, metal: 0.5 }} />
              <cylinderGeometry args={[0.15, 0.14, 0.16, 10]} />
            </mesh>
            <mesh position={[0, -0.02, 0.05]} castShadow>
              <Mat s={{ c: "#121216", rough: 0.5, metal: 0.5 }} />
              <boxGeometry args={[0.2, 0.14, 0.3]} />
            </mesh>
            <mesh position={[0, -0.005, 0.15]} castShadow>
              <Mat s={{ c: C.trim, rough: 0.35, metal: 0.7 }} />
              <boxGeometry args={[0.18, 0.11, 0.1]} />
            </mesh>
            <mesh position={[0, -0.09, 0.04]} castShadow>
              <Mat s={{ c: "#08080a", rough: 0.9 }} />
              <boxGeometry args={[0.2, 0.04, 0.32]} />
            </mesh>
            <mesh position={[0, -0.085, -0.08]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 2 }} />
              <boxGeometry args={[0.18, 0.02, 0.08]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  return (
    <>
      <group ref={sway}>
        {/* Cadera enorme con cinturón de placas */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.6, metal: 0.3 }} />
          <boxGeometry args={[0.44, 0.3, 0.28]} />
        </mesh>
        <mesh position={[0, 1.18, 0]} castShadow>
          <Mat s={{ c: "#191206", rough: 0.4, metal: 0.55 }} />
          <boxGeometry args={[0.46, 0.1, 0.3]} />
        </mesh>
        <mesh position={[0, 1.18, 0.155]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.6 }} />
          <boxGeometry args={[0.3, 0.035, 0.015]} />
        </mesh>
        {/* Torso blindado masivo */}
        <mesh ref={rig.chest} position={[0, 1.4, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.5, metal: 0.5 }} />
          <capsuleGeometry args={[0.34, 0.4, 9, 16]} />
        </mesh>
        {/* Placa pectoral */}
        <mesh position={[0, 1.52, 0.12]} castShadow>
          <Mat s={{ c: "#191206", rough: 0.4, metal: 0.65 }} />
          <boxGeometry args={[0.44, 0.24, 0.14]} />
        </mesh>
        {/* Tablero abdominal de placas */}
        <mesh position={[0, 1.3, 0.13]} castShadow>
          <Mat s={{ c: C.gloves, rough: 0.45, metal: 0.4 }} />
          <boxGeometry args={[0.32, 0.16, 0.07]} />
        </mesh>
        <mesh position={[0, 1.3, 0.165]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.7 }} />
          <boxGeometry args={[0.03, 0.12, 0.02]} />
        </mesh>
        {/* Reactor central del pecho */}
        <mesh position={[0, 1.5, 0.21]} castShadow>
          <Mat s={{ c: "#0a0a0e", rough: 0.3, metal: 0.6 }} />
          <cylinderGeometry args={[0.09, 0.09, 0.06, 10]} />
        </mesh>
        <mesh position={[0, 1.5, 0.235]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 3 }} />
          <circleGeometry args={[0.065, 12]} />
        </mesh>
        {/* Columna y cableado trasero */}
        <mesh position={[0, 1.4, -0.18]} castShadow>
          <Mat s={{ c: "#101014", rough: 0.3, metal: 0.7 }} />
          <boxGeometry args={[0.12, 0.32, 0.05]} />
        </mesh>
        <mesh position={[0, 1.4, -0.205]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.8 }} />
          <boxGeometry args={[0.05, 0.26, 0.02]} />
        </mesh>
        {/* Cuello grueso */}
        <mesh position={[0, 1.79, 0]} castShadow>
          <Mat s={{ c: C.skin, rough: 0.8, metal: 0.1 }} />
          <cylinderGeometry args={[0.14, 0.17, 0.16, 12]} />
        </mesh>

        {/* Cabeza: casco cerrado con visor de acusación */}
        <group ref={rig.head} position={[0, 2.02, 0]}>
          <mesh castShadow>
            <Mat s={{ c: "#191206", rough: 0.4, metal: 0.75 }} />
            <sphereGeometry args={[0.205, 18, 16]} />
          </mesh>
          {/* Prominencia del yelmo */}
          <mesh position={[0, 0.06, -0.03]} castShadow>
            <Mat s={{ c: "#191206", rough: 0.4, metal: 0.7 }} />
            <boxGeometry args={[0.2, 0.24, 0.2]} />
          </mesh>
          {/* Cresta de comandante */}
          <mesh position={[0, 0.2, -0.02]} rotation={[-0.1, 0, 0]} castShadow>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.2, rough: 0.35, metal: 0.5 }} />
            <boxGeometry args={[0.16, 0.07, 0.1]} />
          </mesh>
          <mesh position={[0, 0.26, -0.04]} castShadow>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.2, rough: 0.35, metal: 0.5 }} />
            <boxGeometry args={[0.09, 0.05, 0.08]} />
          </mesh>
          {/* Rendija de visión */}
          <mesh position={[0, 0.04, 0.185]} castShadow>
            <Mat s={{ c: "#0a0a0e", rough: 0.2, metal: 0.5 }} />
            <boxGeometry args={[0.2, 0.07, 0.07]} />
          </mesh>
          <mesh position={[0, 0.04, 0.22]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 3 }} />
            <boxGeometry args={[0.15, 0.035, 0.02]} />
          </mesh>
          {/* Rejilla de ventilación central */}
          <mesh position={[0, -0.1, 0.17]} castShadow>
            <Mat s={{ c: "#0a0a0e", rough: 0.5, metal: 0.4 }} />
            <boxGeometry args={[0.18, 0.06, 0.07]} />
          </mesh>
          <mesh position={[0, -0.1, 0.21]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.6 }} />
            <boxGeometry args={[0.1, 0.03, 0.015]} />
          </mesh>
          {/* Orejeras blindadas */}
          <mesh position={[-0.21, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Mat s={{ c: C.gloves, rough: 0.4, metal: 0.6 }} />
            <cylinderGeometry args={[0.045, 0.045, 0.024, 8]} />
          </mesh>
          <mesh position={[0.21, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <Mat s={{ c: C.gloves, rough: 0.4, metal: 0.6 }} />
            <cylinderGeometry args={[0.045, 0.045, 0.024, 8]} />
          </mesh>
        </group>

        {makeArm("L")}
        {makeArm("R")}
        {makeLeg("L")}
        {makeLeg("R")}
      </group>
    </>
  );
}

// ---------------- KIRA: Agile / Counter ----------------

function KiraModel({ char, rig: external }: { char: CharacterDef; rig?: RigRefs | null }) {
  const rig = useRig(external);
  const C = char.colors;
  const root = useRef<THREE.Group>(null);
  const lashL = useRef<THREE.Group>(null);
  const lashR = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (root.current) {
      root.current.position.y = Math.abs(Math.sin(t * 4.2)) * 0.025;
      root.current.rotation.z = Math.sin(t * 2.6) * 0.02;
    }
    if (lashL.current) lashL.current.rotation.x = 0.4 + Math.sin(t * 3.6) * 0.1;
    if (lashR.current) lashR.current.rotation.x = 0.38 + Math.sin(t * 3.2 + 0.6) * 0.12;
  });

  const makeArm = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group
        key={side}
        ref={isL ? rig.armL : rig.armR}
        position={[0.31 * sx, 1.52, 0]}
        rotation={[isL ? -1.35 : -1.2, 0, isL ? 0.16 : -0.18]}
      >
        <mesh castShadow>
          <Mat s={{ c: C.suit, rough: 0.5, metal: 0.3 }} />
          <sphereGeometry args={[0.09, 12, 10]} />
        </mesh>
        <group position={[0, -0.31, 0]}>
          <mesh position={[0, 0.155, 0]} castShadow>
            <Mat
              s={{ c: isL ? C.skin : C.suit, rough: isL ? 0.75 : 0.5, metal: isL ? 0.05 : 0.3 }}
            />
            <capsuleGeometry args={[0.068, 0.31, 6, 12]} />
          </mesh>
          <group ref={isL ? rig.forearmL : rig.forearmR} position={[0, -0.31, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow>
              <Mat
                s={{ c: isL ? C.skin : C.suit, rough: isL ? 0.75 : 0.5, metal: isL ? 0.05 : 0.3 }}
              />
              <capsuleGeometry args={[0.06, 0.26, 6, 12]} />
            </mesh>
            {/* Dispositivo de muñeca (solo derecho) */}
            {!isL && (
              <>
                <mesh position={[0, -0.2, 0.02]} castShadow>
                  <Mat s={{ c: C.trim, rough: 0.3, metal: 0.6 }} />
                  <boxGeometry args={[0.09, 0.14, 0.08]} />
                </mesh>
                <mesh position={[0, -0.2, 0.065]}>
                  <Mat s={{ c: C.accent, e: C.accent, em: 2 }} />
                  <boxGeometry args={[0.06, 0.04, 0.02]} />
                </mesh>
              </>
            )}
            {/* Puño ligero por ambos lados */}
            <mesh position={[0, -0.27, 0.01]} castShadow>
              <Mat s={{ c: C.gloves, rough: 0.5, metal: 0.2 }} />
              <boxGeometry args={[0.075, 0.1, 0.08]} />
            </mesh>
            <mesh position={[0, -0.28, 0.06]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.8 }} />
              <boxGeometry args={[0.05, 0.02, 0.02]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  const makeLeg = (side: "L" | "R") => {
    const sx = side === "L" ? -1 : 1;
    const isL = side === "L";
    return (
      <group key={side} ref={isL ? rig.legL : rig.legR} position={[0.15 * sx, 0.95, 0]}>
        <mesh position={[0, -0.19, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.65, metal: 0.15 }} />
          <capsuleGeometry args={[0.1, 0.38, 6, 12]} />
        </mesh>
        <mesh position={[sx * 0.1, -0.19, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.4 }} />
          <boxGeometry args={[0.014, 0.26, 0.05]} />
        </mesh>
        <group ref={isL ? rig.shinL : rig.shinR} position={[0, -0.4, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <Mat s={{ c: C.pants, rough: 0.65, metal: 0.15 }} />
            <capsuleGeometry args={[0.082, 0.4, 6, 12]} />
          </mesh>
          {/* Greave minimalista */}
          <mesh position={[0, -0.18, 0.045]} castShadow>
            <Mat s={{ c: C.suit, rough: 0.4, metal: 0.5 }} />
            <boxGeometry args={[0.075, 0.22, 0.025]} />
          </mesh>
          <mesh position={[0, -0.22, 0.05]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 1.8 }} />
            <boxGeometry args={[0.02, 0.1, 0.012]} />
          </mesh>
          {/* Botas ligeras con suela de energía */}
          <group ref={isL ? rig.footL : rig.footR} position={[0, -0.4, 0.04]}>
            <mesh position={[0, 0.05, -0.02]} castShadow>
              <Mat s={{ c: C.suit, rough: 0.45, metal: 0.35 }} />
              <cylinderGeometry args={[0.088, 0.084, 0.12, 10]} />
            </mesh>
            <mesh position={[0, -0.015, 0.05]} castShadow>
              <Mat s={{ c: "#12151b", rough: 0.5, metal: 0.4 }} />
              <boxGeometry args={[0.12, 0.1, 0.24]} />
            </mesh>
            <mesh position={[0, -0.01, 0.12]} castShadow>
              <Mat s={{ c: C.trim, rough: 0.05, metal: 0.35 }} />
              <boxGeometry args={[0.11, 0.07, 0.08]} />
            </mesh>
            <mesh position={[0, -0.065, 0.04]} castShadow>
              <Mat s={{ c: "#08080a", rough: 0.9 }} />
              <boxGeometry args={[0.13, 0.035, 0.26]} />
            </mesh>
            <mesh position={[0, -0.05, 0.03]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 2.2 }} />
              <boxGeometry args={[0.1, 0.012, 0.2]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  return (
    <>
      <group ref={root}>
        {/* Cadera compacta con bolsillos de utilidad */}
        <mesh position={[0, 0.97, 0]} castShadow>
          <Mat s={{ c: C.pants, rough: 0.65, metal: 0.15 }} />
          <boxGeometry args={[0.32, 0.24, 0.22]} />
        </mesh>
        <mesh position={[-0.16, 0.98, 0.06]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.6, metal: 0.2 }} />
          <boxGeometry args={[0.04, 0.09, 0.08]} />
        </mesh>
        <mesh position={[0.16, 0.98, 0.06]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.6, metal: 0.2 }} />
          <boxGeometry args={[0.04, 0.09, 0.08]} />
        </mesh>
        <mesh position={[0, 1.04, 0]} castShadow>
          <Mat s={{ c: "#141418", rough: 0.4, metal: 0.4 }} />
          <boxGeometry args={[0.34, 0.07, 0.24]} />
        </mesh>

        {/* Torso: arnés transparente y cuerpo enrollado */}
        <mesh ref={rig.chest} position={[0, 1.26, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.55, metal: 0.25 }} />
          <capsuleGeometry args={[0.205, 0.32, 8, 16]} />
        </mesh>
        <mesh position={[0, 1.2, 0.11]} castShadow>
          <Mat s={{ c: C.skin, rough: 0.75, metal: 0.05 }} />
          <boxGeometry args={[0.15, 0.13, 0.05]} />
        </mesh>
        {/* Arnés asimétrico */}
        <mesh position={[-0.16, 1.34, 0.1]} rotation={[0.1, 0.2, 0]} castShadow>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.5, rough: 0.4, metal: 0.4 }} />
          <boxGeometry args={[0.05, 0.16, 0.05]} />
        </mesh>
        <mesh position={[0.14, 1.42, 0.14]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 2 }} />
          <boxGeometry args={[0.04, 0.03, 0.02]} />
        </mesh>
        {/* Columna de gravedad dorsal */}
        <mesh position={[0, 1.28, -0.13]} castShadow>
          <Mat s={{ c: "#101014", rough: 0.3, metal: 0.7 }} />
          <boxGeometry args={[0.06, 0.24, 0.035]} />
        </mesh>
        <mesh position={[0, 1.28, -0.148]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 1.8 }} />
          <boxGeometry args={[0.025, 0.18, 0.015]} />
        </mesh>
        {/* Trapecio */}
        <mesh position={[0, 1.48, 0]} castShadow>
          <Mat s={{ c: C.suit, rough: 0.5, metal: 0.3 }} />
          <boxGeometry args={[0.42, 0.18, 0.24]} />
        </mesh>

        {/* Hombro técnico asimétrico (derecho) */}
        <mesh position={[0.32, 1.54, 0]} castShadow>
          <Mat s={{ c: C.trim, rough: 0.3, metal: 0.55 }} />
          <boxGeometry args={[0.17, 0.1, 0.14]} />
        </mesh>
        <mesh position={[0.38, 1.6, 0]}>
          <Mat s={{ c: C.accent, e: C.accent, em: 2.2 }} />
          <boxGeometry args={[0.04, 0.06, 0.04]} />
        </mesh>

        {/* Cuello */}
        <mesh position={[0, 1.62, 0]} castShadow>
          <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
          <cylinderGeometry args={[0.075, 0.1, 0.13, 12]} />
        </mesh>

        {/* Cabeza: pelo corto, vincha con cintas y auricular */}
        <group ref={rig.head} position={[0, 1.8, 0]}>
          <mesh castShadow>
            <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
            <sphereGeometry args={[0.16, 18, 16]} />
          </mesh>
          <mesh position={[0, -0.06, 0.045]} castShadow>
            <Mat s={{ c: C.skin, rough: 0.8, metal: 0.05 }} />
            <boxGeometry args={[0.115, 0.09, 0.13]} />
          </mesh>
          {/* Pelo corto recogido */}
          <mesh position={[0, 0.09, -0.02]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
            <boxGeometry args={[0.2, 0.1, 0.19]} />
          </mesh>
          <mesh position={[-0.05, 0.03, -0.06]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
            <boxGeometry args={[0.05, 0.15, 0.05]} />
          </mesh>
          <mesh position={[0.05, 0.03, -0.06]} castShadow>
            <Mat s={{ c: C.hair, rough: 0.85, metal: 0.15 }} />
            <boxGeometry args={[0.05, 0.15, 0.05]} />
          </mesh>
          {/* Vincha tecnológica */}
          <mesh position={[0, 0.045, 0]} castShadow>
            <Mat s={{ c: C.accent, rough: 0.4, metal: 0.45, e: C.accent, em: 1 }} />
            <boxGeometry args={[0.34, 0.03, 0.34]} />
          </mesh>
          {/* Visor fino */}
          <mesh position={[0, 0.03, 0.135]}>
            <Mat s={{ c: C.accent, e: C.accent, em: 2.5 }} />
            <boxGeometry args={[0.17, 0.02, 0.03]} />
          </mesh>
          {/* Cintas flotantes (marcador de movimiento) */}
          <group ref={lashL} position={[-0.09, -0.02, -0.17]}>
            <mesh position={[0, -0.12, 0]} castShadow>
              <Mat s={{ c: C.accent, e: C.accent, em: 0.8 }} />
              <boxGeometry args={[0.018, 0.22, 0.018]} />
            </mesh>
            <mesh position={[0, -0.24, 0.01]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.4 }} />
              <boxGeometry args={[0.012, 0.06, 0.012]} />
            </mesh>
          </group>
          <group ref={lashR} position={[0.05, -0.02, -0.18]}>
            <mesh position={[0, -0.14, 0]} castShadow>
              <Mat s={{ c: C.accent, e: C.accent, em: 0.8 }} />
              <boxGeometry args={[0.018, 0.26, 0.018]} />
            </mesh>
            <mesh position={[0, -0.27, -0.01]}>
              <Mat s={{ c: C.accent, e: C.accent, em: 1.4 }} />
              <boxGeometry args={[0.012, 0.07, 0.012]} />
            </mesh>
          </group>
          {/* Auricular táctico con micrófono */}
          <mesh position={[-0.165, 0.01, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <Mat s={{ c: "#141418", e: C.accent, em: 0.7, rough: 0.3, metal: 0.8 }} />
            <cylinderGeometry args={[0.04, 0.04, 0.02, 8]} />
          </mesh>
          <mesh position={[-0.15, -0.09, 0.08]} rotation={[0.7, 0, 0]}>
            <Mat s={{ c: C.trim, rough: 0.35, metal: 0.5 }} />
            <boxGeometry args={[0.016, 0.06, 0.016]} />
          </mesh>
        </group>

        {makeArm("L")}
        {makeArm("R")}
        {makeLeg("L")}
        {makeLeg("R")}
      </group>
    </>
  );
}

// ---------------- Registro / selector ----------------

export function CharacterModel({ char, rig }: { char: CharacterDef; rig?: RigRefs | null }) {
  const r = rig ?? null;
  switch (char.id) {
    case "vulcan":
      return <VoltModel char={char} rig={r} />;
    case "kestrel":
      return <NyxModel char={char} rig={r} />;
    case "bolt":
      return <BruteModel char={char} rig={r} />;
    default:
      return <KiraModel char={char} rig={r} />;
  }
}

export function shadowRadius(characterId: string): number {
  switch (characterId) {
    case "bolt":
      return 0.62;
    case "kestrel":
      return 0.44;
    case "ash":
      return 0.42;
    default:
      return 0.5;
  }
}
