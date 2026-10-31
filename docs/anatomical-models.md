# Anatomical model collections

The system atlas contains 700 named source parts. These are anatomical components and source meshes, not a claim of 700 separate muscles or a complete college course.

| Collection | Parts | Triangles | Download asset | Source |
| --- | --- | --- | --- | --- |
| Skeleton overview | 238 | 581,336 | 11.88 MB indexed GLB | BodyParts3D 4.0 |
| Skeletal muscles | 462 | 1,822,754 | 21.87 MB lossless Meshopt GLB | Pinned Z-Anatomy muscle FBX |

The skeletal collection contains 201 bone meshes, 23 intervertebral discs and 14 costal cartilages. The source omits the coccyx and auditory ossicles; its sternum is represented by multiple source pieces. Part counts therefore differ from textbook bone counts.

The muscle collection includes bilateral muscles, separately modelled heads and regions, rotator cuff, shoulder/arm/forearm, hand and foot intrinsics, hip/adductors, thigh/calf/shin, superficial and deep back, abdominal wall, diaphragm, face and jaw, neck, pelvic floor, extraocular muscles, and skeletal muscles used for swallowing and voice. Isolated tendon structures, bursae, fascia sheets, ligaments, retinacula and annotation objects were excluded. Source groups, such as an intercostal or lumbrical group, remain named as groups.

The muscle geometry comes from one internally coherent Z-Anatomy source pose. It includes actual latissimus dorsi, rectus abdominis, masseter, temporalis, internal oblique and transversus abdominis models absent from the original BodyParts3D subset. The skeletal atlas keeps its separate, coherent BodyParts3D pose. Geometry from these poses is not mixed into a single body.

The three standalone right femur, humerus and scapula specimens remain available for precise landmark study. Their hand-placed pins are viewer annotations, not segmented anatomical features. Sources and licences are detailed in [the maintained attribution record](../public/models/ATTRIBUTION.md).

## Geometry and orientation

The runtime GLBs use X toward subject-left, Y posterior and Z superior in millimetres. Z-Anatomy's original source-world transforms are baked with the proper unit/axis conversion `(X,Y,Z) → (10X,−10Z,10Y)` from its centimetre/Y-up frame. The viewer rotates `(x,y,z) → (x,z,−y)`, then centres and uniformly scales a collection or isolated specimen. Camera framing and visibility controls preserve actual model positions.

No anatomical decimation, positional quantisation, pose editing or invented counterpart anatomy was applied. Identical float32 attributes are indexed and reordered; Meshopt compression preserves the resulting geometry losslessly. Reflected source authoring transforms require corrected triangle winding, with compatible outward smooth normals. These changes affect rendering orientation, not anatomical shape.

Every part retains its actual source name and node/concept identity. Unknown FMA identifiers were not invented. All 66 previous muscle identifiers are retained only for matching anatomical components and sides; [the alias audit](../public/models/muscle-aliases.json) records those matches.

## Appearance and visibility

Muscle context uses opaque red surfaces with directional studio lighting and restrained highlights. This lets the visible outer surfaces occlude deeper anatomy, keeping muscle contours readable rather than blending hundreds of translucent layers. Surface geometry, source normals and anatomical arrangement are retained; no invented fibre-direction texture is added.

The blue selected target has a separate X-ray visibility mode, controlled by the eye button. When enabled, it is drawn through surrounding muscles at its actual source position, while keeping its own surface depth and shading. The on-screen X-ray target cue identifies this study aid. Turning the control off restores normal occlusion, so a deep target may be covered by superficial muscles. Isolate remains available to inspect the target alone. The skeletal collection retains translucent context for numbered and small structures.

Materials, lighting and target visibility are presentation choices; they do not imply a change to the anatomical specimen or its coordinates.

## Reproduction and checks

`npm run build` builds the app from the checked-in GLBs and does not require downloading or converting source anatomy.

Source conversion utilities are retained in `scripts/build-system-assets.py` and `scripts/build-z-anatomy.mjs`. They require the original official archive and pinned FBX under the sibling `research-assets/` directory; download links and source hashes are recorded in the maintained attribution and [systems manifest](../public/models/systems.json). The encoder is a development dependency; the browser uses Three.js's bundled Meshopt decoder.

Run from the project directory:

```sh
node --import tsx scripts/check-systems.ts
```

This parses the actual GLBs and checks all 700 part IDs/names, source bounds, vertex/triangle counts, left/right preservation, proper rotations, surface/normal agreement, and packaged asset checksums.

When the pinned original FBX is available, also run:

```sh
node scripts/check-z-source.mjs
```

This independently compares all 462 source nodes and 909,567 unique source vertex positions against the packaged muscle collection after the specified unit/axis conversion. It verifies that no source vertex position or anatomical pose was altered or invented.

A model inventory does not establish that every course-specific fact, landmark or anatomical variant has been assessed. The course coverage catalog distinguishes available 3D specimens from reference-only requirements.
