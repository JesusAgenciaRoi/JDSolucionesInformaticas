-- Seguimiento de proyectos para el cliente, con control de cambios.
-- Tablas solo para el administrador. El cliente entra con su enlace secreto a través de funciones
-- que solo le dejan: ver su proyecto, pedir un cambio, aprobar o rechazar un adicional,
-- aprobar una etapa en revisión y tildar sus pendientes.

alter table public.quote_settings add column if not exists revision_rounds int not null default 2 check (revision_rounds between 0 and 10);

create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  quote_id uuid references public.quotes (id) on delete set null,
  client_name text not null check (char_length(client_name) between 1 and 160),
  title text not null check (char_length(title) between 1 and 160),
  scope jsonb not null default '[]',        -- ["Página web con 5 secciones", …]  (alcance acordado, solo lectura para el cliente)
  base_price numeric not null default 0,
  hourly_rate numeric not null default 22,   -- tarifa para calcular adicionales (no se muestra al cliente)
  revision_rounds int not null default 2,
  stages jsonb not null default '[]',       -- [{id, title, status: pendiente|en_curso|revision|aprobada, rounds_used, approved_at}]
  payments jsonb not null default '[]',     -- [{id, label, amount, paid, paid_at}]
  client_todos jsonb not null default '[]', -- [{id, label, done}]
  preview_url text check (preview_url is null or preview_url ~ '^https?://'),
  status text not null default 'activo' check (status in ('activo', 'pausado', 'terminado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists engagements_created_idx on public.engagements (created_at desc);
drop trigger if exists engagements_touch on public.engagements;
create trigger engagements_touch before update on public.engagements for each row execute function private.touch_updated_at();
alter table public.engagements enable row level security;
drop policy if exists "engagements: admin" on public.engagements;
create policy "engagements: admin" on public.engagements
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create table if not exists public.engagement_updates (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  link text check (link is null or link ~ '^https?://'),
  created_at timestamptz not null default now()
);
create index if not exists engagement_updates_idx on public.engagement_updates (engagement_id, created_at desc);
alter table public.engagement_updates enable row level security;
drop policy if exists "engagement_updates: admin" on public.engagement_updates;
create policy "engagement_updates: admin" on public.engagement_updates
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  -- nuevo → incluido | adicional (propuesto) → aprobado | rechazado ; o descartado
  status text not null default 'nuevo' check (status in ('nuevo', 'incluido', 'adicional', 'aprobado', 'rechazado', 'descartado')),
  hours numeric,
  price numeric,
  days int,
  admin_note text not null default '',
  stage_id text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  answered_at timestamptz
);
create index if not exists change_requests_idx on public.change_requests (engagement_id, created_at desc);
alter table public.change_requests enable row level security;
drop policy if exists "change_requests: admin" on public.change_requests;
create policy "change_requests: admin" on public.change_requests
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------- Funciones para el cliente (por enlace) ----------

create or replace function private.engagement_by_token(p_token text)
returns public.engagements language sql stable security definer set search_path = '' as $$
  select e.* from public.engagements e where e.token = p_token and char_length(p_token) = 36;
$$;

create or replace function public.get_engagement(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare e public.engagements;
begin
  e := private.engagement_by_token(p_token);
  if e.id is null then return null; end if;
  return jsonb_build_object(
    'client_name', e.client_name, 'title', e.title, 'scope', e.scope, 'base_price', e.base_price,
    'revision_rounds', e.revision_rounds, 'stages', e.stages, 'payments', e.payments,
    'client_todos', e.client_todos, 'preview_url', e.preview_url, 'status', e.status, 'created_at', e.created_at,
    'updates', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'body', u.body, 'link', u.link, 'created_at', u.created_at) order by u.created_at desc)
                         from public.engagement_updates u where u.engagement_id = e.id), '[]'::jsonb),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'body', c.body, 'status', c.status, 'hours', c.hours, 'price', c.price,
                                 'days', c.days, 'admin_note', c.admin_note, 'created_at', c.created_at, 'answered_at', c.answered_at) order by c.created_at desc)
                         from public.change_requests c where c.engagement_id = e.id and c.status <> 'descartado'), '[]'::jsonb)
  );
end; $$;

create or replace function public.request_change(p_token text, p_body text)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.engagements; open_count int;
begin
  e := private.engagement_by_token(p_token);
  if e.id is null then raise exception 'Proyecto no encontrado'; end if;
  if e.status = 'terminado' then raise exception 'El proyecto está terminado'; end if;
  if p_body is null or char_length(trim(p_body)) < 3 or char_length(p_body) > 2000 then raise exception 'Escribe el cambio que necesitas'; end if;
  select count(*) into open_count from public.change_requests where engagement_id = e.id and status = 'nuevo';
  if open_count >= 15 then raise exception 'Hay muchos pedidos sin revisar. Espera la respuesta antes de enviar más.'; end if;
  insert into public.change_requests (engagement_id, body) values (e.id, trim(p_body));
  return 'ok';
end; $$;

create or replace function public.answer_change(p_token text, p_change_id uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.engagements;
begin
  e := private.engagement_by_token(p_token);
  if e.id is null then raise exception 'Proyecto no encontrado'; end if;
  update public.change_requests
     set status = case when p_approve then 'aprobado' else 'rechazado' end, answered_at = now()
   where id = p_change_id and engagement_id = e.id and status = 'adicional';
  if not found then raise exception 'Este cambio ya no se puede responder'; end if;
  return case when p_approve then 'aprobado' else 'rechazado' end;
end; $$;

create or replace function public.approve_stage(p_token text, p_stage_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.engagements; new_stages jsonb;
begin
  e := private.engagement_by_token(p_token);
  if e.id is null then raise exception 'Proyecto no encontrado'; end if;
  if not exists (select 1 from jsonb_array_elements(e.stages) s where s->>'id' = p_stage_id and s->>'status' = 'revision') then
    raise exception 'Esta etapa no está esperando aprobación';
  end if;
  select jsonb_agg(case when s->>'id' = p_stage_id
                        then s || jsonb_build_object('status', 'aprobada', 'approved_at', now())
                        else s end order by ord)
    into new_stages from jsonb_array_elements(e.stages) with ordinality as t(s, ord);
  update public.engagements set stages = new_stages where id = e.id;
  return 'aprobada';
end; $$;

create or replace function public.toggle_client_todo(p_token text, p_todo_id text, p_done boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.engagements; new_todos jsonb;
begin
  e := private.engagement_by_token(p_token);
  if e.id is null then raise exception 'Proyecto no encontrado'; end if;
  select jsonb_agg(case when t->>'id' = p_todo_id then t || jsonb_build_object('done', p_done) else t end order by ord)
    into new_todos from jsonb_array_elements(e.client_todos) with ordinality as x(t, ord);
  update public.engagements set client_todos = coalesce(new_todos, '[]'::jsonb) where id = e.id;
  return 'ok';
end; $$;

revoke all on function private.engagement_by_token(text) from public, anon, authenticated;
revoke all on function public.get_engagement(text) from public;
revoke all on function public.request_change(text, text) from public;
revoke all on function public.answer_change(text, uuid, boolean) from public;
revoke all on function public.approve_stage(text, text) from public;
revoke all on function public.toggle_client_todo(text, text, boolean) from public;
grant execute on function public.get_engagement(text) to anon, authenticated;
grant execute on function public.request_change(text, text) to anon, authenticated;
grant execute on function public.answer_change(text, uuid, boolean) to anon, authenticated;
grant execute on function public.approve_stage(text, text) to anon, authenticated;
grant execute on function public.toggle_client_todo(text, text, boolean) to anon, authenticated;

-- Cierra la función interna de Supabase que el análisis de seguridad marca como expuesta
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
