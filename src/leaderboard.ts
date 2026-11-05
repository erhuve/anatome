export type LeaderboardEntry = { rank: number; nickname: string; score: number; is_you: boolean };
export type LeaderboardProfile = { nickname: string; listed: boolean };
export type LeaderboardSnapshot = {
  entries: LeaderboardEntry[]; self: LeaderboardEntry | null; participants: number; total_questions: number;
};
export type LeaderboardState = {
  snapshot: LeaderboardSnapshot | null; profile: LeaderboardProfile | null;
  status: 'loading' | 'ready' | 'error' | 'unavailable'; working: boolean;
  error: string | null; updatedAt: number | null;
};
export interface LeaderboardRemote {
  load(): Promise<unknown>;
  profile(): Promise<unknown>;
  save(nickname: string, listed: boolean): Promise<unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;

export function nicknameError(value: string): string | null {
  const name = value.trim();
  return /^[A-Za-z0-9 _-]{3,24}$/.test(name) && /[A-Za-z0-9]/.test(name)
    ? null : 'Use 3–24 letters, numbers, spaces, underscores or hyphens, including a letter or number.';
}

export function parseLeaderboardProfile(value: unknown): LeaderboardProfile | null {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.nickname !== 'string' || nicknameError(value.nickname) || typeof value.listed !== 'boolean') throw new Error('Invalid leaderboard profile');
  return { nickname: value.nickname, listed: value.listed };
}

export function parseLeaderboard(value: unknown): LeaderboardSnapshot {
  if (!isRecord(value) || !integer(value.participants) || !integer(value.total_questions, 1) || !Array.isArray(value.entries) || value.entries.length > 50 || value.entries.length > value.participants) throw new Error('Invalid leaderboard');
  const { participants, total_questions } = value;
  const entry = (row: unknown): LeaderboardEntry => {
    if (!isRecord(row) || !integer(row.rank, 1) || row.rank > participants || typeof row.nickname !== 'string' || nicknameError(row.nickname) || !integer(row.score) || row.score > total_questions || typeof row.is_you !== 'boolean') throw new Error('Invalid leaderboard entry');
    return { rank: row.rank, nickname: row.nickname, score: row.score, is_you: row.is_you };
  };
  const entries = value.entries.map(entry);
  const self = value.self === null ? null : entry(value.self);
  if (self && !self.is_you) throw new Error('Invalid own rank');
  return { entries, self, participants, total_questions };
}

function errorMessage(error: unknown, saving = false): { unavailable: boolean; message: string } {
  const code = isRecord(error) ? error.code : undefined;
  if (code === 'PGRST202' || code === '42883' || code === '42P01') return { unavailable: true, message: 'The global leaderboard is not available yet. Your practice progress is still saved separately.' };
  if (code === '23505') return { unavailable: false, message: 'That nickname is taken. Try another one.' };
  if (code === '22023' || code === '23514') return { unavailable: false, message: 'Choose a nickname with 3–24 letters, numbers, spaces, underscores or hyphens.' };
  return { unavailable: false, message: saving
    ? 'Could not confirm your leaderboard change. Check your connection and refresh before trying again.'
    : 'Could not refresh the leaderboard. Check your connection and try again.' };
}

/** Page-scoped reads, with no polling or realtime subscription. Private state
 * belongs to one auth identity; a stopped instance ignores late responses. */
export class LeaderboardStore {
  private state: LeaderboardState;
  private listeners = new Set<() => void>();
  private stopped = false;
  private generation = 0;
  private reading = false;
  constructor(private remote: LeaderboardRemote | null, private signedIn: boolean, private authReady = true) {
    this.state = { snapshot: null, profile: null, status: remote ? 'loading' : 'unavailable', working: false, error: null, updatedAt: null };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<LeaderboardState>) {
    if (this.stopped) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  start = () => { this.stopped = false; void this.refresh(); };
  stop = () => { this.stopped = true; this.generation += 1; this.reading = false; };
  refresh = async () => {
    if (!this.remote || !this.authReady || this.stopped || this.reading || this.state.working) return;
    const generation = ++this.generation;
    this.reading = true;
    this.emit({ status: 'loading', error: null });
    try {
      const [board, profile] = await Promise.all([this.remote.load(), this.signedIn ? this.remote.profile() : Promise.resolve(null)]);
      if (this.stopped || generation !== this.generation) return;
      const snapshot = parseLeaderboard(board);
      const ownProfile = parseLeaderboardProfile(profile);
      // A guest response must never retain account-specific fields.
      if (!this.signedIn) { snapshot.self = null; snapshot.entries = snapshot.entries.map(row => ({ ...row, is_you: false })); }
      this.emit({ snapshot, profile: ownProfile, status: 'ready', error: null, updatedAt: Date.now() });
    } catch (error) {
      if (this.stopped || generation !== this.generation) return;
      const failure = errorMessage(error);
      this.emit({ status: failure.unavailable ? 'unavailable' : 'error', error: failure.message });
    } finally {
      if (generation === this.generation) this.reading = false;
    }
  };
  saveProfile = async (nickname: string, listed: boolean): Promise<boolean> => {
    if (!this.remote || !this.signedIn || !this.authReady || this.stopped || this.state.working) return false;
    const validation = nicknameError(nickname);
    if (validation) { this.emit({ error: validation }); return false; }
    const generation = ++this.generation;
    this.reading = false;
    this.emit({ working: true, error: null });
    try {
      const profile = parseLeaderboardProfile(await this.remote.save(nickname.trim(), listed));
      if (this.stopped || generation !== this.generation) return false;
      if (!profile || profile.listed !== listed) throw new Error('Profile was not confirmed');
      // Discard the old ranking after a confirmed rename/leave, even if its
      // refresh fails, so the UI never presents an old listing as current.
      this.emit({ profile, snapshot: null, updatedAt: null, working: false });
      await this.refresh();
      return !this.stopped;
    } catch (error) {
      if (this.stopped || generation !== this.generation) return false;
      const failure = errorMessage(error, true);
      this.emit({ working: false, error: failure.message, status: failure.unavailable ? 'unavailable' : this.state.snapshot ? 'ready' : 'error' });
      return false;
    }
  };
}
