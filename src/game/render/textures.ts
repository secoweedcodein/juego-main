// FASE 10 — Texturas PBR procedimentales (sin assets externos).
// Asfalto, hormigón y metal generados por código con mapas de color,
// roughness y normales. Se cachean y reutilizan para no duplicar memoria.

import * as THREE from "three";

type TextureKind = "asphalt" | "concrete" | "metal";

export interface PbrSet {
  map: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

function makeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

type Vec3 = [number, number, number];

const hash = (x: number, y: number, seed: number) => {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

function build(kind: TextureKind) {
  const map = makeTexture();
  const normal = makeTexture();
  const roughness = makeTexture();
  const ctx = map.image.getContext("2d")!;
  const nctx = normal.image.getContext("2d")!;
  const rctx = roughness.image.getContext("2d")!;
  const size = map.image.width;

  // Paleta según material.
  const base: Vec3 =
    kind === "asphalt" ? [28, 32, 40] : kind === "concrete" ? [62, 62, 58] : [52, 58, 66];
  const noiseAmp = kind === "asphalt" ? 26 : kind === "concrete" ? 34 : 22;
  const seed = kind === "asphalt" ? 11 : kind === "concrete" ? 29 : 47;

  const idata = ctx.createImageData(size, size);
  const indata = nctx.createImageData(size, size);
  const irdata = rctx.createImageData(size, size);
  const data = idata.data;
  const ndata = indata.data;
  const rdata = irdata.data;
  const height = new Float32Array(size * size);

  // Altura base ruidosa.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const v =
        hash(x, y, seed) * 0.6 +
        hash(Math.floor(x / 3), Math.floor(y / 3), seed + 1) * 0.3 +
        hash(Math.floor(x / 7), Math.floor(y / 7), seed + 2) * 0.1;
      height[i] = v;
    }
  }

  // Fisuras/planchas para metal y asfalto.
  const cracks: { x: number; y: number }[] = [];
  if (kind === "asphalt") {
    for (let c = 0; c < 14; c++) {
      const cx = Math.floor(hash(c, 1, seed) * size);
      const cy = Math.floor(hash(c, 2, seed) * size);
      const len = 40 + Math.floor(hash(c, 3, seed) * 80);
      let X = cx;
      let Y = cy;
      let dx = (hash(c, 4, seed) - 0.5) * 3;
      let dy = (hash(c, 5, seed) - 0.5) * 3;
      for (let s = 0; s < len; s++) {
        cracks.push({ x: X, y: Y });
        X = Math.floor(X + dx);
        Y = Math.floor(Y + dy);
        if (Math.random() < 0.25) {
          dx = (Math.random() - 0.5) * 4;
          dy = (Math.random() - 0.5) * 4;
        }
      }
    }
  }
  if (kind === "metal") {
    // Remaches y planchas.
    for (let gy = 0; gy < 68; gy++) {
      for (let gx = 0; gx < 68; gx++) {
        const i = gy * size + gx;
        height[i] = (height[i] ?? 0) - 0.5;
      }
    }
  }

  for (let i = 0; i < cracks.length; i++) {
    const p = cracks[i]!;
    if (p.x >= 0 && p.x < size && p.y >= 0 && p.y < size) {
      const idx = p.y * size + p.x;
      height[idx] = (height[idx] ?? 0) - 0.75;
    }
  }

  // Mapas de salida.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const hx = height[(y * size + ((x + 1) % size)) % (size * size)] ?? 0;
      const hxp = height[y * size + ((x - 1 + size) % size)] ?? 0;
      const hy = height[(((y + 1) % size) * size + x) % (size * size)] ?? 0;
      const hyp = height[(((y - 1 + size) % size) * size + x) % (size * size)] ?? 0;
      const h = height[i] ?? 0;
      const nx = (hxp - hx) * 2.2;
      const ny = (hyp - hy) * 2.2;
      const nz = 1;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

      const grain = (hash(x, y, seed) - 0.5) * noiseAmp;
      const baseR = Math.max(0, Math.min(255, base[0] + grain));
      const baseG = Math.max(0, Math.min(255, base[1] + grain));
      const baseB = Math.max(0, Math.min(255, base[2] + grain));
      const hShade = h * (kind === "metal" ? -40 : 26);
      const o = i * 4;
      data[o] = Math.max(0, Math.min(255, baseR - hShade));
      data[o + 1] = Math.max(0, Math.min(255, baseG - hShade));
      data[o + 2] = Math.max(0, Math.min(255, baseB - hShade));
      data[o + 3] = 255;

      ndata[o] = Math.round(128 + nx * inv * 127);
      ndata[o + 1] = Math.round(128 + ny * inv * 127);
      ndata[o + 2] = Math.round(128 + nz * inv * 127);
      ndata[o + 3] = 255;

      const rough = kind === "metal" ? 0.35 + h * 0.35 : 0.55 + h * 0.55;
      const rv = Math.round(rough * 255);
      rdata[o] = rv;
      rdata[o + 1] = rv;
      rdata[o + 2] = rv;
      rdata[o + 3] = 255;
    }
  }

  ctx.putImageData(idata, 0, 0);
  nctx.putImageData(indata, 0, 0);
  rctx.putImageData(irdata, 0, 0);
  map.needsUpdate = true;
  normal.needsUpdate = true;
  roughness.needsUpdate = true;

  return { map, normal, roughness };
}

const cache = new Map<TextureKind, PbrSet>();

function ensure(kind: TextureKind): PbrSet {
  const hit = cache.get(kind);
  if (hit) return hit;
  const set = build(kind);
  cache.set(kind, set);
  return set;
}

/** Devuelve el set PBR cacheado para un material (build perezoso). */
export function getPbr(kind: TextureKind): PbrSet {
  return ensure(kind);
}

/** Material estándar con el set PBR aplicado (repetido para el tamaño dado). */
export function pbrMaterial(
  kind: TextureKind,
  repeat: [number, number] = [1, 1],
  extra?: Partial<THREE.MeshStandardMaterialParameters>,
): THREE.MeshStandardMaterialParameters {
  const { map, normal, roughness } = ensure(kind);
  map.repeat.set(repeat[0], repeat[1]);
  normal.repeat.set(repeat[0], repeat[1]);
  roughness.repeat.set(repeat[0], repeat[1]);
  return {
    map,
    normalMap: normal,
    roughnessMap: roughness,
    roughness: 0.9,
    metalness: kind === "metal" ? 0.7 : 0.05,
    ...extra,
  };
}
