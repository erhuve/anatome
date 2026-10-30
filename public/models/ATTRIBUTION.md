# Anatomical model provenance

The right femur, right humerus and right scapula in this directory are unmodified anatomical geometry from BodyParts3D version 4.0, distributed by the Database Center for Life Science (DBCLS) through the Life Science Database Archive.

**Attribution required by the current official archive licence:**

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.

- Primary source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Official licence, last updated 2025-02-27: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Licence: https://creativecommons.org/licenses/by/4.0/
- Archive: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/partof_BP3D_4.0_obj_99.zip
- Original paper: Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Research 37 (2009), D782–D785. https://doi.org/10.1093/nar/gkn613

Retrieved 2026-10-30. The OBJ file headers retain their original historical CC BY-SA 2.1 Japan notice; the archive's current licence page explicitly grants CC BY 4.0. Source geometry was only extracted and renamed; vertices, faces and normals are unchanged. The viewer rotates, centres, uniformly scales and shades the meshes at runtime, without mirroring or altering anatomical geometry. Hand-placed landmark markers are viewer annotations, not source segmentations or clinically validated labels.

| Runtime file | Original file | Concept identifier | Anatomical concept |
| --- | --- | --- | --- |
| femur.obj | FJ3365.obj | FMA24474 | Right femur |
| humerus.obj | FJ3368.obj | FMA23130 | Right humerus |
| scapula.obj | FJ3384.obj | FMA13395 | Right scapula |

Source model names and sides were cross-checked against the archive's `partof_parts_list_e.txt` and `partof_element_parts.txt`, as well as each OBJ header. The source coordinates are x = patient-left, y = posterior, z = superior. The viewer's proper rotation maps (x,y,z) to (x,z,-y); anterior camera is +Z, posterior -Z, medial +X, lateral -X for these right-side specimens. No reflected meshes are used.

These models represent a single anatomy, with a limited polygon density. They are learning specimens and do not establish anatomical variation. No generic schematic, AI-created anatomical mesh, or clinical-use claim is supplied.


## Whole-body study assemblies

`skeleton.glb` and `muscles.glb` are browser-oriented indexed glTF conversions of additional BodyParts3D 4.0 source geometry. They use the same DBCLS attribution and current CC BY 4.0 licence stated above.

- **Skeleton overview:** 238 named source parts: 201 bone meshes, 23 intervertebral discs and 14 costal cartilages. This is a source collection, not a count of adult human bones. It does not include every adult bone; the sternum, for example, is represented in multiple parts.
- **Major muscles:** 66 named components of selected bilateral skeletal muscles, including separately modelled heads or regions. The collection is not a complete inventory of the body's muscles.
- Skeleton source: `partof_BP3D_4.0_obj_99.zip`, linked above.
- Additional muscle source: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip
- Source model IDs, FMA concepts, anatomical names, source archive, source bounds, counts and source/asset SHA-256 hashes are recorded for every component in `systems.json` in this directory.

**Modifications:** source OBJ vertices and normals were packed into indexed float32 binary glTF, retaining each anatomical component as its own named node with its original source mesh ID and anatomical concept. No decimation, anatomical sculpting or reflection was applied. Source coordinates remain in millimetres in the GLB. The viewer applies a proper -90° X rotation to convert Z-up coordinates to Y-up, then centres and uniformly scales the common assembly to a maximum dimension of 5.3. Isolation hides other components, recentres and uniformly scales the selected source mesh; it preserves the mesh's original anatomical orientation. Colours and selected-part highlighting are study styling, not source anatomy.

The source geometry uses one adult reference anatomy and incorporates anatomical illustration refinements based on the TARO MRI reference, as described in the original BodyParts3D paper. Source names identify the specimens; this app adds no claim of medical or educator validation. These assemblies must not be described as a complete or independently validated anatomical atlas.
