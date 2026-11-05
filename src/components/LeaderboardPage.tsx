import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, CloudUpload, Globe2, RefreshCw, ShieldCheck, Trophy, Users } from 'lucide-react';
import { nicknameError, type LeaderboardState } from '../leaderboard';
import type { useAuth } from '../useAuth';
import type { useStudyProgress } from '../useStudyProgress';

type Props = {
  auth: ReturnType<typeof useAuth>;
  progress: ReturnType<typeof useStudyProgress>;
  board: LeaderboardState;
  onRefresh: () => void;
  onSaveProfile: (nickname: string, listed: boolean) => Promise<boolean>;
  onAccount: () => void;
};

export default function LeaderboardPage({ auth, progress, board, onRefresh, onSaveProfile, onAccount }: Props) {
  const [nickname, setNickname] = useState(board.profile?.nickname ?? '');
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const listed = board.profile?.listed === true;
  const snapshot = board.snapshot;
  const unavailable = board.status === 'unavailable';
  const loading = board.status === 'loading';
  const busy = board.working || loading || !auth.ready;

  useEffect(() => {
    setNickname(board.profile?.nickname ?? '');
    setConsent(false);
    setFormError(null);
  }, [auth.user?.id, board.profile?.nickname, board.profile?.listed]);

  useEffect(() => { setSavedMessage(null); }, [auth.user?.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = nickname.trim();
    setSavedMessage(null);
    const validation = nicknameError(value);
    if (validation) {
      setFormError(validation);
      return;
    }
    if (!listed && !consent) {
      setFormError('Choose whether to publish your nickname and score before joining.');
      return;
    }
    setFormError(null);
    try {
      if (await onSaveProfile(value, true)) setSavedMessage(listed ? 'Your nickname has been updated.' : 'You’re on the leaderboard. Welcome!');
    } catch {
      setFormError('Could not save your leaderboard profile. Please try again.');
    }
  }

  async function leave() {
    if (busy || !board.profile) return;
    setFormError(null);
    setSavedMessage(null);
    try {
      if (await onSaveProfile(board.profile.nickname, false)) setSavedMessage('You’ve left the leaderboard. Your study progress is saved.');
    } catch {
      setFormError('Could not leave the leaderboard. Please try again.');
    }
  }

  return <div className="progress-page-scroll leaderboard-scroll" tabIndex={0} role="region" aria-label="Leaderboard">
    <div className="leaderboard-page">
      <div className="leaderboard-intro">
        <span className="leaderboard-emblem" aria-hidden="true"><Trophy size={26} strokeWidth={1.6}/></span>
        <div><span className="leaderboard-eyebrow"><Globe2 size={12}/>All time</span><h2>Every new structure counts.</h2><p>Build your anatomy knowledge. See how you stack up.</p></div>
      </div>

      {board.error && <div className="leaderboard-notice is-error" role="alert"><p>{board.error}</p><button onClick={onRefresh} disabled={busy}><RefreshCw size={14}/>Try again</button></div>}
      {unavailable && !board.error && <div className="leaderboard-notice" role="status"><p>The leaderboard isn’t available yet. You can keep practicing while it gets ready.</p><button onClick={onRefresh} disabled={board.working}><RefreshCw size={14}/>Try again</button></div>}

      <div className="leaderboard-layout">
        <section className="leaderboard-ranking" aria-labelledby="leaderboard-ranking-title" aria-busy={loading}>
          <div className="leaderboard-ranking-heading"><div><h3 id="leaderboard-ranking-title">Top 50</h3><p>{snapshot ? `${snapshot.participants.toLocaleString()} ${snapshot.participants === 1 ? 'learner' : 'learners'} competing` : 'One shared board. A little friendly competition.'}</p></div><button className="leaderboard-refresh" onClick={onRefresh} disabled={busy || unavailable} aria-label="Refresh leaderboard" title="Refresh leaderboard"><RefreshCw size={16}/></button></div>
          {snapshot && snapshot.entries.length > 0 ? <>
            <table className="leaderboard-table"><caption className="leaderboard-sr-only">Leaderboard ranked by unique 3D quiz targets answered correctly</caption><thead><tr><th scope="col">Rank</th><th scope="col">Learner</th><th scope="col">Points</th></tr></thead><tbody>{snapshot.entries.map(entry => <tr key={entry.nickname} className={entry.is_you ? 'is-you' : undefined}><td><span className={'leaderboard-rank' + (entry.rank <= 3 ? ' is-podium' : '')}>{entry.rank === 1 && <Trophy size={13} aria-hidden="true"/>}<span>#{entry.rank.toLocaleString()}</span></span></td><th scope="row"><span className="leaderboard-nickname">{entry.nickname}{entry.is_you && <small>You</small>}</span></th><td>{entry.score.toLocaleString()}</td></tr>)}</tbody></table>
            <div className="leaderboard-table-note">Equal points share a rank. Your own rank appears even outside the top 50.</div>
          </> : <div className="leaderboard-empty" role="status">{loading ? <><RefreshCw size={25}/><h4>Loading the leaderboard…</h4><p>Getting the latest scores.</p></> : unavailable || board.status === 'error' ? <><Globe2 size={29}/><h4>The board is taking a break.</h4><p>Scores will appear here when the leaderboard is available.</p></> : <><Users size={30}/><h4>The first spot is open.</h4><p>No one has joined yet. Bring your anatomy knowledge and start the board.</p></>}</div>}
          {snapshot && board.updatedAt && <p className="leaderboard-updated">Updated {new Date(board.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · Refresh for the latest scores</p>}
        </section>

        <aside className="leaderboard-personal" aria-label="Your leaderboard profile">
          {snapshot?.self && listed && <div className="leaderboard-your-rank"><span>Your place in the world</span><div><strong>#{snapshot.self.rank.toLocaleString()}</strong><p><b>{snapshot.self.score.toLocaleString()}</b> points<small>of {snapshot.total_questions.toLocaleString()} available</small></p></div><p className="leaderboard-your-name">{snapshot.self.nickname}</p></div>}
          <section className="leaderboard-profile">
            <h3>{listed ? 'Your public profile' : 'Join the friendly competition'}</h3>
            {!auth.user ? <><p>Sign in, choose a nickname, and put your quiz knowledge on the board.</p><button className="leaderboard-primary" onClick={onAccount} disabled={!auth.ready || !auth.configured || unavailable}>Go to account<ArrowRight size={15}/></button>{!auth.configured && <p className="leaderboard-fineprint">Account sign-in is not available in this version.</p>}</> : unavailable || (!snapshot && board.status === 'error') ? <p>You can set up your public profile when the leaderboard is available again.</p> : !board.profile && loading ? <p role="status">Checking your leaderboard profile…</p> : <form onSubmit={event => void save(event)}>
              <label htmlFor="leaderboard-nickname">Public nickname</label>
              <input id="leaderboard-nickname" name="nickname" value={nickname} onChange={event => { setNickname(event.target.value); setFormError(null); setSavedMessage(null); }} minLength={3} maxLength={24} pattern="[A-Za-z0-9 _\-]{3,24}" autoComplete="off" spellCheck={false} placeholder="e.g. FunnyBone" required disabled={busy} aria-describedby="leaderboard-nickname-help" aria-invalid={formError ? true : undefined}/>
              <small id="leaderboard-nickname-help">3–24 letters, numbers, spaces, _ or -. Include a letter or number.</small>
              {!listed && <label className="leaderboard-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} required/><span>Publish my nickname, score and rank on the leaderboard.</span></label>}
              <button className="leaderboard-primary" type="submit" disabled={busy || (!listed && !consent) || (listed && nickname.trim() === board.profile?.nickname)}>{board.working ? 'Saving…' : listed ? 'Save nickname' : 'Join leaderboard'}{!listed && <ArrowRight size={15}/>}</button>
              {listed && <button className="leaderboard-leave" type="button" disabled={busy} onClick={() => void leave()}>Leave leaderboard</button>}
            </form>}
            {formError && <p className="leaderboard-form-error" role="alert">{formError}</p>}
            {savedMessage && <p className="leaderboard-saved" role="status"><Check size={14}/>{savedMessage}</p>}
            <p className="leaderboard-privacy"><ShieldCheck size={16}/><span>Only nickname, score and rank are public. Your Google name, email and question history stay private. You can leave at any time.</span></p>
          </section>
          {auth.user && progress.pending > 0 && <div className="leaderboard-sync"><CloudUpload size={17}/><div><p>{progress.pending.toLocaleString()} {progress.pending === 1 ? 'answer' : 'changes'} waiting to sync. Your score updates after eligible answers are saved online.</p><button onClick={progress.retry} disabled={progress.status === 'syncing'}>{progress.status === 'syncing' ? 'Syncing…' : 'Sync progress'}<ArrowRight size={13}/></button></div></div>}
        </aside>
      </div>

      <details className="leaderboard-rules"><summary>How points work</summary><div><p><strong>One correct structure. One point.</strong> Earn a point the first time you correctly answer each different 3D quiz target while signed in. There are {snapshot?.total_questions.toLocaleString() ?? '720'} possible points across muscles, bones and landmarks.</p><p>Your previous eligible signed-in quizzes count. Repeated targets, revealed answers, study self-checks, meme quizzes and imported guest history don’t add points. Ties share a rank.</p><p>This is a friendly, honor-system leaderboard. Scores reflect practice, not a verified exam or proof of mastery.</p></div></details>
    </div>
  </div>;
}
