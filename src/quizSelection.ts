import { modelPromptPools, type ModelCollection } from './modelQuiz';

/** null means all available targets, including models added later. */
export type QuizSelections = Partial<Record<ModelCollection, string[] | null>>;
const collections: ModelCollection[] = ['muscles', 'skeleton', 'landmarks'];
const storageKey = (userId: string | null) => `anatome-quiz-selection-v1:${userId ?? 'guest'}`;

export function selectedPromptIds(collection: ModelCollection, selections: QuizSelections): string[] {
  const pool = modelPromptPools[collection];
  const chosen = selections[collection];
  if (chosen === undefined || chosen === null) return pool.map(prompt => prompt.id);
  const requested = new Set(chosen);
  return pool.filter(prompt => requested.has(prompt.id)).map(prompt => prompt.id);
}
export function normalizeQuizSelections(value: unknown): QuizSelections {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const result: QuizSelections = {};
  for (const collection of collections) {
    if (record[collection] === null) result[collection] = null;
    else if (Array.isArray(record[collection])) {
      const valid = new Set(modelPromptPools[collection].map(prompt => prompt.id));
      result[collection] = [...new Set(record[collection].filter((id): id is string => typeof id === 'string' && valid.has(id)))];
    }
  }
  return result;
}
export function readQuizSelections(userId: string | null): QuizSelections {
  try { return normalizeQuizSelections(JSON.parse(localStorage.getItem(storageKey(userId)) ?? 'null')); }
  catch { return {}; }
}
export function writeQuizSelections(userId: string | null, selections: QuizSelections): boolean {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(normalizeQuizSelections(selections))); return true; }
  catch { return false; }
}
