# Patrol Kennard Map Notes

- Road geometry in `map.js` is the locked, hand-aligned Kennard layout.
- Preserve user-added street names from the saved map before doing geometry changes.
- Roads without known names should be treated as alleys, not invented street names.
- Current visual modes are `USGS`, `USGS Topo`, and `Game`.
- The `Game` mode should keep roads locked while generating GTA2-style top-down yards, fields, trees, and false-3D buildings around them.
