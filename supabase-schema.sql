-- ==========================================================
-- NEON FURY FIGHT - Esquema de Base de Datos Supabase (RESET)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/_/sql
--
-- ADVERTENCIA: este script ELIMINA y vuelve a crear las tablas
-- public.rooms y public.matches. Úsalo solo si esos datos de prueba
-- no son importantes (salas a medio crear / histórico de prueba).
-- Si quieres conservarlos, primero ejecuta (opcional):
--   select count(*) from public.rooms; select count(*) from public.matches;
--
-- MOTIVO DEL RESET: el esquema previo dejó host_id/guest_id como `uuid`
-- (referenciando auth.users), mientras que el juego usa un playerId anónimo
-- de tipo `text` ('p-xxxx'). Reecreamos las tablas con `text` para que las
-- políticas RLS no comparen `uuid = text`.
-- ==========================================================

-- 0. Identidad del jugador actual
--    El cliente envía la cabecera HTTP `x-player-id` (id anónimo persistido en
--    localStorage). Esta función la lee para las políticas RLS y, si no existe,
--    cae a auth.uid() (útil si en el futuro se integra Supabase Auth).
create or replace function public.current_player_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-player-id', ''),
    auth.uid()::text,
    ''
  );
$$;

-- ==========================================================
-- 1. LIMPIEZA PREVIA (idempotente): elimina todo lo antiguo
-- ==========================================================
drop trigger if exists rooms_archive_finished on public.rooms;
drop trigger if exists set_rooms_updated_at on public.rooms;
drop function if exists public.archive_finished_room();
drop function if exists public.handle_updated_at();

-- Importante: matches referencia rooms por FK, así que se elimina primero.
drop table if exists public.matches;
drop table if exists public.rooms;

-- ==========================================================
-- 2. TABLAS (con playerId anónimo de tipo text)
-- ==========================================================
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  code varchar(10) unique not null,
  host_id text not null,
  host_character text not null default 'ash',
  guest_id text,
  guest_character text,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  stage_id text not null default 'neon',
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'playing', 'finished')),
  winner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid default gen_random_uuid() primary key,
  room_id uuid not null unique references public.rooms (id) on delete cascade,
  host_id text not null,
  guest_id text,
  winner text,
  created_at timestamptz not null default now()
);

-- ==========================================================
-- 3. ÍNDICES
-- ==========================================================
create index idx_rooms_code on public.rooms (code);
create index idx_rooms_status on public.rooms (status);
create index idx_rooms_waiting_open
  on public.rooms (created_at)
  where status = 'waiting' and guest_id is null;

create index idx_matches_host on public.matches (host_id);
create index idx_matches_guest on public.matches (guest_id);
create index idx_matches_created_at on public.matches (created_at desc);

-- ==========================================================
-- 4. REALTIME (salas)
--    - Añade rooms a la publicación supabase_realtime.
--    - Replica identity full: así Realtime envía la FILA COMPLETA en
--      payload.new/payload.old (el cliente lo necesita para sincronizar).
-- ==========================================================
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

alter table public.rooms replica identity full;

-- ==========================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================================
alter table public.rooms enable row level security;
alter table public.matches enable row level security;

-- --- POLÍTICAS RLS - SALAS ---

-- a) SELECT: lectura PERMISIVA (using true) para toda la tabla rooms.
--    ¿Por qué? El matchmaking y la sala de espera dependen de Supabase Realtime
--    (postgres_changes) para sincronizar entre ventanas/dispositivos. Realtime NO
--    propaga la cabecera HTTP `x-player-id` (solo evalúa el JWT anon), por lo que
--    una política condicional filtraría las salas 'ready'/'playing'/'finished' y
--    rompería la sincronización cross-device. Las salas son efímeras y no
--    contienen datos sensibles; las escrituras sí siguen restringidas por RLS
--    (UPDATE/DELETE solo para host/invitado).
drop policy if exists "rooms_select_public" on public.rooms;
create policy "rooms_select_public"
  on public.rooms for select
  using (true);

-- b) INSERT: cualquiera puede crear una sala pública.
drop policy if exists "rooms_insert_public" on public.rooms;
create policy "rooms_insert_public"
  on public.rooms for insert
  with check (true);

-- c) UPDATE: solo el host_id o el guest_id pueden actualizar su propia sala.
drop policy if exists "rooms_update_owner" on public.rooms;
create policy "rooms_update_owner"
  on public.rooms for update
  using (
    host_id = public.current_player_id()
    or guest_id = public.current_player_id()
  )
  with check (
    host_id = public.current_player_id()
    or guest_id = public.current_player_id()
    or guest_id is null -- permite liberar la plaza de invitado al salir
  );

-- d) UPDATE (reclamar plaza): cualquier jugador puede ocupar el hueco de
--    invitado de una sala abierta (quick match / unirse por código).
drop policy if exists "rooms_update_claim_guest" on public.rooms;
create policy "rooms_update_claim_guest"
  on public.rooms for update
  using (guest_id is null)
  with check (guest_id = public.current_player_id());

-- e) DELETE: solo el anfitrión limpia sus propias salas.
drop policy if exists "rooms_delete_host" on public.rooms;
create policy "rooms_delete_host"
  on public.rooms for delete
  using (host_id = public.current_player_id());

-- --- POLÍTICAS RLS - MATCHES (historial) ---

-- SELECT: los participantes pueden consultar el historial de sus partidas.
drop policy if exists "matches_select_owner" on public.matches;
create policy "matches_select_owner"
  on public.matches for select
  using (
    host_id = public.current_player_id()
    or guest_id = public.current_player_id()
  );

-- INSERT: los participantes pueden archivar sus propias partidas.
drop policy if exists "matches_insert_owner" on public.matches;
create policy "matches_insert_owner"
  on public.matches for insert
  with check (
    host_id = public.current_player_id()
    or guest_id = public.current_player_id()
  );

-- Sin políticas de UPDATE/DELETE: el historial es inmutable (solo lectura).

-- ==========================================================
-- 6. TRIGGERS
-- ==========================================================

-- Trigger para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
  before update on public.rooms
  for each row
  execute function public.handle_updated_at();

-- Archivado automático del historial al terminar una sala
-- (ignora abandones; se ejecuta con privilegios elevados para sortear RLS).
create or replace function public.archive_finished_room()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'finished' and new.winner is not null and new.winner <> 'abandon' then
    insert into public.matches (room_id, host_id, guest_id, winner)
    values (new.id, new.host_id, new.guest_id, new.winner)
    on conflict (room_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists rooms_archive_finished on public.rooms;
create trigger rooms_archive_finished
  after update of status on public.rooms
  for each row
  when (new.status = 'finished')
  execute function public.archive_finished_room();