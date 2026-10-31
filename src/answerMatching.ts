export type TypedAnswerMatch = { correct: boolean; typoAccepted: boolean };

// These words distinguish neighboring anatomical structures. A typo may resolve
// to one of them, but one valid qualifier must never stand in for another.
const qualifiers = new Set((
  'left right major minor minimus maximus medius intermedius medial lateral medialis lateralis median ' +
  'anterior posterior superior inferior proximal distal middle intermediate ' +
  'external internal innermost superficial deep long short longus brevis longi breves ' +
  'first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth ' +
  'cervical thoracic lumbar sacral coccygeal palmar plantar dorsal ventral ' +
  'hand foot finger toe thumb index ring little big abductor adductor flexor extensor ' +
  'oblique transverse straight ascending descending radial ulnar humeral clavicular ' +
  'spinal acromial sternocostal abdominal capitis colli thoracis lumborum head neck belly'
).split(' '));
const optionalWords = new Set(['of', 'the', 'muscle', 'muscles']);
const rejected: TypedAnswerMatch = { correct: false, typoAccepted: false };

function words(value: string): string[] {
  return (value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/['’]/g, '').match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter(word => !optionalWords.has(word));
}

/** Optimal string alignment distance: an adjacent transposition is one typo. */
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function equivalent(a: readonly string[], b: readonly string[]): boolean {
  // Ignore word order ("right biceps femoris, short head") and harmless word
  // boundaries ("thyro-arytenoid" / "thyroarytenoid").
  return a.join('') === b.join('') || [...a].sort().join(' ') === [...b].sort().join(' ');
}

function protectedWord(word: string): string | undefined {
  if (qualifiers.has(word) || word.length <= 3 || /\d/.test(word)) return word;
  const near = [...qualifiers].filter(candidate => Math.min(candidate.length, word.length) >= 4 && editDistance(candidate, word) <= 1);
  return near.length === 1 ? near[0] : undefined;
}

function tokenDistance(input: readonly string[], expected: readonly string[], limit: number, protect: boolean): number {
  if (equivalent(input, expected)) return 0;
  if (input.length !== expected.length) return Number.POSITIVE_INFINITY;
  const costs = expected.map(wanted => input.map(entered => {
    if (wanted === entered) return 0;
    if (protect && protectedWord(wanted) !== protectedWord(entered)) return Number.POSITIVE_INFINITY;
    const distance = editDistance(entered, wanted);
    // Short names carry too little information for loose matching. Longer
    // anatomical words can absorb two errors, within the whole-answer budget.
    const allowance = Math.min(entered.length, wanted.length) < 4 ? 0 : wanted.length < 8 ? 1 : 2;
    return distance <= (protect ? Math.min(limit, allowance) : limit) ? distance : Number.POSITIVE_INFINITY;
  }));
  // Match words independently of order, trying the most constrained words first.
  costs.sort((a, b) => a.filter(Number.isFinite).length - b.filter(Number.isFinite).length);
  const memo = new Map<string, number>();
  function visit(row: number, used: number): number {
    if (row === costs.length) return 0;
    const key = `${row}:${used}`;
    const saved = memo.get(key);
    if (saved !== undefined) return saved;
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < input.length; index++) {
      if (used & (1 << index) || !Number.isFinite(costs[row][index])) continue;
      const total = costs[row][index] + visit(row + 1, used | (1 << index));
      if (total <= limit) best = Math.min(best, total);
    }
    memo.set(key, best);
    return best;
  }
  return visit(0, 0);
}

/**
 * Check a complete anatomical name without offering suggestions. Side, named
 * head/part, level and other identifying qualifiers remain required. Pass all
 * collection labels so a typo cannot receive credit for another valid answer.
 */
export function matchTypedAnswer(input: string, expected: string, alternatives: readonly string[] = []): TypedAnswerMatch {
  if (input.length > 200) return rejected;
  const entered = words(input);
  const wanted = words(expected);
  if (!entered.length || !wanted.length || entered.length > 20 || wanted.length > 20) return rejected;
  if (equivalent(entered, wanted)) return { correct: true, typoAccepted: false };
  const length = wanted.join('').length;
  const allowance = length < 8 ? 1 : length < 24 ? 2 : 3;
  const distance = tokenDistance(entered, wanted, allowance, true);
  if (!Number.isFinite(distance)) return rejected;

  for (const alternative of alternatives) {
    const other = words(alternative);
    if (equivalent(other, wanted)) continue;
    if (equivalent(entered, other) || tokenDistance(entered, other, distance, false) <= distance) return rejected;
  }
  return { correct: true, typoAccepted: distance > 0 };
}
