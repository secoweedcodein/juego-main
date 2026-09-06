// Piezas reutilizables por los tres mapas (FASE 5).

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function NeonSign({
  position,
  color,
  size = [1.6, 0.5] as [number, number],
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  size?: [number, number];
  speed?: number;
}) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(Math.random() * 10);
  useFrame((_, d) => {
    t.current += d * speed;
    if (ref.current) ref.current.emissiveIntensity = 2 + Math.sin(t.current * 3.2) * 0.5;
  });
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={2} />
    </mesh>
  );
}

export function Particles({
  count = 700,
  color = "#9fd8ff",
  size = 0.045,
  speed = 16,
  spread = [40, 18, 26] as [number, number, number],
  drift = 0,
  opacity = 0.55,
}: {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
  spread?: [number, number, number];
  drift?: number;
  opacity?: number;
}) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread[0];
      arr[i * 3 + 1] = Math.random() * spread[1];
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread[2] - 2;
    }
    return arr;
  }, [count, spread]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const attr = ref.current?.geometry.attributes["position"];
    if (!attr) return;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const next = (arr[i + 1] ?? 0) - speed * delta;
      arr[i + 1] = next < 0 ? spread[1] : next;
      if (drift) arr[i] = (arr[i] ?? 0) + drift * delta;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={opacity} />
    </points>
  );
}

export function Building({
  position,
  size,
  accent,
}: {
  position: [number, number, number];
  size: [number, number, number];
  accent: string;
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#171a24" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.05, 0]}>
        <boxGeometry args={[size[0] * 0.9, 0.08, size[2] * 0.9]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

/** Franja del área de combate + límites luminosos. */
export function ArenaFloor({
  bounds,
  color,
  edge,
  metalness = 0.45,
  roughness = 0.4,
}: {
  bounds: { x: number; z: number };
  color: string;
  edge: string;
  metalness?: number;
  roughness?: number;
}) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[bounds.x * 2, bounds.z * 2 + 2]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
      {[-bounds.x, bounds.x].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.1, bounds.z * 2 + 2]} />
          <meshStandardMaterial color={edge} emissive={edge} emissiveIntensity={2.4} />
        </mesh>
      ))}
    </group>
  );
}
