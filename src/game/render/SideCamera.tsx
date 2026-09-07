// Cámara lateral 3D de fighting game: sigue a ambos luchadores,
// mantiene a los dos en pantalla y hace zoom dinámico.

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MatchState } from "../core/types";

const desired = new THREE.Vector3();
const lookTarget = new THREE.Vector3();
const smoothedLook = new THREE.Vector3(0, 1.2, 0);

interface Props {
  match: React.RefObject<MatchState>;
}

export function SideCamera({ match }: Props) {
  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const m = match.current;
    if (!m) return;
    const [a, b] = m.fighters;

    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const midZ = (a.z + b.z) / 2;
    const spread = Math.abs(a.x - b.x);

    // Zoom: más separación = cámara más lejos y más alta.
    const dist = THREE.MathUtils.clamp(7.5 + spread * 0.62, 8.5, 16.5);
    const height = 2.1 + midY * 0.5 + spread * 0.055;

    // Límite para no salir del escenario.
    const clampedX = THREE.MathUtils.clamp(midX, -4.5, 4.5);

    desired.set(clampedX, height, midZ + dist);
    camera.position.lerp(desired, 1 - Math.exp(-5 * delta));

    lookTarget.set(clampedX, 1.15 + midY * 0.45, midZ);
    smoothedLook.lerp(lookTarget, 1 - Math.exp(-7 * delta));
    camera.lookAt(smoothedLook);
  });

  return null;
}
