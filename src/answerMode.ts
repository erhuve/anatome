export type AnswerMode = 'choice' | 'typed';

const storageKey = (userId: string | null) => `anatome-answer-mode-v1:${userId ?? 'guest'}`;

export function readAnswerMode(userId: string | null): AnswerMode {
  try { return localStorage.getItem(storageKey(userId)) === 'choice' ? 'choice' : 'typed'; }
  catch { return 'typed'; }
}

export function writeAnswerMode(userId: string | null, mode: AnswerMode): boolean {
  try { localStorage.setItem(storageKey(userId), mode); return true; }
  catch { return false; }
}
