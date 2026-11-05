import { modelPromptPools, type ModelCollection, type ModelPrompt } from './modelQuiz';

export type StudySection = {
  id: string;
  title: string;
  description: string;
  collection: ModelCollection;
  promptIds: string[];
};

export type StudyUnit = {
  id: string;
  title: string;
  chapter: string;
  description: string;
  source: string;
  sections: StudySection[];
};

const textbook = (section: string) => `https://openstax.org/books/anatomy-and-physiology-2e/pages/${section}`;
const assigned = new Set<string>();
type Selector = (prompt: ModelPrompt) => boolean;
const group = (...names: string[]): Selector => prompt => names.includes(prompt.group ?? '');
const muscle = (pattern: RegExp): Selector => prompt => pattern.test(prompt.answer);

/** Named sections partition the shipped prompts; no reference-only topic is playable here. */
function section(id: string, title: string, description: string, collection: ModelCollection, matches: Selector): StudySection {
  const promptIds = modelPromptPools[collection].filter(prompt => !assigned.has(prompt.id) && matches(prompt)).map(prompt => prompt.id);
  promptIds.forEach(promptId => assigned.add(promptId));
  return { id, title, description, collection, promptIds };
}

/**
 * OpenStax chapters 7, 8 and 11 supply the broad order. The smaller practice
 * sections are our teaching design: identify related structures together,
 * then compare neighboring groups. They do not claim complete chapter coverage.
 * Bone detail follows its whole-bone section, before regional muscle anatomy.
 */
export const studyUnits: StudyUnit[] = [
  {
    id: 'axial-skeleton', title: 'Axial skeleton', chapter: 'OpenStax Ch. 7',
    description: 'Start with the skull, vertebral column and thoracic cage. Learn each group before comparing its individual parts.',
    source: textbook('7-introduction'),
    sections: [
      section('skull-hyoid', 'Skull & hyoid', 'Distinguish cranial and facial bones, then place the hyoid in the neck.', 'skeleton', group('Skull bones', 'Hyoid', 'Ear ossicles')),
      section('cervical-vertebrae', 'Cervical vertebrae', 'Recognize atlas and axis before comparing the remaining cervical levels.', 'skeleton', group('Cervical vertebrae')),
      section('thoracic-vertebrae', 'Thoracic vertebrae', 'Follow the thoracic sequence and compare adjacent vertebral levels in context.', 'skeleton', group('Thoracic vertebrae')),
      section('lumbar-sacrum', 'Lumbar vertebrae & sacrum', 'Compare lumbar levels, then identify the sacrum at the base of the column.', 'skeleton', group('Lumbar vertebrae', 'Sacrum & coccyx')),
      section('intervertebral-discs', 'Intervertebral discs', 'Identify the supporting discs by their level after learning the vertebrae around them.', 'skeleton', group('Intervertebral discs')),
      section('ribs', 'Ribs', 'Identify rib number and anatomical side using the whole thoracic cage for orientation.', 'skeleton', group('Ribs')),
      section('sternum-cartilage', 'Sternum & costal cartilages', 'Distinguish the parts of the sternum and the named costal cartilages.', 'skeleton', group('Sternum', 'Costal cartilage')),
    ],
  },
  {
    id: 'appendicular-skeleton', title: 'Appendicular skeleton', chapter: 'OpenStax Ch. 8',
    description: 'Move from each girdle toward the digits. After identifying a whole bone, practice its available landmarks and side.',
    source: textbook('8-introduction'),
    sections: [
      section('pectoral-girdle', 'Pectoral girdle', 'Identify the clavicles and scapulae, including their anatomical sides.', 'skeleton', group('Pectoral girdle')),
      section('scapula-details', 'Scapula: landmarks & side', 'Use the spine and glenoid to orient the scapula before naming the marked features.', 'landmarks', prompt => prompt.bone === 'scapula'),
      section('arm-bones', 'Arm: humerus', 'Recognize each humerus as a whole bone before examining its surface features.', 'skeleton', group('Arm')),
      section('humerus-details', 'Humerus: landmarks & side', 'Compare proximal, shaft and distal features, then use them to determine anatomical side.', 'landmarks', prompt => prompt.bone === 'humerus'),
      section('forearm-bones', 'Forearm: radius & ulna', 'Distinguish radius from ulna and identify the side of each specimen.', 'skeleton', group('Forearm')),
      section('carpals', 'Wrist: carpals', 'Compare the small wrist bones in context before moving into the hand.', 'skeleton', group('Carpals')),
      section('hand-bones', 'Hand: metacarpals & phalanges', 'Use digit number and proximal-to-distal position to distinguish the hand bones.', 'skeleton', group('Metacarpals', 'Hand phalanges')),
      section('pelvic-girdle', 'Pelvic girdle', 'Orient the paired hip bones before following the lower limb distally.', 'skeleton', group('Pelvic girdle')),
      section('femur-bones', 'Thigh: femur', 'Identify the whole femur and its anatomical side before its landmarks.', 'skeleton', group('Femur')),
      section('femur-details', 'Femur: landmarks & side', 'Compare the head, trochanters and distal joint surfaces, then determine side.', 'landmarks', prompt => prompt.bone === 'femur'),
      section('knee-leg-bones', 'Knee & leg', 'Distinguish patella, tibia and fibula before studying the foot.', 'skeleton', group('Knee & leg')),
      section('tarsals', 'Tarsal bones', 'Compare the tarsal bones within the foot and identify their sides.', 'skeleton', group('Tarsals')),
      section('foot-bones', 'Foot: metatarsals & phalanges', 'Use toe number and proximal-to-distal position to distinguish the remaining foot bones.', 'skeleton', group('Metatarsals', 'Foot phalanges')),
    ],
  },
  {
    id: 'axial-muscles', title: 'Axial muscles', chapter: 'OpenStax Ch. 11.3–11.4',
    description: 'Study related muscles of the head, neck and trunk in small groups. Compare their positions before mixing regions.',
    source: textbook('11-3-axial-muscles-of-the-head-neck-and-back'),
    sections: [
      section('facial-muscles', 'Facial expression', 'Compare muscles around the scalp, eyes, nose and mouth; distinguish expression muscles from chewing muscles.', 'muscles', muscle(/frontalis|occipitalis|temporoparietalis|corrugator|orbicularis|procerus|zygomatic|nasalis|nasolabialis|labii|anguli oris|septi nasi|buccinator|risorius|mentalis|platysma/i)),
      section('eye-muscles', 'Extraocular muscles', 'Compare the rectus and oblique muscles and the levator of the upper eyelid.', 'muscles', muscle(/palpebrae|(?:superior|inferior|medial|lateral) rectus|(?:superior|inferior) oblique/i)),
      section('mastication-muscles', 'Mastication', 'Distinguish temporalis, masseter and the pterygoids, including their named parts.', 'muscles', muscle(/temporalis|masseter|pterygoid/i)),
      section('tongue-pharynx-muscles', 'Tongue & pharynx', 'Compare tongue muscles with the muscles surrounding the pharynx.', 'muscles', muscle(/glossus|pharyng/i)),
      section('hyoid-muscles', 'Suprahyoid & infrahyoid muscles', 'Locate muscles above and below the hyoid and compare their relative positions.', 'muscles', muscle(/stylohyoid|mylohyoid|digastric|geniohyoid|sternohyoid|sternothyroid|thyrohyoid|omohyoid/i)),
      section('laryngeal-muscles', 'Larynx', 'Distinguish the small laryngeal muscles and their named parts in isolation and context.', 'muscles', muscle(/arytenoid|ary-epiglottic|cricothyroid/i)),
      section('anterior-neck-muscles', 'Anterior & lateral neck', 'Compare sternocleidomastoid, scalenes and deep anterior neck muscles before the back.', 'muscles', muscle(/sternocleidomastoid|scalenus|longus (colli|capitis)|rectus (anterior|lateralis) capitis/i)),
      section('posterior-neck-muscles', 'Posterior neck', 'Compare the posterior neck muscles and their regional parts before following them into the back.', 'muscles', muscle(/splenius|capitis|colli|cervicis/i)),
      section('intrinsic-back-muscles', 'Intrinsic back', 'Compare muscles along the vertebral column, including their named thoracic and lumbar parts.', 'muscles', muscle(/iliocostalis|longissimus|spinalis|multifidus|rotatores|interspinal|intertransvers/i)),
      section('thoracic-muscles', 'Thoracic wall & diaphragm', 'Identify the diaphragm and muscles of the thoracic wall before comparing shoulder movers.', 'muscles', muscle(/intercostal|subcostal|costarum|transversus thoracis|diaphragm|serratus posterior/i)),
      section('abdominal-muscles', 'Abdominal wall & posterior abdomen', 'Distinguish the abdominal layers, rectus abdominis, pyramidalis and quadratus lumborum.', 'muscles', prompt => prompt.region === 'trunk' && /abdom|external oblique|pyramidalis|quadratus lumborum/i.test(prompt.answer)),
      section('pelvic-floor-muscles', 'Pelvic floor', 'Distinguish the pelvic diaphragm muscles and the external anal sphincter after the abdominal wall.', 'muscles', muscle(/pubo-analis|pubococcygeus|iliococcygeus|coccygeus|anal sphincter/i)),
    ],
  },
  {
    id: 'upper-limb-muscles', title: 'Pectoral girdle & upper limb muscles', chapter: 'OpenStax Ch. 11.5',
    description: 'Follow the limb from shoulder support to hand. Separate neighboring muscle groups before comparing them in the quiz.',
    source: textbook('11-5-muscles-of-the-pectoral-girdle-and-upper-limbs'),
    sections: [
      section('scapular-muscles', 'Muscles positioning the pectoral girdle', 'Compare the scapular movers before studying muscles crossing the shoulder joint.', 'muscles', muscle(/trapezius|rhomboid|levator scapula|pectoralis minor|serratus anterior|subclavius/i)),
      section('shoulder-muscles', 'Shoulder joint muscles', 'Distinguish deltoid, rotator cuff, teres major, pectoralis major and latissimus dorsi.', 'muscles', muscle(/deltoid|supraspinat|infraspinat|subscapular|teres (major|minor)|pectoralis major|latissimus/i)),
      section('arm-muscles', 'Arm & elbow muscles', 'Compare the anterior and posterior arm muscles and distinguish their named heads.', 'muscles', muscle(/coracobrachialis|biceps brachii|\bbrachialis\b|triceps brachii|anconeus/i)),
      section('anterior-forearm-muscles', 'Anterior forearm', 'Compare the forearm flexors and pronators, including their superficial and deep members.', 'muscles', muscle(/flexor (digitorum (superficialis|profundus)|pollicis longus|carpi)|pronator|palmaris/i)),
      section('posterior-forearm-muscles', 'Posterior & lateral forearm', 'Distinguish the forearm extensors, supinator and brachioradialis before the intrinsic hand muscles.', 'muscles', prompt => prompt.region === 'forearm-hand' && /extensor|abductor pollicis longus|supinator|brachioradialis/i.test(prompt.answer)),
      section('hand-muscles', 'Intrinsic hand muscles', 'Compare thenar, hypothenar, lumbrical and interosseous groups and the thumb adductor.', 'muscles', prompt => prompt.region === 'forearm-hand' && /interosse|digiti minimi.*hand|pollicis brevis|opponens pollicis|lumbrical.*hand|adductor pollicis/i.test(prompt.answer)),
    ],
  },
  {
    id: 'lower-limb-muscles', title: 'Pelvis & lower limb muscles', chapter: 'OpenStax Ch. 11.6',
    description: 'Follow the lower limb from pelvis to foot. Compare muscle groups in each compartment before moving distally.',
    source: textbook('11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
    sections: [
      section('hip-muscles', 'Hip & deep lateral rotators', 'Compare gluteal muscles, hip flexors and deep lateral rotators before the thigh compartments.', 'muscles', muscle(/glute|tensor fascia|iliacus|psoas|piriformis|obturator internus|gemell|quadratus femoris/i)),
      section('anterior-medial-thigh-muscles', 'Anterior & medial thigh', 'Distinguish quadriceps members, sartorius and the medial thigh group.', 'muscles', prompt => prompt.region === 'pelvis-thigh' && /rectus femoris|vastus|sartorius|adductor|gracilis|pectineus|obturator externus/i.test(prompt.answer)),
      section('posterior-thigh-muscles', 'Posterior thigh', 'Compare the hamstrings and distinguish the two named heads of biceps femoris.', 'muscles', muscle(/biceps femoris|semitendinosus|semimembranosus/i)),
      section('anterior-lateral-leg-muscles', 'Anterior & lateral leg', 'Compare tibialis anterior, long toe extensors and the fibularis group.', 'muscles', muscle(/tibialis anterior|extensor (digitorum|hallucis) longus|fibularis|peroneus/i)),
      section('posterior-leg-muscles', 'Posterior leg', 'Compare superficial calf muscles with the deep posterior compartment and popliteus.', 'muscles', muscle(/gastrocnemius|soleus|plantaris|popliteus|tibialis posterior|flexor (digitorum|hallucis) longus/i)),
      section('foot-muscles', 'Intrinsic foot muscles', 'Compare the small muscles of the foot after learning the leg muscles that reach it.', 'muscles', prompt => prompt.region === 'leg-foot' && /foot|plantar interosse|flexor digitorum brevis|hallucis brevis|abductor hallucis|adductor hallucis|quadratus plantae|extensor digitorum brevis/i.test(prompt.answer)),
    ],
  },
  {
    id: 'additional-models', title: 'Additional model structures', chapter: 'Additional practice',
    description: 'Study any supplied model parts awaiting a more specific curriculum assignment.',
    source: textbook('preface'),
    sections: (['skeleton', 'landmarks', 'muscles'] as const).map(collection => section(`additional-${collection}`, `Additional ${collection === 'skeleton' ? 'skeletal structures' : collection === 'landmarks' ? 'landmarks & laterality' : 'muscles'}`, 'Identify these available source parts while their regional study grouping is reviewed.', collection, () => true)),
  },
].map(unit => ({ ...unit, sections: unit.sections.filter(item => item.promptIds.length > 0) })).filter(unit => unit.sections.length > 0);

export const studySections: StudySection[] = studyUnits.flatMap(unit => unit.sections);

/** Custom selections get a section title only when their exact target set matches. */
export function findStudySection(collection: ModelCollection, selectedIds: readonly string[] | null | undefined): StudySection | undefined {
  if (selectedIds === null || selectedIds === undefined) return undefined;
  const selected = new Set(selectedIds);
  return studySections.find(item => item.collection === collection && item.promptIds.length === selected.size && item.promptIds.every(id => selected.has(id)));
}

export function nextStudySection(current: StudySection): StudySection | undefined {
  const index = studySections.findIndex(item => item.id === current.id);
  return index >= 0 ? studySections[index + 1] : undefined;
}
