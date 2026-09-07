// Mapa de teclas configurable (FASE 11). Cada acción tiene una lista de
// teclas (e.code); la primera es la "primaria" editable en la UI de controles.
// Se persiste en localStorage; el proyecto puede conectarlo a un backend sin
// cambiar el resto del juego.

export const GAME_ACTIONS = [
  "forward",
  "back",
  "left",
  "right",
  "jump",
  "dodge",
  "crouch",
  "block",
  "light",
  "heavy",
  "kick",
  "grab",
  "interact",
  "pause",
] as const;

export type GameAction = (typeof GAME_ACTIONS)[number];

export type Keymap = Record<GameAction, string[]>;

export const ACTION_LABELS: Record<GameAction, string> = {
  forward: "Adelante",
  back: "Atrás (bloquea)",
  left: "Izquierda",
  right: "Derecha",
  jump: "Salto",
  dodge: "Esquiva",
  crouch: "Agacharse",
  block: "Bloqueo dedicado",
  light: "Golpe",
  heavy: "Golpe fuerte",
  kick: "Patada",
  grab: "Agarre",
  interact: "Recoger/Lanzar",
  pause: "Pausa",
};

const STORAGE_KEY = "neon-circuit:keymap:v1";

/** Nombres legibles para los códigos de teclado (mostrados en la UI). */
const CODE_NAMES: Record<string, string> = {
  KeyW: "W",
  KeyA: "A",
  KeyS: "S",
  KeyD: "D",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Space: "ESPACIO",
  ShiftLeft: "SHIFT IZQ",
  ShiftRight: "SHIFT DER",
  ControlLeft: "CTRL IZQ",
  ControlRight: "CTRL DER",
  KeyJ: "J",
  KeyK: "K",
  KeyL: "L",
  KeyU: "U",
  KeyF: "F",
  Escape: "ESC",
};

export function keyDisplayName(code: string): string {
  if (code.length === 0) return "—";
  const known = CODE_NAMES[code];
  if (known) return known;
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function defaultKeymap(): Keymap {
  return {
    forward: ["KeyW", "ArrowUp"],
    back: ["KeyS", "ArrowDown"],
    left: ["KeyA", "ArrowLeft"],
    right: ["KeyD", "ArrowRight"],
    jump: ["Space"],
    dodge: ["ShiftLeft"],
    crouch: ["ControlLeft"],
    block: ["ShiftRight"],
    light: ["KeyJ"],
    heavy: ["KeyK"],
    kick: ["KeyL"],
    grab: ["KeyU"],
    interact: ["KeyF"],
    pause: ["Escape"],
  };
}

export function loadKeymap(): Keymap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultKeymap();
    const parsed = JSON.parse(raw) as Partial<Keymap>;
    const base = defaultKeymap();
    for (const action of GAME_ACTIONS) {
      const codes = parsed[action];
      if (Array.isArray(codes) && codes.length > 0) {
        base[action] = codes.filter((c): c is string => typeof c === "string" && c.length > 0);
      }
    }
    return base;
  } catch {
    return defaultKeymap();
  }
}

export function saveKeymap(keymap: Keymap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keymap));
  } catch {
    // almacenamiento no disponible: se mantiene el mapa en memoria
  }
}

export function clearKeymap() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

function removeCodeFromOthers(keymap: Keymap, code: string, keep: GameAction) {
  for (const action of GAME_ACTIONS) {
    if (action === keep) continue;
    keymap[action] = keymap[action].filter((c) => c !== code);
  }
}

/**
 * Asigna `code` como tecla primaria de `action`. Elimina el código de otras
 * acciones (evita conflictos). Devuelve la razón si no se puede asignar.
 */
export function remapKey(keymap: Keymap, action: GameAction, code: string): string | null {
  if (!code) return null;
  if (action !== "pause" && code === "Escape") {
    return "ESC está reservado para la pausa";
  }
  removeCodeFromOthers(keymap, code, action);
  const list = keymap[action].filter((c) => c !== code);
  list.unshift(code);
  keymap[action] = list;
  return null;
}

/** Indica si una acción y otra comparten alguna tecla (para la UI). */
export function hasConflict(keymap: Keymap, a: GameAction, b: GameAction): boolean {
  if (a === b) return false;
  return keymap[a].some((code) => keymap[b].includes(code));
}

/** Devuelve el código de teclado asociado a la primera tecla de una acción. */
export function primaryCode(keymap: Keymap, action: GameAction): string {
  return keymap[action][0] ?? "";
}
