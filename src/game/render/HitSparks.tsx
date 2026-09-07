// VFX de impacto (FASE 2): chispas de neón efímeras leídas de match.events.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MatchState } from "../core/types";

const POOL = 12;
const LIFE = 0.28;

interface Spark {
  life: number;
  x: number;
  y: number;
  z: number;
  blocked: boolean;
}

export function HitSparks({ match }: { match: React.RefObject<MatchState> }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const sparks = useRef<Spark[]>(
    Array.from({ length: POOL }, () => ({ life: 0, x: 0, y: 0, z: 0, blocked: false })),
  );
  const cursor = useRef(0);
  const lastTick = useRef(-1);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const m = match.current;
    if (!m) return;

    for (const e of m.events) {
      if (e.tick === lastTick.current) continue;
      const s = sparks.current[cursor.current % POOL]!;
      cursor.current++;
      s.life = LIFE;
      s.x = e.x;
      s.y = e.y;
      s.z = e.z;
      s.blocked = e.blocked;
    }
    if (m.events.length) lastTick.current = m.events[0]!.tick;

    sparks.current.forEach((s, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      if (s.life > 0) {
        s.life -= delta;
        const k = Math.max(0, s.life / LIFE);
        mesh.visible = true;
        mesh.position.set(s.x, s.y, s.z);
        const scale = (1.15 - k) * (s.blocked ? 0.5 : 0.85);
        mesh.scale.setScalar(scale);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = k;
        mat.color.set(s.blocked ? "#7dd3fc" : "#fff3b0");
      } else {
        mesh.visible = false;
      }
    });
  });

  return (
    <>
      {Array.from({ length: POOL }).map((_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            meshes.current[i] = el;
          }}
        >
          <icosahedronGeometry args={[0.34, 0]} />
          <meshBasicMaterial transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
