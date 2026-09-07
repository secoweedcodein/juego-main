import { supabase, getLocalPlayerId } from "@/lib/supabase";

export interface RoomData {
  id: string;
  code: string;
  host_id: string;
  host_character: string;
  guest_id?: string | null;
  guest_character?: string | null;
  host_ready: boolean;
  guest_ready: boolean;
  stage_id: string;
  status: "waiting" | "ready" | "playing" | "finished";
  winner?: string | null;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NF-";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Almacén en memoria / fallback por si Supabase no está conectado o tabla no creada
const localRoomsStore = new Map<string, RoomData>();

function getLocalBus(codeOrId: string) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return null;
  return new BroadcastChannel(`nf_room_${codeOrId.toUpperCase()}`);
}

function broadcastLocalRoom(room: RoomData) {
  localRoomsStore.set(room.id, room);
  localRoomsStore.set(room.code, room);
  try {
    const bus = getLocalBus(room.code);
    bus?.postMessage({ type: "ROOM_UPDATE", room });
    const idBus = getLocalBus(room.id);
    idBus?.postMessage({ type: "ROOM_UPDATE", room });
  } catch {
    // Ignore error
  }
}

/** Crea una nueva sala */
export async function createRoom(character: string, stageId = "neon"): Promise<RoomData> {
  const playerId = getLocalPlayerId();
  const code = generateRoomCode();

  const newRoom: RoomData = {
    id: `local-${code}`,
    code,
    host_id: playerId,
    host_character: character,
    guest_id: null,
    guest_character: null,
    host_ready: false,
    guest_ready: false,
    stage_id: stageId,
    status: "waiting",
    winner: null,
  };

  try {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        host_id: playerId,
        host_character: character,
        stage_id: stageId,
        status: "waiting",
        host_ready: false,
        guest_ready: false,
      })
      .select()
      .single();

    if (!error && data) {
      const room = data as RoomData;
      broadcastLocalRoom(room);
      return room;
    }
  } catch (err) {
    console.warn("Supabase createRoom falló, usando modo P2P/Broadcast local:", err);
  }

  // Fallback local
  broadcastLocalRoom(newRoom);
  return newRoom;
}

/** Se une a una sala existente mediante su código */
export async function joinRoom(code: string, character: string): Promise<RoomData> {
  const playerId = getLocalPlayerId();
  const cleanCode = code.trim().toUpperCase();

  try {
    const { data: room, error: findError } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", cleanCode)
      .in("status", ["waiting", "ready"])
      .single();

    if (!findError && room) {
      if (room.host_id === playerId) {
        // Es el mismo host volviendo a entrar
        return room as RoomData;
      }

      const { data, error: updateError } = await supabase
        .from("rooms")
        .update({
          guest_id: playerId,
          guest_character: character,
          guest_ready: false,
        })
        .eq("id", room.id)
        .select()
        .single();

      if (!updateError && data) {
        const updated = data as RoomData;
        broadcastLocalRoom(updated);
        return updated;
      }
    }
  } catch (err) {
    console.warn("Supabase joinRoom falló, buscando en modo local:", err);
  }

  // Comprobar fallback local
  const local = localRoomsStore.get(cleanCode);
  if (local) {
    local.guest_id = playerId;
    local.guest_character = character;
    local.guest_ready = false;
    broadcastLocalRoom(local);
    return { ...local };
  }

  // Simular conexión si el usuario conoce el código
  const fallbackRoom: RoomData = {
    id: `local-${cleanCode}`,
    code: cleanCode,
    host_id: "host-" + cleanCode,
    host_character: "ash",
    guest_id: playerId,
    guest_character: character,
    host_ready: false,
    guest_ready: false,
    stage_id: "neon",
    status: "waiting",
    winner: null,
  };
  broadcastLocalRoom(fallbackRoom);
  return fallbackRoom;
}

/** Cambia el estado 'listo' del jugador en la sala */
export async function setPlayerReady(
  roomId: string,
  isHost: boolean,
  ready: boolean,
  currentRoom: RoomData,
): Promise<RoomData> {
  const next: RoomData = {
    ...currentRoom,
    host_ready: isHost ? ready : currentRoom.host_ready,
    guest_ready: !isHost ? ready : currentRoom.guest_ready,
  };

  // Si ambos están listos y hay un invitado, pasa a 'ready' (o 'playing')
  if (next.host_ready && next.guest_ready && next.guest_id) {
    next.status = "ready";
  } else if (next.status === "ready") {
    next.status = "waiting";
  }

  try {
    const updatePayload: Partial<RoomData> = {
      host_ready: next.host_ready,
      guest_ready: next.guest_ready,
      status: next.status,
    };
    await supabase.from("rooms").update(updatePayload).eq("id", roomId);
  } catch {
    // Ignorar fallo si estamos en fallback local
  }

  broadcastLocalRoom(next);
  return next;
}

/** Actualiza el estado global de la sala ('playing', 'finished') */
export async function updateRoomStatus(
  roomId: string,
  status: RoomData["status"],
  winner?: string,
): Promise<void> {
  try {
    await supabase
      .from("rooms")
      .update({
        status,
        ...(winner !== undefined ? { winner } : {}),
      })
      .eq("id", roomId);
  } catch {
    // Ignorar
  }

  const local = localRoomsStore.get(roomId);
  if (local) {
    local.status = status;
    if (winner !== undefined) local.winner = winner;
    broadcastLocalRoom(local);
  }
}

/** Sale o limpia la sala */
export async function leaveRoom(roomId: string, isHost: boolean): Promise<void> {
  try {
    if (isHost) {
      await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId);
    } else {
      await supabase
        .from("rooms")
        .update({ guest_id: null, guest_ready: false, status: "waiting" })
        .eq("id", roomId);
    }
  } catch {
    // Ignorar
  }

  const local = localRoomsStore.get(roomId);
  if (local) {
    if (isHost) {
      local.status = "finished";
    } else {
      local.guest_id = null;
      local.guest_ready = false;
      local.status = "waiting";
    }
    broadcastLocalRoom(local);
  }
}

/** Suscripción reactiva a las actualizaciones de la sala */
export function subscribeToRoom(
  roomId: string,
  roomCode: string,
  onUpdate: (room: RoomData) => void,
): () => void {
  // 1. Canal Supabase DB Postgres Changes
  const channel = supabase
    .channel(`room-db-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        if (payload.new && typeof payload.new === "object") {
          onUpdate(payload.new as RoomData);
        }
      },
    )
    .subscribe();

  // 2. Canal Broadcast local cruzado entre pestañas
  const codeBus = getLocalBus(roomCode);
  const idBus = getLocalBus(roomId);

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === "ROOM_UPDATE" && e.data.room) {
      onUpdate(e.data.room);
    }
  };

  codeBus?.addEventListener("message", handleMessage);
  idBus?.addEventListener("message", handleMessage);

  return () => {
    supabase.removeChannel(channel);
    codeBus?.removeEventListener("message", handleMessage);
    idBus?.removeEventListener("message", handleMessage);
    codeBus?.close();
    idBus?.close();
  };
}
