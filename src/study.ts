import { getModelPass, normalizeModelPasses, type ModelPasses } from './modelPass';

export type Attempt = { questionId: string; correct: boolean; category: string; at: number };
export type SavedNote = { id: string; title: string; body: string; created: number };
export type StudyState = { attempts: Attempt[]; notes: SavedNote[]; studied: string[]; checklist?: string[]; modelPasses?: ModelPasses; review: Record<string, { due: number; interval: number; streak: number }> };
export const emptyState: StudyState = { attempts: [], notes: [], studied: [], checklist: [], modelPasses: {}, review: {} };
const key = 'anatome-study-v1';
export function readState(): StudyState {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (!value || !Array.isArray(value.attempts) || !Array.isArray(value.notes) || !Array.isArray(value.studied) || typeof value.review !== 'object' || !value.review) return structuredClone(emptyState);
    let modelPasses: ModelPasses = {};
    if (value.modelPasses && typeof value.modelPasses === 'object' && !Array.isArray(value.modelPasses)) {
      modelPasses = normalizeModelPasses(value.modelPasses);
    } else if (!Object.hasOwn(value, 'modelPasses')) {
      // Before pass tracking existed, unique answered model targets still
      // establish first-pass coverage. Never backfill an explicit new pass.
      const previousIds = value.attempts.map((attempt: Attempt) => attempt.questionId);
      for (const collection of ['muscles', 'skeleton', 'landmarks'] as const) {
        const migrated = getModelPass({ [collection]: { round: 1, coveredIds: previousIds } }, collection);
        if (migrated.coveredIds.length) modelPasses[collection] = migrated;
      }
    }
    return { attempts: value.attempts.filter((a: Attempt) => typeof a.questionId === 'string' && typeof a.correct === 'boolean' && Number.isFinite(a.at)), notes: value.notes.filter((n: SavedNote) => typeof n.id === 'string' && typeof n.title === 'string' && typeof n.body === 'string'), studied: value.studied.filter((s:unknown) => typeof s === 'string'), checklist: Array.isArray(value.checklist) ? value.checklist.filter((s:unknown)=>typeof s==='string') : [], modelPasses, review: value.review };
  } catch { return structuredClone(emptyState); }
}
export function writeState(state: StudyState): boolean { try { localStorage.setItem(key, JSON.stringify(state)); return true; } catch { return false; } }
export function recordAttempt(state: StudyState, questionId: string, category: string, correct: boolean, now = Date.now()): StudyState {
  const previous = state.review[questionId];
  const advance = !previous || previous.due <= now;
  const streak = correct ? (previous?.streak ?? 0) + (advance ? 1 : 0) : 0;
  const interval = correct ? Math.min(30, [1, 3, 7, 14, 30][Math.min(streak - 1, 4)]) : 0;
  return { ...state, attempts: [...state.attempts, { questionId, category, correct, at: now }], review: { ...state.review, [questionId]: correct && previous && !advance ? previous : { due: now + (correct ? interval * 86400000 : 600000), interval, streak } } };
}
export function shuffle<T>(items: T[], random = Math.random): T[] { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
export function makeSession<T extends { id: string }>(questions: T[], state: StudyState, count = 8, now = Date.now()): T[] {
  const due = shuffle(questions.filter(q => state.review[q.id] && state.review[q.id].due <= now));
  const fresh = shuffle(questions.filter(q => !state.review[q.id]));
  const rest = shuffle(questions.filter(q => state.review[q.id] && state.review[q.id].due > now));
  return [...due, ...fresh, ...rest].slice(0, count);
}
