import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogPromptIdsFor, courseSectionsFor, sectionForModelPrompt, sectionsForCatalogItem, sectionsForModelPart } from './coverageNavigation';
import { modelPromptPools } from './modelQuiz';
import { curriculumCoverage, modelCatalog, studyCatalog } from './studyCatalog';
import { studySections } from './studySections';

test('course practice routes cover the shipped quizzes exactly once and leave unassessed topics empty', () => {
  const bones = courseSectionsFor('bones');
  const muscles = courseSectionsFor('muscles');
  assert.equal(bones.length, 20);
  assert.equal(muscles.length, 24);
  const allIds = [...bones, ...muscles].flatMap(section => section.promptIds);
  const expected = Object.values(modelPromptPools).flatMap(pool => pool.map(prompt => prompt.id));
  assert.deepEqual(new Set(allIds), new Set(expected));
  assert.equal(allIds.length, expected.length);
  assert.ok(bones.some(section => section.collection === 'landmarks'));
  for (const module of curriculumCoverage.filter(module => module.id !== 'bones' && module.id !== 'muscles')) {
    assert.deepEqual(courseSectionsFor(module.id), [], module.id);
  }
  assert.deepEqual(courseSectionsFor('unknown'), []);
});

test('context geometry and photo references do not become assessed checklist targets', () => {
  const items = studyCatalog.flatMap(group => group.entries);
  const sella = items.find(item => item.name === 'Sella turcica')!;
  assert.ok(sella.contextPartIds.length > 0);
  assert.deepEqual(catalogPromptIdsFor(sella), []);
  assert.deepEqual(sectionsForCatalogItem(sella.id), []);
  const tissuePhoto = items.find(item => item.slideIds.length > 0)!;
  assert.ok(tissuePhoto);
  assert.deepEqual(catalogPromptIdsFor(tissuePhoto), []);
  assert.deepEqual(sectionsForCatalogItem(tissuePhoto.id), []);
  assert.deepEqual(catalogPromptIdsFor('missing-catalog-row'), []);
  assert.deepEqual(sectionsForCatalogItem('missing-catalog-row'), []);
});

test('a partly reviewed combined checklist row links only its actual locator prompts', () => {
  const combined = studyCatalog.flatMap(group => group.entries).find(item => item.name === 'Head and fovea capitis')!;
  assert.ok(combined.gaps.some(gap => gap.includes('Only some features')));
  const ids = catalogPromptIdsFor(combined);
  const expected = modelPromptPools.landmarks.filter(prompt => prompt.landmark && combined.landmarkIds.includes(prompt.landmark)).map(prompt => prompt.id);
  assert.deepEqual(ids, expected);
  assert.ok(ids.length > 0);
  assert.deepEqual(sectionsForCatalogItem(combined.id).map(section => section.id), ['femur-details']);
  assert.ok(ids.every(id => !id.startsWith('model-side-')));
});

test('every checklist practice link resolves the exact source part or reviewed locator, never visual context', () => {
  for (const item of studyCatalog.flatMap(group => group.entries)) {
    const ids = catalogPromptIdsFor(item);
    const linked = sectionsForCatalogItem(item);
    assert.equal(new Set(ids).size, ids.length, item.id);
    for (const id of ids) {
      const prompt = Object.values(modelPromptPools).flat().find(candidate => candidate.id === id)!;
      assert.ok(prompt, `${item.id}: ${id}`);
      assert.ok(prompt.partId && item.modelPartIds.includes(prompt.partId) || prompt.landmark && item.landmarkIds.includes(prompt.landmark), `${item.id}: ${id}`);
      assert.ok(linked.some(section => section.promptIds.includes(id)), `${item.id}: ${id}`);
    }
    assert.deepEqual(linked, studySections.filter(section => section.promptIds.some(id => ids.includes(id))));
  }
});

test('source-part links are exact and every real quiz prompt has a single section', () => {
  for (const part of modelCatalog) {
    const sections = sectionsForModelPart(part.collection, part.id);
    assert.equal(sections.length, 1, `${part.collection}: ${part.id}`);
    const prompt = modelPromptPools[part.collection].find(candidate => candidate.partId === part.id)!;
    assert.equal(sectionForModelPrompt(prompt.id), sections[0]);
  }
  for (const prompt of Object.values(modelPromptPools).flat()) {
    const section = sectionForModelPrompt(prompt.id);
    assert.ok(section?.promptIds.includes(prompt.id), prompt.id);
  }
  assert.deepEqual(sectionsForModelPart('landmarks', modelCatalog[0].id), []);
  assert.deepEqual(sectionsForModelPart('skeleton', 'unknown'), []);
  assert.equal(sectionForModelPrompt('unknown'), undefined);
});
