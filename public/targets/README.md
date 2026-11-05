# Individual target previews

These 192 × 128 WebP images are static previews of all 720 targets in
`modelPromptPools`. Each filename is the exact quiz prompt ID. They are served
locally and loaded lazily by the custom target picker; they do not create a
WebGL viewer or contact an image service for each row.

The images are rendered from the same shipped source meshes as the app. The
selected muscle is blue and the selected skeletal part is ivory; nearby
anatomy is faint for orientation. Each target keeps its real source shape and
body side, using the prompt's anatomical view with a small oblique offset.
Landmark images focus on the marked portion of the bone, with a blue locator
snapped to the same source-mesh vertex as the application's annotation. Side
identification previews show the whole right-sided specimen. Locators are study
annotations rather than educator-certified segmentations.

Regenerate while the local Vite server is running:

```sh
node scripts/render-target-thumbnails.mjs
```

Use `ANATOME_PREVIEW_URL` to change the local server URL, and
`ANATOME_BROWSER_RUNTIME` / `ANATOME_CHROMIUM` to select the installed development
renderer. The renderer opens a blank local asset-generation page and imports
only anatomy/rendering modules, with no app account or analytics initialization.
`catalog.json` records the source prompt/part identity and view for verification.
Camera framing, lighting, coloring, and image compression are presentation
changes; the source geometry is not edited or mirrored.

Skeletal previews, including the detailed scapula, humerus, and femur specimens,
derive from **BodyParts3D, © The Database Center for Life Science**, licensed
under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
[Source and downloads](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html).

Muscle previews derive from **Z-Anatomy**, by Gauthier Kervyn, Marcin Zielinski,
Lluís Vinent Juanico and contributors, and remain licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Z-Anatomy derives
in part from BodyParts3D. [Source project](https://github.com/LluisV/Z-Anatomy).

See [the anatomy asset attribution record](../models/ATTRIBUTION.md) for the
pinned sources, full credits, and conversion details.
