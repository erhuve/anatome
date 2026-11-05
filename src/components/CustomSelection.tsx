import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Search, SlidersHorizontal, X } from 'lucide-react';
import { modelPromptPools, type ModelCollection } from '../modelQuiz';
import { selectedPromptIds, type QuizSelections } from '../quizSelection';
import { editSelection, findSelectionTargets } from '../selectionEditing';
import { studySections, studyUnits } from '../studySections';
import { studyTargetLabel } from '../studyNavigation';

type Props = {
  collection: ModelCollection;
  selections: QuizSelections;
  onCollectionChange: (collection: ModelCollection) => void;
  onChange: (selections: QuizSelections) => void;
};
const collections = [
  { id: 'muscles', title: 'Muscles', image: 'shoulder-muscles' },
  { id: 'skeleton', title: 'Bones', image: 'skull-hyoid' },
  { id: 'landmarks', title: 'Landmarks & side', image: 'scapula-details' },
] as const;
const sectionByPrompt = new Map(studySections.flatMap(section => section.promptIds.map(id => [id, section] as const)));
const unitBySection = new Map(studyUnits.flatMap(unit => unit.sections.map(section => [section.id, unit.title] as const)));

function GroupCheckbox({ checked, partial, label, onChange }: { checked: boolean; partial: boolean; label: string; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = partial; }, [partial]);
  return <input ref={input} type="checkbox" checked={checked} aria-label={label} aria-checked={partial ? 'mixed' : checked} onChange={onChange}/>;
}

export default function CustomSelection({ collection, selections, onCollectionChange, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const detailHeading = useRef<HTMLButtonElement>(null);
  const overviewScroll = useRef(0);
  const removedTargetIndex = useRef<number | null>(null);
  const pool = modelPromptPools[collection];
  const selected = useMemo(() => new Set(selectedPromptIds(collection, selections)), [collection, selections]);
  const sections = studySections.filter(section => section.collection === collection);
  const detail = sections.find(section => section.id === detailId);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const prompts = findSelectionTargets(pool, query).filter(prompt => (!detail || detail.promptIds.includes(prompt.id)) && (!selectedOnly || selected.has(prompt.id)));
  const ids = prompts.map(prompt => prompt.id);
  const currentName = collections.find(item => item.id === collection)!.title;
  const visibleSections = sections.filter(section => !selectedOnly || section.promptIds.some(id => selected.has(id)));
  const showingTargets = !!detail || words.length > 0 || selectedOnly;

  useEffect(() => { setDetailId(null); setQuery(''); setSelectedOnly(false); }, [collection]);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [collection, detailId, query, selectedOnly]);
  useLayoutEffect(() => {
    const index = removedTargetIndex.current;
    if (index === null) return;
    removedTargetIndex.current = null;
    if (scroll.current?.contains(document.activeElement)) return;
    const remaining = Array.from(scroll.current?.querySelectorAll<HTMLInputElement>('.custom-target-rows input') ?? []);
    const target = remaining[Math.min(index, remaining.length - 1)]
      ?? scroll.current?.querySelector<HTMLElement>('.custom-builder-empty button,button:not([disabled])');
    target?.focus({ preventScroll: true });
  }, [selections]);

  function update(targetIds: readonly string[], operation: 'add' | 'remove') { onChange(editSelection(collection, selections, targetIds, operation)); }
  function toggle(id: string) {
    if (selectedOnly && selected.has(id)) removedTargetIndex.current = prompts.findIndex(prompt => prompt.id === id);
    update([id], selected.has(id) ? 'remove' : 'add');
  }
  function showDetail(id: string) {
    overviewScroll.current = scroll.current?.scrollTop ?? 0; setDetailId(id); setQuery(''); setSelectedOnly(false);
    requestAnimationFrame(() => detailHeading.current?.focus({ preventScroll: true }));
  }
  function backToSections() {
    const previousDetail = detailId;
    setDetailId(null); setQuery(''); setSelectedOnly(false);
    requestAnimationFrame(() => {
      if (scroll.current) scroll.current.scrollTop = overviewScroll.current;
      scroll.current?.querySelector<HTMLElement>(`[data-edit-section="${previousDetail}"]`)?.focus({ preventScroll: true });
    });
  }

  return <div className="custom-builder" aria-label="Build a custom selection">
    <aside className="custom-builder-sidebar">
      <p className="custom-builder-label">Choose a collection</p>
      <nav className="custom-collection-nav" aria-label="Custom selection collection">
        {collections.map(item => <button key={item.id} className={collection === item.id ? 'is-active' : ''} aria-pressed={collection === item.id} onClick={() => onCollectionChange(item.id)}>
          <img src={`/sections/${item.image}.webp`} width="58" height="42" alt=""/>
          <span>{item.title}<small>{modelPromptPools[item.id].length} targets</small></span>
        </button>)}
      </nav>
      <p className="custom-collection-note">Combine sections and targets within one collection.</p>
    </aside>
    <div className="custom-builder-content">
      <div className="custom-builder-search"><Search size={17}/><input aria-label="Search custom targets" placeholder="Find a section or structure…" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="icon-control" aria-label="Clear custom target search" onClick={() => setQuery('')}><X size={15}/></button>}</div>
      <div className="custom-builder-toolbar">
        <button className={'custom-selected-filter' + (selectedOnly ? ' is-active' : '')} aria-pressed={selectedOnly} onClick={() => setSelectedOnly(value => !value)}><Check size={13}/>{selectedOnly ? 'Showing selected' : 'Review selected'}<span>{selected.size}</span></button>
        <div><button onClick={() => update(pool.map(prompt => prompt.id), 'add')}>Select all {currentName.toLowerCase()}</button><button onClick={() => update(pool.map(prompt => prompt.id), 'remove')}>Clear {currentName.toLowerCase()}</button></div>
      </div>
      <div className="custom-builder-scroll" ref={scroll}>
        {detail ? <>
          <button className="custom-detail-back" ref={detailHeading} onClick={backToSections}><ArrowLeft size={14}/>All {currentName.toLowerCase()} sections</button>
          <div className="custom-detail-heading"><img src={`/sections/${detail.id}.webp`} width="144" height="90" alt=""/><div><h3>{detail.title}</h3><p>{detail.description}</p><span>{detail.promptIds.filter(id => selected.has(id)).length} of {detail.promptIds.length} selected</span></div></div>
        </> : <div className={'custom-builder-heading' + (!showingTargets ? ' is-sections' : '')}><div><h3>{selectedOnly ? 'Your selected targets' : words.length ? 'Matching targets' : `${currentName} sections`}</h3><p>{showingTargets ? `${prompts.length} ${prompts.length === 1 ? 'target' : 'targets'}` : 'Select whole sections, or edit their individual targets.'}</p></div></div>}
        {showingTargets ? <>
          <div className="custom-target-bulk"><span>{detail ? `${prompts.length} shown` : 'Edit the targets shown below'}</span><div><button disabled={!ids.length} onClick={() => update(ids, 'add')}>Add shown</button><button disabled={!ids.length} onClick={() => update(ids, 'remove')}>Remove shown</button></div></div>
          <div className="custom-target-rows" aria-label="Custom study targets">{prompts.map(prompt => {
            const section = sectionByPrompt.get(prompt.id)!;
            return <label className={selected.has(prompt.id) ? 'is-selected' : ''} key={prompt.id}>
              <img src={`/targets/${prompt.id}.webp`} width="192" height="128" alt="" loading="lazy" decoding="async"/>
              <span>{studyTargetLabel(prompt)}{!detail && <small>{section.title}</small>}</span>
              <input type="checkbox" checked={selected.has(prompt.id)} aria-label={`Include ${studyTargetLabel(prompt)}`} onChange={() => toggle(prompt.id)}/>
            </label>;
          })}</div>
          {!prompts.length && <div className="custom-builder-empty"><Search size={24}/><h4>{selectedOnly ? 'Nothing selected here yet' : 'No matching targets'}</h4><p>{selectedOnly ? 'Choose sections to build your practice set.' : 'Try another name, side, or section.'}</p><button onClick={() => { setQuery(''); setSelectedOnly(false); }}>Show sections</button></div>}
        </> : <div className="custom-section-grid">{visibleSections.map(section => {
          const count = section.promptIds.filter(id => selected.has(id)).length;
          const all = count === section.promptIds.length;
          return <article key={section.id} className={'custom-section-card' + (count ? ' has-selection' : '')}>
            <label className="custom-section-select">
              <span className="custom-section-image"><img src={`/sections/${section.id}.webp`} width="480" height="300" alt="" loading="lazy"/><span className="custom-section-check"><GroupCheckbox checked={all} partial={count > 0 && !all} label={`Include section: ${section.title}`} onChange={() => update(section.promptIds, all ? 'remove' : 'add')}/></span></span>
              <span className="custom-section-card-body"><small>{unitBySection.get(section.id)}</small><strong>{section.title}</strong><span className="custom-section-count">{count ? <Check size={11}/> : null}{count} / {section.promptIds.length} selected</span></span>
            </label>
            <button type="button" className="custom-section-edit" data-edit-section={section.id} aria-label={`Edit targets: ${section.title}`} onClick={() => showDetail(section.id)}><SlidersHorizontal size={16} aria-hidden="true"/><span>Edit targets</span><ArrowRight size={16} aria-hidden="true"/></button>
          </article>;
        })}</div>}
      </div>
    </div>
  </div>;
}
