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

## October 5 verification checkpoint

All 39 gameplay regression tests pass. The suite checks all six playable rig assets, arm geometry, directional attack reach, climbing contact, held/released keyboard and touch attacks, focus loss, foot movement during the gait, and eating after a backhand in both facings. Existing building-support, destroyed-wall, civilian release, health/lives, scoring and campaign tests remain included.

Real local browser play exercised all six through walking right, jumping, grabbing a wall, climbing onto a roof, downward punching, backhanding, eating, walking left and attacking in the left-facing pose. All six loaded their new artwork and completed those checks. Revised walking cycles were captured in both directions for every character. Renderer contact sheets cover twelve poses in both facings; 84 endpoint/grounding assertions and 5,148 stance/swing checks across all six characters passed, including retreat opposite facing.

The builder initially fell back to old/missing artwork because its unbounded parallel asset loading could time out large atlases. It now uses the game's four-worker loading queue. All six normal previews were rechecked visually in the browser and showed their new complete bodies; the checked builder console had no errors. A 390-pixel portrait layout exposed all four action buttons. Physical touch-device gameplay remains unverified. Game and builder cache versions were refreshed to `20261005-4`.

## Remaining work and publication

Longer full-city play sessions are still needed to tune enemy pressure, health recovery and score balance. Multiplayer, additional cities, and species-specific abilities are future work. Physical-phone gameplay has not been verified.

At the October 5 checkpoint, this update was saved locally without deployment. The user subsequently authorized publication of the completed joint corrections described below.

## October 6 anatomy and attack correction

Visual inspection confirmed that both relaxed elbows bent toward the belly. The old strike origin also sat inside the chest: although the hand reached its computed hit point, the forearm remained visibly folded at full impact. The rebuilt poses now use the actual animated shoulder socket. Relaxed elbows bend outward, and both arms remain visible. Each strike uses fixed-length upper arm, forearm and hand segments, reaching an almost straight elbow at contact without stretching the bones.

Combat now has a 60 ms windup, a 40 ms contact hold, and 120 ms recovery. Damage resolves once when the hand reaches the target. Forward and rear strikes select the appropriate arm; up/down aim works in either facing. The body keeps its facing during the short attack while horizontal movement remains responsive. Lethal damage cancels a pending strike. Roof punches crouch the pelvis while preserving the planted soles so the hand reaches the supporting floor naturally.

Walking arms counter-swing against their corresponding legs. Planted feet stay fixed in world space while raised feet advance. During backward steps, knees and toes retain the monster's facing; the foot cycle still follows actual travel. Rise/fall poses blend across the jump apex, and alternating climbing grips move visibly within the wall-contact band.

The expanded gameplay suite has 43 passing tests, including all-six relaxed-elbow direction, straight and aligned attack contact, knee/foot chains in both facings and travel directions, damage timing, one-time impact resolution and lethal cancellation. Annotated pose sheets cover every monster's front, backhand, up, down, roof and wall attacks in both facings through windup, contact and recovery. Walking strips cover all six in both directions and backward steps. Real browser play checks all six through directional attacks, walking, jumping, climbing, roof damage, eating and mirrored backhands using ordinary input events; it does not inject game state.

Release build `20261006-2` targets the existing public game and builder routes. All six original generated atlases and the newer helicopter are included. Game and builder asset queries use the release version to replace cached scripts. The isolated release changes only MonstersUnlimited paths; unrelated primary-checkout edits are preserved. Deployment and live-source verification are recorded in the task's release report.
