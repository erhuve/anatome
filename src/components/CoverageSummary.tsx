import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, Bone, BookOpen, Boxes, Brain, ChevronDown, Dna, Droplets, Heart, Layers, ListChecks, Microscope, Move, Search, Shield, Wind, X } from 'lucide-react';
import { catalogScope, curriculumCoverage, getCatalogSummary, modelCatalog, studyCatalog, type CatalogDomain, type CatalogItem } from '../studyCatalog';
import { courseSectionsFor, catalogPromptIdsFor, sectionsForCatalogItem, sectionsForModelPart } from '../coverageNavigation';
import { histologySlides } from '../histology';
import { quizRegions } from '../modelQuiz';
import { studySections, type StudySection } from '../studySections';

type Props = { onSelectSection?: (section: StudySection) => void; mode?: 'quiz' | 'study' };
type CoverageView = 'course' | 'lab' | 'models';
const icons: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  foundations: BookOpen, tissues: Microscope, integument: Layers, bones: Bone, joints: Move,
  muscles: Activity, nervous: Brain, endocrine: Activity, cardiovascular: Heart,
  lymphatic: Shield, respiratory: Wind, digestive: Activity, urinary: Droplets, reproductive: Dna,
};
const subjectNames = { all: 'All subjects', bones: 'Bones', muscles: 'Muscles', tissues: 'Tissues' };
const moduleImages: Record<string, string> = { bones: '/sections/skull-hyoid.webp', muscles: '/sections/shoulder-muscles.webp', tissues: '/histology/simple-squamous.jpg' };
const summary = getCatalogSummary();
const totalTargets = studySections.reduce((total, section) => total + section.promptIds.length, 0);
const courseNames = new Map(curriculumCoverage.map(module => [module.id, module.title]));

function imageForItem(item: CatalogItem): string | undefined {
  const section = sectionsForCatalogItem(item.id)[0];
  return section ? `/sections/${section.id}.webp` : histologySlides.find(slide => item.slideIds.includes(slide.id))?.image;
}

export default function CoverageSummary({ onSelectSection, mode = 'quiz' }: Props) {
  const [view, setView] = useState<CoverageView>('course');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<'all' | CatalogDomain>('all');
  const [groupId, setGroupId] = useState('');
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [practiceOnly, setPracticeOnly] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every(word => text.toLowerCase().includes(word));
  const course = curriculumCoverage.filter(module => (!practiceOnly || courseSectionsFor(module.id).length > 0)
    && matches(`${module.title} ${module.description} ${module.topics.join(' ')} ${module.gaps.join(' ')}`));
  const labGroups = useMemo(() => studyCatalog.filter(group => (domain === 'all' || group.domain === domain) && (!groupId || group.id === groupId))
    .map(group => ({ ...group, entries: group.entries.filter(item => matches(`${item.name} ${item.detail} ${group.name}`)) }))
    .filter(group => group.entries.length), [domain, groupId, query]);
  const models = useMemo(() => modelCatalog.filter(part => (domain === 'all' || domain === 'muscles' && part.collection === 'muscles' || domain === 'bones' && part.collection === 'skeleton')
    && matches(`${part.name} ${part.group} ${part.region} ${part.source}`)), [domain, query]);
  const sections = moduleId ? courseSectionsFor(moduleId).filter(section => matches(`${section.title} ${section.description}`)) : [];
  const labCount = labGroups.reduce((count, group) => count + group.entries.length, 0);
  const viewTitle = moduleId ? courseNames.get(moduleId) ?? 'Practice sections' : view === 'course' ? 'The A&P course map' : view === 'lab' ? 'Lab checklist' : 'Model library';

  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [view, query, domain, groupId, moduleId, practiceOnly]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [view, moduleId]);
  function changeView(next: CoverageView) { setView(next); setModuleId(null); setDomain('all'); setGroupId(''); setPracticeOnly(false); }
  function openModule(id: string) { setModuleId(id); setQuery(''); }

  function sectionAction(section: StudySection) {
    return <button className="coverage-practice-link" key={section.id} disabled={!onSelectSection} onClick={() => onSelectSection?.(section)}>
      <span>{mode === 'study' ? 'Study' : 'Practice'} {section.title}</span><ArrowRight size={13}/>
    </button>;
  }

  return <section className="coverage-browser" aria-label="Course coverage and study inventory">
    <aside className="coverage-browser-sidebar">
      <p className="coverage-browser-label">Explore coverage</p>
      <nav className="coverage-view-nav" aria-label="Coverage view">{([
        { id: 'course', label: 'Course map', icon: BookOpen, count: curriculumCoverage.length },
        { id: 'lab', label: 'Lab checklist', icon: ListChecks, count: summary.referenceEntries },
        { id: 'models', label: 'Model library', icon: Boxes, count: summary.sourceModelParts },
      ] as const).map(item => <button key={item.id} aria-pressed={view === item.id} onClick={() => changeView(item.id)}><item.icon size={15}/><span>{item.label}</span><small>{item.count}</small></button>)}</nav>
      <div className="coverage-browser-key"><strong>What can I practice?</strong><p>3D practice covers bones, landmarks and muscles. Other course topics link to reading and reference material.</p><a href={catalogScope.sources[0].url} target="_blank" rel="noreferrer">Textbook sequence<ArrowUpRight size={11}/></a></div>
    </aside>
    <div className="coverage-browser-main">
      <div className="coverage-browser-toolbar"><label className="coverage-browser-search"><Search size={17}/><input aria-label={moduleId ? 'Search available sections' : view === 'course' ? 'Search course topics' : view === 'lab' ? 'Search lab checklist' : 'Search model library'} placeholder={moduleId ? 'Find a practice section…' : view === 'course' ? 'Find a topic or system…' : 'Find a structure…'} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button aria-label="Clear coverage search" onClick={() => setQuery('')}><X size={15}/></button>}</label>
        {view === 'course' && !moduleId && <div className="coverage-subject-filters" role="group" aria-label="Course topic availability"><button aria-pressed={!practiceOnly} onClick={() => setPracticeOnly(false)}>All topics</button><button aria-pressed={practiceOnly} onClick={() => setPracticeOnly(true)}>Practice available</button></div>}
        {view !== 'course' && <div className="coverage-subject-filters" aria-label="Filter inventory subject">{(['all', 'bones', 'muscles', ...(view === 'lab' ? ['tissues'] as const : [])] as const).map(value => <button key={value} aria-pressed={domain === value} onClick={() => { setDomain(value); setGroupId(''); }}>{subjectNames[value]}</button>)}</div>}
        {view === 'lab' && <label className="coverage-group-filter">Lab group<select aria-label="Choose lab group" value={groupId} onChange={event => setGroupId(event.target.value)}><option value="">All lab groups</option>{studyCatalog.filter(group => domain === 'all' || group.domain === domain).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
      </div>
      <div className="coverage-browser-scroll" ref={scroll}>
        {moduleId && <button className="coverage-back" onClick={() => { setModuleId(null); setQuery(''); }}><ArrowLeft size={14}/>Course map</button>}
        <div className="coverage-browser-heading"><h3 ref={heading} tabIndex={-1}>{viewTitle}</h3><span role="status">{moduleId ? `${sections.length} sections` : view === 'course' ? `${course.length} topics` : view === 'lab' ? `${labCount} entries` : `${models.length} parts`}</span></div>
        {view === 'course' && !moduleId && <>
          <div className="coverage-practice-overview"><strong>{studySections.length}<span>practice sections</span></strong><strong>{totalTargets}<span>identification targets</span></strong><p>A typical A&P sequence. Available practice covers selected parts of the course.</p></div>
          <div className="coverage-course-grid">{course.map(module => {
            const available = courseSectionsFor(module.id);
            const Icon = icons[module.id] ?? BookOpen;
            const image = moduleImages[module.id];
            return <article className={'coverage-topic-card' + (available.length ? ' has-practice' : '')} key={module.id}>
              <div className="coverage-topic-visual">{image ? <img className={module.id === 'tissues' ? 'coverage-photo' : undefined} src={image} alt="" loading="lazy"/> : <Icon size={38} strokeWidth={1.2}/>}<span>{String(curriculumCoverage.findIndex(item => item.id === module.id) + 1).padStart(2, '0')}</span></div>
              <div className="coverage-topic-body"><div className="coverage-topic-meta"><span>{module.chapter} · Semester {module.semester}</span><span className={'coverage-availability' + (available.length ? ' playable' : '')}>{available.length ? 'Identification practice' : module.id === 'tissues' ? 'Photo references' : 'Reference topic'}</span></div>
                <h4>{module.title}</h4><p>{module.description}</p>
                <details className="coverage-topic-details"><summary>Topics & current coverage<ChevronDown size={12}/></summary><ul>{module.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>{module.gaps.map(gap => <p key={gap}>{gap}</p>)}</details>
                <div className="coverage-topic-actions">{available.length > 0 && <button onClick={() => openModule(module.id)}>Browse {available.length} sections<ArrowRight size={14}/></button>}{module.id === 'tissues' && <button onClick={() => { changeView('lab'); setDomain('tissues'); setQuery(''); }}>View photo references<ArrowRight size={14}/></button>}<a href={module.source} target="_blank" rel="noreferrer">Read chapter<ArrowUpRight size={12}/></a></div>
              </div>
            </article>;
          })}</div>
          {!course.length && <EmptyResults onClear={() => { setQuery(''); setPracticeOnly(false); }}/>}
          <details className="coverage-scope-details"><summary>About this coverage map<ChevronDown size={13}/></summary><p>{catalogScope.description}</p><ul>{catalogScope.limitations.map(note => <li key={note}>{note}</li>)}</ul><div>{catalogScope.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={11}/></a>)}</div></details>
        </>}
        {moduleId && <>
          <p className="coverage-section-intro">Choose a section to {mode === 'study' ? 'start studying' : 'start a quiz'}. These sections assess identification; the chapter also includes topics beyond the current quizzes.</p>
          <div className="coverage-section-grid">{sections.map(section => <button key={section.id} className="coverage-section-card" disabled={!onSelectSection} aria-label={`${mode === 'study' ? 'Study' : 'Start quiz'}: ${section.title}`} onClick={() => onSelectSection?.(section)}><img src={`/sections/${section.id}.webp`} width="480" height="300" alt="" loading="lazy"/><span><strong>{section.title}</strong><small>{section.promptIds.length} targets</small><span>{mode === 'study' ? 'Study section' : 'Start quiz'}<ArrowRight size={14}/></span></span></button>)}</div>
          {!sections.length && <EmptyResults onClear={() => setQuery('')}/>}
        </>}
        {view === 'lab' && <>
          <p className="coverage-list-intro">Use your course list to choose what to learn. Open an entry for its study notes, references and available practice.</p>
          {labGroups.map(group => <section className="coverage-checklist-group" key={group.id}><div className="coverage-checklist-heading"><h4>{group.name}</h4><span>{group.entries.length} entries</span></div><p>{group.description}{group.scope === 'additional-instructor-selected' ? ' Additional instructor-selected material.' : ''}</p>
            {group.entries.map(item => {
              const targets = catalogPromptIdsFor(item.id);
              const linkedSections = sectionsForCatalogItem(item.id);
              const photo = imageForItem(item);
              return <details className="coverage-inventory-row" key={item.id}><summary>{photo && <img src={photo} alt="" loading="lazy"/>}<span className="coverage-inventory-name">{item.name}<small>{item.kind}</small></span><span className={'coverage-row-status' + (targets.length ? ' playable' : '')}>{targets.length ? `${targets.length} quiz ${targets.length === 1 ? 'target' : 'targets'}` : item.slideIds.length ? 'Photo reference' : 'Reference only'}</span><ChevronDown size={14}/></summary>
                <div className="coverage-inventory-details"><p>{item.detail}</p>{item.modelPartIds.length > 0 && <p className="coverage-gap">{item.modelPartIds.length} linked model component{item.modelPartIds.length === 1 ? '' : 's'}.</p>}{item.landmarkIds.length > 0 && <p className="coverage-gap">{item.landmarkIds.length} reviewed surface locator{item.landmarkIds.length === 1 ? '' : 's'}.</p>}{item.gaps.map(gap => <p className="coverage-gap" key={gap}>{gap}</p>)}{item.contextPartIds.length > 0 && <p className="coverage-gap">Related whole-bone geometry is available; this feature has no complete reviewed label set.</p>}
                  {linkedSections.length > 0 && <div className="coverage-linked-sections"><span>Included in these practice sections</span>{linkedSections.map(sectionAction)}</div>}
                  <div className="coverage-reference-links"><a href={item.source} target="_blank" rel="noreferrer">Study reference<ArrowUpRight size={12}/></a>{item.slideIds.map(id => { const slide = histologySlides.find(candidate => candidate.id === id); return slide ? <a key={id} href={slide.image} target="_blank" rel="noreferrer">View photo reference<ArrowUpRight size={12}/></a> : null; })}</div>
                </div>
              </details>;
            })}
          </section>)}
          {!labCount && <EmptyResults onClear={() => { setQuery(''); setDomain('all'); setGroupId(''); }}/>}
        </>}
        {view === 'models' && <>
          <p className="coverage-list-intro">{summary.skeletalModelParts} skeletal parts and {summary.muscleModelParts} muscle components. Counts include subdivisions, cartilage and discs.</p>
          <div className="coverage-model-list">{models.map(part => <details className="coverage-inventory-row" key={`${part.collection}-${part.id}`}><summary><span className={'coverage-model-icon ' + part.collection}>{part.collection === 'muscles' ? <Activity size={18}/> : <Bone size={18}/>}</span><span className="coverage-inventory-name">{part.name}<small>{quizRegions.find(region => region.id === part.region)?.label ?? part.region}</small></span><span className="coverage-row-status playable">3D identification</span><ChevronDown size={14}/></summary><div className="coverage-inventory-details"><p>{part.group} · {part.kind}{part.side ? ` · ${part.side}` : ''}{part.depth !== 'not-applicable' ? ` · depth ${part.depth}` : ''}</p><p className="coverage-gap">{part.presentation === 'isolate' ? 'Starts isolated to expose the component.' : 'Starts with neighboring anatomy for orientation.'}</p><div className="coverage-linked-sections"><span>Included in this practice section</span>{sectionsForModelPart(part.collection, part.id).map(sectionAction)}</div><div className="coverage-reference-links">{part.sourceUrl && <a href={part.sourceUrl} target="_blank" rel="noreferrer">{part.source ?? 'Source anatomy'}{part.license ? ` · ${part.license}` : ''}<ArrowUpRight size={12}/></a>}</div><small className="coverage-source-id">Source part {part.id} · {part.sourceId}</small></div></details>)}</div>
          {!models.length && <EmptyResults onClear={() => { setQuery(''); setDomain('all'); }}/>}
        </>}
      </div>
    </div>
  </section>;
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return <div className="coverage-empty-results"><Search size={25}/><h4>No matches found</h4><p>Try another structure or topic, or reset your filters.</p><button onClick={onClear}>Reset search & filters</button></div>;
}
