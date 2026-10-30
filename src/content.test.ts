import test from 'node:test';
import assert from 'node:assert/strict';
import { bones, questions, modules } from './content.ts';
import fs from 'node:fs';
import { histologySlides } from './histology.ts';
import { labInventory } from './labInventory.ts';
test('assessment content has unique identities, valid answers, and valid specimen references', () => {
  assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
  for(const q of questions){
    assert.ok(q.prompt.trim());
    assert.ok(q.options.length>=3);
    assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,q.id);
    assert.equal(new Set(q.options).size,q.options.length,q.id);
    assert.equal(new URL(q.source).hostname,'openstax.org');
    if(q.landmark){assert.ok(q.bone);assert.ok(bones[q.bone!].landmarks.some(l=>l.id===q.landmark),q.id);}
  }
});
test('curriculum and practical inventory entries have usable original study content and source provenance',()=>{
  assert.ok(modules.some(m=>m.semester===1)&&modules.some(m=>m.semester===2));
  assert.equal(new Set(labInventory.map(g=>g.id)).size,labInventory.length);
  for(const group of labInventory){
    assert.equal(new URL(group.source).hostname,'openstax.org');
    assert.ok(group.items.length>0);
    assert.equal(new Set(group.items.map(i=>i.name)).size,group.items.length,group.id);
    for(const item of group.items){assert.ok(item.name.trim());assert.ok(item.detail.trim());}
  }
});

test('photographic histology questions have local images and creator provenance without answer labels',()=>{
  for(const slide of histologySlides){
    assert.ok(fs.existsSync('public'+slide.image),slide.id);
    assert.equal(slide.license,'CC0 1.0');
    assert.ok(slide.features.length>=2);
    const question=questions.find(q=>q.id==='slide-'+slide.id);
    assert.ok(question);
    assert.equal(question.options[question.answer],slide.name);
    assert.equal(question.imageSource,slide.source);
    assert.ok(!question.imageCredit?.includes(slide.name));
  }
});
