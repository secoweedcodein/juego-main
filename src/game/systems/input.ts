// Sistema de input: teclado -> intents. Nunca aplica lógica de juego.
// Usa el keymap configurable persistido en localStorage (FASE 11).

import type { InputIntent } from "../core/types";
import { GAME_ACTIONS, loadKeymap, type GameAction, type Keymap } from "../config/keymap";

/** Acciones de un solo disparo: se consumen al leerse. */
const ONE_SHOT = new Set<GameAction>(["light", "heavy", "kick", "grab", "interact"]);

export class KeyboardInput {
  private pressed = new Set<string>();
  private edges = new Set<string>();
  private detach: (() => void) | null = null;
  private keymap: Keymap;

  constructor(keymap?: Keymap) {
    this.keymap = keymap ?? loadKeymap();
  }

  /** Códigos (e.code) que activan una acción. */
  private codesFor(action: GameAction): string[] {
    return this.keymap[action] ?? [];
  }

  private has(action: GameAction): boolean {
    return this.codesFor(action).some((code) => this.pressed.has(code));
  }

  private edge(action: GameAction): boolean {
    for (const code of this.codesFor(action)) {
      if (this.edges.has(code)) {
        this.edges.delete(code);
        return true;
      }
    }
    return false;
  }

  attach(target: Window) {
    const down = (e: KeyboardEvent) => {
      for (const action of GAME_ACTIONS) {
        if (this.codesFor(action).includes(e.code)) {
          e.preventDefault();
          if (ONE_SHOT.has(action)) {
            if (!this.pressed.has(e.code)) this.edges.add(e.code);
          }
          this.pressed.add(e.code);
          return;
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      this.pressed.delete(e.code);
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

  /** ¿Se está pulsando la acción de pausa? (consultado por GameCanvas). */
  pausePressed() {
    return this.has("pause");
  }

  readIntent(): InputIntent {
    return {
      forward: (this.has("forward") ? 1 : 0) - (this.has("back") ? 1 : 0),
      lateral: (this.has("right") ? 1 : 0) - (this.has("left") ? 1 : 0),
      jump: this.has("jump"),
      dodge: this.has("dodge"),
      crouch: this.has("crouch"),
      block: this.has("block"),
      light: this.edge("light"),
      heavy: this.edge("heavy"),
      kick: this.edge("kick"),
      grab: this.edge("grab"),
      interact: this.edge("interact"),
      timestamp: Date.now(),
    };
  }
}
