/** Real microscopy photographs, hosted locally as Wikimedia 960px thumbnails.
 * Original creator: Berkshire Community College Bioscience Image Library.
 * Each Commons record links the original college Flickr upload and a reviewed CC0 dedication.
 * Anatomical collection site is not inferred where the creator does not provide it.
 */
export type HistologySlide = {
  id: string;
  name: string;
  tissue: string;
  features: string[];
  location: string;
  image: string;
  source: string;
  credit: string;
  license: string;
  licenseUrl: string;
  magnification?: string;
};

const credit = 'Berkshire Community College Bioscience Image Library';
const license = 'CC0 1.0';
const licenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const histologySlides: HistologySlide[] = [
  {
    id: 'simple-squamous', name: 'Simple squamous epithelium', tissue: 'Epithelial tissue',
    features: [
      'A surface view shows broad, closely fitted polygonal cells.',
      'Each cell has a visible central nucleus and a thin surrounding cytoplasm.',
      'This is a whole mount viewed from above; use a section to assess epithelial thickness directly.',
    ],
    location: 'Human epithelial whole mount; anatomical site not specified by the creator.',
    image: '/histology/simple-squamous.jpg',
    source: commons('Epithelial_Tissues_Simple_Squamous_Epithelium_(41722161301).jpg'),
    credit, license, licenseUrl, magnification: '400×',
  },
  {
    id: 'stratified-squamous', name: 'Stratified squamous epithelium', tissue: 'Epithelial tissue',
    features: [
      'Many cell layers extend from the darker basal region toward the free surface.',
      'Surface cells become flatter and still have visible nuclei.',
      'Connective tissue lies beneath the undulating epithelial boundary.',
    ],
    location: 'Epithelial section; species and anatomical site not specified by the creator.',
    image: '/histology/stratified-squamous.jpg',
    source: commons('Epithelial_Tissues_Stratified_Squamous_Epithelium_(40230842160).jpg'),
    credit, license, licenseUrl, magnification: '200×',
  },
  {
    id: 'skeletal-muscle', name: 'Skeletal muscle', tissue: 'Muscle tissue',
    features: [
      'Long, parallel fibers have prominent repeating transverse striations.',
      'Dark nuclei appear along the margins of the fibers.',
      'Teasing separates the fibers, making their long cylindrical shape easier to compare.',
    ],
    location: 'Human teased skeletal muscle fibers; anatomical site not specified by the creator.',
    image: '/histology/skeletal-muscle.jpg',
    source: commons('Muscle_Tissue_Skeletal_Muscle_Fibers_(40153601630).jpg'),
    credit, license, licenseUrl, magnification: '200×',
  },
  {
    id: 'cardiac-muscle', name: 'Cardiac muscle', tissue: 'Muscle tissue',
    features: [
      'Striated fibers have centrally placed nuclei.',
      'Fibers branch and connect rather than remaining long, separate cylinders.',
      'Compare the central nuclei and branching with the peripheral nuclei of skeletal muscle.',
    ],
    location: 'Human cardiac muscle; finer sampling location not specified by the creator.',
    image: '/histology/cardiac-muscle.jpg',
    source: commons('Muscle_Tissue_Cardiac_Muscle_(28184529378).jpg'),
    credit, license, licenseUrl, magnification: '400×',
  },
  {
    id: 'elastic-connective', name: 'Elastic connective tissue', tissue: 'Connective tissue',
    features: [
      'Dark, branching elastic fibers weave through the field.',
      'Thicker pink collagen bundles can be distinguished from the finer elastic fibers.',
      'Fibers and extracellular matrix occupy much more space than the scattered cells.',
    ],
    location: 'Human elastic tissue section; anatomical site not specified by the creator.',
    image: '/histology/elastic-connective.jpg',
    source: commons('Connective_Tissue_Human_Elastic_Tissue_(40049097400).jpg'),
    credit, license, licenseUrl, magnification: '200×',
  },
];
