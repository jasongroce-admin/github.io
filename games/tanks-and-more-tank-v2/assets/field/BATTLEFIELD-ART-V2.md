# Battlefield prop damage atlases — local V2 pass, 2026-10-06

Generated with the built-in image-generation tool (not Blender), with transparent alpha. The original PNG generations remain in the Codex generated-images folder. Shipping assets are mechanically resized/compressed whole 1024×1024 WebP atlases; no image repainting or background removal was performed.

## Shared generation brief / prompt set

One square 2×2 transparent sprite atlas per subject. Equal cells: top-left intact (or crash-landed), top-right light damage, bottom-left heavily damaged, bottom-right low rubble. Maintain the same identifiable object, orientation, camera, apparent scale, footprint and lighting. Gritty photorealistic overcast battlefield lighting from upper left, muted earth tones, low three-quarter side view with a long front face and short receding face. Orthographic-like projection suitable for a side-scrolling game. Generous transparent margins, no labels, borders, scenery, opaque ground rectangles, smoke, or fire baked into the sprite. Request a consistent ground-contact baseline in each cell. Actual generated alpha extents are measured per cell to correct residual placement differences.

Subjects:

- `cornerwall-damage-v2.webp`: L-shaped masonry defensive wall with a concrete corner pillar, progressively broken into stone rubble.
- `truck-damage-v2.webp`: olive six-wheel military canvas cargo truck, perforated/lightly damaged, burned/crumpled, then low chassis scrap.
- `airwreck-damage-v2.webp`: crash-landed unbranded propeller fighter with bent wing, progressively torn and charred, then flattened aircraft debris.
- `fieldgun-damage-v2.webp`: vintage field gun, two wheels, shield and barrel, low sandbags and crates; progressively broken into low emplacement scrap.
- `depot-damage-v2.webp`: rusty horizontal fuel cylinder on supports with drums and crates; punctured, ruptured, then twisted metal rubble.
- `rocks-damage-v2.webp`: angular brown-gray sandstone outcrop; intact, cracked, broken chunks, low scattered rubble. Bonus hillside art.

## Packing and integration

`tools/pack-field-atlases.cjs` records per-cell alpha extents in `field-atlas-geometry.json`. Matching `FIELD_ATLAS_GEOMETRY` values in `game.js` place the lowest opaque edge on the supporting terrain. Each cell keeps its own centered anchor; damage stages do not flip orientation. One atlas per prop type is lazy-loaded. The six new atlases total approximately 1.17 MiB, not including existing assets.

Widths are compared against the 254-world-unit hero tank. Distant props use the same battlefield depth scale as the tanks. Plane wrecks are broad and low; trucks are tank-sized; field guns and rocks are smaller. Terrain recipes reserve full visible tank footprints, construct flat cover foundations and reject rock/structure overlap. Rubble does not block tank movement or shells.

## Verification boundary

Seeded-engine and real native-canvas offline render tests are included under `tools/`. Browser navigation/input and physical touch-device QA were unavailable in this pass; offline renders must not be described as browser screenshots or mobile performance verification. This update remains local until separately approved for publication.
