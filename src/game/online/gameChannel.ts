import { supabase } from "@/lib/supabase";
import { updateRoomStatus } from "./rooms";
import type { InputIntent, MatchPhase, HitEvent, ActionState, Facing } from "../core/types";

export interface FighterSnapshot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facing: Facing;
  grounded: boolean;
  crouching: boolean;
  health: number;
  stamina: number;
  dodgeTicks: number;
  hitstun: number;
  blockstun: number;
  blocking: boolean;
  downTicks: number;
  getupTicks: number;
  fallingOut: boolean;
  flash: number;
  action: ActionState | null;
}

export interface MatchSnapshot {
  tick: number;
  /** instante de emisión (ms, epoch) usado por la compensación de latencia */
  timestamp: number;
  phase: MatchPhase;
  announce: string;
  round: number;
  timer: number;
  wins: [number, number];
  fighters: [FighterSnapshot, FighterSnapshot];
  events: HitEvent[];
}

export interface MatchNetworkClient {
  sendGuestIntent: (intent: InputIntent) => void;
  sendHostSnapshot: (snapshot: MatchSnapshot) => void;
  sendMatchAction: (action: "rematch" | "leave" | "pause") => void;
  onGuestIntent: (fn: (intent: InputIntent) => void) => void;
  onHostSnapshot: (fn: (snapshot: MatchSnapshot) => void) => void;
  onMatchAction: (fn: (action: "rematch" | "leave" | "pause") => void) => void;
  /** Se dispara cuando el rival se desconecta (presence perdida). */
  onOpponentDisconnect: (fn: () => void) => void;
  disconnect: () => void;
}

/** Gracia antes de declarar abandono (deja tiempo a reconexiones transitorias). */
const OPPONENT_GONE_GRACE_MS = 3000;

export function connectGameChannel(roomId: string, isHost: boolean): MatchNetworkClient {
  const channelName = `match-${roomId}`;
  const myRole = isHost ? "host" : "guest";

  const supabaseChannel = supabase.channel(channelName, {
    config: {
      broadcast: {
        self: false, // no recibir mis propios broadcasts
      },
    },
  });

  // Local BroadcastChannel para comunicación de latencia mínima entre pestañas/ventanas del navegador
  const localBus =
    typeof window !== "undefined" && "BroadcastChannel" in window
      ? new BroadcastChannel(`bus_${channelName}`)
      : null;

  let guestIntentCallback: ((intent: InputIntent) => void) | null = null;
  let hostSnapshotCallback: ((snapshot: MatchSnapshot) => void) | null = null;
  let matchActionCallback: ((action: "rematch" | "leave" | "pause") => void) | null = null;
  let opponentDisconnectCallback: (() => void) | null = null;

  let sawOpponent = false;
  let abandonmentHandled = false;
  let abandonTimer: ReturnType<typeof setTimeout> | null = null;

  // --- Presencia (detección de desconexiones) ---
  const currentRoles = (): Set<string> => {
    const roles = new Set<string>();
    const presence = supabaseChannel.presenceState<{ role?: string }>();
    for (const entries of Object.values(presence)) {
      for (const entry of entries) {
        if (entry?.role === "host" || entry?.role === "guest") roles.add(entry.role);
      }
    }
    return roles;
  };

  const handleOpponentGone = () => {
    if (abandonmentHandled) return;
    abandonmentHandled = true;
    console.warn("ONLINE: el rival se desconectó; la sala pasa a 'finished' con winner='abandon'.");
    updateRoomStatus(roomId, "finished", "abandon").catch(console.error);
    opponentDisconnectCallback?.();
  };

  const checkPresence = () => {
    const roles = currentRoles();

    // Ambos conectados: salimos de estado de alarma, si lo hubiera.
    if (roles.has("host") && roles.has("guest")) {
      sawOpponent = true;
      if (abandonTimer) {
        clearTimeout(abandonTimer);
        abandonTimer = null;
      }
      return;
    }

    // Antes estábamos los dos y ahora falta alguien: dar margen y marcar abandon.
    if (sawOpponent && !abandonTimer) {
      abandonTimer = setTimeout(() => {
        abandonTimer = null;
        if (!(currentRoles().has("host") && currentRoles().has("guest"))) {
          handleOpponentGone();
        }
      }, OPPONENT_GONE_GRACE_MS);
    }
  };

  // Escuchar eventos en canal Supabase Realtime
  supabaseChannel
    .on("presence", { event: "sync" }, checkPresence)
    .on("presence", { event: "join" }, checkPresence)
    .on("presence", { event: "leave" }, checkPresence)
    .on("broadcast", { event: "guest_intent" }, ({ payload }) => {
      guestIntentCallback?.(payload.intent as InputIntent);
    })
    .on("broadcast", { event: "host_snapshot" }, ({ payload }) => {
      hostSnapshotCallback?.(payload.snapshot as MatchSnapshot);
    })
    .on("broadcast", { event: "match_action" }, ({ payload }) => {
      matchActionCallback?.(payload.action);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("ONLINE: Conectado al canal Supabase Realtime:", channelName);
        // Publicar presencia: indica que este cliente está en la partida.
        supabaseChannel.track({ online: true, role: myRole }).catch(console.error);
      }
    });

  // Escuchar eventos en canal local
  const onLocalMessage = (e: MessageEvent) => {
    if (!e.data || typeof e.data !== "object") return;
    const { event, payload } = e.data;
    if (event === "guest_intent" && payload?.intent) {
      guestIntentCallback?.(payload.intent);
    } else if (event === "host_snapshot" && payload?.snapshot) {
      hostSnapshotCallback?.(payload.snapshot);
    } else if (event === "match_action" && payload?.action) {
      matchActionCallback?.(payload.action);
    }
  };
  localBus?.addEventListener("message", onLocalMessage);

  return {
    sendGuestIntent(intent: InputIntent) {
      // Garantizar timestamp para la compensación de latencia del host.
      const payload = intent.timestamp ? intent : { ...intent, timestamp: Date.now() };
      // 1. Supabase Realtime
      supabaseChannel.send({
        type: "broadcast",
        event: "guest_intent",
        payload: { intent: payload },
      });
      // 2. Bus local
      try {
        localBus?.postMessage({ event: "guest_intent", payload: { intent: payload } });
      } catch {
        // Ignore
      }
    },

    sendHostSnapshot(snapshot: MatchSnapshot) {
      // Garantizar timestamp para la compensación de latencia del guest.
      const snap = snapshot.timestamp ? snapshot : { ...snapshot, timestamp: Date.now() };
      // 1. Supabase Realtime
      supabaseChannel.send({
        type: "broadcast",
        event: "host_snapshot",
        payload: { snapshot: snap },
      });
      // 2. Bus local
      try {
        localBus?.postMessage({ event: "host_snapshot", payload: { snapshot: snap } });
      } catch {
        // Ignore
      }
    },

    sendMatchAction(action: "rematch" | "leave" | "pause") {
      supabaseChannel.send({
        type: "broadcast",
        event: "match_action",
        payload: { action },
      });
      try {
        localBus?.postMessage({ event: "match_action", payload: { action } });
      } catch {
        // Ignore
      }
    },

    onGuestIntent(fn) {
      guestIntentCallback = fn;
    },

    onHostSnapshot(fn) {
      hostSnapshotCallback = fn;
    },

    onMatchAction(fn) {
      matchActionCallback = fn;
    },

    onOpponentDisconnect(fn) {
      opponentDisconnectCallback = fn;
    },

    disconnect() {
      // Untrack de presencia: la otra parte detectará la pérdida.
      if (abandonTimer) clearTimeout(abandonTimer);
      supabaseChannel.untrack().catch?.(() => {});
      supabase.removeChannel(supabaseChannel);
      localBus?.removeEventListener("message", onLocalMessage);
      localBus?.close();
    },
  };
}
