import { createClient } from '@supabase/supabase-js';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const url = env.VITE_SUPABASE_URL?.trim();
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// An unconfigured build still works for local guest practice. Never place a
// service-role or secret key in Vite's public environment variables.
export const supabase = url && publishableKey?.startsWith('sb_publishable_')
  ? createClient(url, publishableKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null;

export async function googleSignInEnabled(): Promise<boolean> {
  if (!url || !publishableKey) return false;
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: publishableKey }, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Could not check sign-in availability');
  const settings = await response.json();
  return settings?.external?.google === true;
}
