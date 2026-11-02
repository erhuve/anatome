import { modelPromptPools, quizRegions, type ModelCollection, type ModelPrompt } from './modelQuiz';
import { selectedPromptIds, type QuizSelections } from './quizSelection';

export type WorkspaceMode = 'study' | 'quiz' | 'memes';

/** Study includes selected targets even when a quiz pass has already covered them. */
export function studyTargetsFor(collection: ModelCollection, selections: QuizSelections): ModelPrompt[] {
  const allowed = new Set(selectedPromptIds(collection, selections));
  return modelPromptPools[collection].filter(prompt => allowed.has(prompt.id));
}

export function studyTargetLabel(prompt: ModelPrompt): string {
  return prompt.bone && !prompt.landmark ? `${prompt.answer} ${prompt.bone}` : prompt.answer;
}

export function findStudyTargets(targets: readonly ModelPrompt[], query: string, region = ''): ModelPrompt[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return targets.filter(prompt => {
    if (region && prompt.region !== region) return false;
    const text = `${studyTargetLabel(prompt)} ${prompt.group ?? ''} ${prompt.bone ?? ''} ${quizRegions.find(item => item.id === prompt.region)?.label ?? ''}`.toLowerCase();
    return words.every(word => text.includes(word));
  });
}

export function workspaceUrl(href: string, mode: WorkspaceMode, collection: ModelCollection): URL {
  const url = new URL(href);
  url.searchParams.set('atlas', collection);
  if (mode !== 'quiz') url.searchParams.set('mode', mode);
  else url.searchParams.delete('mode');
  if (mode !== 'memes') { url.searchParams.delete('meme'); url.searchParams.delete('activity'); }
  return url;
}
