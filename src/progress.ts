import { modelPromptPools, type ModelCollection } from './modelQuiz';
import { coverModelPrompt, getModelPass, restartModelPass, normalizeModelPasses, isModelPassScope, type ModelPasses } from './modelPass';
import { emptyState, readState, recordAttempt, writeState, type Attempt, type SavedNote, type StudyState } from './study';

const collections: ModelCollection[] = ['muscles', 'skeleton', 'landmarks'];
const promptCollections = new Map(collections.flatMap(collection => modelPromptPools[collection].map(prompt => [prompt.id, collection] as const)));
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const safeQuestionId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 250 && !['__proto__', 'constructor', 'prototype'].includes(value);
const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const validRound = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const isCollection = (value: unknown): value is ModelCollection => collections.includes(value as ModelCollection);
const categoryFor = (questionId: string, fallback: string) => {
  const collection = promptCollections.get(questionId);
  return collection === 'skeleton' ? 'bones' : collection ?? fallback;
};
export type ProgressEvent = {
  id: string;
  kind: 'attempt' | 'restart' | 'import';
  occurred_at: number;
  payload: Record<string, unknown>;
};
export type ProgressStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';
export type ProgressSnapshot = {
  study: StudyState; ready: boolean; saved: boolean; status: ProgressStatus;
  error: string | null; pending: number; canImport: boolean;
};

/** Validate cached/imported data before it can influence a quiz or account. */
export function normalizeStudy(value: unknown): StudyState {
  if (!isRecord(value)) return structuredClone(emptyState);
  const attempts: Attempt[] = Array.isArray(value.attempts) ? value.attempts.flatMap(item => {
    if (!isRecord(item) || !safeQuestionId(item.questionId) || typeof item.correct !== 'boolean' || !validTime(item.at)) return [];
    return [{ questionId: item.questionId, correct: item.correct, category: categoryFor(item.questionId, typeof item.category === 'string' ? item.category : 'bones'), at: item.at }];
  }) : [];
  const notes: SavedNote[] = Array.isArray(value.notes) ? value.notes.flatMap(item => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.body !== 'string') return [];
    return [{ id: item.id, title: item.title, body: item.body, created: validTime(item.created) ? item.created : 0 }];
  }) : [];
  const strings = (items: unknown) => Array.isArray(items) ? [...new Set(items.filter((item): item is string => typeof item === 'string'))] : [];
  let modelPasses: ModelPasses = {};
  if (isRecord(value.modelPasses)) {
    modelPasses = normalizeModelPasses(value.modelPasses);
  } else if (!Object.hasOwn(value, 'modelPasses')) {
    for (const collection of collections) {
      const pass = getModelPass({ [collection]: { round: 1, coveredIds: attempts.map(attempt => attempt.questionId) } }, collection);
      if (pass.coveredIds.length) modelPasses[collection] = pass;
    }
  }
  const review: StudyState['review'] = {};
  if (isRecord(value.review)) for (const [id, item] of Object.entries(value.review)) {
    if (safeQuestionId(id) && isRecord(item) && validTime(item.due) && typeof item.interval === 'number' && Number.isFinite(item.interval) && item.interval >= 0 && validTime(item.streak)) {
      review[id] = { due: item.due, interval: item.interval, streak: item.streak };
    }
  }
  return { attempts, notes, studied: strings(value.studied), checklist: strings(value.checklist), modelPasses, review };
}

export function parseProgressEvent(value: unknown): ProgressEvent | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(value.id) || !validTime(value.occurred_at) || !isRecord(value.payload)) return null;
  const payload = value.payload;
  if (value.kind === 'attempt') {
    if (!safeQuestionId(payload.questionId) || !isCollection(payload.collection) || typeof payload.correct !== 'boolean' || !validTime(payload.at) || !(payload.round === null || validRound(payload.round))) return null;
    if (payload.scope !== undefined && !isModelPassScope(payload.scope, payload.collection)) return null;
    return { id: value.id, kind: 'attempt', occurred_at: value.occurred_at, payload: { questionId: payload.questionId, collection: payload.collection, correct: payload.correct, at: payload.at, round: payload.round, ...(payload.scope !== undefined && payload.scope !== payload.collection ? { scope: payload.scope } : {}) } };
  }
  if (value.kind === 'restart' && isCollection(payload.collection) && validRound(payload.round)) {
    if (payload.scope !== undefined && !isModelPassScope(payload.scope, payload.collection)) return null;
    return { id: value.id, kind: 'restart', occurred_at: value.occurred_at, payload: { collection: payload.collection, round: payload.round, ...(payload.scope !== undefined && payload.scope !== payload.collection ? { scope: payload.scope } : {}) } };
  }
  if (value.kind === 'import' && isRecord(payload.state)) {
    return { id: value.id, kind: 'import', occurred_at: value.occurred_at, payload: { state: normalizeStudy(payload.state) } };
  }
  return null;
}

export function mergeEvents(...groups: readonly ProgressEvent[][]): ProgressEvent[] {
  const events = new Map<string, ProgressEvent>();
  for (const group of groups) for (const event of group) {
    const valid = parseProgressEvent(event);
    if (valid && !events.has(valid.id)) events.set(valid.id, valid);
  }
  return [...events.values()].sort((a, b) => a.occurred_at - b.occurred_at || compareIds(a.id, b.id));
}

/** Rebuild from immutable events: retries cannot duplicate answers or erase another device's pass. */
export function replayProgress(events: ProgressEvent[]): StudyState {
  const ordered = mergeEvents(events);
  const attempts = new Map<string, Attempt>();
  const notes = new Map<string, SavedNote>();
  const studied = new Set<string>();
  const checklist = new Set<string>();
  const modelPasses: ModelPasses = {};
  const legacyReview: StudyState['review'] = {};
  function mergePass(collection: ModelCollection, round: number, coveredIds: string[], scope?: string) {
    const key = scope ?? collection;
    if (!isModelPassScope(key, collection)) return;
    const current = getModelPass(modelPasses, collection, key);
    if (round < current.round) return;
    modelPasses[key] = getModelPass({ [key]: { round, coveredIds: round === current.round ? [...current.coveredIds, ...coveredIds] : coveredIds } }, collection, key);
  }
  for (const event of ordered) {
    const payload = event.payload;
    if (event.kind === 'attempt') {
      const questionId = payload.questionId as string;
      attempts.set(`event:${event.id}`, { questionId, correct: payload.correct as boolean, category: categoryFor(questionId, payload.collection as string), at: payload.at as number });
      if (payload.round !== null) mergePass(payload.collection as ModelCollection, payload.round as number, [questionId], payload.scope as string | undefined);
    } else if (event.kind === 'restart') {
      mergePass(payload.collection as ModelCollection, payload.round as number, [], payload.scope as string | undefined);
    } else {
      const imported = normalizeStudy(payload.state);
      const occurrences = new Map<string, number>();
      for (const attempt of imported.attempts) {
        const signature = JSON.stringify([attempt.questionId, attempt.correct, attempt.category, attempt.at]);
        const occurrence = occurrences.get(signature) ?? 0;
        occurrences.set(signature, occurrence + 1);
        attempts.set(`legacy:${signature}:${occurrence}`, attempt);
      }
      for (const note of imported.notes) notes.set(note.id, note);
      for (const id of imported.studied) studied.add(id);
      for (const id of imported.checklist ?? []) checklist.add(id);
      for (const [scope, pass] of Object.entries(normalizeModelPasses(imported.modelPasses))) {
        if (!pass) continue;
        const collection = scope.split('::')[0] as ModelCollection;
        mergePass(collection, pass.round, pass.coveredIds, scope);
      }
      Object.assign(legacyReview, imported.review);
    }
  }
  const sortedAttempts = [...attempts.entries()].sort(([idA, a], [idB, b]) => a.at - b.at || compareIds(idA, idB)).map(([, attempt]) => attempt);
  let computed = { ...structuredClone(emptyState), review: legacyReview };
  // Attempts are the source of truth for scheduling. Keep legacy review-only items too.
  for (const attempt of sortedAttempts) delete computed.review[attempt.questionId];
  for (const attempt of sortedAttempts) computed = recordAttempt({ ...computed, attempts: [] }, attempt.questionId, attempt.category, attempt.correct, attempt.at);
  return { attempts: sortedAttempts, notes: [...notes.values()], studied: [...studied], checklist: [...checklist], modelPasses, review: computed.review };
}

export interface ProgressStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface ProgressRemote {
  load(userId: string): Promise<unknown[]>;
  insert(userId: string, events: ProgressEvent[]): Promise<void>;
}
const storageKey = (userId: string) => `anatome-account-v1:${userId}`;
const journalPrefix = (userId: string) => `anatome-account-event-v1:${userId}:`;
const journalKey = (userId: string, eventId: string) => `${journalPrefix(userId)}${eventId}`;
const newId = () => globalThis.crypto.randomUUID();
const hasStudy = (study: StudyState) => study.attempts.length > 0 || study.notes.length > 0 || study.studied.length > 0 || !!study.checklist?.length || Object.values(normalizeModelPasses(study.modelPasses)).some(pass => !!pass?.coveredIds.length);
function browserStorage(): ProgressStorage | null { try { return globalThis.localStorage; } catch { return null; } }
function readCache(storage: ProgressStorage | null, userId: string): { events: ProgressEvent[]; pending: Set<string> } {
  let cached: ProgressEvent[] = [];
  const pending = new Set<string>();
  try {
    const value: unknown = JSON.parse(storage?.getItem(storageKey(userId)) ?? 'null');
    if (isRecord(value) && Array.isArray(value.events)) {
      cached = mergeEvents(value.events.flatMap(item => { const parsed = parseProgressEvent(item); return parsed ? [parsed] : []; }));
      // Migrate the earlier snapshot outbox once. New snapshots rely on the
      // separate journal, so a stale pending list cannot resurrect acknowledgements.
      if (value.journalVersion !== 1 && Array.isArray(value.pending)) {
        const previousPending = new Set(value.pending);
        for (const event of cached) if (previousPending.has(event.id)) {
          pending.add(event.id);
          try { storage?.setItem(journalKey(userId, event.id), JSON.stringify(event)); } catch { /* Retain in memory and report storage failure. */ }
        }
      }
    }
  } catch { /* The append journal can recover even a corrupt/clobbered snapshot. */ }
  const journal: ProgressEvent[] = [];
  if (storage) try {
    const prefix = journalPrefix(userId);
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
    for (const key of keys) if (key?.startsWith(prefix)) {
      try {
        const event = parseProgressEvent(JSON.parse(storage.getItem(key) ?? 'null'));
        if (event && key === journalKey(userId, event.id)) { journal.push(event); pending.add(event.id); }
      } catch { /* An invalid journal entry cannot affect progress. */ }
    }
  } catch { /* Unavailable storage will be reflected when saving a new answer. */ }
  return { events: mergeEvents(cached, journal), pending };
}
function timed<T>(promise: Promise<T>, milliseconds = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connection timed out.')), milliseconds);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

/** Account-scoped durable outbox. An old account's response can never update a new account's state. */
export class ProgressStore {
  private events: ProgressEvent[] = [];
  private pendingIds = new Set<string>();
  private listeners = new Set<() => void>();
  private stopped = false;
  private syncing = false;
  private repeatSync = false;
  private repeatRefresh = false;
  private repeatForce = false;
  private lastPull = 0;
  private durable = true;
  private remoteConfirmed = false;
  private importId: string;
  private snapshot: ProgressSnapshot;
  constructor(
    readonly userId: string | null,
    private remote: ProgressRemote | null,
    readonly authReady = true,
    private storage: ProgressStorage | null = browserStorage(),
    private guestRead: () => StudyState = readState,
    private guestWrite: (state: StudyState) => boolean = writeState,
    private id: () => string = newId,
  ) {
    if (userId) {
      const cache = readCache(storage, userId);
      this.events = cache.events;
      this.pendingIds = cache.pending;
    }
    let device: string | null = null;
    try {
      device = storage?.getItem('anatome-import-device-v1') ?? null;
      if (!device || !/^[a-zA-Z0-9_-]{1,100}$/.test(device)) {
        device = this.id();
        storage?.setItem('anatome-import-device-v1', device);
      }
    } catch { /* An in-memory import remains explicit and replay deduplicates legacy answers. */ }
    this.importId = `import-${device ?? this.id()}`;
    if (userId) this.persist();
    this.snapshot = {
      study: userId ? replayProgress(this.events) : normalizeStudy(this.guestRead()),
      ready: authReady && !userId, saved: !userId || this.durable,
      status: authReady && !userId ? 'local' : 'loading', error: null,
      pending: this.pendingIds.size, canImport: false,
    };
    this.snapshot.canImport = this.canImport();
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private canImport() { return !!this.userId && !this.events.some(event => event.id === this.importId) && hasStudy(normalizeStudy(this.guestRead())); }
  private emit(patch: Partial<ProgressSnapshot> = {}) {
    this.snapshot = { ...this.snapshot, ...patch, pending: this.pendingIds.size, canImport: this.canImport() };
    for (const listener of this.listeners) listener();
  }
  private persist() {
    if (!this.userId) return;
    let cached = false;
    try {
      if (!this.storage) throw new Error('No browser storage');
      this.storage.setItem(storageKey(this.userId), JSON.stringify({ journalVersion: 1, events: this.events }));
      cached = true;
    } catch { /* Pending events remain safe if their separate journal writes succeeded. */ }
    try {
      this.durable = this.pendingIds.size > 0
        ? !!this.storage && [...this.pendingIds].every(id => this.storage!.getItem(journalKey(this.userId!, id)) !== null)
        : cached;
    } catch { this.durable = false; }
  }
  /** Merge other tabs' outboxes before writing; never replace a pending local answer. */
  refreshCache = () => {
    if (!this.userId || this.stopped) return;
    const cache = readCache(this.storage, this.userId);
    this.events = mergeEvents(this.events, cache.events);
    for (const id of cache.pending) this.pendingIds.add(id);
    this.emit({ study: replayProgress(this.events) });
  };
  private append(event: ProgressEvent) {
    if (!this.snapshot.ready || this.stopped || !this.userId) return;
    this.refreshCache();
    this.events = mergeEvents(this.events, [event]);
    this.pendingIds.add(event.id);
    // One atomic key per event prevents tab A's stale snapshot from erasing tab
    // B's offline answer. Do this before describing an answer as saved.
    try { this.storage?.setItem(journalKey(this.userId, event.id), JSON.stringify(event)); } catch { /* persist checks durability below. */ }
    this.persist();
    this.emit({ study: replayProgress(this.events), saved: this.durable, status: 'syncing', error: this.durable ? null : 'Browser storage is unavailable. Keep this tab open until your progress is synced.' });
    // An import's shared browser ID may already have been accepted by another
    // tab. Refresh its canonical payload once; ordinary answers only upload.
    void this.sync(event.kind === 'import', event.kind === 'import');
  }
  recordAnswer = (questionId: string, collection: ModelCollection, correct: boolean, coverPass: boolean, scope?: string) => {
    if (!this.snapshot.ready || this.stopped || scope !== undefined && !isModelPassScope(scope, collection)) return;
    const now = Date.now();
    if (this.userId) {
      this.append({ id: this.id(), kind: 'attempt', occurred_at: now, payload: { questionId, collection, correct, at: now, round: coverPass ? getModelPass(this.snapshot.study.modelPasses, collection, scope).round : null, ...(scope !== undefined && scope !== collection ? { scope } : {}) } });
    } else {
      const next = recordAttempt(this.snapshot.study, questionId, collection === 'skeleton' ? 'bones' : collection, correct, now);
      if (coverPass) next.modelPasses = coverModelPrompt(this.snapshot.study.modelPasses, collection, questionId, scope);
      const saved = this.guestWrite(next);
      this.emit({ study: next, saved, error: saved ? null : 'Browser storage is unavailable. Your progress is only in this tab.' });
    }
  };
  restartPass = (collection: ModelCollection, scope?: string) => {
    if (!this.snapshot.ready || this.stopped || scope !== undefined && !isModelPassScope(scope, collection)) return;
    if (this.userId) this.append({ id: this.id(), kind: 'restart', occurred_at: Date.now(), payload: { collection, round: getModelPass(this.snapshot.study.modelPasses, collection, scope).round + 1, ...(scope !== undefined && scope !== collection ? { scope } : {}) } });
    else {
      const next = { ...this.snapshot.study, modelPasses: restartModelPass(this.snapshot.study.modelPasses, collection, scope) };
      const saved = this.guestWrite(next);
      this.emit({ study: next, saved, error: saved ? null : 'Browser storage is unavailable. Your progress is only in this tab.' });
    }
  };
  importGuest = () => {
    if (this.canImport()) this.append({ id: this.importId, kind: 'import', occurred_at: Date.now(), payload: { state: normalizeStudy(this.guestRead()) } });
  };
  start = () => { this.stopped = false; if (this.userId && this.authReady) void this.sync(true, true); };
  stop = () => { this.stopped = true; };
  retry = () => { void this.sync(true, true); };
  /** Focus/online refreshes are throttled. Explicit Retry always refreshes. */
  refresh = () => { void this.sync(true); };
  flush = () => { void this.sync(); };
  sync = async (refresh = false, force = false): Promise<void> => {
    if (this.stopped || !this.userId || !this.authReady || !this.remote) return;
    if (this.syncing) {
      this.repeatSync = true;
      this.repeatRefresh ||= refresh;
      this.repeatForce ||= force;
      return;
    }
    this.syncing = true;
    this.refreshCache();
    const pull = refresh && (force || Date.now() - this.lastPull >= 60000);
    if (!this.pendingIds.size && !pull) { this.syncing = false; return; }
    this.emit({ status: 'syncing', error: null });
    try {
      // Only remove IDs acknowledged by this request. Answers added during it remain queued.
      const queued = this.events.filter(event => this.pendingIds.has(event.id));
      for (let offset = 0; offset < queued.length; offset += 100) {
        const batch = queued.slice(offset, offset + 100);
        await timed(this.remote.insert(this.userId, batch));
        if (this.stopped) return;
        for (const event of batch) {
          this.pendingIds.delete(event.id);
          // Removing a journal entry is safe only after the server acknowledged
          // its immutable ID. Failed removal merely causes an idempotent retry.
          try { this.storage?.removeItem(journalKey(this.userId, event.id)); } catch { /* Retry safely on a future load. */ }
        }
        this.remoteConfirmed = true;
        this.persist();
      }
      if (pull) {
        this.lastPull = Date.now();
        const rows = await timed(this.remote.load(this.userId));
        if (this.stopped) return;
        // A duplicate import ID may have been accepted from another tab first.
        // The immutable server version wins over a conflicting cached payload.
        this.events = mergeEvents(rows.flatMap(row => { const event = parseProgressEvent(row); return event ? [event] : []; }), this.events);
        this.remoteConfirmed = true;
      }
      this.persist();
      this.emit({ study: replayProgress(this.events), ready: true, saved: this.durable || (this.remoteConfirmed && this.pendingIds.size === 0), status: this.pendingIds.size ? 'syncing' : 'synced', error: this.durable ? null : 'Browser storage is unavailable. Cloud progress is synced, but offline saving is unavailable.' });
    } catch (error) {
      if (this.stopped) return;
      const details = isRecord(error) ? `${error.code ?? ''} ${error.message ?? ''}` : String(error);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const message = /42P01|PGRST205|schema cache|does not exist/.test(details)
        ? 'Cloud progress needs setup. You can keep practicing on this device.'
        : /JWT|401|session|expired/.test(details)
          ? 'Sign in again to sync your progress.'
          : offline ? 'You’re offline. Progress will sync when you reconnect.' : 'Couldn’t sync progress. Retry when your connection is available.';
      this.emit({ ready: true, saved: this.durable || (this.remoteConfirmed && this.pendingIds.size === 0), status: offline ? 'offline' : 'error', error: this.durable ? message : `${message} Keep this tab open; browser storage is unavailable.` });
    } finally {
      this.syncing = false;
      if (this.repeatSync && !this.stopped) {
        const refreshAgain = this.repeatRefresh;
        const forceAgain = this.repeatForce;
        this.repeatSync = this.repeatRefresh = this.repeatForce = false;
        void this.sync(refreshAgain, forceAgain);
      }
    }
  };
}
