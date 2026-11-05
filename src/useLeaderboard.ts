import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { LeaderboardStore, type LeaderboardRemote } from './leaderboard';
import { supabase } from './supabase';

const remote: LeaderboardRemote | null = supabase ? {
  async load() {
    const { data, error } = await supabase!.rpc('get_global_leaderboard').abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    return data;
  },
  async profile() {
    const { data, error } = await supabase!.rpc('get_leaderboard_profile').abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    return data;
  },
  async save(nickname, listed) {
    const { data, error } = await supabase!.rpc('set_leaderboard_profile', { p_nickname: nickname, p_listed: listed }).abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    return data;
  },
} : null;

export function useLeaderboard(userId: string | null, authReady: boolean) {
  const store = useMemo(() => new LeaderboardStore(remote, !!userId, authReady), [userId, authReady]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { store.start(); return store.stop; }, [store]);
  return { state, refresh: store.refresh, saveProfile: store.saveProfile };
}
