import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuizStudio } from './App';
import { modelPromptPools, type ModelCollection } from './modelQuiz';
import { modelScopeKey } from './modelPass';
import { emptyState } from './study';
import type { QuizSelections } from './quizSelection';
import type { useAuth } from './useAuth';
import type { useStudyProgress } from './useStudyProgress';
import type { AnswerMode } from './answerMode';

function renderSavedPass(collection: ModelCollection, coveredIds: string[], round = 1, selections: QuizSelections = {}, mode: AnswerMode | null = null) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const study = { ...structuredClone(emptyState), modelPasses: { [modelScopeKey(collection, selections[collection])]: { round, coveredIds } } };
  const auth: ReturnType<typeof useAuth> = { user:null,ready:true,working:false,error:null,configured:false,signIn:async()=>{},signOut:async()=>{} };
  const progress: ReturnType<typeof useStudyProgress> = { study, ready:true,saved:true,status:'local',error:null,pending:0,canImport:false,recordAnswer:()=>{},restartPass:()=>{},importGuest:()=>{},retry:()=>{} };
  try {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { search: `?atlas=${collection}` } },
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (key: string) => key.startsWith('anatome-answer-mode-') ? mode : JSON.stringify(selections) },
    });
    // Effects do not run in server rendering: no WebGL, browser or network is used.
    return renderToStaticMarkup(createElement(QuizStudio, {auth,progress})).replace(/<!--.*?-->/g, '');
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('refreshing an exhausted muscle pass renders completion and an explicit next-pass action', () => {
  const all = modelPromptPools.muscles.map(prompt => prompt.id);
  const markup = renderSavedPass('muscles', all);
  assert.match(markup, /PASS COMPLETE/);
  assert.match(markup, /Start pass 2/);
  assert.ok(markup.includes(`All ${all.length} covered.`));
  assert.ok(markup.includes(`Pass 1: ${all.length} of ${all.length} targets covered`));
  assert.doesNotMatch(markup, /class="answer-options"/);
  assert.doesNotMatch(markup, /mastered|mastery/i);
});

test('typed mode renders a free-text field without exposing answer choices', () => {
  const target = modelPromptPools.muscles[0];
  const markup = renderSavedPass('muscles', [], 1, { muscles: [target.id] }, 'typed');
  assert.match(markup, /aria-label="Answer mode"/);
  assert.match(markup, /aria-pressed="true"[^>]*>Type answer/);
  assert.match(markup, /id="typed-answer"/);
  assert.match(markup, /autoComplete="off"/);
  assert.match(markup, /spellCheck="false"/);
  assert.match(markup, /Small typos are okay/);
  assert.match(markup, /Check answer/);
  assert.doesNotMatch(markup, /class="answer-options"|class="answer-option"|<datalist/);
  assert.ok(!markup.includes(target.answer));
});

test('type answer is the default when no answer mode is saved', () => {
  const markup = renderSavedPass('landmarks', []);
  assert.match(markup, /aria-pressed="true"[^>]*>Type answer/);
  assert.match(markup, /id="typed-answer"/);
  assert.doesNotMatch(markup, /class="answer-options"/);
});

test('a saved multiple-choice preference still renders choices', () => {
  const markup = renderSavedPass('landmarks', [], 1, {}, 'choice');
  assert.match(markup, /aria-pressed="true"[^>]*>Multiple choice/);
  assert.match(markup, /class="answer-options"/);
  assert.doesNotMatch(markup, /id="typed-answer"/);
});

test('a custom selection renders its own shorter pass and settings control', () => {
  const ids = modelPromptPools.muscles.slice(0, 3).map(prompt => prompt.id);
  const markup = renderSavedPass('muscles', [ids[0]], 2, {muscles:ids});
  assert.match(markup, /Study settings/);
  assert.match(markup, /3 selected targets/);
  assert.match(markup, /Selection pass 2/);
  assert.match(markup, /Pass 2: 1 of 3 targets covered/);
  assert.match(markup, /class="question-total">\/\s*02</);
});

test('a stale empty selection offers settings instead of a false completed pass', () => {
  const markup = renderSavedPass('muscles', [], 1, {muscles:[]});
  assert.match(markup, /Choose your structures/);
  assert.match(markup, /Open study settings/);
  assert.doesNotMatch(markup, /PASS COMPLETE|Start pass 2/);
});

test('a saved pass with one target remaining renders a one-question final set', () => {
  const pool = modelPromptPools.muscles;
  const markup = renderSavedPass('muscles', pool.slice(0, -1).map(prompt => prompt.id), 1, {}, 'choice');
  assert.match(markup, /class="question-total">\/\s*01</);
  assert.match(markup, /class="answer-options"/);
  assert.doesNotMatch(markup, /PASS COMPLETE/);
  assert.ok(markup.includes(`Pass 1: ${pool.length - 1} of ${pool.length} targets covered`));
});

test('refreshing an exhausted landmark pass safely retains a specimen and the saved round', () => {
  const all = modelPromptPools.landmarks.map(prompt => prompt.id);
  const markup = renderSavedPass('landmarks', all, 3);
  assert.match(markup, /PASS COMPLETE/);
  assert.match(markup, /Start pass 4/);
  assert.match(markup, /BONE LANDMARKS/);
  assert.ok(markup.includes(`Pass 3: ${all.length} of ${all.length} targets covered`));
  assert.doesNotMatch(markup, /class="answer-options"/);
});
