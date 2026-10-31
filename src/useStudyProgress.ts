import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { ProgressStore, type ProgressRemote } from './progress';
import { supabase } from './supabase';

const remote: ProgressRemote | null = supabase ? {
  async insert(userId, events) {
    const { error } = await supabase!.from('study_events').upsert(events.map(event => ({ ...event, user_id: userId })), { onConflict: 'user_id,id', ignoreDuplicates: true });
    if (error) throw error;
  },
  async load(userId) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase!.from('study_events').select('id,kind,occurred_at,payload').eq('user_id', userId).order('occurred_at').order('id').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) return rows;
    }
  },
} : null;

export function useStudyProgress(userId: string | null, authReady: boolean) {
  const store = useMemo(() => new ProgressStore(userId, remote, authReady), [userId, authReady]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    store.start();
    // Other devices' history refreshes on focus/reconnect or the user's Retry.
    // Answers upload immediately without repeatedly downloading full history.
    const sync = () => store.refresh();
    const storage = () => { store.refreshCache(); store.flush(); };
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', storage);
    // Retry pending uploads without polling or downloading account history.
    const retryUploads = window.setInterval(store.flush, 30000);
    return () => {
      store.stop();
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', storage);
      window.clearInterval(retryUploads);
    };
  }, [store]);
  return { ...snapshot, recordAnswer: store.recordAnswer, restartPass: store.restartPass, importGuest: store.importGuest, retry: store.retry };
}
