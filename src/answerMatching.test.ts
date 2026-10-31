import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTypedAnswer } from './answerMatching';
import { modelPromptPools } from './modelQuiz';

test('accepts exact labels and formatting without calling them typos', () => {
  for (const input of ['  RIGHT  GLUTEUS MEDIUS ', 'Right gluteus medius muscle', 'Ríght gluteus medius.']) {
    assert.deepEqual(matchTypedAnswer(input, 'Right gluteus medius'), { correct: true, typoAccepted: false });
  }
  assert.deepEqual(matchTypedAnswer('right biceps femoris short head', 'Short head of right biceps femoris'), { correct: true, typoAccepted: false });
  assert.deepEqual(matchTypedAnswer('right external part thyroarytenoid', 'Right external part of thyro-arytenoid'), { correct: true, typoAccepted: false });
  assert.deepEqual(matchTypedAnswer('right lumbrical of hand', 'Right lumbrical muscles of hand'), { correct: true, typoAccepted: false });
});

test('allows modest spelling mistakes and adjacent transpositions', () => {
  for (const [input, expected] of [
    ['diaphram', 'Diaphragm'],
    ['rigth gluteus medius', 'Right gluteus medius'],
    ['right sternocleidomastiod', 'Right sternocleidomastoid'],
    ['right femr', 'Right femur'],
    ['left internal intercsotal', 'Left internal intercostal muscles'],
    ['right teres majro', 'Right teres major'],
  ]) {
    assert.deepEqual(matchTypedAnswer(input, expected), { correct: true, typoAccepted: true }, input);
  }
});

test('requires identifying side, part and directional qualifiers', () => {
  for (const [input, expected] of [
    ['gluteus medius', 'Right gluteus medius'],
    ['left gluteus medius', 'Right gluteus medius'],
    ['right teres major', 'Right teres minor'],
    ['right gluteus minimus', 'Right gluteus medius'],
    ['right tibialis posterior', 'Right tibialis anterior'],
    ['right adductor pollicis', 'Right abductor pollicis'],
    ['right biceps femoris', 'Short head of right biceps femoris'],
    ['right long head biceps femoris', 'Short head of right biceps femoris'],
    ['medial condyle', 'Lateral condyle'],
    ['left lumbrical muscles of foot', 'Left lumbrical muscles of hand'],
  ]) assert.equal(matchTypedAnswer(input, expected).correct, false, `${input} / ${expected}`);
});

test('does not forgive a different number, digit or vertebral level', () => {
  for (const [input, expected] of [
    ['right sixth rib', 'Right fifth rib'],
    ['right 6 rib', 'Right 5 rib'],
    ['C7 vertebra', 'C6 vertebra'],
    ['fourth thoracic vertebra', 'Fourth lumbar vertebra'],
    ['distal phalanx of left ring finger', 'Distal phalanx of left little finger'],
  ]) assert.equal(matchTypedAnswer(input, expected).correct, false, input);
});

test('rejects short-word guesses, incomplete names and excessive misspellings', () => {
  for (const [input, expected] of [
    ['right rip', 'Right rib'], ['una', 'Ulna'], ['diap', 'Diaphragm'],
    ['right fmr', 'Right femur'], ['right gluteus', 'Right gluteus maximus'],
    ['', 'Right'], ['  ', 'Right'], ['the muscle', 'Right'],
    ['x'.repeat(201), 'Diaphragm'],
  ]) assert.equal(matchTypedAnswer(input, expected).correct, false, input);
});

test('a different valid label or an ambiguous near match never receives credit', () => {
  assert.equal(matchTypedAnswer('right trapezoid', 'Right trapezium', ['Right trapezoid']).correct, false);
  assert.equal(matchTypedAnswer('right capitat', 'Right capitate', ['Right capital']).correct, false);
  assert.deepEqual(matchTypedAnswer('right capitate', 'Right capitate', ['Right capital']), { correct: true, typoAccepted: false });
});

test('every actual prompt label is accepted, and opposite-side answers stay incorrect', () => {
  for (const prompts of Object.values(modelPromptPools)) {
    const labels = prompts.map(prompt => prompt.answer);
    for (const prompt of prompts) {
      assert.deepEqual(matchTypedAnswer(prompt.answer, prompt.answer, labels), { correct: true, typoAccepted: false });
      if (/\bright\b/i.test(prompt.answer)) {
        assert.equal(matchTypedAnswer(prompt.answer.replace(/\bright\b/i, 'Left'), prompt.answer, labels).correct, false, prompt.answer);
      }
    }
  }
});
