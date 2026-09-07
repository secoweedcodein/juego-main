// FASE 6 — Render de objetos recogibles / lanzables.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MatchState } from "../core/types";
import { PROP_STATS, type PropKind } from "../data/stages";

function PropMesh({
  match,
  index,
}: {
  match: React.RefObject<MatchState>;
  index: number;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const p = match.current?.props[index];
    const g = group.current;
    if (!p || !g) return;
    const visible = p.phase !== "broken";
    g.visible = visible;
    if (!visible) return;
    const stats = PROP_STATS[p.kind as PropKind] ?? PROP_STATS.crate;
    const rest = stats.size[1] / 2;
    g.position.set(p.x, p.y + (p.phase === "ground" ? rest : 0), p.z);
    g.rotation.z = p.phase === "ground" ? (p.kind === "pipe" ? Math.PI / 2 : 0) : p.spin;
    if (halo.current) halo.current.visible = p.phase === "ground";
  });

  const p0 = match.current?.props[index];
  const stats = PROP_STATS[(p0?.kind ?? "crate") as PropKind] ?? PROP_STATS.crate;

  return (
    <group ref={group}>
      <mesh castShadow>
        {p0?.kind === "bottle" || p0?.kind === "barrel" ? (
          <cylinderGeometry args={[stats.size[0] / 2, stats.size[0] / 2, stats.size[1], 10]} />
        ) : (
          <boxGeometry args={stats.size} />
        )}
        <meshStandardMaterial
          color={stats.color}
          roughness={0.5}
          metalness={p0?.kind === "pipe" ? 0.85 : 0.2}
        />
      </mesh>
      <mesh ref={halo} rotation-x={-Math.PI / 2} position={[0, -stats.size[1] / 2 + 0.02, 0]}>
        <ringGeometry args={[0.42, 0.55, 24]} />
        <meshBasicMaterial color="#ffd76a" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function PropsView({ match }: { match: React.RefObject<MatchState> }) {
  const count = match.current?.props.length ?? 0;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <PropMesh key={i} match={match} index={i} />
      ))}
    </group>
  );
}
