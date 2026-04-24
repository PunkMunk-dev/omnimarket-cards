-- tcg_gemrate_search_cache
-- Caches GemRate item_search results per card.
-- RLS enabled with no public policies — service_role access only.
-- TTL enforced in application code (7 days).

create table if not exists public.tcg_gemrate_search_cache (
  id              uuid        primary key default gen_random_uuid(),
  cache_key       text        unique not null,   -- "{category}:{normalized_name_lower}"
  normalized_name text,
  category        text        not null,
  response        jsonb       not null,          -- full NormalizedResult JSON
  cached_at       timestamptz not null default now()
);

alter table public.tcg_gemrate_search_cache enable row level security;
-- Intentionally no SELECT / INSERT / UPDATE policies.
-- Only service_role (used inside edge functions) can bypass RLS and access this table.

comment on table public.tcg_gemrate_search_cache is
  'GemRate item_search cache. 7-day TTL enforced by edge function. No anon/authenticated access.';
