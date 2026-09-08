// Bucle principal: tick fijo 60 Hz, input -> simulación -> render.
// Integra: soporte offline (vs CPU) y multijugador online (Supabase Realtime autoritativo),
// pausa (ESC), audio conectado a eventos reales, VFX y el registro de progresión.

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createMatchState, stepMatch } from "../core/sim";
import {
  EMPTY_INTENT,
  TICK_DT,
  TICK_RATE,
  type InputIntent,
  type MatchState,
  type FighterState,
} from "../core/types";
import { KeyboardInput } from "../systems/input";
import { DummyAI, type AiLevel } from "../systems/ai";
import { Fighter } from "./Fighter";
import { VfxSystem } from "./VfxSystem";
import { SideCamera } from "./SideCamera";
import { StageView } from "./stages";
import { PropsView } from "./Props";
import { HazardFx } from "./HazardFx";
import { CoreHud } from "../../components/hud/CoreHud";
import { audio } from "../audio/AudioManager";
import { loadSettings } from "../config/settings";
import { loadKeymap } from "../config/keymap";
import { recordMatch, type MatchSummary } from "../progression/storage";
import { getCharacter } from "../data/characters";
import { getStage } from "../data/stages";
import {
  connectGameChannel,
  type MatchNetworkClient,
  type MatchSnapshot,
  type FighterSnapshot,
} from "../online/gameChannel";
import { updateRoomStatus } from "../online/rooms";
import { ShieldCheck, Wifi } from "lucide-react";

export interface OnlineMatchConfig {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  onExitOnline: () => void;
  onRematchOnline?: () => void;
}

/** Delay de entrada online: 2 frames a 60Hz (~33ms) para suavizar la sincronización. */
const INPUT_DELAY_FRAMES = 2;
const INPUT_DELAY_MS = Math.round((INPUT_DELAY_FRAMES / TICK_RATE) * 1000);

export interface BufferedInput {
  intent: InputIntent;
  readyAt: number;
}

function packFighter(f: FighterState): FighterSnapshot {
  return {
    x: f.x,
    y: f.y,
    z: f.z,
    vx: f.vx,
    vy: f.vy,
    vz: f.vz,
    facing: f.facing,
    grounded: f.grounded,
    crouching: f.crouching,
    health: f.health,
    stamina: f.stamina,
    dodgeTicks: f.dodgeTicks,
    hitstun: f.hitstun,
    blockstun: f.blockstun,
    blocking: f.blocking,
    downTicks: f.downTicks,
    getupTicks: f.getupTicks,
    fallingOut: f.fallingOut,
    flash: f.flash,
    action: f.action ? { ...f.action } : null,
  };
}

function applyFighterSnapshot(target: FighterState, snap: FighterSnapshot) {
  target.x = snap.x;
  target.y = snap.y;
  target.z = snap.z;
  target.vx = snap.vx;
  target.vy = snap.vy;
  target.vz = snap.vz;
  target.facing = snap.facing;
  target.grounded = snap.grounded;
  target.crouching = snap.crouching;
  target.health = snap.health;
  target.stamina = snap.stamina;
  target.dodgeTicks = snap.dodgeTicks;
  target.hitstun = snap.hitstun;
  target.blockstun = snap.blockstun;
  target.blocking = snap.blocking;
  target.downTicks = snap.downTicks;
  target.getupTicks = snap.getupTicks;
  target.fallingOut = snap.fallingOut;
  target.flash = snap.flash;
  target.action = snap.action ? { ...snap.action } : null;
}

/** Bucle de simulación independiente del render (rAF + tick fijo). */
function useSimulationLoop(
  match: React.RefObject<MatchState>,
  input: React.RefObject<KeyboardInput>,
  ai: React.RefObject<DummyAI>,
  paused: React.RefObject<boolean>,
  onlineConfig?: OnlineMatchConfig,
  netClientRef?: React.RefObject<MatchNetworkClient | null>,
  guestInputBufferRef?: React.RefObject<BufferedInput[]>,
) {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let prevHealth = [] as number[];
    let prevDodge = [] as boolean[];
    let prevJump = [] as boolean[];
    let prevFalling = [] as boolean[];
    let prevPhase = "";
    let snapshotThrottle = 0;
    let lastGuestIntent: InputIntent = EMPTY_INTENT;

    // Buffer de entrada (compensación de latencia): el host sólo consume los
    // intents del guest cuando han madurado (2 frames) para atenuar el jitter.
    const resolveGuestIntent = (): InputIntent => {
      const buf = guestInputBufferRef?.current;
      if (!buf) return lastGuestIntent;
      const now = performance.now();
      while (buf.length > 0 && buf[0]!.readyAt < now - 1000) buf.shift();
      while (buf.length > 0 && buf[0]!.readyAt <= now) {
        lastGuestIntent = buf.shift()!.intent;
      }
      return lastGuestIntent;
    };

    const loop = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += delta;
      const m = match.current;
      const isPaused = paused.current;
      if (!m) return;

      if (isPaused) {
        acc = 0;
        raf = requestAnimationFrame(loop);
        return;
      }

      // SI ES GUEST ONLINE: solo lee su propio input y lo envía al Host
      if (onlineConfig && !onlineConfig.isHost) {
        const p2Intent = input.current?.readIntent() ?? EMPTY_INTENT;
        netClientRef?.current?.sendGuestIntent(p2Intent);
        raf = requestAnimationFrame(loop);
        return;
      }

      let steps = 0;
      while (acc >= TICK_DT && steps < 6) {
        if (prevHealth.length === 0) {
          prevHealth = m.fighters.map((f) => f.health);
          prevDodge = m.fighters.map((f) => f.dodgeTicks > 0);
          prevJump = m.fighters.map((f) => !f.grounded);
          prevFalling = m.fighters.map((f) => f.fallingOut);
          prevPhase = m.phase;
        }

        // Host o Single Player
        const p1Intent = input.current?.readIntent() ?? EMPTY_INTENT;
        const p2Intent = onlineConfig
          ? resolveGuestIntent()
          : (ai.current?.think(m.fighters[1], m.fighters[0]) ?? EMPTY_INTENT);

        stepMatch(m, [p1Intent, p2Intent]);

        // Si es Host Online, enviar snapshot al Guest (cada ~2 ticks / 30Hz o en eventos)
        if (onlineConfig && onlineConfig.isHost && netClientRef?.current) {
          snapshotThrottle++;
          if (snapshotThrottle >= 2 || m.events.length > 0 || m.phase !== prevPhase) {
            snapshotThrottle = 0;
            const snap: MatchSnapshot = {
              tick: m.tick,
              timestamp: Date.now(),
              phase: m.phase,
              announce: m.announce,
              round: m.round,
              timer: m.timer,
              wins: [m.wins[0], m.wins[1]],
              fighters: [packFighter(m.fighters[0]), packFighter(m.fighters[1])],
              events: [...m.events],
            };
            netClientRef.current.sendHostSnapshot(snap);
          }
        }

        // Audio conectado a cambios reales de estado.
        const n = m.fighters;
        for (let i = 0; i < n.length; i++) {
          const f = n[i]!;
          if (f.health <= 0 && prevHealth[i]! > 0) audio.playSfx("ko");
          if (f.dodgeTicks > 0 && !prevDodge[i]!) audio.playSfx("dodge");
          if (!f.grounded && prevJump[i]!) audio.playSfx("jump");
          if (f.grounded && !prevJump[i]! && f.y <= 0.01) audio.playSfx("land");
          if (f.fallingOut && !prevFalling[i]!) audio.playSfx("ringout");
        }
        prevHealth = n.map((f) => f.health);
        prevDodge = n.map((f) => f.dodgeTicks > 0);
        prevJump = n.map((f) => !f.grounded);
        prevFalling = n.map((f) => f.fallingOut);

        // Sonidos de impacto
        for (const e of m.events) {
          if (e.attackerId === "stage") {
            audio.playSfx("hitLight");
            continue;
          }
          if (e.attackId.startsWith("throw-")) {
            audio.playSfx("throw");
            continue;
          }
          if (e.blocked) {
            audio.playSfx("block");
          } else if (e.attackId === "heavy") {
            audio.playSfx("hitHeavy");
          } else if (e.attackId === "kick") {
            audio.playSfx("kick");
          } else if (e.attackId === "grab") {
            audio.playSfx("grab");
          } else {
            audio.playSfx("hitLight");
          }
        }

        // Fanfarria de victoria/derrota
        if (m.phase === "matchEnd" && prevPhase !== "matchEnd") {
          const playerWon = m.wins[0] > m.wins[1];
          audio.playSfx(playerWon ? "victory" : "defeat");
        }
        prevPhase = m.phase;

        acc -= TICK_DT;
        steps++;
      }
      if (steps === 6) acc = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [match, input, ai, paused, onlineConfig, netClientRef, guestInputBufferRef]);
}

export function GameCanvas({
  playerCharacter = "ash",
  opponentCharacter = "vulcan",
  stageId = "neon",
  aiLevel = "normal",
  onExit,
  onRematch,
  onMenu,
  onlineConfig,
}: {
  playerCharacter?: string;
  opponentCharacter?: string;
  stageId?: string;
  aiLevel?: AiLevel;
  onExit?: () => void;
  onRematch?: () => void;
  onMenu: () => void;
  onlineConfig?: OnlineMatchConfig;
}) {
  const match = useRef<MatchState>(createMatchState(playerCharacter, opponentCharacter, stageId));
  const input = useRef<KeyboardInput>(new KeyboardInput(loadKeymap()));
  const ai = useRef<DummyAI>(new DummyAI(aiLevel));
  const p1 = useRef(match.current.fighters[0]);
  const p2 = useRef(match.current.fighters[1]);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const recorded = useRef(false);
  const matchDuration = useRef(0);
  const settings = loadSettings();

  // Gestión de red online
  const netClientRef = useRef<MatchNetworkClient | null>(null);
  const guestInputBufferRef = useRef<BufferedInput[]>([]);
  const [onlineNotice, setOnlineNotice] = useState<string | null>(null);

  audio.ensureInit();

  // Conexión al canal de juego en modo online
  useEffect(() => {
    if (!onlineConfig) return;

    const net = connectGameChannel(onlineConfig.roomId, onlineConfig.isHost);
    netClientRef.current = net;

    // Aviso cuando la presencia detecta que el rival se desconectó.
    net.onOpponentDisconnect(() => {
      setOnlineNotice("Tu rival se desconectó. La partida queda cerrada (abandon).");
    });

    if (onlineConfig.isHost) {
      // Host recibe intents de Guest y los mete en el buffer de latencia
      net.onGuestIntent((intent) => {
        const sentAt = intent.timestamp ?? Date.now();
        const remaining = INPUT_DELAY_MS - (Date.now() - sentAt);
        const delay = Math.max(0, Math.min(remaining, INPUT_DELAY_MS * 2));
        guestInputBufferRef.current.push({ intent, readyAt: performance.now() + delay });
      });
      net.onMatchAction((action) => {
        if (action === "rematch") {
          setOnlineNotice("¡El rival solicitó revancha!");
          onRematch?.();
        } else if (action === "leave") {
          setOnlineNotice("El rival abandonó la partida.");
        }
      });
    } else {
      // Guest recibe snapshots autoritativos de Host
      let prevGuestPhase = "";
      net.onHostSnapshot((snap) => {
        const m = match.current;
        if (!m) return;
        m.phase = snap.phase;
        m.announce = snap.announce;
        m.round = snap.round;
        m.timer = snap.timer;
        m.wins = snap.wins;
        m.events = snap.events;

        applyFighterSnapshot(m.fighters[0], snap.fighters[0]);
        applyFighterSnapshot(m.fighters[1], snap.fighters[1]);

        // Reproducir audios recibidos
        for (const e of snap.events) {
          if (e.blocked) audio.playSfx("block");
          else if (e.attackId === "heavy") audio.playSfx("hitHeavy");
          else if (e.attackId === "kick") audio.playSfx("kick");
          else audio.playSfx("hitLight");
        }

        if (snap.phase === "matchEnd" && prevGuestPhase !== "matchEnd") {
          const guestWon = snap.wins[1] > snap.wins[0];
          audio.playSfx(guestWon ? "victory" : "defeat");
        }
        prevGuestPhase = snap.phase;
      });

      net.onMatchAction((action) => {
        if (action === "rematch") {
          setOnlineNotice("¡El anfitrión reinició la partida!");
          onRematch?.();
        } else if (action === "leave") {
          setOnlineNotice("El anfitrión abandonó la partida.");
        }
      });
    }

    return () => {
      net.disconnect();
      netClientRef.current = null;
    };
  }, [onlineConfig, onRematch]);

  useSimulationLoop(match, input, ai, pausedRef, onlineConfig, netClientRef, guestInputBufferRef);

  const togglePause = useCallback(
    (value?: boolean) => {
      // En multijugador online no se pausa el juego global
      if (onlineConfig) return;
      setPaused((p) => {
        const next = value ?? !p;
        pausedRef.current = next;
        audio.setPaused(next);
        return next;
      });
    },
    [onlineConfig],
  );

  // Atrapa la tecla de pausa (configurable)
  useEffect(() => {
    const kb = input.current;
    kb.attach(window);
    const keymap = loadKeymap();
    const pauseCodes = new Set(keymap.pause);
    const onDown = (e: KeyboardEvent) => {
      if (pauseCodes.has(e.code)) {
        e.preventDefault();
        if (!over && !onlineConfig) togglePause();
      }
    };
    window.addEventListener("keydown", onDown);
    const poll = window.setInterval(() => {
      const m = match.current;
      if (m.phase === "matchEnd") {
        matchDuration.current = Math.round((m.tick / TICK_RATE) * 10) / 10;
        if (m.phaseTicks <= 0) setOver(true);
      }
    }, 200);
    return () => {
      kb.dispose();
      window.removeEventListener("keydown", onDown);
      window.clearInterval(poll);
    };
  }, [togglePause, over, onlineConfig]);

  // Música del escenario
  useEffect(() => {
    audio.ensureInit();
    audio.playMusic(stageId);
    audio.startAmbience();
    return () => {
      audio.stopMusic();
      audio.stopAmbience();
    };
  }, [stageId]);

  // Registrar resultado al terminar
  useEffect(() => {
    const poll = window.setInterval(() => {
      const m = match.current;
      if (!m || m.phase !== "matchEnd" || recorded.current) return;
      recorded.current = true;
      const winner = m.wins[0] === m.wins[1] ? -1 : m.wins[0] > m.wins[1] ? 0 : 1;
      const summary: MatchSummary = {
        playerCharacter: m.fighters[0].characterId,
        opponentCharacter: m.fighters[1].characterId,
        stageId: m.stageId,
        result: winner === -1 ? "draw" : winner === 0 ? "win" : "loss",
        aiLevel: onlineConfig ? "pvp" : aiLevel,
        durationSeconds: matchDuration.current,
        roundsWon: m.wins[0],
        roundsLost: m.wins[1],
        damageDealt: m.damageDealt[0],
        damageTaken: m.damageDealt[1],
        ko: winner === 0 && m.announce === "K.O.",
      };
      recordMatch(summary);

      // Si es online, actualizar estado en Supabase
      if (onlineConfig && onlineConfig.isHost) {
        const winnerChar =
          winner === 0 ? playerCharacter : winner === 1 ? opponentCharacter : "draw";
        updateRoomStatus(onlineConfig.roomId, "finished", winnerChar).catch(console.error);
      }
    }, 250);
    return () => window.clearInterval(poll);
  }, [aiLevel, onlineConfig, opponentCharacter, playerCharacter]);

  const handleMenu = useCallback(() => {
    if (onlineConfig) {
      netClientRef.current?.sendMatchAction("leave");
      onlineConfig.onExitOnline();
      return;
    }
    togglePause(false);
    onMenu();
  }, [onMenu, onlineConfig, togglePause]);

  const handleRematch = useCallback(() => {
    if (onlineConfig) {
      netClientRef.current?.sendMatchAction("rematch");
      onRematch?.();
      return;
    }
    togglePause(false);
    onRematch?.();
  }, [onRematch, onlineConfig, togglePause]);

  const handleExit = useCallback(() => {
    if (onlineConfig) {
      netClientRef.current?.sendMatchAction("leave");
      onlineConfig.onExitOnline();
      return;
    }
    onExit?.();
  }, [onExit, onlineConfig]);

  const stageColor = getStage(stageId).palette.primary;
  const isOnlineGuest = onlineConfig && !onlineConfig.isHost;
  const isP1Local = !isOnlineGuest;

  // Determinar si el jugador local ganó
  const localPlayerWon =
    match.current.wins[isP1Local ? 0 : 1] > match.current.wins[isP1Local ? 1 : 0];
  const isDraw = match.current.wins[0] === match.current.wins[1];

  return (
    <div className="fixed inset-0 bg-background">
      {/* Badge indicador de sala online en pantalla */}
      {onlineConfig && (
        <aside
          aria-label="Información de sala online"
          className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-hud-stamina/50 bg-background/80 px-3.5 py-1 text-xs font-bold tracking-widest text-hud-stamina backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hud-stamina opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-hud-stamina" />
          </span>
          <Wifi className="h-3.5 w-3.5" />
          <span>SALA {onlineConfig.roomCode}</span>
          <span className="text-[10px] text-muted-foreground">
            ({onlineConfig.isHost ? "ANFITRIÓN - P1" : "INVITADO - P2"})
          </span>
        </aside>
      )}

      {onlineNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 rounded border border-hud-timer/80 bg-background/90 px-4 py-1.5 text-xs tracking-widest text-hud-timer shadow-neon backdrop-blur-md">
          {onlineNotice}
        </div>
      )}

      <Canvas
        shadows={settings.shadows}
        dpr={[1, settings.quality === "low" ? 1 : settings.quality === "medium" ? 1.25 : 1.75]}
        camera={{ position: [0, 2.4, 12], fov: 52 }}
      >
        <StageView stageId={stageId} />
        <SideCamera match={match} />
        <Fighter state={p1} match={match} />
        <Fighter state={p2} match={match} />
        <PropsView match={match} />
        <HazardFx match={match} />
        <VfxSystem match={match} />
      </Canvas>
      <CoreHud match={match} />

      {/* Pantalla de pausa (solo offline) */}
      {paused && !over && !onlineConfig && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mb-6 font-display text-3xl tracking-[0.4em] text-hud-timer drop-shadow-[0_0_16px_currentColor]">
            PAUSA
          </div>
          <div className="flex w-64 flex-col gap-3">
            <button
              type="button"
              onClick={() => togglePause(false)}
              className="rounded-sm border border-hud-stamina bg-hud-stamina/10 py-2.5 font-display tracking-[0.25em] text-hud-stamina shadow-neon transition hover:bg-hud-stamina/20"
            >
              CONTINUAR
            </button>
            <button
              type="button"
              onClick={handleRematch}
              className="rounded-sm border border-border bg-card/70 py-2.5 font-display tracking-[0.25em] text-foreground transition hover:bg-card"
            >
              REINICIAR
            </button>
            <button
              type="button"
              onClick={handleMenu}
              className="rounded-sm border border-border bg-card/70 py-2.5 font-display tracking-[0.25em] text-foreground transition hover:bg-card"
            >
              SALIR AL MENÚ
            </button>
          </div>
        </div>
      )}

      {/* Resultado final */}
      {over && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="mb-2 text-xs uppercase tracking-[0.4em] text-muted-foreground">
            {onlineConfig ? "RESULTADO DE LA SALA ONLINE" : "COMBATE FINALIZADO"}
          </div>

          <h2
            className={`font-display text-5xl md:text-6xl tracking-[0.3em] font-black mb-6 drop-shadow-[0_0_24px_currentColor] ${
              isDraw ? "text-hud-timer" : localPlayerWon ? "text-hud-stamina" : "text-hud-health"
            }`}
          >
            {isDraw ? "EMPATE" : localPlayerWon ? "VICTORIA" : "DERROTA"}
          </h2>

          <div className="mb-8 flex items-center gap-6 rounded-lg border border-border/80 bg-card/80 px-8 py-4 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                {isP1Local ? "TÚ (P1)" : "RIVAL (P1)"}
              </div>
              <div className="font-display text-xl font-bold text-hud-stamina">
                {getCharacter(playerCharacter).name}
              </div>
              <div className="font-display text-3xl font-black">{match.current.wins[0]}</div>
            </div>
            <div className="font-display text-2xl font-light text-muted-foreground">VS</div>
            <div className="text-center">
              <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                {!isP1Local ? "TÚ (P2)" : "RIVAL (P2)"}
              </div>
              <div className="font-display text-xl font-bold text-hud-health">
                {getCharacter(opponentCharacter).name}
              </div>
              <div className="font-display text-3xl font-black">{match.current.wins[1]}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRematch}
              className="rounded-sm border border-hud-stamina bg-hud-stamina/10 px-6 py-2.5 font-display tracking-[0.25em] text-hud-stamina shadow-neon transition hover:bg-hud-stamina/20"
            >
              REVANCHA
            </button>
            {!onlineConfig && (
              <button
                type="button"
                onClick={handleExit}
                className="rounded-sm border border-border bg-card/70 px-6 py-2.5 font-display tracking-[0.25em] text-foreground transition hover:bg-card"
              >
                SELECCIÓN
              </button>
            )}
            <button
              type="button"
              onClick={onlineConfig ? handleExit : handleMenu}
              className="rounded-sm border border-hud-timer/70 bg-hud-timer/10 px-6 py-2.5 font-display tracking-[0.25em] text-hud-timer transition hover:bg-hud-timer/20"
            >
              {onlineConfig ? "SALIR AL LOBBY" : "MENÚ"}
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 text-[0.65rem] tracking-[0.2em] text-muted-foreground/70">
            <span style={{ color: stageColor }}>{getStage(stageId).name}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-hud-stamina" />
              Partida sincronizada
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
