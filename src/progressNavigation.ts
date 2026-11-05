export const progressPages = [
  { id: 'overview', label: 'Overview', description: 'Answers, accuracy, and collection coverage.' },
  { id: 'history', label: 'Question history', description: 'Every recorded attempt, across all material.' },
  { id: 'review', label: 'Worth another look', description: '3D structures to revisit after a missed answer.' },
  { id: 'memes', label: 'Meme quizzes', description: 'Lesson progress and questions due for review.' },
  { id: 'leaderboard', label: 'Leaderboard', description: 'Compare your 3D quiz score with other learners.' },
  { id: 'account', label: 'Account & sync', description: 'Sign-in, device history, and save status.' },
] as const;
export type ProgressPage = typeof progressPages[number]['id'];

export function readProgressPage(search: string): ProgressPage | null {
  const requested = new URLSearchParams(search).get('progress');
  return progressPages.find(page => page.id === requested)?.id ?? null;
}

/** Preserve the interrupted workspace, including the selected meme or collection. */
export function progressUrl(href: string, page: ProgressPage | null): URL {
  const url = new URL(href);
  if (page) url.searchParams.set('progress', page);
  else url.searchParams.delete('progress');
  return url;
}
