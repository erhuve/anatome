import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { modelPromptPools } from './modelQuiz';

test('every selectable target has a matching static thumbnail from its source prompt', () => {
  const root = new URL('../public/targets/', import.meta.url);
  const catalog = JSON.parse(readFileSync(new URL('catalog.json', root), 'utf8'));
  const prompts = Object.values(modelPromptPools).flat();
  assert.equal(catalog.width, 192);
  assert.equal(catalog.height, 128);
  assert.equal(catalog.targets.length, prompts.length);
  const byId = new Map(catalog.targets.map((item: { id: string }) => [item.id, item]));
  assert.equal(byId.size, prompts.length);
  assert.deepEqual(new Set(readdirSync(root).filter(name => name.endsWith('.webp'))), new Set(prompts.map(prompt => `${prompt.id}.webp`)));
  for (const prompt of prompts) {
    const entry = byId.get(prompt.id) as Record<string, unknown>;
    for (const key of ['collection', 'answer', 'partId', 'bone', 'landmark', 'view'] as const) assert.equal(entry[key], prompt[key], `${prompt.id}: ${key}`);
    const bytes = readFileSync(new URL(`${prompt.id}.webp`, root));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', prompt.id);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', prompt.id);
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8X', prompt.id);
    assert.equal(bytes.readUIntLE(24, 3) + 1, 192, prompt.id);
    assert.equal(bytes.readUIntLE(27, 3) + 1, 128, prompt.id);
    assert.ok(bytes.length > 200, `${prompt.id}: empty/invalid thumbnail`);
  }
});
