import { modelPromptPools, type ModelCollection, type ModelPrompt } from './modelQuiz';
import { selectedPromptIds, type QuizSelections } from './quizSelection';
import { studyUnits } from './studySections';
import { studyTargetLabel } from './studyNavigation';

const sectionTerms = new Map(studyUnits.flatMap(unit => unit.sections.flatMap(section => section.promptIds.map(id => [id, `${section.title} ${unit.title}`] as const))));

/** Prefer the named target; use section names only when the query names a group. */
export function findSelectionTargets(pool: readonly ModelPrompt[], query: string): ModelPrompt[] {
  const words = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (!words.length) return [...pool];
  const matches = (value: string) => {
    const tokens = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    return words.every(word => tokens.some(token => token.startsWith(word)));
  };
  const targets = pool.filter(prompt => matches(`${studyTargetLabel(prompt)} ${prompt.group ?? ''}`));
  return targets.length ? targets : pool.filter(prompt => matches(`${studyTargetLabel(prompt)} ${sectionTerms.get(prompt.id) ?? ''}`));
}

/** Edit only the requested live targets; other collections and hidden targets stay selected. */
export function editSelection(collection: ModelCollection, selections: QuizSelections, ids: readonly string[], operation: 'add' | 'remove'): QuizSelections {
  const pool = modelPromptPools[collection];
  const valid = new Set(pool.map(prompt => prompt.id));
  const selected = new Set(selectedPromptIds(collection, selections));
  for (const id of ids) if (valid.has(id)) {
    if (operation === 'add') selected.add(id);
    else selected.delete(id);
  }
  const chosen = pool.filter(prompt => selected.has(prompt.id)).map(prompt => prompt.id);
  return { ...selections, [collection]: chosen.length === pool.length ? null : chosen };
}
