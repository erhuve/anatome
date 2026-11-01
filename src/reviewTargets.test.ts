import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { modelPromptPools } from './modelQuiz';
import { recentMissedTargets } from './reviewTargets';
import StudyFlow from './components/StudyFlow';
import type { Attempt } from './study';

const muscle = modelPromptPools.muscles[0];
const bone = modelPromptPools.skeleton[0];
const landmark = modelPromptPools.landmarks.find(prompt => prompt.landmark)!;
const attempt = (questionId: string, correct: boolean, at: number): Attempt => ({ questionId, correct, at, category: 'model' });

test('recent review resolves actual targets across collections, deduplicates and excludes retired prompts', () => {
  const targets = recentMissedTargets([
    attempt(muscle.id, false, 1), attempt(bone.id, false, 2),
    attempt(landmark.id, false, 3), attempt(muscle.id, false, 4),
    attempt('retired-target', false, 5),
  ]);
  assert.deepEqual(targets.map(item => item.prompt.collection), ['muscles', 'landmarks', 'skeleton']);
  assert.deepEqual(targets.map(item => item.at), [4, 3, 2]);
  assert.equal(targets[1].prompt.landmark, landmark.landmark);
  assert.equal(targets[2].prompt.partId, bone.partId);
});

test('a successful later self-check removes a miss even with unordered history', () => {
  assert.deepEqual(recentMissedTargets([
    attempt(bone.id, true, 20), attempt(bone.id, false, 10),
  ]), []);
  assert.deepEqual(recentMissedTargets([
    attempt(bone.id, true, 20), attempt(bone.id, false, 30),
  ]).map(item => item.at), [30]);
});

test('review list limits the latest misses without excluding collections or mutating history', () => {
  const history = modelPromptPools.skeleton.slice(0, 8).map((prompt, index) => attempt(prompt.id, false, index));
  const snapshot = structuredClone(history);
  assert.equal(recentMissedTargets(history).length, 5);
  assert.equal(recentMissedTargets(history)[0].at, 7);
  assert.deepEqual(history, snapshot);
});

test('opening study shows the selected structure and reference without recording an answer', () => {
  for (const prompt of [muscle, bone, landmark]) {
    let recorded = 0;
    const markup = renderToStaticMarkup(createElement(StudyFlow, {
      targets: [prompt], answerMode: 'typed', onAnswer: () => { recorded++; }, onClose: () => {},
    })).replace(/<!--.*?-->/g, '');
    assert.ok(markup.includes(prompt.answer));
    assert.ok(markup.includes(prompt.source));
    assert.match(markup, /Interactive 3D study specimen/);
    assert.match(markup, /Hide name &amp; test myself/);
    assert.match(markup, /Back to practice/);
    assert.doesNotMatch(markup, /id="study-answer"|class="answer-options"|self-checks correct/);
    assert.equal(recorded, 0);
  }
});
