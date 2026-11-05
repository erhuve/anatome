import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Search, SlidersHorizontal, X } from 'lucide-react';
import { modelPromptPools, type ModelCollection } from '../modelQuiz';
import { getModelPass, modelScopeKey, type ModelPasses } from '../modelPass';
import type { QuizSelections } from '../quizSelection';
import { findStudySection, studySections, studyUnits, type StudySection } from '../studySections';

type Props = {
  collection: ModelCollection;
  selections: QuizSelections;
  passes: ModelPasses;
  onSelect: (section: StudySection) => void;
  mode?: 'quiz' | 'study';
  onCustomize?: () => void;
  onCoverage?: () => void;
};

const unitLabels: Record<string, string> = {
  'axial-skeleton': 'Axial skeleton',
  'appendicular-skeleton': 'Appendicular skeleton',
  'axial-muscles': 'Head & trunk muscles',
  'upper-limb-muscles': 'Upper-limb muscles',
  'lower-limb-muscles': 'Lower-limb muscles',
};
const promptNames = new Map(Object.values(modelPromptPools).flat().map(prompt => [prompt.id, prompt.answer]));
const sectionStructureNames = new Map(studySections.map(section => [section.id, section.promptIds.map(id => promptNames.get(id) ?? '').join(' ')]));

export default function StudySections({ collection, selections, passes, onSelect, mode = 'quiz', onCustomize, onCoverage }: Props) {
  const current = findStudySection(collection, selections[collection]);
  const [unitId, setUnitId] = useState(() => studyUnits.find(unit => unit.sections.some(section => section.id === current?.id))?.id
    ?? studyUnits.find(unit => unit.sections.some(section => section.collection === collection))?.id ?? studyUnits[0].id);
  const [query, setQuery] = useState('');
  const scroll = useRef<HTMLDivElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const unit = studyUnits.find(item => item.id === unitId);
  const visible = studyUnits.flatMap(item => item.sections.map(section => ({ section, unit: item })))
    .filter(item => words.length ? words.every(word => `${item.section.title} ${item.section.description} ${item.unit.title} ${sectionStructureNames.get(item.section.id)}`.toLowerCase().includes(word)) : !unitId || item.unit.id === unitId);
  const heading = words.length ? 'Search results' : unit ? unitLabels[unit.id] ?? unit.title : 'All sections';

  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [unitId, query]);

  function chooseUnit(id: string) { setUnitId(id); setQuery(''); }

  return <div className="section-browser" aria-label="Browse study sections">
    <aside className="section-browser-sidebar">
      <p className="section-browser-label">Browse by unit</p>
      <nav className="section-unit-nav" aria-label="Study units">
        <button className={!unitId && !words.length ? 'is-active' : ''} aria-pressed={!unitId && !words.length} onClick={() => chooseUnit('')}><span className="section-unit-icon"><BookOpen size={15}/></span><span>All sections</span><small>{studySections.length}</small></button>
        {studyUnits.map((item, index) => <button key={item.id} className={unitId === item.id && !words.length ? 'is-active' : ''} aria-pressed={unitId === item.id && !words.length} onClick={() => chooseUnit(item.id)}><span className="section-unit-icon">{String(index + 1).padStart(2, '0')}</span><span>{unitLabels[item.id] ?? item.title}</span><small>{item.sections.length}</small></button>)}
      </nav>
      {(onCustomize || onCoverage) && <div className="section-browser-more">
        {onCustomize && <button onClick={onCustomize}><SlidersHorizontal size={14}/>Custom selection</button>}
        {onCoverage && <button onClick={onCoverage}><BookOpen size={14}/>Course coverage</button>}
      </div>}
    </aside>
    <div className="section-browser-content">
      <div className="section-browser-search"><Search size={17}/><input aria-label="Search sections" placeholder="Search sections or structures…" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="Clear section search" onClick={() => setQuery('')}><X size={15}/></button>}</div>
      <div className="section-browser-scroll" ref={scroll}>
        <div className="section-browser-heading"><h3>{heading}</h3><span role="status">{visible.length} {visible.length === 1 ? 'section' : 'sections'}</span></div>
        <div className="section-image-grid">
          {visible.map(({ section, unit: sectionUnit }) => {
            const pass = getModelPass(passes, section.collection, modelScopeKey(section.collection, section.promptIds));
            const covered = new Set(pass.coveredIds);
            const count = section.promptIds.filter(id => covered.has(id)).length;
            const complete = count === section.promptIds.length;
            const active = current?.id === section.id;
            return <button className={'section-image-card' + (active ? ' is-current' : '')} key={section.id} aria-label={`${mode === 'study' ? 'Study' : 'Start quiz'}: ${section.title}`} onClick={() => onSelect(section)}>
              <span className="section-card-image"><img src={`/sections/${section.id}.webp`} width="480" height="300" alt="" loading="lazy"/>{active && <span className="section-current-badge">Current section</span>}</span>
              <span className="section-image-card-body">
                {(words.length > 0 || !unitId) && <span className="section-card-unit">{unitLabels[sectionUnit.id] ?? sectionUnit.title}</span>}
                <span className="section-image-card-title">{section.title}</span>
                <span className="section-image-card-meta">{section.promptIds.length} targets{count > 0 && <span>{complete && <Check size={10}/>} {count} covered</span>}</span>
                <span className="section-card-start">{mode === 'study' ? 'Study section' : complete ? 'Practice again' : count > 0 ? 'Continue quiz' : 'Start quiz'}<ArrowRight size={15}/></span>
              </span>
            </button>;
          })}
        </div>
        {!visible.length && <div className="section-search-empty"><Search size={24}/><h4>No sections found</h4><p>Try a body region or structure, like “hand” or “vertebrae”.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
      </div>
    </div>
  </div>;
}
