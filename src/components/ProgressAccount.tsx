import { ArrowUpRight, Check, Cloud, LogOut, RefreshCw } from 'lucide-react';
import type { useAuth } from '../useAuth';
import type { useStudyProgress } from '../useStudyProgress';

export default function ProgressAccount({ auth, progress }: {
  auth: ReturnType<typeof useAuth>; progress: ReturnType<typeof useStudyProgress>;
}) {
  const isEmbedded = window.self !== window.top;
  const status = !auth.user
    ? progress.saved ? 'Guest practice · saved on this device' : 'Guest practice · saved in this tab only'
    : progress.status === 'synced' ? 'All progress synced'
      : progress.status === 'syncing' ? 'Syncing your progress…'
        : progress.pending ? `${progress.pending} change${progress.pending === 1 ? '' : 's'} waiting to sync` : 'Your account is available on this device';
  return <div className="progress-page-scroll" tabIndex={0} role="region" aria-label="Account settings"><div className="progress-account progress-card">
      {auth.user ? <p className="account-identity">{auth.user.email ?? 'Your account'}</p> : <>
        <p>Sign in with Google to save your answers and collection passes, then pick them up on another device.</p>
        {auth.configured ? isEmbedded
          ? <a className="google-signin" href={window.location.href} target="_blank" rel="noreferrer">Open app to sign in<ArrowUpRight size={16}/></a>
          : <button className="google-signin" onClick={() => void auth.signIn()} disabled={auth.working}><GoogleMark/>{auth.working ? 'Opening Google…' : 'Continue with Google'}</button>
          : <p className="progress-message">Account sign-in is not available in this version. You can keep practicing as a guest.</p>}
        <small className="account-caption">Guest practice stays available without an account.</small>
      </>}

      {auth.error && <p className="progress-message is-error" role="alert">{auth.error}</p>}
      <div className="cloud-status" role="status">{progress.status === 'synced' ? <Check size={14}/> : <Cloud size={14}/>}<span>{status}</span>{auth.user && <button className="refresh-progress" onClick={progress.retry} disabled={progress.status === 'syncing'} aria-label="Refresh account progress" title="Refresh account progress"><RefreshCw size={13}/></button>}</div>
      {progress.error && <div className="sync-message"><p role="status">{progress.error}</p>{auth.user && <button onClick={progress.retry} disabled={progress.status === 'syncing'}><RefreshCw size={12}/>Retry sync</button>}</div>}

      {auth.user && progress.canImport && <div className="import-card">
        <h3>Already practiced here?</h3>
        <p>Add this browser’s guest history to your account. Only import it if it belongs to you.</p>
        <button onClick={progress.importGuest} disabled={!progress.ready}>Add my device history<ArrowUpRight size={13}/></button>
      </div>}

      {auth.user && <div className="account-signout">
        {progress.pending > 0 && <p>{progress.saved ? 'Pending changes stay on this device until you sign in again.' : 'Wait for your progress to sync before signing out.'}</p>}
        <button disabled={auth.working || (progress.pending > 0 && !progress.saved)} onClick={() => void auth.signOut()}><LogOut size={13}/>{auth.working ? 'Signing out…' : 'Sign out'}</button>
      </div>}

  </div></div>;
}

function GoogleMark() {
  return <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.3 2.9-7.4Z"/><path fill="#34a853" d="M12 22c2.7 0 5-1 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.7-4.2H2.9v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H2.9a10 10 0 0 0 0 9l3.4-2.6Z"/><path fill="#ea4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.1 5.5l3.4 2.6A6 6 0 0 1 12 5.9Z"/></svg>;
}
