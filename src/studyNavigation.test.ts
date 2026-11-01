import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { modelPromptPools } from './modelQuiz';
import { findStudyTargets, studyTargetLabel, studyTargetsFor, workspaceUrl } from './studyNavigation';
import StudyFlow from './components/StudyFlow';

test('study browsing includes every selected target across all three collections', () => {
  for (const collection of ['muscles', 'skeleton', 'landmarks'] as const) {
    const pool = modelPromptPools[collection];
    assert.deepEqual(studyTargetsFor(collection, {}), pool);
    assert.deepEqual(studyTargetsFor(collection, { [collection]: [pool[4].id, 'retired', pool[4].id] }), [pool[4]]);
    assert.deepEqual(studyTargetsFor(collection, { [collection]: [] }), []);
  }
});

test('structure search combines name, side, region and bone with a region filter', () => {
  const pool = modelPromptPools.skeleton;
  const left = findStudyTargets(pool, 'left hand', 'forearm-hand');
  assert.ok(left.length > 0);
  assert.ok(left.every(prompt => prompt.side === 'left' && prompt.region === 'forearm-hand'));
  assert.deepEqual(findStudyTargets(pool, 'left hand', 'spine'), []);
  assert.deepEqual(findStudyTargets(pool, '   '), pool);
  const scapula = findStudyTargets(modelPromptPools.landmarks, 'scapula');
  assert.ok(scapula.length > 1);
  assert.ok(scapula.every(prompt => prompt.bone === 'scapula'));
});

test('laterality targets have distinct study labels for the actual specimen', () => {
  const sides = modelPromptPools.landmarks.filter(prompt => !prompt.landmark);
  assert.equal(new Set(sides.map(studyTargetLabel)).size, 3);
  assert.ok(sides.every(prompt => studyTargetLabel(prompt).includes(prompt.bone!)));
});

test('mode and collection survive refresh in the URL while other parameters remain intact', () => {
  const study = workspaceUrl('http://127.0.0.1:5173/?atlas=muscles&other=kept#section', 'study', 'skeleton');
  assert.equal(study.searchParams.get('mode'), 'study');
  assert.equal(study.searchParams.get('atlas'), 'skeleton');
  assert.equal(study.searchParams.get('other'), 'kept');
  assert.equal(study.hash, '#section');
  const quiz = workspaceUrl(study.href, 'quiz', 'landmarks');
  assert.equal(quiz.searchParams.has('mode'), false);
  assert.equal(quiz.searchParams.get('atlas'), 'landmarks');
});

test('reopening general study restores its selected structure without recording practice', () => {
  const targets = modelPromptPools.landmarks;
  const chosen = targets[7];
  let answers = 0;
  const markup = renderToStaticMarkup(createElement(StudyFlow, {
    targets, initialTargetId: chosen.id, general: true, answerMode: 'typed',
    onAnswer: () => { answers++; }, onClose: () => {},
  })).replace(/<!--.*?-->/g, '');
  assert.ok(markup.includes(chosen.answer));
  assert.match(markup, /8 of 20/);
  assert.match(markup, /Browse 20 structures/);
  assert.doesNotMatch(markup, /id="study-answer"|class="answer-options"/);
  assert.equal(answers, 0);
});
