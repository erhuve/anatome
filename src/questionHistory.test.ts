import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { modelPromptPools } from './modelQuiz';
import { memeLessonCatalog, memeLessons } from './memeLessons';
import { questions } from './content';
import { questionHistory, type HistoryFilters } from './questionHistory';
import type { Attempt } from './study';
import QuestionHistory from './components/QuestionHistory';

const all: HistoryFilters = { search: '', collection: 'all', result: 'all' };
const muscle = modelPromptPools.muscles[0];
const bone = modelPromptPools.skeleton[0];
const attempt = (questionId: string, correct: boolean, at: number): Attempt => ({ questionId, correct, at, category: 'model' });

test('full history keeps every repeated attempt beyond five, newest first, without changing stored history', () => {
  const attempts = Array.from({ length: 61 }, (_, i) => attempt(muscle.id, i % 2 === 0, i * 1000));
  const before = structuredClone(attempts);
  const history = questionHistory(attempts, all);
  assert.equal(history.length, 61);
  assert.equal(history[0].at, 60000);
  assert.equal(history.at(-1)?.at, 0);
  assert.equal(history.filter(item => item.correct).length, 31);
  assert.equal(history[0].model, muscle);
  assert.deepEqual(attempts, before);
  assert.deepEqual(questionHistory([attempt(muscle.id, false, 1), attempt(muscle.id, true, 1)], all).map(item => item.correct), [true, false]);
});

test('history searches and filters model and meme attempts together', () => {
  const lesson = memeLessons[0];
  const question = lesson.questions[0];
  const attempts = [attempt(muscle.id, false, 10), attempt(bone.id, true, 20), attempt(question.id, true, 30)];
  assert.equal(questionHistory(attempts, all).length, 3);
  assert.deepEqual(questionHistory(attempts, { ...all, collection: 'skeleton', result: 'correct' }).map(item => item.questionId), [bone.id]);
  assert.deepEqual(questionHistory(attempts, { ...all, result: 'missed' }).map(item => item.questionId), [muscle.id]);
  assert.equal(questionHistory(attempts, { ...all, search: `  ${muscle.answer.toUpperCase()}  ` })[0].model, muscle);
  assert.equal(questionHistory(attempts, { ...all, collection: 'memes', search: question.answer })[0].memeId, lesson.id);
  assert.equal(questionHistory(attempts, { ...all, search: 'no matching question anywhere' }).length, 0);
});

test('legacy and retired questions remain in full history without linking to unavailable quizzes', () => {
  const retired = memeLessonCatalog.find(lesson => !memeLessons.includes(lesson))!;
  const legacy = questions[0];
  const history = questionHistory([
    attempt('retired-model-id', false, 100), attempt(retired.questions[0].id, true, 200), attempt(legacy.id, true, 300),
  ], all);
  assert.equal(history.length, 3);
  assert.equal(history[0].title, legacy.prompt);
  assert.equal(history[0].answer, legacy.options[legacy.answer]);
  assert.equal(history[1].title, retired.questions[0].prompt);
  assert.equal(history[1].memeId, undefined);
  assert.match(history[2].title, /Archived question · retired-model-id/);
});

test('history renders a full first page and navigation to older attempts, with clear results and study actions', () => {
  const attempts = Array.from({ length: 61 }, (_, i) => attempt(muscle.id, i % 2 === 0, i * 1000));
  let studied = 0;
  const html = renderToStaticMarkup(createElement(QuestionHistory, { attempts, onStudy: () => { studied++; } }));
  assert.match(html, /61 attempts/);
  assert.match(html, /1–20 of 61 attempts/);
  assert.match(html, /Page 1 of 4/);
  assert.equal((html.match(/<li>/g) ?? []).length, 20);
  assert.match(html, /Correct/);
  assert.match(html, /Missed \/ revealed/);
  assert.match(html, /Study structure/);
  assert.match(html, /<time dateTime=/);
  assert.equal(studied, 0);
});

test('empty history explains where attempts will appear without offering empty pagination', () => {
  const html = renderToStaticMarkup(createElement(QuestionHistory, { attempts: [], onStudy: () => {} }));
  assert.match(html, /Your answered and revealed questions will appear here/);
  assert.doesNotMatch(html, /Question history pages|history-filters/);
});
