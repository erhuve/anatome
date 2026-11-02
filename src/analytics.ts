import posthog from 'posthog-js';
import type { ModelCollection } from './modelQuiz';
import type { WorkspaceMode } from './studyNavigation';
import type { AnswerMode } from './answerMode';

type Collection = ModelCollection | 'memes';
type Events = {
  quiz_set_started: { collection: Collection; question_count: number; session_mode: 'pass' | 'review' };
  quiz_set_completed: { collection: Collection; question_count: number; correct_count: number; answered_count: number; skipped_count: number; session_mode: 'pass' | 'review' };
  quiz_answered: { collection: Collection; question_id: string; correct: boolean; revealed: boolean; answer_mode: AnswerMode; activity: 'quiz' | 'self_check'; session_mode?: 'pass' | 'review' };
  study_target_viewed: { collection: ModelCollection; question_id: string; source: 'study' | 'review' | 'meme' };
  study_selection_saved: { collection: ModelCollection; target_count: number; custom_selection: boolean };
  sign_in_started: { provider: 'google' };
};

let enabled = false;
let lastPageview = '';
let analyticsContext: Record<string, string> = {};

// Only app navigation belongs in analytics URLs. In particular, OAuth codes,
// error descriptions, fragments, and arbitrary search text must not be sent.
export function analyticsUrl(value: string): string {
  try {
    const url = new URL(value);
    const allowed = new URLSearchParams();
    for (const key of ['atlas', 'mode', 'meme', 'activity']) {
      const value = url.searchParams.get(key);
      const valid = key === 'atlas' ? /^(muscles|skeleton|bones|landmarks)$/
        : key === 'mode' ? /^(study|quiz|memes)$/
        : key === 'activity' ? /^(study|quiz)$/ : /^\d{1,3}$/;
      if (value && valid.test(value)) allowed.set(key, value);
    }
    url.search = allowed.toString();
    url.hash = '';
    url.username = '';
    url.password = '';
    return url.toString();
  } catch { return ''; }
}

export function sanitizeAnalyticsProperties(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key,
    typeof value === 'string' && /(?:url|referrer)$/i.test(key) && value !== '$direct'
      ? analyticsUrl(value)
      : value && typeof value === 'object' && !Array.isArray(value)
        ? sanitizeAnalyticsProperties(value as Record<string, unknown>) : value,
  ]));
}

export function initializeAnalytics() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  const token = env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
  const host = env.VITE_POSTHOG_HOST?.trim();
  if (enabled || !token || !host || env.VITE_POSTHOG_ENABLED === 'false' || typeof window === 'undefined') return;
  try {
    posthog.init(token, {
      api_host: host,
      defaults: '2026-08-30',
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      capture_exceptions: false,
      capture_performance: false,
      enable_heatmaps: false,
      disable_surveys: true,
      before_send: event => event ? { ...event, properties: sanitizeAnalyticsProperties(event.properties) } : null,
    });
    analyticsContext = { app: 'anatomeme', environment: env.MODE ?? 'unknown' };
    posthog.register(analyticsContext);
    enabled = true;
    return posthog;
  } catch {
    // Analytics must never prevent guest practice or account progress from loading.
    return undefined;
  }
}

export function syncAnalyticsIdentity(userId: string | null) {
  if (!enabled) return;
  try {
    const previousId = posthog.get_property('$user_id') as string | undefined;
    if (previousId && previousId !== userId) { posthog.reset(); posthog.register(analyticsContext); lastPageview = ''; }
    if (userId && previousId !== userId) posthog.identify(userId);
  } catch { /* Practice remains available when analytics is blocked. */ }
}

export function trackEvent<K extends keyof Events>(event: K, properties: Events[K]) {
  if (!enabled) return;
  try { posthog.capture(event, properties); } catch { /* Analytics is optional. */ }
}

export function trackPageview(properties: { mode: WorkspaceMode; collection?: ModelCollection; meme_id?: string; activity?: string }) {
  if (!enabled) return;
  const url = analyticsUrl(window.location.href);
  const key = JSON.stringify([url, properties]);
  // React StrictMode replays effects in development. One view should send once.
  if (lastPageview === key) return;
  lastPageview = key;
  try { posthog.capture('$pageview', { ...properties, $current_url: url }); } catch { /* Analytics is optional. */ }
}
