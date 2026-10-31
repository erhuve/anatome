import { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { catalogScope, curriculumCoverage, getCatalogSummary, modelCatalog, studyCatalog, type CatalogDomain } from '../studyCatalog';
import { quizRegions } from '../modelQuiz';

/** Optional settings content. This is a section, not a modal or another app shell. */
export default function CoverageSummary() {
  const [tab, setTab] = useState<'lab' | 'models' | 'course'>('lab');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<'all' | CatalogDomain>('all');
  const summary = getCatalogSummary();
  const term = query.trim().toLowerCase();
  const labGroups = useMemo(() => studyCatalog.filter(group => domain === 'all' || group.domain === domain)
    .map(group => ({ ...group, entries: group.entries.filter(item => !term || `${item.name} ${item.detail} ${group.name}`.toLowerCase().includes(term)) }))
    .filter(group => group.entries.length), [domain, term]);
  const models = useMemo(() => modelCatalog.filter(part => (domain === 'all' || domain === 'muscles' && part.collection === 'muscles' || domain === 'bones' && part.collection === 'skeleton')
    && (!term || `${part.name} ${part.group} ${part.region}`.toLowerCase().includes(term))), [domain, term]);
  const course = curriculumCoverage.filter(module => !term || `${module.title} ${module.topics.join(' ')}`.toLowerCase().includes(term));

  return <section className="coverage-summary" aria-label="Curriculum coverage and study inventory">
    <style>{`
      .coverage-summary{color:#d7dadd;font:13px/1.65 system-ui,sans-serif;min-width:0}
      .coverage-summary h2,.coverage-summary h3,.coverage-summary h4,.coverage-summary p{margin:0}
      .coverage-summary h2{font-size:25px;letter-spacing:-.7px;color:#f0f1f2;line-height:1.2}
      .coverage-summary h3{font-size:16px;color:#e5e7e9;line-height:1.4}
      .coverage-summary h4{font-size:13px;color:#e5e7e9;font-weight:550}
      .coverage-intro{margin:13px 0 22px!important;color:#a5aab0;max-width:760px}
      .coverage-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#34373b;border:1px solid #34373b;border-radius:7px;overflow:hidden;margin-bottom:20px}
      .coverage-stats>div{padding:14px 16px;background:#202225;color:#a9aeb5;font-size:11px}
      .coverage-stats strong{display:block;font-size:24px;color:#e8ebee;font-weight:500}
      .coverage-tabs{display:flex;gap:18px;flex-wrap:wrap;border-bottom:1px solid #35383c;margin:0 0 18px}
      .coverage-tabs button{padding:9px 0;color:#969ca5;background:none;border:0;border-bottom:2px solid transparent;font:inherit;cursor:pointer}
      .coverage-tabs button[aria-pressed=true]{color:#edf0f4;border-bottom-color:#9bb9d9}
      .coverage-search{display:flex;align-items:center;gap:9px;border:1px solid #3c4147;border-radius:6px;padding:9px 11px;color:#8e969f;margin-bottom:12px}
      .coverage-search input{background:none;border:0;outline:none;color:#e5e9ef;font:inherit;min-width:0;width:100%}
      .coverage-filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:21px}
      .coverage-filters button{font:inherit;font-size:11px;color:#a4acb6;border:1px solid #3c4249;border-radius:4px;background:none;padding:4px 10px;cursor:pointer}
      .coverage-filters button[aria-pressed=true]{background:#303842;color:#e5eef9;border-color:#52677e}
      .coverage-group{margin-bottom:25px}.coverage-group>p{color:#969da6;font-size:12px;margin:5px 0 11px}
      .coverage-row{padding:13px 0;border-top:1px solid #30353b}.coverage-row-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .coverage-row>p{margin:5px 0;color:#a2a9b2;font-size:12px}.coverage-badge{font-size:9px;white-space:nowrap;padding:2px 6px;border:1px solid #455160;border-radius:4px;color:#a8bfd9}
      .coverage-badge.reference{border-color:#49423a;color:#b5a48f}.coverage-row small{display:block;font-size:10px;color:#878f99;margin-top:5px}
      .coverage-row a,.coverage-links a,.coverage-module a{font-size:11px;color:#a9c3e0;display:inline-flex;gap:5px;align-items:center;text-decoration:none;margin-top:6px}
      .coverage-row a:hover,.coverage-links a:hover,.coverage-module a:hover{text-decoration:underline}
      .coverage-linked{color:#9daab9!important}.coverage-links{display:flex;gap:17px;flex-wrap:wrap;margin-top:18px}
      .coverage-note{color:#a4aab3;font-size:11px;padding:13px 15px;background:#23262a;border:1px solid #363b41;border-radius:5px;margin:15px 0}
      .coverage-limitations{padding-left:18px;color:#989fa9;font-size:11px;margin:15px 0 0}.coverage-limitations li{margin:6px 0}
      .coverage-module{border-top:1px solid #35393f;padding:17px 0}.coverage-module>p{color:#a7aeb7;margin:7px 0;font-size:12px}
      .coverage-topics{padding-left:17px;color:#a0a8b2;margin:10px 0;font-size:12px}.coverage-status{font-size:10px;color:#9cb4ce;display:block;margin-top:5px}
      .coverage-model-meta{color:#858f9b!important}.coverage-empty{padding:30px 0;color:#9da5af}
      .coverage-summary button:focus-visible,.coverage-summary a:focus-visible,.coverage-summary input:focus-visible{outline:2px solid #8aaed7;outline-offset:4px}
      @media(max-width:520px){.coverage-stats{grid-template-columns:1fr}.coverage-stats>div{padding:10px 13px}.coverage-stats strong{display:inline;margin-right:9px;font-size:19px}.coverage-row-head{gap:8px}.coverage-summary h2{font-size:22px}}
    `}</style>
    <h2>{catalogScope.title}</h2>
    <p className="coverage-intro">{catalogScope.description}</p>
    <div className="coverage-stats">
      <div><strong>{summary.sourceModelParts}</strong>source model components</div>
      <div><strong>{summary.referenceEntries}</strong>lab checklist entries</div>
      <div><strong>{summary.referenceOnlyEntries}</strong>entries with reference material only</div>
    </div>
    <nav className="coverage-tabs" aria-label="Coverage view">
      {([{ id: 'lab', name: 'Lab inventory' }, { id: 'models', name: 'All model parts' }, { id: 'course', name: 'Full course map' }] as const)
        .map(item => <button key={item.id} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.name}</button>)}
    </nav>
    <label className="coverage-search"><Search size={15}/><input aria-label="Search study inventory" placeholder="Find a structure or topic" value={query} onChange={event => setQuery(event.target.value)}/></label>
    {tab !== 'course' && <div className="coverage-filters" aria-label="Filter inventory subject">{(['all', 'bones', 'muscles', 'tissues'] as const).map(value =>
      <button key={value} aria-pressed={domain === value} onClick={() => setDomain(value)}>{value === 'all' ? 'All subjects' : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div>}
    {tab === 'lab' && <>
      <p className="coverage-note">{summary.entriesWithLinkedAssets} checklist entries have linked model components, reviewed locators or photographs. “Reference only” means you can study the original description and source, but the visual asset is not included. A 3D link does not imply every feature or learning task is assessed.</p>
      {labGroups.map(group => <section className="coverage-group" key={group.id}>
        <h3>{group.name}</h3><p>{group.description}{group.scope === 'additional-instructor-selected' ? ' Additional instructor-selected material.' : ''}</p>
        {group.entries.map(item => <article className="coverage-row" key={item.id}>
          <div className="coverage-row-head"><h4>{item.name}</h4><span className={'coverage-badge' + (item.coverage === 'reference-only' ? ' reference' : '')}>{item.coverage === 'reference-only' ? 'Reference only' : item.landmarkIds.length ? 'Locator linked' : item.slideIds.length ? 'Photo linked' : '3D linked'}</span></div>
          <p>{item.detail}</p>
          {item.modelPartIds.length > 0 && <small className="coverage-linked">{item.modelPartIds.length} named source component{item.modelPartIds.length === 1 ? '' : 's'} linked.</small>}
          {item.landmarkIds.length > 0 && <small className="coverage-linked">{item.landmarkIds.length} reviewed surface locator{item.landmarkIds.length === 1 ? '' : 's'} linked.</small>}
          {item.contextPartIds.length > 0 && <small>Related bone geometry is available; this feature has no complete reviewed label set.</small>}
          {item.gaps.map(gap => <small key={gap}>{gap}</small>)}
          <a href={item.source} target="_blank" rel="noreferrer">Study reference<ArrowUpRight size={11}/></a>
        </article>)}
      </section>)}
      {!labGroups.length && <p className="coverage-empty">No matching checklist entries.</p>}
    </>}
    {tab === 'models' && <>
      <p className="coverage-note">{summary.skeletalModelParts} skeletal source parts and {summary.muscleModelParts} muscle components. {summary.modelQuizTargets} source parts have identification prompts. These counts include subdivisions and do not represent the textbook number of adult bones or whole muscles. Deep or obscured targets may require isolation; numbered structures require anatomical context.</p>
      {models.map(part => <article className="coverage-row" key={`${part.collection}-${part.id}`}>
        <div className="coverage-row-head"><h4>{part.name}</h4><span className="coverage-badge">{part.quizAvailable ? '3D identification' : '3D model'}</span></div>
        <p className="coverage-model-meta">{quizRegions.find(region => region.id === part.region)?.label ?? part.region} · {part.kind}{part.side ? ` · ${part.side}` : ''}{part.depth !== 'not-applicable' ? ` · depth ${part.depth}` : ''}</p>
        <small>{part.source ?? 'Anatomical source'} · part {part.id} · {part.sourceId}. {part.presentation === 'isolate' ? 'Starts isolated to expose the source component.' : 'Starts with neighboring anatomy for orientation.'}</small>
        {part.sourceUrl && <a href={part.sourceUrl} target="_blank" rel="noreferrer">Source anatomy{part.license ? ` · ${part.license}` : ''}<ArrowUpRight size={11}/></a>}
      </article>)}
      {!models.length && <p className="coverage-empty">No matching source parts.</p>}
    </>}
    {tab === 'course' && <>
      <p className="coverage-note">The course map includes all major systems in a typical two-semester sequence. Model availability covers only part of that learning. Unavailable organ systems remain visible here as reference study topics.</p>
      {course.map(module => <article className="coverage-module" key={module.id}>
        <h3>{module.title}</h3><span className="coverage-status">Semester {module.semester} · {module.chapter} · {module.assetStatus === 'partial-visual-coverage' ? 'Partial visual coverage' : 'Reference roadmap'}</span>
        <p>{module.description}</p><ul className="coverage-topics">{module.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>
        {module.gaps.map(gap => <p key={gap}>{gap}</p>)}
        <a href={module.source} target="_blank" rel="noreferrer">Study source chapter<ArrowUpRight size={11}/></a>
      </article>)}
      {!course.length && <p className="coverage-empty">No matching course topics.</p>}
    </>}
    <ul className="coverage-limitations">{catalogScope.limitations.map(note => <li key={note}>{note}</li>)}</ul>
    <div className="coverage-links">{catalogScope.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name}<ArrowUpRight size={11}/></a>)}</div>
  </section>;
}
