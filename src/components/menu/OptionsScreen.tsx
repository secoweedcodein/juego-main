// FASE 11 — Pantalla de opciones: audio (volúmenes) y gráficos.

import { useState } from "react";
import { MenuShell } from "./MenuShell";
import { audio } from "../../game/audio/AudioManager";
import {
  loadSettings,
  saveSettings,
  type GameSettings,
  type QualityPreset,
} from "../../game/config/settings";

function SliderRow({
  label,
  value,
  maxLabel,
  onChange,
}: {
  label: string;
  value: number;
  maxLabel: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[0.7rem] uppercase tracking-[0.25em] text-foreground">{label}</span>
        <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          {maxLabel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-sm bg-muted accent-[oklch(0.82_0.17_195)]"
      />
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-[0.7rem] uppercase tracking-[0.25em] text-foreground">{label}</div>
        <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onToggle(!checked)}
        className={`relative h-5 w-10 rounded-sm border transition ${
          checked ? "border-hud-stamina bg-hud-stamina/30" : "border-border bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-[2px] transition-all ${
            checked ? "left-[22px] bg-hud-stamina shadow-neon" : "left-0.5 bg-muted-foreground"
          }`}
        />
      </button>
    </div>
  );
}

export function OptionsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  const update = (patch: Partial<GameSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    audio.ensureInit();
    audio.refresh();
    audio.playSfx("menu");
  };

  const qualities: Array<{ id: QualityPreset; label: string }> = [
    { id: "low", label: "Baja" },
    { id: "medium", label: "Media" },
    { id: "high", label: "Alta" },
  ];

  return (
    <MenuShell title="OPCIONES" subtitle="Audio y gráficos" onBack={onBack}>
      <section className="mb-6 rounded-md border border-border/70 bg-card/60 p-5">
        <h2 className="mb-3 font-display text-xs tracking-[0.3em] text-hud-stamina">AUDIO</h2>
        <SliderRow
          label="Volumen general"
          value={settings.masterVolume}
          maxLabel={`${Math.round(settings.masterVolume * 100)}%`}
          onChange={(v) => update({ masterVolume: v })}
        />
        <SliderRow
          label="Música"
          value={settings.musicVolume}
          maxLabel={`${Math.round(settings.musicVolume * 100)}%`}
          onChange={(v) => update({ musicVolume: v })}
        />
        <SliderRow
          label="Efectos"
          value={settings.sfxVolume}
          maxLabel={`${Math.round(settings.sfxVolume * 100)}%`}
          onChange={(v) => update({ sfxVolume: v })}
        />
      </section>

      <section className="rounded-md border border-border/70 bg-card/60 p-5">
        <h2 className="mb-3 font-display text-xs tracking-[0.3em] text-hud-stamina">GRÁFICOS</h2>
        <div className="mb-4">
          <div className="mb-1 text-[0.7rem] uppercase tracking-[0.25em]">Calidad visual</div>
          <div className="flex gap-2">
            {qualities.map((q) => (
              <button
                type="button"
                key={q.id}
                onClick={() =>
                  update({ quality: q.id, particles: q.id !== "low", shadows: q.id !== "low" })
                }
                className={`flex-1 rounded-sm border px-2 py-1.5 text-[0.65rem] uppercase tracking-widest transition ${
                  settings.quality === q.id
                    ? "border-hud-stamina text-hud-stamina"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/70">
            Se aplica al iniciar el próximo combate (resolución de render, sombras y partículas).
          </p>
        </div>
        <div className="divide-y divide-border/40">
          <ToggleRow
            label="Partículas"
            desc="Polvo, chispas, rastro de esquiva"
            checked={settings.particles}
            onToggle={(v) => update({ particles: v, quality: v ? "medium" : "low" })}
          />
          <ToggleRow
            label="Sombras"
            desc="Sombras suaves de los personajes y el escenario"
            checked={settings.shadows}
            onToggle={(v) => update({ shadows: v })}
          />
        </div>
      </section>
    </MenuShell>
  );
}
