// Sistema de input: teclado -> intents. Nunca aplica lógica de juego.

import type { InputIntent } from "../core/types";

const KEY_MAP: Record<string, string> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "jump",
  ShiftLeft: "dodge",
  ShiftRight: "dodge",
  ControlLeft: "crouch",
  ControlRight: "crouch",
  KeyJ: "light",
  KeyK: "heavy",
  KeyL: "kick",
  KeyU: "grab",
  KeyF: "interact",
};

/** Acciones de un solo disparo: se consumen al leerse. */
const ONE_SHOT = new Set(["light", "heavy", "kick", "grab", "interact"]);

export class KeyboardInput {
  private pressed = new Set<string>();
  private edges = new Set<string>();
  private detach: (() => void) | null = null;

  attach(target: Window) {
    const down = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (ONE_SHOT.has(action)) {
        if (!this.pressed.has(action)) this.edges.add(action);
      }
      this.pressed.add(action);
    };
    const up = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (!action) return;
      e.preventDefault();
      this.pressed.delete(action);
    };
    const blur = () => {
      this.pressed.clear();
      this.edges.clear();
    };

    target.addEventListener("keydown", down);
    target.addEventListener("keyup", up);
    target.addEventListener("blur", blur);
    this.detach = () => {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
      target.removeEventListener("blur", blur);
    };
  }

  dispose() {
    this.detach?.();
    this.detach = null;
    this.pressed.clear();
    this.edges.clear();
  }

  readIntent(): InputIntent {
    const has = (a: string) => this.pressed.has(a);
    const edge = (a: string) => {
      const v = this.edges.has(a);
      if (v) this.edges.delete(a);
      return v;
    };
    return {
      forward: (has("forward") ? 1 : 0) - (has("back") ? 1 : 0),
      lateral: (has("right") ? 1 : 0) - (has("left") ? 1 : 0),
      jump: has("jump"),
      dodge: has("dodge"),
      crouch: has("crouch"),
      light: edge("light"),
      heavy: edge("heavy"),
      kick: edge("kick"),
      grab: edge("grab"),
      interact: edge("interact"),
    };
  }
}
