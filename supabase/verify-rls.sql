-- Run AFTER setup.sql in the Supabase SQL Editor as its default admin role.
-- Creates two fixture users and a few events, checks real role permissions,
-- then rolls everything back. A failing assertion raises an error instead.
-- It does not read or alter existing users' study events.
begin;

select set_config('anatome.test_user_a', gen_random_uuid()::text, true);
select set_config('anatome.test_user_b', gen_random_uuid()::text, true);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  (current_setting('anatome.test_user_a')::uuid, 'authenticated', 'authenticated',
    'anatome-rls-a-' || current_setting('anatome.test_user_a') || '@example.invalid', now(), now()),
  (current_setting('anatome.test_user_b')::uuid, 'authenticated', 'authenticated',
    'anatome-rls-b-' || current_setting('anatome.test_user_b') || '@example.invalid', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('anatome.test_user_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('anatome.test_user_a'), 'role', 'authenticated')::text, true);

insert into public.study_events (user_id, id, kind, occurred_at, payload)
values (auth.uid(), 'rls-test-a', 'restart', 1, '{"collection":"muscles","round":2}');

-- This is the same operation used by durable-outbox retries.
insert into public.study_events (user_id, id, kind, occurred_at, payload)
values (auth.uid(), 'rls-test-a', 'restart', 1, '{"collection":"muscles","round":2}')
on conflict (user_id, id) do nothing;

do $$
begin
  if (select count(*) from public.study_events) <> 1 then
    raise exception 'User A must see exactly their own event; retry must not duplicate it';
  end if;
  begin
    insert into public.study_events (user_id, id, kind, occurred_at, payload)
    values (current_setting('anatome.test_user_b')::uuid, 'rls-test-forged', 'restart', 2, '{}');
    raise exception 'User A was able to insert an event owned by user B';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.study_events set payload = '{}' where id = 'rls-test-a';
    raise exception 'Authenticated users must not be able to update events';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.study_events where id = 'rls-test-a';
    raise exception 'Authenticated users must not be able to delete events';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', current_setting('anatome.test_user_b'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('anatome.test_user_b'), 'role', 'authenticated')::text, true);

do $$
begin
  if exists (select 1 from public.study_events) then
    raise exception 'User B can read user A history';
  end if;
end $$;

insert into public.study_events (user_id, id, kind, occurred_at, payload)
values (auth.uid(), 'rls-test-b', 'restart', 3, '{"collection":"skeleton","round":2}');

do $$
begin
  if (select count(*) from public.study_events) <> 1
    or not exists (select 1 from public.study_events where id = 'rls-test-b') then
    raise exception 'User B must see exactly their own event';
  end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('anatome.test_user_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('anatome.test_user_a'), 'role', 'authenticated')::text, true);

do $$
begin
  if exists (select 1 from public.study_events where id = 'rls-test-b') then
    raise exception 'User A can read user B history';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform id from public.study_events;
    raise exception 'Anonymous visitors must not be able to read study events';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.study_events (user_id, id, kind, occurred_at, payload)
    values (current_setting('anatome.test_user_a')::uuid, 'rls-test-anon', 'restart', 4, '{}');
    raise exception 'Anonymous visitors must not be able to insert study events';
  exception when insufficient_privilege then null;
  end;
  raise notice 'All Anatomeme ownership, retry, and append-only permission checks passed.';
end $$;

reset role;
rollback;

select 'Ownership checks passed; test transaction rolled back.' as result,
  (select count(*) from auth.users where email like 'anatome-rls-%@example.invalid') as remaining_test_users,
  (select count(*) from public.study_events where id in ('rls-test-a', 'rls-test-b', 'rls-test-forged', 'rls-test-anon')) as remaining_test_events;
