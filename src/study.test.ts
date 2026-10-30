import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, recordAttempt, makeSession } from './study.ts';
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
