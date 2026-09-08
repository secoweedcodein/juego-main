import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Configuración estrictamente a través de variables de entorno Vite.
// No hay credenciales hardcodeadas: esto es un requisito de seguridad.
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.error(
    "[Neon Fury Fight] ERROR DE CONFIGURACIÓN: faltan las variables de entorno de Supabase.\n" +
      "Crea un archivo .env en la raíz del proyecto con los siguientes valores:\n" +
      "  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n" +
      "  VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica\n" +
      "Sin ellas el modo online no podrá conectarse y usará el fallback local.",
  );
}

export const PLAYER_ID_HEADER = "x-player-id";

/** Añade la identidad del jugador local a cada petición para que las políticas RLS
 *  (host_id / guest_id) puedan validar quién está escribiendo sobre una sala. */
function withPlayerIdHeader(init?: RequestInit): RequestInit {
  if (typeof window === "undefined" || typeof Headers === "undefined") {
    return init ?? {};
  }
  const headers = new Headers(init?.headers);
  if (!headers.has(PLAYER_ID_HEADER)) {
    headers.set(PLAYER_ID_HEADER, getLocalPlayerId());
  }
  return { ...init, headers };
}

function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        // Límite de eventos Realtime por segundo. El guest envía un intent por
        // frame (60 Hz) y el host ~30 snapshots/s; un límite de 30 los descartaría.
        eventsPerSecond: 100,
      },
    },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, withPlayerIdHeader(init)),
    },
  });
}

// Si faltan las variables de entorno se usa un endpoint inválido a propósito:
// el error quedará claro en consola y la app se degrada al modo local/P2P.
export let supabase: SupabaseClient = hasSupabaseConfig
  ? createSupabaseClient(supabaseUrl!, supabaseAnonKey!)
  : createSupabaseClient("https://supabase.invalid", "anon-key-no-configurada");

/** Reconfigura el cliente con credenciales suministradas en tiempo de ejecución
 *  (por ejemplo desde la interfaz de configuración). Solo válido para la sesión
 *  actual; la configuración por defecto siempre proviene de las variables de
 *  entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. */
export function reconfigureSupabase(url: string, key: string) {
  try {
    supabase = createSupabaseClient(url, key);
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
      if (
        error.code === "PGRST204" ||
        error.message.includes("relation") ||
        error.code === "42P01"
      ) {
        return {
          ok: false,
          message:
            "Conectado a Supabase pero la tabla 'rooms' no existe. Ejecuta supabase-schema.sql.",
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
