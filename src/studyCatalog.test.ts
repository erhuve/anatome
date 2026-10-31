import test from 'node:test';
import assert from 'node:assert/strict';
import { bones } from './content.ts';
import { histologySlides } from './histology.ts';
import { labInventory } from './labInventory.ts';
import { systemParts } from './systemData.ts';
import { curriculumCoverage, getCatalogSummary, modelCatalog, studyCatalog } from './studyCatalog.ts';

test('the full source collection is catalogued exactly once without a curated-subset limit', () => {
  const expected = ['skeleton', 'muscles'].flatMap(collection => systemParts[collection as 'skeleton' | 'muscles'].map(part => `${collection}-${part.id}`));
  const actual = modelCatalog.map(part => `${part.collection}-${part.id}`);
  assert.deepEqual(new Set(actual), new Set(expected));
  assert.equal(actual.length, new Set(actual).size);
  assert.ok(modelCatalog.every(part => part.quizAvailable));
  assert.equal(getCatalogSummary().sourceModelParts, expected.length);
});

test('all original college lab rows retain their original descriptions and references', () => {
  for (const original of labInventory) {
    const group = studyCatalog.find(candidate => candidate.id === original.id);
    assert.ok(group, original.id);
    assert.equal(group.source, original.source);
    assert.deepEqual(group.entries.map(item => ({ name: item.name, detail: item.detail })), original.items);
  }
  const entries = studyCatalog.flatMap(group => group.entries);
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
});

test('every advertised visual link resolves to an actual model, reviewed locator or photograph', () => {
  const modelIds = new Set([...systemParts.skeleton, ...systemParts.muscles].map(part => part.id));
  const locatorIds = new Set(Object.values(bones).flatMap(bone => bone.landmarks.map(landmark => landmark.id)));
  const slideIds = new Set(histologySlides.map(slide => slide.id));
  for (const item of studyCatalog.flatMap(group => group.entries)) {
    for (const id of [...item.modelPartIds, ...item.contextPartIds]) assert.ok(modelIds.has(id), `${item.id}: unknown model ${id}`);
    for (const id of item.landmarkIds) assert.ok(locatorIds.has(id), `${item.id}: unknown locator ${id}`);
    for (const id of item.slideIds) assert.ok(slideIds.has(id), `${item.id}: unknown slide ${id}`);
    const linked = item.modelPartIds.length + item.landmarkIds.length + item.slideIds.length > 0;
    assert.equal(item.coverage === 'linked-assets', linked, item.id);
    if (!linked) assert.ok(item.gaps.length > 0, `${item.id}: missing visual coverage must be explicit`);
    assert.equal(new URL(item.source).hostname, 'openstax.org');
  }
});

test('related bone geometry does not count as reviewed landmark identification coverage', () => {
  const inventory = studyCatalog.flatMap(group => group.entries);
  const sella = inventory.find(item => item.name === 'Sella turcica')!;
  assert.equal(sella.coverage, 'reference-only');
  assert.equal(sella.landmarkIds.length, 0);
  assert.ok(sella.contextPartIds.length > 0);
  const combined = inventory.find(item => item.name === 'Head and fovea capitis')!;
  assert.ok(combined.landmarkIds.includes('femur-head'));
  assert.ok(combined.gaps.some(gap => gap.includes('Only some features')));
});

test('course-wide scope remains explicit about unavailable organ and physiology material', () => {
  assert.equal(curriculumCoverage.length, 14);
  for (const id of ['nervous', 'endocrine', 'cardiovascular', 'respiratory', 'digestive', 'urinary', 'reproductive']) {
    const module = curriculumCoverage.find(item => item.id === id)!;
    assert.equal(module.assetStatus, 'reference-roadmap', id);
    assert.ok(module.gaps.length > 0, id);
    assert.ok(module.topics.length > 0, id);
  }
  const summary = getCatalogSummary();
  assert.equal(summary.referenceEntries, summary.entriesWithLinkedAssets + summary.referenceOnlyEntries);
  assert.equal(summary.histologyPhotos, histologySlides.length);
  assert.equal(summary.reviewedLandmarkLocators, Object.values(bones).reduce((sum, bone) => sum + bone.landmarks.length, 0));
});
