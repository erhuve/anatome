import test from 'node:test';
import assert from 'node:assert/strict';
import { modelPromptPools, type ModelCollection } from './modelQuiz.ts';
import {
  getModelPass,
  modelScopeKey,
  normalizeModelPasses,
  isModelPassScope,
  coverModelPrompt,
  restartModelPass,
  remainingModelCount,
  type ModelPasses,
} from './modelPass.ts';

const collections: ModelCollection[] = ['muscles', 'skeleton', 'landmarks'];
const ids = (collection: ModelCollection) => modelPromptPools[collection].map(prompt => prompt.id);

test('a new collection starts in round one with its entire live pool remaining', () => {
  for (const collection of collections) {
    assert.deepEqual(getModelPass(undefined, collection), { round: 1, coveredIds: [] });
    assert.equal(remainingModelCount(undefined, collection), ids(collection).length);
  }
});

test('coverage survives JSON reloads and switching collections across short sets', () => {
  const muscleSet = ids('muscles').slice(0, 5);
  const skeletonSet = ids('skeleton').slice(0, 3);
  let saved: ModelPasses = {};
  for (const id of muscleSet) saved = coverModelPrompt(saved, 'muscles', id);
  saved = JSON.parse(JSON.stringify(saved)) as ModelPasses;
  for (const id of skeletonSet) saved = coverModelPrompt(saved, 'skeleton', id);
  saved = JSON.parse(JSON.stringify(saved)) as ModelPasses;
  for (const id of ids('muscles').slice(5, 10)) saved = coverModelPrompt(saved, 'muscles', id);
  assert.deepEqual(getModelPass(saved, 'muscles').coveredIds, ids('muscles').slice(0, 10));
  assert.deepEqual(getModelPass(saved, 'skeleton').coveredIds, skeletonSet);
  assert.equal(getModelPass(saved, 'landmarks').coveredIds.length, 0);
  assert.equal(remainingModelCount(saved, 'muscles'), ids('muscles').length - 10);
});

test('a completed pass stays completed and duplicate or unknown IDs add no coverage', () => {
  for (const collection of collections) {
    let saved: ModelPasses | undefined;
    for (const id of ids(collection)) {
      saved = coverModelPrompt(saved, collection, id);
      saved = coverModelPrompt(saved, collection, id);
    }
    saved = coverModelPrompt(saved, collection, 'retired-or-unknown-prompt');
    const pass = getModelPass(saved, collection);
    assert.equal(pass.round, 1);
    assert.deepEqual(pass.coveredIds, ids(collection));
    assert.equal(remainingModelCount(saved, collection), 0);
    assert.deepEqual(getModelPass(JSON.parse(JSON.stringify(saved)), collection), pass);
  }
});

test('coverage changes are immutable and leave other collections untouched', () => {
  const saved: ModelPasses = {
    muscles: { round: 2, coveredIds: ids('muscles').slice(0, 1) },
    skeleton: { round: 4, coveredIds: ids('skeleton').slice(0, 2) },
  };
  const before = JSON.stringify(saved);
  Object.freeze(saved.muscles!.coveredIds);
  Object.freeze(saved.muscles);
  Object.freeze(saved.skeleton!.coveredIds);
  Object.freeze(saved.skeleton);
  Object.freeze(saved);

  const next = coverModelPrompt(saved, 'muscles', ids('muscles')[1]);
  assert.notEqual(next, saved);
  assert.notEqual(next.muscles, saved.muscles);
  assert.equal(next.skeleton, saved.skeleton);
  assert.equal(next.muscles!.round, 2);
  assert.equal(JSON.stringify(saved), before);

  const snapshot = getModelPass(next, 'muscles');
  snapshot.coveredIds.push('external-mutation');
  assert.equal(next.muscles!.coveredIds.includes('external-mutation'), false);
});

test('malformed saved containers, rounds, and coverage normalize safely', () => {
  for (const malformed of [undefined, null, [], 'bad', 7, { muscles: null }, { muscles: [] }]) {
    assert.deepEqual(getModelPass(malformed as ModelPasses | undefined, 'muscles'), { round: 1, coveredIds: [] });
  }
  for (const round of [undefined, null, 0, -1, 1.5, NaN, Infinity, '3', Number.MAX_SAFE_INTEGER + 1]) {
    const malformed = { muscles: { round, coveredIds: [ids('muscles')[0]] } };
    assert.deepEqual(getModelPass(malformed as ModelPasses, 'muscles'), { round: 1, coveredIds: [ids('muscles')[0]] });
  }
  for (const coveredIds of [undefined, null, {}, 'not-an-array', 8]) {
    const malformed = { muscles: { round: 3, coveredIds } };
    assert.deepEqual(getModelPass(malformed as ModelPasses, 'muscles'), { round: 3, coveredIds: [] });
  }
  const malformed = { muscles: { round: 3, coveredIds: [ids('muscles')[0], null, {}, 3, ids('skeleton')[0], ids('muscles')[0]] } };
  assert.deepEqual(getModelPass(malformed as ModelPasses, 'muscles'), { round: 3, coveredIds: [ids('muscles')[0]] });
  assert.deepEqual(getModelPass(coverModelPrompt(null as unknown as ModelPasses, 'muscles', ids('muscles')[0]), 'muscles').coveredIds, [ids('muscles')[0]]);
});

test('retired IDs are removed and newly available targets remain uncovered', () => {
  const live = ids('muscles');
  // Simulates a saved completed pool after one old target was retired and a
  // currently available target was added. Saved completion cannot hide it.
  const saved: ModelPasses = { muscles: { round: 5, coveredIds: [...live.slice(0, -1), 'retired-source-target'] } };
  assert.deepEqual(getModelPass(saved, 'muscles'), { round: 5, coveredIds: live.slice(0, -1) });
  assert.equal(remainingModelCount(saved, 'muscles'), 1);
  const completed = coverModelPrompt(saved, 'muscles', live.at(-1)!);
  assert.equal(remainingModelCount(completed, 'muscles'), 0);
  assert.equal(getModelPass(completed, 'muscles').round, 5);
});

test('explicit restart clears only the chosen collection and increments only its round', () => {
  const saved: ModelPasses = {
    muscles: { round: 3, coveredIds: ids('muscles') },
    skeleton: { round: 7, coveredIds: ids('skeleton').slice(0, 4) },
    landmarks: { round: 2, coveredIds: ids('landmarks').slice(0, 1) },
  };
  const before = JSON.stringify(saved);
  const next = restartModelPass(saved, 'muscles');
  assert.deepEqual(getModelPass(next, 'muscles'), { round: 4, coveredIds: [] });
  assert.equal(remainingModelCount(next, 'muscles'), ids('muscles').length);
  assert.equal(next.skeleton, saved.skeleton);
  assert.equal(next.landmarks, saved.landmarks);
  assert.equal(JSON.stringify(saved), before);
  assert.deepEqual(getModelPass(restartModelPass(undefined, 'landmarks'), 'landmarks'), { round: 2, coveredIds: [] });
});


test('selection scope keys are stable and distinguish different sets without altering base namespaces', () => {
  const selected = ids('muscles').slice(0, 4);
  const key = modelScopeKey('muscles', selected);
  assert.match(key, /^muscles::[a-f0-9]{16}$/);
  assert.equal(modelScopeKey('muscles'), 'muscles');
  assert.equal(modelScopeKey('muscles', null), 'muscles');
  assert.equal(modelScopeKey('muscles', [...selected].reverse().concat(selected[0])), key);
  assert.notEqual(modelScopeKey('muscles', selected.slice(1)), key);
  assert.notEqual(modelScopeKey('muscles', []), 'muscles');
  assert.ok(isModelPassScope(key, 'muscles'));
  assert.equal(isModelPassScope(key, 'skeleton'), false);
});

test('custom selection passes and their restarts leave all-collection and other selections untouched', () => {
  const selectedA = ids('muscles').slice(0, 3), selectedB = ids('muscles').slice(3, 6);
  const a = modelScopeKey('muscles', selectedA), b = modelScopeKey('muscles', selectedB);
  let saved = coverModelPrompt(undefined, 'muscles', ids('muscles')[8]);
  saved = coverModelPrompt(saved, 'muscles', selectedA[0], a);
  saved = coverModelPrompt(saved, 'muscles', selectedB[0], b);
  const before = JSON.parse(JSON.stringify(saved)) as ModelPasses;
  const reset = restartModelPass(saved, 'muscles', a);
  assert.deepEqual(getModelPass(reset, 'muscles', a), { round: 2, coveredIds: [] });
  assert.deepEqual(getModelPass(reset, 'muscles', b), getModelPass(before, 'muscles', b));
  assert.deepEqual(getModelPass(reset, 'muscles'), getModelPass(before, 'muscles'));
  assert.equal(remainingModelCount(saved, 'muscles', selectedA, a), 2);
  assert.equal(remainingModelCount(saved, 'muscles', [], a), 0);
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), before);
  assert.deepEqual(getModelPass(JSON.parse(JSON.stringify(saved)), 'muscles', b).coveredIds, [selectedB[0]]);
});

test('scope normalization retains valid custom passes but removes stale, foreign and malformed data', () => {
  const key = modelScopeKey('muscles', [ids('muscles')[0]]);
  const saved = normalizeModelPasses({
    muscles: { round: 2, coveredIds: [ids('muscles')[1]] },
    [key]: { round: 3, coveredIds: [ids('muscles')[0], ids('muscles')[0], ids('skeleton')[0], 'retired'] },
    'muscles::not-a-fingerprint': { round: 4, coveredIds: [] },
    'other::0123456789abcdef': { round: 4, coveredIds: [] },
  });
  assert.deepEqual(saved[key], { round: 3, coveredIds: [ids('muscles')[0]] });
  assert.deepEqual(saved.muscles, { round: 2, coveredIds: [ids('muscles')[1]] });
  assert.equal(Object.keys(saved).length, 2);
  assert.deepEqual(coverModelPrompt(saved, 'skeleton', ids('skeleton')[0], key), saved);
  assert.deepEqual(restartModelPass(saved, 'skeleton', key), saved);
});
