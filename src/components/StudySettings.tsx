import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Search, X } from 'lucide-react';
import { modelPromptPools, quizRegions, type ModelCollection } from '../modelQuiz';
import { selectedPromptIds, type QuizSelections } from '../quizSelection';
import { studyTargetLabel } from '../studyNavigation';
import CoverageSummary from './CoverageSummary';

type Props = { collection: ModelCollection; selections: QuizSelections; onApply: (collection: ModelCollection, selections: QuizSelections) => void; onClose: () => void; mode?: 'study' | 'quiz' };
const collections = [{id:'muscles',label:'Muscles'},{id:'skeleton',label:'Bones & supporting structures'},{id:'landmarks',label:'Landmarks & laterality'}] as const;
export default function StudySettings({collection,selections,onApply,onClose,mode='quiz'}:Props){
  const [active,setActive]=useState<ModelCollection>(collection);
  const [draft,setDraft]=useState<QuizSelections>(()=>structuredClone(selections));
  const [query,setQuery]=useState('');
  const [coverage,setCoverage]=useState(false);
  const panel=useRef<HTMLDivElement>(null);
  const close=useRef(onClose);close.current=onClose;
  const pool=modelPromptPools[active];
  const selected=useMemo(()=>new Set(selectedPromptIds(active,draft)),[active,draft]);
  const visible=pool.filter(prompt=>(`${prompt.answer} ${prompt.group??''} ${quizRegions.find(region=>region.id===prompt.region)?.label??''}`).toLowerCase().includes(query.toLowerCase().trim()));
  const regions=quizRegions.map(region=>({...region,prompts:pool.filter(prompt=>(prompt.region??'other')===region.id)})).filter(region=>region.prompts.length);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    function keyboard(event:KeyboardEvent){
      if(event.key==='Escape'){event.preventDefault();close.current();}
      if(event.key!=='Tab')return;
      const targets=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,a[href],select,[tabindex="0"]')??[]).filter(element=>element.offsetParent!==null);
      if(event.shiftKey&&document.activeElement===targets[0]){event.preventDefault();targets.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===targets.at(-1)){event.preventDefault();targets[0]?.focus();}
    }
    document.addEventListener('keydown',keyboard);
    return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keyboard);previous?.focus();};
  },[]);
  function update(ids:Iterable<string>){const next=[...new Set(ids)];setDraft(value=>({...value,[active]:next.length===pool.length?null:next}));}
  function toggle(id:string){const next=new Set(selected);if(next.has(id))next.delete(id);else next.add(id);update(next);}
  function toggleRegion(ids:string[]){const next=new Set(selected);const all=ids.every(id=>next.has(id));for(const id of ids){if(all)next.delete(id);else next.add(id);}update(next);}
  return <div className="settings-overlay" onClick={onClose}><div className="settings-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="study-settings-title" onClick={event=>event.stopPropagation()}>
    <header className="settings-heading"><h2 id="study-settings-title">{coverage?'Curriculum coverage':'Choose study material'}</h2><button className="icon-control" onClick={onClose} aria-label="Close study settings"><X size={19}/></button></header>
    <div className="settings-nav"><button className={!coverage?'active':''} onClick={()=>setCoverage(false)}>Study material</button><button className={coverage?'active':''} onClick={()=>setCoverage(true)}><BookOpen size={13}/>Curriculum coverage</button></div>
    {coverage?<div className="settings-coverage"><CoverageSummary/></div>:<div className="settings-material">
      <div className="settings-collection-tabs" aria-label="Choose study collection">{collections.map(item=><button key={item.id} className={active===item.id?'active':''} onClick={()=>{setActive(item.id);setQuery('');}}>{item.label}<span>{modelPromptPools[item.id].length}</span></button>)}</div>
      <div className="settings-selection-intro"><strong>{selected.size} <span>/ {pool.length} selected</span></strong><span>{draft[active]===null||draft[active]===undefined?'Includes new models automatically':'Custom selection · separate quiz pass'}</span></div>
      <div className="settings-regions" aria-label="Select anatomical regions">{regions.map(region=>{const count=region.prompts.filter(prompt=>selected.has(prompt.id)).length;const all=count===region.prompts.length;return <label key={region.id} className={all?'all':count?'partial':''}><input type="checkbox" checked={all} aria-checked={count&&!all?'mixed':all} onChange={()=>toggleRegion(region.prompts.map(prompt=>prompt.id))}/><span className="settings-check">{count>0&&<Check size={10}/>}</span><span>{region.label}</span><small>{count}/{region.prompts.length}</small></label>})}</div>
      <div className="settings-list-toolbar"><div className="settings-search"><Search size={15}/><input aria-label="Search study targets" placeholder="Find a structure, region, or side…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button className="icon-control" aria-label="Clear target search" onClick={()=>setQuery('')}><X size={13}/></button>}</div><div className="settings-bulk"><button onClick={()=>update(pool.map(prompt=>prompt.id))}>Select all</button><button onClick={()=>update([])}>Clear</button>{query&&<button onClick={()=>update(visible.map(prompt=>prompt.id))}>Only shown</button>}</div></div>
      <div className="settings-target-list" aria-label="Individual study targets">{visible.map(prompt=><label key={prompt.id} className={selected.has(prompt.id)?'selected':''}><input type="checkbox" checked={selected.has(prompt.id)} onChange={()=>toggle(prompt.id)}/><span className="settings-check">{selected.has(prompt.id)&&<Check size={12}/>}</span><span className="settings-target-name">{studyTargetLabel(prompt)}<small>{quizRegions.find(region=>region.id===(prompt.region??'other'))?.label}{prompt.bone?prompt.landmark?` · ${prompt.group??prompt.bone}`:' · Side identification':''}</small></span></label>)}{!visible.length&&<p className="settings-empty">No matching targets. Try a broader term.</p>}</div>
    </div>}
    <footer className="settings-footer"><p>{selected.size?`${selected.size} ${selected.size===1?'structure':'structures'} selected`:'Select at least one structure.'}</p><button className="continue-button" disabled={selected.size===0} onClick={()=>onApply(active,draft)}>{mode==='study'?'Save & study':'Save & practice'}<ArrowRight size={16}/></button></footer>
  </div></div>;
}
