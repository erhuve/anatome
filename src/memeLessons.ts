import { modelPromptPools, type ModelCollection, type ModelPrompt } from './modelQuiz';

export const memeTopics = ['Muscles', 'Bones & landmarks', 'Nerves', 'Blood & circulation', 'Organs', 'Cells & metabolism'] as const;
export type MemeTopic = typeof memeTopics[number];
export type MemeQuestion = { id: string; prompt: string; answer: string; options: string[]; explanation: string };
type QuestionDraft = Omit<MemeQuestion, 'id'>;
type ModelLink = { collection: ModelCollection; groups?: string[]; answers?: string[]; ids?: string[] };
export type MemeLesson = {
  id: string; topic: MemeTopic; title: string; connection: string; notes: string[]; hook: string;
  reference: string; questions: MemeQuestion[]; models: ModelLink[];
};
const ref = (page: string) => `https://openstax.org/books/anatomy-and-physiology-2e/pages/${page}`;
const question = (prompt: string, answer: string, wrong: [string, string, string], explanation: string): QuestionDraft => ({ prompt, answer, options: [answer, ...wrong], explanation });
function lesson(id: string, topic: MemeTopic, title: string, connection: string, notes: string[], hook: string, page: string, questions: QuestionDraft[], models: ModelLink[] = []): MemeLesson {
  return { id, topic, title, connection, notes, hook, reference: ref(page), questions: questions.map((q, i) => ({ ...q, id: `meme-${id}-q${i + 1}` })), models };
}
const muscles = (...groups: string[]): ModelLink => ({ collection: 'muscles', groups });
const bones = (...answers: string[]): ModelLink => ({ collection: 'skeleton', answers });
const landmarks = (...ids: string[]): ModelLink => ({ collection: 'landmarks', ids: ids.map(id => `model-landmark-${id}`) });

/** Original study wording and questions, linked to the indicated textbook sections. */
export const memeLessons: MemeLesson[] = [
  lesson('01', 'Muscles', 'Calcium opens the binding sites', 'The relationship drama is a memory cue for skeletal muscle contraction.', [
    'Calcium binds troponin; this shifts tropomyosin away from myosin-binding sites on actin.',
    'Myosin binds actin and pulls during the cross-bridge cycle. ATP binding lets myosin detach.',
    'Calcium is pumped back into the sarcoplasmic reticulum during relaxation.'
  ], 'Calcium → troponin → tropomyosin moves → actin is available.', '10-3-muscle-fiber-contraction-and-relaxation', [
    question('In skeletal muscle, which protein binds the calcium that initiates contraction?', 'Troponin', ['Tropomyosin', 'Myosin', 'Collagen'], 'Calcium binds troponin, changing the position of the troponin–tropomyosin complex.'),
    question('What directly causes a myosin head to detach from actin?', 'ATP binding to myosin', ['Calcium binding to actin', 'ADP binding to troponin', 'Sodium leaving the cell'], 'A new ATP molecule must bind myosin for detachment; ATP hydrolysis then re-energizes the head.'),
    question('Where is most of the released calcium returned during muscle relaxation?', 'Sarcoplasmic reticulum', ['Nucleus', 'Extracellular matrix', 'Mitochondrial cristae'], 'Calcium pumps return it to the sarcoplasmic reticulum, allowing binding sites to be covered again.')
  ], [muscles('Biceps brachii', 'Triceps brachii')]),
  lesson('02', 'Cells & metabolism', 'The sodium–potassium pump', 'The passing cars show the two ions moving in opposite directions.', [
    'Each pump cycle uses one ATP to send three Na⁺ out and bring two K⁺ in.',
    'These ions move against their concentration gradients: primary active transport.',
    'The pump maintains gradients; voltage-gated channels produce the rapid phases of a neuronal action potential.'
  ], '3 Na⁺ out, 2 K⁺ in: “pump K in.”', '3-1-the-cell-membrane', [
    question('For one ATP, the sodium–potassium pump moves which combination?', '3 Na⁺ out; 2 K⁺ in', ['2 Na⁺ out; 3 K⁺ in', '3 Na⁺ in; 2 K⁺ out', '2 Na⁺ in; 2 K⁺ out'], 'Three sodium ions leave and two potassium ions enter per cycle.'),
    question('Which type of transport is performed by this ATPase?', 'Primary active transport', ['Simple diffusion', 'Osmosis', 'Facilitated diffusion'], 'It directly uses ATP to transport ions against their gradients.'),
    question('Which description best separates a pump from a voltage-gated channel?', 'The pump uses ATP; an open channel permits passive ion flow', ['Both always pump ions uphill', 'Only the channel uses ATP directly', 'The pump moves only water'], 'Ion channels allow flow down electrochemical gradients; this pump directly consumes ATP.')
  ]),
  lesson('03', 'Nerves', 'Reading an action potential', 'Your neurons can do the thing you are trying to understand.', [
    'In a typical neuronal action potential, voltage-gated Na⁺ channels drive rapid depolarization.',
    'Na⁺ channel inactivation and opening K⁺ channels help repolarize the membrane.',
    'K⁺ conductance can remain elevated briefly, producing an after-hyperpolarization.'
  ], 'Na⁺ rushes in; K⁺ heads out.', '12-4-the-action-potential', [
    question('Which ion movement mainly produces the rapid rising phase in a typical neuron?', 'Na⁺ entering through voltage-gated channels', ['K⁺ entering through sodium channels', 'Na⁺ leaving through the ATPase', 'Chloride leaving the nucleus'], 'Na⁺ influx makes the membrane potential more positive.'),
    question('What ion movement mainly helps repolarize that neuron?', 'K⁺ leaving the cell', ['K⁺ entering the cell', 'Calcium entering the nucleus', 'Glucose leaving the cell'], 'Opening voltage-gated K⁺ channels permits outward K⁺ movement.'),
    question('Why can the membrane briefly become more negative than its resting value?', 'K⁺ conductance stays elevated after the spike', ['The cell loses all its ATP', 'All membrane channels permanently close', 'The nucleus reverses its charge'], 'Some K⁺ channels close slowly, so outward current can persist after repolarization.')
  ]),
  lesson('04', 'Blood & circulation', 'Hemoglobin and carbon monoxide', 'The distracted boyfriend is hemoglobin choosing a dangerous binding partner.', [
    'Carbon monoxide competes with oxygen for heme binding sites on hemoglobin.',
    'Its much greater affinity reduces hemoglobin’s oxygen-carrying capacity.',
    'CO binding also makes remaining bound oxygen harder to release to tissues.'
  ], 'Affinity is attraction; strong attraction can be dangerous.', '22-5-transport-of-gases', [
    question('Which gas binds hemoglobin with much greater affinity than oxygen?', 'Carbon monoxide', ['Nitrogen', 'Helium', 'Hydrogen'], 'CO binds heme strongly and interferes with oxygen transport.'),
    question('What happens to oxygen-carrying capacity when CO occupies heme sites?', 'It decreases', ['It doubles', 'It becomes unlimited', 'It is replaced by plasma glucose'], 'Sites occupied by CO are unavailable for carrying oxygen.'),
    question('Which hemoglobin component contains the iron that binds oxygen?', 'Heme', ['Albumin', 'Fibrin', 'Platelet membrane'], 'Each heme group contains an iron ion that can bind one oxygen molecule.')
  ]),
  lesson('05', 'Blood & circulation', 'Hemoglobin versus myoglobin', 'The meme compares oxygen capacity, not which protein is “better.”', [
    'Hemoglobin has four heme-containing subunits and carries up to four O₂ molecules.',
    'Myoglobin has one heme group and binds one O₂ molecule in muscle cells.',
    'Hemoglobin supports blood transport; myoglobin helps store and supply oxygen within muscle.'
  ], 'Hemo travels in blood; myo stays in muscle.', '10-2-skeletal-muscle', [
    question('How many O₂ molecules can one fully loaded hemoglobin carry?', 'Four', ['One', 'Two', 'Eight'], 'Each of its four heme groups can bind one O₂ molecule.'),
    question('Where is myoglobin especially associated with oxygen storage?', 'Muscle cells', ['Blood plasma', 'Bone mineral', 'Bile ducts'], 'Myoglobin is an oxygen-binding protein in muscle fibers.'),
    question('Which comparison is correct?', 'Myoglobin has one heme; hemoglobin has four', ['Myoglobin has four hemes; hemoglobin has one', 'Neither protein contains heme', 'Both are enzymes that break down oxygen'], 'The different subunit structures support their different physiological roles.')
  ]),
  lesson('06', 'Bones & landmarks', 'Name the skeletal regions', 'The labeled skeleton gives a starting point for the same identification work as the 3D atlas.', [
    'The cranium encloses the brain; the mandible forms the lower jaw.',
    'The humerus is an upper-arm bone, while ribs belong to the thoracic cage.',
    'Thoracic vertebrae articulate with ribs and are part of the axial skeleton.'
  ], 'Arm: humerus. Lower jaw: mandible. Chest: ribs.', '7-1-divisions-of-the-skeletal-system', [
    question('Which bone forms the lower jaw?', 'Mandible', ['Maxilla', 'Humerus', 'Scapula'], 'The mandible is the lower jaw; the maxilla forms the upper jaw.'),
    question('Which bone belongs to the upper arm?', 'Humerus', ['Femur', 'Tibia', 'Radius'], 'The humerus extends from the shoulder to the elbow.'),
    question('Which vertebral region is associated with rib articulations?', 'Thoracic', ['Cervical', 'Lumbar', 'Coccygeal'], 'Thoracic vertebrae provide articular facets for the ribs.')
  ], [bones('Mandible', 'Right humerus', 'Frontal bone', 'First thoracic vertebra')]),
  lesson('07', 'Muscles', 'Decode sternocleidomastoid', 'The overwhelming neck diagram becomes easier when its long muscle name describes attachments.', [
    'Sterno- refers to the sternum, cleido- to the clavicle, and mastoid to a process of the temporal bone.',
    'A unilateral sternocleidomastoid contraction rotates the head toward the opposite side.',
    'Identify the muscle on the anterolateral neck before memorizing the full name.'
  ], 'Sternum + clavicle → mastoid process.', '11-3-axial-muscles-of-the-head-neck-and-back', [
    question('The “cleido” part of sternocleidomastoid refers to which bone?', 'Clavicle', ['Scapula', 'Mandible', 'Sphenoid'], 'The clavicular head is reflected in the cleido- part of the name.'),
    question('The mastoid process is part of which bone?', 'Temporal bone', ['Humerus', 'Sternum', 'Occipital condyle'], 'The muscle attaches to the mastoid process of the temporal bone.'),
    question('An isolated right sternocleidomastoid contraction tends to turn the face which way?', 'To the left', ['To the right', 'Straight upward only', 'It cannot rotate the head'], 'Unilateral contraction rotates the head contralaterally, toward the opposite side.')
  ], [muscles('Sternocleidomastoid')]),
  lesson('08', 'Bones & landmarks', 'Bone is living tissue', 'The exhausted student skeleton is a cue to study the cells that continually renew bone.', [
    'Osteoblasts build new bone matrix; osteoclasts resorb bone.',
    'Osteocytes are mature bone cells embedded in the matrix.',
    'Remodeling balances formation and resorption and responds to mechanical loading.'
  ], 'Blasts build; clasts clear.', '6-3-bone-structure', [
    question('Which cells secrete new bone matrix?', 'Osteoblasts', ['Osteoclasts', 'Erythrocytes', 'Neutrophils'], 'Osteoblasts are bone-forming cells.'),
    question('Which cells perform bone resorption?', 'Osteoclasts', ['Osteocytes', 'Chondroblasts', 'Fibrocytes'], 'Osteoclasts break down bone matrix during remodeling.'),
    question('A mature bone cell housed in a lacuna is called what?', 'Osteocyte', ['Osteon', 'Sarcomere', 'Neuron'], 'Osteocytes reside within lacunae in mineralized bone matrix.')
  ], [bones('Right femur', 'Right humerus')]),
  lesson('09', 'Cells & metabolism', 'Krebs cycle essentials', 'Start with location and outputs before trying to memorize every intermediate.', [
    'In human cells, the citric acid cycle operates in the mitochondrial matrix.',
    'Acetyl-CoA joins oxaloacetate to form citrate; oxaloacetate is regenerated.',
    'Each turn yields three NADH, one FADH₂, one GTP (or ATP equivalent), and two CO₂.'
  ], 'Per turn: 3 NADH, 1 FADH₂, 1 GTP, 2 CO₂.', '24-2-carbohydrate-metabolism', [
    question('Where does the citric acid cycle occur in human cells?', 'Mitochondrial matrix', ['Cytosol only', 'Golgi lumen', 'Nucleus'], 'Its enzymes are associated with the matrix, with succinate dehydrogenase in the inner membrane.'),
    question('What two-carbon input combines with oxaloacetate?', 'Acetyl-CoA', ['Lactate', 'Glycogen', 'Glucose-6-phosphate'], 'Acetyl-CoA contributes two carbons to form six-carbon citrate.'),
    question('How many NADH are produced per turn of the cycle itself?', 'Three', ['One', 'Two', 'Six'], 'One turn produces three NADH; a glucose supplies two acetyl-CoA and therefore two turns.')
  ]),
  lesson('10', 'Bones & landmarks', 'Axial versus appendicular', 'Use the resting skeleton to sort the body’s framework into its two divisions.', [
    'The axial skeleton includes the skull, vertebral column, and thoracic cage.',
    'The appendicular skeleton includes the limbs and their pectoral and pelvic girdles.',
    'A bone’s location and articulations are better identification cues than memorizing a count alone.'
  ], 'Axial = axis; appendicular = appendages and their girdles.', '7-1-divisions-of-the-skeletal-system', [
    question('Which structure belongs to the axial skeleton?', 'Sternum', ['Scapula', 'Humerus', 'Hip bone'], 'The sternum is part of the thoracic cage.'),
    question('Which structure belongs to the appendicular skeleton?', 'Scapula', ['Mandible', 'Sacrum', 'Thoracic vertebra'], 'The scapula is part of the pectoral girdle.'),
    question('The pelvic girdle belongs to which division?', 'Appendicular', ['Axial', 'Cranial', 'Visceral'], 'The girdle attaches the lower limbs to the axial skeleton.')
  ], [bones('Right scapula', 'Right hip bone', 'Mandible')]),
  lesson('11', 'Bones & landmarks', 'Orientation before identification', 'The anatomy-study joke links to a useful practical habit: establish anatomical position first.', [
    'In anatomical position, the body faces forward and the palms face anteriorly.',
    'A sagittal plane separates left and right; a frontal plane separates anterior and posterior.',
    'A transverse plane separates superior and inferior portions.'
  ], 'Sagittal: sides. Frontal: front/back. Transverse: top/bottom.', '1-6-anatomical-terminology', [
    question('In standard anatomical position, the palms face which direction?', 'Anteriorly', ['Posteriorly', 'Medially toward each other', 'Superiorly above the head'], 'Anatomical position standardizes directional descriptions with palms forward.'),
    question('Which plane divides a body into anterior and posterior portions?', 'Frontal (coronal)', ['Sagittal', 'Transverse', 'Midsagittal'], 'The frontal plane separates front from back.'),
    question('Which plane divides superior and inferior portions?', 'Transverse', ['Frontal', 'Parasagittal', 'Midsagittal'], 'A transverse section cuts across the long axis of the body.')
  ], [bones('Right radius', 'Right ulna', 'Right humerus')]),
  lesson('12', 'Cells & metabolism', 'Four major tissue types', 'The impossible exam is general student humor; its linked topic is a foundational A&P classification.', [
    'Epithelial tissue covers and lines surfaces and forms glands.',
    'Connective tissue supports and binds; bone, blood, and cartilage are examples.',
    'Muscle tissue contracts; nervous tissue supports rapid signaling.'
  ], 'Cover, connect, contract, communicate.', '4-1-types-of-tissues', [
    question('Which major tissue type includes both bone and blood?', 'Connective', ['Epithelial', 'Muscle', 'Nervous'], 'Connective tissues include a broad range of cells and extracellular matrices.'),
    question('Which major tissue type lines body surfaces and passageways?', 'Epithelial', ['Connective', 'Skeletal muscle', 'Nervous'], 'Epithelia form coverings, linings, and glands.'),
    question('Which tissue is specialized to shorten and generate force?', 'Muscle', ['Epithelial', 'Adipose', 'Cartilage'], 'Muscle cells use contractile proteins to develop tension.')
  ]),
  lesson('13', 'Nerves', 'Brain regions and memory', 'The brain blanking during an exam is a joke, not a diagnosis; use it to review major brain roles.', [
    'The hippocampus is important for forming new declarative memories.',
    'The cerebellum helps coordinate movement and motor learning.',
    'The hypothalamus helps regulate homeostasis, including temperature and hunger.'
  ], 'Hippocampus: new memories. Cerebellum: coordination. Hypothalamus: homeostasis.', '13-2-the-central-nervous-system', [
    question('Which structure is especially important for forming new declarative memories?', 'Hippocampus', ['Medulla', 'Primary visual cortex', 'Cerebellar vermis'], 'The hippocampus is a key part of the network for forming new declarative memories.'),
    question('Which brain region is strongly associated with movement coordination?', 'Cerebellum', ['Hypothalamus', 'Pineal gland', 'Hippocampus'], 'The cerebellum compares and adjusts motor activity.'),
    question('Which structure helps regulate body temperature and hunger?', 'Hypothalamus', ['Caudate nucleus', 'Corpus callosum', 'Occipital cortex'], 'The hypothalamus integrates several homeostatic functions.')
  ]),
  lesson('14', 'Bones & landmarks', 'What the skeleton does', 'The boneless joke points to the supportive role of the skeletal system.', [
    'Bone supports the body and provides levers for skeletal muscles.',
    'The cranium protects the brain and the vertebral column protects the spinal cord.',
    'Red marrow forms blood cells; mineralized bone stores calcium and phosphate.'
  ], 'Support, protect, move, store, make blood.', '6-1-the-functions-of-the-skeletal-system', [
    question('Which skeletal structure directly surrounds and protects the brain?', 'Cranium', ['Pelvic girdle', 'Sternum', 'Scapula'], 'The cranial bones form the protective case around the brain.'),
    question('Where does blood cell production occur in healthy bone tissue?', 'Red bone marrow', ['Articular cartilage', 'Yellow ligament', 'Compact bone mineral alone'], 'Red marrow is a major site of hematopoiesis.'),
    question('Which minerals are stored in substantial amounts in bone?', 'Calcium and phosphate', ['Sodium and chloride only', 'Iron and iodine only', 'Potassium and fluoride only'], 'The mineral component of bone includes calcium phosphate crystals.')
  ], [bones('Frontal bone', 'Right femur')]),
  lesson('15', 'Bones & landmarks', 'Know your humerus', 'The classic pun is also a cue to distinguish an upper-arm bone from a forearm bone.', [
    'The humeral head articulates with the glenoid cavity of the scapula.',
    'The distal humerus articulates with the radius and ulna at the elbow.',
    'The olecranon fossa is a posterior distal landmark; the humeral head faces medially.'
  ], 'Head toward the shoulder; olecranon fossa behind the elbow.', '8-2-bones-of-the-upper-limb', [
    question('The head of the humerus articulates with which structure?', 'Glenoid cavity of the scapula', ['Acetabulum', 'Tibial plateau', 'Mandibular fossa'], 'The glenoid cavity receives the humeral head at the shoulder.'),
    question('Which two bones articulate with the distal humerus?', 'Radius and ulna', ['Tibia and fibula', 'Scapula and clavicle', 'Femur and patella'], 'These forearm bones meet the humerus at the elbow.'),
    question('Where is the olecranon fossa?', 'Posterior distal humerus', ['Anterior proximal humerus', 'Medial scapula', 'Distal radius'], 'It receives the ulna’s olecranon during elbow extension.')
  ], [bones('Right humerus', 'Left humerus'), landmarks('humerus-head', 'olecranon-fossa')]),
  lesson('16', 'Nerves', 'Central and peripheral', 'The spooky nervous-system display includes structures from both divisions.', [
    'The central nervous system consists of the brain and spinal cord.',
    'Nerves outside the CNS are part of the peripheral nervous system.',
    'A ganglion is a collection of neuron cell bodies in the PNS; a nucleus is such a collection in the CNS.'
  ], 'CNS = brain + spinal cord; PNS connects them to the body.', '12-1-basic-structure-and-function-of-the-nervous-system', [
    question('Which pair makes up the CNS?', 'Brain and spinal cord', ['Brain and sciatic nerve', 'Spinal nerves and ganglia', 'Cranial nerves and skeletal muscles'], 'The CNS comprises the brain and spinal cord.'),
    question('A spinal nerve belongs to which division?', 'Peripheral nervous system', ['Central nervous system', 'Endocrine system', 'Ventricular system'], 'Spinal nerves carry signals between the spinal cord and peripheral structures.'),
    question('A cluster of neuron cell bodies outside the CNS is a what?', 'Ganglion', ['Tract', 'Fascicle of muscle', 'Cerebral nucleus'], 'Ganglia are PNS clusters of cell bodies; nuclei are CNS clusters.')
  ]),
  lesson('17', 'Nerves', 'Somatic and autonomic output', '“You look nervous” is a cue for comparing nervous-system motor divisions.', [
    'Somatic motor neurons innervate skeletal muscle.',
    'Autonomic pathways regulate cardiac muscle, smooth muscle, and glands.',
    'Sympathetic and parasympathetic divisions help adjust organ activity to changing demands.'
  ], 'Somatic: skeletal. Autonomic: organs and glands.', '15-1-divisions-of-the-autonomic-nervous-system', [
    question('Which motor division innervates skeletal muscle?', 'Somatic', ['Parasympathetic only', 'Sympathetic only', 'Enteric sensory only'], 'Somatic motor pathways control skeletal muscle contraction.'),
    question('Which target is normally controlled by autonomic motor pathways?', 'Cardiac muscle', ['Biceps brachii', 'Quadriceps femoris', 'Deltoid'], 'Autonomic pathways regulate the heart, smooth muscle, and glands.'),
    question('Which is a typical sympathetic response?', 'Increased heart rate', ['Increased digestive motility as its primary response', 'Pupil constriction for near vision', 'Voluntary elbow flexion'], 'Sympathetic activation can raise heart rate to meet increased demand.')
  ]),
  lesson('18', 'Nerves', 'Neuron parts and glia', 'Being a nervous system takes specialized cells as well as an intimidating outline.', [
    'Dendrites receive many incoming signals; the soma contains the nucleus.',
    'An axon conducts action potentials toward its terminals.',
    'Myelin insulates axons; Schwann cells form PNS myelin and oligodendrocytes form CNS myelin.'
  ], 'Dendrites receive; axons send. Schwann = peripheral.', '12-2-nervous-tissue', [
    question('Which part of a neuron generally receives incoming synaptic signals?', 'Dendrites', ['Myelin lipids', 'Axon terminals only', 'Nuclear envelope'], 'Dendrites provide extensive receptive surfaces.'),
    question('Which glial cells form myelin in the PNS?', 'Schwann cells', ['Oligodendrocytes', 'Microglia', 'Ependymal cells'], 'Schwann cells wrap peripheral axons; oligodendrocytes serve the CNS.'),
    question('What is a major effect of myelination?', 'Faster action-potential conduction', ['Replacement of the axon with bone', 'Elimination of all ion channels', 'Production of red blood cells'], 'Myelin enables rapid saltatory conduction between nodes.')
  ]),
  lesson('19', 'Nerves', 'Afferent and efferent', 'All those nerves carry information in organized directions.', [
    'Afferent pathways carry sensory information toward the CNS.',
    'Efferent pathways carry motor signals away from the CNS toward effectors.',
    'A mixed peripheral nerve contains both sensory and motor axons.'
  ], 'Afferent arrives; efferent exits.', '12-1-basic-structure-and-function-of-the-nervous-system', [
    question('Afferent pathways carry information in which direction?', 'Toward the CNS', ['Away from the CNS only', 'From muscle to tendon only', 'From artery to vein only'], 'Afferent sensory input arrives at the central nervous system.'),
    question('A motor signal leaving the CNS is described as what?', 'Efferent', ['Afferent', 'Avascular', 'Afferent lymph'], 'Efferent output travels to effectors such as muscle.'),
    question('A mixed spinal nerve contains which combination?', 'Sensory and motor axons', ['Only sensory cell bodies', 'Only autonomic ganglia', 'Only skeletal muscle fibers'], 'Mixed nerves carry axons traveling in both functional directions.')
  ]),
  lesson('20', 'Blood & circulation', 'Follow the two circuits', 'Heart-and-lung teamwork is a cue for tracing blood flow.', [
    'The right ventricle sends blood to the lungs through the pulmonary circuit.',
    'The left ventricle sends blood to the body through the systemic circuit.',
    'Arteries carry blood away from the heart; veins carry it toward the heart.'
  ], 'Right → lungs; left → body. Artery = away.', '19-1-heart-anatomy', [
    question('Which chamber pumps blood into the pulmonary trunk?', 'Right ventricle', ['Left ventricle', 'Right atrium', 'Left atrium'], 'The right ventricle supplies the pulmonary circuit.'),
    question('Which chamber pumps blood into the aorta?', 'Left ventricle', ['Right ventricle', 'Left atrium', 'Right atrium'], 'The left ventricle supplies the systemic circuit.'),
    question('A vessel is classified as an artery because it does what?', 'Carries blood away from the heart', ['Always carries oxygen-rich blood', 'Always has valves', 'Connects directly to alveoli'], 'Direction defines artery versus vein; oxygen content has pulmonary exceptions.')
  ]),
  lesson('21', 'Blood & circulation', 'Oxygen from alveolus to tissue', 'The oxygen gift reaches the heart through pulmonary blood flow.', [
    'Oxygen diffuses from alveolar air into pulmonary capillary blood down its partial-pressure gradient.',
    'Pulmonary veins bring oxygen-rich blood to the left atrium.',
    'Most oxygen in blood is carried bound to hemoglobin rather than dissolved in plasma.'
  ], 'Lungs → pulmonary veins → left atrium → left ventricle → body.', '22-4-gas-exchange', [
    question('What normally drives O₂ from alveolar air into pulmonary blood?', 'A partial-pressure gradient', ['A skeletal-muscle pump across the membrane', 'Active transport of whole red cells', 'Gravity alone'], 'Gases diffuse down their partial-pressure gradients.'),
    question('Pulmonary veins empty into which chamber?', 'Left atrium', ['Right atrium', 'Right ventricle', 'Aorta'], 'They return oxygenated blood from the lungs to the left atrium.'),
    question('How is most oxygen transported in blood?', 'Bound to hemoglobin', ['As bicarbonate', 'Bound to platelets', 'Dissolved in lymph only'], 'Hemoglobin carries the great majority of blood oxygen.')
  ]),
  lesson('22', 'Blood & circulation', 'Cardiac output during exercise', 'The dramatic gym organs are a cue for the heart’s response to increased demand.', [
    'Cardiac output equals heart rate multiplied by stroke volume.',
    'Stroke volume is the volume ejected by one ventricle per beat.',
    'Exercise commonly increases heart rate and stroke volume to deliver more blood to active tissues.'
  ], 'CO = HR × SV. Beats/min × mL/beat = mL/min.', '19-4-cardiac-physiology', [
    question('Which equation defines cardiac output?', 'Heart rate × stroke volume', ['Heart rate ÷ stroke volume', 'Blood pressure × lung volume', 'Stroke volume − heart rate'], 'Multiplying beats per minute by volume per beat gives volume per minute.'),
    question('At 100 beats/min and 70 mL/beat, cardiac output is what?', '7 L/min', ['0.7 L/min', '70 L/min', '170 L/min'], '100 × 70 = 7000 mL/min, which is 7 L/min.'),
    question('Stroke volume means what?', 'Blood ejected by one ventricle per beat', ['All the blood in the body', 'Air inhaled per breath', 'The number of beats per minute'], 'Stroke volume is measured per ventricular contraction, not per minute.')
  ]),
  lesson('23', 'Organs', 'A nephron’s three processes', 'The comic’s waste-filtering organ is a kidney; its job goes beyond making urine.', [
    'Filtration moves fluid and small solutes from glomerular blood into the capsular space.',
    'Reabsorption returns substances from tubular fluid to the blood.',
    'Secretion adds substances from blood to tubular fluid; excretion is their final loss in urine.'
  ], 'Reabsorb = return to blood; secrete = send to tubule.', '25-5-physiology-of-urine-formation', [
    question('Tubular reabsorption moves material in which direction?', 'Tubular fluid to blood', ['Blood to tubular fluid', 'Bladder to urethra', 'Kidney capsule to skin'], 'Reabsorption recovers filtered substances for the circulation.'),
    question('Tubular secretion moves material in which direction?', 'Blood to tubular fluid', ['Tubular fluid to blood', 'Ureter to renal artery', 'Bladder to renal vein'], 'Secretion transfers additional substances into the developing urine.'),
    question('Glomerular filtration initially moves fluid into which space?', 'Capsular (Bowman’s) space', ['Renal vein lumen', 'Urinary bladder', 'Adrenal cortex'], 'Filtrate crosses the filtration barrier into the surrounding capsule.')
  ]),
  lesson('24', 'Blood & circulation', 'Red blood cell structure', 'Hemogoblin is wordplay; hemoglobin is the oxygen-binding protein inside red blood cells.', [
    'Mature human erythrocytes have a biconcave shape and lack a nucleus.',
    'Hemoglobin contains iron-bearing heme groups that reversibly bind oxygen.',
    'Mature erythrocytes lack mitochondria and rely on glycolysis for ATP.'
  ], 'Biconcave delivery cells, packed with hemoglobin.', '18-3-erythrocytes', [
    question('Which describes a typical mature human erythrocyte?', 'Biconcave and without a nucleus', ['Cuboidal with two nuclei', 'A large myelinated cell', 'A mineralized cell in a lacuna'], 'The biconcave shape and absence of a nucleus support oxygen transport.'),
    question('Which metal is part of hemoglobin’s heme group?', 'Iron', ['Iodine', 'Sodium', 'Magnesium'], 'Heme’s iron reversibly binds oxygen.'),
    question('Why do mature red blood cells not perform mitochondrial respiration?', 'They lack mitochondria', ['They lack all enzymes', 'They contain only platelets', 'They are made of cartilage'], 'Mature erythrocytes use glycolysis and do not consume transported oxygen in mitochondria.')
  ]),
  lesson('25', 'Organs', 'Kidney, nephron, adrenal gland', 'The “hairpiece” is an adrenal gland, which is a separate endocrine organ above the kidney.', [
    'Kidneys regulate fluid, electrolytes, and acid–base balance and excrete metabolic wastes.',
    'Nephrons are the functional units that process filtrate into urine.',
    'Urine leaves via the renal pelvis, ureter, bladder, and urethra; adrenal glands do not make urine.'
  ], 'Ureter goes kidney → bladder; urethra goes bladder → outside.', '25-3-gross-anatomy-of-the-kidney', [
    question('What is the functional unit of the kidney?', 'Nephron', ['Alveolus', 'Sarcomere', 'Osteon'], 'A nephron contains the renal corpuscle and tubular segments.'),
    question('Which structure carries urine from a kidney to the bladder?', 'Ureter', ['Urethra', 'Renal artery', 'Adrenal vein'], 'Each ureter transports urine from the renal pelvis to the bladder.'),
    question('The adrenal gland is best described as what?', 'A separate endocrine gland superior to the kidney', ['The part of the bladder that stores urine', 'The kidney’s urine-filtering tubule', 'A valve inside the urethra'], 'The adrenal gland is anatomically adjacent to the kidney but has endocrine functions.')
  ]),
  lesson('26', 'Cells & metabolism', 'Homeostasis and feedback', 'The cell-membrane yoga comic is about regulation, not a perfectly unchanging internal state.', [
    'Homeostasis keeps regulated variables within workable ranges.',
    'A receptor detects change, a control center processes it, and an effector produces a response.',
    'Negative feedback counteracts a deviation; positive feedback amplifies a process until a terminating event.'
  ], 'Negative feedback nudges back toward the set point.', '1-5-homeostasis', [
    question('What does negative feedback generally do?', 'Opposes a deviation in a regulated variable', ['Amplifies every deviation indefinitely', 'Prevents all physiological changes', 'Stops all communication between cells'], 'The response counteracts the original change.'),
    question('Which component detects a change in a regulated variable?', 'Receptor', ['Effector only', 'Articular cartilage', 'Output hormone only'], 'A receptor or sensor detects the stimulus.'),
    question('Which is an example of negative feedback?', 'Sweating when body temperature rises', ['Oxytocin intensifying labor contractions', 'Platelet recruitment amplifying a clot', 'An action potential’s regenerative Na⁺ entry'], 'Evaporative cooling helps oppose the temperature increase.')
  ]),
  lesson('27', 'Cells & metabolism', 'Membrane transport vocabulary', 'The classroom joke asks for a specific example instead of repeating the category.', [
    'Simple and facilitated diffusion move substances down their gradients without direct ATP use.',
    'Primary active transport directly consumes ATP; the sodium–potassium pump is an example.',
    'Exocytosis releases vesicle contents through fusion with the plasma membrane and requires cellular energy.'
  ], 'Diffusion follows a gradient; active transport needs energy.', '3-1-the-cell-membrane', [
    question('Which is an example of primary active transport?', 'Na⁺/K⁺-ATPase', ['O₂ diffusing through a membrane', 'Water moving by osmosis', 'Glucose moving down its gradient through a carrier'], 'This ATPase directly couples ATP hydrolysis to ion movement.'),
    question('Which process releases material when a vesicle fuses with the cell membrane?', 'Exocytosis', ['Osmosis', 'Phagocytosis', 'Simple diffusion'], 'Exocytosis transfers vesicular contents to the outside of the cell.'),
    question('Facilitated diffusion differs from simple diffusion because it uses what?', 'A membrane channel or carrier', ['ATP hydrolysis in every transport event', 'A secretory vesicle', 'A gradient directed uphill'], 'Both are passive, but facilitated diffusion uses membrane proteins.')
  ]),
  lesson('28', 'Nerves', 'All-or-none does not mean one intensity', 'The love analogy refers to a single neuron’s action potential, not the whole nervous system.', [
    'Once threshold is reached, a typical axonal action potential is a full event rather than a half-sized spike.',
    'A stronger sustained stimulus can raise firing frequency rather than spike amplitude.',
    'During the absolute refractory period, another action potential cannot be initiated at that membrane segment.'
  ], 'More intense stimulus → more frequent spikes, not taller spikes.', '12-4-the-action-potential', [
    question('For a single axon, “all-or-none” primarily describes what?', 'The occurrence of a full action potential after threshold', ['Every neuron firing together', 'Every stimulus having the same intensity', 'A muscle always contracting maximally'], 'A threshold-crossing event produces a full spike in that axon.'),
    question('How can a stronger stimulus be encoded in an individual sensory neuron?', 'Higher action-potential frequency', ['Much larger action-potential amplitude', 'Conversion of the axon to a dendrite', 'Elimination of its refractory period'], 'Firing frequency can increase while individual spike amplitudes remain broadly similar.'),
    question('During an absolute refractory period, what is true?', 'Another spike cannot begin at that membrane segment', ['Only a larger-than-usual spike can occur', 'All potassium ions disappear', 'The sodium–potassium pump permanently stops'], 'Na⁺ channel inactivation prevents another spike at that segment until recovery.')
  ]),
  lesson('29', 'Muscles', 'Biceps and triceps: identify the action', 'The fancy-name joke introduces two muscles with different locations and actions.', [
    'Biceps brachii is anterior in the arm and contributes to elbow flexion and forearm supination.',
    'Triceps brachii is posterior and is the major elbow extensor.',
    'Biceps inserts on the radius; triceps inserts on the olecranon of the ulna.'
  ], 'Biceps bends; triceps straightens. Biceps also supinates.', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs', [
    question('Which is a major action of triceps brachii?', 'Elbow extension', ['Elbow flexion', 'Finger abduction', 'Forearm pronation'], 'The posterior arm muscle extends the forearm at the elbow.'),
    question('Biceps brachii inserts on which bone?', 'Radius', ['Ulna', 'Scapula only', 'Clavicle'], 'Its distal tendon attaches to the radial tuberosity.'),
    question('Which action is associated with biceps brachii in addition to elbow flexion?', 'Forearm supination', ['Knee extension', 'Finger extension', 'Ankle inversion'], 'The biceps tendon’s attachment on the radius allows it to supinate the forearm.')
  ], [muscles('Biceps brachii', 'Triceps brachii'), bones('Right radius', 'Right ulna')]),
  lesson('30', 'Muscles', 'Muscle heads and naming clues', 'The detailed middle panel names the same subdivisions you can identify in the 3D app.', [
    'Bi- and tri- in biceps and triceps refer to two and three heads, respectively.',
    'Biceps brachii has long and short heads; triceps brachii has long, lateral, and medial heads.',
    'The rotator cuff is a different group: supraspinatus, infraspinatus, teres minor, and subscapularis (SITS).'
  ], '2 biceps heads, 3 triceps heads; SITS stabilizes the shoulder.', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs', [
    question('Which pair names the two heads of biceps brachii?', 'Long and short', ['Anterior and posterior', 'Superior and inferior', 'Medial and intermediate'], 'The biceps has a long head and a short head.'),
    question('Which is a head of triceps brachii?', 'Medial head', ['Short head', 'Clavicular head', 'Sternal head'], 'The triceps has long, lateral, and medial heads.'),
    question('Which muscle is part of the rotator cuff?', 'Supraspinatus', ['Teres major', 'Trapezius', 'Biceps brachii'], 'SITS includes supraspinatus, infraspinatus, teres minor, and subscapularis; teres major is not included.')
  ], [muscles('Biceps brachii', 'Triceps brachii', 'Supraspinatus', 'Infraspinatus', 'Teres minor', 'Subscapularis')]),
  lesson('31', 'Muscles', 'Muscles cooperate during a press', 'The chest-versus-triceps debate is a cue to separate shoulder movement from elbow movement.', [
    'Pectoralis major can adduct and medially rotate the humerus and contributes to horizontal adduction.',
    'Triceps brachii extends the elbow; the anterior deltoid also contributes to pressing movements.',
    'How much each muscle contributes varies with joint position and technique, so the meme is not a ranking.'
  ], 'Pecs move the humerus; triceps opens the elbow.', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs', [
    question('Which muscle is a major elbow extensor during a press?', 'Triceps brachii', ['Biceps brachii', 'Brachialis', 'Pronator teres'], 'Triceps extends the elbow while shoulder muscles move the humerus.'),
    question('Pectoralis major primarily acts on which bone?', 'Humerus', ['Radius', 'Tibia', 'Mandible'], 'Its attachment to the humerus allows it to act across the shoulder.'),
    question('Which is an action of pectoralis major?', 'Adduction of the arm', ['Extension of the fingers', 'Dorsiflexion of the ankle', 'Extension of the knee'], 'Pectoralis major adducts and medially rotates the humerus, with actions varying by fiber region.')
  ], [muscles('Pectoralis major', 'Triceps brachii', 'Deltoid')]),
  lesson('32', 'Muscles', 'Extensor digitorum versus digiti minimi', '“Mini-Me” cues minimi: the little finger.', [
    'Extensor digitorum contributes to extension of digits 2–5.',
    'Extensor digiti minimi is a specialized extensor associated with the fifth digit.',
    'Both lie in the posterior forearm extensor compartment and receive radial-nerve pathway innervation.'
  ], 'Digitorum = digits; digiti minimi = little digit.', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs', [
    question('Extensor digiti minimi is especially associated with which digit?', 'Fifth digit (little finger)', ['First digit (thumb)', 'Second digit (index finger)', 'Great toe'], 'Minimi refers to the little finger in this forearm muscle name.'),
    question('Extensor digitorum mainly contributes to which movement?', 'Extension of digits 2–5', ['Flexion of the thumb only', 'Elbow flexion', 'Pronation only'], 'Its tendons pass to the extensor expansions of digits 2–5.'),
    question('These extensors lie primarily in which forearm compartment?', 'Posterior', ['Anterior flexor compartment', 'Thenar compartment only', 'Medial thigh compartment'], 'The posterior forearm contains the major wrist and digit extensors.')
  ], [muscles('Extensor digitorum', 'Extensor digiti minimi')]),
  lesson('33', 'Muscles', 'Trapezius fiber regions', '“It’s a trap” identifies the broad superficial upper-back muscle.', [
    'Upper (descending) fibers elevate the scapula; middle (transverse) fibers retract it.',
    'Lower (ascending) fibers depress the scapula; upper and lower fibers help upward rotation.',
    'Trapezius has motor innervation from the spinal accessory nerve (CN XI).'
  ], 'Upper lifts, middle pulls back, lower pulls down.', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs', [
    question('Which trapezius fibers are especially associated with scapular retraction?', 'Middle (transverse) fibers', ['Upper fibers only', 'Lower fibers only', 'No trapezius fibers'], 'Middle fibers pull the scapula medially.'),
    question('The upper trapezius contributes to which movement?', 'Scapular elevation', ['Elbow flexion', 'Finger extension', 'Ankle plantar flexion'], 'Upper fibers help elevate the scapula in a shrug.'),
    question('What is the primary motor nerve to trapezius?', 'Spinal accessory nerve (CN XI)', ['Facial nerve (CN VII)', 'Optic nerve (CN II)', 'Median nerve'], 'CN XI supplies motor innervation to trapezius and sternocleidomastoid.')
  ], [muscles('Trapezius')]),
  lesson('34', 'Bones & landmarks', 'Landmarks of the scapula', 'The hug joke names a real palpable landmark on the posterior scapula.', [
    'The scapular spine is a prominent posterior ridge that continues laterally as the acromion.',
    'The glenoid cavity faces laterally and articulates with the humeral head.',
    'The coracoid process projects anteriorly; it is distinct from the acromion.'
  ], 'Spine behind, glenoid to the side, coracoid in front.', '8-1-the-pectoral-girdle', [
    question('The spine of the scapula is on which surface?', 'Posterior', ['Anterior costal surface', 'Inferior articular surface', 'Medial humeral shaft'], 'The spine divides the posterior scapula into supraspinous and infraspinous fossae.'),
    question('The lateral continuation of the scapular spine is the what?', 'Acromion', ['Coracoid process', 'Olecranon', 'Greater tubercle'], 'The acromion projects over the shoulder and articulates with the clavicle.'),
    question('Which scapular feature articulates with the humeral head?', 'Glenoid cavity', ['Supraspinous fossa', 'Coracoid tip', 'Medial border'], 'The glenoid forms the socket of the glenohumeral joint.')
  ], [bones('Right scapula', 'Left scapula'), landmarks('scapula-spine')]),
  lesson('35', 'Bones & landmarks', 'Knee bones and laterality', 'The Skyrim reference labels the bones around the knee; learn their actual relationships.', [
    'The femur is in the thigh; the tibia and fibula are in the anatomical leg.',
    'The patella articulates with the femur; the fibula is not part of the femorotibial articulation.',
    'The tibia is the larger medial bone; the fibula is lateral.'
  ], 'Tibia takes the main load; fibula is lateral.', '8-4-bones-of-the-lower-limb', [
    question('Which leg bone is medial and bears most of the transmitted weight?', 'Tibia', ['Fibula', 'Patella', 'Talus'], 'The tibia is the main weight-bearing bone of the leg.'),
    question('The patella articulates directly with which bone?', 'Femur', ['Fibula', 'Calcaneus', 'Hip bone'], 'The posterior patellar surface articulates with the distal femur.'),
    question('In anatomical terminology, the region between the knee and ankle is the what?', 'Leg', ['Thigh', 'Arm', 'Tarsus'], 'The thigh is hip to knee; the leg is knee to ankle.')
  ], [bones('Right femur', 'Right tibia', 'Right fibula', 'Right patella'), landmarks('femur-head', 'femur-neck')]),
  lesson('36', 'Bones & landmarks', 'Eight carpals, two rows', 'The cheeky mnemonic lists each row from thumb side to little-finger side.', [
    'Proximal row, lateral to medial: scaphoid, lunate, triquetrum, pisiform.',
    'Distal row, lateral to medial: trapezium, trapezoid, capitate, hamate.',
    'Trapezium lies at the base of the thumb; pisiform sits on the palmar surface of triquetrum.'
  ], 'Some Lovers Try Positions / That They Can’t Handle. Reset to the thumb side for row two.', '8-2-bones-of-the-upper-limb', [
    question('Which carpal lies at the base of the thumb?', 'Trapezium', ['Trapezoid', 'Hamate', 'Pisiform'], 'Trapezium articulates with the first metacarpal.'),
    question('Which set is the proximal carpal row, lateral to medial?', 'Scaphoid, lunate, triquetrum, pisiform', ['Trapezium, trapezoid, capitate, hamate', 'Pisiform, hamate, capitate, scaphoid', 'Lunate, capitate, trapezoid, ulna'], 'The proximal row starts with scaphoid at the thumb side.'),
    question('Which bone belongs to the distal row of carpals?', 'Capitate', ['Lunate', 'Scaphoid', 'Triquetrum'], 'The distal row contains trapezium, trapezoid, capitate, and hamate.')
  ], [{ collection: 'skeleton', groups: ['Carpals'] }]),
  lesson('37', 'Bones & landmarks', 'Radius and ulna', 'The chicken-wing comic uses homologous bone names; the study questions concern human forearm anatomy.', [
    'In human anatomical position, the radius is lateral on the thumb side; the ulna is medial.',
    'The ulna’s olecranon forms the bony tip of the elbow.',
    'During pronation, the radius crosses over the ulna; in supination they are broadly parallel.'
  ], 'Radius rides with the thumb; ulna owns the elbow tip.', '8-2-bones-of-the-upper-limb', [
    question('Which forearm bone is on the thumb side in anatomical position?', 'Radius', ['Ulna', 'Humerus', 'Clavicle'], 'The radius is the lateral forearm bone.'),
    question('The olecranon is part of which bone?', 'Ulna', ['Radius', 'Scapula', 'Humerus'], 'The proximal ulna’s olecranon forms the point of the elbow.'),
    question('What happens to the radius relative to the ulna during pronation?', 'It crosses over the ulna', ['It fuses permanently with the ulna', 'It becomes the medial epicondyle', 'It detaches from the wrist'], 'Radioulnar joints permit the radius to rotate across the ulna.')
  ], [bones('Right radius', 'Right ulna', 'Left radius', 'Left ulna')]),
  lesson('38', 'Bones & landmarks', 'The skull does not meet the femur', 'The absurd drawing is deliberately wrong: use it to recall the actual chain of articulations.', [
    'Occipital condyles of the skull articulate with the atlas, the first cervical vertebra.',
    'The femoral head fits into the acetabulum of the hip bone.',
    'The femur meets the tibia at the knee; it does not articulate with the skull.'
  ], 'Skull → atlas; hip socket → femoral head.', '7-3-the-vertebral-column', [
    question('Which vertebra directly supports the skull?', 'Atlas (C1)', ['Axis (C2)', 'T1', 'L5'], 'The atlas articulates with the occipital condyles.'),
    question('The femoral head fits into which socket?', 'Acetabulum', ['Glenoid cavity', 'Mandibular fossa', 'Vertebral foramen'], 'The acetabulum is the hip socket.'),
    question('Which bone directly articulates with the femur at the knee?', 'Tibia', ['Fibula', 'Talus', 'Ulna'], 'The femoral condyles articulate with the tibial plateau; the patella also articulates with the femur.')
  ], [bones('Atlas', 'Right femur', 'Right hip bone'), landmarks('femur-head')]),
  lesson('39', 'Bones & landmarks', 'Tibia, fibula, and ankle landmarks', 'The bone-pun comic is a cue to distinguish similarly shaped long bones.', [
    'The tibia is medial and the fibula is lateral in the leg.',
    'The tibia forms the medial malleolus; the fibula forms the lateral malleolus.',
    'The tibial tuberosity is an anterior proximal landmark receiving the patellar ligament.'
  ], 'Medial malleolus = tibia; lateral malleolus = fibula.', '8-4-bones-of-the-lower-limb', [
    question('Which bone forms the medial malleolus?', 'Tibia', ['Fibula', 'Femur', 'Calcaneus'], 'The distal tibia projects medially at the ankle.'),
    question('Which bone forms the lateral malleolus?', 'Fibula', ['Tibia', 'Patella', 'Navicular'], 'The distal fibula forms the lateral ankle prominence.'),
    question('The tibial tuberosity is on which aspect of the proximal tibia?', 'Anterior', ['Posterior only', 'Inferior articular surface', 'Medial malleolus'], 'It is a rough anterior projection for attachment of the patellar ligament.')
  ], [bones('Right tibia', 'Right fibula', 'Left tibia', 'Left fibula')]),
  lesson('40', 'Bones & landmarks', 'Pelvis and hip-bone landmarks', 'Pelvis Presley gives the pelvic girdle a name you can pair with its component bones.', [
    'Each adult hip bone is formed by fused ilium, ischium, and pubis.',
    'These three parts meet around the acetabulum, which receives the femoral head.',
    'The bony pelvis includes both hip bones, the sacrum, and coccyx.'
  ], 'Ilium up; ischium sits; pubis in front.', '8-3-the-pelvic-girdle-and-pelvis', [
    question('Which three bones fuse to form an adult hip bone?', 'Ilium, ischium, and pubis', ['Femur, tibia, and fibula', 'Sacrum, coccyx, and femur', 'Scapula, clavicle, and sternum'], 'The three hip-bone parts unite around the acetabulum.'),
    question('Which landmark receives the head of the femur?', 'Acetabulum', ['Obturator foramen', 'Iliac crest', 'Ischial spine'], 'The acetabulum forms the socket of the hip joint.'),
    question('Which part of the hip bone has the large superior wing?', 'Ilium', ['Ischium', 'Pubis', 'Patella'], 'The ilium forms the broad superior portion of the hip bone.')
  ], [bones('Right hip bone', 'Left hip bone', 'Sacrum')]),
  lesson('41', 'Muscles', 'Facial expression: CN VII in action', 'The smile answers the question: facial expression uses muscles supplied by the facial nerve.', [
    'Zygomaticus major elevates the corners of the mouth during a smile.',
    'Orbicularis oculi closes the eyelids; orbicularis oris closes and shapes the lips.',
    'CN VII supplies the muscles of facial expression. Chewing muscles such as masseter mainly use the mandibular division of CN V.'
  ], 'Oculi = eyes; oris = mouth; zygomaticus lifts the smile.', '11-3-axial-muscles-of-the-head-neck-and-back', [
    question('Which muscle lifts the corners of the mouth when smiling?', 'Zygomaticus major', ['Masseter', 'Lateral rectus', 'Sternocleidomastoid'], 'Zygomaticus major draws the mouth corners superiorly and laterally.'),
    question('Which muscle closes the eyelids?', 'Orbicularis oculi', ['Orbicularis oris', 'Temporalis', 'Buccinator'], 'Oculi refers to the eye; this circular muscle closes the eyelids.'),
    question('Which cranial nerve supplies the muscles of facial expression?', 'Facial nerve (VII)', ['Trigeminal nerve (V)', 'Abducens nerve (VI)', 'Hypoglossal nerve (XII)'], 'Facial expression uses CN VII; mastication mainly uses the mandibular division of CN V.')
  ], [muscles('Zygomaticus major', 'Orbicularis oculi', 'Orbicularis oris')]),
  lesson('42', 'Nerves', 'Untangle the brachial plexus', 'The spaghetti joke captures the jump from a tidy diagram to a three-dimensional nerve network.', [
    'The brachial plexus usually begins with the anterior rami of C5–T1 spinal nerves.',
    'Trace roots → trunks → divisions → cords → branches. A plexus redistributes fibers into peripheral nerves.',
    'Its five major terminal nerves are musculocutaneous, axillary, radial, median, and ulnar.'
  ], 'Read The Diagram Carefully Before naming a branch.', '13-4-the-peripheral-nervous-system', [
    question('Which spinal levels usually contribute to the brachial plexus?', 'C5–T1', ['C1–C4 only', 'T5–T12', 'L4–S4'], 'Its usual roots are the anterior rami of C5, C6, C7, C8, and T1.'),
    question('Which sequence traces the plexus from proximal to distal?', 'Roots → trunks → divisions → cords → branches', ['Roots → cords → trunks → divisions → branches', 'Branches → roots → divisions → trunks → cords', 'Trunks → roots → cords → branches → divisions'], 'Follow the nerve network outward from spinal levels to terminal peripheral nerves.'),
    question('Which is one of its five major terminal nerves?', 'Musculocutaneous', ['Optic', 'Femoral', 'Phrenic'], 'Musculocutaneous is a major terminal branch; the phrenic nerve mainly arises from the cervical plexus.')
  ]),
  lesson('43', 'Nerves', 'Small nerve, specific job: CN IV', 'The goofy dragon understates a precise job: supplying the superior oblique muscle.', [
    'Trochlear nerve (IV) supplies superior oblique; abducens (VI) supplies lateral rectus.',
    'Oculomotor (III) supplies the other four extraocular muscles and the upper-eyelid elevator.',
    'Superior oblique helps intort the eye and depress it, especially when the eye is adducted. A cartoon expression is not a nerve examination.'
  ], 'LR6 SO4, the rest 3: lateral rectus VI; superior oblique IV.', '16-3-the-cranial-nerve-exam', [
    question('Which extraocular muscle receives CN IV?', 'Superior oblique', ['Lateral rectus', 'Medial rectus', 'Inferior oblique'], 'The trochlear nerve supplies superior oblique.'),
    question('Which nerve supplies lateral rectus?', 'Abducens (VI)', ['Trochlear (IV)', 'Optic (II)', 'Facial (VII)'], 'Abducens supplies the muscle that abducts the eye.'),
    question('When the eye is adducted, superior oblique is especially useful for which movement?', 'Depression', ['Eyelid closure', 'Pupil constriction', 'Jaw elevation'], 'Superior oblique helps look downward with the eye turned toward the nose; it also intorts the eye.')
  ], [muscles('Superior oblique', 'Lateral rectus')]),
  lesson('44', 'Nerves', 'Connect an upper-limb nerve to an action', 'The intimidating plexus becomes more manageable when each nerve is paired with a muscle you can identify.', [
    'Musculocutaneous supplies biceps brachii, an elbow flexor and forearm supinator.',
    'Axillary supplies deltoid, whose middle fibers abduct the arm at the shoulder.',
    'Radial supplies triceps brachii, which extends the elbow. These are useful anchors, not complete nerve-supply lists.'
  ], 'Biceps bends; deltoid lifts sideways; triceps straightens.', '11-5-muscles-of-the-pectoral-girdle-and-upper-limbs', [
    question('Which muscle–action pair is correct?', 'Biceps brachii — elbow flexion', ['Triceps brachii — elbow flexion', 'Deltoid — finger flexion', 'Biceps brachii — knee extension'], 'Biceps flexes the elbow and also helps supinate the forearm.'),
    question('Which nerve supplies the deltoid?', 'Axillary', ['Ulnar', 'Median', 'Musculocutaneous'], 'The axillary nerve supplies deltoid; its middle fibers abduct the arm.'),
    question('Triceps brachii uses which nerve and main elbow action?', 'Radial nerve; extension', ['Median nerve; flexion', 'Axillary nerve; pronation', 'Ulnar nerve; supination'], 'Radial innervation allows triceps to straighten the elbow.')
  ], [muscles('Biceps brachii', 'Deltoid', 'Triceps brachii')]),
  lesson('45', 'Muscles', 'Popliteus unlocks the knee', 'The tiny muscle carrying a key is a cue for its role in starting knee flexion.', [
    'Popliteus lies deep behind the knee and contributes to the floor of the popliteal fossa.',
    'It helps unlock the extended knee: medially rotating the free tibia, or laterally rotating the femur when the foot is planted.',
    'It connects the lateral femoral condyle region to the posterior proximal tibia and receives the tibial nerve.'
  ], 'Behind the knee, popliteus turns the key.', '11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs', [
    question('Where would you look for popliteus?', 'Deep behind the knee', ['Superficial front of the thigh', 'Sole of the foot', 'Anterior forearm'], 'Popliteus lies in the posterior knee region, beneath more superficial muscles.'),
    question('With the foot free, popliteus helps unlock the knee by rotating which way?', 'Medial rotation of the tibia', ['Lateral rotation of the tibia', 'Medial rotation of the humerus', 'Pronation of the forearm'], 'With the tibia free it rotates medially; with the foot planted the femur rotates laterally relative to the tibia.'),
    question('Which nerve supplies popliteus?', 'Tibial nerve', ['Femoral nerve', 'Obturator nerve', 'Deep fibular nerve'], 'The tibial nerve supplies popliteus and the other posterior-compartment leg muscles.')
  ], [muscles('Popliteus'), bones('Right femur', 'Right tibia')]),
  lesson('46', 'Nerves', 'Vagus travels; abducens abducts', 'The Doge comparison contrasts a widely distributed mixed nerve with a very specific eye-movement nerve.', [
    'CN X, the vagus, carries parasympathetic output to many thoracic and abdominal organs, including the heart and digestive tract.',
    'Vagus is a mixed nerve: it also carries sensory information and motor fibers for swallowing and voice.',
    'CN VI, the abducens, supplies lateral rectus to move the eye away from the nose. Fewer targets do not mean less importance.'
  ], 'Vagus wanders through the viscera; abducens abducts the eye.', '15-1-divisions-of-the-autonomic-nervous-system', [
    question('Which cranial nerve carries parasympathetic output to the heart and much of the digestive tract?', 'Vagus (X)', ['Abducens (VI)', 'Trochlear (IV)', 'Olfactory (I)'], 'The vagus carries a large share of cranial parasympathetic output to internal organs.'),
    question('Which description of vagus is accurate?', 'It carries both sensory and motor fibers', ['It is purely sensory', 'It only moves the eyeball', 'It is a sympathetic spinal nerve'], 'CN X is mixed, combining visceral sensory, parasympathetic, and other motor functions.'),
    question('Contraction of lateral rectus moves the eye in which direction?', 'Laterally, away from the nose', ['Medially, toward the nose', 'It closes the eyelid', 'It constricts the pupil'], 'Lateral rectus abducts the eye, which links its action to the name abducens.')
  ], [muscles('Lateral rectus')]),
  lesson('47', 'Bones & landmarks', 'Patella: a plate inside a tendon', 'The dinner plates are an etymology joke: patella means a little plate or shallow dish.', [
    'The patella is a sesamoid bone embedded in the quadriceps tendon in front of the knee.',
    'Its posterior articular surface meets the femur. It does not directly articulate with the tibia.',
    'The patellar ligament connects its inferior apex to the tibial tuberosity, transmitting quadriceps force for knee extension.'
  ], 'Quadriceps tendon → patella → patellar ligament → tibial tuberosity.', '8-4-bones-of-the-lower-limb', [
    question('The patella is classified as which kind of bone?', 'Sesamoid', ['Flat cranial bone', 'Long bone', 'Vertebra'], 'A sesamoid bone develops within a tendon; the patella lies within the quadriceps tendon.'),
    question('Which bone directly articulates with the posterior patella?', 'Femur', ['Tibia', 'Fibula', 'Talus'], 'The patellar articular surface contacts the distal femur.'),
    question('The patellar ligament attaches distally to which landmark?', 'Tibial tuberosity', ['Head of fibula', 'Greater trochanter', 'Medial malleolus'], 'The ligament runs from the patellar apex to the anterior tibial tuberosity.')
  ], [bones('Right patella', 'Left patella', 'Right femur', 'Right tibia')]),
];

export function memeModelTargets(lesson: MemeLesson): ModelPrompt[] {
  const targets = lesson.models.flatMap(link => modelPromptPools[link.collection].filter(prompt =>
    link.groups?.includes(prompt.group ?? '') || link.answers?.includes(prompt.answer) || link.ids?.includes(prompt.id)));
  return [...new Map(targets.map(prompt => [prompt.id, prompt])).values()];
}
export const memeQuestionIds = new Set(memeLessons.flatMap(lesson => lesson.questions.map(q => q.id)));
