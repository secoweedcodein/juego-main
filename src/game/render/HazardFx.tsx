// FASE 6 — VFX del peligro del escenario (descarga eléctrica / valla).

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MatchState } from "../core/types";
import { getStage } from "../data/stages";

export function HazardFx({ match }: { match: React.RefObject<MatchState> }) {
  const marker = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useFrame((_, d) => {
    t.current += d;
    const m = match.current;
    if (!m) return;
    const stage = getStage(m.stageId);
    const isStrike = stage.hazard.kind === "strike";
    const h = m.hazard;
    const warn = isStrike && h.phase === "warn";
    const active = isStrike && h.phase === "active";

    if (marker.current) {
      marker.current.visible = warn || active;
      marker.current.position.x = h.x;
      const mat = marker.current.material as THREE.MeshBasicMaterial;
      mat.opacity = active ? 0.75 : 0.25 + Math.abs(Math.sin(t.current * 8)) * 0.35;
      marker.current.scale.setScalar(stage.hazard.radius || 1);
    }
    if (beam.current) {
      beam.current.visible = active;
      beam.current.position.x = h.x;
      beam.current.scale.x = 0.7 + Math.random() * 0.6;
      beam.current.scale.z = 0.7 + Math.random() * 0.6;
    }
    if (light.current) {
      light.current.visible = active;
      light.current.position.x = h.x;
      light.current.intensity = active ? 40 + Math.random() * 40 : 0;
    }
  });

  return (
    <group>
      <mesh ref={marker} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} visible={false}>
        <ringGeometry args={[0.75, 1, 32]} />
        <meshBasicMaterial
          color="#9fe8ff"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={beam} position={[0, 3, 0]} visible={false}>
        <cylinderGeometry args={[0.18, 0.5, 6, 8, 1, true]} />
        <meshBasicMaterial color="#d9f6ff" transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={light} position={[0, 2, 0]} color="#bfeaff" distance={16} decay={2} />
    </group>
  );
}
