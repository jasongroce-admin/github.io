# Tanks Builder Tools

## Builder UI
- Open: `games/tanks-and-more-tank/tools/tank-level-builder.html`
- Build terrain, place hero/enemy spawn, place WebP assets, adjust per-asset properties, then export `.tanklevel.json`.

## Apply A Level (Local only)
- Run: `apply-builder-level-local.cmd`
- Select exported level package.
- Writes/updates:
  - `games/tanks-and-more-tank/levels/slot-XX-*.json`
  - `games/tanks-and-more-tank/levels/level-manifest.json`

## Apply A Level (Local + Stage + GitHub)
- Run: `apply-builder-level-and-publish.cmd`

## Import Images (Local only)
- Run: `apply-builder-images-local.cmd`
- Choose files or a folder.
- Per image, pick category + title.
- Copies to `images/` and updates `levels/image-catalog.json`.

## Import Images (Local + Stage + GitHub)
- Run: `apply-builder-images-and-publish.cmd`

## Categories Included
- `vehicles`, `scifi`, `military`, `characters`, `weapons`, `effects`, `nature`, `misc`
