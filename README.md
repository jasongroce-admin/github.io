# Jason Groce Game Site

Educational browser game launch pages focused on community response and training.

## Structure

```text
github.io/
├─ index.html
├─ assets/
│  └─ css/
│     └─ site.css
├─ games/
│  ├─ game-01/
│  │  └─ index.html
│  ├─ game-02/
│  │  └─ index.html
│  └─ firefighter/
│     └─ index.html
├─ tools/
│  └─ check_links.py
├─ README.md
└─ LICENSE
```

## Current projects

- **Game 01: Infrastructure Response Training** (`games/game-01`)
- **Game 02: Vehicle Patrol Driver Training** (`games/game-02`)
- **Firefighter Training Launcher** (`games/firefighter`) -> launches <https://kennardin.com/firefighter-game/mobile.html>

## Maintenance

- Run local reference checks:

  ```bash
  python3 tools/check_links.py
  ```
