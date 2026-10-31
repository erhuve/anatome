# Anatome

A model-first anatomy quiz app. Built with React, TypeScript, Vite, and Three.js.

This is a standalone React web application. The anatomy models and histology images are static files. Guest practice saves in browser storage; optional Supabase Google sign-in saves private account progress across devices. The app can still run without Supabase configuration for guest practice.

## Run locally

```sh
npm ci
npm run dev
```

For account features, copy `.env.example` to `.env.local` and follow [account setup](docs/auth-setup.md).

Open the Local URL printed by Vite (normally http://127.0.0.1:5173/).

```sh
npm run build
npm test
```

## Build and host

```sh
npm run build
npm run preview
```

`npm run build` creates the production app in `dist/`. Serve that directory from your own web server or any static host. Use `npm run preview` to check the production build locally; it is a development preview server.

The app currently expects to be served at the root of a domain. Include the entire `dist/` directory, especially `models/` and `histology/`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before building to enable account features. No platform-specific build tools are needed. Serve it over HTTP or HTTPS rather than opening `index.html` directly from disk.

The app uses system fonts and serves its anatomy assets locally. Educational source links open their original publishers. Guest history remains local to each browser and origin. Signed-in answers save to Supabase with an account-scoped local outbox for offline changes. Incoming progress from other devices refreshes when the app gains focus, reconnects, or you press Refresh in My progress.

## The app

The main experience is a full-screen 3D quiz studio. There is no dashboard or course navigation between questions.

- Choose Muscles, Bones, or Landmarks and start identifying immediately.
- Study settings lets you select anatomical regions or individual targets, search by structure/side, select all available material, or save a custom selection. Every shipped source part is eligible; visibility and small size do not remove targets from the pool.
- A blue source structure or surface marker is the target. Rotate, zoom, pan, or change anatomical view before answering.
- Camera controls work across muscles, bones, and landmarks: drag to rotate, scroll to zoom, and right-drag or Shift-drag to pan. Click the model (or Tab to it) for keyboard controls: arrow keys pan up/down/sideways, Shift + arrows rotate, and +/− zoom. On touchscreens, one finger rotates and two fingers pan/pinch to zoom. Reset camera or choose an anatomical view to recenter.
- Focus frames the target with neighboring anatomy. Muscles use opaque red surfaces and studio lighting to keep their form and boundaries readable. The eye control switches X-ray target visibility: when enabled, the blue target remains visible through its surroundings; switch it off for normal anatomical occlusion. Skeleton context remains translucent, with the eye control restoring opaque bones. Context shows the source assembly; Isolate hides other source parts. Small and numbered skeletal structures retain regional neighbors for positional identification. Explicit deep muscle layers can start isolated, with context available for orientation.
- Type answer is the default (free text, then Enter to check); switch to Multiple choice for buttons or 1–4 keys. Typed answers tolerate small spelling mistakes and transposed letters; side, anatomical qualifiers, and numbered identities still matter. Feedback shows the correct name and indicates accepted typos. Enter continues after an answer. The answer mode is remembered on this device for each account.
- Short sets contain up to 10 questions. The results screen lets you retry missed structures or start a fresh set.
- Sets continue a saved pass through every target in the chosen selection without repeating covered targets. The final set is shorter when fewer than 10 remain. Completion offers an explicit start for the next pass.
- Pass coverage is independent for each collection and selection, and survives refreshes and collection changes. Returning to the same selection resumes its pass. Answered/revealed targets count as covered; skipped load failures stay eligible. Missed review is an intentional repeat and does not change pass coverage. Existing unique model attempts migrate into the first all-target pass.
- The complete available pools contain 462 muscle-component targets, 238 skeletal-part targets, and 20 landmark/laterality prompts. Settings can narrow these pools without changing the availability of the rest of the material.
- Z-Anatomy supplies the 462-component muscle assembly. BodyParts3D supplies the 238-part skeletal assembly: 201 bone meshes, 23 intervertebral discs and 14 costal cartilages. Source part counts include bilateral structures and subdivisions; they are not textbook counts of whole muscles or adult bones. Each source assembly keeps its own coherent pose.
- Detailed femur, humerus and scapula specimens support 17 landmark locators and side reasoning. Original specimen geometry and handedness are preserved.
- Sign in / My progress opens accuracy, collection coverage, recent misses, and reviews due. Guests can explicitly add their device history to an account. Notes, checklists, and prior study records are retained during import.
- Account data is protected by database ownership rules. Immutable events and unique event IDs preserve concurrent-device answers and prevent duplicate retries. Each pending event has a separate local journal entry so concurrent browser tabs cannot erase it.
- Pending uploads retry automatically every 30 seconds and on reconnect; this does not poll full history. Initial sign-in and explicit Refresh load account history, with focus/reconnect refreshes throttled to once a minute. See [database setup and Google OAuth configuration](docs/auth-setup.md).

Study settings → Curriculum coverage opens a searchable 283-entry lab reference catalog, all model-part names, and the 14-area two-semester course map. The original 217 practical entries and their descriptions are retained, with 66 additional instructor-selected entries. The catalog distinguishes exact model links, reviewed landmark locators, photographs and reference-only material. The 40-question reference bank, five microscopy examples and source notes remain supporting project content; the primary quiz is 3D identification.

Deep links: `/?atlas=muscles`, `/?atlas=skeleton`, `/?atlas=landmarks`. `/?atlas=bones` also selects the skeleton.

## Scope and content review

All available source models are included, but this is not complete college A&P coverage. The curriculum catalog makes the remaining gaps visible: unreviewed bone landmarks, additional histology specimens, organ-system anatomy, physiological mechanisms, and comprehensive muscle attachments/actions/innervation assessment. The skeletal source lacks the coccyx and auditory ossicles. All muscle names in the core/extended lab catalog link real source geometry, but a model link does not mean every learning task for that muscle is assessed. Your instructor's practical list determines required material.

The anatomy facts, directional conventions, side mappings and source references were checked during development. Source geometry checks cover all 700 named assembly parts, their source identities, coordinate bounds, handedness and provenance. Z-Anatomy muscle geometry is converted and compressed without anatomical decimation; its identifiers are attributed to the actual Z source even where compatible older app IDs are retained. Hand-placed landmark annotations are study locators rather than independently educator-certified segmentations. Coverage records exposure, not mastery or practical-exam readiness. The three detailed bone specimens are right-sided; whole-body assemblies contain bilateral structures. Additional reference specimens are still needed to study anatomical variation and prevent specimen-specific memorization.

Validation includes content/session/pass and selection tests, storage migration and reload checks, account tests, source geometry checks, and production compilation. The presentation audit checks every muscle and skeletal target at two viewport ratios using its default framing and target visibility rules: X-ray muscle targets, translucent skeletal context, or selected-only isolation. Separate detailed-bone checks verify all 17 locators and laterality at three viewport ratios. These headless checks do not replace visual UI review, which is performed separately in the local Canvagent canvas embed. Run `npm test` and `npm run build` for the current checkout.

## Sources and licensing

- [OpenStax A&P 2e](https://openstax.org/details/books/anatomy-and-physiology-2e): curriculum structure and anatomical fact references. The study wording in this project is original. Textbook diagrams, micrographs, and copied test banks are not included.
- [HAPS learning outcomes](https://www.hapsweb.org/haps-learning-outcomes/): course scope reference; no copied outcomes inventory.
- BodyParts3D, © The Database Center for Life Science, licensed under [CC Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) per the [current official archive license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). Exact specimen names, source IDs, coordinate conventions, original historical headers, and SHA-256 hashes are retained in `public/models/ATTRIBUTION.md` and `manifest.json`.
- [Z-Anatomy](https://github.com/LluisV/Z-Anatomy), Gauthier Kervyn and contributors, supplies the muscle assembly under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The pinned source, original credits, conversion changes and checksums are documented in `public/models/ATTRIBUTION.md` and `systems.json`; `muscle-aliases.json` records compatible app-ID mappings. The adapted muscle asset remains CC BY-SA 4.0: retain attribution and change notices, and distribute adaptations of that asset under the same license. Application code does not relicense third-party model data.
- Histology photographs: [Berkshire Community College Bioscience Image Library](https://commons.wikimedia.org/wiki/File:Muscle_Tissue_Cardiac_Muscle_(28184529378).jpg), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Every image links to its original creator/source record in `src/histology.ts`.
- [Roediger & Karpicke, 2006](https://pubmed.ncbi.nlm.nih.gov/16507066/): retrieval-practice evidence.
- [Cepeda et al., 2006](https://pubmed.ncbi.nlm.nih.gov/16719566/): distributed-practice evidence. Applying these principles to this product is a design inference; the app's fixed schedule is not a validated personalized memory model.

Research notes are in `docs/`.

Microscopy provenance: one stratified squamous image does not specify species; the app does not infer its species or sampling site. Morphology study remains applicable, with specimen limits stated.
