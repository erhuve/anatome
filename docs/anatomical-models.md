# Accurate 3D anatomy assets for Anatome

## Supplied working assets

Three real right-side anatomical meshes are installed in `site/public/models/`. These are extracted unchanged from the **official BodyParts3D 4.0** archive. BodyParts3D was constructed from a 2 mm MRI reference, with medical illustration refinements documented in the original paper: https://pmc.ncbi.nlm.nih.gov/articles/PMC2686534/.

| File | BodyParts3D mesh | FMA concept | Vertices | Triangles |
| --- | --- | --- | --- | --- |
| femur.obj | FJ3365 | FMA24474, right femur | 1,574 | 3,102 |
| humerus.obj | FJ3368 | FMA23130, right humerus | 2,233 | 3,784 |
| scapula.obj | FJ3384 | FMA13395, right scapula | 13,118 | 26,172 |

Each model's identity and side were checked against its OBJ metadata header and the official `partof_element_parts.txt` and `partof_parts_list_e.txt` ontologies. `site/public/models/manifest.json` records source, counts, hashes and modifications. `ATTRIBUTION.md` carries the human-readable source and licence notice.

Primary source download page: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

Exact archive: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip

Download is 61.8 MB compressed. It is retained for expansion under `research-assets/bodyparts3d-4.0.zip`, outside the published app directory. It contains individual model meshes for many bones, muscles, organs, nerves and vessels. Official mapping files are also saved in `research-assets/`.

## Licence nuance

The **current official licence**, updated **2025-02-27**, explicitly grants **Creative Commons Attribution 4.0 International**, and requires this attribution:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

Primary source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

The OBJ file headers retain the historical CC BY-SA 2.1 Japan text. These legacy headers are preserved in our unmodified geometry. We directly downloaded from the official archive governed by its current licence; we did not copy the assets from an intermediary GitHub mirror that states only the old licence. This distinction is documented in `ATTRIBUTION.md`.

## Viewer implementation

`site/src/components/BoneViewer.tsx` implements the requested React/Three.js interface, with OrbitControls, four exact anatomical camera presets, right-side source geometry, no reflection, warm ivory materials, loading/error fallback and selectable projected markers. Rendering resources are disposed on unmount and the canvas follows its container with ResizeObserver.

Source geometry uses superior Z. Observed coordinates and named right-side bones establish x toward patient-left and y posterior. The viewer applies the proper rotation `(x,y,z) → (x,z,-y)`, centres each specimen and uniformly scales it. Anterior, posterior, medial and lateral cameras are `+Z`, `−Z`, `+X`, `−X`, respectively, for these right-side bones. Original geometry is not deformed.

I independently rendered all three meshes into four orthographic views and inspected them: the femur's anterior patellar surface and posterior separated condyles, humeral posterior olecranon fossa and scapular posterior spine agree with the chosen orientation. The software-rasterized QA images are saved in `research-assets/selected/*.png`.

Landmark marker targets are manually placed in original model millimetres, snapped to actual mesh vertices and paired with source normals. Back-facing/occluded markers are hidden. They are **viewer annotations, not source segmentations**, and should receive anatomy educator review before high-stakes assessment. In quiz mode, labels and other markers are hidden; only the requested active landmark can appear with a question-mark pin.

## Other primary sources investigated

Z-Anatomy's official repository is https://github.com/Z-Anatomy/Models-of-human-anatomy. It distributes an approximately 86.7 MB Blender template and credits Gauthier Kervyn, Marcin Zielinski and the BodyParts3D project. It is **CC BY-SA 4.0** and requires adaptations under that licence. Its upstream README lists additional incorporated references with some noncommercial restrictions, so inspect each specific derived structure rather than assuming every embedded model has identical permissive commercial terms. It is valuable for future anatomical refinement but needs Blender export and additional provenance review.

Its old `Z-Anatomy/Models` repository URL currently returns 404. Some third-party model-sharing instructions are stale. Do not add it to a runtime loader.

The official BodyParts3D viewer's undocumented `download.cgi` endpoint returned its HTML application rather than a ZIP in my direct download attempt. The documented official archive succeeds and is the reproducible recommended source.

## Boundaries and next steps

The supplied app assets do not yet cover a complete skeleton, muscle atlas or histology slide library. The original archive can supply more bones and muscles without inventing anatomy. For expansion, use official concept-to-element relations to select all components of a named structure, preserve source-space alignment for multi-structure scenes, and record separate name/side/source/version/licence metadata. Tissue recognition should use real openly licensed microscopy, with stain and scale information; schematic tissue art should be explicitly labelled.
