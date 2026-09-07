import { supabase } from "@/lib/supabase";
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
  disconnect: () => void;
}

export function connectGameChannel(roomId: string): MatchNetworkClient {
  const channelName = `match-${roomId}`;
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

  // Escuchar eventos en canal Supabase Realtime
  supabaseChannel
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
      // 1. Supabase Realtime
      supabaseChannel.send({
        type: "broadcast",
        event: "guest_intent",
        payload: { intent },
      });
      // 2. Bus local
      try {
        localBus?.postMessage({ event: "guest_intent", payload: { intent } });
      } catch {
        // Ignore
      }
    },

    sendHostSnapshot(snapshot: MatchSnapshot) {
      // 1. Supabase Realtime
      supabaseChannel.send({
        type: "broadcast",
        event: "host_snapshot",
        payload: { snapshot },
      });
      // 2. Bus local
      try {
        localBus?.postMessage({ event: "host_snapshot", payload: { snapshot } });
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

    disconnect() {
      supabase.removeChannel(supabaseChannel);
      localBus?.removeEventListener("message", onLocalMessage);
      localBus?.close();
    },
  };
}
