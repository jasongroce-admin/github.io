# Building physics and helicopter follow-up — October 5, 2026

This local update addresses the reported blocked street movement, climbing empty walls, and window portraits walking on the sidewalk. It supersedes the first review's horizontal building-wall barrier design.

## Changes

- Buildings are background façades along the street, so horizontal movement can pass in front of them. Their exposed surviving cell tops form one-way roof and ledge platforms. Landing uses the descending feet position to find a lower ledge even when another section survives overhead. Walking beyond the roof edge or destroying the standing tile removes support.
- A climb requires intact masonry at the monster's raised hands in the outer column. Destroying that grip releases the monster into gravity with a brief regrab cooldown. Climbing stops at gaps, and roof hoisting uses the held surviving tile's height rather than the original building roof. Connected head, arm, and leg sockets remain intact.
- Window occupants belong to a specific building cell and stay stationary while it survives. Losing that cell or entering building collapse switches the window portrait to an existing full-body runner, preserves the occupant's center/feet position, applies a falling state, and begins street walking after landing. Soldiers also lose their position when their supporting edge tile is destroyed.
- The procedural helicopter silhouette is replaced by generated transparent side-view artwork, preloaded locally, mirrored for leftward flight, and gently bobbed in flight. Its 124 × 54 visual and hit rectangle agree. Existing enemy flight, attacks, health, and scoring remain active.

## Verification

All 29 Node gameplay regressions pass. JavaScript syntax and Git whitespace checks pass. Eleven added cases cover street crossing, destroyed wall grabs and grip loss, damaged roofs, edge falls, lower ledges, actual vault height, stationary window occupants, unrelated damage, fall-to-run transitions, and soldier support.

Real browser gameplay verified street crossing (x 75 → 443), intact wall grab, punching away the held wall section (+320 score and release into gravity), roof hoisting (feet at the hotel's y 170 roof), jumping away, and generated helicopter flight. Destroying the first occupant's host cell also passed the browser escape check: `w1` changed from `human-b` in a window to a falling `ground-runner-b`, landed at y 596 with its 54-pixel height, then began walking; the other window occupants stayed in place. Testing uses a local browser harness that sends ordinary keyboard and pointer input; it does not modify game state. The harness remains outside the source repository.

This remains local on `codex/monsters-rampage-20261004`, based on the prior local commit `d7f887f`. No push or deployment was performed. Longer full-city play sessions and enemy/health tuning remain useful; these are focused defect checks, not a full clear of every city. Production buildings remain cell-based arcade approximations, with foot-center support and a structural collapse threshold rather than a rigid-body simulation.

## Generated helicopter

Generated with the built-in image generation tool; no API-key fallback was used. The original cached result was copied into the game as `games/MonstersUnlimited/MUimages/generated/attack-helicopter.png` and into the task outputs as `MonstersUnlimited-helicopter.png`.

Saved paths:

- Game asset: `C:\REPO\_worktrees\monsters-rampage-20261004\games\MonstersUnlimited\MUimages\generated\attack-helicopter.png`
- User copy: `C:\Users\jgroce\Documents\Codex\2026-10-04\referenced-chatgpt-conversation-this-is-an\outputs\MonstersUnlimited-helicopter.png`

Final prompt:

> Create a polished game sprite for Monsters Unlimited, an arcade city destruction game. Intended use: a single side-view enemy military helicopter PNG on a fully transparent background, facing RIGHT, with no ground, no backdrop, no text, no border, no checkerboard. Detailed hand-painted 2D arcade realism: olive green attack helicopter, compact angular armored fuselage, dark blue cockpit glass, short wing stubs carrying small missile pods, a narrow rear tail boom pointing left, tail rotor, skids and a broad main rotor overhead. Strong readable silhouette, softly highlighted metal, clean dark outline, subtle worn painted texture. The nose points right and the tail points left. Full helicopter including both rotors fits inside the canvas with small even margins. Main rotor has a subtle horizontal motion smear suitable for use as a static sprite during flight. Body must read clearly at approximately 120 pixels wide in a richly painted city game. No other objects, no characters, no logos, no duplicate views or sprite sheet. Crisp alpha edges, no glow around cutout.
