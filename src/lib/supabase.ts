import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Claves por defecto o leídas de variables de entorno Vite
const DEFAULT_URL =
  (import.meta.env["VITE_SUPABASE_URL"] as string) ||
  (typeof window !== "undefined" ? localStorage.getItem("nf_supabase_url") : null) ||
  "https://bmafsninxqattzajjuvu.supabase.co";

const DEFAULT_KEY =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string) ||
  (typeof window !== "undefined" ? localStorage.getItem("nf_supabase_key") : null) ||
  "sb_publishable_o_GM5wSJarKleGfHgpk7iQ_ET1PfQcv";

export let supabase: SupabaseClient = createClient(DEFAULT_URL, DEFAULT_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 30,
    },
  },
});

export function reconfigureSupabase(url: string, key: string) {
  try {
    localStorage.setItem("nf_supabase_url", url);
    localStorage.setItem("nf_supabase_key", key);
    supabase = createClient(url, key, {
      auth: { persistSession: true },
      realtime: { params: { eventsPerSecond: 30 } },
    });
    return true;
  } catch (err) {
    console.error("Error al reconfigurar Supabase:", err);
    return false;
  }
}

/** Devuelve un ID único y persistente para este jugador local. */
export function getLocalPlayerId(): string {
  if (typeof window === "undefined") return "guest-player";
  let id = localStorage.getItem("nf_player_id");
  if (!id) {
    id = "p-" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("nf_player_id", id);
  }
  return id;
}

/** Devuelve o actualiza el nombre del jugador local. */
export function getLocalPlayerName(): string {
  if (typeof window === "undefined") return "Ciber-Luchador";
  let name = localStorage.getItem("nf_player_name");
  if (!name) {
    name = "Luchador-" + Math.floor(100 + Math.random() * 900);
    localStorage.setItem("nf_player_name", name);
  }
  return name;
}

export function setLocalPlayerName(name: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("nf_player_name", name.trim());
  }
}

/** Comprueba si el backend de Supabase responde y tiene la tabla rooms accesible */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from("rooms").select("id").limit(1);
    if (error) {
      // Si el error es 404 o no existe la tabla
      if (error.code === "PGRST204" || error.message.includes("relation") || error.code === "42P01") {
        return {
          ok: false,
          message: "Conectado a Supabase pero la tabla 'rooms' no existe. Ejecuta supabase-schema.sql.",
        };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Conectado a Supabase correctamente" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `No se pudo alcanzar Supabase (${msg})` };
  }
}
