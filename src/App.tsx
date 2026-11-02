import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, CheckCheck, ChevronDown, Crosshair, Eye, Focus, Layers3, RotateCcw, Rotate3d, SkipForward, SlidersHorizontal, X } from 'lucide-react';
import BoneViewer from './components/BoneViewer';
import SystemViewer from './components/SystemViewer';
import { createModelSession, getPromptContextIds, modelPromptPools, type ModelCollection, type ModelPrompt } from './modelQuiz';
import { shuffle } from './study';
import { useAuth } from './useAuth';
import { useStudyProgress } from './useStudyProgress';
import ProgressPanel from './components/ProgressPanel';
import StudySettings from './components/StudySettings';
import StudyFlow from './components/StudyFlow';
import StudioHeader from './components/StudioHeader';
import { studyTargetsFor, workspaceUrl, type WorkspaceMode } from './studyNavigation';
import { getModelPass, modelScopeKey, remainingModelCount } from './modelPass';
import { readQuizSelections, selectedPromptIds, writeQuizSelections, type QuizSelections } from './quizSelection';
import { systemAssets } from './systemData';
import type { View } from './content';
import { readAnswerMode, writeAnswerMode, type AnswerMode } from './answerMode';
import { matchTypedAnswer } from './answerMatching';
import { DEFAULT_CONTEXT_OPACITY } from './anatomyRendering';

type Response = { id: string; selected: string | null; correct: boolean | null; typoAccepted?: boolean };
type ModelStatus = 'loading' | 'ready' | 'error';
const initialFraming = (prompt: ModelPrompt) => prompt.presentation === 'isolate' ? 'isolate' as const : 'focus' as const;
function initialCollection(): ModelCollection {
  const requested = new URLSearchParams(window.location.search).get('atlas');
  return requested === 'skeleton' || requested === 'bones' ? 'skeleton' : requested === 'landmarks' ? 'landmarks' : 'muscles';
}
function Mark() { return <svg width="21" height="24" viewBox="0 0 21 24" fill="none" aria-hidden="true"><path d="m10.5 1.5 9 5.25v10.5l-9 5.25-9-5.25V6.75l9-5.25Z" stroke="currentColor" strokeWidth="1.2"/><path d="m1.5 6.75 9 5.25 9-5.25M10.5 12v10.5" stroke="currentColor" strokeWidth="1.2"/></svg>; }

export default function App() {
  const auth = useAuth();
  const progress = useStudyProgress(auth.user?.id ?? null, auth.ready);
  if (!auth.ready || !progress.ready) return <div className="account-loading" role="status"><Mark/><span>anatome</span><p>{auth.ready ? 'Loading your progress…' : 'Restoring your sign-in…'}</p></div>;
  // A different account gets a fresh quiz as well as a separate progress store.
  return <QuizStudio key={auth.user?.id ?? 'guest'} auth={auth} progress={progress}/>;
}

export function QuizStudio({ auth, progress }: { auth: ReturnType<typeof useAuth>; progress: ReturnType<typeof useStudyProgress> }) {
  const study = progress.study;
  const studyRef = useRef(study);
  studyRef.current = study;
  const [collection, setCollection] = useState<ModelCollection>(initialCollection);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => new URLSearchParams(window.location.search).get('mode') === 'study' ? 'study' : 'quiz');
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [studyTargets, setStudyTargets] = useState<ModelPrompt[] | null>(null);
  const [selectionSaved, setSelectionSaved] = useState(true);
  const saved = progress.saved;
  useEffect(() => { if (auth.error) { setAbout(false); setSettingsOpen(false); setAccountOpen(true); } }, [auth.error]);
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
  const displayQuestion = workspaceMode === 'study' ? generalTargets.find(prompt => prompt.id === studyCursors[studyCollection]) ?? generalTargets[0] ?? question : question;
  const onReady = useCallback((status: ModelStatus) => setModelStatus(status), []);
  const onViewChange = useCallback((direction: string) => setFreeView(direction === 'free'), []);

  useEffect(() => { if (response && !complete && workspaceMode === 'quiz' && !studyTargets) nextButton.current?.focus({ preventScroll: true }); }, [response, complete, workspaceMode, studyTargets]);
  useEffect(() => {
    if (workspaceMode === 'quiz' && answerMode === 'typed' && ready && !response && !complete && !about && !accountOpen && !settingsOpen && !studyTargets) answerInput.current?.focus({ preventScroll: true });
  }, [answerMode, question.id, ready, response, complete, about, accountOpen, settingsOpen, studyTargets, workspaceMode]);
  useEffect(() => {
    if (!about) return;
    const previous = document.activeElement as HTMLElement | null;
    aboutPanel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const targets = Array.from(aboutPanel.current?.querySelectorAll<HTMLElement>('button,a[href]') ?? []);
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
    setSelections(preferences); setSelectionSaved(writeQuizSelections(auth.user?.id ?? null, preferences));
    setSettingsOpen(false); startSet(nextCollection, undefined, preferences);
    if (workspaceMode === 'study') setStudyCollection(nextCollection);
  }
  function changeWorkspace(next: WorkspaceMode) {
    if (next === workspaceMode) return;
    setWorkspaceMode(next); setAccountOpen(false); setSettingsOpen(false); setAbout(false);
    if (next === 'study' && studyCollection === collection && !studyCursors[studyCollection]) setStudyCursors(value => ({ ...value, [studyCollection]: question.id }));
    window.history.replaceState({}, '', workspaceUrl(window.location.href, next, next === 'study' ? studyCollection : collection));
  }
  function changeCollection(nextCollection: ModelCollection) {
    if (workspaceMode === 'quiz') startSet(nextCollection);
    else { setStudyCollection(nextCollection); window.history.replaceState({}, '', workspaceUrl(window.location.href, 'study', nextCollection)); }
  }
  function changeAnswerMode(mode: AnswerMode) {
    if (mode === answerMode || response || answerLock.current) return;
    setAnswerMode(mode); setTypedAnswer(''); setModeSaved(writeAnswerMode(auth.user?.id ?? null, mode));
  }
  function studyStructures(targets: ModelPrompt[]) {
    if (!targets.length) return;
    setAccountOpen(false); setAbout(false); setSettingsOpen(false); setStudyTargets(targets);
  }
  function answer(option: string | null) {
    if (workspaceMode !== 'quiz' || answerLock.current || complete || !ready || about || accountOpen || settingsOpen || studyTargets) return;
    answerLock.current = true;
    const result = option !== null && answerMode === 'typed'
      ? matchTypedAnswer(option, question.answer, modelPromptPools[collection].map(prompt => prompt.answer))
      : { correct: option === question.answer, typoAccepted: false };
    setResponses(previous => [...previous, { id: question.id, selected: option, ...result }]);
    progress.recordAnswer(question.id, collection, result.correct, sessionMode === 'pass', scope);
  }
  function advance(skip = false) {
    if (!response && !skip) return;
    if (skip && !response) setResponses(previous => [...previous, { id: question.id, selected: null, correct: null }]);
    if (index + 1 === queue.length) setComplete(true);
    else { const next = queue[index + 1]; setIndex(value => value + 1); setTypedAnswer(''); setView(next.view); setFreeView(false); setFraming(initialFraming(next)); setReset(value => value + 1); answerLock.current = false; }
  }
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape' && about) { setAbout(false); return; }
      const target = event.target as HTMLElement | null;
      if (workspaceMode !== 'quiz' || studyTargets || about || accountOpen || settingsOpen || target?.matches('input,textarea,select') || event.metaKey || event.ctrlKey || event.altKey) return;
      if (answerMode === 'choice' && !complete && !response && /^[1-4]$/.test(event.key)) { const option = question.options[Number(event.key) - 1]; if (option) { event.preventDefault(); answer(option); } }
      if (event.key === 'Enter' && response && !complete) { const focusedButton = target?.closest('button') as HTMLButtonElement | null; if (!focusedButton || focusedButton.disabled) { event.preventDefault(); advance(); } }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  const overlays = <>
    {settingsOpen && <StudySettings collection={activeCollection} selections={selections} mode={workspaceMode} onApply={applySelection} onClose={() => setSettingsOpen(false)}/>}
    {!selectionSaved && <div className="selection-save-note" role="status">This selection is active for this tab. Browser storage is unavailable.</div>}
    {accountOpen && <ProgressPanel auth={auth} progress={progress} onClose={() => setAccountOpen(false)} onStudy={studyStructures}/>}
    {about && <div className="about-overlay" onClick={() => setAbout(false)}><div className="about-dialog" ref={aboutPanel} role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={event => event.stopPropagation()}><button className="icon-control about-close" aria-label="Close specimen information" onClick={() => setAbout(false)}><X size={18}/></button><div className="question-kicker">ANATOME / PRACTICE</div><h2 id="about-title">The anatomy comes first.</h2><p>Identify real anatomical models, inspect their surfaces and neighbors, then check your answer. Each set has up to 10 questions. Continue through every selected target without repeats, then explicitly start a new pass. A short last set finishes the pass. Missed review is an intentional repeat and does not advance coverage. Study settings lets you select regions or individual structures; each selection keeps its own pass.</p><h3>Move around the model</h3><p>Drag to rotate and scroll to zoom. Click the model or Tab to it, then use arrow keys to pan up, down, left, and right. Shift + arrows rotates; + and − zoom. Right-drag or Shift-drag also pans. On a touchscreen, one finger rotates; two fingers pan and pinch to zoom. Reset the camera or choose an anatomical view to recenter. Focus frames the target and its neighbors. Context shows the assembly; Isolate shows only the target. Use Surroundings to fade nearby anatomy while the blue target stays solid. The eye button switches between your chosen opacity and full surface anatomy. At 0%, only the target remains visible; at 100%, surface anatomy can cover a deep target. Your opacity choice carries across questions and collections, and adjusting it keeps your current camera view.</p><h3>Sources & scope</h3><p>Muscles: Z-Anatomy, Gauthier Kervyn and contributors, CC BY-SA 4.0. The source assembly is converted without decimation or anatomical reshaping. Bones: BodyParts3D, © The Database Center for Life Science, CC BY 4.0. Blue highlights and landmark locators are study annotations. Every available source component is eligible; the atlas does not yet provide a visual quiz for every college A&P topic. Open Curriculum coverage in study settings for the inventory and remaining gaps.</p><div className="about-links"><a href="https://github.com/LluisV/Z-Anatomy" target="_blank" rel="noreferrer">Z-Anatomy source atlas<ArrowRight size={13}/></a><a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">Muscle model license<ArrowRight size={13}/></a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">BodyParts3D provenance & license<ArrowRight size={13}/></a><a href={displayQuestion.source} target="_blank" rel="noreferrer">Anatomy reference<ArrowRight size={13}/></a><a href="/privacy.html" target="_blank" rel="noreferrer">Privacy policy<ArrowRight size={13}/></a><a href="/terms.html" target="_blank" rel="noreferrer">Terms of use<ArrowRight size={13}/></a></div><p className="about-storage">Guest progress stays in this browser. Sign in to save answers and selection passes to your account across devices. Quiz selection preferences are saved on this device for each account. Answered and revealed questions count as covered; skipped load failures do not. Existing notes and study data are retained.</p></div></div>}
  </>;

  const header = <StudioHeader mode={workspaceMode} onModeChange={changeWorkspace} collection={activeCollection} onCollectionChange={changeCollection}
    onSettings={() => { setAccountOpen(false); setAbout(false); setSettingsOpen(true); }}
    onProgress={() => { setAbout(false); setSettingsOpen(false); setAccountOpen(true); }}
    onAbout={() => setAbout(true)} signedIn={!!auth.user} syncStatus={progress.status}
    onNext={() => emptySelection ? setSettingsOpen(true) : passComplete ? startNextPass() : startSet()}
    nextLabel={emptySelection ? 'Choose targets' : passComplete ? 'New pass' : 'Next set'}
    nextTitle={emptySelection ? 'Choose targets' : passComplete ? 'Start a new pass' : 'Start the next set'}/>;

  if (studyTargets) return <StudyFlow targets={studyTargets} answerMode={answerMode} onAnswer={(prompt, isCorrect) => progress.recordAnswer(prompt.id, prompt.collection, isCorrect, false)} onClose={() => { setStudyTargets(null); setReset(value => value + 1); }}/>;

  if (workspaceMode === 'study') return <>
    {generalTargets.length ? <StudyFlow key={`${studyCollection}-${modelScopeKey(studyCollection, selections[studyCollection])}`} targets={generalTargets} answerMode={answerMode}
      header={header} general initialTargetId={studyCursors[studyCollection]} paused={accountOpen || settingsOpen || about}
      onTargetChange={id => setStudyCursors(value => ({ ...value, [studyCollection]: id }))}
      onAnswer={(prompt, isCorrect) => progress.recordAnswer(prompt.id, prompt.collection, isCorrect, false)} onClose={() => changeWorkspace('quiz')}/>
      : <div className="quiz-app">{header}<main className="study-empty"><BookOpen size={30}/><h1>Choose something to study.</h1><p>This selection has no available structures. Choose a region or individual structures to explore.</p><button className="continue-button" onClick={() => setSettingsOpen(true)}>Choose study material<ArrowRight size={16}/></button></main></div>}
    {overlays}
  </>;

  return <div className="quiz-app">
    {header}

    <main className="studio-main">
      <section className={'specimen-stage' + (showContextOpacity ? ' has-context-opacity' : '')} aria-label="Interactive 3D quiz specimen">
        <div className="stage-heading"><span className="collection-label">{collection === 'muscles' ? 'MUSCULAR SYSTEM' : collection === 'skeleton' ? 'SKELETAL SYSTEM' : 'BONE LANDMARKS'}</span><span className="stage-divider"/><span className="stage-label">{question.bone ? question.bone : framing === 'isolate' ? 'Isolated structure' : effectiveContextOpacity === 0 ? 'Target only' : effectiveContextOpacity < 1 ? 'Translucent context' : 'Surface anatomy'}</span></div>
        <div className="stage-orientation"><Rotate3d size={14}/>{freeView ? 'Free view' : view === 'medial' && !question.bone ? 'Left side' : view === 'lateral' && !question.bone ? 'Right side' : view}</div>
        <div className="model-space">
          {question.bone ? <BoneViewer key={`bone-${question.bone}-${retry}`} bone={question.bone} view={view} labels={false} activeLandmark={question.landmark} resetToken={reset} theme="dark" onReady={onReady} onViewChange={onViewChange}/> : <SystemViewer key={`${collection}-${retry}`} system={collection === 'muscles' ? 'muscles' : 'skeleton'} view={view} selectedId={question.partId} isolate={framing === 'isolate'} focusSelected={framing === 'focus'} focusContextIds={contextIds} ghostOthers={ghostOthers} contextOpacity={contextOpacity} resetToken={reset} theme="dark" onReady={onReady} onViewChange={onViewChange}/>}
        </div>
        <div className={'stage-bottom' + (showContextOpacity ? ' has-opacity' : '')}>
          <div className="view-tools"><button className="icon-control" title="Reset camera" aria-label="Reset camera" onClick={() => setCamera(question.view)}><RotateCcw size={16}/></button><span className="tool-separator"/><div className="view-select"><select aria-label="Anatomical view" value={freeView ? 'free' : view} onChange={event => setCamera(event.target.value as View)}><option value="free" disabled>Free view</option><option value="anterior">Anterior</option><option value="posterior">Posterior</option><option value="medial">{question.bone ? 'Medial' : 'Left side'}</option><option value="lateral">{question.bone ? 'Lateral' : 'Right side'}</option></select><ChevronDown size={12}/></div>{!question.bone && framing !== 'isolate' && <button className={'icon-control ghost-control' + (ghostOthers ? ' active' : '')} aria-label="Fade surrounding anatomy" aria-pressed={ghostOthers} title="Toggle faded surrounding anatomy" onClick={() => setGhostOthers(value => !value)}><Eye size={15}/></button>}</div>
          {showContextOpacity && <label className="context-opacity" htmlFor="context-opacity">
            <span>Surroundings</span>
            <input id="context-opacity" type="range" min="0" max="100" step="1" value={surroundingsPercent} aria-label="Surrounding anatomy opacity" aria-valuetext={`${surroundingsPercent}% opacity`} onChange={event => { setContextOpacity(Number(event.target.value) / 100); setGhostOthers(true); }}/>
            <output htmlFor="context-opacity">{surroundingsPercent}%</output>
          </label>}
          {!question.bone && <div className="framing-switch" aria-label="Model framing">{([{ id: 'focus', label: 'Focus', icon: Crosshair }, { id: 'context', label: 'Context', icon: Layers3 }, { id: 'isolate', label: 'Isolate', icon: Focus }] as const).map(item => <button key={item.id} className={framing === item.id ? 'active' : ''} aria-pressed={framing === item.id} onClick={() => { setFraming(item.id); setReset(value => value + 1); }}><item.icon size={13}/><span>{item.label}</span></button>)}</div>}
        </div>
        <div className="interaction-hint">Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Arrows to pan (click model)</div>
      </section>

      <aside className={'question-panel' + (complete ? ' is-summary' : '')} aria-label={complete ? 'Practice set results' : 'Identification question'}>
        {complete ? <>
          <div className="question-kicker"><CheckCheck size={15}/> {emptySelection ? 'CHOOSE YOUR MATERIAL' : sessionMode === 'review' ? 'REVIEW COMPLETE' : passComplete ? 'PASS COMPLETE' : 'SET COMPLETE'}</div>
          <h1>{emptySelection ? 'Choose your structures.' : passComplete ? `All ${poolSize} covered.` : sessionMode === 'review' ? 'Another look helps.' : 'Keep the pass going.'}</h1>
          {responses.length > 0 && <><div className="result-score">{correct}<span> / {queue.length}</span></div><p className="result-description">structures identified correctly{skipped ? ` · ${skipped} skipped` : ''}.</p></>}
          <p className="pass-summary">{emptySelection ? 'This saved selection has no available targets. Choose a region or individual structures in study settings.' : passComplete ? `You've covered every ${customSelection ? 'selected' : 'available'} target in pass ${pass.round}. Start another pass to repeat ${customSelection ? 'this selection' : 'the collection'}.` : `${coveredCount} of ${poolSize} ${customSelection ? 'selected ' : ''}targets covered in pass ${pass.round}. ${remaining} remain before anything repeats.`}</p>
          {misses.length > 0 && <div className="missed-structures"><span>WORTH ANOTHER LOOK</span>{misses.map(item => <button className="review-target" key={item.id} onClick={() => studyStructures([item])} aria-label={`Study ${item.answer}`}><RotateCcw size={12}/><span>{item.answer}</span><ArrowRight size={13}/></button>)}</div>}
          <button className="continue-button" onClick={() => emptySelection ? setSettingsOpen(true) : passComplete ? startNextPass() : startSet()}><span>{emptySelection ? 'Open study settings' : passComplete ? `Start pass ${pass.round + 1}` : `Continue · next ${Math.min(10, remaining)}`}</span><ArrowRight size={17}/></button>
          {misses.length > 0 && <><button className="subtle-button" onClick={() => studyStructures(misses)}>Study missed structures ({misses.length})<ArrowRight size={13}/></button><button className="subtle-button" onClick={() => startSet(collection, misses)}>Practice missed structures ({misses.length})<RotateCcw size={13}/></button></>}
          <small className="saved-note">{auth.user ? progress.status === 'synced' ? 'Your progress is saved to your account.' : saved ? 'Saved on this device. Waiting to sync.' : 'Keep this tab open until your progress is synced.' : saved ? 'Pass progress is saved on this device.' : 'Browser storage is unavailable. This session is in memory.'}</small>
        </> : <>
          <div className="question-kicker"><span className="question-number">{String(index + 1).padStart(2, '0')}</span><span>{sessionMode === 'review' ? 'MISSED REVIEW' : 'IDENTIFICATION'}</span><span className="question-total">/ {String(queue.length).padStart(2, '0')}</span></div>
          <h1>{question.prompt}</h1>
          <p className="question-instruction">{question.landmark ? 'Find the blue marker. Rotate to inspect the surface.' : question.bone ? 'Rotate the bone. Use its anatomical features to determine the side.' : framing === 'isolate' ? 'Only the target is shown. Use Context to see its position in the body.' : effectiveContextOpacity === 0 ? 'The solid blue target is shown on its own. Increase Surroundings to see its position in the body.' : effectiveContextOpacity < 1 ? 'The solid blue structure is your target. Surrounding anatomy is translucent; rotate to inspect its depth and position.' : 'The blue structure is your target. Rotate to inspect its shape and neighbors.'}</p>
          {customSelection && <button className="selection-indicator" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={11}/>{poolSize} selected targets</button>}
          <div className="answer-mode" role="group" aria-label="Answer mode">{([{ id: 'choice', label: 'Multiple choice' }, { id: 'typed', label: 'Type answer' }] as const).map(mode => <button key={mode.id} className={answerMode === mode.id ? 'active' : ''} aria-pressed={answerMode === mode.id} disabled={!!response} onClick={() => changeAnswerMode(mode.id)}>{mode.label}</button>)}</div>
          {!modeSaved && <p className="answer-mode-note" role="status">Answer mode is active for this tab. Browser storage is unavailable.</p>}
          {answerMode === 'choice' ? <div className="answer-options">{question.options.map((option, optionIndex) => <button key={option} disabled={!ready || !!response} className={'answer-option' + (response ? option === question.answer ? ' is-correct' : option === response.selected ? ' is-incorrect' : ' is-muted' : '')} onClick={() => answer(option)}><span className="answer-key">{optionIndex + 1}</span><span>{option}</span>{response && option === question.answer ? <Check size={16}/> : response && option === response.selected ? <X size={15}/> : null}</button>)}</div> : <form className="typed-answer-form" onSubmit={event => { event.preventDefault(); if (typedAnswer.trim()) answer(typedAnswer.trim()); }}>
            <label htmlFor="typed-answer">Your answer</label>
            <input id="typed-answer" ref={answerInput} type="text" value={typedAnswer} onChange={event => setTypedAnswer(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="Name the structure…" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={180} disabled={!ready || !!response} aria-describedby="typed-answer-help" className={response ? response.correct ? 'is-correct' : 'is-incorrect' : ''}/>
            {!response && <p id="typed-answer-help">Small typos are okay. Include the side and any specific part or number.</p>}
            {response && <p id="typed-answer-help">{response.selected === null ? 'Answer revealed.' : 'Answer submitted.'}</p>}
            {!response && <button className="continue-button check-answer-button" type="submit" disabled={!ready || !typedAnswer.trim()}><span>Check answer</span><span className="continue-key">↵</span><ArrowRight size={16}/></button>}
          </form>}
          {response ? <div className={'question-feedback' + (response.correct ? ' correct' : ' revisit')} role="status"><div className="feedback-heading">{response.correct ? <><Check size={15}/><span>Correct.</span></> : <><RotateCcw size={14}/><span>{question.answer}</span></>}</div>{answerMode === 'typed' && response.correct && <p className="typed-answer-name">{question.answer}</p>}{response.typoAccepted && <p className="typo-accepted">Small spelling difference accepted.</p>}<p>{(answerMode === 'typed' || !response.correct) && question.explanation.startsWith(question.answer + '. ') ? question.explanation.slice(question.answer.length + 2) : question.explanation}</p></div> : <div className="question-pause"><span className="pause-line"/>{ready ? 'Take a moment. Picture the name.' : modelStatus === 'error' ? 'The model could not be loaded.' : 'Preparing your specimen…'}</div>}
          {response ? <button className="continue-button" ref={nextButton} onClick={() => advance()}><span>{index + 1 === queue.length ? 'Finish set' : 'Next structure'}</span><span className="continue-key">↵</span><ArrowRight size={16}/></button> : modelStatus === 'error' ? <div className="error-actions"><button className="continue-button" onClick={() => { setModelStatus('loading'); setRetry(value => value + 1); }}>Retry model<RotateCcw size={15}/></button><button className="subtle-button" onClick={() => advance(true)}>Skip this structure<SkipForward size={14}/></button></div> : <button className="reveal-button" disabled={!ready} onClick={() => answer(null)}>I don't know. Show me.<ArrowRight size={13}/></button>}
          <div className="panel-footnote">{sessionMode === 'review' ? 'Intentional review. Your pass progress stays unchanged.' : response ? 'Explain the distinguishing feature to yourself.' : answerMode === 'typed' ? 'Type the name, then press Enter to check.' : 'Use 1–4 to answer. Names stay hidden until you try.'}</div>
        </>}
      </aside>
    </main>

    <footer className="studio-footer"><button className="specimen-credit" onClick={() => setAbout(true)}>{collection === 'muscles' ? 'Z-Anatomy' : 'BodyParts3D'} <span>·</span> {asset.license}</button><div className="session-progress"><span>{correct} correct <i/> {answered} answered</span><div className="progress-marks" aria-label={`${responses.length} of ${queue.length} completed`}>{queue.map((item, itemIndex) => { const result = responses.find(answer => answer.id === item.id); return <span key={item.id} className={result ? result.correct === true ? 'correct' : result.correct === false ? 'missed' : 'skipped' : !complete && itemIndex === index ? 'current' : ''}/>; })}</div></div><span className="pass-progress" aria-label={`Pass ${pass.round}: ${coveredCount} of ${poolSize} targets covered`}>{customSelection ? 'Selection pass' : 'Pass'} {pass.round}<span>{coveredCount} / {poolSize} covered</span></span></footer>

    {overlays}
  </div>;
}
