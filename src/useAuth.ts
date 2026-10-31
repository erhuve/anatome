import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { googleSignInEnabled, supabase } from './supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let authChanges = 0;
    // Keep this callback synchronous: awaiting another auth call here can
    // deadlock the SDK's session lock.
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      authChanges += 1;
      setUser(session?.user ?? null);
      setReady(true);
      setWorking(false);
    });
    // PKCE exchange errors are returned by initialize(), not getSession().
    // Surface them even if INITIAL_SESSION has already emitted a null session.
    const initializationFailed = () => {
      if (!active) return;
      setError('Could not finish signing in. Please try Google sign-in again.');
      setReady(true);
    };
    void client.auth.initialize().then(({ error: initializationError }) => {
      if (initializationError) initializationFailed();
    }).catch(initializationFailed);
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authChanges > 0) return;
      if (sessionError) setError('Could not restore your sign-in. Please try signing in again.');
      setUser(data.session?.user ?? null);
      setReady(true);
    }).catch(() => {
      if (!active || authChanges > 0) return;
      setError('Could not restore your sign-in. Check your connection and try again.');
      setReady(true);
    });
    const callbackUrl = new URL(window.location.href);
    const hash = new URLSearchParams(callbackUrl.hash.slice(1));
    const callbackError = callbackUrl.searchParams.get('error_description') || hash.get('error_description');
    if (callbackError) {
      setError('Google sign-in was not completed. Please try again.');
      for (const key of ['error', 'error_code', 'error_description']) callbackUrl.searchParams.delete(key);
      callbackUrl.hash = '';
      window.history.replaceState({}, '', callbackUrl);
    }
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function signIn() {
    if (!supabase || working) return;
    setWorking(true);
    setError(null);
    const redirect = new URL(window.location.pathname, window.location.origin);
    const atlas = new URLSearchParams(window.location.search).get('atlas');
    if (atlas) redirect.searchParams.set('atlas', atlas);
    try {
      if (!await googleSignInEnabled()) {
        setError('Google sign-in is not available yet. You can keep practicing as a guest.');
        setWorking(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: redirect.toString() },
      });
      if (error) throw error;
    } catch {
      setError('Could not open Google sign-in. Check your connection and try again.');
      setWorking(false);
    }
  }

  async function signOut() {
    if (!supabase || working) return;
    setWorking(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      setError('Could not sign out. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  return { user, ready, working, error, signIn, signOut, configured: !!supabase };
}
