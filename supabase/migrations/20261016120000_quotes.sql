-- Cotizador privado: ajustes de tarifas y cotizaciones guardadas. Solo el administrador lee y escribe.

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

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  client_name text not null check (char_length(client_name) between 1 and 160),
  client_type text not null default 'pyme',
  project_type text not null,
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
create index if not exists quotes_created_idx on public.quotes (created_at desc);
create index if not exists quotes_lead_idx on public.quotes (lead_id);

drop trigger if exists quotes_touch on public.quotes;
create trigger quotes_touch before update on public.quotes
  for each row execute function private.touch_updated_at();

alter table public.quotes enable row level security;

drop policy if exists "quotes: admin" on public.quotes;
create policy "quotes: admin" on public.quotes
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
