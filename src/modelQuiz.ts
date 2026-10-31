import { bones, preferredLandmarkView, type BoneId, type View } from './content';
import { labInventory } from './labInventory';
import { systemParts, type SystemPart } from './systemData';

export type ModelCollection = 'muscles' | 'skeleton' | 'landmarks';
export const quizRegions = [
  { id: 'head-neck', label: 'Head & neck' },
  { id: 'chest', label: 'Chest' },
  { id: 'trunk', label: 'Trunk & back' },
  { id: 'shoulder-arm', label: 'Shoulder & arm' },
  { id: 'forearm-hand', label: 'Forearm & hand' },
  { id: 'pelvis-thigh', label: 'Pelvis & thigh' },
  { id: 'leg-foot', label: 'Leg & foot' },
  { id: 'spine', label: 'Vertebral column' },
  { id: 'other', label: 'Other / unclassified' },
] as const;
export type QuizRegionId = typeof quizRegions[number]['id'];
export type ModelPresentation = 'focus' | 'context' | 'isolate';
export type ModelPartDescription = {
  region: QuizRegionId;
  group: string;
  side?: 'left' | 'right' | 'midline';
  presentation: ModelPresentation;
  view: View;
};
export type ModelPrompt = {
  id: string;
  collection: ModelCollection;
  prompt: string;
  /** Exactly one of options; use the label rather than its shuffled position. */
  answer: string;
  options: string[];
  partId?: string;
  bone?: BoneId;
  landmark?: string;
  view: View;
  explanation: string;
  source: string;
  region?: QuizRegionId;
  group?: string;
  side?: 'left' | 'right' | 'midline';
  presentation?: ModelPresentation;
  hiddenContextIds?: string[];
};
type Target = ModelPartDescription & { part: SystemPart; family: string };
const chapter = (section: string) => `https://openstax.org/books/anatomy-and-physiology-2e/pages/${section}`;

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const value = random();
    const bounded = Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
    const j = Math.floor(bounded * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function namedSide(name: string): 'left' | 'right' | undefined { return /\bright\b/i.test(name) ? 'right' : /\bleft\b/i.test(name) ? 'left' : undefined; }
function sideView(name: string): View { return namedSide(name) === 'left' ? 'medial' : 'lateral'; }
function canonical(name: string) { return name.toLowerCase().replace(/\b(right|left)\s+/g, '').replace(/\s+muscle$/, '').trim(); }
function familyName(name: string) { return canonical(name).replace(/^(?:\w+ part of |\w+ head of |\w+ belly of )/, ''); }
function title(name: string) { return name.charAt(0).toUpperCase() + name.slice(1); }

/** Source-name classification; an ambiguous name stays explicitly unclassified. */
export function describeModelPart(part: SystemPart, collection: 'muscles' | 'skeleton'): ModelPartDescription {
  const name = part.name.toLowerCase();
  const family = familyName(name);
  const side = namedSide(name);
  if (collection === 'muscles') {
    let region: QuizRegionId = 'other';
    if (/sternocleidomastoid|platysma|scalen|splenius|capitis|colli|cervicis|hyoid|sternothyroid|gloss|tongue|pharyng|palat|palpebr|laryng|crico|arytenoid|masseter|temporalis|temporoparietalis|pterygoid|orbicular|buccinat|zygomatic|nasalis|nasolabialis|septi nasi|supercilii|procerus|mentalis|risorius|frontalis|occipitalis|auricular|labii|anguli oris|digastric|(?:superior|inferior|medial|lateral) rectus|(?:superior|inferior) oblique/.test(name)) region = 'head-neck';
    else if (/foot|toe|plantar interosse/.test(name)) region = 'leg-foot';
    else if (/pectoralis|serratus anterior|intercostal|subcostal|costarum|transversus thoracis|triangularis sterni/.test(name)) region = 'chest';
    else if (/subclavius|deltoid|trapezius|supraspinat|infraspinat|subscapular|teres (major|minor)|coracobrachialis|biceps brachii|triceps brachii|\bbrachialis\b|levator scapula|rhomboid/.test(name)) region = 'shoulder-arm';
    else if (/brachioradialis|anconeus|pronator|supinator|carpi|pollicis|flexor digitorum (superficialis|profundus)|extensor digitorum(?! longus| brevis)|extensor indicis|digiti minimi|palmaris|palmar interosse|dorsal interosse.*hand|lumbrical.*hand|opponens|abductor digiti minimi.*hand|adductor pollicis|hand|forearm/.test(name)) region = 'forearm-hand';
    else if (/glute|iliopsoas|iliacus|psoas|piriformis|obturator|gemell|quadratus femoris|sartorius|rectus femoris|vastus|adductor (longus|brevis|magnus|minimus)|gracilis|pectineus|semitendinosus|semimembranosus|biceps femoris|tensor fascia|ischiocavernos|bulbospongios|levator ani|coccygeus|perine|sphincter ani|anal sphincter|pubo-analis|urethr|puborectalis|pubococcygeus|iliococcygeus/.test(name)) region = 'pelvis-thigh';
    else if (/tibialis|fibularis|peroneus|gastrocnemius|soleus|plantaris|popliteus|hallucis|digitorum (longus|brevis)|quadratus plantae|lumbrical.*foot|interosse.*foot|abductor.*little toe|foot|toe/.test(name)) region = 'leg-foot';
    else if (/abdom|oblique|diaphragm|latissimus|erector|iliocostalis|longissimus|spinalis|multifidus|rotatores|interspinal|intertransvers|quadratus lumborum|pyramidalis|serratus posterior/.test(name)) region = 'trunk';
    let view: View = /trapezius|gluteus maximus|semitendinosus|semimembranosus|biceps femoris|triceps brachii|gastrocnemius|soleus|spinal part.*deltoid|infraspinat|teres (major|minor)|rhomboid|latissimus|erector|multifidus|spinalis|longissimus|serratus posterior/.test(name) ? 'posterior' : 'anterior';
    if (/serratus anterior|gluteus medius|gluteus minimus|fibularis|peroneus/.test(name)) view = sideView(name);
    // Keep spatial relationships for ordinary targets; the renderer ghosts
    // neighbors. Isolation is reserved for explicit or known deep layers.
    const isDeepLayer = /medial head of .*triceps|short head of .*biceps femoris|\bbrachialis\b|soleus|semimembranosus|\b(?:deep|profundus|profunda|profundi)\b/.test(name);
    return { region, group: title(family), side, view, presentation: isDeepLayer ? 'isolate' : 'focus' };
  }
  let region: QuizRegionId = 'other';
  let group = title(family);
  if (/vertebr|\batlas\b|\baxis\b|sacrum|coccyx|intervertebral|\bdisk\b|\bdisc\b/.test(name)) {
    region = 'spine';
    group = part.kind === 'disc' ? 'Intervertebral discs' : /cervical|atlas|axis/.test(name) ? 'Cervical vertebrae' : /thoracic/.test(name) ? 'Thoracic vertebrae' : /lumbar/.test(name) ? 'Lumbar vertebrae' : 'Sacrum & coccyx';
  } else if (/rib|sternum|manubrium|xiphoid|costal/.test(name)) { region = 'chest'; group = /rib/.test(name) ? 'Ribs' : /costal/.test(name) ? 'Costal cartilage' : 'Sternum'; }
  else if (/cran|skull|ethmoid|frontal|occipital|parietal|temporal|sphenoid|zygomatic|lacrimal|nasal|vomer|maxilla|mandib|hyoid|malleus|incus|stapes|palatine/.test(name)) { region = 'head-neck'; group = /hyoid/.test(name) ? 'Hyoid' : /malleus|incus|stapes/.test(name) ? 'Ear ossicles' : 'Skull bones'; }
  else if (/clavicle|scapula|humerus/.test(name)) { region = 'shoulder-arm'; group = /humerus/.test(name) ? 'Arm' : 'Pectoral girdle'; }
  else if (/radius|ulna|metacarpal|finger|thumb|carpal|capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetr/.test(name)) { region = 'forearm-hand'; group = /radius|ulna/.test(name) ? 'Forearm' : /metacarpal/.test(name) ? 'Metacarpals' : /phalanx/.test(name) ? 'Hand phalanges' : 'Carpals'; }
  else if (/hip bone|pelvi|ilium|ischium|pubis|femur/.test(name)) { region = 'pelvis-thigh'; group = /femur/.test(name) ? 'Femur' : 'Pelvic girdle'; }
  else if (/patella|tibia|fibula|metatarsal|toe|foot|tarsal|calcaneus|talus|cuboid|cuneiform|navicular/.test(name)) { region = 'leg-foot'; group = /patella|tibia|fibula/.test(name) ? 'Knee & leg' : /metatarsal/.test(name) ? 'Metatarsals' : /phalanx/.test(name) ? 'Foot phalanges' : 'Tarsals'; }
  const view: View = /scapula|occipital|vertebr|atlas|axis|sacrum|coccyx|\bdisk\b|\bdisc\b/.test(name) ? 'posterior' : /parietal|temporal|zygomatic/.test(name) ? sideView(name) : 'anterior';
  const major = /^(?:(?:right|left) )?(?:clavicle|scapula|humerus|radius|ulna|hip bone|femur|tibia|fibula|patella|frontal bone|occipital bone|parietal bone|temporal bone|zygomatic bone|mandible|body of sternum|manubrium|sacrum)$/.test(name);
  const midline = !side && /^(frontal bone|occipital bone|mandible|body of sternum|manubrium|xiphoid process|sacrum|coccyx|hyoid bone|ethmoid|sphenoid bone|vomer|atlas|axis)$/.test(name) ? 'midline' as const : undefined;
  return { region, group, side: side ?? midline, view, presentation: major ? 'focus' : 'context' };
}
function targets(collection: 'muscles' | 'skeleton'): Target[] {
  return systemParts[collection].map(part => ({ part, family: familyName(part.name), ...describeModelPart(part, collection) }));
}
function alternatives(target: Target, all: Target[]): string[] {
  const answer = target.part.name;
  const bare = canonical(answer);
  const rest = all.filter(candidate => {
    if (candidate.part.name === answer) return false;
    const other = canonical(candidate.part.name);
    // A generic disc or whole-muscle parent can be technically true as well as
    // a named level/head. Avoid generic-vs-specific choices in the same question.
    return !(bare.startsWith(`${other} of `) || other.startsWith(`${bare} of `) || target.family === candidate.family && (bare === target.family) !== (other === candidate.family));
  });
  const rank = (candidate: Target) => candidate.family === target.family ? 0 : candidate.group === target.group && candidate.side === target.side ? 1 : candidate.group === target.group ? 2 : candidate.region === target.region && candidate.part.kind === target.part.kind ? 3 : candidate.region === target.region ? 4 : candidate.part.kind === target.part.kind ? 5 : 6;
  const candidates = rest.map((candidate, index) => ({ candidate, index })).sort((a, b) => rank(a.candidate) - rank(b.candidate) || a.index - b.index);
  const names = [...new Set(candidates.map(({ candidate }) => candidate.part.name))].slice(0, 3);
  return [answer, ...names];
}
function studyClue(target: Target, collection: 'muscles' | 'skeleton'): { text: string; source: string } {
  const normalized = target.family;
  const exact = labInventory.flatMap(group => group.items.map(item => ({ ...item, source: group.source }))).find(item => item.name.toLowerCase() === normalized);
  const source = exact?.source ?? chapter(collection === 'muscles' ? ['pelvis-thigh', 'leg-foot'].includes(target.region) ? '11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs' : target.region === 'head-neck' ? '11-3-axial-muscles-of-the-head-neck-and-back' : ['trunk', 'chest'].includes(target.region) ? '11-4-axial-muscles-of-the-abdominal-wall-and-thorax' : '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs' : target.region === 'head-neck' ? '7-2-the-skull' : target.region === 'spine' ? '7-3-the-vertebral-column' : target.region === 'chest' ? '7-4-the-thoracic-cage' : ['pelvis-thigh', 'leg-foot'].includes(target.region) ? '8-4-bones-of-the-lower-limb' : '8-2-bones-of-the-upper-limb');
  const detail = exact && !(normalized === 'deltoid' && !/acromial part/i.test(target.part.name)) ? exact.detail : undefined;
  return { text: detail ? `${target.part.name}. ${detail}` : `${target.part.name}. Compare its shape and position with neighboring structures. Anatomical left and right belong to the specimen.`, source };
}
function systemPool(collection: 'muscles' | 'skeleton'): ModelPrompt[] {
  const all = targets(collection);
  return all.map(target => {
    const clue = studyClue(target, collection);
    return { id: `model-${collection}-${target.part.id}`, collection, prompt: target.part.kind === 'muscle' ? 'Name the highlighted muscle.' : target.part.kind === 'bone' ? 'Name the highlighted bone.' : 'Name the highlighted structure.', answer: target.part.name, options: alternatives(target, all), partId: target.part.id, view: target.view, explanation: clue.text, source: clue.source, region: target.region, group: target.group, side: target.side, presentation: target.presentation };
  });
}
function landmarkPool(): ModelPrompt[] {
  const landmarks = (Object.keys(bones) as BoneId[]).flatMap(boneId => {
    const bone = bones[boneId];
    const region: QuizRegionId = boneId === 'femur' ? 'pelvis-thigh' : 'shoulder-arm';
    return bone.landmarks.map(landmark => ({ id: `model-landmark-${landmark.id}`, collection: 'landmarks' as const, prompt: 'Identify the marked landmark.', answer: landmark.name, options: [landmark.name, ...bone.landmarks.filter(other => other.id !== landmark.id).slice(0, 3).map(other => other.name)], bone: boneId, landmark: landmark.id, view: preferredLandmarkView(landmark.id), explanation: `${landmark.description} ${landmark.clue}`, source: bone.source, region, group: bone.name, side: 'right' as const, presentation: 'focus' as const }));
  });
  const sides = (Object.keys(bones) as BoneId[]).map(bone => ({ id: `model-side-${bone}`, collection: 'landmarks' as const, prompt: `Which side of the body is this ${bone} from?`, answer: 'Right', options: ['Right', 'Left'], bone, view: (bone === 'femur' ? 'anterior' : 'posterior') as View, explanation: `This is a right ${bone}. ${bones[bone].sideTip} Rotating the view changes the visible surface, not the specimen's side.`, source: bones[bone].source, region: (bone === 'femur' ? 'pelvis-thigh' : 'shoulder-arm') as QuizRegionId, group: bones[bone].name, side: 'right' as const, presentation: 'focus' as const }));
  return [...landmarks, ...sides];
}

/** Every available source part is eligible; presentation handles depth and scale. */
export const modelPromptPools: Record<ModelCollection, ModelPrompt[]> = {
  muscles: systemPool('muscles'),
  skeleton: systemPool('skeleton'),
  landmarks: landmarkPool(),
};

/**
 * Local anatomical context for a position-dependent target. Keep whole chest or
 * spine relationships; keep hand/foot neighbors without dragging in a full limb.
 * Midline and unspecified-side structures provide shared orientation context.
 */
export function getPromptContextIds(prompt: ModelPrompt): string[] | undefined {
  if (prompt.presentation !== 'context' || prompt.collection === 'landmarks') return undefined;
  const collection = prompt.collection;
  const parts = systemParts[collection];
  const selected = parts.find(part => part.id === prompt.partId);
  if (!selected) return undefined;
  const target = describeModelPart(selected, collection);
  const handGroups = new Set(['Carpals', 'Metacarpals', 'Hand phalanges']);
  const footGroups = new Set(['Tarsals', 'Metatarsals', 'Foot phalanges']);
  const localGroups = collection === 'skeleton' && handGroups.has(target.group) ? handGroups : collection === 'skeleton' && footGroups.has(target.group) ? footGroups : undefined;
  const wholeRegion = target.region === 'spine' || target.region === 'chest';
  return parts.filter(part => {
    if (part.id === selected.id) return true;
    const candidate = describeModelPart(part, collection);
    if (candidate.region !== target.region) return false;
    if (wholeRegion) return true;
    if (localGroups && !localGroups.has(candidate.group)) return false;
    return !target.side || target.side === 'midline' || !candidate.side || candidate.side === 'midline' || candidate.side === target.side;
  }).map(part => part.id);
}

/** Draw uncovered prompts from the selected current pass; exhausted passes return []. */
export function createModelSession(collection: ModelCollection, count = 10, random: () => number = Math.random, coveredIds: readonly string[] = [], allowedIds?: readonly string[]): ModelPrompt[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  const allowed = allowedIds === undefined ? null : new Set(allowedIds);
  const pool = modelPromptPools[collection].filter(prompt => allowed === null || allowed.has(prompt.id));
  const poolIds = new Set(pool.map(prompt => prompt.id));
  const covered = new Set(coveredIds.filter(id => poolIds.has(id)));
  let candidates = shuffled(pool.filter(prompt => !covered.has(prompt.id)), random);
  const total = Math.min(Math.floor(count), candidates.length);
  if (total === 0) return [];
  const selected: ModelPrompt[] = [];
  if (collection === 'muscles' && covered.size === 0) {
    const anchor = candidates.find(prompt => prompt.partId === 'FJ1467');
    if (anchor) { selected.push(anchor); candidates = candidates.filter(prompt => prompt.id !== anchor.id); }
  }
  let selectedSideTask = false;
  if (collection === 'landmarks' && total >= 2) {
    const sidePrompt = candidates.find(prompt => prompt.id.startsWith('model-side-'));
    if (sidePrompt) { selected.push(sidePrompt); candidates = candidates.filter(prompt => prompt.id !== sidePrompt.id); selectedSideTask = true; }
    candidates = [...candidates.filter(prompt => !prompt.id.startsWith('model-side-')), ...candidates.filter(prompt => prompt.id.startsWith('model-side-'))];
  }
  selected.push(...candidates.slice(0, total - selected.length));
  if (selectedSideTask && selected.length >= 2) [selected[0], selected[1]] = [selected[1], selected[0]];
  return selected.map(prompt => ({ ...prompt, options: shuffled(prompt.options, random) }));
}
