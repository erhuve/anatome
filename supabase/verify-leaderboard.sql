-- Run AFTER setup.sql and leaderboard.sql as the SQL Editor's admin role.
-- Uses actual anon/authenticated roles. All fixture accounts, enrollment, and
-- events roll back, including on a successful run. If an assertion fails,
-- run ROLLBACK before continuing. No existing account is changed.
begin;
-- Lock ordering is structural: the account lock must be BEFORE every INSERT,
-- so a concurrent batch cannot hold an event ID while waiting for the lock.
-- PGlite is single-session; this assertion checks trigger timing/coverage,
-- while overlapping-batch concurrency needs a multi-session Postgres runner.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    where n.nspname = 'public' and c.relname = 'study_events'
      and t.tgname = 'leaderboard_lock_study_event_account'
      and p.proname = 'lock_study_event_account'
      and t.tgtype = 7 -- ROW (1) + BEFORE (2) + INSERT (4)
      and t.tgqual is null and t.tgenabled = 'O'
  ) then
    raise exception 'Account lock must run BEFORE every row INSERT, including conflicting event IDs';
  end if;
end $$;
select set_config('anatome.lb_run', replace(gen_random_uuid()::text, '-', ''), true);
select set_config('anatome.lb_a', gen_random_uuid()::text, true);
select set_config('anatome.lb_b', gen_random_uuid()::text, true);
select set_config('anatome.lb_c', gen_random_uuid()::text, true);
select set_config('anatome.lb_name', 'lbA_' || left(current_setting('anatome.lb_run'), 16), true);
select set_config('anatome.lb_baseline', (public.get_global_leaderboard() ->> 'participants'), true);

create temporary table leaderboard_fixture_users (id uuid, nickname text);
insert into leaderboard_fixture_users values
  (current_setting('anatome.lb_a')::uuid, current_setting('anatome.lb_name')),
  (current_setting('anatome.lb_b')::uuid, 'lbB_' || left(current_setting('anatome.lb_run'), 16)),
  (current_setting('anatome.lb_c')::uuid, 'lbC_' || left(current_setting('anatome.lb_run'), 16));
insert into leaderboard_fixture_users
select gen_random_uuid(), 'lb_' || left(current_setting('anatome.lb_run'), 12) || '_' || lpad(i::text, 2, '0')
from generate_series(1, 55) as i;
insert into auth.users (id, aud, role, email, created_at, updated_at)
select id, 'authenticated', 'authenticated',
  'anatome-leaderboard-' || id::text || '@example.invalid', now(), now()
from leaderboard_fixture_users;

-- Fifty-five higher-scoring players make A/B fall outside the top fifty,
-- regardless of existing production rows. Test the out-of-list self result.
insert into leaderboard_private.profiles (user_id, nickname, listed)
select id, nickname, true from leaderboard_fixture_users
where id not in (current_setting('anatome.lb_a')::uuid,
  current_setting('anatome.lb_b')::uuid, current_setting('anatome.lb_c')::uuid);
insert into public.study_events (user_id, id, kind, occurred_at, payload)
select u.id, 'lb-filler-' || q.question_id, 'attempt', 1,
  jsonb_build_object('questionId', q.question_id, 'collection', 'muscles', 'correct', true, 'round', 1)
from leaderboard_fixture_users u
cross join (values ('model-muscles-FJ1419'), ('model-muscles-FJ1418M'), ('model-muscles-FJ1419M')) q(question_id)
where u.id not in (current_setting('anatome.lb_a')::uuid,
  current_setting('anatome.lb_b')::uuid, current_setting('anatome.lb_c')::uuid);

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('anatome.lb_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('anatome.lb_a'), 'role', 'authenticated')::text, true);

-- History earned before joining counts, but duplicates, invented targets,
-- study self-checks, reveals, memes, imports, and malformed values do not.
insert into public.study_events (user_id, id, kind, occurred_at, payload) values
  (auth.uid(), 'lb-correct', 'attempt', 1, '{"questionId":"model-muscles-FJ1419","collection":"muscles","correct":true,"round":1}'),
  (auth.uid(), 'lb-repeated', 'attempt', 2, '{"questionId":"model-muscles-FJ1419","collection":"muscles","correct":true,"round":2}'),
  (auth.uid(), 'lb-reveal', 'attempt', 3, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":false,"round":1}'),
  (auth.uid(), 'lb-self-check', 'attempt', 4, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":null}'),
  (auth.uid(), 'lb-import', 'import', 5, '{"state":{"attempts":[{"questionId":"model-muscles-FJ1419M","correct":true,"category":"muscles","at":1}]}}'),
  (auth.uid(), 'lb-made-up', 'attempt', 6, '{"questionId":"model-muscles-invented","collection":"muscles","correct":true,"round":1}'),
  (auth.uid(), 'lb-wrong-collection', 'attempt', 7, '{"questionId":"model-muscles-FJ1419M","collection":"skeleton","correct":true,"round":1}'),
  (auth.uid(), 'lb-string-correct', 'attempt', 8, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":"true","round":1}'),
  (auth.uid(), 'lb-string-round', 'attempt', 9, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":"1"}'),
  (auth.uid(), 'lb-zero-round', 'attempt', 10, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":0}'),
  (auth.uid(), 'lb-negative-round', 'attempt', 11, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":-1}'),
  (auth.uid(), 'lb-fraction-round', 'attempt', 12, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":1.5}'),
  (auth.uid(), 'lb-object-round', 'attempt', 13, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":{}}'),
  (auth.uid(), 'lb-meme', 'attempt', 14, '{"questionId":"meme-1-q1","collection":"memes","correct":true,"round":1}');
-- An offline retry reuses its immutable event ID and cannot add a second point.
insert into public.study_events (user_id, id, kind, occurred_at, payload)
values (auth.uid(), 'lb-correct', 'attempt', 1, '{"questionId":"model-muscles-FJ1419","collection":"muscles","correct":true,"round":1}')
on conflict (user_id, id) do nothing;

do $$
declare result jsonb;
begin
  if public.get_leaderboard_profile() is not null or public.get_global_leaderboard() -> 'self' <> 'null'::jsonb then
    raise exception 'A must not be enrolled by recording an answer';
  end if;
  perform public.set_leaderboard_profile(current_setting('anatome.lb_name'), true);
  result := public.get_global_leaderboard();
  if result #>> '{self,score}' <> '1' or result #>> '{self,is_you}' <> 'true' then
    raise exception 'Exactly one eligible distinct target should count: %', result -> 'self';
  end if;
  if (result #>> '{self,rank}')::integer < 56 or jsonb_array_length(result -> 'entries') <> 50 then
    raise exception 'Top50 must be bounded and still return own rank outside it';
  end if;
  if (result ->> 'participants')::integer <> current_setting('anatome.lb_baseline')::integer + 56 then
    raise exception 'Participant count should include only listed profiles';
  end if;
  begin
    perform public.set_leaderboard_profile('bad@email.com', true);
    raise exception 'Email-like nicknames must not be accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_leaderboard_profile('___', true);
    raise exception 'Nickname must contain a letter or number';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_leaderboard_profile('abcdefghijklmnopqrstuvwxyz', true);
    raise exception 'Nickname must be bounded to 24 characters';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform nickname from leaderboard_private.profiles;
    raise exception 'Authenticated users must not enumerate raw profiles';
  exception when insufficient_privilege then null;
  end;
  begin
    update leaderboard_private.scores set score = 999999 where user_id = auth.uid();
    raise exception 'Authenticated users must not set scores';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into leaderboard_private.earned_targets values (auth.uid(), 'model-muscles-FJ1419M');
    raise exception 'Authenticated users must not award points directly';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A second distinct eligible target increments the server projection once.
insert into public.study_events (user_id, id, kind, occurred_at, payload)
values (auth.uid(), 'lb-correct-two', 'attempt', 15, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":1}');
select set_config('anatome.lb_rank_a', public.get_global_leaderboard() #>> '{self,rank}', true);

do $$
begin
  if public.get_global_leaderboard() #>> '{self,score}' <> '2' then
    raise exception 'Second distinct correct target must add one point';
  end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('anatome.lb_b'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('anatome.lb_b'), 'role', 'authenticated')::text, true);

do $$
begin
  if public.get_leaderboard_profile() is not null then
    raise exception 'B must not read A profile through the own-profile RPC';
  end if;
  begin
    perform public.set_leaderboard_profile(lower(current_setting('anatome.lb_name')), true);
    raise exception 'Nickname collision should be case-insensitive';
  exception when unique_violation then null;
  end;
  perform public.set_leaderboard_profile('lbB_' || left(current_setting('anatome.lb_run'), 16), true);
end $$;
insert into public.study_events (user_id, id, kind, occurred_at, payload) values
  (auth.uid(), 'lb-tie-one', 'attempt', 100, '{"questionId":"model-muscles-FJ1419","collection":"muscles","correct":true,"round":1}'),
  (auth.uid(), 'lb-tie-two', 'attempt', 200, '{"questionId":"model-muscles-FJ1419M","collection":"muscles","correct":true,"round":1}');

do $$
begin
  if public.get_global_leaderboard() #>> '{self,rank}' <> current_setting('anatome.lb_rank_a') then
    raise exception 'Equal scores must share rank regardless of name or answer timestamp';
  end if;
  if public.get_leaderboard_profile() ->> 'nickname' <> 'lbB_' || left(current_setting('anatome.lb_run'), 16) then
    raise exception 'Own profile RPC must return B only';
  end if;
end $$;

select set_config('request.jwt.claim.sub', current_setting('anatome.lb_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('anatome.lb_a'), 'role', 'authenticated')::text, true);
select public.set_leaderboard_profile(current_setting('anatome.lb_name'), false);

do $$
begin
  if public.get_global_leaderboard() -> 'self' <> 'null'::jsonb then
    raise exception 'Leaving must immediately hide own public ranking';
  end if;
  if public.get_leaderboard_profile() ->> 'listed' <> 'false' then
    raise exception 'Leaving must retain an unlisted own profile';
  end if;
  if (public.get_global_leaderboard() ->> 'participants')::integer <> current_setting('anatome.lb_baseline')::integer + 56 then
    raise exception 'Leaving must remove A from participant count';
  end if;
  perform public.set_leaderboard_profile(current_setting('anatome.lb_name'), true);
  if public.get_global_leaderboard() #>> '{self,score}' <> '2' then
    raise exception 'Rejoining must retain earned score';
  end if;
end $$;

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
declare result jsonb; entry jsonb;
begin
  result := public.get_global_leaderboard();
  if jsonb_array_length(result -> 'entries') <> 50 or result -> 'self' <> 'null'::jsonb then
    raise exception 'Anonymous visitors should get only bounded public entries, no own row';
  end if;
  if (result ->> 'total_questions')::integer <> 720 then
    raise exception 'Update verification when the official 720-question catalog changes';
  end if;
  for entry in select value from jsonb_array_elements(result -> 'entries') loop
    if entry ->> 'is_you' <> 'false'
      or entry - 'nickname' - 'score' - 'rank' - 'is_you' <> '{}'::jsonb then
      raise exception 'Public entries must expose only nickname, rank, score, and is_you';
    end if;
  end loop;
  begin
    perform public.get_leaderboard_profile();
    raise exception 'Anonymous users must not call own-profile RPC';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_leaderboard_profile('anonymous', true);
    raise exception 'Anonymous users must not enroll';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from leaderboard_private.earned_targets;
    raise exception 'Anonymous users must not read earned question IDs';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.study_events;
    raise exception 'Anonymous users must not read private study history';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
-- Account deletion removes enrollment, derived points and private awards.
delete from auth.users where id = current_setting('anatome.lb_b')::uuid;
do $$
begin
  if exists (select 1 from leaderboard_private.profiles where user_id = current_setting('anatome.lb_b')::uuid)
    or exists (select 1 from leaderboard_private.scores where user_id = current_setting('anatome.lb_b')::uuid)
    or exists (select 1 from leaderboard_private.earned_targets where user_id = current_setting('anatome.lb_b')::uuid) then
    raise exception 'Deleting an account must cascade leaderboard records';
  end if;
  raise notice 'All leaderboard scoring, ownership, privacy, tie, opt-in, and top50 checks passed.';
end $$;
rollback;
select 'Leaderboard checks passed; fixture transaction rolled back.' as result;
