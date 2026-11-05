import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, Crosshair, Focus, Layers3, RotateCcw, Search, X } from 'lucide-react';
import BoneViewer from './BoneViewer';
import SystemViewer from './SystemViewer';
import { getPromptContextIds, modelPromptPools, quizRegions, type ModelPrompt } from '../modelQuiz';
import { matchTypedAnswer } from '../answerMatching';
import type { AnswerMode } from '../answerMode';
import type { View } from '../content';
import { DEFAULT_CONTEXT_OPACITY } from '../anatomyRendering';
import { shuffle } from '../study';
import { studyTargetLabel } from '../studyNavigation';
import StudyBrowser from './StudyBrowser';
import { trackEvent } from '../analytics';
import { focusAnswerOnDesktop } from '../visualViewport';
import ModelControls from './ModelControls';
import AnatomyMnemonic from './AnatomyMnemonic';

type Result = { selected: string | null; correct: boolean; typoAccepted: boolean };
type Props = {
  targets: ModelPrompt[];
  answerMode: AnswerMode;
  onAnswer: (prompt: ModelPrompt, correct: boolean) => void;
  onClose: () => void;
  header?: ReactNode;
  general?: boolean;
  initialTargetId?: string;
  onTargetChange?: (id: string) => void;
  paused?: boolean;
  fromMeme?: boolean;
  backLabel?: string;
  sectionHeading?: ReactNode;
};
const collectionLabel = { muscles: 'Muscles', skeleton: 'Bones', landmarks: 'Landmarks' };

/** A temporary study session leaves the interrupted quiz and its pass intact. */
export default function StudyFlow({ targets, answerMode, onAnswer, onClose, header, general = false, initialTargetId, onTargetChange, paused = false, fromMeme = false, backLabel, sectionHeading }: Props) {
  const [index, setIndex] = useState(() => Math.max(0, targets.findIndex(prompt => prompt.id === initialTargetId)));
  const [browserOpen, setBrowserOpen] = useState(false);
  const [phase, setPhase] = useState<'study' | 'recall' | 'complete'>('study');
  const [results, setResults] = useState<Record<string, Result>>({});
  const [typed, setTyped] = useState('');
  const [mode, setMode] = useState(answerMode);
  const prompt = targets[index];
  const options = useMemo(() => shuffle(prompt.options), [prompt]);
  const [view, setView] = useState<View>(prompt.view);
  const [freeView, setFreeView] = useState(false);
  const [framing, setFraming] = useState<'focus' | 'context' | 'isolate'>(prompt.presentation === 'isolate' ? 'isolate' : 'focus');
  const [opacity, setOpacity] = useState(DEFAULT_CONTEXT_OPACITY);
  const [reset, setReset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const result = results[prompt.id];
  const tested = Object.values(results);
  const explanation = prompt.explanation;
  const onReady = useCallback((value: 'loading' | 'ready' | 'error') => setStatus(value), []);
  const onViewChange = useCallback((direction: string) => setFreeView(direction === 'free'), []);
  const contextIds = useMemo(() => getPromptContextIds(prompt), [prompt]);
  const hasOpacity = !prompt.bone && framing !== 'isolate';
  const trackedTarget = useRef('');
  const wasPaused = useRef(paused);

  useEffect(() => {
    const key = `${prompt.collection}:${prompt.id}`;
    if (paused || phase === 'complete' || trackedTarget.current === key) return;
    trackedTarget.current = key;
    trackEvent('study_target_viewed', { collection: prompt.collection, question_id: prompt.id, source: fromMeme ? 'meme' : general ? 'study' : 'review' });
  }, [prompt, paused, phase, fromMeme, general]);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [index, phase]);
  useEffect(() => {
    const resumed = wasPaused.current && !paused;
    wasPaused.current = paused;
    if (resumed) return;
    if (paused || browserOpen) return;
    if (phase === 'recall' && !result && status === 'ready' && mode === 'typed') focusAnswerOnDesktop(input.current);
    if (phase === 'recall' && result) next.current?.focus({ preventScroll: true });
  }, [phase, result, status, mode, paused, browserOpen]);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (paused || browserOpen || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || (event.target as HTMLElement)?.closest('input,textarea,select,a,.section-heading-button,.browse-sections-button')) return;
      if (phase === 'recall' && mode === 'choice' && /^[1-4]$/.test(event.key)) {
        const option = options[Number(event.key) - 1];
        if (option) { event.preventDefault(); answer(option); }
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  });

  function showTarget(nextIndex: number) {
    const target = targets[nextIndex];
    if (!target) return;
    setIndex(nextIndex); setPhase('study'); setTyped('');
    setView(target.view); setFreeView(false); setFraming(target.presentation === 'isolate' ? 'isolate' : 'focus'); setReset(value => value + 1);
    lock.current = !!results[target.id];
    onTargetChange?.(target.id);
  }
  function answer(selected: string | null) {
    if (phase !== 'recall' || status !== 'ready' || result || lock.current || paused || browserOpen) return;
    lock.current = true;
    input.current?.blur();
    const matched = selected !== null && mode === 'typed'
      ? matchTypedAnswer(selected, prompt.answer, modelPromptPools[prompt.collection].map(item => item.answer))
      : { correct: selected === prompt.answer, typoAccepted: false };
    setResults(previous => ({ ...previous, [prompt.id]: { selected, ...matched } }));
    onAnswer(prompt, matched.correct);
    trackEvent('quiz_answered', { collection: prompt.collection, question_id: prompt.id, correct: matched.correct, revealed: selected === null, answer_mode: mode, activity: 'self_check' });
  }
  function advance() {
    if (index + 1 < targets.length) showTarget(index + 1);
    else setPhase('complete');
  }

  return <div className={'quiz-app study-flow practice-screen' + (general ? ' is-general-study' : '') + (phase === 'recall' ? ' is-recalling' : '') + (phase === 'complete' ? ' is-complete' : '')}>
    {header ?? <header className="study-header">
      <button className="study-back" onClick={onClose}><ArrowLeft size={15}/>{backLabel ?? (fromMeme ? 'Back to meme' : 'Back to practice')}</button>
      <span><BookOpen size={15}/>{fromMeme ? 'From meme to model' : 'Worth another look'}</span>
      <small>{index + 1} / {targets.length}</small>
    </header>}
    <main className="studio-main">
      <section className={'specimen-stage' + (hasOpacity ? ' has-context-opacity' : '')} aria-label="Interactive 3D study specimen">
        {sectionHeading ?? <div className="stage-heading"><span className="collection-label">{fromMeme ? 'From meme to model' : 'Review structures'}</span></div>}
        <div className="model-space">
          {prompt.bone ? <BoneViewer key={`study-${prompt.bone}-${retry}`} bone={prompt.bone} view={view} labels={false} activeLandmark={prompt.landmark} resetToken={reset} theme="dark" onReady={onReady} onViewChange={onViewChange}/> : <SystemViewer key={`study-${prompt.collection}-${retry}`} system={prompt.collection === 'muscles' ? 'muscles' : 'skeleton'} view={view} selectedId={prompt.partId} isolate={framing === 'isolate'} focusSelected={framing === 'focus'} focusContextIds={contextIds} ghostOthers={true} contextOpacity={opacity} resetToken={reset} theme="dark" onReady={onReady} onViewChange={onViewChange} onSelect={general && phase === 'study' ? id => showTarget(targets.findIndex(target => target.partId === id)) : undefined}/>}
        </div>
        <ModelControls resetKey={prompt.id + phase}>
        <div className={'stage-bottom' + (hasOpacity ? ' has-opacity' : '')}>
          <div className="view-tools"><button className="icon-control" aria-label="Reset study camera" onClick={() => { setView(prompt.view); setFreeView(false); setReset(value => value + 1); }}><RotateCcw size={16}/></button><div className="view-select"><select aria-label="Anatomical view" value={freeView ? 'free' : view} onChange={event => { setView(event.target.value as View); setFreeView(false); setReset(value => value + 1); }}><option value="free" disabled>Free view</option><option value="anterior">Anterior</option><option value="posterior">Posterior</option><option value="medial">{prompt.bone ? 'Medial' : 'Left side'}</option><option value="lateral">{prompt.bone ? 'Lateral' : 'Right side'}</option></select><ChevronDown size={12}/></div></div>
          {hasOpacity && <label className="context-opacity" htmlFor="study-opacity"><span>Surroundings</span><input id="study-opacity" type="range" min="0" max="100" value={Math.round(opacity * 100)} onChange={event => setOpacity(Number(event.target.value) / 100)} aria-label="Surrounding anatomy opacity"/><output htmlFor="study-opacity">{Math.round(opacity * 100)}%</output></label>}
          {!prompt.bone && <div className="framing-switch" aria-label="Model framing">{([{ id: 'focus', label: 'Focus', icon: Crosshair }, { id: 'context', label: 'Context', icon: Layers3 }, { id: 'isolate', label: 'Isolate', icon: Focus }] as const).map(item => <button key={item.id} className={framing === item.id ? 'active' : ''} aria-pressed={framing === item.id} onClick={() => { setFraming(item.id); setReset(value => value + 1); }}><item.icon size={13}/><span>{item.label}</span></button>)}</div>}
        </div>
        </ModelControls>
        <div className="interaction-hint">Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Arrows to pan (click model)</div>
      </section>

      <aside className={'question-panel study-panel' + (result && phase === 'recall' ? ' has-response' : '')} aria-label="Structure study">
        {general && phase !== 'recall' && <button className="browse-study-button" onClick={() => setBrowserOpen(true)}><Search size={14}/><span>Browse {targets.length} {targets.length === 1 ? 'structure' : 'structures'}</span><ChevronDown size={13}/></button>}
        {phase === 'complete' ? <>
          <h1 ref={heading} tabIndex={-1}>Study complete.</h1>
          {tested.length > 0 && <p className="study-result-summary">{tested.filter(item => item.correct).length} of {tested.length} self-checks correct.</p>}
          <button className="continue-button" onClick={onClose}>{backLabel ?? (general ? 'Switch to quiz' : fromMeme ? 'Back to meme' : 'Back to practice')}<ArrowRight size={16}/></button>
          <button className="subtle-button" onClick={() => { setResults({}); showTarget(0); lock.current = false; }}>Study again<RotateCcw size={13}/></button>
        </> : phase === 'study' ? <>
          <h1 ref={heading} tabIndex={-1}>{studyTargetLabel(prompt)}</h1>
          <div className="study-copy">
          <div className="study-tags">{prompt.region && <span>{quizRegions.find(region => region.id === prompt.region)?.label}</span>}</div>
          {explanation && <p className="study-explanation">{explanation}</p>}
          <AnatomyMnemonic prompt={prompt}/>
          <a className="study-reference" href={prompt.source} target="_blank" rel="noreferrer">Anatomy reference<ArrowUpRight size={13}/></a>
          </div>
          {result ? <p className="study-check-status"><Check size={13}/>Self-check recorded.</p> : <button className="continue-button" disabled={status !== 'ready'} onClick={() => { setTyped(''); setPhase('recall'); }}>Hide name & test myself<ArrowRight size={16}/></button>}
        </> : <>
          <div className="question-kicker">SELF-CHECK</div>
          <h1 ref={heading} tabIndex={-1}>{prompt.prompt}</h1>
          <div className="answer-mode" role="group" aria-label="Answer mode">{(['choice', 'typed'] as const).map(value => <button key={value} className={mode === value ? 'active' : ''} aria-pressed={mode === value} disabled={!!result} onClick={() => { setMode(value); setTyped(''); }}>{value === 'typed' ? 'Type answer' : 'Multiple choice'}</button>)}</div>
          {mode === 'typed' ? <form className="typed-answer-form" onSubmit={event => { event.preventDefault(); if (typed.trim()) answer(typed.trim()); }}><label htmlFor="study-answer">Your answer</label><input ref={input} id="study-answer" value={typed} onChange={event => setTyped(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="Name the structure…" enterKeyHint="done" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={180} disabled={!!result || status !== 'ready'} aria-describedby={!result ? 'study-answer-help' : undefined}/>{!result && <p id="study-answer-help">Include the side and any specific part or number.</p>}{!result && <button type="submit" className="continue-button check-answer-button" disabled={status !== 'ready' || !typed.trim()}>Check answer<ArrowRight size={16}/></button>}</form> : <div className="answer-options">{options.map((option, optionIndex) => <button className={'answer-option' + (result ? option === prompt.answer ? ' is-correct' : option === result.selected ? ' is-incorrect' : ' is-muted' : '')} key={option} disabled={!!result || status !== 'ready'} onClick={() => answer(option)}><span className="answer-key">{optionIndex + 1}</span><span>{option}</span>{result && option === prompt.answer && <Check size={15}/>}</button>)}</div>}
          {result ? <><div className={'question-feedback' + (result.correct ? ' correct' : ' revisit')} role="status"><div className="feedback-heading">{result.correct ? <Check size={15}/> : <RotateCcw size={14}/>}<span>{result.correct ? 'Correct. ' : ''}{prompt.answer}</span></div>{result.typoAccepted && <p>Small spelling difference accepted.</p>}{explanation && <p>{explanation}</p>}<AnatomyMnemonic prompt={prompt}/></div><button ref={next} className="continue-button" onClick={advance}>{index + 1 === targets.length ? 'Finish study' : 'Next structure'}<ArrowRight size={16}/></button><button className="subtle-button" onClick={() => setPhase('study')}>Look at the structure again<BookOpen size={13}/></button></> : <><button className="reveal-button" disabled={status !== 'ready'} onClick={() => answer(null)}>Show answer<ArrowRight size={13}/></button><button className="subtle-button" onClick={() => setPhase('study')}>Back to studying<ArrowLeft size={13}/></button></>}
        </>}
        {phase !== 'complete' && status !== 'ready' && <div className="study-model-status" role="status">{status === 'error' ? <><p>The model could not be loaded.</p><button onClick={() => { setStatus('loading'); setRetry(value => value + 1); }}>Retry model<RotateCcw size={13}/></button></> : 'Preparing your specimen…'}</div>}
      </aside>
    </main>
    <footer className="studio-footer study-footer"><span>STUDY / {collectionLabel[prompt.collection]}</span><div className="study-pagination"><button disabled={index === 0 || phase === 'complete'} onClick={() => showTarget(index - 1)}><ArrowLeft size={13}/>Previous</button><span>{index + 1} of {targets.length}</span><button onClick={phase === 'complete' ? onClose : advance}>{phase === 'complete' ? 'Done' : index + 1 === targets.length ? 'Finish' : 'Next'}<ArrowRight size={13}/></button></div><button className="icon-control" aria-label="Close study" onClick={onClose}><X size={16}/></button></footer>
    {browserOpen && <StudyBrowser targets={targets} selectedId={prompt.id} onSelect={id => { showTarget(targets.findIndex(target => target.id === id)); setBrowserOpen(false); }} onClose={() => setBrowserOpen(false)}/>}
  </div>;
}
