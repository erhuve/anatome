import { modelPromptPools, type ModelCollection } from './modelQuiz';
import { studyCatalog, type CatalogItem } from './studyCatalog';
import { studySections, type StudySection } from './studySections';

const catalogItems = new Map(studyCatalog.flatMap(group => group.entries).map(item => [item.id, item]));
const promptSections = new Map(studySections.flatMap(section => section.promptIds.map(id => [id, section] as const)));

/** Course practice includes only the mounted 3D quiz collections. */
export function courseSectionsFor(moduleId: string): StudySection[] {
  if (moduleId === 'bones') return studySections.filter(section => section.collection === 'skeleton' || section.collection === 'landmarks');
  if (moduleId === 'muscles') return studySections.filter(section => section.collection === 'muscles');
  return [];
}

/** Resolve assessed targets, never the bones supplied only as landmark context. */
export function catalogPromptIdsFor(itemOrId: CatalogItem | string): string[] {
  const item = typeof itemOrId === 'string' ? catalogItems.get(itemOrId) : itemOrId;
  if (!item || item.domain === 'tissues') return [];
  const collection = item.domain === 'muscles' ? 'muscles' : 'skeleton';
  const modelIds = new Set(item.modelPartIds);
  const landmarkIds = new Set(item.landmarkIds);
  return [
    ...modelPromptPools[collection].filter(prompt => prompt.partId && modelIds.has(prompt.partId)),
    ...modelPromptPools.landmarks.filter(prompt => prompt.landmark && landmarkIds.has(prompt.landmark)),
  ].map(prompt => prompt.id);
}

/** A section link can contain more targets than the individual checklist row. */
export function sectionsForCatalogItem(itemOrId: CatalogItem | string): StudySection[] {
  const ids = new Set(catalogPromptIdsFor(itemOrId));
  return studySections.filter(section => section.promptIds.some(id => ids.has(id)));
}

export function sectionForModelPrompt(promptId: string): StudySection | undefined {
  return promptSections.get(promptId);
}

/** Exact source-part identity is scoped to its collection; an unknown part has no quiz link. */
export function sectionsForModelPart(collection: ModelCollection, partId: string): StudySection[] {
  const ids = new Set(modelPromptPools[collection].filter(prompt => prompt.partId === partId).map(prompt => prompt.id));
  return studySections.filter(section => section.promptIds.some(id => ids.has(id)));
}
