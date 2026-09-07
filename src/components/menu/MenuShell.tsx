// Marco común de las pantallas secundarias del menú.

import type { ReactNode } from "react";
import { audio } from "../../game/audio/AudioManager";

export function MenuShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const back = () => {
    audio.ensureInit();
    audio.playSfx("menu");
    onBack();
  };
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={back}
          className="mb-4 inline-block rounded-sm border border-border/70 bg-card/60 px-4 py-1.5 font-display text-xs tracking-[0.25em] text-muted-foreground transition hover:border-hud-stamina/70 hover:text-foreground"
        >
          ← MENÚ
        </button>
        <header className="mb-6">
          <h1 className="font-display text-2xl tracking-[0.35em] text-hud-stamina">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}
