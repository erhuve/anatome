import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Cloud, History, LayoutDashboard, Smile, UserRound } from 'lucide-react';
import { modelPromptPools, type ModelPrompt } from '../modelQuiz';
import { getModelPass } from '../modelPass';
import { recentMissedTargets } from '../reviewTargets';
import { progressPages, progressUrl, type ProgressPage } from '../progressNavigation';
import type { useAuth } from '../useAuth';
import type { useStudyProgress } from '../useStudyProgress';
import QuestionHistory from './QuestionHistory';
import ProgressAccount from './ProgressAccount';
import { liveModelIds, MemeProgressPage, progressCollectionLabels, ReviewPage } from './ProgressLists';

const icons = { overview: LayoutDashboard, history: History, review: BookOpen, memes: Smile, account: UserRound };
const descriptions = {
  overview: 'A view of your practice so far. Coverage tracks exposure; accuracy reflects your recorded answers.',
  history: 'Every recorded try, newest first. Repeated questions and retired material stay in your history.',
  review: 'Your latest missed or revealed 3D answers. Choose Due now for all scheduled model reviews, including previously correct answers.',
  memes: 'Progress for each practiced lesson. Results use your latest try for each question.',
  account: 'Manage sign-in, saved device history, and progress syncing across devices.',
};

type Props = {
  page: ProgressPage; auth: ReturnType<typeof useAuth>; progress: ReturnType<typeof useStudyProgress>;
  onNavigate: (page: ProgressPage) => void; onBack: () => void;
  onStudy: (targets: ModelPrompt[]) => void; onMeme: (id?: string) => void;
};

export default function ProgressPages({ page, auth, progress, onNavigate, onBack, onStudy, onMeme }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); document.title = `${progressPages.find(item => item.id === page)?.label} · Anatomeme`; return () => { document.title = 'Anatomeme — 3D anatomy practice'; }; }, [page]);
  const title = progressPages.find(item => item.id === page)!;
  return <main className="progress-workspace">
    <aside className="progress-sidebar">
      <div className="progress-sidebar-heading"><span>MY PROGRESS</span><small>{auth.user ? 'Your saved practice' : 'Guest practice'}</small></div>
      <nav aria-label="Progress pages">{progressPages.map(item => {
        const Icon = icons[item.id];
        return <a key={item.id} href={progressUrl(window.location.href, item.id).toString()} aria-current={item.id === page ? 'page' : undefined} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); onNavigate(item.id);
        }}><Icon size={17}/><span>{item.label}</span></a>;
      })}</nav>
      <div className="progress-sidebar-bottom"><button className="progress-back" onClick={onBack}><ArrowLeft size={15}/>Back to practice</button><button className="progress-save-status" onClick={() => onNavigate('account')}><Cloud size={14}/><span>{auth.user ? progress.status === 'synced' ? 'All progress synced' : progress.pending ? `${progress.pending} change${progress.pending === 1 ? '' : 's'} waiting to sync` : 'Check save status' : progress.saved ? 'Saved on this device' : 'Saved in this tab only'}</span></button></div>
    </aside>
    <section className="progress-page" aria-labelledby="progress-page-title">
      <header className="progress-page-heading"><div className="question-kicker">YOUR PRACTICE / {page === 'history' ? 'EVERY ATTEMPT' : page === 'account' ? 'ACCOUNT' : page.toUpperCase()}</div><h1 ref={heading} tabIndex={-1} id="progress-page-title">{title.label}</h1><p>{descriptions[page]}</p></header>
      <div className="progress-page-content" key={page}>
        {page === 'overview' && <Overview progress={progress} onNavigate={onNavigate} onStudy={onStudy}/>}
        {page === 'history' && <QuestionHistory attempts={progress.study.attempts} onStudy={onStudy} onMeme={onMeme}/>}
        {page === 'review' && <ReviewPage study={progress.study} onStudy={onStudy}/>}
        {page === 'memes' && <MemeProgressPage study={progress.study} onMeme={onMeme}/>}
        {page === 'account' && <ProgressAccount auth={auth} progress={progress}/>}
      </div>
    </section>
  </main>;
}

function Overview({ progress, onNavigate, onStudy }: Pick<Props, 'progress' | 'onNavigate' | 'onStudy'>) {
  const attempts = progress.study.attempts;
  const correct = attempts.filter(item => item.correct).length;
  const missed = recentMissedTargets(attempts);
  const allMissed = recentMissedTargets(attempts, Infinity).length;
  const due = Object.entries(progress.study.review).filter(([id, review]) => liveModelIds.has(id) && review.due <= Date.now()).length;
  return <div className="progress-page-scroll" tabIndex={0} role="region" aria-label="Practice overview"><div className="progress-overview">
    <div className="progress-stat-grid">
      <div><strong>{attempts.length}</strong><span>Recorded answers</span><small>All material, including repeats</small></div>
      <div><strong>{attempts.length ? `${Math.round(correct / attempts.length * 100)}%` : '—'}</strong><span>Overall accuracy</span><small>Across all recorded answers</small></div>
      <div><strong>{new Set(attempts.map(item => item.questionId)).size}</strong><span>Questions tried</span><small>Distinct questions in your history</small></div>
    </div>
    <section className="progress-card"><div className="progress-card-heading"><h2>3D collection coverage</h2><span>All-material passes</span></div><p>Each collection keeps its own pass. Custom selections keep separate passes in the quiz.</p><div className="progress-coverage">{(['muscles', 'skeleton', 'landmarks'] as const).map(collection => {
      const ids = new Set(modelPromptPools[collection].map(prompt => prompt.id));
      const history = attempts.filter(item => ids.has(item.questionId));
      const pass = getModelPass(progress.study.modelPasses, collection);
      return <div className="collection-progress-row" key={collection}><div><strong>{progressCollectionLabels[collection]}</strong><span>{history.length ? `${Math.round(history.filter(item => item.correct).length / history.length * 100)}% accuracy` : 'No answers yet'}</span></div><div className="collection-meter" role="progressbar" aria-label={`${progressCollectionLabels[collection]} pass coverage`} aria-valuenow={pass.coveredIds.length} aria-valuemin={0} aria-valuemax={ids.size}><i style={{ width: `${pass.coveredIds.length / ids.size * 100}%` }}/></div><small>Pass {pass.round}<span>{pass.coveredIds.length} / {ids.size} covered</span></small></div>;
    })}</div><small className="progress-caption">Answered and revealed structures count toward coverage. Coverage is not a mastery score.</small></section>
    <div className="progress-overview-columns"><section className="progress-card"><div className="progress-card-heading"><h2>Worth another look</h2><span>{allMissed} structures</span></div><p>{due} model reviews due now. Start with your latest missed structures.</p>{missed.length ? missed.map(({ prompt }) => <button className="progress-preview-row" key={prompt.id} onClick={() => onStudy([prompt])}><span>{prompt.answer}</span><ArrowRight size={14}/></button>) : <p>Your missed and revealed structures will appear here.</p>}<button className="progress-text-button" onClick={() => onNavigate('review')}>View all structures<ArrowRight size={14}/></button></section>
    <section className="progress-card progress-history-card"><History size={24}/><h2>Your complete question history</h2><p>Find a question, compare repeated tries, or return to its study material. Every recorded answer stays available.</p><button className="progress-text-button" onClick={() => onNavigate('history')}>View question history<ArrowRight size={14}/></button><div className="progress-card-divider"/><Smile size={24}/><h2>Meme quizzes</h2><p>See your latest results and reviews due for each practiced lesson.</p><button className="progress-text-button" onClick={() => onNavigate('memes')}>View lesson progress<ArrowRight size={14}/></button></section></div>
  </div></div>;
}
