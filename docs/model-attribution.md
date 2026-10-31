# Anatomical model attribution

The maintained attribution and modification record is [public/models/ATTRIBUTION.md](../public/models/ATTRIBUTION.md). It is distributed beside the models and is the authoritative source for credits, licence obligations, transformations and source limitations.

| Collection | Actual source | Current asset licence |
| --- | --- | --- |
| 238 skeletal source parts and the three standalone bone OBJ specimens | BodyParts3D 4.0, © The Database Center for Life Science | CC BY 4.0, under the official archive's current licence |
| 462 named skeletal muscle components | Z-Anatomy, Gauthier Kervyn and contributors; source commit `6c7f9016bd5899ac8edafd31b9900c151df42ed6` | CC BY-SA 4.0 |

The muscle collection is a coherent conversion of Z-Anatomy's actual muscle source, including components missing from BodyParts3D. It is not the earlier 66-part BodyParts3D subset. The two collections preserve their own source arrangements and are not mixed into a body with incompatible poses.

[systems.json](../public/models/systems.json) provides component identities, original source names, files/commits, source bounds, conversions and checksums. [muscle-aliases.json](../public/models/muscle-aliases.json) documents the 66 conservatively retained identifiers; an identifier alias does not change a mesh's actual source or licence.
