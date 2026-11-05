import { useEffect, useRef, useState } from 'react';
import { BookOpen, ClipboardList, SlidersHorizontal, X } from 'lucide-react';
import type { ModelCollection } from '../modelQuiz';
import { selectedPromptIds, type QuizSelections } from '../quizSelection';
import type { StudySection } from '../studySections';
import type { ModelPasses } from '../modelPass';
import CoverageSummary from './CoverageSummary';
import CustomSelection from './CustomSelection';
import StudySections from './StudySections';

type MaterialView = 'sections' | 'custom' | 'coverage';
type Props = {
  collection: ModelCollection;
  selections: QuizSelections;
  passes?: ModelPasses;
  onApply: (collection: ModelCollection, selections: QuizSelections) => void;
  onClose: () => void;
  mode?: 'study' | 'quiz';
};
const views = [
  { id: 'sections', label: 'Sections', icon: BookOpen },
  { id: 'custom', label: 'Custom selection', icon: SlidersHorizontal },
  { id: 'coverage', label: 'Course coverage', icon: ClipboardList },
] as const;

export default function StudySettings({ collection, selections, passes = {}, onApply, onClose, mode = 'quiz' }: Props) {
  const [active, setActive] = useState(collection);
  const [draft, setDraft] = useState<QuizSelections>(() => structuredClone(selections));
  const [view, setView] = useState<MaterialView>('sections');
  const panel = useRef<HTMLDivElement>(null);
  const previousView = useRef<MaterialView>('sections');
  const close = useRef(onClose); close.current = onClose;
  const count = selectedPromptIds(active, draft).length;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLButtonElement>('.material-close')?.focus({ preventScroll: true });
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),a[href],select,summary,[tabindex="0"]') ?? [])
        .filter(element => element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets.at(-1);
      if (!panel.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    if (previousView.current !== view) panel.current?.querySelector<HTMLButtonElement>(`[data-material-view="${view}"]`)?.focus({ preventScroll: true });
    previousView.current = view;
  }, [view]);

  function selectSection(section: StudySection) {
    onApply(section.collection, { ...draft, [section.collection]: [...section.promptIds] });
  }
  const title = view === 'sections' ? 'Choose a section' : view === 'custom' ? `Build a custom ${mode === 'study' ? 'session' : 'quiz'}` : 'Course coverage';
  const subtitle = view === 'sections' ? `Pick a card to start ${mode === 'study' ? 'studying' : 'your quiz'}.`
    : view === 'custom' ? 'Combine sections or choose individual targets.' : 'See what you can practice and what to study next.';

  return <div className="settings-overlay" onClick={onClose}>
    <div className="settings-dialog section-picker-dialog study-material-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby="study-settings-title" onClick={event => event.stopPropagation()}>
      <header className="settings-heading material-heading">
        <div><h2 id="study-settings-title">{title}</h2><p>{subtitle}</p></div>
        <button className="icon-control material-close" onClick={onClose} aria-label="Close study material"><X size={19}/></button>
      </header>
      <nav className="material-nav" aria-label="Study material views">
        {views.map(item => <button key={item.id} data-material-view={item.id} aria-pressed={view === item.id} className={view === item.id ? 'is-active' : ''} onClick={() => setView(item.id)}><item.icon size={15}/>{item.label}</button>)}
      </nav>
      {view === 'sections' ? <StudySections collection={active} selections={draft} passes={passes} mode={mode} onSelect={selectSection}/>
        : view === 'custom' ? <CustomSelection collection={active} selections={draft} onCollectionChange={setActive} onChange={setDraft}/>
        : <CoverageSummary mode={mode} onSelectSection={selectSection}/>}
      {view === 'custom' && <footer className="material-selection-footer">
        <div aria-live="polite"><strong>{count} {count === 1 ? 'target' : 'targets'} selected</strong><span>{count ? `For your ${active === 'skeleton' ? 'bone' : active === 'landmarks' ? 'landmark' : 'muscle'} ${mode === 'study' ? 'study session' : 'quiz'}` : 'Choose at least one target to begin.'}</span></div>
        <button className="continue-button" disabled={!count} onClick={() => onApply(active, draft)}>{mode === 'study' ? 'Study selection' : 'Start custom quiz'}</button>
      </footer>}
    </div>
  </div>;
}
