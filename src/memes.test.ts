import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { findMemes, isCoreAnatomy, memeProgress, memes, memeTopicCounts, memeUrl, orderedMemes, readMemeRoute } from './memes';
import { memeLessons, memeModelTargets, memeQuestionIds } from './memeLessons';
import { modelPromptPools } from './modelQuiz';
import { emptyState, recordAttempt } from './study';
import { mergeEvents, normalizeStudy, parseProgressEvent, ProgressStore, replayProgress, type ProgressEvent } from './progress';
import { workspaceUrl } from './studyNavigation';
import MemeLibrary from './components/MemeLibrary';

test('every meme has shipped images, a lesson, provenance, and three distinct answerable questions', () => {
  assert.equal(memes.length, 54);
  assert.equal(memeLessons.length, memes.length);
  assert.equal(new Set(memes.map(meme => meme.id)).size, memes.length);
  assert.equal(memeQuestionIds.size, 162);
  for (const meme of memes) {
    assert.ok(meme.width > 0 && meme.height > 0);
    for (const image of [meme.image, meme.thumbnail]) {
      assert.ok(image.startsWith('/memes/'));
      const file = new URL(`../public${image}`, import.meta.url);
      assert.ok(existsSync(file), image);
      const bytes = readFileSync(file);
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', image);
    }
    assert.equal(new URL(meme.source).protocol, 'https:');
    assert.equal(new URL(meme.lesson.reference).hostname, 'openstax.org');
    assert.equal(meme.lesson.notes.length, 3);
    assert.ok(meme.lesson.connection && meme.lesson.hook);
    assert.equal(meme.lesson.questions.length, 3);
    assert.equal(new Set(meme.lesson.questions.map(q => q.prompt)).size, 3);
    for (const question of meme.lesson.questions) {
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4, question.id);
      assert.equal(question.options.filter(option => option === question.answer).length, 1);
      assert.ok(question.explanation.length > 25, question.id);
    }
  }
});

test('muscles and bones come first and every 3D link resolves all of its requested targets', () => {
  const core = memes.filter(isCoreAnatomy);
  assert.equal(core.length, 29);
  assert.ok(orderedMemes.slice(0, core.length).every(isCoreAnatomy));
  assert.ok(orderedMemes.slice(core.length).every(meme => !isCoreAnatomy(meme)));
  assert.equal(memeTopicCounts.reduce((n, topic) => n + topic.count, 0), 54);
  for (const meme of memes.filter(meme => isCoreAnatomy(meme) || meme.lesson.models.length > 0)) {
    const targets = memeModelTargets(meme.lesson);
    assert.ok(targets.length > 0, meme.id);
    assert.equal(new Set(targets.map(p => p.id)).size, targets.length);
    for (const link of meme.lesson.models) {
      const pool = modelPromptPools[link.collection];
      for (const group of link.groups ?? []) assert.ok(pool.some(p => p.group === group), group);
      for (const answer of link.answers ?? []) assert.ok(pool.some(p => p.answer === answer), answer);
      for (const id of link.ids ?? []) assert.ok(pool.some(p => p.id === id), id);
    }
  }
});

test('topic filters and search combine; searches include study facts and empty results', () => {
  assert.equal(findMemes('', 'All').length, 54);
  assert.equal(findMemes('', 'Muscles & bones').length, 29);
  assert.equal(findMemes('', 'Bones & landmarks').length, 17);
  assert.equal(findMemes('scapula', 'Nerves').length, 0);
  assert.ok(findMemes('trapezius', 'Muscles').some(meme => meme.id === '33'));
  assert.ok(findMemes('  thumb carpals ', 'Bones & landmarks').some(meme => meme.id === '36'));
  assert.deepEqual(findMemes('unfindable-word-999', 'All'), []);
});

test('a shared meme quiz URL survives parsing, and leaving memes removes stale detail parameters', () => {
  const url = memeUrl('https://anato.meme/?atlas=skeleton&keep=yes#anchor', '36', 'quiz');
  assert.equal(url.searchParams.get('atlas'), 'skeleton');
  assert.equal(url.searchParams.get('keep'), 'yes');
  assert.equal(url.hash, '#anchor');
  const route = readMemeRoute(url.search);
  assert.equal(route.meme?.id, '36'); assert.equal(route.activity, 'quiz');
  const study = workspaceUrl(url.href, 'study', 'muscles');
  assert.equal(study.searchParams.has('meme'), false);
  assert.equal(study.searchParams.has('activity'), false);
  assert.equal(readMemeRoute('?mode=memes&meme=missing').invalid, true);
  const gallery = memeUrl(url.href);
  assert.equal(gallery.searchParams.has('meme'), false);
});

test('latest attempts determine meme recall while correct and missed items keep their review schedules', () => {
  const meme = memes[0], [a, b] = meme.lesson.questions;
  let study = recordAttempt(structuredClone(emptyState), a.id, 'memes', false, 1000);
  study = recordAttempt(study, a.id, 'memes', true, 602000);
  study = recordAttempt(study, b.id, 'memes', false, 603000);
  const stats = memeProgress(meme, [...study.attempts].reverse(), study.review, 1203001);
  assert.deepEqual(stats, { tried: 2, correct: 1, due: 1, total: 3 });
  assert.equal(memeProgress(memes[1], study.attempts, study.review, 603001).tried, 0);
  assert.deepEqual(normalizeStudy(study).attempts, study.attempts);
});

test('meme account events replay and deduplicate without creating or changing a 3D pass', () => {
  const event: ProgressEvent = { id: 'meme-answer', kind: 'attempt', occurred_at: 1000, payload: { questionId: 'meme-29-q1', collection: 'memes', correct: false, at: 1000, round: null } };
  assert.ok(parseProgressEvent(event));
  const state = replayProgress(mergeEvents([event], [event]));
  assert.equal(state.attempts.length, 1);
  assert.equal(state.attempts[0].category, 'memes');
  assert.equal(state.review['meme-29-q1'].due, 601000);
  assert.deepEqual(state.modelPasses, {});
  for (const bad of [{ round: 1 }, { scope: 'muscles' }, { questionId: 'unshipped-question' }]) {
    assert.equal(parseProgressEvent({ ...event, payload: { ...event.payload, ...bad } }), null);
  }
});

test('guest meme attempts save through the normal store and survive a fresh store without touching selections', () => {
  let guest = structuredClone(emptyState);
  const make = () => new ProgressStore(null, null, true, null, () => guest, state => { guest = state; return true; }, () => 'guest-test');
  const store = make();
  store.recordAnswer('meme-36-q1', 'memes', true, false);
  assert.equal(guest.attempts.length, 1);
  assert.equal(make().getSnapshot().study.attempts[0].questionId, 'meme-36-q1');
  store.recordAnswer('meme-36-q2', 'memes', true, true);
  store.recordAnswer('unshipped', 'memes', true, false);
  assert.equal(guest.attempts.length, 1);
  assert.deepEqual(guest.modelPasses, {});
});

test('account meme answers upload through the existing remote contract and reload exactly once', async () => {
  const items = new Map<string, string>();
  const storage = { get length() { return items.size; }, key: (i: number) => [...items.keys()][i] ?? null, getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
  let uploaded: ProgressEvent[] = [];
  const remote = { load: async () => uploaded, insert: async (_user: string, events: ProgressEvent[]) => { uploaded = mergeEvents(uploaded, events); } };
  let sequence = 0;
  const make = () => new ProgressStore('meme-test-user', remote, true, storage, () => structuredClone(emptyState), () => true, () => `meme-test-${++sequence}`);
  const store = make(); store.start(); await store.sync(true, true);
  for (let i = 0; i < 50 && !store.getSnapshot().ready; i++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(store.getSnapshot().ready, true);
  store.recordAnswer('meme-34-q1', 'memes', true, false);
  await store.flush();
  for (let i = 0; i < 50 && store.getSnapshot().pending; i++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(store.getSnapshot().pending, 0);
  assert.equal(uploaded.filter(event => event.kind === 'attempt').length, 1);
  assert.equal(uploaded[0].payload.collection, 'memes');
  store.stop();
  const fresh = make(); fresh.start(); await fresh.sync(true, true);
  for (let i = 0; i < 50 && !fresh.getSnapshot().ready; i++) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(fresh.getSnapshot().study.attempts.length, 1);
  assert.deepEqual(fresh.getSnapshot().study.modelPasses, {});
  fresh.stop();
});

function renderRoute(search: string) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let answers = 0;
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { search } } });
    const markup = renderToStaticMarkup(createElement(MemeLibrary, { study: structuredClone(emptyState), paused: false, onAnswer: () => answers++, onStudyModels: () => {} }));
    assert.equal(answers, 0);
    return markup.replace(/<!--.*?-->/g, '');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
}
test('study links render the matching image, notes, reference and actual 3D entry without recording an answer', () => {
  const markup = renderRoute('?mode=memes&meme=34');
  assert.match(markup, /Landmarks of the scapula/);
  assert.match(markup, /src="\/memes\/34.webp"/);
  assert.match(markup, /spine is a prominent posterior ridge/);
  assert.match(markup, /Read the OpenStax section/);
  assert.match(markup, /Study &amp; identify in 3D/);
  assert.doesNotMatch(markup, /class="answer-options"/);
});
test('direct quiz links hide the study facts and render three-question recall for the chosen meme', () => {
  const markup = renderRoute('?mode=memes&meme=34&activity=quiz');
  assert.match(markup, /QUICK RECALL/);
  assert.match(markup, /1 \/ 3/);
  assert.match(markup, /class="answer-options"/);
  assert.doesNotMatch(markup, /meme-study-notes|MEMORY HOOK/);
});
