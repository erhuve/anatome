import { bones, modules } from './content';
import { histologySlides } from './histology';
import { labInventory, type LabCollection } from './labInventory';
import { describeModelPart, modelPromptPools, type ModelCollection } from './modelQuiz';
import { systemParts, type SystemId, type SystemPart } from './systemData';

export type CatalogDomain = 'bones' | 'muscles' | 'tissues';
export type CatalogDepth = 'superficial' | 'deep' | 'mixed' | 'unspecified' | 'not-applicable';
export type CatalogItem = {
  id: string;
  name: string;
  detail: string;
  domain: CatalogDomain;
  kind: 'bone' | 'muscle' | 'landmark' | 'tissue';
  region: string;
  source: string;
  modelPartIds: string[];
  /** Context bones are NOT a claim that the feature has a reviewed locator. */
  contextPartIds: string[];
  landmarkIds: string[];
  slideIds: string[];
  coverage: 'linked-assets' | 'reference-only';
  gaps: string[];
};
export type CatalogGroup = {
  id: string;
  name: string;
  domain: CatalogDomain;
  description: string;
  source: string;
  scope: 'college-lab-baseline' | 'additional-instructor-selected';
  entries: CatalogItem[];
};

const textbook = (section: string) => `https://openstax.org/books/anatomy-and-physiology-2e/pages/${section}`;
export const catalogScope = {
  title: 'College A&P study inventory',
  description: 'An instructor-adjustable lab baseline, additional regional targets, and a two-semester course map. There is no universal practical list: use your syllabus to select required structures and depth.',
  sources: [
    { name: 'OpenStax A&P 2e course scope', url: textbook('preface') },
    { name: 'HAPS undergraduate learning outcomes', url: 'https://www.hapsweb.org/haps-learning-outcomes/' },
  ],
  limitations: [
    'All available model parts is not the same as complete college A&P coverage. Source assemblies contain subdivisions, cartilage and discs; their part counts are not counts of adult bones or whole muscles.',
    'A whole-bone mesh does not supply reviewed labels for every landmark. The current locator set covers selected landmarks on the femur, humerus and scapula.',
    'Muscle meshes support identification and spatial study. Detailed origin, insertion, innervation and action assessments still need course-specific material.',
    'Five micrographs illustrate selected tissues; they are not a complete slide bank or a substitute for studying multiple fields and your assigned specimens.',
    'Most organ-system anatomy and physiology is currently a reference roadmap, not a complete model collection or assessed course.',
  ],
};

// These are additional names/tasks, not a claim that every instructor assigns
// them. Original short study directions reference the relevant textbook chapter.
const extendedInventory: LabCollection[] = [
  {
    id: 'skull-additional-landmarks', name: 'Skull foramina & deeper landmarks', category: 'bones',
    description: 'Additional instructor-selected skull landmarks; verify the exact list required in your lab.',
    source: textbook('7-2-the-skull'),
    items: [
      ['Cribriform plate', 'Locate the perforated ethmoid region and relate it to the nasal cavity.'],
      ['Crista galli', 'Find the midline ethmoid projection in the anterior cranial floor.'],
      ['Optic canal', 'Locate this opening in the sphenoid region.'],
      ['Superior orbital fissure', 'Distinguish the fissure from the neighboring optic canal.'],
      ['Foramen rotundum', 'Compare its position with the other sphenoid foramina.'],
      ['Foramen ovale', 'Recognize the oval opening in the cranial base.'],
      ['Foramen spinosum', 'Locate the small opening near foramen ovale.'],
      ['Carotid canal', 'Find the canal in the temporal bone.'],
      ['Jugular foramen', 'Locate the opening between temporal and occipital bones.'],
      ['Internal acoustic meatus', 'Identify this opening on the internal temporal surface.'],
      ['Mandibular fossa', 'Find the temporal surface that participates in the jaw joint.'],
      ['External occipital protuberance', 'Locate the posterior midline occipital prominence.'],
      ['Zygomatic process of temporal bone', 'Trace its contribution to the zygomatic arch.'],
      ['Palatine process of maxilla', 'Locate its contribution to the anterior hard palate.'],
      ['Horizontal plate of palatine bone', 'Locate its contribution to the posterior hard palate.'],
      ['Superior and middle nasal conchae', 'Distinguish these ethmoid projections from the separate inferior concha.'],
    ].map(([name, detail]) => ({ name, detail })),
  },
  {
    id: 'additional-limb-landmarks', name: 'Additional limb & girdle landmarks', category: 'bones',
    description: 'Extend the initial locator set with the markings and relationships selected by your instructor.',
    source: textbook('8-introduction'),
    items: [
      ['Suprascapular notch', 'Locate the indentation along the superior scapular border.'],
      ['Supraglenoid and infraglenoid tubercles', 'Distinguish the attachment sites above and below the glenoid.'],
      ['Adductor tubercle', 'Find the small femoral prominence above the medial epicondyle.'],
      ['Soleal line', 'Locate this posterior tibial attachment marking.'],
      ['Pubic crest and pubic tubercle', 'Distinguish these anterior pelvic landmarks.'],
      ['Superior and inferior pubic rami', 'Trace the pubic contributions around the obturator foramen.'],
      ['Ischial ramus', 'Locate the inferior ischial contribution to the hip bone.'],
      ['Arcuate line', 'Identify the internal iliac contribution to the pelvic brim.'],
      ['Anterior and posterior arches of atlas', 'Orient the ring-shaped first cervical vertebra.'],
      ['Lateral masses of atlas', 'Locate its enlarged joint-bearing regions.'],
    ].map(([name, detail]) => ({ name, detail })),
  },
  {
    id: 'additional-upper-muscles', name: 'Additional shoulder, forearm & hand muscles', category: 'muscles',
    description: 'Identify these regional muscles and study the actions, attachments and innervation assigned by your course.',
    source: textbook('11-5-muscles-of-the-pectoral-girdle-and-upper-limbs'),
    items: [
      'Rhomboid major', 'Rhomboid minor', 'Levator scapulae', 'Teres major', 'Coracobrachialis',
      'Anconeus', 'Supinator', 'Palmaris longus', 'Flexor digitorum superficialis',
      'Flexor digitorum profundus', 'Flexor pollicis longus', 'Extensor carpi radialis longus',
      'Extensor carpi radialis brevis', 'Extensor carpi ulnaris', 'Abductor pollicis longus',
      'Extensor pollicis longus', 'Extensor pollicis brevis', 'Thenar muscles',
      'Hypothenar muscles', 'Lumbricals of hand', 'Palmar and dorsal interossei of hand',
    ].map(name => ({ name, detail: 'Identify the structure in its regional context; add required attachments, principal actions and innervation from your lab list.' })),
  },
  {
    id: 'additional-lower-muscles', name: 'Additional hip, leg & foot muscles', category: 'muscles',
    description: 'Include deeper regional structures without confusing a lack of surface visibility with a lack of study importance.',
    source: textbook('11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
    items: [
      'Gluteus minimus', 'Tensor fasciae latae', 'Adductor brevis', 'Adductor magnus',
      'Pectineus', 'Piriformis', 'Obturator internus', 'Obturator externus',
      'Superior gemellus', 'Inferior gemellus', 'Quadratus femoris', 'Popliteus',
      'Flexor digitorum longus', 'Flexor hallucis longus', 'Fibularis tertius',
      'Abductor hallucis', 'Flexor digitorum brevis', 'Lumbricals of foot', 'Plantar and dorsal interossei of foot',
    ].map(name => ({ name, detail: 'Identify the muscle, orient its region, and study its course-specific attachments, action and nerve supply.' })),
  },
];

function normalize(name: string): string {
  return name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/\b(right|left)\b/g, '')
    .replace(/\bmaxillae\b/g, 'maxilla').replace(/\bvertebrae\b/g, 'vertebra')
    .replace(/\btriquetrum\b/g, 'triquetral').replace(/\bfibularis\b/g, 'peroneus')
    .replace(/\bfascia\s+lata\b/g, 'fasciae latae').replace(/\bmuscles?\b/g, '')
    .replace(/\bbones?\b/g, '').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function modelFamily(name: string): string {
  // Source archives place the side before OR after a component prefix. Normalize
  // side first, then recognize named heads/parts without losing the whole family.
  return normalize(name).replace(/^.*?\b(?:head|part|belly|portion) of /, '');
}
const aliases: Record<string, string[]> = {
  'Sternum': ['Manubrium', 'Body of sternum', 'Xiphoid process'],
  'Atlas (C1)': ['Atlas', 'First cervical vertebra'],
  'Axis (C2)': ['Axis', 'Second cervical vertebra'],
  'Malleus, incus, and stapes': ['Malleus', 'Incus', 'Stapes'],
  'Vastus lateralis, medialis, and intermedius': ['Vastus lateralis', 'Vastus medialis', 'Vastus intermedius'],
  'Semitendinosus and semimembranosus': ['Semitendinosus', 'Semimembranosus'],
  'Fibularis longus and brevis': ['Fibularis longus', 'Fibularis brevis'],
  'Iliopsoas (iliacus and psoas major)': ['Iliopsoas', 'Iliacus', 'Psoas major'],
  'Frontalis': ['Frontalis', 'Frontal belly of occipitofrontalis'],
  'External oblique': ['External oblique', 'External abdominal oblique'],
  'Internal oblique': ['Internal oblique', 'Internal abdominal oblique'],
  'External intercostals': ['External intercostal'],
  'Internal intercostals': ['Internal intercostal'],
  'Head and fovea capitis': ['Head of femur', 'Fovea capitis'],
  'Greater and lesser trochanters': ['Greater trochanter', 'Lesser trochanter'],
  'Greater and lesser tubercles': ['Greater tubercle', 'Lesser tubercle'],
  'Anatomical and surgical necks': ['Anatomical neck', 'Surgical neck'],
  'Medial and lateral condyles': ['Medial condyle', 'Lateral condyle'],
  'Supraspinous and infraspinous fossae': ['Supraspinous fossa', 'Infraspinous fossa'],
  'Skeletal muscle': ['Skeletal muscle'], 'Cardiac muscle': ['Cardiac muscle'],
  'Simple squamous': ['Simple squamous epithelium'],
  'Stratified squamous, nonkeratinized': ['Stratified squamous epithelium'],
  'Elastic connective tissue': ['Elastic connective tissue'],
};
const regions: Record<string, string> = {
  'cranial-bones': 'head-neck', 'facial-bones': 'head-neck', 'vertebral-column': 'spine',
  'thoracic-cage': 'chest', 'pectoral-girdle': 'shoulder-arm', 'humerus-inventory': 'shoulder-arm',
  forearm: 'forearm-hand', hand: 'forearm-hand', 'pelvic-girdle': 'pelvis-thigh',
  'femur-inventory': 'pelvis-thigh', 'leg-knee': 'leg-foot', foot: 'leg-foot',
  'head-neck-muscles': 'head-neck', 'trunk-muscles': 'trunk', 'shoulder-muscles': 'shoulder-arm',
  'upper-limb-muscles': 'forearm-hand', 'hip-thigh-muscles': 'pelvis-thigh', 'leg-muscles': 'leg-foot',
  'skull-additional-landmarks': 'head-neck', 'additional-limb-landmarks': 'other',
  'additional-upper-muscles': 'forearm-hand', 'additional-lower-muscles': 'pelvis-thigh',
};
const contextFamilies: Record<string, RegExp> = {
  'cranial-bones': /frontal|parietal|temporal|occipital|sphenoid|ethmoid/,
  'facial-bones': /maxilla|mandible|zygomatic|nasal|lacrimal|palatine|concha|vomer|hyoid/,
  'skull-additional-landmarks': /frontal|parietal|temporal|occipital|sphenoid|ethmoid|maxilla|palatine/,
  'pectoral-girdle': /clavicle|scapula/, 'humerus-inventory': /humerus/,
  'femur-inventory': /femur/, forearm: /radius|ulna/, 'pelvic-girdle': /hip|sacrum/,
  'leg-knee': /patella|tibia|fibula/, 'vertebral-column': /vertebra|atlas|axis|sacrum|coccy/,
  'thoracic-cage': /rib|sternum|manubrium|xiphoid/,
};
const sourceLandmarks = Object.values(bones).flatMap(bone => bone.landmarks.map(item => ({ ...item, bone: bone.id })));

function matchesModels(name: string, group: LabCollection): SystemPart[] {
  if (group.category === 'tissues') return [];
  const expected = (aliases[name] ?? [name]).map(normalize);
  const parts = systemParts[group.category === 'muscles' ? 'muscles' : 'skeleton'];
  const exact = parts.filter(part => expected.includes(normalize(part.name)) || expected.includes(modelFamily(part.name)));
  if (exact.length) return exact;
  // Generic checklist rows intentionally refer to a family of individually
  // named source parts. Restrict digit matches to the correct limb region.
  if (name === 'Cervical vertebrae C1–C7') return parts.filter(part => /cervical vertebra|atlas|axis/i.test(part.name));
  if (name === 'Thoracic vertebrae T1–T12') return parts.filter(part => /thoracic vertebra/i.test(part.name));
  if (name === 'Lumbar vertebrae L1–L5') return parts.filter(part => /lumbar vertebra/i.test(part.name));
  if (name === 'True ribs 1–7') return parts.filter(part => part.kind === 'bone' && /\b(first|second|third|fourth|fifth|sixth|seventh) rib\b/i.test(part.name));
  if (name === 'False ribs 8–12') return parts.filter(part => part.kind === 'bone' && /\b(eighth|ninth|tenth|eleventh|twelfth) rib\b/i.test(part.name));
  if (name === 'Floating ribs 11–12') return parts.filter(part => part.kind === 'bone' && /\b(eleventh|twelfth) rib\b/i.test(part.name));
  if (name === 'Metacarpals I–V') return parts.filter(part => /metacarpal/i.test(part.name));
  if (name === 'Metatarsals I–V') return parts.filter(part => /metatarsal/i.test(part.name));
  if (name === 'Proximal, middle, and distal phalanges') return parts.filter(part => /phalanx/i.test(part.name) && /finger|thumb/i.test(part.name));
  if (name === 'Toe phalanges') return parts.filter(part => /phalanx/i.test(part.name) && /toe/i.test(part.name));
  if (name === 'Erector spinae') return parts.filter(part => /iliocostalis|longissimus|spinalis/i.test(part.name) && !/semispinalis/i.test(part.name));
  if (name === 'Thenar muscles') return parts.filter(part => /abductor pollicis brevis|flexor pollicis brevis|opponens pollicis/i.test(part.name));
  if (name === 'Hypothenar muscles') return parts.filter(part => /abductor digiti minimi|flexor digiti minimi|opponens digiti minimi/i.test(part.name) && describeModelPart(part, 'muscles').region === 'forearm-hand');
  if (/^Lumbricals of (hand|foot)$/.test(name)) return parts.filter(part => /lumbrical/i.test(part.name) && describeModelPart(part, 'muscles').region === (name.endsWith('hand') ? 'forearm-hand' : 'leg-foot'));
  if (name.endsWith('interossei of hand')) return parts.filter(part => /interosse/i.test(part.name) && describeModelPart(part, 'muscles').region === 'forearm-hand');
  if (name.endsWith('interossei of foot')) return parts.filter(part => /interosse/i.test(part.name) && describeModelPart(part, 'muscles').region === 'leg-foot');
  return [];
}

function makeGroup(group: LabCollection, extended: boolean): CatalogGroup {
  const region = regions[group.id] ?? 'other';
  return {
    id: group.id, name: group.name, domain: group.category, description: group.description,
    source: group.source, scope: extended ? 'additional-instructor-selected' : 'college-lab-baseline',
    entries: group.items.map((item, index) => {
      const linked = matchesModels(item.name, group);
      const expected = (aliases[item.name] ?? [item.name]).map(normalize);
      const landmarkIds = group.category === 'bones'
        ? sourceLandmarks.filter(landmark => expected.includes(normalize(landmark.name)) &&
          (group.id !== 'femur-inventory' || landmark.bone === 'femur') &&
          (group.id !== 'humerus-inventory' || landmark.bone === 'humerus')).map(landmark => landmark.id)
        : [];
      const slideIds = group.category === 'tissues'
        ? histologySlides.filter(slide => expected.includes(normalize(slide.name))).map(slide => slide.id) : [];
      const kind = group.category === 'muscles' ? 'muscle' : group.category === 'tissues' ? 'tissue'
        : linked.length || /^(Coccyx|Malleus, incus, and stapes)$/.test(item.name) ? 'bone' : 'landmark';
      const hasAssets = linked.length > 0 || landmarkIds.length > 0 || slideIds.length > 0;
      const gaps = [];
      if (!hasAssets) gaps.push(kind === 'tissue' ? 'No matching micrograph is included.' : kind === 'landmark' ? 'No reviewed landmark locator is included.' : 'No matching 3D specimen is linked.');
      if (kind === 'muscle') gaps.push('Identification models do not provide a complete attachment, action and innervation assessment.');
      if (kind === 'landmark' && landmarkIds.length > 0 && expected.length > landmarkIds.length) gaps.push('Only some features in this combined checklist row have reviewed locators.');
      return {
        id: `catalog-${group.id}-${index + 1}`, name: item.name, detail: item.detail,
        domain: group.category, kind, region, source: group.source,
        modelPartIds: linked.map(part => part.id),
        contextPartIds: group.category === 'bones' && !linked.length
          ? systemParts.skeleton.filter(part => contextFamilies[group.id]?.test(normalize(part.name))).map(part => part.id) : [],
        landmarkIds, slideIds, coverage: hasAssets ? 'linked-assets' : 'reference-only', gaps,
      };
    }),
  };
}

/** All reference rows remain readable, including entries without visual assets. */
export const studyCatalog: CatalogGroup[] = [
  ...labInventory.map(group => makeGroup(group, false)),
  ...extendedInventory.map(group => makeGroup(group, true)),
];

function knownDepth(part: SystemPart): CatalogDepth {
  if (part.kind !== 'muscle') return 'not-applicable';
  if (/\bdeep\b|\bprofundus\b|\bprofunda\b|\bprofundi\b/i.test(part.name)) return 'deep';
  if (/subscapularis|supraspinatus|infraspinatus|teres minor|brachialis|pronator quadratus|supinator|flexor digitorum profundus|tibialis posterior|popliteus|obturator|gemellus|quadratus femoris|multifidus|rotatores|transversus abdominis|psoas|iliacus|gluteus minimus/i.test(part.name)) return 'deep';
  if (/sternocleidomastoid|trapezius|deltoid|pectoralis major|latissimus|rectus abdominis|external oblique|biceps brachii|brachioradialis|sartorius|rectus femoris|gluteus maximus|gastrocnemius|tibialis anterior/i.test(part.name)) return 'superficial';
  if (/triceps|erector spinae|quadriceps/i.test(part.name)) return 'mixed';
  return 'unspecified';
}

/** Every shipped source part, not merely the former curated practical subset. */
export const modelCatalog = (['skeleton', 'muscles'] as const).flatMap(collection => systemParts[collection].map(part => {
  const metadata = describeModelPart(part, collection);
  return {
    ...part, ...metadata, collection, depth: knownDepth(part),
    promptId: `model-${collection}-${part.id}`,
    quizAvailable: modelPromptPools[collection].some(prompt => prompt.partId === part.id),
  };
}));

const courseLimitations: Record<string, string[]> = {
  foundations: ['Anatomical terminology has selected practice; chemistry, cell biology, transport and full homeostatic reasoning need additional lessons and assessments.'],
  tissues: ['Selected tissue photographs and descriptions are available; additional tissue classes, multiple fields and organ histology remain needed.'],
  integument: ['Skin layers and accessory structures need labeled specimens and physiology assessment.'],
  bones: ['Source skeletal parts and selected landmark locators are available. Missing source bones and unlabelled surface features remain explicit lab-inventory gaps.'],
  joints: ['Joint classification, ligaments, articular structures and movement require dedicated study and assessment beyond bone identification.'],
  muscles: ['Source muscle parts support identification. Attachments, innervation, part-specific actions and contraction physiology require additional coverage.'],
  nervous: ['Brain, spinal cord, cranial nerves, pathways, autonomic anatomy, special senses and reflex physiology are not a complete study collection here.'],
  endocrine: ['Gland anatomy, hormone targets and feedback mechanisms remain reference topics.'],
  cardiovascular: ['Heart chambers, valves, blood cells, vessels, conduction and circulation need their own model/slide and assessment collection.'],
  lymphatic: ['Lymph nodes, spleen, thymus, fluid return and immune mechanisms remain reference topics.'],
  respiratory: ['Airways, lung histology, ventilation, gas exchange and respiratory control remain reference topics.'],
  digestive: ['Digestive organs, mucosal histology, accessory glands, absorption and metabolism remain reference topics.'],
  urinary: ['Kidney/nephron anatomy, renal histology, filtration, fluid/electrolyte and acid–base regulation remain reference topics.'],
  reproductive: ['Reproductive anatomy, gametogenesis, cycles, pregnancy and development remain reference topics.'],
};

/** The full course is visible as a roadmap, not falsely counted as modeled. */
export const curriculumCoverage = modules.map(module => ({
  ...module,
  assetStatus: module.id === 'bones' || module.id === 'muscles' || module.id === 'tissues' ? 'partial-visual-coverage' as const : 'reference-roadmap' as const,
  gaps: courseLimitations[module.id] ?? ['Additional course material and assessment are required.'],
}));

export function getCatalogSummary() {
  const entries = studyCatalog.flatMap(group => group.entries);
  return {
    referenceEntries: entries.length,
    entriesWithLinkedAssets: entries.filter(item => item.coverage === 'linked-assets').length,
    referenceOnlyEntries: entries.filter(item => item.coverage === 'reference-only').length,
    sourceModelParts: modelCatalog.length,
    skeletalModelParts: modelCatalog.filter(item => item.collection === 'skeleton').length,
    muscleModelParts: modelCatalog.filter(item => item.collection === 'muscles').length,
    modelQuizTargets: modelCatalog.filter(item => item.quizAvailable).length,
    reviewedLandmarkLocators: sourceLandmarks.length,
    histologyPhotos: histologySlides.length,
    courseModules: curriculumCoverage.length,
  };
}

export function modelPartsForCatalogItem(id: string): typeof modelCatalog {
  const item = studyCatalog.flatMap(group => group.entries).find(entry => entry.id === id);
  return item ? modelCatalog.filter(part => item.modelPartIds.includes(part.id)) : [];
}

// Keep the exported metadata usable by settings without importing React.
export type CatalogModelPart = (typeof modelCatalog)[number];
export type CatalogModelCollection = Extract<ModelCollection, SystemId>;
