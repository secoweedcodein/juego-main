// FASE 5 — NEON DISTRICT: callejón comercial bajo la lluvia.

import { Environment, Lightformer } from "@react-three/drei";
import { getStage } from "../../data/stages";
import { ArenaFloor, Building, NeonSign, Particles } from "./parts";

export function NeonStage() {
  const stage = getStage("neon");
  return (
    <group>
      <color attach="background" args={[stage.palette.sky]} />
      <fog attach="fog" args={["#070a13", 14, 52]} />

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

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[70, 46]} />
        <meshStandardMaterial color="#161b26" roughness={0.3} metalness={0.6} />
      </mesh>
      <ArenaFloor bounds={stage.bounds} color="#1c2331" edge="#00e5ff" />

      <Building position={[-11, 5, -9]} size={[7, 10, 6]} accent="#00e5ff" />
      <Building position={[-2, 7, -12]} size={[8, 14, 6]} accent="#ff2f8e" />
      <Building position={[8, 6, -10]} size={[7, 12, 6]} accent="#7cff5c" />
      <Building position={[16, 4.5, -12]} size={[6, 9, 6]} accent="#ffb02e" />
      <Building position={[-19, 5.5, -11]} size={[6, 11, 6]} accent="#ff2f8e" />

      <mesh position={[0, 1.4, -5.2]} receiveShadow castShadow>
        <boxGeometry args={[40, 2.8, 0.6]} />
        <meshStandardMaterial color="#141822" roughness={0.9} />
      </mesh>

      <NeonSign position={[-9, 3.2, -4.8]} color="#00e5ff" size={[2.6, 0.7]} speed={1.3} />
      <NeonSign position={[-3, 2.6, -4.8]} color="#ff2f8e" size={[1.4, 1.1]} speed={0.8} />
      <NeonSign position={[5, 3.4, -4.8]} color="#7cff5c" size={[2.2, 0.6]} speed={1.7} />
      <NeonSign position={[11, 2.8, -4.8]} color="#ffb02e" size={[1.2, 1.6]} speed={1.1} />

      <Particles count={800} color="#9fd8ff" speed={16} spread={[40, 18, 26]} />
    </group>
  );
}
