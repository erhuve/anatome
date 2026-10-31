import test from 'node:test';
import assert from 'node:assert/strict';
import { modelPromptPools } from './modelQuiz.ts';
import { normalizeQuizSelections, selectedPromptIds, readQuizSelections, writeQuizSelections } from './quizSelection.ts';

test('all means every available target; an explicit empty selection remains empty',()=>{
  assert.deepEqual(selectedPromptIds('muscles',{}),modelPromptPools.muscles.map(p=>p.id));
  assert.deepEqual(selectedPromptIds('muscles',{muscles:null}),modelPromptPools.muscles.map(p=>p.id));
  assert.deepEqual(selectedPromptIds('muscles',{muscles:[]}),[]);
});
test('custom selections include only selected live IDs without duplication or cross-collection leakage',()=>{
  const ids=modelPromptPools.muscles.slice(0,3).map(p=>p.id);
  const selected=normalizeQuizSelections({muscles:[...ids,ids[0],'unknown',modelPromptPools.skeleton[0].id],skeleton:null,landmarks:'bad'});
  assert.deepEqual(selected,{muscles:ids,skeleton:null});
  assert.deepEqual(selectedPromptIds('muscles',selected),ids);
});
test('browser study selections are isolated by account and survive reload',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const storage=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
  try{
    const ids=modelPromptPools.muscles.slice(0,2).map(p=>p.id);
    writeQuizSelections(null,{muscles:ids});
    writeQuizSelections('account-a',{muscles:null,skeleton:[]});
    assert.deepEqual(readQuizSelections(null),{muscles:ids});
    assert.deepEqual(readQuizSelections('account-a'),{muscles:null,skeleton:[]});
    assert.deepEqual(readQuizSelections('account-b'),{});
  }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});
