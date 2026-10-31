import { modelPromptPools, type ModelCollection } from './modelQuiz';

export type ModelPass = { round: number; coveredIds: string[] };
export type ModelScope = ModelCollection | `${ModelCollection}::${string}`;
export type ModelPasses = Partial<Record<ModelScope, ModelPass>>;
const scopePattern = /^(muscles|skeleton|landmarks)(?:::[a-f0-9]{16})?$/;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
export function isModelPassScope(value: unknown, collection?: ModelCollection): value is ModelScope {
  return typeof value === 'string' && scopePattern.test(value) && (collection === undefined || value.split('::')[0] === collection);
}
function collectionOf(scope: ModelScope): ModelCollection { return scope.split('::')[0] as ModelCollection; }
function promptIds(collection: ModelCollection): Set<string> { return new Set(modelPromptPools[collection].map(prompt => prompt.id)); }
function normalizePass(value: unknown, collection: ModelCollection): ModelPass {
  if (!isRecord(value)) return { round: 1, coveredIds: [] };
  const round = typeof value.round === 'number' && Number.isSafeInteger(value.round) && value.round > 0 ? value.round : 1;
  const available = promptIds(collection);
  const coveredIds = Array.isArray(value.coveredIds) ? [...new Set(value.coveredIds.filter((id): id is string => typeof id === 'string' && available.has(id)))] : [];
  return { round, coveredIds };
}
/** Preserve valid base and custom passes, reconciling all coverage against the current source pool. */
export function normalizeModelPasses(value: unknown): ModelPasses {
  const result: ModelPasses = {};
  if (!isRecord(value)) return result;
  for (const [key, pass] of Object.entries(value)) if (isModelPassScope(key)) result[key] = normalizePass(pass, collectionOf(key));
  return result;
}
/** Non-security namespace fingerprint: selection order and duplicate IDs do not change its identity. */
export function modelScopeKey(collection: ModelCollection, selectedIds?: readonly string[] | null): ModelScope {
  if (selectedIds === undefined || selectedIds === null) return collection;
  const encoded = new TextEncoder().encode(JSON.stringify([...new Set(selectedIds)].sort()));
  let hash = 0xcbf29ce484222325n;
  for (const byte of encoded) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return `${collection}::${hash.toString(16).padStart(16, '0')}`;
}
export function getModelPass(passes: ModelPasses | undefined, collection: ModelCollection, scope?: string): ModelPass {
  const key = scope ?? collection;
  if (!isModelPassScope(key, collection)) return { round: 1, coveredIds: [] };
  return normalizePass(isRecord(passes) && Object.hasOwn(passes, key) ? passes[key] : undefined, collection);
}
function savedPasses(passes: ModelPasses | undefined): ModelPasses {
  if (!isRecord(passes)) return {};
  return Object.fromEntries(Object.entries(passes).filter(([key]) => isModelPassScope(key))) as ModelPasses;
}
export function coverModelPrompt(passes: ModelPasses | undefined, collection: ModelCollection, id: string, scope?: string): ModelPasses {
  const key = scope ?? collection;
  const saved = savedPasses(passes);
  if (!isModelPassScope(key, collection)) return saved;
  const current = getModelPass(saved, collection, key);
  if (promptIds(collection).has(id) && !current.coveredIds.includes(id)) current.coveredIds.push(id);
  return { ...saved, [key]: current };
}
export function restartModelPass(passes: ModelPasses | undefined, collection: ModelCollection, scope?: string): ModelPasses {
  const key = scope ?? collection;
  const saved = savedPasses(passes);
  if (!isModelPassScope(key, collection)) return saved;
  return { ...saved, [key]: { round: getModelPass(saved, collection, key).round + 1, coveredIds: [] } };
}
export function remainingModelCount(passes: ModelPasses | undefined, collection: ModelCollection, allowedIds?: readonly string[], scope?: string): number {
  const available = promptIds(collection);
  const selected = allowedIds === undefined ? available : new Set(allowedIds.filter(id => available.has(id)));
  const covered = new Set(getModelPass(passes, collection, scope).coveredIds);
  return [...selected].filter(id => !covered.has(id)).length;
}
