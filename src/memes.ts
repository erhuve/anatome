import { memeImages } from './memeImages';
import { memeLessons, memeTopics, type MemeLesson, type MemeTopic } from './memeLessons';
import type { Attempt, StudyState } from './study';

export type Meme = typeof memeImages[number] & { lesson: MemeLesson };
const lessons = new Map(memeLessons.map(lesson => [lesson.id, lesson]));
export const memes: Meme[] = memeImages.map(image => {
  const lesson = lessons.get(image.id);
  if (!lesson) throw new Error(`Missing study material for meme ${image.id}`);
  return { ...image, lesson };
});
export const isCoreAnatomy = (meme: Meme) => meme.lesson.topic === 'Muscles' || meme.lesson.topic === 'Bones & landmarks';
// Put the new structure-specific memes first, followed by the original anatomy and physiology collection.
export const orderedMemes = [...memes].sort((a, b) => Number(isCoreAnatomy(b)) - Number(isCoreAnatomy(a)) || Number(Number(b.id) >= 41) - Number(Number(a.id) >= 41) || Number(Number(b.id) >= 29) - Number(Number(a.id) >= 29) || a.id.localeCompare(b.id));
export const memeTopicCounts = memeTopics.map(topic => ({ topic, count: memes.filter(meme => meme.lesson.topic === topic).length }));
export type MemeFilter = 'All' | 'Muscles & bones' | MemeTopic;
export function findMemes(query: string, topic: MemeFilter): Meme[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return orderedMemes.filter(meme => {
    if (topic === 'Muscles & bones' ? !isCoreAnatomy(meme) : topic !== 'All' && meme.lesson.topic !== topic) return false;
    const text = `${meme.title} ${meme.category} ${meme.lesson.title} ${meme.lesson.topic} ${meme.lesson.notes.join(' ')} ${meme.lesson.hook}`.toLowerCase();
    return words.every(word => text.includes(word));
  });
}
export function memeProgress(meme: Meme, attempts: readonly Attempt[], review: StudyState['review'], now = Date.now()) {
  const ids = new Set(meme.lesson.questions.map(q => q.id));
  const latest = new Map<string, Attempt>();
  for (const attempt of attempts) if (ids.has(attempt.questionId) && (!latest.has(attempt.questionId) || latest.get(attempt.questionId)!.at <= attempt.at)) latest.set(attempt.questionId, attempt);
  return { tried: latest.size, correct: [...latest.values()].filter(a => a.correct).length, due: [...ids].filter(id => review[id]?.due <= now).length, total: ids.size };
}
export type MemeActivity = 'study' | 'quiz';
export function memeUrl(href: string, id?: string, activity: MemeActivity = 'study'): URL {
  const url = new URL(href);
  url.searchParams.set('mode', 'memes');
  if (id) { url.searchParams.set('meme', id); url.searchParams.set('activity', activity); }
  else { url.searchParams.delete('meme'); url.searchParams.delete('activity'); }
  return url;
}
export function readMemeRoute(search: string): { meme?: Meme; activity: MemeActivity; invalid: boolean } {
  const params = new URLSearchParams(search);
  const id = params.get('meme');
  return { meme: memes.find(meme => meme.id === id), activity: params.get('activity') === 'quiz' ? 'quiz' : 'study', invalid: !!id && !memes.some(meme => meme.id === id) };
}
