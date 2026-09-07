-- ==========================================================
-- NEON FURY FIGHT - Esquema de Base de Datos Supabase
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/_/sql
-- ==========================================================

-- 1. Crear tabla de salas (rooms)
create table if not exists public.rooms (
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

-- 2. Índice rápido para búsquedas por código
create index if not exists idx_rooms_code on public.rooms (code);
create index if not exists idx_rooms_status on public.rooms (status);

-- 3. Habilitar Row Level Security (RLS)
alter table public.rooms enable row level security;

-- 4. Políticas permisivas para partidas públicas y jugadores invitados (anon)
drop policy if exists "Permitir lectura publica de salas" on public.rooms;
create policy "Permitir lectura publica de salas"
  on public.rooms for select
  using (true);

drop policy if exists "Permitir crear salas" on public.rooms;
create policy "Permitir crear salas"
  on public.rooms for insert
  with check (true);

drop policy if exists "Permitir actualizar salas" on public.rooms;
create policy "Permitir actualizar salas"
  on public.rooms for update
  using (true)
  with check (true);

drop policy if exists "Permitir borrar salas antiguas o vacias" on public.rooms;
create policy "Permitir borrar salas antiguas o vacias"
  on public.rooms for delete
  using (true);

-- 5. Publicar cambios en Realtime para suscripciones automáticas
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end $$;

-- 6. Trigger para actualizar updated_at automáticamente
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
