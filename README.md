# Anatome

A curriculum-grounded anatomy and physiology study workspace. Built with React, TypeScript, Vite, and Three.js.

## Run locally

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally http://127.0.0.1:5173/).

```sh
npm run build
npm test
```

## Available now

- A typical two-semester A&P roadmap with 14 modules, referenced to OpenStax Anatomy & Physiology 2e and HAPS learning-outcome scope.
- A searchable practical inventory: 217 entries across 22 groups, with original study clues, principal muscle actions, tissue features, a local checklist, and CSV export. Your instructor determines your required list.
- A 238-part source skeleton overview and 66 selected major-muscle components with click selection, isolation, anatomical views, and 3D identification recall in anatomical context (with optional isolation for inspection). Counts are named source parts, not the textbook numbers of bones or muscles. Assemblies preserve source side and position; the skeleton source collection omits some adult bones.
- Three detailed authentic BodyParts3D right-side specimens: femur, humerus, scapula. No reflections or generated substitute anatomy. Verified anatomical camera directions, free orbit, keyboard rotation/zoom, and 17 surface landmark locators.
- Five real histology photographs from the Berkshire Community College Bioscience Image Library, released under CC0, with image provenance, optical/source magnification, digital zoom, hide/reveal and feature descriptions.
- 40 original questions: visual bone/landmark identification and laterality, verbal laterality, muscle function, tissue morphology, physiology. Answers receive immediate explanations and source links.
- Bone-specific and mixed short practice sessions. A declared fixed review sequence prioritizes due questions and new material. Early voluntary repeats do not inflate review intervals.
- Notebook, saved landmarks, actual attempt history, and study-progress summaries stored on the current device. JSON backup export; inventory CSV export.

## Scope and content review

This is a working first collection, not a complete anatomy practical or the complete college curriculum. A complete organ-system atlas, a complete question bank, additional microscopy exemplars, multiple real anatomical specimens, and instructor-specific syllabus import remain future work. Histology practice includes both real micrographs and verbal morphology questions. The decorative tissue graphics are icons, not specimen images.

The anatomy facts, directional conventions, side mappings, source references, and camera/marker visibility were checked during development. Integration checks parse all shipped GLBs and compare all 304 named parts with their IDs, vertex counts, geometry bounds, side, and source hashes. Hand-placed landmark annotations are study locators rather than independently educator-certified segmentations. A checked inventory item or explored landmark records study exposure, not mastery or practical-exam readiness. The three detailed bone specimens are right-sided, and every curated visual laterality item uses the documented mesh side. Whole-body source assemblies include bilateral structures; their individual source names and sides are retained. Verbal questions also assess left-side reasoning. A broader asset collection is needed to prevent specimen-specific memorization.

The build and study-scheduling tests were run. Runtime browser/screenshot QA could not be completed in this environment: the browser connector was unavailable and automatic approval review blocked a screenshot of an unrelated active Chrome page with private tabs visible.

## Sources and licensing

- [OpenStax A&P 2e](https://openstax.org/details/books/anatomy-and-physiology-2e): curriculum structure and anatomical fact references. The study wording in this project is original. Textbook diagrams, micrographs, and copied test banks are not included.
- [HAPS learning outcomes](https://www.hapsweb.org/haps-learning-outcomes/): course scope reference; no copied outcomes inventory.
- BodyParts3D, © The Database Center for Life Science, licensed under [CC Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) per the [current official archive license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). Exact specimen names, source IDs, coordinate conventions, original historical headers, and SHA-256 hashes are retained in `public/models/ATTRIBUTION.md` and `manifest.json`.
- Histology photographs: [Berkshire Community College Bioscience Image Library](https://commons.wikimedia.org/wiki/File:Muscle_Tissue_Cardiac_Muscle_(28184529378).jpg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Every image links to its original creator/source record in `src/histology.ts`.
- [Roediger & Karpicke, 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/): retrieval-practice evidence.
- [Cepeda et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16719566/): distributed-practice evidence. Applying these principles to this product is a design inference; the app's fixed schedule is not a validated personalized memory model.

Research notes are in `docs/`.

Microscopy provenance: one stratified squamous image does not specify species; the app does not infer its species or sampling site. Morphology study remains applicable, with specimen limits stated.
