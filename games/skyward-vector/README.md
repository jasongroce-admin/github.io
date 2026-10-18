# Skyward Vector

An original six-sector vertical arcade shooter created for Jason Groce's GitHub Pages site. Its separate air weapon and forward-targeted ground bombs take inspiration from Xevious. All code, ship designs, maps, campaign, effects, UI, and synthesized sound are original to this game. This is not an official Xevious release or an exact recreation.

## Play

- Move with arrows / WASD. Hold **Z or Space** to fire at aircraft. Hold **X** to bomb ground structures.
- Mouse: hold **left mouse** in the playfield to steer and fire at aircraft. **Right-click** drops a ground bomb; **hold right mouse** for repeated bombing, including while holding left to fly. Releasing left stops mouse steering/fire and never drops a bomb. Both weapons have unlimited ammunition.
- The amber crosshair sits ahead of your ship. Align it over a turret or the glowing fortress reactor, then bomb. Air fire cannot damage ground targets; bombs cannot damage aircraft.
- A bomb marks the ground when released and lands after a short fall; its landing marker follows the scrolling terrain.
- On touchscreens, drag in the playfield to steer and hold the FIRE / BOMB buttons. Air autofire is optional.
- **P / Escape** pauses. Sound and fullscreen are controlled in the header.
- Supply diamonds upgrade the air weapon, grant a shield, or add a ship. Scoring 20,000 points awards a bonus ship, then another every 20,000 points.
- Bomb the fortress reactor at the end of each sector. Complete all six for victory.
- Retry sector restores its starting score and equipment with at least three ships. Best score and unlocked sectors save in this browser when local storage is available.

## Host on GitHub Pages

Copy this entire folder into `games/skyward-vector/` in the Pages repository. The entry point is `index.html`. All runtime scripts, icons, and artwork use relative URLs. No build, API keys, account, server code, or third-party assets are required. Use HTTP(S), because browser module security blocks opening the game through `file://`.

Local preview from the repository root: `python -m http.server 4186 --bind 127.0.0.1`, then open `http://127.0.0.1:4186/games/skyward-vector/`.

Files: `index.html`, `style.css`, `ui.js`, `core.js`, `visuals.js`, `art.js`, `effects.js`, `favicon.svg`, and `assets/`. Gameplay uses locally loaded generated combat sprites and six terrain panels, composited with animated Canvas lighting, weapons, smoke, fire, shockwaves, debris, and shields. Assets load from this folder and require no external service while playing.

The generated asset dimensions, exact prompts, and tool provenance are documented in [ARTWORK.md](ARTWORK.md).

Designed and implemented October 18, 2026. Build 20261018-3 upgrades the gameplay art and explosions while retaining left-mouse flight/fire and right-mouse bombing. Bomb blast visuals span over twice their earlier radius, with large ground and aircraft explosions and a multi-stage fortress detonation. Visual effect sizes do not enlarge weapon damage areas.

Development verification: from this folder, run `node --test tests/*.test.mjs` with a recent Node.js. Seventeen deterministic tests cover combat, movement, sector completion, effect lifecycles, effect limits, precision damage, and pause. The full-campaign fixture uses protection to isolate progression; damage and lives are tested separately.
