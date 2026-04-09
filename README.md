# Jason Groce Game Site

Educational browser games focused on wastewater awareness and community response.

## Structure

```text
jasongroce-admin.github.io/
├─ index.html
├─ assets/
│  └─ css/
│     └─ site.css
├─ games/
│  ├─ game-01/
│  │  ├─ index.html
│  │  ├─ css/game.css
│  │  └─ js/
│  │     ├─ main.js
│  │     ├─ game.js
│  │     ├─ level.js
│  │     ├─ config.js
│  │     └─ utils.js
│  └─ game-02/
│     ├─ index.html
│     ├─ css/game.css
│     ├─ js/game.js
│     └─ README.md
├─ README.md
└─ LICENSE
```

## Current projects

- **Game 01: Pipe Rescue Patrol** (`games/game-01`)
- **Game 02: VPD Defender** (`games/game-02`)
- **Firefighter Game (external):** <https://kennardin.com/firefighter-game/mobile.html>

## Copyright

Copyright © Jason Groce - Kennard IN

## Maintenance

- Run local reference checks:

  ```bash
  python3 tools/check_links.py
  ```

- Run JavaScript syntax checks:

  ```bash
  for f in games/game-01/js/*.js games/game-02/js/*.js; do node --check "$f"; done
  ```

- Keep `work` and `main` synchronized before merge testing:

  ```bash
  git checkout work
  git branch -f main work
  git checkout work
  ```

