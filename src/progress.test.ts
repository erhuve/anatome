import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, recordAttempt, type StudyState } from './study.ts';
import { modelPromptPools } from './modelQuiz.ts';
import { getModelPass, modelScopeKey } from './modelPass.ts';
import { mergeEvents, normalizeStudy, parseProgressEvent, ProgressStore, replayProgress, type ProgressEvent, type ProgressRemote, type ProgressStorage } from './progress.ts';

const muscleA = modelPromptPools.muscles[0].id;
const muscleB = modelPromptPools.muscles[1].id;
const landmark = modelPromptPools.landmarks[0].id;
const attempt = (id: string, questionId = muscleA, round: number | null = 1, at = 1000): ProgressEvent => ({ id, kind: 'attempt', occurred_at: at, payload: { questionId, collection: 'muscles', correct: true, at, round } });
function memoryStorage(): ProgressStorage {
  const items = new Map<string, string>();
  return {
    get length() { return items.size; },
    key: index => [...items.keys()][index] ?? null,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: key => { items.delete(key); },
  };
}
function makeStore(userId: string | null, remote: ProgressRemote | null, storage = memoryStorage(), guest = structuredClone(emptyState)) {
  let sequence = 0;
  return new ProgressStore(userId, remote, true, storage, () => guest, () => true, () => `test-${++sequence}`);
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function until(predicate: () => boolean) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await tick(); }
  assert.fail('Timed out waiting for store state');
}

test('event retries and remote merge preserve individual answers exactly once', () => {
  const a = attempt('answer-a');
  const b = attempt('answer-b', muscleB, 1, 2000);
  assert.equal(replayProgress(mergeEvents([a, b], [a])).attempts.length, 2);
  assert.deepEqual(getModelPass(replayProgress([b, a, a]).modelPasses, 'muscles').coveredIds.sort(), [muscleA, muscleB].sort());
});

test('late answers and repeated concurrent restarts cannot undo a newer pass', () => {
  const reset: ProgressEvent = { id: 'reset', kind: 'restart', occurred_at: 2000, payload: { collection: 'muscles', round: 2 } };
  const old = attempt('late-old', muscleB, 1, 4000);
  const newAnswer = attempt('new-answer', muscleA, 2, 3000);
  const secondReset = { ...reset, id: 'other-reset', occurred_at: 5000 };
  const state = replayProgress([old, reset, newAnswer, secondReset]);
  assert.deepEqual(getModelPass(state.modelPasses, 'muscles'), { round: 2, coveredIds: [muscleA] });
  assert.equal(state.attempts.length, 2);
});

test('intentional reviews update answer history without adding pass coverage', () => {
  const state = replayProgress([attempt('review', muscleA, null)]);
  assert.equal(state.attempts.length, 1);
  assert.deepEqual(getModelPass(state.modelPasses, 'muscles').coveredIds, []);
});

test('overlapping imports deduplicate legacy answers and preserve notes, scheduling, and coverage', () => {
  const initial = recordAttempt(structuredClone(emptyState), muscleA, 'muscles', true, 1000);
  const newer: StudyState = { ...recordAttempt(initial, muscleB, 'muscles', false, 2000), notes: [{ id: 'note', title: 'Keep me', body: 'Body', created: 500 }], studied: ['femur'], checklist: ['bone'], modelPasses: { muscles: { round: 2, coveredIds: [muscleA] } } };
  const events: ProgressEvent[] = [
    { id: 'import-device-a', kind: 'import', occurred_at: 10000, payload: { state: newer } },
    { id: 'import-device-b', kind: 'import', occurred_at: 11000, payload: { state: initial } },
  ];
  const state = replayProgress(events);
  assert.equal(state.attempts.length, 2);
  assert.deepEqual(state.notes, newer.notes);
  assert.deepEqual(state.studied, ['femur']);
  assert.deepEqual(state.checklist, ['bone']);
  assert.deepEqual(state.review, newer.review);
  assert.deepEqual(getModelPass(state.modelPasses, 'muscles'), { round: 2, coveredIds: [muscleA] });
});

test('normalization handles malformed remote data and identifies landmark history correctly', () => {
  assert.equal(parseProgressEvent({ ...attempt('bad'), payload: null }), null);
  assert.equal(parseProgressEvent({ ...attempt('bad'), payload: { ...attempt('bad').payload, round: -1 } }), null);
  assert.deepEqual(normalizeStudy({ attempts: [null, false, { questionId: landmark, correct: true, category: 'bones', at: 5 }], notes: [null], studied: [5, 'bone'], review: { bad: null } }).attempts, [{ questionId: landmark, correct: true, category: 'landmarks', at: 5 }]);
});

test('account stores never implicitly import guest history or expose another account cache', async () => {
  const storage = memoryStorage();
  const guest = recordAttempt(structuredClone(emptyState), muscleA, 'muscles', true, 1000);
  const remote: ProgressRemote = { load: async () => [], insert: async () => {} };
  const first = makeStore('alice', remote, storage, guest);
  first.start();
  await until(() => first.getSnapshot().ready);
  assert.equal(first.getSnapshot().study.attempts.length, 0);
  assert.equal(first.getSnapshot().canImport, true);
  first.importGuest();
  assert.equal(first.getSnapshot().study.attempts.length, 1);
  assert.equal(first.getSnapshot().canImport, false);
  await until(() => first.getSnapshot().pending === 0);
  first.stop();
  const second = makeStore('bob', remote, storage, guest);
  second.start();
  await until(() => second.getSnapshot().ready);
  assert.equal(second.getSnapshot().study.attempts.length, 0);
  second.stop();
});

test('failed uploads keep a durable outbox across reload and retry idempotently', async () => {
  const storage = memoryStorage();
  let failing = false;
  const server = new Map<string, ProgressEvent>();
  const remote: ProgressRemote = {
    load: async () => [...server.values()],
    insert: async (_, events) => { if (failing) throw new Error('Network failure'); for (const event of events) server.set(event.id, event); },
  };
  const first = makeStore('alice', remote, storage);
  first.start();
  await until(() => first.getSnapshot().ready);
  failing = true;
  first.recordAnswer(muscleA, 'muscles', true, true);
  await until(() => first.getSnapshot().status === 'error');
  assert.equal(first.getSnapshot().pending, 1);
  assert.equal(first.getSnapshot().saved, true);
  first.stop();
  failing = false;
  const restored = makeStore('alice', remote, storage);
  assert.equal(restored.getSnapshot().study.attempts.length, 1);
  restored.start();
  await until(() => restored.getSnapshot().status === 'synced');
  assert.equal(restored.getSnapshot().pending, 0);
  assert.equal(server.size, 1);
  assert.equal(restored.getSnapshot().study.attempts.length, 1);
  restored.stop();
});

test('an answer made during an in-flight upload is not removed by its acknowledgement', async () => {
  let release: (() => void) | undefined;
  const server = new Map<string, ProgressEvent>();
  let uploads = 0;
  const remote: ProgressRemote = {
    load: async () => [...server.values()],
    insert: async (_, events) => {
      uploads++;
      if (uploads === 1) await new Promise<void>(resolve => { release = resolve; });
      for (const event of events) server.set(event.id, event);
    },
  };
  const store = makeStore('alice', remote);
  store.start();
  await until(() => store.getSnapshot().ready);
  store.recordAnswer(muscleA, 'muscles', true, true);
  await until(() => !!release);
  store.recordAnswer(muscleB, 'muscles', false, true);
  assert.equal(store.getSnapshot().pending, 2);
  release!();
  await until(() => store.getSnapshot().status === 'synced');
  assert.equal(server.size, 2);
  assert.equal(store.getSnapshot().study.attempts.length, 2);
  store.stop();
});

test('stopped account stores ignore late responses after an account switch', async () => {
  let release: ((events: unknown[]) => void) | undefined;
  const remote: ProgressRemote = { load: async () => new Promise(resolve => { release = resolve; }), insert: async () => {} };
  const alice = makeStore('alice', remote);
  alice.start();
  await until(() => !!release);
  alice.stop();
  const bob = makeStore('bob', { load: async () => [], insert: async () => {} });
  bob.start();
  await until(() => bob.getSnapshot().ready);
  release!([attempt('alice-answer')]);
  await tick();
  assert.equal(bob.getSnapshot().study.attempts.length, 0);
  assert.equal(alice.getSnapshot().ready, false);
  bob.stop();
});

test('storage failures distinguish unsynced in-memory answers from cloud saves', async () => {
  const broken: ProgressStorage = { length: 0, key: () => null, getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('Quota exceeded'); } };
  let failing = false;
  const remote: ProgressRemote = { load: async () => [], insert: async () => { if (failing) throw new Error('Offline'); } };
  const store = makeStore('alice', remote, broken);
  store.start();
  await until(() => store.getSnapshot().ready);
  failing = true;
  store.recordAnswer(muscleA, 'muscles', true, true);
  await until(() => store.getSnapshot().status === 'error');
  assert.equal(store.getSnapshot().saved, false);
  assert.equal(store.getSnapshot().pending, 1);
  failing = false;
  store.retry();
  await until(() => store.getSnapshot().status === 'synced');
  assert.equal(store.getSnapshot().saved, true);
  store.stop();
});

test('per-event journal recovers offline answers after two tabs interleave stale snapshot writes', async () => {
  const backing = memoryStorage();
  let interleave: (() => void) | undefined;
  const storage: ProgressStorage = {
    get length() { return backing.length; }, key: index => backing.key(index), getItem: key => backing.getItem(key), removeItem: key => backing.removeItem(key),
    setItem: (key, value) => {
      if (key === 'anatome-account-v1:alice' && interleave) {
        const callback = interleave;
        interleave = undefined;
        callback();
      }
      backing.setItem(key, value);
    },
  };
  const offline: ProgressRemote = { load: async () => { throw new Error('Offline'); }, insert: async () => { throw new Error('Offline'); } };
  let sequence = 0;
  const create = () => new ProgressStore('alice', offline, true, storage, () => structuredClone(emptyState), () => true, () => `journal-${++sequence}`);
  const tabA = create(); const tabB = create();
  tabA.start(); tabB.start();
  await until(() => tabA.getSnapshot().ready && tabB.getSnapshot().ready);
  interleave = () => tabB.recordAnswer(muscleB, 'muscles', false, true);
  tabA.recordAnswer(muscleA, 'muscles', true, true);
  await until(() => tabA.getSnapshot().status === 'error' && tabB.getSnapshot().status === 'error');
  assert.equal(tabA.getSnapshot().saved, true);
  assert.equal(tabB.getSnapshot().saved, true);
  tabA.stop(); tabB.stop();
  // The stale snapshot only contains A, independently proving recovery uses B's journal.
  const clobbered = JSON.parse(backing.getItem('anatome-account-v1:alice')!);
  assert.equal(clobbered.events.length, 1);
  const reloaded = create();
  assert.equal(reloaded.getSnapshot().study.attempts.length, 2);
  assert.equal(reloaded.getSnapshot().pending, 2);
  reloaded.stop();
});

test('answers push immediately without reloading full history; focus refresh is throttled and manual refresh is forced', async () => {
  let loads = 0;
  let inserts = 0;
  const server = new Map<string, ProgressEvent>();
  const remote: ProgressRemote = {
    load: async () => { loads++; return [...server.values()]; },
    insert: async (_, events) => { inserts++; for (const event of events) server.set(event.id, event); },
  };
  const store = makeStore('alice', remote);
  store.start();
  await until(() => store.getSnapshot().ready);
  assert.equal(loads, 1);
  store.recordAnswer(muscleA, 'muscles', true, true);
  await until(() => store.getSnapshot().status === 'synced');
  store.recordAnswer(muscleB, 'muscles', false, true);
  await until(() => store.getSnapshot().status === 'synced');
  assert.equal(inserts, 2);
  assert.equal(loads, 1);
  store.refresh(); store.refresh();
  await tick();
  assert.equal(loads, 1);
  store.retry();
  await until(() => loads === 2 && store.getSnapshot().status === 'synced');
  store.stop();
});


test('optional selection scopes validate strictly while legacy event payloads remain compatible', () => {
  const scope = modelScopeKey('muscles', [muscleA]);
  const legacy = attempt('legacy-scope');
  assert.deepEqual(parseProgressEvent(legacy), legacy);
  const custom = { ...attempt('custom-scope'), payload: { ...attempt('custom-scope').payload, scope } };
  assert.equal(parseProgressEvent(custom)?.payload.scope, scope);
  for (const invalid of ['muscles::bad', 'skeleton::0123456789abcdef', '__proto__', 3]) {
    assert.equal(parseProgressEvent({ ...custom, payload: { ...custom.payload, scope: invalid } }), null);
    assert.equal(parseProgressEvent({ id: 'restart-invalid', kind: 'restart', occurred_at: 100, payload: { collection: 'muscles', round: 2, scope: invalid } }), null);
  }
});

test('event replay merges rounds independently for base and custom scopes and preserves review-only answers', () => {
  const a = modelScopeKey('muscles', [muscleA]);
  const b = modelScopeKey('muscles', [muscleB]);
  const scoped = (id: string, questionId: string, scope: string, round: number | null, at: number): ProgressEvent => ({ ...attempt(id, questionId, round, at), payload: { ...attempt(id, questionId, round, at).payload, scope } });
  const events: ProgressEvent[] = [
    attempt('base-answer'), scoped('a-first', muscleA, a, 1, 2000), scoped('b-first', muscleB, b, 1, 3000),
    { id: 'a-restart', kind: 'restart', occurred_at: 4000, payload: { collection: 'muscles', round: 2, scope: a } },
    scoped('a-review', muscleA, a, null, 5000), scoped('late-a', muscleA, a, 1, 6000),
  ];
  const state = replayProgress(events);
  assert.deepEqual(getModelPass(state.modelPasses, 'muscles'), { round: 1, coveredIds: [muscleA] });
  assert.deepEqual(getModelPass(state.modelPasses, 'muscles', a), { round: 2, coveredIds: [] });
  assert.deepEqual(getModelPass(state.modelPasses, 'muscles', b), { round: 1, coveredIds: [muscleB] });
  assert.equal(state.attempts.length, 5);
  const normalized = normalizeStudy(state);
  const imported = replayProgress([{ id: 'import-custom', kind: 'import', occurred_at: 8000, payload: { state: normalized } }]);
  assert.deepEqual(imported.modelPasses, state.modelPasses);
});

test('account-scoped custom pass events persist, reload and upload without changing account identity', async () => {
  const scope = modelScopeKey('muscles', [muscleA, muscleB]);
  const storage = memoryStorage();
  const server = new Map<string, ProgressEvent>();
  const users: string[] = [];
  const remote: ProgressRemote = { load: async user => { users.push(user); return [...server.values()]; }, insert: async (user, events) => { users.push(user); for (const event of events) server.set(event.id, event); } };
  const store = makeStore('alice', remote, storage);
  store.start(); await until(() => store.getSnapshot().ready);
  store.recordAnswer(muscleA, 'muscles', true, true);
  store.recordAnswer(muscleB, 'muscles', false, true, scope);
  await until(() => store.getSnapshot().pending === 0);
  assert.deepEqual(getModelPass(store.getSnapshot().study.modelPasses, 'muscles', scope).coveredIds, [muscleB]);
  store.restartPass('muscles', scope);
  await until(() => store.getSnapshot().pending === 0);
  assert.deepEqual(getModelPass(store.getSnapshot().study.modelPasses, 'muscles').coveredIds, [muscleA]);
  store.stop();
  const restored = makeStore('alice', remote, storage);
  assert.deepEqual(getModelPass(restored.getSnapshot().study.modelPasses, 'muscles', scope), { round: 2, coveredIds: [] });
  assert.deepEqual(getModelPass(restored.getSnapshot().study.modelPasses, 'muscles').coveredIds, [muscleA]);
  assert.ok([...server.values()].some(event => event.payload.scope === scope));
  assert.ok([...server.values()].some(event => event.kind === 'attempt' && !Object.hasOwn(event.payload, 'scope')));
  assert.ok(users.every(user => user === 'alice'));
  restored.stop();
});
