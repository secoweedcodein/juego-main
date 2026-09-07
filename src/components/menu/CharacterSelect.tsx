// Pantalla de selección de personaje y dificultad (FASE 4 / FASE 12 visual).
// Cada tarjeta refuerza la identidad del luchador y el panel lateral muestra
// el modelo 3D real girando (misma geometría que en combate).

import { useState } from "react";
import { CHARACTERS, type CharacterDef } from "../../game/data/characters";
import type { AiLevel } from "../../game/systems/ai";
import { STAGE_LIST } from "../../game/data/stages";
import { FighterPreview } from "../../game/render/FighterPreview";
import { Zap, Wind, Hammer, Crosshair, type LucideIcon } from "lucide-react";

const ROSTER = Object.values(CHARACTERS);

const ICONS: Record<string, LucideIcon> = {
  vulcan: Zap,
  kestrel: Wind,
  bolt: Hammer,
  ash: Crosshair,
};

function StatBar({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] tracking-widest text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-5 rounded-sm ${i < value ? "bg-hud-stamina" : "bg-muted"}`}
            style={i < value && tint ? { background: tint } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function Portrait({
  char,
  selected,
  tag,
  onClick,
}: {
  char: CharacterDef;
  selected: boolean;
  tag?: string | undefined;
  onClick: () => void;
}) {
  const Icon = ICONS[char.id] ?? Zap;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-md border text-left transition ${
        selected
          ? "border-hud-stamina bg-card shadow-neon"
          : "border-border/60 bg-card/50 hover:border-hud-stamina/60 hover:bg-card/70"
      }`}
      style={{
        borderLeftColor: char.colors.accent,
        borderLeftWidth: 3,
        borderTopColor: selected ? char.colors.accent : undefined,
      }}
    >
      {tag && (
        <span
          className="absolute right-2 top-2 text-[10px] font-bold tracking-widest"
          style={{ color: char.colors.accent }}
        >
          {tag}
        </span>
      )}
      {/* Banner de personaje: icono de arquetipo + silueta abstracta */}
      <div
        className="relative mb-3 flex h-16 w-full items-center justify-center overflow-hidden rounded-sm"
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, ${char.colors.suit}, #05070d 85%)`,
        }}
      >
        <span
          className="absolute -bottom-3 left-1/2 h-10 w-28 -translate-x-1/2 rounded-full opacity-25 blur-md"
          style={{ background: char.colors.accent }}
        />
        <Icon
          className="h-7 w-7 transition-transform group-hover:scale-110"
          style={{ color: char.colors.accent }}
        />
        <span
          className="absolute bottom-1 left-2 text-[0.6rem] uppercase tracking-[0.2em]"
          style={{ color: char.colors.accent }}
        >
          {char.archetype === "Boxer"
            ? "PRESIÓN"
            : char.archetype === "Kickboxer"
              ? "ALCANCE"
              : char.archetype === "Grappler"
                ? "PODER"
                : "TÉCNICA"}
        </span>
      </div>
      <div className="font-display text-lg tracking-widest">{char.name}</div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {char.archetype}
      </div>
    </button>
  );
}

export interface MatchSetup {
  player: string;
  opponent: string;
  stage: string;
  ai: AiLevel;
}

export function CharacterSelect({ onStart }: { onStart: (setup: MatchSetup) => void }) {
  const [player, setPlayer] = useState("ash");
  const [opponent, setOpponent] = useState("vulcan");
  const [ai, setAi] = useState<AiLevel>("normal");
  const [stage, setStage] = useState("neon");
  const pickedStage = STAGE_LIST.find((s) => s.id === stage) ?? STAGE_LIST[0]!;
  const pick = CHARACTERS[player]!;
  const rival = CHARACTERS[opponent]!;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <header className="mx-auto mb-8 max-w-5xl text-center">
        <h1 className="font-display text-4xl tracking-[0.35em] text-hud-stamina drop-shadow-[0_0_18px_hsl(var(--neon-cyan)/0.6)]">
          NEON CIRCUIT
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Elige tu luchador y tu rival
        </p>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div>
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Jugador 1
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ROSTER.map((c) => (
                <Portrait
                  key={c.id}
                  char={c}
                  selected={c.id === player}
                  tag={c.id === player ? "P1" : undefined}
                  onClick={() => setPlayer(c.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Rival (CPU)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ROSTER.map((c) => (
                <Portrait
                  key={c.id}
                  char={c}
                  selected={c.id === opponent}
                  tag={c.id === opponent ? "CPU" : undefined}
                  onClick={() => setOpponent(c.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5 rounded-md border border-border/60 bg-card/60 p-5">
          <FighterPreview characterId={player} className="h-56" />

          <div className="flex items-center justify-between">
            <div>
              <div
                className="font-display text-2xl tracking-widest"
                style={{ color: pick.colors.accent }}
              >
                {pick.name}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {pick.archetype}
              </div>
            </div>
            <div className="text-right text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              vs
              <div
                className="font-display text-sm tracking-widest"
                style={{ color: rival.colors.accent }}
              >
                {rival.name}
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{pick.description}</p>

          <div className="space-y-1.5">
            <StatBar label="FUERZA" value={pick.stats.power} tint={pick.colors.trim} />
            <StatBar label="VELOC." value={pick.stats.speed} tint={pick.colors.accent} />
            <StatBar label="ALCANCE" value={pick.stats.range} tint={pick.colors.accent} />
            <StatBar label="DEFENSA" value={pick.stats.defense} tint={pick.colors.trim} />
            <StatBar label="TÉCNICA" value={pick.stats.tech} tint={pick.colors.accent} />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Escenario
            </div>
            <div className="space-y-2">
              {STAGE_LIST.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={`w-full rounded-sm border px-3 py-2 text-left transition ${
                    stage === s.id
                      ? "border-hud-stamina bg-card"
                      : "border-border/60 bg-card/40 hover:border-hud-stamina/60"
                  }`}
                  style={{ borderLeftColor: s.palette.primary, borderLeftWidth: 3 }}
                >
                  <div className="font-display text-xs tracking-[0.25em]">{s.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s.subtitle}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {pickedStage.description}
            </p>
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Dificultad
            </div>
            <div className="flex gap-2">
              {(["idle", "easy", "normal"] as AiLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setAi(lvl)}
                  className={`flex-1 rounded-sm border px-2 py-1.5 text-[11px] uppercase tracking-widest transition ${
                    ai === lvl
                      ? "border-hud-stamina text-hud-stamina"
                      : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lvl === "idle" ? "Muñeco" : lvl === "easy" ? "Fácil" : "Normal"}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStart({ player, opponent, stage, ai })}
            className="w-full rounded-sm border border-hud-stamina bg-hud-stamina/10 py-3 font-display tracking-[0.3em] text-hud-stamina shadow-neon transition hover:bg-hud-stamina/20"
          >
            PELEAR
          </button>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            A/D mover · W/S profundidad · Space salto · Shift esquiva · Ctrl agacharse · Shift Der /
            Atrás bloquea · J golpe · K fuerte · L patada · U agarre · F recoger/lanzar · Esc menú
          </p>
        </aside>
      </div>
    </main>
  );
}
