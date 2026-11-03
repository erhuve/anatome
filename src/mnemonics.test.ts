import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { modelPromptPools, type ModelCollection } from './modelQuiz';
import { anatomyMnemonics, mnemonicForPrompt } from './mnemonics';
import AnatomyMnemonic from './components/AnatomyMnemonic';

const cue = (collection: ModelCollection, answer: string) => mnemonicForPrompt({ collection, answer });

test('source aliases select the correct bone cue on either side', () => {
  for (const name of ['Left triquetral', 'Right scaphoid', 'Left trapezoid']) {
    assert.equal(cue('skeleton', name)?.id, 'carpals');
  }
  for (const name of ['Navicular bone of left foot', 'Right medial cuneiform bone', 'Left cuboid bone']) {
    assert.equal(cue('skeleton', name)?.id, 'tarsals');
  }
  assert.equal(cue('skeleton', 'Left temporal bone')?.id, 'cranial-bones');
  assert.equal(cue('skeleton', 'Ethmoid')?.id, 'cranial-bones');
  assert.equal(cue('skeleton', 'Right first metacarpal bone'), undefined);
  assert.equal(cue('skeleton', 'Right first metatarsal bone'), undefined);
});

test('rotator cuff membership and nearby muscle exclusions are exact', () => {
  const names = ['supraspinatus', 'infraspinatus', 'teres minor', 'subscapularis'];
  for (const side of ['Left', 'Right']) for (const name of names) {
    assert.equal(cue('muscles', `${side} ${name}`)?.id, 'rotator-cuff');
  }
  assert.equal(cue('muscles', 'Right teres major'), undefined);
  assert.equal(cue('muscles', 'Right deltoid'), undefined);
  assert.equal(cue('muscles', 'Right semimembranosus'), undefined);
  assert.equal(cue('muscles', 'Right semitendinosus')?.id, 'pes-anserinus');
});

test('regional erector subdivisions match without including semispinalis', () => {
  for (const name of ['Right iliocostalis thoracis', 'Iliocostalis colli', 'Left longissimus capitis', 'Right spinalis colli']) {
    assert.equal(cue('muscles', name)?.id, 'erector-spinae');
  }
  for (const name of ['Right semispinalis colli', 'Left semispinalis thoracis', 'Left splenius capitis']) {
    assert.equal(cue('muscles', name), undefined);
  }
});

test('hand actions and eye innervation do not spill into similarly named muscles', () => {
  assert.equal(cue('muscles', 'Left palmar interossei muscles')?.id, 'hand-interossei');
  assert.equal(cue('muscles', 'Right dorsal interossei muscles of hand')?.id, 'hand-interossei');
  assert.equal(cue('muscles', 'Left plantar interossei muscles'), undefined);
  assert.equal(cue('muscles', 'Right dorsal interossei muscles of foot'), undefined);
  for (const name of ['Right lateral rectus', 'Left superior oblique', 'Right inferior oblique']) {
    assert.equal(cue('muscles', name)?.id, 'extraocular-nerves');
  }
  for (const name of ['Right rectus femoris', 'Left rectus abdominis', 'Right oblique part of cricothyroid', 'Left rectus lateralis capitis']) {
    assert.equal(cue('muscles', name), undefined);
  }
});

test('every curated cue has real matching geometry and unsupported targets stay empty', () => {
  const prompts = Object.values(modelPromptPools).flat();
  const matched = prompts.filter(prompt => mnemonicForPrompt(prompt));
  assert.equal(matched.length, 86);
  assert.equal(new Set(anatomyMnemonics.map(item => item.id)).size, anatomyMnemonics.length);
  for (const mnemonic of anatomyMnemonics) {
    assert.ok(matched.some(prompt => mnemonicForPrompt(prompt)?.id === mnemonic.id), mnemonic.id);
    assert.equal(new URL(mnemonic.source).protocol, 'https:');
    assert.ok(mnemonic.lines.length && mnemonic.sourceLabel);
  }
  assert.ok(modelPromptPools.landmarks.every(prompt => mnemonicForPrompt(prompt) === undefined));
  assert.equal(cue('landmarks', 'Right supraspinatus'), undefined);
  const unsupported = modelPromptPools.muscles.find(prompt => /gluteus medius/.test(prompt.answer))!;
  assert.equal(renderToStaticMarkup(createElement(AnatomyMnemonic, { prompt: unsupported })), '');
});

test('the compact disclosure retains the expansion, orientation, and reference', () => {
  const target = modelPromptPools.skeleton.find(prompt => prompt.answer === 'Right scaphoid')!;
  const markup = renderToStaticMarkup(createElement(AnatomyMnemonic, { prompt: target }));
  assert.match(markup, /<details class="anatomy-mnemonic">/);
  assert.doesNotMatch(markup, /<details[^>]*\bopen(?:[ =>])/);
  assert.ok(markup.includes('Some Lovers Try Positions'));
  assert.ok(markup.includes('Proximal row: Scaphoid, Lunate, Triquetrum, Pisiform.'));
  assert.ok(markup.includes('Distal row: Trapezium, Trapezoid, Capitate, Hamate.'));
  assert.ok(markup.includes('thumb to little finger'));
  assert.match(markup, /href="https:\/\/anatomy\.ttuhscep\.edu\/anatomytables\/bones_alpha\.html"/);
});
