// Configuración persistente del jugador (audio, gráficos). La arquitectura
// es idéntica a la progresión: store local intercambiable por un backend.

export type QualityPreset = "low" | "medium" | "high";

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  quality: QualityPreset;
  particles: boolean;
  shadows: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  musicVolume: 0.55,
  sfxVolume: 0.9,
  quality: "high",
  particles: true,
  shadows: true,
};

const STORAGE_KEY = "neon-circuit:settings:v1";

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    const s: GameSettings = { ...DEFAULT_SETTINGS };
    if (typeof parsed.masterVolume === "number") s.masterVolume = parsed.masterVolume;
    if (typeof parsed.musicVolume === "number") s.musicVolume = parsed.musicVolume;
    if (typeof parsed.sfxVolume === "number") s.sfxVolume = parsed.sfxVolume;
    if (parsed.quality === "low" || parsed.quality === "medium" || parsed.quality === "high") {
      s.quality = parsed.quality;
    }
    if (typeof parsed.particles === "boolean") s.particles = parsed.particles;
    if (typeof parsed.shadows === "boolean") s.shadows = parsed.shadows;
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // noop
  }
}
