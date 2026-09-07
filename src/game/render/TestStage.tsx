// Escenario de prueba de la FASE 1: callejón cyberpunk mínimo pero legible.
// Los tres mapas definitivos llegan en la FASE 5.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { STAGE_BOUNDS } from "../core/types";

function NeonSign({
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
    if (ref.current) {
      ref.current.emissiveIntensity = 2 + Math.sin(t.current * 3.2) * 0.5;
    }
  });
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={2} />
    </mesh>
  );
}

function Rain() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 900;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = Math.random() * 18;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 26 - 2;
    }
    return arr;
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const geo = ref.current?.geometry;
    const attr = geo?.attributes["position"];
    if (!attr) return;
    const arr = attr.array as Float32Array;
    for (let i = 1; i < arr.length; i += 3) {
      const next = (arr[i] ?? 0) - 16 * delta;
      arr[i] = next < 0 ? 18 : next;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9fd8ff" size={0.045} transparent opacity={0.55} />
    </points>
  );
}

function Building({
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

export function TestStage() {
  return (
    <group>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#070a13", 14, 52]} />

      {/* Iluminación: oscura pero legible */}
      <ambientLight intensity={0.7} color="#4a5f80" />
      <hemisphereLight args={["#3a5070", "#141a26", 0.8]} />
      <directionalLight
        position={[6, 14, 9]}
        intensity={1.6}
        color="#a9c8ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={14}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-7, 3.4, 3]} intensity={22} color="#00e5ff" distance={20} decay={2} />
      <pointLight position={[7, 3.4, 3]} intensity={22} color="#ff2f8e" distance={20} decay={2} />
      {/* Luz de relleno frontal para que los luchadores se lean bien */}
      <pointLight position={[0, 4, 8]} intensity={14} color="#cfe0ff" distance={26} decay={2} />

      <Environment>
        <Lightformer intensity={1.2} color="#3aa6ff" position={[0, 6, 4]} scale={[16, 3, 1]} />
        <Lightformer
          intensity={0.9}
          color="#ff4fa3"
          position={[-8, 2, -2]}
          rotation-y={Math.PI / 2}
          scale={[18, 2, 1]}
        />
      </Environment>

      {/* Asfalto mojado */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[70, 46]} />
        <meshStandardMaterial color="#161b26" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Franja del área de combate */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <planeGeometry args={[STAGE_BOUNDS.x * 2, STAGE_BOUNDS.z * 2 + 2]} />
        <meshStandardMaterial color="#1c2331" roughness={0.4} metalness={0.45} />
      </mesh>
      {/* Límites luminosos */}
      {[-STAGE_BOUNDS.x, STAGE_BOUNDS.x].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.1, STAGE_BOUNDS.z * 2 + 2]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2.4} />
        </mesh>
      ))}

      {/* Fondo urbano */}
      <Building position={[-11, 5, -9]} size={[7, 10, 6]} accent="#00e5ff" />
      <Building position={[-2, 7, -12]} size={[8, 14, 6]} accent="#ff2f8e" />
      <Building position={[8, 6, -10]} size={[7, 12, 6]} accent="#7cff5c" />
      <Building position={[16, 4.5, -12]} size={[6, 9, 6]} accent="#ffb02e" />
      <Building position={[-19, 5.5, -11]} size={[6, 11, 6]} accent="#ff2f8e" />

      {/* Muros laterales del callejón (frente a cámara: bajos) */}
      <mesh position={[0, 1.4, -5.2]} receiveShadow castShadow>
        <boxGeometry args={[40, 2.8, 0.6]} />
        <meshStandardMaterial color="#141822" roughness={0.9} />
      </mesh>

      <NeonSign position={[-9, 3.2, -4.8]} color="#00e5ff" size={[2.6, 0.7]} speed={1.3} />
      <NeonSign position={[-3, 2.6, -4.8]} color="#ff2f8e" size={[1.4, 1.1]} speed={0.8} />
      <NeonSign position={[5, 3.4, -4.8]} color="#7cff5c" size={[2.2, 0.6]} speed={1.7} />
      <NeonSign position={[11, 2.8, -4.8]} color="#ffb02e" size={[1.2, 1.6]} speed={1.1} />

      <Rain />
    </group>
  );
}
