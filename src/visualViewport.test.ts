import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPracticeViewport } from './visualViewport';

function setup(withViewport = true) {
  const values = new Map<string, string>();
  const dataset: Record<string, string> = {};
  let editing = false, tick = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const viewport = Object.assign(new EventTarget(), { height: 760, scale: 1, offsetTop: 0 });
  const win = Object.assign(new EventTarget(), { innerWidth: 390, innerHeight: 760,
    visualViewport: withViewport ? viewport : null,
    requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++tick, callback); return tick; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  });
  const doc = Object.assign(new EventTarget(), {
    documentElement: { style: { setProperty: (key: string, value: string) => values.set(key, value), removeProperty: (key: string) => values.delete(key) }, dataset },
    activeElement: { matches: () => editing },
  });
  const stop = bindPracticeViewport(win as unknown as Window, doc as unknown as Document);
  function resize(height: number, layoutHeight = win.innerHeight) {
    viewport.height = height; win.innerHeight = layoutHeight;
    (withViewport ? viewport : win).dispatchEvent(new Event('resize'));
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0));
  }
  return { values, dataset, viewport, win, doc, resize, stop, edit: (value: boolean) => { editing = value; } };
}

test('a visual-only keyboard resize keeps the input tray inside the visible area and restores it', () => {
  const s = setup();
  assert.equal(s.values.get('--practice-height'), '760px');
  s.edit(true); s.viewport.offsetTop = 34; s.resize(390);
  assert.equal(s.values.get('--practice-height'), '390px');
  assert.equal(s.values.get('--practice-top'), '34px');
  assert.equal(s.dataset.practiceKeyboard, 'true');
  s.viewport.offsetTop = 0; s.resize(760);
  assert.equal(s.dataset.practiceKeyboard, 'false');
  assert.equal(s.values.get('--practice-height'), '760px');
  s.stop();
});

test('browsers that resize both viewports still detect typing, and rotation resets the height baseline', () => {
  const s = setup(); s.edit(true); s.resize(350, 350);
  assert.equal(s.dataset.practiceKeyboard, 'true');
  s.win.innerWidth = 800; s.resize(350, 350);
  assert.equal(s.dataset.practiceKeyboard, 'false');
  s.stop();
});

test('pinch zoom leaves the layout alone and cleanup removes pending work and listeners', () => {
  const s = setup(); s.viewport.scale = 2; s.resize(300);
  assert.equal(s.values.get('--practice-height'), '760px');
  s.viewport.scale = 1; s.resize(700);
  assert.equal(s.values.get('--practice-height'), '700px');
  s.stop(); s.resize(600);
  assert.equal(s.values.size, 0);
  assert.equal(s.dataset.practiceKeyboard, undefined);
});

test('without VisualViewport, layout resize still sizes the practice screen', () => {
  const s = setup(false); s.resize(500, 500);
  assert.equal(s.values.get('--practice-height'), '500px');
  assert.equal(s.dataset.practiceKeyboard, 'false'); s.stop();
});
