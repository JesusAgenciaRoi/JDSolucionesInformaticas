-- JD Soluciones: portafolio de proyectos, consultas del formulario y fotos.
-- Solo los usuarios listados en public.admins pueden editar. El público solo lee proyectos publicados
-- y solo puede crear consultas (no leerlas).

create schema if not exists private;

-- ---------- Administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated, anon;
grant execute on function private.is_admin() to authenticated, anon;

drop policy if exists "admins: verse a sí mismo" on public.admins;
create policy "admins: verse a sí mismo" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------- Proyectos ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  client text not null default '',
  summary text not null default '' check (char_length(summary) <= 400),
  body text not null default '',
  tags text[] not null default '{}',
  url text check (url is null or url ~ '^https?://'),
  cover_url text,
  gallery text[] not null default '{}',
  year int check (year is null or year between 2000 and 2100),
  featured boolean not null default false,
  published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_list_idx on public.projects (published, featured desc, sort, year desc);

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function private.touch_updated_at();

alter table public.projects enable row level security;

drop policy if exists "projects: público lee publicados" on public.projects;
create policy "projects: público lee publicados" on public.projects
  for select to anon, authenticated using (published or (select private.is_admin()));

drop policy if exists "projects: admin crea" on public.projects;
create policy "projects: admin crea" on public.projects
  for insert to authenticated with check ((select private.is_admin()));

drop policy if exists "projects: admin edita" on public.projects;
create policy "projects: admin edita" on public.projects
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "projects: admin borra" on public.projects;
create policy "projects: admin borra" on public.projects
  for delete to authenticated using ((select private.is_admin()));

-- ---------- Consultas del formulario de contacto ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 40),
  service text not null default '' check (char_length(service) <= 60),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'nuevo' check (status in ('nuevo', 'contactado', 'cerrado')),
  created_at timestamptz not null default now()
);
create index if not exists leads_created_idx on public.leads (created_at desc);
alter table public.leads enable row level security;

drop policy if exists "leads: cualquiera envía" on public.leads;
create policy "leads: cualquiera envía" on public.leads
  for insert to anon, authenticated with check (status = 'nuevo');

drop policy if exists "leads: admin lee" on public.leads;
create policy "leads: admin lee" on public.leads
  for select to authenticated using ((select private.is_admin()));

drop policy if exists "leads: admin actualiza" on public.leads;
create policy "leads: admin actualiza" on public.leads
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "leads: admin borra" on public.leads;
create policy "leads: admin borra" on public.leads
  for delete to authenticated using ((select private.is_admin()));

-- ---------- Fotos del portafolio (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio: admin sube" on storage.objects;
create policy "portfolio: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio' and (select private.is_admin()));

drop policy if exists "portfolio: admin edita" on storage.objects;
create policy "portfolio: admin edita" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio' and (select private.is_admin()));

drop policy if exists "portfolio: admin borra" on storage.objects;
create policy "portfolio: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio' and (select private.is_admin()));

-- ---------- Primer proyecto ----------
insert into public.projects (slug, title, client, summary, body, tags, url, cover_url, year, featured, published, sort)
values (
  'team-valkyria',
  'Team Valkyria',
  'Mariana Ayala · entrenadora personal',
  'App web para una entrenadora personal y sus clientas: rutinas con ejercicios animados, dieta y macros, recetario propio, seguimiento semanal y cobros mensuales.',
  E'## El desafío\nMaru llevaba las rutinas, las dietas y el seguimiento de sus clientas entre planillas, PDFs y mensajes de WhatsApp. Necesitaba un solo lugar para armar los planes, ver cómo entrena cada clienta y que ellas tuvieran todo a mano en el celular.\n\n## La solución\nUna app web instalable, con su marca, en dos versiones: la de la entrenadora y la de cada clienta.\n- La entrenadora da de alta a una clienta con nombre y correo, y le llega una invitación por email.\n- Rutinas con series, repeticiones, peso, descanso y hasta dos variaciones por ejercicio por si la máquina está ocupada.\n- Biblioteca de más de 1.500 ejercicios animados en español, más los ejercicios propios de la entrenadora con video.\n- Recetario con 200 recetas originales con ingredientes del mercado uruguayo, filtros y modo cocina paso a paso.\n- Dieta de referencia, macros diarios y seguimiento semanal de sesiones, peso y fuerza.\n- Notificaciones push, cobros mensuales y modo claro u oscuro.\n\n## Tecnología\nReact y TypeScript en el frontend, publicado en Cloudflare Pages. Supabase como backend: base de datos Postgres con seguridad por filas, autenticación por invitación, almacenamiento de videos y fotos, y funciones en el servidor para invitaciones y notificaciones.',
  array['App web', 'React', 'TypeScript', 'Supabase', 'Notificaciones push'],
  'https://maru-ayala.com',
  '/proyectos/team-valkyria/logo.webp',
  2026, true, true, 0
)
on conflict (slug) do nothing;

-- ---------- Administrador ----------
insert into public.admins (user_id)
select id from auth.users where email = 'jesusemanueledu@gmail.com'
on conflict do nothing;
