import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { quizRegions, type ModelPrompt } from '../modelQuiz';
import { findStudyTargets, studyTargetLabel } from '../studyNavigation';

export default function StudyBrowser({ targets, selectedId, onSelect, onClose }: {
  targets: ModelPrompt[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const visible = findStudyTargets(targets, query, region);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('input')?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button,input,select') ?? []).filter(item => !item.hasAttribute('disabled'));
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0]?.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);

  return <div className="settings-overlay" onClick={onClose}><div className="settings-dialog study-browser" role="dialog" aria-modal="true" aria-labelledby="study-browser-title" ref={panel} onClick={event => event.stopPropagation()}>
    <header className="settings-heading"><h2 id="study-browser-title">Browse structures</h2><button className="icon-control" aria-label="Close structure browser" onClick={onClose}><X size={19}/></button></header>
    <div className="study-browser-filters"><label className="settings-search"><Search size={15}/><input aria-label="Search structures to study" placeholder="Name, side, or region…" value={query} onChange={event => setQuery(event.target.value)}/></label><select aria-label="Filter study region" value={region} onChange={event => setRegion(event.target.value)}><option value="">All regions</option>{quizRegions.filter(item => targets.some(prompt => prompt.region === item.id)).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    <p className="study-browser-count" role="status">{visible.length} of {targets.length} structures</p>
    <div className="study-browser-list">{visible.map(prompt => <button key={prompt.id} aria-current={prompt.id === selectedId ? 'true' : undefined} onClick={() => onSelect(prompt.id)}><span>{studyTargetLabel(prompt)}<small>{quizRegions.find(region => region.id === (prompt.region ?? 'other'))?.label}{prompt.bone ? prompt.landmark ? ` · ${prompt.group ?? prompt.bone}` : ' · Side identification' : ''}</small></span><ArrowRight size={14}/></button>)}{!visible.length && <p className="settings-empty">No matching structures. Try another name or region.</p>}</div>
  </div></div>;
}
