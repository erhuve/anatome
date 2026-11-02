import { questions } from './content';
import { memeLessonCatalog, memeLessons } from './memeLessons';
import { modelPromptPools, type ModelCollection, type ModelPrompt } from './modelQuiz';
import type { Attempt } from './study';

export type HistoryCollection = ModelCollection | 'memes' | 'other';
export type HistoryFilters = { search: string; collection: 'all' | HistoryCollection; result: 'all' | 'correct' | 'missed' };
export const historyCollections: { id: HistoryCollection; label: string }[] = [
  { id: 'muscles', label: 'Muscles' }, { id: 'skeleton', label: 'Bones' },
  { id: 'landmarks', label: 'Landmarks' }, { id: 'memes', label: 'Meme quizzes' }, { id: 'other', label: 'Other questions' },
];
type HistoryQuestion = { collection: HistoryCollection; title: string; prompt?: string; answer?: string; model?: ModelPrompt; memeId?: string };
const liveMemes = new Set(memeLessons.map(lesson => lesson.id));
const catalog = new Map<string, HistoryQuestion>([
  ...questions.map(question => [question.id, { collection: 'other', title: question.prompt, answer: question.options[question.answer] }] as const),
  ...Object.values(modelPromptPools).flat().map(model => [model.id, { collection: model.collection, title: model.answer, prompt: model.prompt, model }] as const),
  ...memeLessonCatalog.flatMap(lesson => lesson.questions.map(question => [question.id, {
    collection: 'memes', title: question.prompt, prompt: lesson.title, answer: question.answer,
    ...(liveMemes.has(lesson.id) ? { memeId: lesson.id } : {}),
  }] as const)),
]);

/** Keep every recorded try, including repeat answers and retired question IDs. */
export function questionHistory(attempts: readonly Attempt[], filters: HistoryFilters) {
  const search = filters.search.trim().toLocaleLowerCase();
  return attempts.map((attempt, index) => {
    const question = catalog.get(attempt.questionId) ?? { collection: 'other' as const, title: `Archived question · ${attempt.questionId}` };
    return { ...attempt, ...question, index };
  }).filter(item =>
    (filters.collection === 'all' || item.collection === filters.collection) &&
    (filters.result === 'all' || item.correct === (filters.result === 'correct')) &&
    (!search || [item.title, item.prompt, item.answer, item.questionId].some(text => text?.toLocaleLowerCase().includes(search)))
  ).sort((a, b) => b.at - a.at || b.index - a.index);
}
