# Section preview images

The `.webp` files are 480 × 300 previews rendered from the same anatomical meshes used by the quiz. The section's own targets appear in bone ivory or muscle blue, with faint neighboring structures for orientation. Limb previews generally show the right side. The three landmark cards include blue pins snapped to the source mesh at the application’s surface locators. Camera framing, lighting and colors are presentation changes. The source geometry and arrangement are preserved.

Render again with the local Vite server running using `node scripts/render-section-thumbnails.mjs`. The renderer accepts `ANATOME_PREVIEW_URL`, `ANATOME_BROWSER_RUNTIME` and `ANATOME_CHROMIUM` for other local environments.

Skeletal previews, including scapula, humerus and femur landmark cards, derive from **BodyParts3D, © The Database Center for Life Science**, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Source and downloads](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html).

Muscle previews derive from **Z-Anatomy**, by Gauthier Kervyn, Marcin Zielinski, Lluís Vinent Juanico and contributors, and are distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Z-Anatomy derives in part from BodyParts3D. [Source project](https://github.com/LluisV/Z-Anatomy).

See [the anatomy asset attribution record](../models/ATTRIBUTION.md) for the pinned source, complete credits and conversion details.
