import { modelPromptPools, type ModelPrompt } from './modelQuiz';
import type { Attempt } from './study';

const prompts = new Map(Object.values(modelPromptPools).flat().map(prompt => [prompt.id, prompt]));

/** A later correct answer clears a miss, even if imported history is out of order. */
export function recentMissedTargets(attempts: readonly Attempt[], limit = 5): { prompt: ModelPrompt; at: number }[] {
  const latest = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (!prompts.has(attempt.questionId)) continue;
    const previous = latest.get(attempt.questionId);
    if (!previous || attempt.at >= previous.at) latest.set(attempt.questionId, attempt);
  }
  return [...latest.values()].filter(attempt => !attempt.correct).sort((a, b) => b.at - a.at)
    .slice(0, limit).map(attempt => ({ prompt: prompts.get(attempt.questionId)!, at: attempt.at }));
}
