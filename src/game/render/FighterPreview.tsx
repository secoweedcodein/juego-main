// Vista previa 3D de un luchador (selección de personaje).
// Monta el mismo modelo visible en combate en un mini Canvas propio, girando
// lentamente para que la silueta y el equipamiento se lean de inmediato.

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import { getCharacter } from "../data/characters";
import { CharacterModel, shadowRadius } from "./CharacterModels";

function SpinModel({ characterId }: { characterId: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (g.current) g.current.rotation.y += delta * 0.55;
  });
  const char = getCharacter(characterId);
  return (
    <group ref={g}>
      <CharacterModel char={char} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[shadowRadius(char.id), 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export function FighterPreview({
  characterId,
  className = "",
}: {
  characterId: string;
  className?: string;
}) {
  const char = getCharacter(characterId);
  return (
    <div
      className={`relative overflow-hidden rounded-sm border border-border/60 bg-gradient-to-b from-card to-background ${className}`}
      style={{
        boxShadow: `inset 0 0 40px ${char.colors.accent}22, 0 0 18px ${char.colors.accent}33`,
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.85, 5.2], fov: 44 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0a0d14"]} />
        <ambientLight intensity={0.85} color="#9fb4d8" />
        <directionalLight position={[4, 8, 6]} intensity={1.5} color="#cfe0ff" />
        <pointLight
          position={[-3, 2.5, 2]}
          intensity={22}
          color={char.colors.accent}
          distance={14}
          decay={2}
        />
        <pointLight
          position={[3, 1.2, 3.5]}
          intensity={12}
          color="#ffffff"
          distance={10}
          decay={2}
        />
        <Environment>
          <Lightformer intensity={1.2} color="#3aa6ff" position={[0, 6, 4]} scale={[16, 3, 1]} />
          <Lightformer
            intensity={0.9}
            color={char.colors.accent}
            position={[-8, 2, -2]}
            rotation-y={Math.PI / 2}
            scale={[18, 2, 1]}
          />
        </Environment>
        <SpinModel characterId={characterId} />
      </Canvas>
    </div>
  );
}
