// FASE 5 — BLACKWATER DOCKS: plataforma de carga sobre agua negra, con ring-out.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { getStage } from "../../data/stages";
import { ArenaFloor, Particles } from "./parts";
import { pbrMaterial } from "../textures";

function Water() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) ref.current.position.y = -2.4 + Math.sin(t * 0.6) * 0.05;
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -2.4, 0]}>
      <planeGeometry args={[120, 90]} />
      <meshStandardMaterial color="#04090c" roughness={0.12} metalness={0.95} />
    </mesh>
  );
}

function Container({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[3.4, 2.4, 2.2]} />
      <meshStandardMaterial
        {...pbrMaterial("metal", [2, 2], { color, roughness: 0.75, metalness: 0.5 })}
      />
    </mesh>
  );
}

export function DocksStage() {
  const stage = getStage("docks");
  const bx = stage.bounds.x;
  return (
    <group>
      <color attach="background" args={[stage.palette.sky]} />
      <fog attach="fog" args={["#070d10", 10, 44]} />

      <ambientLight intensity={0.55} color="#4d6b75" />
      <hemisphereLight args={["#3c5a63", "#0a1013", 0.7]} />
      <directionalLight
        position={[4, 13, 10]}
        intensity={1.4}
        color="#bfe4f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-6, 5, 4]} intensity={24} color="#5ad2ff" distance={24} decay={2} />
      <pointLight position={[6, 5, 4]} intensity={20} color="#8be0c0" distance={24} decay={2} />

      <Environment>
        <Lightformer intensity={1.1} color="#8fd8ff" position={[0, 7, 4]} scale={[16, 3, 1]} />
        <Lightformer
          intensity={0.6}
          color="#8be0c0"
          position={[-9, 2, -2]}
          rotation-y={Math.PI / 2}
          scale={[16, 2, 1]}
        />
      </Environment>

      <Water />

      {/* Plataforma: sólo hasta los límites -> caída fuera */}
      <mesh position={[0, -0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[bx * 2 + 0.6, 0.6, stage.bounds.z * 2 + 3]} />
        <meshStandardMaterial
          {...pbrMaterial("metal", [5, 4], { color: "#20272b", roughness: 0.8, metalness: 0.4 })}
        />
      </mesh>
      <ArenaFloor
        bounds={stage.bounds}
        color="#28323a"
        edge={stage.palette.primary}
        metalness={0.5}
        roughness={0.45}
      />

      {/* Pilotes */}
      {[-bx + 0.4, 0, bx - 0.4].map((x) =>
        [-stage.bounds.z - 1, stage.bounds.z + 1].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -1.4, z]}>
            <cylinderGeometry args={[0.18, 0.18, 2.4, 8]} />
            <meshStandardMaterial
              {...pbrMaterial("metal", [1, 1], {
                color: "#171d21",
                roughness: 0.85,
                metalness: 0.55,
              })}
            />
          </mesh>
        )),
      )}

      {/* Contenedores y grúa al fondo */}
      <Container position={[-11, 1.2, -8]} color="#2f4a5a" />
      <Container position={[-7.4, 3.7, -8]} color="#54313a" />
      <Container position={[10, 1.2, -9]} color="#37503f" />
      <Container position={[13.6, 1.2, -9]} color="#4a4030" />
      <mesh position={[6, 6, -13]} castShadow>
        <boxGeometry args={[0.5, 12, 0.5]} />
        <meshStandardMaterial color="#2b3238" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[2.5, 11.5, -13]} castShadow>
        <boxGeometry args={[8, 0.4, 0.4]} />
        <meshStandardMaterial color="#2b3238" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Niebla baja */}
      <Particles
        count={420}
        color="#9fd0dd"
        size={0.22}
        speed={0.6}
        drift={0.35}
        spread={[36, 3, 18]}
        opacity={0.18}
      />
    </group>
  );
}
