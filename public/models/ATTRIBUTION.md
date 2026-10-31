# Anatomy assets: sources, licences and modifications

This project distributes two distinct source collections. Their anatomical poses are kept internally coherent; source meshes from different poses are not combined into one body. Licensing of the application code does not relicense third-party anatomy data.

| Files | Source | Licence |
| --- | --- | --- |
| `femur.obj`, `humerus.obj`, `scapula.obj` | BodyParts3D 4.0, DBCLS | CC BY 4.0, under the archive's current licence |
| `skeleton.glb` | BodyParts3D 4.0, DBCLS | CC BY 4.0, under the archive's current licence |
| `muscles.glb` | Z-Anatomy, pinned source below | CC BY-SA 4.0 |

## BodyParts3D

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.**

- Source and downloads: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Current official licence, updated 2025-02-27: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
- Archive: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip
- Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Research 37 (2009), D782–D785. https://doi.org/10.1093/nar/gkn613

Retrieved 2026-10-30. The OBJ headers retain the historical CC BY-SA 2.1 Japan notice. We obtained the data directly from the official archive, whose current licence explicitly grants CC BY 4.0; historical headers are preserved.

The three OBJ specimens are unmodified source geometry, extracted and renamed:

| Runtime file | Original file | Concept | Source name |
| --- | --- | --- | --- |
| `femur.obj` | FJ3365.obj | FMA24474 | Right femur |
| `humerus.obj` | FJ3368.obj | FMA23130 | Right humerus |
| `scapula.obj` | FJ3384.obj | FMA13395 | Right scapula |

`skeleton.glb` contains 238 source parts: 201 bone meshes, 23 intervertebral discs and 14 costal cartilages. These are model-part counts, not a count of adult human bones. The source does not include every bone: auditory ossicles and the coccyx are absent from this collection, and the sternum is represented in several pieces.

**Skeleton conversion:** source OBJ positions and normals were packed into indexed float32 glTF, keeping each component in its original source coordinates and retaining its source mesh ID and anatomical concept. No decimation, sculpting or anatomical pose changes were applied.

## Z-Anatomy muscle collection

**Z-Anatomy — the open source atlas of anatomy — CC BY-SA 4.0.**

Credits: Gauthier Kervyn (design, 3D and anatomy), Marcin Zielinski (Blender scripting), Lluís Vinent Juanico (Unity application), and contributors. Z-Anatomy derives in part from **BodyParts3D, © The Database Center for Life Science**, which Z-Anatomy's historical source notices credit under CC BY-SA 2.1 Japan.

- Primary project: https://github.com/LluisV/Z-Anatomy
- Pinned commit: `6c7f9016bd5899ac8edafd31b9900c151df42ed6`
- Source FBX: https://github.com/LluisV/Z-Anatomy/blob/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models/FBX/MuscularSystem100.fbx
- Source licence and credits: https://github.com/LluisV/Z-Anatomy/blob/6c7f9016bd5899ac8edafd31b9900c151df42ed6/Resources/Models/License.txt
- Licence: https://creativecommons.org/licenses/by-sa/4.0/
- Source FBX SHA-256: `4c19df534d5d84aabbce08604306aa0485b43e8a2483c72a95b569e1dfea2279`

Retrieved 2026-10-30. The derivative `muscles.glb` is distributed under **CC BY-SA 4.0**. Preserve the attribution, identify changes and distribute adaptations of this muscle asset under the same licence. Z-Anatomy also lists additional assets with noncommercial terms, including inner-ear and kidney models; those source systems are not included in this muscle collection. No claim is made that every model from the broader project shares one licence.

The muscle collection contains **462 actual named source components**, including bilateral muscles, separately modelled heads and regions, facial and jaw muscles, trunk and limbs, deep back, neck, pelvic floor, extraocular muscles and muscles used for swallowing and voice. The latter groups are deliberately included as striated skeletal muscles; no cardiac, iris/ciliary or smooth gut muscle models are included. Bursae, tendon sheaths, isolated tendon structures, fascia sheets, ligaments, retinacula and annotation objects were excluded. This is broad source coverage, not a claim that every anatomical variant or course-specific requirement has been represented.

**Muscle conversion and changes:**

1. Source FBX world transforms were baked without changing the source pose or relative arrangement.
2. Centimetres in the source's Y-up frame were converted to millimetres/Z-up by the proper transform `(X,Y,Z) → (10X,−10Z,10Y)`. This preserves side and shape.
3. Identical float32 position/normal attributes were indexed, and vertices/triangles were reordered for efficient storage. No positional quantisation or anatomical decimation was applied.
4. Triangle winding was corrected on reflected source transforms so outward surfaces and smooth normal directions agree. No additional counterpart meshes or anatomical mirrors were invented.
5. `EXT_meshopt_compression` encodes the resulting float32 data losslessly; it does not simplify the anatomy.
6. Runtime colours, selected-part highlighting and optional transparent context are study styling.

All 66 identifiers from the previous small muscle collection are retained only where the anatomical component and side match after conservative terminology normalization. `muscle-aliases.json` records each old name, actual Z-Anatomy source name, source node ID and matching rationale. An alias does not turn a Z-Anatomy mesh into a BodyParts3D mesh: per-part `source`, `sourceName`, `sourceId`, source URL and licence explicitly identify Z-Anatomy. Unknown FMA identifiers were not invented.

## Runtime transforms and provenance

`systems.json` records every component's source name and ID, source file/commit, coordinate bounds, counts, source/asset SHA-256 hashes and conversion details. `manifest.json` records the three original OBJ specimens.

Both GLB collections use a source frame with X toward subject-left, Y posterior and Z superior. The viewer applies the proper rotation `(x,y,z) → (x,z,−y)`, then centres and uniformly scales the common assembly. Isolation hides other parts and recentres/scales the selected specimen while preserving anatomical orientation. Focus and ghost controls move the camera or change styling; they do not rearrange anatomy. No left/right reflection is performed by the viewer.

Hand-placed landmark pins on the three bone specimens are app annotations, not source segmentations or independently validated clinical labels. Each source represents one adult reference anatomy, and real anatomy varies. The collections are intended for education; neither the original creators nor DBCLS endorse this app or validate its questions.
