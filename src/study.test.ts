import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, recordAttempt, makeSession, readState, writeState } from './study.ts';
import { modelPromptPools } from './modelQuiz.ts';
import { coverModelPrompt, modelScopeKey, getModelPass } from './modelPass.ts';
test('a miss resets successful retrieval intervals and returns after ten minutes', () => {
  const first = recordAttempt(emptyState, 'femur', 'bones', true, 1000);
  const second = recordAttempt(first, 'femur', 'bones', true, 86402000);
  assert.equal(second.review.femur.interval, 3);
  const missed = recordAttempt(second, 'femur', 'bones', false, 3000);
  assert.equal(missed.review.femur.streak, 0);
  assert.equal(missed.review.femur.due, 603000);
  assert.equal(first.attempts.length, 1);
});
test('sessions prioritize due recall then unseen material without duplicates', () => {
  const state = { ...emptyState, review: { a: { due: 0, interval: 1, streak: 1 }, b: { due: 999999, interval: 3, streak: 2 } } };
  const queue = makeSession([{ id: 'a' }, { id: 'b' }, { id: 'c' }], state, 3, 1000);
  assert.deepEqual(queue.map(q => q.id), ['a', 'c', 'b']);
});

test('early voluntary recall does not postpone a due review or inflate the interval', () => {
  const first = recordAttempt(emptyState, 'a', 'bones', true, 1000);
  const repeated = recordAttempt(first, 'a', 'bones', true, 2000);
  assert.deepEqual(repeated.review.a, first.review.a);
  assert.equal(repeated.attempts.length, 2);
});

test('browser storage retains normalized pass coverage and existing study data across reloads', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  try {
    const id = modelPromptPools.muscles[0].id;
    const state = {
      ...structuredClone(emptyState),
      notes: [{ id: 'old-note', title: 'A saved connection', body: 'Keep this note.', created: 1000 }],
      studied: ['femur-head'],
      modelPasses: coverModelPrompt(undefined, 'muscles', id),
    };
    assert.equal(writeState(state), true);
    const reloaded = readState();
    assert.deepEqual(reloaded.modelPasses, state.modelPasses);
    assert.deepEqual(reloaded.notes, state.notes);
    assert.deepEqual(reloaded.studied, state.studied);

    storage.set('anatome-study-v1', JSON.stringify({ ...state, modelPasses: { muscles: { round: 2, coveredIds: [id, id, 'retired-prompt'] } } }));
    assert.deepEqual(readState().modelPasses, { muscles: { round: 2, coveredIds: [id] } });

    const legacy = { ...state } as Partial<typeof state>;
    delete legacy.modelPasses;
    storage.set('anatome-study-v1', JSON.stringify(legacy));
    assert.deepEqual(readState().modelPasses, {});
    assert.deepEqual(readState().notes, state.notes);

    legacy.attempts = [
      { questionId: id, correct: true, category: 'muscles', at: 1000 },
      { questionId: id, correct: false, category: 'muscles', at: 2000 },
      { questionId: 'old-reference-question', correct: true, category: 'bones', at: 3000 },
    ];
    storage.set('anatome-study-v1', JSON.stringify(legacy));
    assert.deepEqual(readState().modelPasses, { muscles: { round: 1, coveredIds: [id] } });

    storage.set('anatome-study-v1', JSON.stringify({ ...legacy, modelPasses: { muscles: { round: 2, coveredIds: [] } } }));
    assert.deepEqual(readState().modelPasses, { muscles: { round: 2, coveredIds: [] } });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});


test('guest browser storage retains custom selection passes independently of legacy base coverage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
  try {
    const ids = modelPromptPools.muscles.slice(0, 2).map(prompt => prompt.id);
    const scope = modelScopeKey('muscles', ids);
    let passes = coverModelPrompt(undefined, 'muscles', ids[0]);
    passes = coverModelPrompt(passes, 'muscles', ids[1], scope);
    assert.ok(writeState({ ...structuredClone(emptyState), modelPasses: passes }));
    const saved = readState();
    assert.deepEqual(getModelPass(saved.modelPasses, 'muscles').coveredIds, [ids[0]]);
    assert.deepEqual(getModelPass(saved.modelPasses, 'muscles', scope).coveredIds, [ids[1]]);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
