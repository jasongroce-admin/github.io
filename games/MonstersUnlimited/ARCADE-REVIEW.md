# Monsters Unlimited: review and implementation plan

Reviewed October 4, 2026. Live route: https://jasongroce.com/games/MonstersUnlimited/index.html. Source: https://github.com/jasongroce-admin/github.io, baseline `ea51727`. Implementation branch: `codex/monsters-rampage-20261004`, isolated checkout `C:\REPO\_worktrees\monsters-rampage-20261004`.

## Existing game

Vanilla JavaScript draws a 1280 × 720 canvas. `level-data.js` supplies a single Peoria level, six monster identities, generated building art, civilians, and three vehicle damage stages. The player starts human and transforms on movement/jump/punch. Arrows/WASD move and climb; Space jumps; J/Ctrl or a canvas click punches; right click/mobile Eat consumes people. Buildings are grids of hit points, with debris, score popups, support-column removal, and a rotating collapse animation. A small horizontal camera scroll follows the player. The existing builder edits the level and saves individual rig placements in browser storage.

## Defects and arcade differences

| Priority | Finding | Evidence / effect |
| --- | --- | --- |
| P0 | Disconnected monster anatomy | Live Lizork has legs above its torso. `game.js` 737–764 uses unrelated hard-coded part positions, anchors and scales; layout coordinates are not multiplied by monster scale. Head/torso/legs rotate independently without parent joints. Saved browser layouts can change the result per visitor. |
| P0 | No solid building collision or roof support | `movePlayer` 301–357 only resolves the street. The monster can pass through a building and never stand on a roof. |
| P0 | Wall-jump impulse lost | The wall-jump assigns horizontal velocity, then normal movement overwrites it with input every subsequent frame. There is no latch cooldown, allowing immediate reattachment. |
| P0 | Input-dependent combat and stale aim | Punch requests are single-frame flags, keyboard repeats depend on the operating system, and pointer aim is a fixed world point. Held attacks and animation cadence do not match: .26-second cooldown, .75-second pose. |
| P0 | Punch damages outside reach | `getHitCell` searches neighboring cells without checking each cell against the hit rectangle. A hole can cause unrelated masonry to be hit. |
| P1 | Vehicles never die | `vehicle.health = Math.max(1, ...)` prevents zero health. Repeated punches can award points on a disabled vehicle. |
| P1 | Sparse threats and no lives/progression | Only contact with vehicles causes damage. No bullets, helicopters, soldiers, fall/collapse penalty, life recovery, or next city. Clearing Peoria stops the game. |
| P1 | Building destruction is too automatic | Removing one support tile deletes its entire column, regardless of surrounding masonry, undermining deliberate climbing and punching. |
| P1 | Startup and lifecycle | Start does not wait for preload; missing art can silently disappear. Pause/input are not reset consistently; focus loss can leave held directions active. Human hitboxes ignore configured dimensions. |
| P2 | Feedback and presentation | No hit pause, impact shake, attack sounds, visible lives/day, or clear controls. Portrait CSS crops the playfield instead of fitting it. |

## Arcade target

Preserve Monsters Unlimited's original characters and generated assets. Aim for the original game's straightforward direction + jump + punch interaction, climbing both sides of buildings, targeted masonry damage, dangerous collapses, military pressure, edible health recovery, scoring and successive cities. The original cabinet uses an eight-way stick and two buttons ([1986 Bally Midway operator manual](https://files.arcadertfm.com/Rampage__Upright_3_Player_(0E36_00300-0000).pdf)). This is an inspired adaptation; three starting lives, selectable characters and these authored cities are design choices, not claims of exact arcade rules or scoring.

## Prioritized implementation

1. **P0 — Connected animation and reliable movement.** Calibrate shared joints using the existing art; give every pose one root and facing transform. Add stable foot placement, responsive acceleration/deceleration, gravity, buffered jump/coyote timing, persistent wall-jump momentum, directional wall grabs, roof landing and horizontal wall collision.
2. **P0 — Consistent attacks and destruction.** Hold-to-punch cadence, directional up/down attacks, brief attack poses, hit rectangles aligned with visible fists, damage only intersecting masonry, destroyable vehicles, progressive cracks, predictable structural collapse and roof stomps.
3. **P1 — Complete arcade loop.** Add tank/truck shots, window soldiers and helicopters; consolidate player damage/invulnerability, edible recovery, collapse/fall damage, three lives and respawn, successive authored cities, score carryover, difficulty increase and a bounded camera.
4. **P1 — Arcade feedback and controls.** Hit pause/shake, synthesized sound with mute, visible lives/day, pause/focus handling, keyboard/touch instructions and responsive fit.
5. **Verification.** Exercise movement, jump arc, wall latch/release, roofs, exact attack reach, collapse detachment, enemy damage, invulnerability, life loss/respawn, scoring, pause/restart and city transitions. Inspect real browser renders and refine visible assembly issues. Preserve original route on the public site until deployment is explicitly requested.

## Implementation and verification

Implemented in the isolated source repository:

- A new connected renderer attaches the head to the neck, arms to shoulder sockets and legs to the hip. Torso motion carries its attachments, and the common root mirrors the complete character. Idle, walk, jump, climb, horizontal punches and downward roof strikes were rendered and inspected in both directions. Transparent borders and stray registration marks are excluded from calibrated bounds. The rendered fist and gameplay reach use the same distance.
- Immediate monster start, character/city selection, accelerated movement with braking, buffered jump/coyote timing, persistent wall-jump impulse and regrab cooldown, directional grabs, vertical climbing, roof hoisting/landing/stomping, gravity and narrow body collision. The camera follows horizontally and lifts to keep tall rooftop action visible.
- Held keyboard, mouse and touch punches at a consistent .24-second cadence; directional attack aim persists while held. Damage only intersects surviving masonry. Removed automatic whole-column deletion. Progressive cell damage leads to a vertical collapse, rubble, collapse/fall hazards, and city bonuses. Vehicles now reach zero health and stop awarding repeated-hit score.
- Armored traffic fires aimed projectiles; soldiers shoot from building edges, and helicopters cross the city and fire. Punching can defeat these threats. Civilians and revealed food recover health; revealed bombs harm the player. Projectile damage, short invulnerability, three lives and a human/respawn transition form a complete survival loop.
- Peoria, Chicago and San Francisco have authored layouts. Score/lives carry into the next city, a small health recovery rewards clearing, and further cycles increase enemy pressure. Enemy geometry uses simple canvas art for soldiers/helicopters; existing traffic and city art remain intact.
- Optional synthesized impacts, hit pause, shake, visible health/lives/day, pause/mute, focus-loss handling and responsive canvas fit. The builder's normal preview uses the connected renderer; its legacy independent-part editor/save/export remains available and is clearly labeled as builder-only.

**Verification completed:** all 18 Node gameplay regressions pass, including exact masonry misses, destroyed-cell misses, vehicle death/score behavior, buffered keyboard jumps, wall kick momentum, directional grabbing, roof support loss, tallest-roof stability, down punches into a roof, held keyboard/pointer attacks, projectile damage, invulnerability/life loss, last-life game over, score carry, bounded camera, and one-time completion after the final collapse. JavaScript syntax and Git whitespace checks pass.

**Browser verification:** the original public game and the updated local game both loaded. The updated game was played through movement to a wall, climbing/hoisting onto the hotel roof, held downward punches (24 → 22 hotel sections, +160 score), and jumping away (airborne, detached, horizontal motion). The corrected monster assembly and camera were inspected visually. No game errors appeared in the checked browser logs. Screenshots and the renderer pose sheet accompany this report. This is focused gameplay verification, not a claim of a complete manual clear of all three cities or a physical-phone test.

**Remaining priorities:** finish full-body art/rigs for Kragmor, Vorgath and Skorath (their supplied stand images are torso cards, so they remain in the builder but are unavailable in the playable roster); add animated limb rigs for Grokkon/Thorvak beyond whole-sprite pose animation; tune enemy pacing, health economy, city scoring and collision against longer play sessions; improve military artwork and add dedicated tanks/aircraft variety; consider original-style multiplayer and more cities. Exact Rampage scoring, cabinet timing and co-op rules are not reproduced.

**Publication status:** this is a local source update on the named branch. Nothing was pushed or deployed. The public URL continues serving the existing version. No repository-access blocker prevented implementation. The unrelated original checkout changes were preserved. Luna handled routine audit, UI/data edits and regression work; stronger reasoning handled the gameplay architecture and connected-art debugging.
