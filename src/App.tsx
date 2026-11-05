import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, Crosshair, Eye, Focus, Layers3, RotateCcw, Rotate3d, SkipForward, SlidersHorizontal, X } from 'lucide-react';
import BoneViewer from './components/BoneViewer';
import SystemViewer from './components/SystemViewer';
import { createModelSession, getPromptContextIds, modelPromptPools, type ModelCollection, type ModelPrompt } from './modelQuiz';
import { shuffle } from './study';
import { useAuth } from './useAuth';
import { useStudyProgress } from './useStudyProgress';
import ProgressPages from './components/ProgressPages';
import { progressUrl, readProgressPage, type ProgressPage } from './progressNavigation';
import StudySettings from './components/StudySettings';
import StudyFlow from './components/StudyFlow';
import StudioHeader from './components/StudioHeader';
import BrandMark from './components/BrandMark';
import MemeLibrary from './components/MemeLibrary';
import { memeUrl } from './memes';
import { studyTargetsFor, workspaceUrl, type WorkspaceMode } from './studyNavigation';
import { getModelPass, modelScopeKey, remainingModelCount } from './modelPass';
import { readQuizSelections, selectedPromptIds, writeQuizSelections, type QuizSelections } from './quizSelection';
import { systemAssets } from './systemData';
import type { View } from './content';
import { readAnswerMode, writeAnswerMode, type AnswerMode } from './answerMode';
import { matchTypedAnswer } from './answerMatching';
import { DEFAULT_CONTEXT_OPACITY } from './anatomyRendering';
import { trackEvent, trackPageview } from './analytics';
import { bindPracticeViewport, focusAnswerOnDesktop } from './visualViewport';
import ModelControls from './components/ModelControls';
import AnatomyMnemonic from './components/AnatomyMnemonic';
import { findStudySection, nextStudySection, type StudySection } from './studySections';
import SectionHeading from './components/SectionHeading';

type Response = { id: string; selected: string | null; correct: boolean | null; typoAccepted?: boolean };
type ModelStatus = 'loading' | 'ready' | 'error';
const initialFraming = (prompt: ModelPrompt) => prompt.presentation === 'isolate' ? 'isolate' as const : 'focus' as const;
function initialCollection(): ModelCollection {
  const requested = new URLSearchParams(window.location.search).get('atlas');
  return requested === 'skeleton' || requested === 'bones' ? 'skeleton' : requested === 'landmarks' ? 'landmarks' : 'muscles';
}

export default function App() {
  useEffect(() => bindPracticeViewport(window, document), []);
  const auth = useAuth();
  const progress = useStudyProgress(auth.user?.id ?? null, auth.ready);
  if (!auth.ready || !progress.ready) return <div className="account-loading" role="status"><BrandMark size={44}/><span>anatomeme</span><p>{auth.ready ? 'Loading your progress…' : 'Restoring your sign-in…'}</p></div>;
  // A different account gets a fresh quiz as well as a separate progress store.
  return <QuizStudio key={auth.user?.id ?? 'guest'} auth={auth} progress={progress}/>;
}

export function QuizStudio({ auth, progress }: { auth: ReturnType<typeof useAuth>; progress: ReturnType<typeof useStudyProgress> }) {
  const study = progress.study;
  const studyRef = useRef(study);
  studyRef.current = study;
  const [collection, setCollection] = useState<ModelCollection>(initialCollection);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => { const mode = new URLSearchParams(window.location.search).get('mode'); return mode === 'study' || mode === 'memes' ? mode : 'quiz'; });
  const [studyCollection, setStudyCollection] = useState<ModelCollection>(initialCollection);
  const [studyCursors, setStudyCursors] = useState<Partial<Record<ModelCollection, string>>>({});
  const [selections, setSelections] = useState<QuizSelections>(() => readQuizSelections(auth.user?.id ?? null));
  const [answerMode, setAnswerMode] = useState<AnswerMode>(() => readAnswerMode(auth.user?.id ?? null));
  const [modeSaved, setModeSaved] = useState(true);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [queue, setQueue] = useState<ModelPrompt[]>(() => {
    const selected = initialCollection();
    const scope = modelScopeKey(selected, selections[selected]);
    const fresh = createModelSession(selected, 10, Math.random, getModelPass(study.modelPasses, selected, scope).coveredIds, selectedPromptIds(selected, selections));
    return fresh.length ? fresh : [modelPromptPools[selected][0]];
  });
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [complete, setComplete] = useState(() => remainingModelCount(study.modelPasses, initialCollection(), selectedPromptIds(initialCollection(), selections), modelScopeKey(initialCollection(), selections[initialCollection()])) === 0);
  const [sessionMode, setSessionMode] = useState<'pass' | 'review'>('pass');
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');
  const [view, setView] = useState<View>(() => queue[0].view);
  const [freeView, setFreeView] = useState(false);
  const [framing, setFraming] = useState<'focus' | 'context' | 'isolate'>(() => initialFraming(queue[0]));
  const [ghostOthers, setGhostOthers] = useState(true);
  const [contextOpacity, setContextOpacity] = useState(DEFAULT_CONTEXT_OPACITY);
  const [reset, setReset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [about, setAbout] = useState(false);
  const [progressPage, setProgressPage] = useState<ProgressPage | null>(() => readProgressPage(window.location.search));
  const practiceVisited = useRef(!progressPage);
  if (!progressPage) practiceVisited.current = true;
  const [settingsOpen, setSettingsOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !params.has('atlas') && workspaceMode === 'quiz' && !params.has('progress') && Object.keys(study.modelPasses ?? {}).length === 0;
  });
  const preservePickerFocus = useRef(false);
  const [studyTargets, setStudyTargets] = useState<ModelPrompt[] | null>(null);
  const progressStudyTrigger = useRef<HTMLElement | null>(null);
  const [memeNavigation, setMemeNavigation] = useState(0);
  const [selectionSaved, setSelectionSaved] = useState(true);
  const saved = progress.saved;
  useEffect(() => { if (auth.error) navigateProgress('account'); }, [auth.error]);
  const answerLock = useRef(false);
  const nextButton = useRef<HTMLButtonElement>(null);
  const answerInput = useRef<HTMLInputElement>(null);
  const aboutPanel = useRef<HTMLDivElement>(null);
  const question = queue[index];
  const response = responses.find(item => item.id === question.id);
  const correct = responses.filter(item => item.correct === true).length;
  const answered = responses.filter(item => item.correct !== null).length;
  const skipped = responses.filter(item => item.correct === null).length;
  const misses = queue.filter(item => responses.some(answer => answer.id === item.id && answer.correct === false));
  const ready = modelStatus === 'ready';
  const showContextOpacity = !question.bone && framing !== 'isolate';
  const effectiveContextOpacity = ghostOthers ? contextOpacity : 1;
  const surroundingsPercent = Math.round(effectiveContextOpacity * 100);
  const allowedIds = useMemo(() => selectedPromptIds(collection, selections), [collection, selections]);
  const scope = modelScopeKey(collection, selections[collection]);
  const customSelection = Array.isArray(selections[collection]);
  const pass = getModelPass(study.modelPasses, collection, scope);
  const poolSize = allowedIds.length;
  const coveredCount = pass.coveredIds.filter(id => allowedIds.includes(id)).length;
  const remaining = remainingModelCount(study.modelPasses, collection, allowedIds, scope);
  const emptySelection = poolSize === 0;
  const passComplete = !emptySelection && remaining === 0;
  const contextIds = useMemo(() => getPromptContextIds(question), [question]);
  const asset = systemAssets[collection === 'muscles' ? 'muscles' : 'skeleton'];
  const generalTargets = useMemo(() => studyTargetsFor(studyCollection, selections), [studyCollection, selections]);
  const activeCollection = workspaceMode === 'study' ? studyCollection : collection;
  const activeSection = findStudySection(collection, selections[collection]);
  const followingSection = activeSection ? nextStudySection(activeSection) : undefined;
  const displayQuestion = workspaceMode === 'study' ? generalTargets.find(prompt => prompt.id === studyCursors[studyCollection]) ?? generalTargets[0] ?? question : question;
  const onReady = useCallback((status: ModelStatus) => setModelStatus(status), []);
  const onViewChange = useCallback((direction: string) => setFreeView(direction === 'free'), []);
  const trackedQueue = useRef<ModelPrompt[] | null>(null);

  useEffect(() => {
    // MemeLibrary owns its pageviews, including direct links to lessons/quizzes.
    if (!progressPage && workspaceMode !== 'memes' && !studyTargets) trackPageview({ mode: workspaceMode, collection: activeCollection });
  }, [workspaceMode, activeCollection, studyTargets, progressPage]);
  useEffect(() => {
    if (progressPage || workspaceMode !== 'quiz' || complete || trackedQueue.current === queue) return;
    trackedQueue.current = queue;
    trackEvent('quiz_set_started', { collection, question_count: queue.length, session_mode: sessionMode });
  }, [workspaceMode, complete, queue, collection, sessionMode, progressPage]);

  useEffect(() => { if (response && !complete && workspaceMode === 'quiz' && !studyTargets && !progressPage) nextButton.current?.focus({ preventScroll: true }); }, [response, complete, workspaceMode, studyTargets, progressPage]);
  useEffect(() => {
    if (preservePickerFocus.current && !settingsOpen) { preservePickerFocus.current = false; return; }
    if (workspaceMode === 'quiz' && answerMode === 'typed' && ready && !response && !complete && !about && !progressPage && !settingsOpen && !studyTargets) focusAnswerOnDesktop(answerInput.current);
  }, [answerMode, question.id, ready, response, complete, about, progressPage, settingsOpen, studyTargets, workspaceMode]);
  useEffect(() => {
    if (!about) return;
    const previous = document.activeElement as HTMLElement | null;
    aboutPanel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const targets = Array.from(aboutPanel.current?.querySelectorAll<HTMLElement>('button,a[href],summary') ?? []).filter(element => element.offsetParent !== null);
      if (event.shiftKey && document.activeElement === targets[0]) { event.preventDefault(); targets.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === targets.at(-1)) { event.preventDefault(); targets[0]?.focus(); }
    }
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [about]);

  function setCamera(next: View) { setView(next); setFreeView(false); setReset(value => value + 1); }
  function openSet(fresh: ModelPrompt[], nextCollection: ModelCollection, mode: 'pass' | 'review') {
    // Retain a specimen behind the completion screen when a saved pass is
    // exhausted. An empty quiz must never enter the question renderer.
    const display = fresh.length ? fresh : [modelPromptPools[nextCollection][0]];
    setCollection(nextCollection); setQueue(display); setIndex(0); setResponses([]); setTypedAnswer(''); setComplete(fresh.length === 0); setSessionMode(mode);
    setView(display[0].view); setFreeView(false); setFraming(initialFraming(display[0])); setReset(value => value + 1); answerLock.current = false;
    const url = new URL(window.location.href); url.searchParams.set('atlas', nextCollection); window.history.replaceState({}, '', url);
  }
  function startSet(nextCollection = collection, repeat?: ModelPrompt[], preferences = selections) {
    const nextScope = modelScopeKey(nextCollection, preferences[nextCollection]);
    const fresh = repeat?.length ? shuffle(repeat).map(prompt => ({ ...prompt, options: shuffle(prompt.options) })) : createModelSession(nextCollection, 10, Math.random, getModelPass(studyRef.current.modelPasses, nextCollection, nextScope).coveredIds, selectedPromptIds(nextCollection, preferences));
    openSet(fresh, nextCollection, repeat?.length ? 'review' : 'pass');
  }
  function startNextPass() {
    progress.restartPass(collection, scope);
    openSet(createModelSession(collection, 10, Math.random, [], allowedIds), collection, 'pass');
  }
  function applySelection(nextCollection: ModelCollection, preferences: QuizSelections) {
    trackEvent('study_selection_saved', { collection: nextCollection, target_count: selectedPromptIds(nextCollection, preferences).length, custom_selection: Array.isArray(preferences[nextCollection]) });
    setSelections(preferences); setSelectionSaved(writeQuizSelections(auth.user?.id ?? null, preferences));
    setSettingsOpen(false);
    const ids = selectedPromptIds(nextCollection, preferences);
    const nextScope = modelScopeKey(nextCollection, preferences[nextCollection]);
    if (workspaceMode === 'quiz' && findStudySection(nextCollection, preferences[nextCollection]) && remainingModelCount(studyRef.current.modelPasses, nextCollection, ids, nextScope) === 0) {
      progress.restartPass(nextCollection, nextScope);
      openSet(createModelSession(nextCollection, 10, Math.random, [], ids), nextCollection, 'pass');
    } else startSet(nextCollection, undefined, preferences);
    if (workspaceMode === 'study') setStudyCollection(nextCollection);
  }
  function applySection(section: StudySection) {
    applySelection(section.collection, { ...selections, [section.collection]: [...section.promptIds] });
  }
  function navigateProgress(page: ProgressPage) {
    setAbout(false); setSettingsOpen(false); setProgressPage(page);
    if (readProgressPage(window.location.search) !== page) window.history.pushState({}, '', progressUrl(window.location.href, page));
  }
  function returnToPractice() {
    setProgressPage(null);
    window.history.pushState({}, '', progressUrl(window.location.href, null));
    setReset(value => value + 1);
  }
  function openMeme(id?: string) {
    const url = memeUrl(progressUrl(window.location.href, null).href, id, 'quiz');
    window.history.pushState({}, '', url);
    setProgressPage(null); setWorkspaceMode('memes'); setMemeNavigation(value => value + 1);
  }
  useEffect(() => {
    function navigate() {
      setProgressPage(readProgressPage(window.location.search));
      setAbout(false); setSettingsOpen(false); setStudyTargets(null);
      const mode = new URLSearchParams(window.location.search).get('mode');
      setWorkspaceMode(mode === 'study' || mode === 'memes' ? mode : 'quiz');
      if (mode === 'study') setStudyCollection(initialCollection());
      if (mode === 'memes') setMemeNavigation(value => value + 1);
      if (mode !== 'study' && mode !== 'memes' && initialCollection() !== collection) startSet(initialCollection());
    }
    window.addEventListener('popstate', navigate);
    return () => window.removeEventListener('popstate', navigate);
  }, [collection, selections]);
  function changeWorkspace(next: WorkspaceMode) {
    if (progressPage) returnToPractice();
    if (next === workspaceMode) return;
    setWorkspaceMode(next); setProgressPage(null); setSettingsOpen(false); setAbout(false);
    if (next === 'study' && studyCollection === collection && !studyCursors[studyCollection]) setStudyCursors(value => ({ ...value, [studyCollection]: question.id }));
    window.history.replaceState({}, '', workspaceUrl(window.location.href, next, next === 'study' ? studyCollection : collection));
  }
  function changeAnswerMode(mode: AnswerMode) {
    if (mode === answerMode || response || answerLock.current) return;
    setAnswerMode(mode); setTypedAnswer(''); setModeSaved(writeAnswerMode(auth.user?.id ?? null, mode));
  }
  function studyStructures(targets: ModelPrompt[]) {
    if (!targets.length) return;
    if (progressPage) progressStudyTrigger.current = document.activeElement as HTMLElement;
    setAbout(false); setSettingsOpen(false); setStudyTargets(targets);
  }
  function closeStudy() {
    setStudyTargets(null); setReset(value => value + 1);
    if (progressPage) requestAnimationFrame(() => {
      const trigger = progressStudyTrigger.current;
      (trigger?.isConnected ? trigger : document.getElementById('progress-page-title'))?.focus({ preventScroll: true });
    });
  }
  function answer(option: string | null) {
    if (workspaceMode !== 'quiz' || answerLock.current || complete || !ready || about || progressPage || settingsOpen || studyTargets) return;
    answerLock.current = true;
    answerInput.current?.blur();
    const result = option !== null && answerMode === 'typed'
      ? matchTypedAnswer(option, question.answer, modelPromptPools[collection].map(prompt => prompt.answer))
      : { correct: option === question.answer, typoAccepted: false };
    setResponses(previous => [...previous, { id: question.id, selected: option, ...result }]);
    progress.recordAnswer(question.id, collection, result.correct, sessionMode === 'pass', scope);
    trackEvent('quiz_answered', { collection, question_id: question.id, correct: result.correct, revealed: option === null, answer_mode: answerMode, activity: 'quiz', session_mode: sessionMode });
  }
  function advance(skip = false) {
    if (complete || (!response && !skip)) return;
    if (skip && !response) setResponses(previous => [...previous, { id: question.id, selected: null, correct: null }]);
    if (index + 1 === queue.length) {
      trackEvent('quiz_set_completed', { collection, question_count: queue.length, correct_count: correct, answered_count: answered, skipped_count: skipped + (skip && !response ? 1 : 0), session_mode: sessionMode });
      setComplete(true);
    }
    else { const next = queue[index + 1]; setIndex(value => value + 1); setTypedAnswer(''); setView(next.view); setFreeView(false); setFraming(initialFraming(next)); setReset(value => value + 1); answerLock.current = false; }
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape' && about) { setAbout(false); return; }
      const target = event.target as HTMLElement | null;
      if (workspaceMode !== 'quiz' || studyTargets || about || progressPage || settingsOpen || target?.closest('input,textarea,select,summary,a[href],.section-heading-button,.browse-sections-button') || event.metaKey || event.ctrlKey || event.altKey) return;
      if (answerMode === 'choice' && !complete && !response && /^[1-4]$/.test(event.key)) { const option = question.options[Number(event.key) - 1]; if (option) { event.preventDefault(); answer(option); } }
      if (event.key === 'Enter' && response && !complete) { const focusedButton = target?.closest('button') as HTMLButtonElement | null; if (!focusedButton || focusedButton.disabled) { event.preventDefault(); advance(); } }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  const overlays = <>
    {settingsOpen && <StudySettings collection={activeCollection} selections={selections} passes={study.modelPasses} mode={workspaceMode === 'study' ? 'study' : 'quiz'} onApply={applySelection} onClose={() => { preservePickerFocus.current = true; setSettingsOpen(false); }}/>}
    {!selectionSaved && <div className="selection-save-note" role="status">This selection is active for this tab. Browser storage is unavailable.</div>}

    {about && <div className="about-overlay" onClick={() => setAbout(false)}><div className="about-dialog" ref={aboutPanel} role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={event => event.stopPropagation()}>
      <button className="icon-control about-close" aria-label="Close help" onClick={() => setAbout(false)}><X size={18}/></button>
      <h2 id="about-title">Help & sources</h2>
      <h3>Identify the target</h3>
      <p>Name the solid blue structure or the landmark at the blue marker. Anatomical left and right refer to the specimen.</p>
      <ul className="about-guide">
        <li><strong>Focus</strong> frames the target with its neighbors; <strong>Context</strong> shows the assembly; <strong>Isolate</strong> shows only the target.</li>
        <li><strong>Surroundings</strong> fades nearby anatomy. At 100%, surface anatomy can cover a deep target. The eye button toggles full opacity.</li>
      </ul>
      <h3>Move the model</h3>
      <ul className="about-guide">
        <li>Drag to rotate, scroll to zoom, and right-drag or Shift-drag to pan.</li>
        <li>Click or Tab to the model: arrows pan, Shift + arrows rotate, and + / − zoom.</li>
        <li>On touchscreens, one finger rotates; two fingers pan and pinch to zoom.</li>
        <li>Reset the camera or choose an anatomical view to recenter.</li>
      </ul>
      <h3>Study & quiz progress</h3>
      <p>Click the section title above the model to change sections. Choose an image card to start immediately. Sections follow a textbook-informed order: axial skeleton, appendicular skeleton, then regional muscles. Landmark practice follows the related bones. Use Custom selection for mixed review.</p>
      <p>Study browsing records no answers. Self-checks update accuracy without advancing your quiz pass. Quiz sets contain up to 10 targets, continuing through your selection without repeats. Answered and revealed targets count as covered; skipped load failures do not. Reviewing missed targets does not advance coverage. Each selection has its own pass.</p>
      <details className="about-details"><summary>Sources & coverage</summary>
        <p>Muscles: Z-Anatomy, Gauthier Kervyn and contributors, CC BY-SA 4.0. Converted without decimation or anatomical reshaping. Bones: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Highlights and landmark locators are study annotations.</p>
        <p>Every available source component is eligible. The atlas does not provide a visual quiz for every college A&P topic; open Browse sections, then Course coverage for the inventory and remaining gaps.</p>
        <div className="about-links"><a href="https://github.com/LluisV/Z-Anatomy" target="_blank" rel="noreferrer">Z-Anatomy source atlas<ArrowRight size={13}/></a><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">Muscle model license<ArrowRight size={13}/></a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">BodyParts3D provenance & license<ArrowRight size={13}/></a><a href={displayQuestion.source} target="_blank" rel="noreferrer">Anatomy reference<ArrowRight size={13}/></a></div>
      </details>
      <details className="about-details"><summary>Saving your progress</summary><p>Guest progress stays in this browser. Sign in to save answers and passes across devices. Study selections and answer mode are saved on this device for each account.</p></details>
      <div className="about-links"><a href="/privacy.html" target="_blank" rel="noreferrer">Privacy policy<ArrowRight size={13}/></a><a href="/terms.html" target="_blank" rel="noreferrer">Terms of use<ArrowRight size={13}/></a></div>
    </div></div>}
  </>;

  const header = <StudioHeader mode={workspaceMode} onModeChange={changeWorkspace}
    onSettings={() => { setProgressPage(null); setAbout(false); setSettingsOpen(true); }}
    onProgress={navigateProgress} progressPage={progressPage}
    onAbout={() => setAbout(true)} signedIn={!!auth.user} syncStatus={progress.status}
    onNext={() => emptySelection ? setSettingsOpen(true) : passComplete ? startNextPass() : startSet()}
    nextLabel={emptySelection ? 'Choose targets' : passComplete ? 'New pass' : 'Next set'}
    nextTitle={emptySelection ? 'Choose targets' : passComplete ? 'Start a new pass' : 'Start the next set'}/>;

  const progressWorkspace = progressPage ? <div className="quiz-app progress-app" style={studyTargets ? { display: 'none' } : undefined}>
    {header}<ProgressPages page={progressPage} auth={auth} progress={progress} onNavigate={navigateProgress} onBack={returnToPractice} onStudy={studyStructures} onMeme={openMeme}/>{overlays}
  </div> : null;
  const practiceHeader = progressPage ? null : header;
  const practiceOverlays = progressPage ? null : overlays;
  const reviewWorkspace = studyTargets ? <StudyFlow targets={studyTargets} fromMeme={!progressPage && workspaceMode === 'memes'} backLabel={progressPage ? `Back to ${progressPage === 'history' ? 'history' : progressPage === 'review' ? 'review' : 'progress'}` : undefined} answerMode={answerMode} onAnswer={(prompt, isCorrect) => progress.recordAnswer(prompt.id, prompt.collection, isCorrect, false)} onClose={closeStudy}/> : null;

  const memeWorkspace = <div className="quiz-app meme-app">{practiceHeader}{!saved && <p className="meme-save-note" role="status">{progress.error ?? 'Your answers are available in this tab. Open My progress to check their save status.'}</p>}<MemeLibrary key={memeNavigation} study={study} paused={!!progressPage || !!studyTargets || about} onAnswer={(id, correct) => progress.recordAnswer(id, 'memes', correct, false)} onStudyModels={studyStructures}/>{practiceOverlays}</div>;

  const studyWorkspace = <>
    {generalTargets.length ? <StudyFlow key={`${studyCollection}-${modelScopeKey(studyCollection, selections[studyCollection])}`} targets={generalTargets} answerMode={answerMode}
      header={practiceHeader} general initialTargetId={studyCursors[studyCollection]} paused={!!progressPage || !!studyTargets || settingsOpen || about}
      sectionHeading={<SectionHeading collection={studyCollection} section={findStudySection(studyCollection,selections[studyCollection])} custom={Array.isArray(selections[studyCollection])} onChange={()=>setSettingsOpen(true)}/>}
      onTargetChange={id => setStudyCursors(value => ({ ...value, [studyCollection]: id }))}
      onAnswer={(prompt, isCorrect) => progress.recordAnswer(prompt.id, prompt.collection, isCorrect, false)} onClose={() => changeWorkspace('quiz')}/>
      : <div className="quiz-app">{practiceHeader}<main className="study-empty"><BookOpen size={30}/><h1>Choose something to study.</h1><p>This selection has no available structures. Choose a region or individual structures to explore.</p><button className="continue-button" onClick={() => setSettingsOpen(true)}>Choose study material<ArrowRight size={16}/></button></main></div>}
    {practiceOverlays}
  </>;

  const quizWorkspace = <div className={'quiz-app practice-screen' + (complete ? ' is-complete' : '')}>
    {practiceHeader}

    <main className="studio-main">
      <section className={'specimen-stage' + (showContextOpacity ? ' has-context-opacity' : '')} aria-label="Interactive 3D quiz specimen">
        <SectionHeading collection={collection} section={activeSection} custom={customSelection} onChange={()=>setSettingsOpen(true)}/>
        <div className="stage-orientation"><Rotate3d size={14}/>{freeView ? 'Free view' : view === 'medial' && !question.bone ? 'Left side' : view === 'lateral' && !question.bone ? 'Right side' : view}</div>
        <div className="model-space">
          {question.bone ? <BoneViewer key={`bone-${question.bone}-${retry}`} bone={question.bone} view={view} labels={false} activeLandmark={question.landmark} resetToken={reset} theme="dark" onReady={onReady} onViewChange={onViewChange}/> : <SystemViewer key={`${collection}-${retry}`} system={collection === 'muscles' ? 'muscles' : 'skeleton'} view={view} selectedId={question.partId} isolate={framing === 'isolate'} focusSelected={framing === 'focus'} focusContextIds={contextIds} ghostOthers={ghostOthers} contextOpacity={contextOpacity} resetToken={reset} theme="dark" onReady={onReady} onViewChange={onViewChange}/>}
        </div>
        <ModelControls resetKey={question.id}>
        <div className={'stage-bottom' + (showContextOpacity ? ' has-opacity' : '')}>
          <div className="view-tools"><button className="icon-control" title="Reset camera" aria-label="Reset camera" onClick={() => setCamera(question.view)}><RotateCcw size={16}/></button><span className="tool-separator"/><div className="view-select"><select aria-label="Anatomical view" value={freeView ? 'free' : view} onChange={event => setCamera(event.target.value as View)}><option value="free" disabled>Free view</option><option value="anterior">Anterior</option><option value="posterior">Posterior</option><option value="medial">{question.bone ? 'Medial' : 'Left side'}</option><option value="lateral">{question.bone ? 'Lateral' : 'Right side'}</option></select><ChevronDown size={12}/></div>{!question.bone && framing !== 'isolate' && <button className={'icon-control ghost-control' + (ghostOthers ? ' active' : '')} aria-label="Fade surrounding anatomy" aria-pressed={ghostOthers} title="Toggle faded surrounding anatomy" onClick={() => setGhostOthers(value => !value)}><Eye size={15}/></button>}</div>
          {showContextOpacity && <label className="context-opacity" htmlFor="context-opacity">
            <span>Surroundings</span>
            <input id="context-opacity" type="range" min="0" max="100" step="1" value={surroundingsPercent} aria-label="Surrounding anatomy opacity" aria-valuetext={`${surroundingsPercent}% opacity`} onChange={event => { setContextOpacity(Number(event.target.value) / 100); setGhostOthers(true); }}/>
            <output htmlFor="context-opacity">{surroundingsPercent}%</output>
          </label>}
          {!question.bone && <div className="framing-switch" aria-label="Model framing">{([{ id: 'focus', label: 'Focus', icon: Crosshair }, { id: 'context', label: 'Context', icon: Layers3 }, { id: 'isolate', label: 'Isolate', icon: Focus }] as const).map(item => <button key={item.id} className={framing === item.id ? 'active' : ''} aria-pressed={framing === item.id} onClick={() => { setFraming(item.id); setReset(value => value + 1); }}><item.icon size={13}/><span>{item.label}</span></button>)}</div>}
        </div>
        </ModelControls>
        <div className="interaction-hint">Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Arrows to pan (click model)</div>
      </section>

      <aside className={'question-panel' + (complete ? ' is-summary' : '') + (response ? ' has-response' : '')} aria-label={complete ? 'Practice set results' : 'Identification question'}>
        {complete ? <>
          <div className="question-kicker"><CheckCheck size={15}/> {emptySelection ? 'CHOOSE YOUR MATERIAL' : sessionMode === 'review' ? 'REVIEW COMPLETE' : passComplete ? 'PASS COMPLETE' : 'SET COMPLETE'}</div>
          <h1>{emptySelection ? 'Choose your structures.' : passComplete ? `All ${poolSize} covered.` : sessionMode === 'review' ? 'Review complete.' : 'Set complete.'}</h1>
          {responses.length > 0 && <><div className="result-score">{correct}<span> / {queue.length}</span></div><p className="result-description">structures identified correctly{skipped ? ` · ${skipped} skipped` : ''}.</p></>}
          <p className="pass-summary">{emptySelection ? 'This saved selection has no available targets. Choose a region or individual structures in study settings.' : passComplete ? `You've covered every ${customSelection ? 'selected' : 'available'} target in pass ${pass.round}. Start another pass to repeat ${customSelection ? 'this selection' : 'the collection'}.` : `${coveredCount} of ${poolSize} ${customSelection ? 'selected ' : ''}targets covered in pass ${pass.round}. ${remaining} remain before anything repeats.`}</p>
          {misses.length > 0 && <div className="missed-structures"><span>WORTH ANOTHER LOOK</span>{misses.map(item => <button className="review-target" key={item.id} onClick={() => studyStructures([item])} aria-label={`Study ${item.answer}`}><RotateCcw size={12}/><span>{item.answer}</span><ArrowRight size={13}/></button>)}</div>}
          {passComplete && followingSection && <button className="continue-button next-study-section" onClick={() => applySection(followingSection)}><span><small>Next section</small>{followingSection.title}</span><ArrowRight size={17}/></button>}
          <button className={passComplete && followingSection ? 'subtle-button' : 'continue-button'} onClick={() => emptySelection ? setSettingsOpen(true) : passComplete ? startNextPass() : startSet()}><span>{emptySelection ? 'Open study settings' : passComplete ? `Start pass ${pass.round + 1}` : `Continue · next ${Math.min(10, remaining)}`}</span><ArrowRight size={17}/></button>
          {passComplete && activeSection && !followingSection && <button className="subtle-button" onClick={() => setSettingsOpen(true)}>Choose another section<ArrowRight size={13}/></button>}
          {misses.length > 0 && <><button className="subtle-button" onClick={() => studyStructures(misses)}>Study missed structures ({misses.length})<ArrowRight size={13}/></button><button className="subtle-button" onClick={() => startSet(collection, misses)}>Practice missed structures ({misses.length})<RotateCcw size={13}/></button></>}
          <small className="saved-note">{auth.user ? progress.status === 'synced' ? 'Your progress is saved to your account.' : saved ? 'Saved on this device. Waiting to sync.' : 'Keep this tab open until your progress is synced.' : saved ? 'Pass progress is saved on this device.' : 'Browser storage is unavailable. This session is in memory.'}</small>
        </> : <>
          <div className="question-kicker"><span className="question-number">{String(index + 1).padStart(2, '0')}</span><span>{sessionMode === 'review' ? 'MISSED REVIEW' : 'IDENTIFICATION'}</span><span className="question-total">/ {String(queue.length).padStart(2, '0')}</span></div>
          <h1>{question.prompt}</h1>
          {customSelection && !activeSection && <button className="selection-indicator" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={11}/>{poolSize} selected targets</button>}
          <div className="answer-mode" role="group" aria-label="Answer mode">{([{ id: 'choice', label: 'Multiple choice' }, { id: 'typed', label: 'Type answer' }] as const).map(mode => <button key={mode.id} className={answerMode === mode.id ? 'active' : ''} aria-pressed={answerMode === mode.id} disabled={!!response} onClick={() => changeAnswerMode(mode.id)}>{mode.label}</button>)}</div>
          {!modeSaved && <p className="answer-mode-note" role="status">Answer mode is active for this tab. Browser storage is unavailable.</p>}
          {answerMode === 'choice' ? <div className="answer-options">{question.options.map((option, optionIndex) => <button key={option} disabled={!ready || !!response} className={'answer-option' + (response ? option === question.answer ? ' is-correct' : option === response.selected ? ' is-incorrect' : ' is-muted' : '')} onClick={() => answer(option)}><span className="answer-key">{optionIndex + 1}</span><span>{option}</span>{response && option === question.answer ? <Check size={16}/> : response && option === response.selected ? <X size={15}/> : null}</button>)}</div> : <form className="typed-answer-form" onSubmit={event => { event.preventDefault(); if (typedAnswer.trim()) answer(typedAnswer.trim()); }}>
            <label htmlFor="typed-answer">Your answer</label>
            <input id="typed-answer" ref={answerInput} type="text" value={typedAnswer} onChange={event => setTypedAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="Name the structure…" enterKeyHint="done" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={180} disabled={!ready || !!response} aria-describedby="typed-answer-help" className={response ? response.correct ? 'is-correct' : 'is-incorrect' : ''}/>
            {!response && <p id="typed-answer-help">Small typos are okay. Include the side and any specific part or number.</p>}
            {response && <p id="typed-answer-help">{response.selected === null ? 'Answer revealed.' : 'Answer submitted.'}</p>}
            {!response && <button className="continue-button check-answer-button" type="submit" disabled={!ready || !typedAnswer.trim()}><span>Check answer</span><span className="continue-key">↵</span><ArrowRight size={16}/></button>}
          </form>}
          {response ? <div className={'question-feedback' + (response.correct ? ' correct' : ' revisit')} role="status"><div className="feedback-heading">{response.correct ? <><Check size={15}/><span>Correct.</span></> : <><RotateCcw size={14}/><span>{question.answer}</span></>}</div>{answerMode === 'typed' && response.correct && <p className="typed-answer-name">{question.answer}</p>}{response.typoAccepted && <p className="typo-accepted">Small spelling difference accepted.</p>}{question.explanation && <p>{question.explanation}</p>}<AnatomyMnemonic prompt={question}/></div> : !ready && <div className="question-pause" role="status">{modelStatus === 'error' ? 'The model could not be loaded.' : 'Loading model…'}</div>}
          {response ? <button className="continue-button" ref={nextButton} onClick={() => advance()}><span>{index + 1 === queue.length ? 'Finish set' : 'Next structure'}</span><span className="continue-key">↵</span><ArrowRight size={16}/></button> : modelStatus === 'error' ? <div className="error-actions"><button className="continue-button" onClick={() => { setModelStatus('loading'); setRetry(value => value + 1); }}>Retry model<RotateCcw size={15}/></button><button className="subtle-button" onClick={() => advance(true)}>Skip this structure<SkipForward size={14}/></button></div> : <button className="reveal-button" disabled={!ready} onClick={() => answer(null)}>Show answer<ArrowRight size={13}/></button>}
          {sessionMode === 'review' && <div className="panel-footnote">Review does not advance your pass.</div>}
          {!response && answerMode === 'choice' && <div className="panel-footnote">Press 1–4 to answer.</div>}
        </>}
      </aside>
    </main>

    <footer className="studio-footer"><button className="specimen-credit" onClick={() => setAbout(true)}>{collection === 'muscles' ? 'Z-Anatomy' : 'BodyParts3D'} <span>·</span> {asset.license}</button><div className="session-progress"><span>{correct} correct <i/> {answered} answered</span><div className="progress-marks" aria-label={`${responses.length} of ${queue.length} completed`}>{queue.map((item, itemIndex) => { const result = responses.find(answer => answer.id === item.id); return <span key={item.id} className={result ? result.correct === true ? 'correct' : result.correct === false ? 'missed' : 'skipped' : !complete && itemIndex === index ? 'current' : ''}/>; })}</div></div><span className="pass-progress" aria-label={`Pass ${pass.round}: ${coveredCount} of ${poolSize} targets covered`}>{customSelection ? 'Selection pass' : 'Pass'} {pass.round}<span>{coveredCount} / {poolSize} covered</span></span></footer>

    {practiceOverlays}
  </div>;

  // Keep an already-open workspace mounted so an unfinished self-check or meme
  // quiz survives a visit to progress. Direct progress links mount no specimen.
  return <>
    {practiceVisited.current && <div style={progressPage || studyTargets ? { display: 'none' } : undefined}>
      {workspaceMode === 'memes' ? memeWorkspace : workspaceMode === 'study' ? studyWorkspace : quizWorkspace}
    </div>}
    {progressWorkspace}
    {reviewWorkspace}
  </>;
}
