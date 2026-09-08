import { useState, useEffect, useCallback, useTransition } from "react";
import {
  createRoom,
  joinRoom,
  findQuickMatch,
  setPlayerReady,
  leaveRoom,
  subscribeToRoom,
  type RoomData,
} from "../../game/online/rooms";
import {
  getLocalPlayerId,
  getLocalPlayerName,
  setLocalPlayerName,
  testSupabaseConnection,
  reconfigureSupabase,
} from "@/lib/supabase";
import { CHARACTERS } from "../../game/data/characters";
import { STAGE_LIST } from "../../game/data/stages";
import { FighterPreview } from "../../game/render/FighterPreview";
import { audio } from "../../game/audio/AudioManager";
import {
  Users,
  Copy,
  Check,
  ArrowLeft,
  Wifi,
  Sparkles,
  Zap,
  Settings,
  Database,
  Swords,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

const ROSTER = Object.values(CHARACTERS);

export interface OnlineMatchSetup {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  playerCharacter: string;
  opponentCharacter: string;
  stageId: string;
}

export function OnlineLobby({
  onBack,
  onStartMatch,
}: {
  onBack: () => void;
  onStartMatch: (setup: OnlineMatchSetup) => void;
}) {
  const [tab, setTab] = useState<"create" | "join" | "quick">("create");
  const [selectedChar, setSelectedChar] = useState("ash");
  const [selectedStage, setSelectedStage] = useState("neon");
  const [inputCode, setInputCode] = useState("");
  const [playerName, setPlayerName] = useState(getLocalPlayerName());
  const [, startTransition] = useTransition();

  // Estado de la sala activa
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado de conexión Supabase
  const [supabaseStatus, setSupabaseStatus] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
  }>({ tested: false, ok: false, message: "" });
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [customKey, setCustomKey] = useState("");

  // Comprobar estado de Supabase al cargar
  useEffect(() => {
    testSupabaseConnection().then((res) => {
      setSupabaseStatus({ tested: true, ok: res.ok, message: res.message });
    });
  }, []);

  // Suscribirse a cambios de la sala si estamos en una
  useEffect(() => {
    if (!currentRoom) return;

    const unsubscribe = subscribeToRoom(currentRoom.id, currentRoom.code, (updatedRoom) => {
      // El otro jugador abandonó/cerró la sala en la sala de espera: salimos.
      if (updatedRoom.status === "finished") {
        const notMe = updatedRoom.host_id !== getLocalPlayerId();
        setCurrentRoom(null);
        setCountdown(null);
        audio.playSfx("menu");
        toast.warning(notMe ? "La sala se cerró: el otro jugador abandonó." : "Sala cerrada.");
        return;
      }
      setCurrentRoom(updatedRoom);
    });

    return () => {
      unsubscribe();
    };
  }, [currentRoom?.id, currentRoom?.code]);

  // Manejar cuenta regresiva cuando ambos jugadores están listos
  useEffect(() => {
    if (!currentRoom) {
      setCountdown(null);
      return;
    }

    const bothReady =
      currentRoom.host_ready && currentRoom.guest_ready && Boolean(currentRoom.guest_id);

    if (bothReady && countdown === null) {
      audio.playSfx("menuConfirm");
      setCountdown(3);
    } else if (!bothReady && countdown !== null) {
      setCountdown(null);
    }
  }, [currentRoom, countdown]);

  // Temporizador de cuenta atrás 3.. 2.. 1.. Pelea
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        audio.playSfx("menu");
        setCountdown((c) => (c !== null ? c - 1 : null));
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    }

    if (countdown === 0 && currentRoom) {
      audio.playSfx("menuConfirm");
      const hostChar = currentRoom.host_character || "ash";
      const guestChar = currentRoom.guest_character || "vulcan";

      onStartMatch({
        roomId: currentRoom.id,
        roomCode: currentRoom.code,
        isHost,
        playerCharacter: isHost ? hostChar : guestChar,
        opponentCharacter: isHost ? guestChar : hostChar,
        stageId: currentRoom.stage_id || "neon",
      });
    }

    return undefined;
  }, [countdown, currentRoom, isHost, onStartMatch]);

  const handleCreateRoom = async () => {
    setLoading(true);
    audio.playSfx("menuConfirm");
    try {
      const room = await createRoom(selectedChar, selectedStage);
      setCurrentRoom(room);
      setIsHost(true);
      toast.success(`¡Sala ${room.code} creada! Comparte el código con tu rival.`);
    } catch (err) {
      toast.error("Error al crear la sala: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = inputCode.trim().toUpperCase();
    if (!code) {
      toast.error("Por favor ingresa un código de sala.");
      return;
    }
    setLoading(true);
    audio.playSfx("menuConfirm");
    try {
      const room = await joinRoom(code, selectedChar);
      setCurrentRoom(room);
      setIsHost(false);
      toast.success(`¡Te uniste a la sala ${room.code}!`);
    } catch (err) {
      toast.error("Error al unirse: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMatch = async () => {
    setLoading(true);
    audio.playSfx("menuConfirm");
    try {
      const room = await findQuickMatch(selectedChar);
      const joinedAsHost = room.host_id === getLocalPlayerId();
      setCurrentRoom(room);
      setIsHost(joinedAsHost);
      toast.success(
        joinedAsHost
          ? `No había rival en línea. Tu sala ${room.code} quedó en espera.`
          : `¡Partida rápida encontrada! Entrando a la sala ${room.code}.`,
      );
    } catch (err) {
      toast.error("Error buscando partida rápida: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentRoom) return;
    audio.playSfx("menuConfirm");
    const myCurrentReady = isHost ? currentRoom.host_ready : currentRoom.guest_ready;
    const nextReady = !myCurrentReady;
    try {
      const updated = await setPlayerReady(currentRoom.id, isHost, nextReady, currentRoom);
      setCurrentRoom(updated);
    } catch (err) {
      toast.error("Error al cambiar estado: " + String(err));
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;
    audio.playSfx("menu");
    await leaveRoom(currentRoom.id, isHost);
    setCurrentRoom(null);
    setCountdown(null);
    toast.info("Has salido de la sala.");
  };

  const copyRoomCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    audio.playSfx("menu");
    toast.success("Código copiado al portapapeles: " + currentRoom.code);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNameChange = (val: string) => {
    startTransition(() => {
      setPlayerName(val);
    });
    setLocalPlayerName(val);
  };

  const handleSaveConfig = () => {
    if (!customUrl.trim() || !customKey.trim()) {
      toast.error("Introduce URL y Llave válidas.");
      return;
    }
    reconfigureSupabase(customUrl.trim(), customKey.trim());
    setShowConfig(false);
    toast.info("Reconectando a Supabase...");
    testSupabaseConnection().then((res) => {
      setSupabaseStatus({ tested: true, ok: res.ok, message: res.message });
      if (res.ok) toast.success("¡Conexión establecida con éxito!");
      else toast.warning(res.message);
    });
  };

  // VISTA: DENTRO DE LA SALA DE ESPERA
  if (currentRoom) {
    const isLocalReady = isHost ? currentRoom.host_ready : currentRoom.guest_ready;
    const isOpponentReady = isHost ? currentRoom.guest_ready : currentRoom.host_ready;
    const hasOpponent = Boolean(currentRoom.guest_id);
    const myChar = isHost
      ? currentRoom.host_character
      : currentRoom.guest_character || selectedChar;
    const opponentChar = isHost ? currentRoom.guest_character : currentRoom.host_character;

    return (
      <main className="min-h-screen bg-background px-6 py-8 text-foreground flex flex-col items-center justify-center relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-hud-stamina/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-hud-timer/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal de cuenta regresiva */}
        {countdown !== null && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="text-xs uppercase tracking-[0.5em] text-hud-timer mb-4">
              AMBOS JUGADORES LISTOS
            </div>
            <div className="font-display text-8xl md:text-9xl font-black text-hud-stamina drop-shadow-[0_0_35px_currentColor] animate-bounce">
              {countdown > 0 ? countdown : "¡A PELEAR!"}
            </div>
            <div className="mt-6 text-sm tracking-[0.3em] text-muted-foreground uppercase">
              Sincronizando escenario {currentRoom.stage_id.toUpperCase()}...
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl space-y-6">
          {/* Barra superior de la sala */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex items-center gap-2 rounded border border-border/80 bg-card/60 px-3 py-1.5 text-xs font-bold tracking-widest text-muted-foreground transition hover:border-hud-health/80 hover:text-hud-health"
            >
              <ArrowLeft className="h-4 w-4" /> ABANDONAR SALA
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                CÓDIGO DE SALA:
              </span>
              <div className="flex items-center gap-2 rounded-md border border-hud-stamina/60 bg-card px-3 py-1.5 font-display text-xl font-bold tracking-widest text-hud-stamina shadow-neon">
                <span>{currentRoom.code}</span>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  title="Copiar código"
                  className="rounded p-1 hover:bg-hud-stamina/20 transition text-foreground"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-hud-stamina" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tarjetas de Jugadores (Host vs Guest) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jugador 1 (Host) */}
            <div
              className={`relative overflow-hidden rounded-lg border p-6 transition backdrop-blur-md ${
                currentRoom.host_ready
                  ? "border-hud-stamina bg-hud-stamina/5 shadow-neon"
                  : "border-border/80 bg-card/60"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="rounded bg-hud-stamina/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-hud-stamina uppercase">
                  P1 · ANFITRIÓN {isHost && "(TÚ)"}
                </span>
                <span
                  className={`text-xs font-bold tracking-widest uppercase ${
                    currentRoom.host_ready ? "text-hud-stamina" : "text-muted-foreground"
                  }`}
                >
                  {currentRoom.host_ready ? "✓ LISTO" : "PREPARANDO..."}
                </span>
              </div>

              <div className="mb-4 h-48">
                <FighterPreview characterId={currentRoom.host_character} className="h-full" />
              </div>

              <div className="text-center">
                <div className="font-display text-2xl font-bold text-foreground">
                  {CHARACTERS[currentRoom.host_character]?.name ?? "Luchador"}
                </div>
                <div className="text-xs tracking-widest text-muted-foreground uppercase">
                  {CHARACTERS[currentRoom.host_character]?.archetype}
                </div>
              </div>
            </div>

            {/* Jugador 2 (Guest) */}
            <div
              className={`relative overflow-hidden rounded-lg border p-6 transition backdrop-blur-md ${
                !hasOpponent
                  ? "border-dashed border-border/80 bg-card/20 flex flex-col items-center justify-center min-h-[320px]"
                  : currentRoom.guest_ready
                    ? "border-hud-timer bg-hud-timer/5 shadow-neon"
                    : "border-border/80 bg-card/60"
              }`}
            >
              {!hasOpponent ? (
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-hud-timer/40 bg-hud-timer/10 text-hud-timer animate-pulse">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="font-display text-lg tracking-widest text-muted-foreground">
                    ESPERANDO RIVAL...
                  </div>
                  <p className="max-w-xs text-xs tracking-wider text-muted-foreground/70">
                    Pásale el código{" "}
                    <span className="text-hud-stamina font-bold">{currentRoom.code}</span> a tu
                    amigo para que se una a esta sala.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="rounded bg-hud-timer/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-hud-timer uppercase">
                      P2 · INVITADO {!isHost && "(TÚ)"}
                    </span>
                    <span
                      className={`text-xs font-bold tracking-widest uppercase ${
                        currentRoom.guest_ready ? "text-hud-timer" : "text-muted-foreground"
                      }`}
                    >
                      {currentRoom.guest_ready ? "✓ LISTO" : "PREPARANDO..."}
                    </span>
                  </div>

                  <div className="mb-4 h-48">
                    <FighterPreview
                      characterId={currentRoom.guest_character || "vulcan"}
                      className="h-full"
                    />
                  </div>

                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-foreground">
                      {CHARACTERS[currentRoom.guest_character || "vulcan"]?.name ?? "Luchador"}
                    </div>
                    <div className="text-xs tracking-widest text-muted-foreground uppercase">
                      {CHARACTERS[currentRoom.guest_character || "vulcan"]?.archetype}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Panel inferior de acción */}
          <div className="rounded-lg border border-border/70 bg-card/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-hud-stamina animate-pulse" />
              <div>
                <div className="text-xs font-bold tracking-widest uppercase text-foreground">
                  Escenario:{" "}
                  {STAGE_LIST.find((s) => s.id === currentRoom.stage_id)?.name ?? "Distrito Neón"}
                </div>
                <div className="text-[11px] text-muted-foreground tracking-wider">
                  {hasOpponent
                    ? isOpponentReady
                      ? "¡El rival está listo para pelear!"
                      : "Esperando que el rival presione LISTO..."
                    : "Esperando a que se conecte el segundo jugador..."}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleReady}
              disabled={!hasOpponent}
              className={`w-full sm:w-auto min-w-[200px] rounded-md px-6 py-3 font-display text-sm tracking-[0.25em] transition uppercase ${
                !hasOpponent
                  ? "border border-border/40 bg-muted/30 text-muted-foreground cursor-not-allowed"
                  : isLocalReady
                    ? "border border-hud-timer bg-hud-timer/20 text-hud-timer shadow-neon hover:bg-hud-timer/30"
                    : "border border-hud-stamina bg-hud-stamina text-background font-bold shadow-neon hover:bg-hud-stamina/90"
              }`}
            >
              {isLocalReady ? "CANCELAR LISTO" : "ESTOY LISTO"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // VISTA: LOBBY PRINCIPAL (CREAR O UNIRSE)
  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground flex flex-col justify-between">
      {/* Barra superior */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <button
          type="button"
          onClick={() => {
            audio.playSfx("menu");
            onBack();
          }}
          className="inline-flex items-center gap-2 rounded border border-border/80 bg-card/60 px-3 py-1.5 text-xs font-bold tracking-widest text-muted-foreground transition hover:border-hud-stamina/80 hover:text-hud-stamina"
        >
          <ArrowLeft className="h-4 w-4" /> VOLVER AL MENÚ
        </button>

        <div className="flex items-center gap-3">
          {/* Indicador de estado de Supabase / P2P */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-widest uppercase ${
              supabaseStatus.ok
                ? "border-hud-stamina/50 bg-hud-stamina/10 text-hud-stamina"
                : "border-hud-timer/50 bg-hud-timer/10 text-hud-timer"
            }`}
          >
            <Wifi className="h-3 w-3" />
            <span>{supabaseStatus.ok ? "Supabase Online" : "Red Local / P2P"}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            title="Configuración de Red"
            className="rounded border border-border/80 bg-card p-1.5 text-muted-foreground hover:text-foreground transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Diálogo emergente de configuración de Supabase */}
      {showConfig && (
        <div className="my-4 rounded-lg border border-border bg-card/90 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold tracking-widest text-hud-stamina">
              <Database className="h-4 w-4" /> CONFIGURACIÓN DE SUPABASE
            </h3>
            <button
              onClick={() => setShowConfig(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Si deseas usar tu propia base de datos Supabase, introduce tus credenciales aquí. Se
            aplicarán durante esta sesión (la configuración por defecto se lee de las variables de
            entorno del proyecto).
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] tracking-widest text-muted-foreground block mb-1">
                PROJECT URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:border-hud-stamina outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] tracking-widest text-muted-foreground block mb-1">
                ANON PUBLIC KEY
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:border-hud-stamina outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="rounded bg-hud-stamina px-4 py-1.5 text-xs font-bold tracking-widest text-background hover:bg-hud-stamina/90 transition"
              >
                GUARDAR Y CONECTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal del Lobby */}
      <div className="mx-auto my-auto w-full max-w-4xl py-6">
        <div className="text-center mb-8">
          <div className="text-[0.7rem] uppercase tracking-[0.5em] text-hud-timer">
            MODO MULTIJUGADOR 1V1
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-[0.25em] text-hud-stamina font-black drop-shadow-[0_0_20px_currentColor]">
            SALA DE COMBATE
          </h1>
          <p className="mt-2 text-xs tracking-[0.2em] text-muted-foreground">
            Enfréntate a otro jugador en tiempo real con sincronización autoritativa
          </p>
        </div>

        {/* Pestañas: CREAR SALA / BUSCAR PARTIDA RÁPIDA / UNIRSE */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <div className="flex rounded-md border border-border/80 bg-card/60 p-1">
            <button
              type="button"
              onClick={() => {
                audio.playSfx("menu");
                setTab("create");
              }}
              className={`rounded px-6 py-2 font-display text-xs tracking-[0.25em] transition uppercase ${
                tab === "create"
                  ? "bg-hud-stamina text-background font-bold shadow-neon"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              CREAR SALA
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playSfx("menu");
                setTab("quick");
              }}
              className={`flex items-center gap-2 rounded px-6 py-2 font-display text-xs tracking-[0.25em] transition uppercase ${
                tab === "quick"
                  ? "bg-hud-health text-background font-bold shadow-neon"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              BUSCAR PARTIDA RÁPIDA
            </button>
            <button
              type="button"
              onClick={() => {
                audio.playSfx("menu");
                setTab("join");
              }}
              className={`rounded px-6 py-2 font-display text-xs tracking-[0.25em] transition uppercase ${
                tab === "join"
                  ? "bg-hud-timer text-background font-bold shadow-neon"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              UNIRSE CON CÓDIGO
            </button>
          </div>
        </div>

        {/* Grid de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Selector de Luchador */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest uppercase text-foreground">
                ELIGE TU LUCHADOR
              </span>
              <span className="text-xs font-bold tracking-widest text-hud-stamina uppercase">
                {CHARACTERS[selectedChar]?.archetype}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ROSTER.map((char) => {
                const isSelected = selectedChar === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => {
                      audio.playSfx("menu");
                      setSelectedChar(char.id);
                    }}
                    className={`group relative overflow-hidden rounded-md border p-3 text-left transition ${
                      isSelected
                        ? "border-hud-stamina bg-card shadow-neon"
                        : "border-border/60 bg-card/50 hover:border-hud-stamina/60 hover:bg-card"
                    }`}
                    style={{
                      borderLeftColor: char.colors.accent,
                      borderLeftWidth: 4,
                    }}
                  >
                    <div className="font-display text-base font-bold tracking-wider text-foreground">
                      {char.name}
                    </div>
                    <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                      {char.archetype}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Si está en pestaña crear sala: Selector de Mapa */}
            {tab === "create" && (
              <div className="pt-3">
                <span className="text-xs font-bold tracking-widest uppercase text-foreground block mb-2">
                  ESCENARIO DE LA SALA
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {STAGE_LIST.map((stg) => (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => {
                        audio.playSfx("menu");
                        setSelectedStage(stg.id);
                      }}
                      className={`rounded border p-2 text-center text-xs tracking-wider transition ${
                        selectedStage === stg.id
                          ? "border-hud-stamina bg-hud-stamina/10 text-hud-stamina font-bold"
                          : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {stg.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Vista 3D y Acción */}
          <div className="lg:col-span-5 flex flex-col gap-4 rounded-lg border border-border/80 bg-card/60 p-5 backdrop-blur-md">
            <div className="h-44 w-full overflow-hidden rounded border border-border/50 bg-background/50">
              <FighterPreview characterId={selectedChar} className="h-full" />
            </div>

            {tab === "create" ? (
              <div className="space-y-4 pt-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Se generará un código único para tu sala. Tu rival podrá ingresar usando dicho
                  código desde cualquier ventana o dispositivo.
                </p>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-hud-stamina px-6 py-3.5 font-display text-sm font-bold tracking-[0.25em] text-background shadow-neon transition hover:bg-hud-stamina/90 uppercase disabled:opacity-50"
                >
                  <Swords className="h-4 w-4" />
                  {loading ? "CREANDO..." : "CREAR SALA ONLINE"}
                </button>
              </div>
            ) : tab === "quick" ? (
              <div className="space-y-4 pt-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  El matchmaking buscará automáticamente una sala en espera sin rival. Si la
                  encuentra te unes al instante; si no, se creará una nueva sala para ti.
                </p>
                <button
                  type="button"
                  onClick={handleQuickMatch}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-hud-health px-6 py-3.5 font-display text-sm font-bold tracking-[0.25em] text-background shadow-neon transition hover:bg-hud-health/90 uppercase disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {loading ? "BUSCANDO..." : "BUSCAR PARTIDA RÁPIDA"}
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] tracking-widest text-muted-foreground uppercase block mb-1.5">
                    INGRESA EL CÓDIGO DE SALA
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="NF-1234"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="w-full rounded-md border border-border bg-background/80 px-4 py-2.5 font-display text-lg font-bold tracking-widest text-hud-timer uppercase text-center focus:border-hud-timer outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={loading || !inputCode.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-hud-timer px-6 py-3.5 font-display text-sm font-bold tracking-[0.25em] text-background shadow-neon transition hover:bg-hud-timer/90 uppercase disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  {loading ? "CONECTANDO..." : "UNIRSE A LA SALA"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pie con notas */}
      <footer className="text-center text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/60 border-t border-border/40 pt-4">
        Sincronización a 60 Hz · Sin Desincronización · Movimiento WASD · Ataques J / I / K / L
      </footer>
    </main>
  );
}
