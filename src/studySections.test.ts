import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelPromptPools, type ModelCollection } from './modelQuiz';
import { findStudySection, nextStudySection, studySections, studyUnits } from './studySections';

test('every playable section has a shipped anatomy preview', () => {
  for (const section of studySections) {
    const bytes = readFileSync(new URL(`../public/sections/${section.id}.webp`, import.meta.url));
    assert.ok(bytes.length > 100, section.id);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', section.id);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', section.id);
  }
});

test('playable sections partition every available quiz target exactly once', () => {
  assert.equal(new Set(studyUnits.map(unit => unit.id)).size, studyUnits.length);
  assert.equal(new Set(studySections.map(section => section.id)).size, studySections.length);
  for (const collection of ['skeleton', 'landmarks', 'muscles'] as const) {
    const actual = studySections.filter(section => section.collection === collection).flatMap(section => section.promptIds);
    const expected = modelPromptPools[collection].map(prompt => prompt.id);
    assert.equal(actual.length, expected.length);
    assert.equal(new Set(actual).size, actual.length);
    assert.deepEqual(new Set(actual), new Set(expected));
  }
  for (const unit of studyUnits) {
    assert.ok(unit.sections.length > 0, unit.id);
    assert.match(unit.source, /^https:\/\/openstax.org\//);
    assert.ok(unit.description.length > 20);
    for (const section of unit.sections) {
      assert.ok(section.promptIds.length > 0, section.id);
      assert.ok(section.promptIds.length <= 50, `${section.id} should remain a manageable group`);
      assert.ok(section.description.length > 20);
    }
  }
  // All current source names have a specific assignment; a fallback remains
  // available for future source additions instead of silently losing targets.
  assert.ok(!studyUnits.some(unit => unit.id === 'additional-models'));
});

test('section recognition requires the exact selection and correct collection', () => {
  const section = studySections.find(item => item.id === 'carpals')!;
  assert.equal(findStudySection(section.collection, [...section.promptIds].reverse()), section);
  assert.equal(findStudySection(section.collection, [...section.promptIds, section.promptIds[0]]), section);
  assert.equal(findStudySection(section.collection, section.promptIds.slice(1)), undefined);
  assert.equal(findStudySection(section.collection, [...section.promptIds, 'unknown']), undefined);
  assert.equal(findStudySection('muscles', section.promptIds), undefined);
  assert.equal(findStudySection(section.collection, []), undefined);
  assert.equal(findStudySection(section.collection, null), undefined);
  assert.equal(findStudySection(section.collection, undefined), undefined);
});

test('navigation follows the textbook unit order and stops at the end', () => {
  assert.deepEqual(studyUnits.map(unit => unit.id), ['axial-skeleton', 'appendicular-skeleton', 'axial-muscles', 'upper-limb-muscles', 'lower-limb-muscles']);
  for (let index = 0; index < studySections.length - 1; index++) assert.equal(nextStudySection(studySections[index]), studySections[index + 1]);
  assert.equal(nextStudySection(studySections.at(-1)!), undefined);
  assert.equal(nextStudySection({ ...studySections[0], id: 'unknown' }), undefined);
  assert.equal(nextStudySection(studyUnits[0].sections.at(-1)!), studyUnits[1].sections[0]);
  for (const [wholeBone, detail] of [['pectoral-girdle', 'scapula-details'], ['arm-bones', 'humerus-details'], ['femur-bones', 'femur-details']]) {
    assert.equal(nextStudySection(studySections.find(section => section.id === wholeBone)!)?.id, detail);
  }
});

function assignment(collection: ModelCollection, answer: string) {
  const prompt = modelPromptPools[collection].find(item => item.answer === answer);
  assert.ok(prompt, `Missing source target: ${answer}`);
  return studySections.find(section => section.promptIds.includes(prompt.id))?.id;
}

test('skeletal sections preserve textbook anatomy and distinguish supporting structures', () => {
  for (const [answer, expected] of [
    ['Hyoid bone', 'skull-hyoid'], ['Atlas', 'cervical-vertebrae'],
    ['First lumbar vertebra', 'lumbar-sacrum'], ['Sacrum', 'lumbar-sacrum'],
    ['Intervertebral disk of axis', 'intervertebral-discs'],
    ['Right third rib', 'ribs'], ['Left first costal cartilage', 'sternum-cartilage'],
    ['Right scapula', 'pectoral-girdle'], ['Right radius', 'forearm-bones'],
    ['Right scaphoid', 'carpals'], ['Right first metacarpal bone', 'hand-bones'],
    ['Right femur', 'femur-bones'], ['Right tibia', 'knee-leg-bones'], ['Right calcaneus', 'tarsals'],
  ]) assert.equal(assignment('skeleton', answer), expected, answer);
  for (const bone of ['scapula', 'humerus', 'femur']) {
    const section = studySections.find(item => item.id === `${bone}-details`)!;
    const prompts = modelPromptPools.landmarks.filter(prompt => section.promptIds.includes(prompt.id));
    assert.ok(prompts.every(prompt => prompt.bone === bone));
    assert.ok(prompts.some(prompt => !!prompt.landmark));
    assert.ok(prompts.some(prompt => !prompt.landmark));
  }
});

test('muscle groups follow anatomy even where atlas regions or named parts cross boundaries', () => {
  for (const [answer, expected] of [
    ['Right inferior rectus', 'eye-muscles'], ['Right deep part of masseter', 'mastication-muscles'],
    ['Left superior oblique', 'eye-muscles'], ['Right obliquus superior capitis', 'posterior-neck-muscles'],
    ['Right oblique part of cricothyroid', 'laryngeal-muscles'], ['Right external part of thyro-arytenoid', 'laryngeal-muscles'],
    ['Right sternocleidomastoid', 'anterior-neck-muscles'], ['Right splenius capitis', 'posterior-neck-muscles'],
    ['Right longissimus thoracis', 'intrinsic-back-muscles'], ['Diaphragm', 'thoracic-muscles'],
    ['Right rectus abdominis', 'abdominal-muscles'],
    ['Abdominal part of right pectoralis major', 'shoulder-muscles'],
    ['Right latissimus dorsi', 'shoulder-muscles'], ['Right serratus anterior', 'scapular-muscles'],
    ['Right brachialis', 'arm-muscles'], ['Left flexor digitorum profundus', 'anterior-forearm-muscles'],
    ['Right supinator', 'posterior-forearm-muscles'], ['Right abductor pollicis brevis', 'hand-muscles'],
    ['Right gluteus medius', 'hip-muscles'], ['Right adductor longus', 'anterior-medial-thigh-muscles'],
    ['Right semimembranosus', 'posterior-thigh-muscles'], ['Right tibialis anterior', 'anterior-lateral-leg-muscles'],
    ['Left soleus', 'posterior-leg-muscles'], ['Right abductor hallucis', 'foot-muscles'],
  ]) assert.equal(assignment('muscles', answer), expected, answer);
});
