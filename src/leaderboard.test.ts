import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LeaderboardPage from './components/LeaderboardPage';
import type { useAuth } from './useAuth';
import type { useStudyProgress } from './useStudyProgress';
import { emptyState } from './study';
import { modelPromptPools } from './modelQuiz';
import {
  LeaderboardStore, nicknameError, parseLeaderboard, parseLeaderboardProfile,
  type LeaderboardRemote, type LeaderboardSnapshot, type LeaderboardState,
} from './leaderboard';

const row = { rank: 1, nickname: 'Funny Bone', score: 42, is_you: true };
const board = (): LeaderboardSnapshot => ({ entries: [{ ...row }], self: { ...row }, participants: 1, total_questions: 720 });
const profile = () => ({ nickname: row.nickname, listed: true });
const makeRemote = (overrides: Partial<LeaderboardRemote> = {}): LeaderboardRemote => ({
  load: async () => board(), profile: async () => profile(),
  save: async (nickname, listed) => ({ nickname, listed }), ...overrides,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('the server scoring catalog exactly matches every shipped 3D quiz target and collection', () => {
  const sql = readFileSync(new URL('../supabase/leaderboard.sql', import.meta.url), 'utf8');
  const catalog = sql.match(/insert into leaderboard_private\.questions \(question_id, collection\) values([\s\S]*?)on conflict \(question_id\)/i)?.[1];
  assert.ok(catalog, 'The migration must seed its official scoring catalog');
  const actual = [...catalog.matchAll(/\('([^']+)', '(muscles|skeleton|landmarks)'\)/g)].map(([, id, collection]) => [id, collection]);
  const expected = Object.entries(modelPromptPools).flatMap(([collection, prompts]) => prompts.map(prompt => [prompt.id, collection]));
  const byId = (a: string[], b: string[]) => a[0].localeCompare(b[0]);
  assert.equal(actual.length, 720);
  assert.equal(new Set(actual.map(([id]) => id)).size, actual.length, 'Each target must appear exactly once');
  assert.deepEqual(actual.sort(byId), expected.sort(byId), 'Update the migration catalog when model targets change');
});

test('nicknames require a readable bounded public handle and reject emails or markup', () => {
  for (const value of ['Funny Bone', ' quiz_hero-24 ', 'A 3']) assert.equal(nicknameError(value), null);
  for (const value of ['', 'ab', ' '.repeat(5), '___', '---', 'a'.repeat(25), 'a@b.com', '<script>', '骨頭']) assert.equal(typeof nicknameError(value), 'string');
  assert.equal(parseLeaderboardProfile(null), null);
  assert.throws(() => parseLeaderboardProfile({ nickname: 'Someone', listed: 'true' }));
});

test('the parser keeps only public fields and supports an own rank beyond the top 50', () => {
  const value = { ...board(), participants: 100, self: { ...row, rank: 84, email: 'private@example.com', user_id: 'private-id' }, entries: [{ ...row, is_you: false, user_id: 'private-id' }], secret: 'hidden' };
  assert.deepEqual(parseLeaderboard(value), { entries: [{ ...row, is_you: false }], self: { ...row, rank: 84 }, participants: 100, total_questions: 720 });
  assert.deepEqual(parseLeaderboard({ entries: [], self: null, participants: 0, total_questions: 720 }), { entries: [], self: null, participants: 0, total_questions: 720 });
});

test('the parser rejects oversized rankings, impossible scores and invalid ranks', () => {
  for (const invalid of [
    { ...board(), entries: Array.from({ length: 51 }, () => row), participants: 60 },
    { ...board(), participants: 0 },
    { ...board(), total_questions: 0 },
    { ...board(), entries: [{ ...row, score: 721 }] },
    { ...board(), entries: [{ ...row, score: -1 }] },
    { ...board(), entries: [{ ...row, rank: 0 }] },
    { ...board(), entries: [{ ...row, rank: 2 }] },
    { ...board(), entries: [{ ...row, score: 1.5 }] },
    { ...board(), self: { ...row, is_you: false } },
  ]) assert.throws(() => parseLeaderboard(invalid));
});

test('guests can view the global board without fetching or retaining account fields', async () => {
  let privateReads = 0;
  let writes = 0;
  const store = new LeaderboardStore(makeRemote({ profile: async () => { privateReads += 1; return profile(); }, save: async () => { writes += 1; return profile(); } }), false);
  await store.refresh();
  assert.equal(privateReads, 0);
  assert.equal(store.getSnapshot().status, 'ready');
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().snapshot?.self, null);
  assert.equal(store.getSnapshot().snapshot?.entries[0].is_you, false);
  assert.equal(await store.saveProfile('Somebody', true), false);
  assert.equal(writes, 0);
});

test('no remote requests happen before auth is ready or without configuration', async () => {
  let calls = 0;
  const remote = makeRemote({ load: async () => { calls += 1; return board(); } });
  const waiting = new LeaderboardStore(remote, true, false);
  await waiting.refresh();
  assert.equal(await waiting.saveProfile('Someone', true), false);
  assert.equal(calls, 0);
  const unconfigured = new LeaderboardStore(null, false);
  await unconfigured.refresh();
  assert.equal(unconfigured.getSnapshot().status, 'unavailable');
});

test('concurrent refreshes share one active read and ignore late results after stop', async () => {
  const pending = deferred<unknown>();
  let calls = 0;
  const store = new LeaderboardStore(makeRemote({ load: () => { calls += 1; return pending.promise; } }), true);
  const loading = store.refresh();
  await store.refresh();
  assert.equal(calls, 1);
  store.stop();
  pending.resolve(board());
  await loading;
  assert.equal(store.getSnapshot().snapshot, null);
  assert.equal(store.getSnapshot().profile, null);
});

test('a new auth identity starts with no profile or own rank from the prior account', async () => {
  const first = new LeaderboardStore(makeRemote(), true);
  await first.refresh();
  assert.equal(first.getSnapshot().profile?.nickname, row.nickname);
  first.stop();
  const second = new LeaderboardStore(makeRemote({ profile: async () => null, load: async () => ({ ...board(), self: null, entries: [{ ...row, is_you: false }] }) }), true);
  assert.equal(second.getSnapshot().profile, null);
  assert.equal(second.getSnapshot().snapshot, null);
  await second.refresh();
  assert.equal(second.getSnapshot().profile, null);
  assert.equal(second.getSnapshot().snapshot?.self, null);
});

test('invalid nicknames never write and valid nickname writes are trimmed', async () => {
  const writes: [string, boolean][] = [];
  const store = new LeaderboardStore(makeRemote({ save: async (nickname, listed) => { writes.push([nickname, listed]); return { nickname, listed }; } }), true);
  assert.equal(await store.saveProfile('not@allowed', true), false);
  assert.equal(writes.length, 0);
  assert.equal(await store.saveProfile('  Quiz Hero  ', true), true);
  assert.deepEqual(writes, [['Quiz Hero', true]]);
});

test('nickname collisions preserve the saved profile and report the conflict', async () => {
  let writes = 0;
  const store = new LeaderboardStore(makeRemote({ save: async () => { writes += 1; throw { code: '23505' }; } }), true);
  await store.refresh();
  assert.equal(await store.saveProfile('Taken Name', true), false);
  assert.deepEqual(store.getSnapshot().profile, profile());
  assert.match(store.getSnapshot().error ?? '', /nickname is taken/i);
  assert.equal(store.getSnapshot().working, false);
  assert.equal(writes, 1);
});

test('confirmed leave discards the old public row even if the next ranking read fails', async () => {
  let calls = 0;
  let listed = true;
  const store = new LeaderboardStore(makeRemote({
    load: async () => { if (++calls > 1) throw new Error('Offline'); return board(); },
    profile: async () => ({ nickname: row.nickname, listed }),
    save: async (nickname, nextListed) => { listed = nextListed; return { nickname, listed }; },
  }), true);
  await store.refresh();
  assert.equal(await store.saveProfile(row.nickname, false), true);
  assert.equal(store.getSnapshot().profile?.listed, false);
  assert.equal(store.getSnapshot().snapshot, null);
  assert.equal(store.getSnapshot().updatedAt, null);
  assert.equal(store.getSnapshot().status, 'error');
  assert.equal(store.getSnapshot().working, false);
});

test('a profile mutation supersedes stale in-flight account reads', async () => {
  const stale = deferred<unknown>();
  let calls = 0;
  let own = profile();
  const store = new LeaderboardStore(makeRemote({
    load: async () => ++calls === 1 ? stale.promise : { ...board(), self: null, entries: [], participants: 0 },
    profile: async () => ({ ...own }),
    save: async (nickname, listed) => { own = { nickname, listed }; return own; },
  }), true);
  const reading = store.refresh();
  assert.equal(await store.saveProfile(row.nickname, false), true);
  stale.resolve(board());
  await reading;
  assert.equal(store.getSnapshot().profile?.listed, false);
  assert.equal(store.getSnapshot().snapshot?.self, null);
  assert.equal(store.getSnapshot().snapshot?.participants, 0);
});

test('double submission and refresh during a profile write do not duplicate requests', async () => {
  const saving = deferred<unknown>();
  let writes = 0;
  let reads = 0;
  const store = new LeaderboardStore(makeRemote({ load: async () => { reads += 1; return board(); }, save: async () => { writes += 1; return saving.promise; } }), true);
  const request = store.saveProfile(row.nickname, true);
  assert.equal(await store.saveProfile(row.nickname, true), false);
  await store.refresh();
  assert.equal(writes, 1);
  assert.equal(reads, 0);
  saving.resolve(profile());
  assert.equal(await request, true);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
});

test('uncertain failed writes are not automatically retried or presented as joined', async () => {
  let writes = 0;
  const store = new LeaderboardStore(makeRemote({ profile: async () => null, save: async () => { writes += 1; throw new Error('Network interrupted'); } }), true);
  await store.refresh();
  assert.equal(await store.saveProfile(row.nickname, true), false);
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(writes, 1);
  assert.match(store.getSnapshot().error ?? '', /refresh before trying again/i);
});

test('a failed save during the initial read ends loading and cannot be overwritten by that old read', async () => {
  const stale = deferred<unknown>();
  const store = new LeaderboardStore(makeRemote({ load: async () => stale.promise, save: async () => { throw { code: '23505' }; } }), true);
  const reading = store.refresh();
  assert.equal(await store.saveProfile('Taken Name', true), false);
  assert.equal(store.getSnapshot().status, 'error');
  assert.equal(store.getSnapshot().working, false);
  stale.resolve(board());
  await reading;
  assert.equal(store.getSnapshot().snapshot, null);
  assert.match(store.getSnapshot().error ?? '', /nickname is taken/i);
});

test('a profile response arriving after account teardown cannot set public profile state', async () => {
  const pending = deferred<unknown>();
  const store = new LeaderboardStore(makeRemote({ save: async () => pending.promise }), true);
  const saving = store.saveProfile(row.nickname, true);
  store.stop();
  pending.resolve(profile());
  assert.equal(await saving, false);
  assert.equal(store.getSnapshot().profile, null);
  assert.equal(store.getSnapshot().snapshot, null);
});

test('read failures recover on explicit refresh and missing migrations are unavailable', async () => {
  let calls = 0;
  const store = new LeaderboardStore(makeRemote({ load: async () => { if (++calls === 1) throw new Error('Offline'); return board(); } }), true);
  await store.refresh();
  assert.equal(store.getSnapshot().status, 'error');
  await store.refresh();
  assert.equal(store.getSnapshot().status, 'ready');
  assert.equal(store.getSnapshot().error, null);
  for (const code of ['PGRST202', '42883', '42P01']) {
    const unavailable = new LeaderboardStore(makeRemote({ load: async () => { throw { code }; } }), true);
    await unavailable.refresh();
    assert.equal(unavailable.getSnapshot().status, 'unavailable');
    assert.match(unavailable.getSnapshot().error ?? '', /not available yet/i);
  }
});

const guestAuth: ReturnType<typeof useAuth> = { user: null, ready: true, working: false, error: null, configured: true, signIn: async () => {}, signOut: async () => {} };
const progress: ReturnType<typeof useStudyProgress> = { study: structuredClone(emptyState), ready: true, saved: true, status: 'local', error: null, pending: 0, canImport: false, recordAnswer: () => assert.fail('Viewing rankings must not record answers'), restartPass: () => {}, importGuest: () => {}, retry: () => {} };
const readyState = (): LeaderboardState => ({ snapshot: board(), profile: profile(), status: 'ready', working: false, error: null, updatedAt: 1 });
const signedInAuth = { ...guestAuth, user: { id: 'private-user', email: 'secret@example.com', user_metadata: { full_name: 'Private Google Name' } } } as ReturnType<typeof useAuth>;
const renderPage = (state: LeaderboardState, auth = guestAuth) => renderToStaticMarkup(createElement(LeaderboardPage, { auth, progress, board: state, onRefresh: () => {}, onSaveProfile: async () => false, onAccount: () => {} }));

test('the public board uses a semantic ranking table with shared ranks and a private account CTA', () => {
  const state = readyState();
  state.profile = null;
  state.snapshot = { ...board(), self: null, participants: 2, entries: [{ ...row, is_you: false }, { ...row, nickname: 'Scapula Squad', is_you: false }] };
  const html = renderPage(state);
  assert.match(html, /Top 50/);
  assert.match(html, /<table/);
  assert.match(html, /scope="col">Rank/);
  assert.equal((html.match(/#1</g) ?? []).length, 2);
  assert.match(html, /Go to account/);
  assert.doesNotMatch(html, /Continue with Google|id="leaderboard-nickname"/);
});

test('joined profile shows an own rank outside the top 50 without exposing Google identity', () => {
  const state = readyState();
  state.snapshot = { ...board(), entries: [], participants: 100, self: { ...row, rank: 84 } };
  const html = renderPage(state, signedInAuth);
  assert.match(html, /#84/);
  assert.match(html, /Your public profile/);
  assert.match(html, /Leave leaderboard/);
  assert.doesNotMatch(html, /secret@example.com|Private Google Name|private-user/);
  assert.doesNotMatch(html, /type="checkbox"/);
});

test('new signed-in entrants must explicitly opt into publishing and begin without a Google-derived nickname', () => {
  const state = readyState();
  state.profile = null;
  state.snapshot = { entries: [], self: null, participants: 0, total_questions: 720 };
  const html = renderPage(state, signedInAuth);
  assert.match(html, /The first spot is open/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Publish my nickname, score and rank/);
  assert.match(html, /disabled="">Join leaderboard/);
  assert.doesNotMatch(html, /value="Funny Bone"|Private Google Name|secret@example.com|#1</);
});

test('loading and unavailable boards have distinct status and retry controls without fake scores', () => {
  const state = { ...readyState(), snapshot: null, profile: null };
  const loading = renderPage({ ...state, status: 'loading' });
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /Loading the leaderboard/);
  assert.doesNotMatch(loading, /The first spot is open|Funny Bone/);
  const unavailable = renderPage({ ...state, status: 'unavailable' });
  assert.match(unavailable, /isn’t available yet/);
  assert.match(unavailable, /Try again/);
  assert.doesNotMatch(unavailable, /The first spot is open|Funny Bone/);
  const error = renderPage({ ...state, status: 'error', error: 'Could not refresh the leaderboard.' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Could not refresh the leaderboard/);
});
