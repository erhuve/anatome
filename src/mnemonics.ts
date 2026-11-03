import type { ModelPrompt } from './modelQuiz';

export type AnatomyMnemonic = {
  id: string;
  title: string;
  cue: string;
  lines: readonly string[];
  context?: string;
  source: string;
  sourceLabel: string;
};

type Entry = AnatomyMnemonic & {
  collection: 'muscles' | 'skeleton';
  names: readonly string[];
};

/** Established cues only. Names explicitly scope each cue to reviewed model parts. */
export const anatomyMnemonics: readonly Entry[] = [
  {
    id: 'carpals', collection: 'skeleton', title: 'Eight carpal bones',
    cue: 'Some Lovers Try Positions That They Can’t Handle',
    lines: [
      'Proximal row: Scaphoid, Lunate, Triquetrum, Pisiform.',
      'Distal row: Trapezium, Trapezoid, Capitate, Hamate.',
    ],
    context: 'Read each row from thumb to little finger, starting with the proximal row. The model calls the triquetrum “triquetral.”',
    source: 'https://anatomy.ttuhscep.edu/anatomytables/bones_alpha.html',
    sourceLabel: 'Texas Tech anatomy tables',
    names: ['scaphoid', 'lunate', 'triquetral', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate'],
  },
  {
    id: 'tarsals', collection: 'skeleton', title: 'Seven tarsal bones',
    cue: 'Tiger Cubs Need MILC',
    lines: [
      'Tiger, Cubs, Need: Talus, Calcaneus, Navicular.',
      'MILC: Medial cuneiform, Intermediate cuneiform, Lateral cuneiform, Cuboid.',
    ],
    context: 'The three cuneiforms run from the big-toe side toward the little-toe side. The whole mnemonic is a recall list, not a single row of bones.',
    source: 'https://www.cuyamaca.edu/student-support/tutoring-center/files/student-resources/Krystal%20Identifying%20Structures%20of%20Skeletal%20System.pdf#page=7',
    sourceLabel: 'Cuyamaca College skeletal study guide',
    names: ['talus', 'calcaneus', 'navicular bone of foot', 'medial cuneiform bone', 'intermediate cuneiform bone', 'lateral cuneiform bone', 'cuboid bone'],
  },
  {
    id: 'cranial-bones', collection: 'skeleton', title: 'Six cranial bone types',
    cue: 'PEST OF',
    lines: ['Parietal, Ethmoid, Sphenoid, Temporal, Occipital, Frontal.'],
    context: 'Eight bones in total: parietal and temporal are paired; the other four types are single bones. This cue lists types, not their positions.',
    source: 'https://libguides.kirtland.edu/c.php?g=1155275&p=10333523',
    sourceLabel: 'Kirtland Community College A&P study tips',
    names: ['parietal bone', 'ethmoid', 'sphenoid bone', 'temporal bone', 'occipital bone', 'frontal bone'],
  },
  {
    id: 'rotator-cuff', collection: 'muscles', title: 'Rotator cuff muscles',
    cue: 'SITS',
    lines: ['Supraspinatus, Infraspinatus, Teres minor, Subscapularis.'],
    context: 'These four muscles form the rotator cuff; teres major is outside this group.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK441844/',
    sourceLabel: 'StatPearls: Rotator Cuff',
    names: ['supraspinatus', 'infraspinatus', 'teres minor', 'subscapularis'],
  },
  {
    id: 'erector-spinae', collection: 'muscles', title: 'Erector spinae columns',
    cue: 'I Love Spaghetti',
    lines: ['Iliocostalis → Longissimus → Spinalis, from lateral to medial.'],
    context: 'These column names apply across their regional subdivisions.',
    source: 'https://www.pearson.com/channels/anp/study-guides/central-nervous-system-thoracic-cage-vertebral-column',
    sourceLabel: 'Pearson A&P study guide',
    names: [
      'iliocostalis colli', 'iliocostalis thoracis', 'iliocostalis lumborum',
      'longissimus colli', 'longissimus capitis', 'longissimus thoracis',
      'spinalis colli', 'spinalis capitis', 'spinalis thoracis',
    ],
  },
  {
    id: 'hand-interossei', collection: 'muscles', title: 'Hand interossei actions',
    cue: 'DAB / PAD',
    lines: ['Dorsal interossei ABduct; Palmar interossei ADduct.'],
    context: 'Abduction moves fingers away from the middle-finger axis; adduction brings them toward it.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK537229/',
    sourceLabel: 'StatPearls: Hand Muscles',
    names: ['dorsal interossei muscles of hand', 'palmar interossei muscles'],
  },
  {
    id: 'pes-anserinus', collection: 'muscles', title: 'Pes anserinus tendons',
    cue: 'Say Grace before Tea',
    lines: ['S = Sartorius; G = Gracilis; T = semiTendinosus.'],
    context: 'Their tendons meet at the medial proximal tibia in this anterior-to-posterior order. The order describes the tendons, not the muscle bellies.',
    source: 'https://pediatricteleradiology.com/tendons-pes-anserinus/',
    sourceLabel: 'Pediatric Teleradiology: Pes anserinus',
    names: ['sartorius', 'gracilis', 'semitendinosus'],
  },
  {
    id: 'extraocular-nerves', collection: 'muscles', title: 'Eye-movement muscle innervation',
    cue: 'LR6, SO4, the rest III',
    lines: [
      'Lateral Rectus: cranial nerve VI (abducens). Superior Oblique: cranial nerve IV (trochlear).',
      'The other four eye-movement muscles use cranial nerve III (oculomotor).',
    ],
    context: 'The numbers identify the cranial nerves supplying the six eye-movement muscles.',
    source: 'https://www.ncbi.nlm.nih.gov/books/NBK553189/',
    sourceLabel: 'StatPearls: Visual Pathway',
    names: ['lateral rectus', 'medial rectus', 'superior rectus', 'inferior rectus', 'superior oblique', 'inferior oblique'],
  },
];

function withoutSide(name: string): string {
  return name.toLowerCase().replace(/\b(?:left|right)\b/g, '').replace(/\s+/g, ' ').trim();
}

const byName: ReadonlyMap<string, AnatomyMnemonic> = new Map(anatomyMnemonics.flatMap(entry =>
  entry.names.map(name => [`${entry.collection}:${name}`, entry] as const),
));

/** Match the selected structure only; neighboring choices and broad regions never select a cue. */
export function mnemonicForPrompt(prompt: Pick<ModelPrompt, 'collection' | 'answer'>): AnatomyMnemonic | undefined {
  return byName.get(`${prompt.collection}:${withoutSide(prompt.answer)}`);
}
