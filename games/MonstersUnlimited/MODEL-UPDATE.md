# Six-monster artwork and animation update

October 5, 2026. Local branch: `codex/monsters-rampage-20261004`.

## New original artwork

All six monster identities now use new transparent artwork generated with the built-in image maker. Each character uses the same twelve-cell atlas format and connected skeleton, with species-specific joint anchors. The existing buildings, vehicles, helicopter, civilians and human forms remain available.

| Monster | New design |
| --- | --- |
| Grokkon | Slate-blue tusked ape with a silver chest and heavy knuckles |
| Thorvak | Indigo storm wolf with a silver mane, amber eyes and a bushy tail |
| Lizork | Copper and teal armored saurian with a crest and tapered tail |
| Kragmor | Ochre armored, bristled tusked beast |
| Vorgath | Violet chitinous alien with cyan compound eyes and antennae |
| Skorath | Rust and charcoal scorpion biped with claws and a curled stinger |

Atlases are saved in `MUimages/generated/monster-rigs-v2/`. Each contains torso, neutral and attack heads, upper arm, forearm, fist, open backhand, climbing grip, thigh, shin, foot, and tail (or an upward-looking ape head). Original assets remain as fallbacks. Kragmor, Vorgath and Skorath now have complete bodies and are selectable in the game.

## Connected movements and combat

`monster-renderer.js` builds every pose around one body root. The neck, shoulders and hips follow the torso; two-bone arm and leg chains connect elbows, wrists, knees and ankles. Both facing directions use the complete mirrored rig. Atlas crops exclude transparent margins and stray disconnected fragments. Textured joint overlaps cover cut edges.

The common movement set includes idle breathing, forward walking, rising jump, falling, alternating wall grips, roof access, forward/up/down punches, downward roof strikes, rear backhands, eating and hurt reactions. The rendered striking hand and gameplay hit target share their origin and reach. New alpha images bypass the old pink color key, preserving violet details.

`J` / Ctrl punches; `K` backhands behind the monster while preserving its facing. Both repeat while held and stop on release or focus loss. Touch controls provide Jump, Punch, Backhand and Eat. Builder normal previews use the new rigs; the historical independent-part editor remains available.

The reported backward-looking gait was addressed at the foot cycle, without changing movement direction. Planted feet hold their world position while the body passes over them; raised feet swing from rear to front. The gait follows actual travel, and knee/toe orientation follows that direction.

## Verification

All 39 gameplay regression tests pass. The suite checks all six playable rig assets, arm geometry, directional attack reach, climbing contact, held/released keyboard and touch attacks, focus loss, foot movement during the gait, and eating after a backhand in both facings. Existing building-support, destroyed-wall, civilian release, health/lives, scoring and campaign tests remain included.

Real local browser play exercised all six through walking right, jumping, grabbing a wall, climbing onto a roof, downward punching, backhanding, eating, walking left and attacking in the left-facing pose. All six loaded their new artwork and completed those checks. Revised walking cycles were captured in both directions for every character. Renderer contact sheets cover twelve poses in both facings; 84 endpoint/grounding assertions and 5,148 stance/swing checks across all six characters passed, including retreat opposite facing.

The builder initially fell back to old/missing artwork because its unbounded parallel asset loading could time out large atlases. It now uses the game's four-worker loading queue. All six normal previews were rechecked visually in the browser and showed their new complete bodies; the checked builder console had no errors. A 390-pixel portrait layout exposed all four action buttons. Physical touch-device gameplay remains unverified. Game and builder cache versions were refreshed to `20261005-4`.

## Remaining work and publication

Longer full-city play sessions are still needed to tune enemy pressure, health recovery and score balance. Multiplayer, additional cities, and species-specific abilities are future work. Physical-phone gameplay has not been verified.

This update is saved locally in the isolated repository. It has not been pushed or deployed. The public site remains on its existing release.
