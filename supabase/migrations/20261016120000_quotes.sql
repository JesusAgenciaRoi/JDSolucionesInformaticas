-- Cotizador privado y cuestionario para clientes.
-- quote_settings y quotes: solo el administrador.
-- briefs (cuestionarios): solo el administrador desde la API; el cliente entra únicamente
-- con su enlace secreto, a través de las funciones get_brief y save_brief.

-- ---------- Tarifas ----------
create table if not exists public.quote_settings (
  id int primary key default 1 check (id = 1),
  floor_rate numeric not null default 15 check (floor_rate > 0),
  target_rate numeric not null default 22 check (target_rate > 0),
  high_rate numeric not null default 32 check (high_rate > 0),
  hours_per_week numeric not null default 15 check (hours_per_week > 0),
  min_project numeric not null default 150 check (min_project >= 0),
  overhead_pct numeric not null default 15 check (overhead_pct between 0 and 100),
  qa_pct numeric not null default 10 check (qa_pct between 0 and 100),
  updated_at timestamptz not null default now()
);
insert into public.quote_settings (id) values (1) on conflict (id) do nothing;
alter table public.quote_settings enable row level security;

drop policy if exists "quote_settings: admin" on public.quote_settings;
create policy "quote_settings: admin" on public.quote_settings
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------- Cuestionarios ----------
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  lead_id uuid references public.leads (id) on delete set null,
  client_name text not null default '' check (char_length(client_name) <= 160),
  client_email text not null default '' check (char_length(client_email) <= 200),
  status text not null default 'enviado' check (status in ('enviado', 'en_progreso', 'respondido')),
  answers jsonb not null default '{}' check (pg_column_size(answers) < 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists briefs_created_idx on public.briefs (created_at desc);

drop trigger if exists briefs_touch on public.briefs;
create trigger briefs_touch before update on public.briefs
  for each row execute function private.touch_updated_at();

alter table public.briefs enable row level security;

drop policy if exists "briefs: admin" on public.briefs;
create policy "briefs: admin" on public.briefs
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- El cliente lee su cuestionario con el enlace. Solo devuelve lo necesario.
create or replace function public.get_brief(p_token text)
returns table (client_name text, status text, answers jsonb, submitted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.client_name, b.status, b.answers, b.submitted_at
  from public.briefs b
  where b.token = p_token and char_length(p_token) = 36;
$$;

-- El cliente guarda (y opcionalmente envía) sus respuestas. Una vez enviado, ya no se puede cambiar.
create or replace function public.save_brief(p_token text, p_answers jsonb, p_submit boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) >= 100000 then
    raise exception 'Respuestas inválidas';
  end if;
  select status into v_status from public.briefs where token = p_token and char_length(p_token) = 36 for update;
  if not found then
    raise exception 'Cuestionario no encontrado';
  end if;
  if v_status = 'respondido' then
    return 'respondido';
  end if;
  update public.briefs
     set answers = p_answers,
         status = case when p_submit then 'respondido' else 'en_progreso' end,
         submitted_at = case when p_submit then now() else submitted_at end
   where token = p_token;
  return case when p_submit then 'respondido' else 'en_progreso' end;
end;
$$;

revoke all on function public.get_brief(text) from public;
revoke all on function public.save_brief(text, jsonb, boolean) from public;
grant execute on function public.get_brief(text) to anon, authenticated;
grant execute on function public.save_brief(text, jsonb, boolean) to anon, authenticated;

-- ---------- Cotizaciones ----------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  brief_id uuid references public.briefs (id) on delete set null,
  client_name text not null check (char_length(client_name) between 1 and 160),
  client_type text not null default 'pyme',
  project_type text not null default '',
  answers jsonb not null default '{}',
  hours_min numeric not null,
  hours_max numeric not null,
  price_floor numeric not null,
  price_target numeric not null,
  price_high numeric not null,
  final_price numeric,
  status text not null default 'borrador' check (status in ('borrador', 'enviada', 'aceptada', 'rechazada')),
  actual_hours numeric,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.quotes add column if not exists brief_id uuid references public.briefs (id) on delete set null;
create index if not exists quotes_created_idx on public.quotes (created_at desc);
create index if not exists quotes_lead_idx on public.quotes (lead_id);
create index if not exists quotes_brief_idx on public.quotes (brief_id);

drop trigger if exists quotes_touch on public.quotes;
create trigger quotes_touch before update on public.quotes
  for each row execute function private.touch_updated_at();

alter table public.quotes enable row level security;

drop policy if exists "quotes: admin" on public.quotes;
create policy "quotes: admin" on public.quotes
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------- Ajuste de seguridad del proyecto ----------
-- Función creada por Supabase que no tiene por qué estar expuesta en la API.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
