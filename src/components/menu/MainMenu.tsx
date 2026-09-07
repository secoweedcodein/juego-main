// Menú principal del juego (FASE 8/11).

import { audio } from "../../game/audio/AudioManager";

export function MainMenu({
  onPlay,
  onOnline,
  onStats,
  onHistory,
  onOptions,
  onControls,
}: {
  onPlay: () => void;
  onOnline: () => void;
  onStats: () => void;
  onHistory: () => void;
  onOptions: () => void;
  onControls: () => void;
}) {
  const click = (fn: () => void, sound: "menu" | "menuConfirm" = "menu") => {
    audio.ensureInit();
    audio.playSfx(sound);
    fn();
  };

  const items = [
    {
      label: "MULTIJUGADOR ONLINE",
      desc: "Salas 1v1 en tiempo real mediante código",
      fn: onOnline,
      confirm: true,
      highlight: true,
    },
    {
      label: "VS CPU (SOLITARIO)",
      desc: "Selecciona luchador, rival y escenario",
      fn: onPlay,
      confirm: true,
      highlight: false,
    },
    { label: "ESTADÍSTICAS", desc: "Récord, rango y rating", fn: onStats, confirm: false, highlight: false },
    { label: "HISTORIAL", desc: "Combates anteriores", fn: onHistory, confirm: false, highlight: false },
    { label: "OPCIONES", desc: "Audio y gráficos", fn: onOptions, confirm: false, highlight: false },
    { label: "CONTROLES", desc: "Remapea tus teclas", fn: onControls, confirm: false, highlight: false },
  ] as const;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="mb-10 text-center">
        <div className="mb-2 text-[0.7rem] uppercase tracking-[0.5em] text-hud-timer/70">
          Fighting 3D cyberpunk
        </div>
        <h1 className="font-display text-5xl tracking-[0.25em] text-hud-stamina md:text-6xl">
          NEON FURY FIGHT
        </h1>
        <div className="mt-2 font-display text-sm tracking-[0.6em] text-muted-foreground">
          NEON CIRCUIT
        </div>
      </div>

      <nav className="flex w-full max-w-sm flex-col gap-3">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => click(it.fn, it.confirm ? "menuConfirm" : "menu")}
            className={`group relative overflow-hidden rounded-sm border px-6 py-3.5 text-left transition ${
              it.highlight
                ? "border-hud-stamina/80 bg-hud-stamina/10 shadow-neon hover:bg-hud-stamina/20"
                : "border-border/70 bg-card/60 hover:border-hud-stamina/80 hover:bg-card hover:shadow-neon"
            }`}
          >
            {it.highlight && (
              <span className="absolute top-2 right-2 rounded bg-hud-stamina px-1.5 py-0.5 text-[8px] font-black tracking-widest text-background uppercase shadow-neon">
                1V1 ONLINE
              </span>
            )}
            <div className="flex items-baseline justify-between">
              <span
                className={`font-display text-lg tracking-[0.3em] transition ${
                  it.highlight
                    ? "text-hud-stamina font-bold"
                    : "text-foreground group-hover:text-hud-stamina"
                }`}
              >
                {it.label}
              </span>
              <span className="text-sm text-hud-timer/60">»</span>
            </div>
            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
              {it.desc}
            </div>
          </button>
        ))}
      </nav>

      <p className="mt-10 max-w-md text-center text-[0.68rem] uppercase tracking-[0.2em] text-muted-foreground/70">
        1v1 contra CPU · combos · esquivas · objetos · peligros de escenario · progresión
        persistente
      </p>
    </main>
  );
}
