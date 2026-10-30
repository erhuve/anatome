import { histologySlides } from './histology';
// Original study wording, referenced to the linked OpenStax sections.
// This is a starter question bank and curriculum map, not a complete course.
export type BoneId = 'femur' | 'humerus' | 'scapula';
export type View = 'anterior' | 'posterior' | 'medial' | 'lateral';
export function preferredLandmarkView(id: string): View {
  if (['lesser-trochanter', 'olecranon-fossa', 'scapula-spine'].includes(id)) return 'posterior';
  if (['glenoid', 'coracoid', 'deltoid-tuberosity'].includes(id)) return 'lateral';
  return 'anterior';
}
export type Landmark = {
  id: string;
  name: string;
  region: string;
  description: string;
  clue: string;
};
export type Bone = {
  id: BoneId;
  name: string;
  subtitle: string;
  classification: string;
  articulations: string;
  overview: string;
  landmarks: Landmark[];
  sideTip: string;
  source: string;
};
const base = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/';
const source = (section: string) => base + section;

export const bones: Record<BoneId, Bone> = {
  femur: {
    id: 'femur', name: 'Femur', subtitle: 'The thigh · Lower limb',
    classification: 'Long bone · Appendicular skeleton',
    articulations: 'Hip bone, tibia, and patella',
    overview: 'The femur transfers weight between hip and knee and anchors thigh muscles.',
    sideTip: 'Place the head medially and the intercondylar fossa posteriorly. Determine the body side only after both cues agree.',
    source: source('8-4-bones-of-the-lower-limb'),
    landmarks: [
      {id:'femur-head',name:'Head of femur',region:'Proximal',description:'Rounded surface that meets the acetabulum at the hip.',clue:'Ball at the medial end.'},
      {id:'femur-neck',name:'Neck of femur',region:'Proximal',description:'Narrow bridge linking the head to the shaft.',clue:'Between head and trochanters.'},
      {id:'greater-trochanter',name:'Greater trochanter',region:'Proximal',description:'Large lateral projection where several hip muscles attach.',clue:'Large, lateral, and palpable.'},
      {id:'lesser-trochanter',name:'Lesser trochanter',region:'Proximal',description:'Smaller posteromedial projection for iliopsoas attachment.',clue:'Below the neck, posteromedially.'},
      {id:'medial-condyle',name:'Medial condyle',region:'Distal',description:'Smooth knee surface on the same side as the head.',clue:'Distal and toward the midline.'},
      {id:'lateral-condyle',name:'Lateral condyle',region:'Distal',description:'Smooth knee surface on the outer side of the femur.',clue:'Distal and away from midline.'},
    ],
  },
  humerus: {
    id: 'humerus', name: 'Humerus', subtitle: 'The arm · Upper limb',
    classification: 'Long bone · Appendicular skeleton',
    articulations: 'Scapula, radius, and ulna',
    overview: 'The humerus joins shoulder to elbow. Its proximal landmarks anchor shoulder muscles; its distal surfaces guide forearm movement.',
    sideTip: 'The head faces medially; the large olecranon fossa faces posteriorly. Use both to orient an isolated humerus.',
    source: source('8-2-bones-of-the-upper-limb'),
    landmarks: [
      {id:'humerus-head',name:'Head of humerus',region:'Proximal',description:'Rounded surface fitting the scapular glenoid cavity.',clue:'Medial ball at the shoulder.'},
      {id:'greater-tubercle',name:'Greater tubercle',region:'Proximal',description:'Lateral prominence receiving rotator cuff tendons.',clue:'Larger proximal bump, laterally.'},
      {id:'lesser-tubercle',name:'Lesser tubercle',region:'Proximal',description:'Anterior prominence receiving the subscapularis tendon.',clue:'Smaller bump on the front.'},
      {id:'deltoid-tuberosity',name:'Deltoid tuberosity',region:'Shaft',description:'Rough lateral attachment for the deltoid muscle.',clue:'Roughened area halfway down.'},
      {id:'trochlea',name:'Trochlea',region:'Distal',description:'Medial pulley-shaped surface articulating with the ulna.',clue:'Medial pulley; meets ulna.'},
      {id:'capitulum',name:'Capitulum',region:'Distal',description:'Lateral rounded surface articulating with the radius.',clue:'Lateral knob; meets radius.'},
      {id:'olecranon-fossa',name:'Olecranon fossa',region:'Distal',description:'Posterior depression accommodating the ulna during elbow extension.',clue:'Deep hollow at the back.'},
    ],
  },
  scapula: {
    id: 'scapula', name: 'Scapula', subtitle: 'Shoulder girdle · Upper limb',
    classification: 'Flat bone · Appendicular skeleton',
    articulations: 'Clavicle and humerus',
    overview: 'The shoulder blade provides a mobile base for the arm and attachment sites for muscles that position the shoulder.',
    sideTip: 'Place the spine posteriorly and the glenoid cavity laterally. The coracoid projects anteriorly; the inferior angle points down.',
    source: source('8-1-the-pectoral-girdle'),
    landmarks: [
      {id:'scapula-spine',name:'Spine of scapula',region:'Posterior surface',description:'Ridge separating the supraspinous and infraspinous fossae.',clue:'Prominent ridge on the back.'},
      {id:'glenoid',name:'Glenoid cavity',region:'Lateral angle',description:'Shallow socket articulating with the humeral head.',clue:'Lateral socket for the arm.'},
      {id:'acromion',name:'Acromion',region:'Superior',description:'Lateral continuation of the spine, articulating with the clavicle.',clue:'Roof above the shoulder socket.'},
      {id:'coracoid',name:'Coracoid process',region:'Superior',description:'Anterior hook serving as a muscle and ligament attachment.',clue:'Hook projecting toward the front.'},
    ],
  },
};

export type QuestionCategory = 'bones' | 'muscles' | 'tissues' | 'physiology';
export type Question = {
  id: string;
  category: QuestionCategory;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
  bone?: BoneId;
  view?: View;
  landmark?: string;
  image?: string;
  imageCredit?: string;
  imageSource?: string;
};

export const questions: Question[] = [
  ...histologySlides.map((slide,index):Question=>({
    id:`slide-${slide.id}`,category:'tissues',
    prompt:'Identify the predominant tissue in this micrograph.',
    options:histologySlides.map(item=>item.name),answer:index,
    explanation:`${slide.name}. ${slide.features.join(' ')}`,
    source:source(slide.tissue==='Epithelial tissue'?'4-2-epithelial-tissue':slide.tissue==='Muscle tissue'?'4-4-muscle-tissue-and-motion':'4-3-connective-tissue-supports-and-protects'),
    image:slide.image,imageCredit:`${slide.credit} · ${slide.license}`,imageSource:slide.source,
  })),

  {id:'visual-side-femur',category:'bones',bone:'femur',view:'anterior',prompt:'Orient this femur. Which side of the body is it from?',options:['Left','Right','Side cannot be determined'],answer:1,explanation:'This is a right femur. From the starting anterior view, its head points to your right (the subject’s medial side). Rotate to confirm the intercondylar fossa is posterior.',source:source('8-4-bones-of-the-lower-limb')},
  {id:'visual-side-humerus',category:'bones',bone:'humerus',view:'posterior',prompt:'Orient this humerus. Which side of the body is it from?',options:['Right','Left','Side cannot be determined'],answer:0,explanation:'This is a right humerus. From the starting posterior view, the head points to your left, medially. The olecranon fossa faces you and confirms the posterior surface.',source:source('8-2-bones-of-the-upper-limb')},
  {id:'visual-side-scapula',category:'bones',bone:'scapula',view:'posterior',prompt:'Orient this scapula. Which side of the body is it from?',options:['Left','Side cannot be determined','Right'],answer:2,explanation:'This is a right scapula. From behind, the spine is visible and the glenoid cavity lies to your right, laterally. The inferior angle points down.',source:source('8-1-the-pectoral-girdle')},

  {
    id:'bone-femur-head',category:'bones',bone:'femur',view:'anterior',landmark:'femur-head',
    prompt:'Identify the marked proximal surface of this femur.',
    options:['Greater trochanter','Head of femur','Medial condyle','Neck of femur'],answer:1,
    explanation:'The head forms the ball of the hip joint.',source:source('8-chapter-review'),
  },
  {
    id:'bone-femur-side',category:'bones',bone:'femur',
    prompt:'You face the anterior surface of an upright femur. Its head points to your left, and the intercondylar fossa faces away from you. Which side is it from?',
    options:['Left','Right','Either side','The stated orientation is impossible'],answer:0,
    explanation:'The head is medial. In this anterior view of a left femur, medial is to your left. Use the specimen’s side.',source:source('8-4-bones-of-the-lower-limb'),
  },
  {
    id:'bone-trochlea',category:'bones',bone:'humerus',view:'anterior',landmark:'trochlea',
    prompt:'Identify the marked articular surface at the distal humerus.',
    options:['Capitulum','Greater tubercle','Trochlea','Head'],answer:2,
    explanation:'The trochlea meets the ulna; the capitulum meets the radius.',source:source('8-chapter-review'),
  },
  {
    id:'bone-humerus-side',category:'bones',bone:'humerus',
    prompt:'You face the posterior surface of an upright humerus, with the olecranon fossa toward you. Its head points to your left. Which side is it from?',
    options:['Left','Either side','Right','Side depends on elbow position'],answer:2,
    explanation:'In this posterior view, a right humeral head points left toward the body midline.',source:source('8-2-bones-of-the-upper-limb'),
  },
  {
    id:'bone-scapula-side',category:'bones',bone:'scapula',
    prompt:'You face the posterior surface of an upright scapula: spine toward you, inferior angle down, glenoid cavity to your right. Which side is it from?',
    options:['Left','Right','Either side','Side cannot be inferred from these cues'],answer:1,
    explanation:'The glenoid is lateral. From behind, the right scapula has its glenoid to your right.',source:source('8-1-the-pectoral-girdle'),
  },
  {
    id:'bone-scapula-spine',category:'bones',bone:'scapula',view:'posterior',landmark:'scapula-spine',
    prompt:'Identify the marked ridge on the posterior scapula.',
    options:['Coracoid process','Glenoid cavity','Medial border','Spine of scapula'],answer:3,
    explanation:'The spine divides these posterior depressions and continues laterally into the acromion.',source:source('8-chapter-review'),
  },
  {
    id:'bone-glenoid',category:'bones',bone:'scapula',view:'lateral',landmark:'glenoid',
    prompt:'The scapular socket receives the head of which bone?',
    options:['Humerus','Clavicle','Radius','Ulna'],answer:0,
    explanation:'The humeral head and glenoid cavity form the glenohumeral joint.',source:source('8-chapter-review'),
  },
  {
    id:'bone-capitulum',category:'bones',bone:'humerus',view:'anterior',landmark:'capitulum',
    prompt:'Identify the marked rounded surface at the distal humerus.',
    options:['Trochlea','Medial epicondyle','Capitulum','Olecranon fossa'],answer:2,
    explanation:'The capitulum is lateral to the trochlea and articulates with the radius.',source:source('8-chapter-review'),
  },
  {
    id:'bone-deltoid',category:'bones',bone:'humerus',view:'lateral',landmark:'deltoid-tuberosity',
    prompt:'Identify the marked roughened area on the humeral shaft.',
    options:['Anatomical neck','Deltoid tuberosity','Trochlea','Olecranon fossa'],answer:1,
    explanation:'Its insertion is the roughened lateral deltoid tuberosity.',source:source('8-chapter-review'),
  },
  {
    id:'bone-acromion',category:'bones',bone:'scapula',view:'anterior',landmark:'acromion',
    prompt:'Identify the marked lateral continuation of the scapular spine.',
    options:['Coracoid','Glenoid','Acromion','Inferior angle'],answer:2,
    explanation:'The acromion forms the scapular side of the acromioclavicular joint.',source:source('8-1-the-pectoral-girdle'),
  },
  {
    id:'muscle-deltoid',category:'muscles',
    prompt:'Which action is especially associated with the middle fibers of deltoid?',
    options:['Elbow flexion','Shoulder abduction','Forearm pronation','Wrist extension'],answer:1,
    explanation:'Middle deltoid fibers lift the humerus laterally away from the trunk.',source:source('11-5-muscles-of-the-pectoral-girdle-and-upper-limbs'),
  },
  {
    id:'muscle-biceps',category:'muscles',
    prompt:'Which pair of actions best describes biceps brachii at the elbow and forearm?',
    options:['Extension and pronation','Flexion and pronation','Flexion and supination','Extension and supination'],answer:2,
    explanation:'Biceps bends the elbow and turns the forearm toward palm-up.',source:source('11-5-muscles-of-the-pectoral-girdle-and-upper-limbs'),
  },
  {
    id:'muscle-triceps',category:'muscles',
    prompt:'Which muscle inserts on the olecranon and extends the elbow?',
    options:['Brachialis','Biceps brachii','Deltoid','Triceps brachii'],answer:3,
    explanation:'The triceps tendon attaches to the ulna at the olecranon.',source:source('11-5-muscles-of-the-pectoral-girdle-and-upper-limbs'),
  },
  {
    id:'muscle-serratus',category:'muscles',
    prompt:'Serratus anterior helps move the scapula forward around the rib cage. What is this movement?',
    options:['Retraction','Depression','Protraction','Elevation'],answer:2,
    explanation:'Protraction carries the scapula anteriorly; retraction draws it medially.',source:source('11-5-muscles-of-the-pectoral-girdle-and-upper-limbs'),
  },
  {
    id:'muscle-iliopsoas',category:'muscles',
    prompt:'Iliacus and psoas major converge on the lesser trochanter. Their shared major action is what?',
    options:['Hip flexion','Knee extension','Ankle dorsiflexion','Hip extension'],answer:0,
    explanation:'The iliopsoas group pulls the femur forward at the hip.',source:source('11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
  },
  {
    id:'muscle-quadriceps',category:'muscles',
    prompt:'What action do all four quadriceps femoris muscles share?',
    options:['Knee flexion','Hip extension','Ankle plantar flexion','Knee extension'],answer:3,
    explanation:'All extend the knee through the quadriceps tendon, patella, and patellar ligament.',source:source('11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
  },
  {
    id:'muscle-rectus-femoris',category:'muscles',
    prompt:'Which quadriceps muscle crosses both the hip and knee?',
    options:['Vastus lateralis','Rectus femoris','Vastus medialis','Vastus intermedius'],answer:1,
    explanation:'Rectus femoris can flex the hip as well as extend the knee.',source:source('11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
  },
  {
    id:'muscle-gluteus-maximus',category:'muscles',
    prompt:'Rising forcefully from a low chair requires strong hip extension. Which muscle is a major contributor?',
    options:['Iliacus','Sartorius','Gluteus maximus','Rectus femoris'],answer:2,
    explanation:'Gluteus maximus is a powerful hip extensor, especially when extending a flexed hip.',source:source('11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs'),
  },
  {
    id:'tissue-squamous',category:'tissues',
    prompt:'A lining has one layer of thin, flattened cells, suited to rapid diffusion. Which tissue fits?',
    options:['Stratified squamous epithelium','Simple squamous epithelium','Simple cuboidal epithelium','Transitional epithelium'],answer:1,
    explanation:'One layer is simple; flattened cells are squamous. The thin barrier supports exchange.',source:source('4-2-epithelial-tissue'),
  },
  {
    id:'tissue-stratified',category:'tissues',
    prompt:'An epithelium has many layers with flattened surface cells. Which classification fits?',
    options:['Simple columnar','Simple squamous','Stratified squamous','Dense regular connective'],answer:2,
    explanation:'Stratified denotes multiple layers; epithelial shape is named using the cells at the free surface.',source:source('4-2-epithelial-tissue'),
  },
  {
    id:'tissue-tendon',category:'tissues',
    prompt:'A tendon has densely packed, parallel collagen bundles with scattered fibroblast nuclei. Which tissue is this?',
    options:['Dense regular connective tissue','Areolar connective tissue','Hyaline cartilage','Simple cuboidal epithelium'],answer:0,
    explanation:'Parallel collagen supports strong tensile loading mainly along one axis.',source:source('4-3-connective-tissue-supports-and-protects'),
  },
  {
    id:'tissue-cartilage',category:'tissues',
    prompt:'Rounded cells sit in lacunae within a glassy matrix. What is the best identification?',
    options:['Adipose tissue','Nervous tissue','Dense regular connective tissue','Hyaline cartilage'],answer:3,
    explanation:'Hyaline cartilage contains chondrocytes in lacunae and a relatively uniform-looking matrix.',source:source('4-3-connective-tissue-supports-and-protects'),
  },
  {
    id:'tissue-skeletal',category:'tissues',
    prompt:'Long, unbranched, striated fibers contain many nuclei near their edges. Identify the tissue.',
    options:['Smooth muscle','Cardiac muscle','Skeletal muscle','Nervous tissue'],answer:2,
    explanation:'Skeletal fibers are multinucleated and striated, with peripheral nuclei.',source:source('4-4-muscle-tissue-and-motion'),
  },
  {
    id:'tissue-cardiac',category:'tissues',
    prompt:'Branched, striated cells have central nuclei and intercalated discs. Identify the tissue.',
    options:['Skeletal muscle','Cardiac muscle','Smooth muscle','Dense irregular connective tissue'],answer:1,
    explanation:'Intercalated discs and branching distinguish cardiac muscle from skeletal muscle.',source:source('4-4-muscle-tissue-and-motion'),
  },
  {
    id:'tissue-neuron',category:'tissues',
    prompt:'A tissue contains cells with branching dendrites and a long axon, together with supporting glia. What is it?',
    options:['Epithelial','Connective','Muscle','Nervous'],answer:3,
    explanation:'Neurons transmit signals; glial cells support and regulate the neural environment.',source:source('4-5-nervous-tissue-mediates-perception-and-response'),
  },
  {
    id:'physio-feedback',category:'physiology',
    prompt:'Body temperature rises; sweating increases heat loss and brings temperature down. What kind of control is this?',
    options:['Negative feedback','Positive feedback','Feedforward only','No feedback'],answer:0,
    explanation:'The response opposes the initial deviation from the regulated range.',source:source('1-5-homeostasis'),
  },
  {
    id:'physio-effector',category:'physiology',
    prompt:'In a temperature-control loop, which component directly produces the cooling response by secreting sweat?',
    options:['Temperature receptor','Control center','Sweat gland effector','Set point'],answer:2,
    explanation:'An effector carries out the response ordered by the control system.',source:source('1-5-homeostasis'),
  },
  {
    id:'physio-calcium',category:'physiology',
    prompt:'In skeletal muscle, calcium binds which protein to help expose actin binding sites?',
    options:['Myosin','Troponin','Tropomyosin directly','Acetylcholinesterase'],answer:1,
    explanation:'Calcium binding changes troponin shape, moving tropomyosin away from binding sites.',source:source('10-3-muscle-fiber-contraction-and-relaxation'),
  },
  {
    id:'physio-atp',category:'physiology',
    prompt:'What event directly allows an attached myosin head to release actin during cross-bridge cycling?',
    options:['Calcium leaving troponin','Acetylcholine breakdown','ATP binding to myosin','Sodium leaving the cell'],answer:2,
    explanation:'ATP binding detaches the cross-bridge; ATP hydrolysis then re-energizes the head.',source:source('10-3-muscle-fiber-contraction-and-relaxation'),
  },
  {
    id:'physio-sliding',category:'physiology',
    prompt:'During skeletal muscle shortening, what happens to the thick and thin filaments?',
    options:['Both shorten','Thick filaments shorten only','Thin filaments shorten only','They slide past one another without shortening'],answer:3,
    explanation:'Sarcomeres shorten through greater overlap; filament lengths remain essentially constant.',source:source('10-3-muscle-fiber-contraction-and-relaxation'),
  },
  {
    id:'physio-depolarization',category:'physiology',
    prompt:'Which ion movement primarily drives the rapid rising phase of a typical neuronal action potential?',
    options:['Sodium entering the cell','Potassium entering the cell','Sodium leaving the cell','Chloride entering the cell'],answer:0,
    explanation:'Voltage-gated sodium channels open, allowing inward sodium current and rapid depolarization.',source:source('12-4-the-action-potential'),
  },
  {
    id:'physio-pump',category:'physiology',
    prompt:'Why does the sodium–potassium pump need ATP?',
    options:['It moves ions only down their gradients','It moves ions against their concentration gradients','It opens every sodium channel','It produces neurotransmitter'],answer:1,
    explanation:'Active transport maintains the unequal ion distributions needed for normal electrical signaling.',source:source('12-4-the-action-potential'),
  },
];

export type CurriculumModule = {
  id: string;
  title: string;
  chapter: string;
  description: string;
  category: string;
  topics: string[];
  source: string;
  semester: 1 | 2;
};

export const modules: CurriculumModule[] = [
  {id:'foundations',title:'The language of anatomy',chapter:'Ch. 1–3',description:'Build the vocabulary and cellular foundations used throughout A&P.',category:'Foundations',topics:['Anatomical position','Directional terms and body planes','Homeostasis','Cell structure and membrane transport'],source:source('1-introduction'),semester:1},
  {id:'tissues',title:'Tissues & histology',chapter:'Ch. 4',description:'Distinguish tissue families by cell shape, arrangement, matrix, and function.',category:'tissues',topics:['Epithelial classification','Connective tissue and extracellular matrix','Skeletal, cardiac, and smooth muscle','Neurons and glia'],source:source('4-introduction'),semester:1},
  {id:'integument',title:'Skin & integument',chapter:'Ch. 5',description:'Connect skin layers and accessory structures with protection and regulation.',category:'Systems',topics:['Epidermal strata','Dermis and hypodermis','Hair, glands, and nails','Repair and thermoregulation'],source:source('5-introduction'),semester:1},
  {id:'bones',title:'Bones & landmarks',chapter:'Ch. 6–8',description:'Learn skeletal organization, bone markings, articulations, and anatomical side.',category:'bones',topics:['Bone tissue and remodeling','Axial skeleton','Appendicular skeleton','Landmark identification and laterality'],source:source('8-introduction'),semester:1},
  {id:'joints',title:'Joints & movement',chapter:'Ch. 9',description:'Use joint structure to explain permitted movements and stability.',category:'bones',topics:['Structural and functional joint classes','Synovial joint anatomy','Planes of movement','Major joint examples'],source:source('9-introduction'),semester:1},
  {id:'muscles',title:'Muscles & attachments',chapter:'Ch. 10–11',description:'Link attachment sites, line of pull, and muscle action to movement.',category:'muscles',topics:['Sarcomeres and contraction','Origins and insertions','Major axial and appendicular muscles','Agonists, antagonists, and synergists'],source:source('11-introduction'),semester:1},
  {id:'nervous',title:'Nervous system',chapter:'Ch. 12–16',description:'Connect neural structures with sensation, signaling, and motor responses.',category:'Systems',topics:['Neurons and action potentials','Brain and spinal cord','Peripheral and autonomic pathways','Special senses and reflexes'],source:source('12-introduction'),semester:1},
  {id:'endocrine',title:'Endocrine regulation',chapter:'Ch. 17',description:'Follow hormonal signals from glands to targets and feedback loops.',category:'physiology',topics:['Endocrine glands','Hormones and receptors','Hypothalamus and pituitary','Hormonal feedback'],source:source('17-introduction'),semester:2},
  {id:'cardiovascular',title:'Blood, heart & vessels',chapter:'Ch. 18–20',description:'Trace blood flow and connect cardiovascular anatomy with circulation.',category:'Systems',topics:['Blood cells and hemostasis','Heart chambers and valves','Conduction and cardiac cycle','Major vessels and blood pressure'],source:source('19-introduction'),semester:2},
  {id:'lymphatic',title:'Lymphatics & immunity',chapter:'Ch. 21',description:'Connect lymphatic structures with fluid return and immune defense.',category:'Systems',topics:['Lymphatic vessels and nodes','Thymus and spleen','Innate defenses','Adaptive immune responses'],source:source('21-introduction'),semester:2},
  {id:'respiratory',title:'Respiration & gas exchange',chapter:'Ch. 22',description:'Follow air through the respiratory tract and explain gas movement.',category:'Systems',topics:['Airways and lungs','Ventilation mechanics','Alveolar exchange','Transport and respiratory control'],source:source('22-introduction'),semester:2},
  {id:'digestive',title:'Digestion & metabolism',chapter:'Ch. 23–24',description:'Relate digestive structures to processing, absorption, and energy use.',category:'Systems',topics:['Alimentary canal histology','Accessory digestive organs','Digestion and absorption','Nutrient metabolism'],source:source('23-introduction'),semester:2},
  {id:'urinary',title:'Urinary system & fluid balance',chapter:'Ch. 25–26',description:'Trace filtrate through the nephron and connect renal function with balance.',category:'physiology',topics:['Kidney and nephron anatomy','Filtration, reabsorption, and secretion','Water and electrolyte regulation','Acid–base balance'],source:source('25-introduction'),semester:2},
  {id:'reproductive',title:'Reproduction & development',chapter:'Ch. 27–28',description:'Connect reproductive anatomy, hormonal cycles, and early development.',category:'Systems',topics:['Male and female reproductive structures','Gametogenesis','Reproductive hormones and cycles','Fertilization, pregnancy, and development'],source:source('27-introduction'),semester:2},
];
