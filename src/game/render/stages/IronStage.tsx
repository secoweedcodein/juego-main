// FASE 5 — IRON YARD: patio de prisión con vallas electrificadas y público.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { getStage } from "../../data/stages";
import { ArenaFloor } from "./parts";

function Fence({ x, color }: { x: number; color: string }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * 5);
  useFrame((_, d) => {
    t.current += d;
    if (ref.current) ref.current.emissiveIntensity = 1.6 + Math.sin(t.current * 9) * 0.9;
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 1.9, 0]}>
        <boxGeometry args={[0.1, 3.8, 9]} />
        <meshStandardMaterial
          ref={ref}
          color={color}
          emissive={color}
          emissiveIntensity={1.8}
          transparent
          opacity={0.35}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      {[0.4, 1.4, 2.4, 3.4].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.14, 0.06, 9]} />
          <meshStandardMaterial color="#4b5260" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Crowd({ z, color }: { z: number; color: string }) {
  const group = useRef<THREE.Group>(null);
  const people = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        x: -13 + i * 1.05 + (Math.random() - 0.5) * 0.3,
        h: 1.4 + Math.random() * 0.5,
        phase: Math.random() * 6,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((c, i) => {
      const p = people[i];
      if (p) c.position.y = p.h / 2 + Math.abs(Math.sin(t * 2.4 + p.phase)) * 0.12;
    });
  });
  return (
    <group ref={group}>
      {people.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, z]} castShadow>
          <capsuleGeometry args={[0.22, p.h * 0.55, 4, 8]} />
          <meshStandardMaterial color={i % 4 === 0 ? color : "#2a2f3a"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export function IronStage() {
  const stage = getStage("iron");
  return (
    <group>
      <color attach="background" args={[stage.palette.sky]} />
      <fog attach="fog" args={["#0d0f13", 18, 60]} />

      <ambientLight intensity={0.6} color="#6b6a5e" />
      <hemisphereLight args={["#5c5a48", "#15161a", 0.7]} />
      <directionalLight
        position={[-8, 16, 8]}
        intensity={1.9}
        color="#ffd9a0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={14}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[0, 8, 6]} intensity={26} color="#ffb02e" distance={30} decay={2} />

      <Environment>
        <Lightformer intensity={1.4} color="#ffcf8a" position={[0, 8, 3]} scale={[18, 4, 1]} />
        <Lightformer
          intensity={0.7}
          color="#7cff5c"
          position={[7, 2, -3]}
          rotation-y={-Math.PI / 2}
          scale={[14, 2, 1]}
        />
      </Environment>

      {/* Hormigón */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[70, 46]} />
        <meshStandardMaterial color="#2b2b28" roughness={0.95} metalness={0.05} />
      </mesh>
      <ArenaFloor
        bounds={stage.bounds}
        color="#39382f"
        edge={stage.palette.primary}
        metalness={0.1}
        roughness={0.9}
      />

      <Fence x={-stage.bounds.x - 0.6} color={stage.palette.secondary} />
      <Fence x={stage.bounds.x + 0.6} color={stage.palette.secondary} />

      {/* Muros y torres */}
      <mesh position={[0, 4, -7]} receiveShadow castShadow>
        <boxGeometry args={[46, 8, 1]} />
        <meshStandardMaterial color="#26262a" roughness={0.95} />
      </mesh>
      {[-14, 0, 14].map((x) => (
        <mesh key={x} position={[x, 6.5, -7.8]} castShadow>
          <boxGeometry args={[2.4, 3, 2.4]} />
          <meshStandardMaterial color="#1c1d20" roughness={0.9} />
        </mesh>
      ))}
      {[-14, 14].map((x) => (
        <pointLight
          key={x}
          position={[x, 7.5, -5]}
          intensity={30}
          color="#fff0c0"
          distance={26}
          decay={2}
        />
      ))}

      <Crowd z={-5.6} color={stage.palette.primary} />

      {/* Polvo suspendido */}
      <group />
    </group>
  );
}
