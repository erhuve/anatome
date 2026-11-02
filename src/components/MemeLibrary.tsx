import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, Expand, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { findMemes, isCoreAnatomy, memeProgress, memes, memeTopicCounts, memeUrl, readMemeRoute, type Meme, type MemeActivity, type MemeFilter } from '../memes';
import { memeModelTargets, type MemeQuestion } from '../memeLessons';
import { shuffle, type StudyState } from '../study';
import type { ModelPrompt } from '../modelQuiz';
import { trackEvent, trackPageview } from '../analytics';

type Props = { study: StudyState; paused: boolean; onAnswer: (id: string, correct: boolean) => void; onStudyModels: (targets: ModelPrompt[]) => void };

export default function MemeLibrary({ study, paused, onAnswer, onStudyModels }: Props) {
  const [route, setRoute] = useState(() => readMemeRoute(window.location.search));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MemeFilter>('All');
  const [dueOnly, setDueOnly] = useState(false);
  const main = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const imageDialog = useRef<HTMLDialogElement>(null);
  const galleryScroll = useRef(0);
  const lastCard = useRef<string | null>(null);
  const selected = route.meme;
  const visible = useMemo(() => findMemes(query, filter).filter(meme => !dueOnly || memeProgress(meme, study.attempts, study.review).due > 0), [query, filter, dueOnly, study]);
  const dueMemes = memes.filter(meme => memeProgress(meme, study.attempts, study.review).due > 0).length;
  const models = useMemo(() => selected ? memeModelTargets(selected.lesson) : [], [selected]);

  useEffect(() => {
    trackPageview({ mode: 'memes', ...(selected ? { meme_id: selected.id, activity: route.activity } : {}) });
  }, [selected, route.activity]);

  useEffect(() => {
    const restore = () => setRoute(readMemeRoute(window.location.search));
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => { if (paused) imageDialog.current?.close(); }, [paused]);
  function open(meme?: Meme, activity: MemeActivity = 'study') {
    if (!selected && meme) { galleryScroll.current = main.current?.scrollTop ?? 0; lastCard.current = meme.id; }
    window.history.replaceState({}, '', memeUrl(window.location.href, meme?.id, activity));
    setRoute({ meme, activity, invalid: false });
    requestAnimationFrame(() => {
      if (main.current) main.current.scrollTop = meme ? 0 : galleryScroll.current;
      if (meme) heading.current?.focus({ preventScroll: true });
      else if (lastCard.current) main.current?.querySelector<HTMLButtonElement>(`[data-open-meme="${lastCard.current}"]`)?.focus({ preventScroll: true });
    });
  }

  return <main ref={main} className="meme-workspace">
    {selected ? <div className="meme-detail">
      <div className="meme-detail-nav"><button className="meme-back" onClick={() => open()}><ArrowLeft size={15}/>All memes</button><span>{selected.lesson.topic} / {selected.id}</span></div>
      <figure className="meme-visual">
        <button className="meme-enlarge" onClick={() => imageDialog.current?.showModal()} aria-label={`Enlarge meme: ${selected.title}`}><img src={selected.image} alt={selected.title} width={selected.width} height={selected.height}/><span><Expand size={14}/>Enlarge</span></button>
        <figcaption><a href={selected.source} target="_blank" rel="noreferrer">Meme source<ArrowUpRight size={12}/></a><span>Original credits preserved</span></figcaption>
      </figure>
      <section className="meme-learning" aria-label="Linked study and quiz material">
        <div className="question-kicker">{isCoreAnatomy(selected) ? 'ANATOMY / IDENTIFY & REMEMBER' : 'A&P / BEYOND THE ATLAS'}</div>
        <h1 tabIndex={-1} ref={heading}>{selected.lesson.title}</h1>
        <p className="meme-connection">{selected.lesson.connection}</p>
        <div className="meme-activity" role="group" aria-label="Meme activity"><button aria-pressed={route.activity === 'study'} onClick={() => open(selected, 'study')}><BookOpen size={15}/>Study</button><button aria-pressed={route.activity === 'quiz'} onClick={() => open(selected, 'quiz')}><Sparkles size={15}/>Quiz</button></div>
        {route.activity === 'study' ? <>
          <h2 className="meme-section-label">Make it stick</h2>
          <ol className="meme-study-notes">{selected.lesson.notes.map(note => <li key={note}>{note}</li>)}</ol>
          <div className="meme-memory-hook"><span>MEMORY HOOK</span><p>{selected.lesson.hook}</p></div>
          <a className="meme-reference" href={selected.lesson.reference} target="_blank" rel="noreferrer">Read the OpenStax section<ArrowUpRight size={13}/></a>
          <button className="continue-button" onClick={() => open(selected, 'quiz')}>Try the quiz<ArrowRight size={16}/></button>
        </> : <MemeQuiz key={selected.id} meme={selected} paused={paused} onAnswer={onAnswer} onStudy={() => open(selected, 'study')}/>}
        {models.length > 0 && <div className="meme-model-link"><div><BookOpen size={17}/><h2>Find it in the 3D atlas</h2></div><p>{models.length} linked structures. Inspect their names, shapes, and sides, then hide the name for an identification self-check.</p><button onClick={() => onStudyModels(models)}>Study & identify in 3D<ArrowRight size={15}/></button></div>}
        <SavedQuizProgress meme={selected} study={study}/>
      </section>
      <dialog ref={imageDialog} className="meme-image-dialog" aria-label={selected.title} onClick={event => { if (event.target === event.currentTarget) imageDialog.current?.close(); }}><button className="icon-control" aria-label="Close enlarged meme" onClick={() => imageDialog.current?.close()}><X size={20}/></button><img src={selected.image} alt={selected.title}/><p>{selected.title}</p></dialog>
    </div> : <div className="meme-library">
      <div className="meme-library-intro"><div><div className="question-kicker">YOUR A&P MEME STASH</div><h1>Laugh. Learn.<br/><span>See what stuck.</span></h1><p>Memes with something to remember. Start with muscles, bones, and landmarks, or venture into the physiology behind the joke.</p></div><div className="meme-library-stats"><strong>{memes.length}</strong><span>memes & comics</span><p>{memes.length * 3} linked quiz questions<br/>Mini-lessons with every meme</p></div></div>
      {route.invalid && <p className="meme-route-note" role="status">That meme link is unavailable. Choose one from the collection below.</p>}
      <div className="meme-search-row"><label className="meme-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} type="search" aria-label="Search memes and study topics" placeholder="Try scapula, biceps, carpals…"/></label><button className={'meme-due-filter' + (dueOnly ? ' active' : '')} aria-pressed={dueOnly} onClick={() => setDueOnly(value => !value)}><RotateCcw size={14}/>Review due · {dueMemes}</button></div>
      <div className="meme-filters" role="group" aria-label="Filter meme topics">{(['All', 'Muscles & bones', ...memeTopicCounts.map(item => item.topic)] as MemeFilter[]).map(topic => <button key={topic} aria-pressed={filter === topic} onClick={() => setFilter(topic)}>{topic}{topic === 'Muscles & bones' && <span>{memes.filter(isCoreAnatomy).length}</span>}</button>)}</div>
      <details className="meme-topic-breakdown"><summary>What’s covered? Topic breakdown</summary><p>Each meme reinforces a specific structure, relationship, mnemonic, or mechanism. Study notes explain the cue and extend it into practice.</p><div>{memeTopicCounts.map(({ topic, count }) => <button key={topic} onClick={() => { setFilter(topic); setDueOnly(false); setQuery(''); }}>{topic}<span>{count} memes · {count * 3} questions</span></button>)}</div></details>
      <p className="meme-count" role="status">{visible.length} of {memes.length} memes{filter !== 'All' ? ` · ${filter}` : ' · muscle and bone study first'}</p>
      {visible.length ? <div className="meme-grid">{visible.map(meme => {
        const saved = memeProgress(meme, study.attempts, study.review);
        return <article className="meme-card" key={meme.id}><button className="meme-card-image" data-open-meme={meme.id} aria-label={`Study meme: ${meme.title}`} onClick={() => open(meme)}><img src={meme.thumbnail} alt={meme.title} loading="lazy" decoding="async" width={meme.width} height={meme.height}/></button><div className="meme-card-body"><span className="meme-card-topic">{meme.lesson.topic}{saved.due > 0 && <i>Review due</i>}</span><h2>{meme.title}</h2><p>{meme.lesson.title}</p><div className="meme-card-actions"><button onClick={() => open(meme)}><BookOpen size={14}/>Study</button><button onClick={() => open(meme, 'quiz')}>Quiz<ArrowRight size={14}/></button></div>{saved.tried > 0 && <small>{saved.correct}/{saved.total} correct on latest tries</small>}</div></article>;
      })}</div> : <div className="meme-empty"><Search size={28}/><h2>{dueOnly ? 'No matching reviews due.' : 'No memes found.'}</h2><p>{dueOnly ? 'Try another topic, or browse the whole collection.' : 'Try a shorter search or choose another topic.'}</p><button className="continue-button" onClick={() => { setQuery(''); setFilter('All'); setDueOnly(false); }}>Show all memes<ArrowRight size={15}/></button></div>}
      <p className="meme-library-footnote">Each meme has its own study notes, memory hook, source link, and three original quiz questions. Anatomy lessons link to available 3D structures. Memes may simplify or exaggerate; use the linked notes for the study facts.</p>
    </div>}
  </main>;
}

function SavedQuizProgress({ meme, study }: { meme: Meme; study: StudyState }) {
  const saved = memeProgress(meme, study.attempts, study.review);
  return <p className="meme-saved-progress" role="status">{saved.tried ? `${saved.correct}/${saved.total} correct on latest tries · ${saved.tried}/${saved.total} questions attempted${saved.due ? ` · ${saved.due} review${saved.due === 1 ? '' : 's'} due` : ''}` : 'Your quiz answers will appear here after you try.'}</p>;
}

function MemeQuiz({ meme, paused, onAnswer, onStudy }: { meme: Meme; paused: boolean; onAnswer: Props['onAnswer']; onStudy: () => void }) {
  const [questions, setQuestions] = useState(() => prepare(meme.lesson.questions));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ id: string; selected: string | null; correct: boolean }[]>([]);
  const [complete, setComplete] = useState(false);
  const lock = useRef(false);
  const next = useRef<HTMLButtonElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const current = questions[index];
  const result = answers.find(answer => answer.id === current.id);
  const correct = answers.filter(answer => answer.correct).length;
  const missed = questions.filter(question => answers.some(answer => answer.id === question.id && !answer.correct));
  const trackedQuestions = useRef<MemeQuestion[] | null>(null);
  useEffect(() => {
    if (trackedQuestions.current === questions) return;
    trackedQuestions.current = questions;
    trackEvent('quiz_set_started', { collection: 'memes', question_count: questions.length, session_mode: questions.length < meme.lesson.questions.length ? 'review' : 'pass' });
  }, [questions, meme]);
  useEffect(() => { if (!paused && result) next.current?.focus({ preventScroll: true }); }, [result, paused]);
  useEffect(() => { if (index > 0 || complete) title.current?.focus({ preventScroll: true }); }, [index, complete]);
  function answer(selected: string | null) {
    if (lock.current || paused || complete) return;
    lock.current = true;
    const isCorrect = selected === current.answer;
    setAnswers(values => [...values, { id: current.id, selected, correct: isCorrect }]);
    onAnswer(current.id, isCorrect);
    trackEvent('quiz_answered', { collection: 'memes', question_id: current.id, correct: isCorrect, revealed: selected === null, answer_mode: 'choice', activity: 'quiz' });
  }
  function advance() {
    if (complete || !result || paused) return;
    if (index + 1 === questions.length) {
      trackEvent('quiz_set_completed', { collection: 'memes', question_count: questions.length, correct_count: correct, answered_count: answers.length, skipped_count: 0, session_mode: questions.length < meme.lesson.questions.length ? 'review' : 'pass' });
      setComplete(true);
    }
    else { setIndex(value => value + 1); lock.current = false; }
  }
  function retry(pool: MemeQuestion[]) {
    setQuestions(prepare(pool)); setIndex(0); setAnswers([]); setComplete(false); lock.current = false;
    requestAnimationFrame(() => title.current?.focus({ preventScroll: true }));
  }
  return <div className="meme-quiz">
    {complete ? <>
      <div className="question-kicker"><Check size={15}/>QUIZ COMPLETE</div><h2 ref={title} tabIndex={-1}>{correct} of {questions.length} correct.</h2><p className="meme-quiz-summary">{missed.length ? 'Give the missed ideas another look, then try recalling them again.' : 'Nice recall. You can revisit the lesson or explore its 3D structures.'}</p>
      <ul className="meme-results">{questions.map(question => <li key={question.id}><span>{answers.find(answer => answer.id === question.id)?.correct ? <Check size={15}/> : <RotateCcw size={14}/>}</span><div><strong>{question.prompt}</strong><p>{question.answer}</p><small>{question.explanation}</small></div></li>)}</ul>
      {missed.length > 0 && <button className="continue-button" onClick={() => retry(missed)}>Retry missed ({missed.length})<RotateCcw size={15}/></button>}
      <button className={missed.length ? 'subtle-button' : 'continue-button'} onClick={() => retry(meme.lesson.questions)}>Quiz again<RotateCcw size={15}/></button><button className="subtle-button" onClick={onStudy}><BookOpen size={14}/>Review study notes</button>
    </> : <>
      <div className="question-kicker">QUICK RECALL<span>{index + 1} / {questions.length}</span></div>
      <h2 ref={title} tabIndex={-1}>{current.prompt}</h2>
      <div className="answer-options">{current.options.map((option, n) => <button key={option} disabled={!!result || paused} className={'answer-option' + (result ? option === current.answer ? ' is-correct' : option === result.selected ? ' is-incorrect' : ' is-muted' : '')} onClick={() => answer(option)}><span className="answer-key">{String.fromCharCode(65 + n)}</span><span>{option}</span>{result && option === current.answer && <Check size={15}/>}</button>)}</div>
      {result ? <><div className={'question-feedback' + (result.correct ? ' correct' : ' revisit')} role="status"><div className="feedback-heading">{result.correct ? <Check size={15}/> : <RotateCcw size={14}/>}<span>{result.correct ? 'Correct.' : result.selected === null ? 'Revealed.' : 'Not quite.'} {current.answer}</span></div><p>{current.explanation}</p></div><button ref={next} disabled={paused} className="continue-button" onClick={advance}>{index + 1 === questions.length ? 'See results' : 'Next question'}<ArrowRight size={15}/></button></> : <button className="reveal-button" disabled={paused} onClick={() => answer(null)}>I don’t know. Show me.<ArrowRight size={13}/></button>}
      <p className="meme-quiz-footnote">Submitting or revealing records one answer. Reading the lesson does not.</p>
    </>}
  </div>;
}
function prepare(questions: MemeQuestion[]) { return shuffle(questions).map(question => ({ ...question, options: shuffle(question.options) })); }
