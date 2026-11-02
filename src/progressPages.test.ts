import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { progressPages, progressUrl, readProgressPage, type ProgressPage } from './progressNavigation';
import { workspaceUrl } from './studyNavigation';
import { memeUrl, memes } from './memes';
import { emptyState, type StudyState } from './study';
import { modelPromptPools } from './modelQuiz';
import ProgressPages from './components/ProgressPages';
import ProgressMenu from './components/ProgressMenu';
import { QuizStudio } from './App';
import type { useAuth } from './useAuth';
import type { useStudyProgress } from './useStudyProgress';

const auth: ReturnType<typeof useAuth> = { user: null, ready: true, working: false, error: null, configured: true, signIn: async () => {}, signOut: async () => {} };
const makeProgress = (study = structuredClone(emptyState)): ReturnType<typeof useStudyProgress> => ({ study, ready: true, saved: true, status: 'local', error: null, pending: 0, canImport: false, recordAnswer: () => { assert.fail('Browsing must not record answers'); }, restartPass: () => {}, importGuest: () => {}, retry: () => {} });
function withBrowser<T>(page: ProgressPage, render: () => T): T {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const location = new URL(`http://127.0.0.1:5173/?atlas=skeleton&progress=${page}`);
  try {
    const browser = { location };
    Object.assign(browser, { self: browser, top: browser });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    return render();
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}
function renderPage(page: ProgressPage, study = structuredClone(emptyState)) {
  return withBrowser(page, () => renderToStaticMarkup(createElement(ProgressPages, { page, auth, progress: makeProgress(study), onNavigate: () => {}, onBack: () => {}, onStudy: () => {}, onMeme: () => {} })));
}

test('progress deep links preserve the interrupted collection and meme; leaving progress clears its route', () => {
  const original = 'https://anato.meme/?atlas=skeleton&mode=memes&meme=34&activity=quiz';
  for (const page of progressPages) {
    const url = progressUrl(original, page.id);
    assert.equal(readProgressPage(url.search), page.id);
    assert.equal(url.searchParams.get('meme'), '34');
    assert.equal(url.searchParams.get('activity'), 'quiz');
    assert.equal(progressUrl(url.href, null).href, original);
    assert.equal(workspaceUrl(url.href, 'study', 'muscles').searchParams.has('progress'), false);
    assert.equal(memeUrl(url.href, '34').searchParams.has('progress'), false);
  }
  for (const search of ['', '?progress=anything', '?progress=__proto__']) assert.equal(readProgressPage(search), null);
});

test('every progress destination renders its own full page and active navigation without a dialog', () => {
  for (const page of progressPages) {
    const html = renderPage(page.id);
    assert.ok(html.includes(`id="progress-page-title">${page.label.replace('&', '&amp;')}</h1>`));
    assert.match(html, /aria-label="Progress pages"/);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.doesNotMatch(html, /role="dialog"|aria-modal|about-overlay/);
    if (page.id !== 'account') assert.doesNotMatch(html, /Continue with Google|Add my device history|Sign out/);
    if (page.id !== 'history') assert.doesNotMatch(html, /aria-label="Search question history"/);
  }
});

test('the app opens progress routes as the main workspace without mounting a quiz or recording answers', () => {
  for (const page of progressPages) {
    const html = withBrowser(page.id, () => renderToStaticMarkup(createElement(QuizStudio, { auth, progress: makeProgress() })));
    assert.match(html, /class="quiz-app progress-app"/);
    assert.doesNotMatch(html, /Interactive 3D quiz specimen|id="typed-answer"|class="answer-options"/);
    assert.match(html, /aria-haspopup="menu"/);
  }
});

test('the review page paginates all unresolved model misses beyond the five-item overview', () => {
  const study: StudyState = { ...structuredClone(emptyState), attempts: modelPromptPools.muscles.slice(0, 51).map((prompt, i) => ({ questionId: prompt.id, correct: false, category: 'muscles', at: i * 1000 })) };
  const html = renderPage('review', study);
  assert.match(html, /1–20 of 51 structures/);
  assert.match(html, /Page 1 of 3/);
  assert.equal((html.match(/<li>/g) ?? []).length, 20);
  assert.match(html, /aria-label="Review structure list"/);
  assert.match(html, /aria-label="Last page"/);
  assert.match(renderPage('overview', study), /51 structures/);
});

test('meme progress lists all practiced lessons with pagination instead of a five-lesson cap', () => {
  const study = { ...structuredClone(emptyState), attempts: memes.map((meme, i) => ({ questionId: meme.lesson.questions[0].id, correct: true, category: 'memes', at: i * 1000 })) };
  const html = renderPage('memes', study);
  assert.ok(html.includes(`of ${memes.length} practiced lessons`));
  assert.ok(html.includes(`Page 1 of ${Math.ceil(memes.length / 20)}`));
  assert.equal((html.match(/<li>/g) ?? []).length, Math.min(20, memes.length));
  assert.match(html, /correct on latest tries/);
});

test('progress menu remains a compact disclosure before opening and includes guest access', () => {
  const html = renderToStaticMarkup(createElement(ProgressMenu, { signedIn: false, syncStatus: 'local', onNavigate: () => {} }));
  assert.match(html, /aria-label="My progress"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /role="menuitem"/);
});
