import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Search, X } from 'lucide-react';
import { historyCollections, questionHistory, type HistoryFilters } from '../questionHistory';
import type { Attempt } from '../study';
import type { ModelPrompt } from '../modelQuiz';
import ProgressPagination from './ProgressPagination';

const pageSize = 20;
const initialFilters: HistoryFilters = { search: '', collection: 'all', result: 'all' };

export default function QuestionHistory({ attempts, onStudy, onMeme }: {
  attempts: readonly Attempt[];
  onStudy: (targets: ModelPrompt[]) => void;
  onMeme?: (id?: string) => void;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const history = useMemo(() => questionHistory(attempts, filters), [attempts, filters]);
  const lastPage = Math.max(0, Math.ceil(history.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * pageSize;
  useEffect(() => { if (list.current) list.current.scrollTop = 0; }, [currentPage, filters]);
  function filter(next: Partial<HistoryFilters>) {
    setFilters(previous => ({ ...previous, ...next }));
    setPage(0);
  }
  function changePage(next: number) {
    setPage(next);
  }

  return <section className="question-history" aria-label="Question attempts">
    {attempts.length > 0 ? <><div className="history-toolbar">
      <div className="history-filter-fields">
      <label className="history-search"><Search size={15}/><input type="search" aria-label="Search question history" placeholder="Search questions or structures" value={filters.search} onChange={event => filter({ search: event.target.value })}/></label>
      <div className="history-filters">
        <select aria-label="History collection" value={filters.collection} onChange={event => filter({ collection: event.target.value as HistoryFilters['collection'] })}>
          <option value="all">All material</option>{historyCollections.map(collection => <option key={collection.id} value={collection.id}>{collection.label}</option>)}
        </select>
        <select aria-label="History result" value={filters.result} onChange={event => filter({ result: event.target.value as HistoryFilters['result'] })}>
          <option value="all">All results</option><option value="correct">Correct</option><option value="missed">Missed / revealed</option>
        </select>
      </div>
      </div>
      <p className="history-count" role="status">{history.length ? `${start + 1}–${Math.min(start + pageSize, history.length)} of ${history.length} attempts` : 'No attempts match your filters.'}<span>{attempts.length} attempts in your history</span></p>
      </div>
      <div className="history-scroll progress-list-scroll" ref={list} tabIndex={0} role="region" aria-label="Question attempt list">
      {history.length > 0 ? <ol className="history-list" start={start + 1}>{history.slice(start, start + pageSize).map(item => <li key={item.index}>
        <div className={`history-result ${item.correct ? 'is-correct' : 'is-missed'}`}>{item.correct ? <Check size={13}/> : <X size={13}/>}<span>{item.correct ? 'Correct' : 'Missed / revealed'}</span></div>
        <div className="history-question"><strong>{item.title}</strong>
        {item.prompt && <span className="history-prompt">{item.prompt}</span>}
        {item.answer && <span className="history-answer">Answer: {item.answer}</span>}
        <div className="history-meta"><span>{historyCollections.find(collection => collection.id === item.collection)?.label}</span><time dateTime={new Date(item.at).toISOString()}>{new Date(item.at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div></div>
        {item.model ? <button className="history-study" onClick={() => onStudy([item.model!])} aria-label={`Study ${item.title}`}>Study structure<ArrowRight size={13}/></button>
          : item.memeId && onMeme ? <button className="history-study" onClick={() => onMeme(item.memeId)}>Review meme quiz<ArrowRight size={13}/></button> : null}
      </li>)}</ol> : <button className="history-reset" onClick={() => filter(initialFilters)}>Clear filters</button>}
      </div>
      <ProgressPagination page={currentPage} total={history.length} pageSize={pageSize} onChange={changePage} label="Question history pages"/>
    </> : <div className="progress-empty"><Search size={28}/><h2>Your history starts here.</h2><p>Your answered and revealed questions will appear here as you practice.</p></div>}
  </section>;
}
