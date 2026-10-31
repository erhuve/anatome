import test from 'node:test';
import assert from 'node:assert/strict';
import { readAnswerMode, writeAnswerMode } from './answerMode';

test('answer mode defaults to typed and is remembered separately for each account', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  try {
    assert.equal(readAnswerMode(null), 'typed');
    assert.equal(writeAnswerMode(null, 'typed'), true);
    assert.equal(writeAnswerMode('account-a', 'choice'), true);
    assert.equal(readAnswerMode(null), 'typed');
    assert.equal(readAnswerMode('account-a'), 'choice');
    assert.equal(readAnswerMode('account-b'), 'typed');
    storage.set('anatome-answer-mode-v1:account-b', 'invalid');
    assert.equal(readAnswerMode('account-b'), 'typed');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('unavailable browser storage keeps the quiz usable with the typed default', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('Storage blocked'); } });
  try {
    assert.equal(readAnswerMode(null), 'typed');
    assert.equal(writeAnswerMode(null, 'typed'), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
