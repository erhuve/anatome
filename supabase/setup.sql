-- Anatomeme account progress. Run this entire file in the Supabase SQL Editor.
-- Safe to re-run: existing history is retained.
begin;

create table if not exists public.study_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 160),
  kind text not null check (kind in ('attempt', 'restart', 'import')),
  occurred_at bigint not null check (occurred_at between 0 and 8640000000000000),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 1048576
  ),
  primary key (user_id, id)
);

create index if not exists study_events_user_order_idx
  on public.study_events (user_id, occurred_at, id);

alter table public.study_events enable row level security;

-- Every browser request carries the public project key. It must not grant
-- anonymous visitors access, or let signed-in users edit another user's rows.
revoke all privileges on table public.study_events from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert on table public.study_events to authenticated;

drop policy if exists "study_events_select_own" on public.study_events;
create policy "study_events_select_own"
  on public.study_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "study_events_insert_own" on public.study_events;
create policy "study_events_insert_own"
  on public.study_events for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Events are append-only. Retrying the same (user_id, id) uses
-- INSERT ... ON CONFLICT DO NOTHING; UPDATE and DELETE stay unavailable.
commit;
