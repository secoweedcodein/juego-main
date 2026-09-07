// FASE 11 — Pantalla de controles: remapeo interactivo de teclas.

import { useEffect, useRef, useState } from "react";
import {
  ACTION_LABELS,
  GAME_ACTIONS,
  clearKeymap,
  defaultKeymap,
  keyDisplayName,
  loadKeymap,
  primaryCode,
  remapKey,
  type GameAction,
  type Keymap,
} from "../../game/config/keymap";
import { MenuShell } from "./MenuShell";
import { audio } from "../../game/audio/AudioManager";

export function ControlsScreen({ onBack }: { onBack: () => void }) {
  const [keymap, setKeymap] = useState<Keymap>(() => loadKeymap());
  const [capturing, setCapturing] = useState<GameAction | null>(null);
  const [message, setMessage] = useState<string>("");
  const captureRef = useRef(false);

  const update = (next: Keymap) => {
    setKeymap(next);
    setCapturing(null);
  };

  // Modo captura: espera la siguiente tecla pulsada.
  useEffect(() => {
    if (!capturing) {
      captureRef.current = false;
      return;
    }
    captureRef.current = true;
    const onDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const action = capturing;
      if (!captureRef.current) return;
      if (e.code === "Escape") {
        setCapturing(null);
        return;
      }
      const reason = remapKey(keymap, action, e.code);
      if (reason) {
        setMessage(reason);
        setCapturing(null);
        return;
      }
      setMessage("");
      update({ ...keymap });
      audio.playSfx("menu");
    };
    window.addEventListener("keydown", onDown, { capture: true });
    return () => window.removeEventListener("keydown", onDown, { capture: true });
  }, [capturing, keymap]);

  const restore = () => {
    clearKeymap();
    setKeymap(defaultKeymap());
    setCapturing(null);
    setMessage("Controles restaurados a los predeterminados");
    audio.playSfx("menu");
  };

  return (
    <MenuShell title="CONTROLES" subtitle="Haz clic en CAMBIAR y pulsa una tecla" onBack={onBack}>
      {message && (
        <div className="mb-4 rounded-sm border border-hud-timer/60 bg-hud-timer/10 px-3 py-2 text-xs tracking-wider text-hud-timer">
          {message}
        </div>
      )}

      <ul className="mb-4 space-y-1.5">
        {GAME_ACTIONS.map((action) => {
          const scanning = capturing === action;
          return (
            <li
              key={action}
              className={`flex items-center justify-between rounded-sm border px-4 py-2.5 transition ${
                scanning ? "border-hud-stamina bg-hud-stamina/10" : "border-border/60 bg-card/60"
              }`}
            >
              <div>
                <div className="text-[0.7rem] uppercase tracking-[0.2em] text-foreground">
                  {ACTION_LABELS[action]}
                </div>
                {scanning && (
                  <div className="mt-0.5 text-xs animate-pulse text-hud-stamina">
                    Pulsa una tecla… (ESC cancela)
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-16 rounded-sm border border-border bg-background px-2 py-1 text-center font-mono text-sm tracking-widest text-hud-timer">
                  {scanning ? "…" : keyDisplayName(primaryCode(keymap, action))}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    audio.ensureInit();
                    setMessage("");
                    setCapturing(scanning ? null : action);
                  }}
                  className={`rounded-sm border px-3 py-1 text-[0.62rem] uppercase tracking-[0.2em] transition ${
                    scanning
                      ? "animate-pulse border-hud-stamina text-hud-stamina"
                      : "border-border/60 text-muted-foreground hover:border-hud-stamina/60 hover:text-foreground"
                  }`}
                >
                  {scanning ? "Cancelar" : "Cambiar"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between">
        <p className="max-w-sm text-[0.62rem] uppercase tracking-[0.15em] text-muted-foreground/70">
          ESC está reservado para la pausa del juego y no se puede remapear.
        </p>
        <button
          type="button"
          onClick={restore}
          className="rounded-sm border border-border/70 bg-card/70 px-4 py-2 text-[0.65rem] uppercase tracking-[0.25em] text-foreground transition hover:border-hud-stamina/70"
        >
          Restaurar predeterminados
        </button>
      </div>
    </MenuShell>
  );
}
