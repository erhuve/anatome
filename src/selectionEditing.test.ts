import test from 'node:test';
import assert from 'node:assert/strict';
import { editSelection, findSelectionTargets } from './selectionEditing';
import { modelPromptPools } from './modelQuiz';
import { selectedPromptIds } from './quizSelection';

test('adding and removing a filtered group preserves hidden selections and other collections', () => {
  const [first, second, hidden] = modelPromptPools.muscles;
  const bone = modelPromptPools.skeleton[0].id;
  const initial = { muscles: [first.id, hidden.id], skeleton: [bone] };
  const added = editSelection('muscles', initial, [first.id, second.id], 'add');
  assert.deepEqual(new Set(selectedPromptIds('muscles', added)), new Set([first.id, second.id, hidden.id]));
  const removed = editSelection('muscles', added, [first.id, second.id], 'remove');
  assert.deepEqual(selectedPromptIds('muscles', removed), [hidden.id]);
  assert.deepEqual(removed.skeleton, [bone]);
  assert.deepEqual(initial.muscles, [first.id, hidden.id]);
});

test('editing groups ignores duplicate, retired and cross-collection ids', () => {
  const id = modelPromptPools.landmarks[0].id;
  const changed = editSelection('landmarks', { landmarks: [] }, [id, id, 'retired', modelPromptPools.muscles[0].id], 'add');
  assert.deepEqual(selectedPromptIds('landmarks', changed), [id]);
});

test('select all retains automatic model inclusion and clearing all is explicitly empty', () => {
  const all = modelPromptPools.skeleton.map(prompt => prompt.id);
  assert.equal(editSelection('skeleton', { skeleton: [] }, all, 'add').skeleton, null);
  assert.deepEqual(editSelection('skeleton', {}, all, 'remove').skeleton, []);
});

test('structure searches identify the named target without also selecting its section neighbors', () => {
  assert.deepEqual(findSelectionTargets(modelPromptPools.skeleton, 'left radius').map(prompt => prompt.answer), ['Left radius']);
  const carpals = findSelectionTargets(modelPromptPools.skeleton, 'carpals');
  assert.equal(carpals.length, 16);
  assert.ok(carpals.every(prompt => prompt.group === 'Carpals'));
});

test('section names and partial names still find targets for a custom selection', () => {
  assert.equal(findSelectionTargets(modelPromptPools.skeleton, 'wrist carpals').length, 16);
  assert.deepEqual(findSelectionTargets(modelPromptPools.skeleton, 'left scaph').map(prompt => prompt.answer), ['Left scaphoid']);
  assert.deepEqual(findSelectionTargets(modelPromptPools.skeleton, 'nothing matches'), []);
});
