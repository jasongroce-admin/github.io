# Generated gameplay artwork

The following records document the built-in image generation used for these local game assets. Source rectangles are maintained in art.js; all bitmap artwork is rendered locally during play.

# Skyward Vector combat art

Tool: built-in `image_gen__imagegen`, transparent background enabled. No image postprocessing.

Saved production asset: `assets/combat-atlas.png` (1,911,093 bytes).

Verified RGBA 1254 x 1254 with genuine alpha 0..255. Requested 1536 x 1536. Nine clear subjects in intended order; up-facing silver/cyan player and down-facing enemies correct. The tool did not preserve exact padding or cell boundaries, so renderer should use the explicit per-sprite source rectangles in `art.js` rather than dividing the image into equal cells. Geometry inspected visually and via connected alpha components; bounds in JSON are based on alpha >64 with safe padded source crops.

Full final prompt:

```text
Use case: stylized-concept
Asset type: production game sprite atlas for the original vertical arcade shoot-em-up Skyward Vector.
Primary request: Render a single 1536 by 1536 PNG sprite atlas with a genuinely transparent RGBA background. EXACTLY 3 columns and 3 rows of equal 512 by 512 pixel cells, no visible grid, no borders, no labels. One separate isolated top-down orthographic sprite centered in each cell, each contained inside the central 70 percent with at least 15 percent clear padding on every side. Precise overhead camera, premium pre-rendered 3D arcade miniature machinery with richly modeled metal plating, fine panel lines, bevel highlights, vents, tiny luminous reactor details. Readable strong silhouettes at small gameplay sizes.
Scene/backdrop: completely transparent; no ground, scenery or environment.
Grid subjects in exact reading order:
Top left cell: heroic SILVER and CYAN swept delta wing space fighter, sharp nose pointing UP toward top of image, blue glass cockpit, cyan thrusters at the rear below.
Top middle cell: compact SILVER and BRONZE enemy scout craft, distinct short wings, nose pointing DOWN toward bottom of image, amber energy details.
Top right cell: CRIMSON enemy swept fighter, pointed nose DOWN, two angled wings and dark steel fuselage.
Middle left cell: heavy ORANGE and GUNMETAL enemy interceptor, broad armored wings, nose DOWN, three rear engines at top.
Middle middle cell: circular alien flying drone seen directly overhead, concentric metallic rings, VIOLET and AMBER central core, radial panels.
Middle right cell: ground hexagonal GUN TURRET, gunmetal base, bronze armor, single long barrel pointing DOWN.
Bottom left cell: TWIN BARREL ground artillery battery, compact dark square and orange armored pedestal, two parallel barrels pointing DOWN.
Bottom middle cell: armored ground BUNKER, square rounded rectangular steel armor, teal reactor block, orange perimeter lights, no guns.
Bottom right cell: huge octagonal ground FORTRESS, broad elaborate gunmetal fortress base with eight radial armor sections, central glowing ORANGE reactor, four small turrets integrated into the silhouette, top-down.
Lighting/mood: consistent studio lighting from upper left, strong edge highlights, subtle internal ambient occlusion confined within each object.
Constraints: original designs; one sprite per cell; all isolated and fully within individual cells; no text, logos, trademarks, characters, projectiles, explosions, exhaust trails, smoke, backgrounds, or checkerboard. NO projected shadows extending outside silhouettes, because the renderer supplies shadows. No perspective tilt. Actual alpha channel transparency.
```


# Skyward Vector terrain art

Generated with the built-in imagegen tool, nontransparent. Original PNG copied into the game assets directory without image editing.

Asset: `work/site/games/skyward-vector/assets/terrain-atlas.png`

Measured output: **1254 x 1254 RGB PNG**, with exact 2 columns x 3 rows, cells **627 x 418**. The tool returned a different pixel size from the requested 1536 x 1536, while preserving the exact grid. Runtime should compute crop width from image.width / 2 and crop height from image.height / 3.

| Panel | Terrain | Measured crop (x, y, width, height) |
|---|---|---|
| 0 | Forest | 0, 0, 627, 418 |
| 1 | Delta | 627, 0, 627, 418 |
| 2 | Desert | 0, 418, 627, 418 |
| 3 | Glacier | 627, 418, 627, 418 |
| 4 | Coast | 0, 836, 627, 418 |
| 5 | Citadel | 627, 836, 627, 418 |

## Visual QA

- All six terrains are distinct and arranged in the correct cells, with straight boundaries and no borders or gaps.
- Strict top-down view is strong, particularly the industrial rooftops. Cliff terrain has shadow relief and visible walls, as expected from 3D material depth, without horizon or cinematic perspective.
- No lettering, UI, targets, spacecraft, or subjects crossing cells were observed.
- Terrain contains strong microtexture and natural material detail. Glacier and desert are appreciably brighter than forest, coast, and citadel; runtime darkening is advised to keep projectiles readable.
- Top-bottom edges are not truly seamless. Runtime crossfading or seam blending remains necessary.
- Source: C:/Users/jgroce/.codex/generated_images/01a14f1f-734e-7c70-86d6-1a4f96c4b372/exec-37b600be-7270-46db-8985-c4fc47834e4a.png

## Exact generation prompt

```text
Use case: stylized-concept.
Asset type: production game terrain atlas for a top-down vertically scrolling arcade shooter.
Create ONE square PNG, exactly 1536 by 1536 pixels. It is a rigid 2-column by 3-row atlas with six rectangles exactly 768 px wide and 512 px tall. No borders or gaps. Clean sharp panel boundaries at x=768, y=512, y=1024. Each terrain is independent and must stop at its rectangular cell boundary.
Cell positions:
Row 1 left (x0 y0 768x512): lush emerald forest canopy with clearings and a narrow winding river, stone ridges and scattered natural ground detail.
Row 1 right (x768 y0 768x512): broad braided river delta with multiple blue water channels, green marsh islands, sand shoals and wetland vegetation.
Row 2 left (x0 y512 768x512): amber rocky desert with eroded dry channels, small dunes, dusty plateaus, rust-colored mineral ridges.
Row 2 right (x768 y512 768x512): glacial landscape of icy cliffs seen straight from above, turquoise crevasses, snowfields and exposed blue-grey rock.
Row 3 left (x0 y1024 768x512): storm coast with very dark navy ocean, white wave edges, small jagged rocky islands, sparse dark vegetation.
Row 3 right (x768 y1024 768x512): sophisticated industrial citadel environment with intricate steel city blocks, pipes, roof vents, short runways and orange power conduits, no aircraft.
Style: premium pre-rendered 3D real-time-strategy terrain texture, strong material detail and subtle terrain depth, photographic miniature detail, soft upper-left directional light. Subdued mid-dark values for bright arcade projectiles to read over it. Sophisticated natural textures rather than flat vector or cartoon shapes. Consistent physical scale in every panel. All six camera views are STRICT 90 DEGREE VERTICAL TOP-DOWN ORTHOGRAPHIC, looking straight down at the ground, without perspective, horizon or sky. This is usable scrolling game terrain, not concept art, not an isometric illustration, not cover artwork.
Composition: textures and terrain fill every panel all the way to all four cell edges. Favor formations that can continue vertically; match approximate surface distribution at each panel's upper and lower edges. Natural varied feature distribution without a single dominant subject.
No text, lettering, numbers, watermarks, logos, captions, grid lines, panel frames, UI, spacecraft, characters, enemies, turrets, targets, bullets, explosions or icons. No objects or landforms crossing between separate cells.
```

