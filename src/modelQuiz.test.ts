import test from 'node:test';
import assert from 'node:assert/strict';
import { bones, preferredLandmarkView } from './content.ts';
import { createModelSession, describeModelPart, getPromptContextIds, modelPromptPools, quizRegions, type ModelCollection } from './modelQuiz.ts';
import { systemParts } from './systemData.ts';
function rng(seed = 31) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; }
const collections: ModelCollection[] = ['muscles', 'skeleton', 'landmarks'];

test('every available source part is quiz eligible exactly once, including deep muscles, cartilage and discs', () => {
  for (const collection of ['muscles', 'skeleton'] as const) {
    const pool = modelPromptPools[collection];
    assert.equal(pool.length, systemParts[collection].length);
    assert.equal(new Set(pool.map(prompt => prompt.id)).size, pool.length);
    assert.deepEqual(new Set(pool.map(prompt => prompt.partId)), new Set(systemParts[collection].map(part => part.id)));
    const names = new Set(systemParts[collection].map(part => part.name));
    for (const prompt of pool) {
      const part = systemParts[collection].find(candidate => candidate.id === prompt.partId)!;
      assert.equal(prompt.answer, part.name);
      assert.equal(prompt.options.filter(option => option === prompt.answer).length, 1);
      assert.equal(new Set(prompt.options).size, prompt.options.length);
      assert.equal(prompt.options.length, 4);
      assert.ok(prompt.options.every(option => names.has(option)));
      assert.ok(quizRegions.some(region => region.id === prompt.region));
      assert.ok(prompt.group);
      assert.ok(['focus', 'context', 'isolate'].includes(prompt.presentation!));
      if (part.kind !== 'muscle' && part.kind !== 'bone') assert.equal(prompt.prompt, 'Name the highlighted structure.');
    }
  }
});

test('small numbered bones retain context and ordinary muscles focus with ghost neighbors while deep layers isolate', () => {
  for (const prompt of modelPromptPools.skeleton.filter(prompt => /rib|disk|phalanx|metacarpal|metatarsal|xiphoid/i.test(prompt.answer))) assert.equal(prompt.presentation, 'context', prompt.id);
  for (const name of ['Medial head of right triceps brachii', 'Short head of left biceps femoris', 'Right brachialis', 'Left soleus', 'Right semimembranosus']) {
    const metadata = describeModelPart({ id: 'example', name, sourceId: 'example', kind: 'muscle' }, 'muscles');
    assert.equal(metadata.presentation, 'isolate', name);
  }
  const unknown = describeModelPart({ id: 'unknown', name: 'Unclassified source fascicle', sourceId: 'example', kind: 'muscle' }, 'muscles');
  assert.equal(unknown.region, 'other');
  assert.equal(unknown.side, undefined);
  assert.equal(unknown.presentation, 'focus');
  for (const name of ['Right tensor fasciae latae', 'Abdominal part of right pectoralis major', 'Right subclavius']) {
    assert.equal(describeModelPart({ id: 'example', name, sourceId: 'example', kind: 'muscle' }, 'muscles').presentation, 'focus', name);
  }
  for (const name of ['Right deep part of masseter', 'Left flexor digitorum profundus']) {
    assert.equal(describeModelPart({ id: 'example', name, sourceId: 'example', kind: 'muscle' }, 'muscles').presentation, 'isolate', name);
  }
});

test('named sides and regional metadata follow anatomy rather than the viewer screen', () => {
  const examples = [
    ['Right serratus anterior', 'muscles', 'chest', 'right', 'lateral'],
    ['Left gluteus medius', 'muscles', 'pelvis-thigh', 'left', 'medial'],
    ['Right flexor digiti minimi of foot', 'muscles', 'leg-foot', 'right', 'anterior'],
    ['Left plantar interossei', 'muscles', 'leg-foot', 'left', 'anterior'],
    ['Right inferior rectus', 'muscles', 'head-neck', 'right', 'anterior'],
    ['Left superior oblique', 'muscles', 'head-neck', 'left', 'anterior'],
    ['Right levator palpebrae superioris', 'muscles', 'head-neck', 'right', 'anterior'],
    ['Left radius', 'skeleton', 'forearm-hand', 'left', 'anterior'],
    ['Third cervical vertebra', 'skeleton', 'spine', undefined, 'posterior'],
    ['Distal phalanx of right second toe', 'skeleton', 'leg-foot', 'right', 'anterior'],
  ] as const;
  for (const [name, collection, region, side, view] of examples) {
    const value = describeModelPart({ id: 'example', name, sourceId: 'example', kind: collection === 'muscles' ? 'muscle' : 'bone' }, collection);
    assert.equal(value.region, region, name); assert.equal(value.side, side, name); assert.equal(value.view, view, name);
  }
});

test('first muscle prompt starts at a known visible source when present and never escapes a filter', () => {
  const first = createModelSession('muscles', 10, rng());
  const anchor = modelPromptPools.muscles.find(prompt => prompt.partId === 'FJ1467');
  if (anchor) { assert.equal(first[0].id, anchor.id); assert.equal(first[0].view, 'anterior'); }
  const allowed = modelPromptPools.muscles.filter(prompt => prompt.id !== anchor?.id).slice(0, 3).map(prompt => prompt.id);
  const filtered = createModelSession('muscles', 10, rng(), [], allowed);
  assert.equal(filtered.length, allowed.length);
  assert.ok(filtered.every(prompt => allowed.includes(prompt.id)));
});

test('landmark sessions retain all 17 source landmarks and 3 real right-side specimens', () => {
  assert.equal(modelPromptPools.landmarks.filter(prompt => prompt.landmark).length, Object.values(bones).reduce((total, bone) => total + bone.landmarks.length, 0));
  assert.equal(modelPromptPools.landmarks.filter(prompt => !prompt.landmark).length, 3);
  for (const prompt of modelPromptPools.landmarks) {
    assert.ok(prompt.bone);
    if (prompt.landmark) {
      const actual = bones[prompt.bone!].landmarks.find(landmark => landmark.id === prompt.landmark)!;
      assert.equal(actual.name, prompt.answer);
      assert.equal(prompt.view, preferredLandmarkView(actual.id));
      assert.ok(prompt.options.every(option => bones[prompt.bone!].landmarks.some(landmark => landmark.name === option)));
    } else { assert.equal(prompt.answer, 'Right'); assert.deepEqual(new Set(prompt.options), new Set(['Right', 'Left'])); }
  }
  assert.ok(createModelSession('landmarks', 10, rng()).some(prompt => prompt.id.startsWith('model-side-')));
});

test('successive batches exhaust the entire available pool without any repeated target', () => {
  for (const collection of collections) {
    const covered: string[] = [];
    const sizes: number[] = [];
    let batch = createModelSession(collection, 10, rng(72), covered);
    while (batch.length) {
      sizes.push(batch.length);
      for (const prompt of batch) { assert.ok(!covered.includes(prompt.id), prompt.id); covered.push(prompt.id); }
      assert.ok(covered.length <= modelPromptPools[collection].length);
      batch = createModelSession(collection, 10, rng(72), covered);
    }
    const size = modelPromptPools[collection].length;
    const expected = Array(Math.floor(size / 10)).fill(10).concat(size % 10 ? [size % 10] : []);
    assert.deepEqual(sizes, expected);
    assert.deepEqual(new Set(covered), new Set(modelPromptPools[collection].map(prompt => prompt.id)));
    assert.deepEqual(createModelSession(collection, 999, rng(), covered), []);
    assert.deepEqual(createModelSession(collection, 10, rng(83), []), createModelSession(collection, 10, rng(83)));
  }
});

test('selection filters exhaust only selected targets and an empty selection produces no questions', () => {
  for (const collection of collections) {
    const selected = modelPromptPools[collection].slice(0, 13).map(prompt => prompt.id);
    const first = createModelSession(collection, 10, rng(), [], selected);
    const second = createModelSession(collection, 10, rng(), first.map(prompt => prompt.id), selected);
    assert.equal(first.length, 10); assert.equal(second.length, 3);
    const all = [...first, ...second].map(prompt => prompt.id);
    assert.deepEqual(new Set(all), new Set(selected));
    assert.equal(new Set(all).size, 13);
    assert.deepEqual(createModelSession(collection, 10, rng(), all, selected), []);
    assert.deepEqual(createModelSession(collection, 10, rng(), [], []), []);
    assert.deepEqual(createModelSession(collection, 10, rng(), [], ['missing']), []);
    assert.equal(createModelSession(collection, 999, rng(), [], undefined).length, modelPromptPools[collection].length);
  }
});

test('coverage and filter inputs ignore duplicates or stale IDs without mutation', () => {
  for (const collection of collections) {
    const known = modelPromptPools[collection].slice(0, 3).map(prompt => prompt.id);
    const noisy = [...known, known[0], 'missing', known[1]];
    const snapshot = [...noisy];
    assert.deepEqual(createModelSession(collection, 10, rng(9), noisy), createModelSession(collection, 10, rng(9), known));
    assert.deepEqual(noisy, snapshot);
    assert.deepEqual(createModelSession(collection, 10, rng(9), ['missing']), createModelSession(collection, 10, rng(9), []));
    const selected = modelPromptPools[collection].slice(0, 5).map(prompt => prompt.id);
    const filter = [...selected, selected[0], 'missing'];
    const filterBefore = [...filter];
    assert.deepEqual(createModelSession(collection, 10, rng(9), [], filter), createModelSession(collection, 10, rng(9), [], selected));
    assert.deepEqual(filter, filterBefore);
  }
});

test('a landmark-only filter does not reintroduce previously covered side tasks', () => {
  const sides = modelPromptPools.landmarks.filter(prompt => !prompt.landmark).map(prompt => prompt.id);
  const selected = modelPromptPools.landmarks.filter(prompt => prompt.landmark).map(prompt => prompt.id);
  const first = createModelSession('landmarks', 10, rng(), sides, selected);
  assert.ok(first.every(prompt => !!prompt.landmark));
  const next = createModelSession('landmarks', 10, rng(), [...sides, ...first.map(prompt => prompt.id)], selected);
  assert.equal(next.length, selected.length - first.length);
  assert.ok(next.every(prompt => !first.some(previous => previous.id === prompt.id)));
});

test('sizing, deterministic random seeds and option shuffles preserve source pools', () => {
  for (const count of [0, -1, .5, NaN]) assert.deepEqual(createModelSession('muscles', count), []);
  const before = modelPromptPools.skeleton.map(prompt => [...prompt.options]);
  const all = createModelSession('skeleton', 9999, () => 1);
  assert.equal(all.length, modelPromptPools.skeleton.length);
  assert.equal(new Set(all.map(prompt => prompt.id)).size, all.length);
  assert.deepEqual(modelPromptPools.skeleton.map(prompt => prompt.options), before);
  assert.deepEqual(createModelSession('skeleton', 8, rng(56)), createModelSession('skeleton', 8, rng(56)));
});


test('right-hand context contains hand neighbors but excludes the forearm and opposite hand', () => {
  const target = modelPromptPools.skeleton.find(prompt => prompt.answer === 'Right scaphoid')!;
  assert.ok(target);
  const ids = getPromptContextIds(target)!;
  const names = systemParts.skeleton.filter(part => ids.includes(part.id)).map(part => part.name);
  for (const expected of ['Right scaphoid', 'Right capitate', 'Right first metacarpal bone', 'Distal phalanx of right thumb']) assert.ok(names.includes(expected), expected);
  for (const excluded of ['Right radius', 'Right ulna', 'Left scaphoid', 'Left first metacarpal bone', 'Right tibia']) assert.ok(!names.includes(excluded), excluded);
});

test('right-foot context retains tarsals, metatarsals and toe phalanges without the leg or other foot', () => {
  const target = modelPromptPools.skeleton.find(prompt => prompt.answer === 'Right calcaneus')!;
  const ids = getPromptContextIds(target)!;
  const names = systemParts.skeleton.filter(part => ids.includes(part.id)).map(part => part.name);
  for (const expected of ['Right calcaneus', 'Right talus', 'Right first metatarsal bone', 'Distal phalanx of right big toe']) assert.ok(names.includes(expected), expected);
  for (const excluded of ['Right tibia', 'Right fibula', 'Right patella', 'Left calcaneus', 'Left first metatarsal bone']) assert.ok(!names.includes(excluded), excluded);
});

test('numbered ribs and discs preserve both sides of the chest or the whole vertebral column', () => {
  const rib = modelPromptPools.skeleton.find(prompt => prompt.answer === 'Right third rib')!;
  const chest = getPromptContextIds(rib)!;
  const chestNames = systemParts.skeleton.filter(part => chest.includes(part.id)).map(part => part.name);
  for (const expected of ['Right third rib', 'Left third rib', 'Left first costal cartilage', 'Body of sternum', 'Xiphoid process']) assert.ok(chestNames.includes(expected), expected);
  assert.ok(!chestNames.includes('Third cervical vertebra'));
  const disc = modelPromptPools.skeleton.find(prompt => prompt.answer === 'Intervertebral disk of axis')!;
  const spine = getPromptContextIds(disc)!;
  const spineNames = systemParts.skeleton.filter(part => spine.includes(part.id)).map(part => part.name);
  for (const expected of ['Atlas', 'Axis', 'Third cervical vertebra', 'First lumbar vertebra', 'Sacrum', 'Intervertebral disk of axis']) assert.ok(spineNames.includes(expected), expected);
  assert.ok(!spineNames.includes('Body of sternum'));
  assert.ok(!spineNames.includes('Right hip bone'));
});

test('head context includes neutral anatomical neighbors and every context rule retains its target', () => {
  const target = modelPromptPools.skeleton.find(prompt => prompt.answer === 'Right lacrimal bone')!;
  const ids = getPromptContextIds(target)!;
  const names = systemParts.skeleton.filter(part => ids.includes(part.id)).map(part => part.name);
  for (const expected of ['Right lacrimal bone', 'Right nasal bone', 'Frontal bone', 'Mandible']) assert.ok(names.includes(expected), expected);
  assert.ok(!names.includes('Left lacrimal bone'));
  for (const collection of ['skeleton', 'muscles'] as const) for (const prompt of modelPromptPools[collection]) {
    const context = getPromptContextIds(prompt);
    if (prompt.presentation === 'context') {
      assert.ok(context?.includes(prompt.partId!), prompt.id);
      assert.equal(new Set(context).size, context!.length);
      assert.ok(context!.every(id => systemParts[collection].some(part => part.id === id)));
    } else assert.equal(context, undefined);
  }
  assert.equal(getPromptContextIds(modelPromptPools.landmarks[0]), undefined);
});
