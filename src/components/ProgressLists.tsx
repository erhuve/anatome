import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Search, Smile } from 'lucide-react';
import { modelPromptPools, type ModelPrompt } from '../modelQuiz';
import { recentMissedTargets } from '../reviewTargets';
import { memes, memeProgress } from '../memes';
import type { StudyState } from '../study';
import ProgressPagination from './ProgressPagination';

const labels = { muscles: 'Muscles', skeleton: 'Bones', landmarks: 'Landmarks' };
const pageSize = 20;

export function ReviewPage({ study, onStudy }: { study: StudyState; onStudy: (targets: ModelPrompt[]) => void }) {
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState('all');
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const missed = recentMissedTargets(study.attempts, Infinity);
  const latestTimes = new Map<string, number>();
  for (const attempt of study.attempts) latestTimes.set(attempt.questionId, Math.max(latestTimes.get(attempt.questionId) ?? 0, attempt.at));
  const candidates = dueOnly ? Object.values(modelPromptPools).flat().filter(prompt => (study.review[prompt.id]?.due ?? Infinity) <= Date.now()).map(prompt => ({ prompt, at: latestTimes.get(prompt.id) ?? 0 })) : missed;
  const items = candidates.filter(({ prompt }) => (collection === 'all' || prompt.collection === collection) &&
    `${prompt.answer} ${prompt.group ?? ''} ${prompt.bone ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / pageSize) - 1));
  const start = currentPage * pageSize;
  useEffect(() => { if (list.current) list.current.scrollTop = 0; }, [currentPage, search, collection, dueOnly]);

  return <section className="progress-results" aria-label="Structures to revisit">
    <div className="history-toolbar"><div className="history-filter-fields">
      <label className="history-search"><Search size={15}/><input aria-label="Search review structures" type="search" placeholder="Search structures" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}/></label>
      <div className="history-filters"><select aria-label="Review collection" value={collection} onChange={event => { setCollection(event.target.value); setPage(0); }}><option value="all">All collections</option>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="progress-filter-button" aria-pressed={dueOnly} onClick={() => { setDueOnly(value => !value); setPage(0); }}>Due now</button></div>
    </div><div className="history-count" role="status"><span>{items.length ? `${start + 1}–${Math.min(start + pageSize, items.length)} of ${items.length} structures` : 'No structures to show.'}</span><button className="progress-text-button" disabled={!items.length} onClick={() => onStudy(items.map(item => item.prompt))}><BookOpen size={13}/>Study all {items.length || ''}</button></div></div>
    <div className="progress-list-scroll" ref={list} tabIndex={0} role="region" aria-label="Review structure list">
      {items.length ? <ul className="progress-resource-list">{items.slice(start, start + pageSize).map(({ prompt, at }) => <li key={prompt.id}>
        <div><strong>{prompt.answer}</strong><span>{labels[prompt.collection]} · {at ? `${dueOnly ? 'Last practiced' : 'Last missed'} ${new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Scheduled review'}</span><small>{(study.review[prompt.id]?.due ?? Infinity) <= Date.now() ? 'Review due now' : 'Ready to revisit'}</small></div>
        <button className="progress-text-button" aria-label={`Study ${prompt.answer}`} onClick={() => onStudy([prompt])}>Study<ArrowRight size={14}/></button>
      </li>)}</ul> : <div className="progress-empty"><BookOpen size={28}/><h2>{dueOnly ? 'No model reviews due.' : missed.length ? 'No matching structures.' : 'Nothing to revisit yet.'}</h2><p>{dueOnly ? 'Scheduled 3D reviews appear here when they are due, including previously correct answers.' : missed.length ? 'Try another search or turn off a filter.' : 'Missed and revealed 3D answers will appear here. A correct answer clears the structure.'}</p>{(missed.length > 0 || dueOnly) && <button className="progress-text-button" onClick={() => { setSearch(''); setCollection('all'); setDueOnly(false); setPage(0); }}>Clear filters</button>}</div>}
    </div>
    <ProgressPagination page={currentPage} total={items.length} pageSize={pageSize} onChange={setPage} label="Review structure pages"/>
  </section>;
}

export function MemeProgressPage({ study, onMeme }: { study: StudyState; onMeme: (id?: string) => void }) {
  const [search, setSearch] = useState('');
  const [dueOnly, setDueOnly] = useState(false);
  const [page, setPage] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const practiced = memes.map(meme => ({ meme, stats: memeProgress(meme, study.attempts, study.review) })).filter(item => item.stats.tried > 0).sort((a, b) => b.stats.due - a.stats.due || a.stats.correct / a.stats.total - b.stats.correct / b.stats.total);
  const items = practiced.filter(({ meme, stats }) => (!dueOnly || stats.due > 0) && `${meme.lesson.title} ${meme.lesson.topic}`.toLowerCase().includes(search.trim().toLowerCase()));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(items.length / pageSize) - 1));
  const start = currentPage * pageSize;
  useEffect(() => { if (list.current) list.current.scrollTop = 0; }, [currentPage, search, dueOnly]);

  return <section className="progress-results" aria-label="Meme lesson progress">
    <div className="history-toolbar"><div className="history-filter-fields">
      <label className="history-search"><Search size={15}/><input aria-label="Search practiced meme lessons" type="search" placeholder="Search lessons or topics" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}/></label>
      <button className="progress-filter-button" aria-pressed={dueOnly} onClick={() => { setDueOnly(value => !value); setPage(0); }}>Reviews due</button>
    </div><div className="history-count" role="status"><span>{items.length ? `${start + 1}–${Math.min(start + pageSize, items.length)} of ${items.length} practiced lessons` : 'No lessons to show.'}</span><button className="progress-text-button" onClick={() => onMeme()}>Browse all lessons<ArrowRight size={13}/></button></div></div>
    <div className="progress-list-scroll" ref={list} tabIndex={0} role="region" aria-label="Practiced meme lesson list">
      {items.length ? <ul className="progress-resource-list">{items.slice(start, start + pageSize).map(({ meme, stats }) => <li key={meme.id}>
        <div><strong>{meme.lesson.title}</strong><span>{meme.lesson.topic} · {stats.tried}/{stats.total} questions tried</span><small>{stats.correct}/{stats.total} correct on latest tries · {stats.due} reviews due</small></div>
        <button className="progress-text-button" aria-label={`Review ${meme.lesson.title}`} onClick={() => onMeme(meme.id)}>Review<ArrowRight size={14}/></button>
      </li>)}</ul> : <div className="progress-empty"><Smile size={28}/><h2>{practiced.length ? 'No matching lessons.' : 'A little humor. A little recall.'}</h2><p>{practiced.length ? 'Try another search or turn off the reviews filter.' : 'Take a meme quiz to start tracking its questions here.'}</p><button className="progress-text-button" onClick={() => { if (practiced.length) { setSearch(''); setDueOnly(false); setPage(0); } else onMeme(); }}>{practiced.length ? 'Clear filters' : 'Explore meme quizzes'}<ArrowRight size={14}/></button></div>}
    </div>
    <ProgressPagination page={currentPage} total={items.length} pageSize={pageSize} onChange={setPage} label="Meme lesson pages"/>
  </section>;
}

export const progressCollectionLabels = labels;
export const liveModelIds = new Set(Object.values(modelPromptPools).flat().map(prompt => prompt.id));
