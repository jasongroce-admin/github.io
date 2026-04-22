# KVFD Builder Level Update Guide

This guide explains the new safe workflow:

1. Save submission from Builder.
2. Apply to local source files.
3. Test locally.
4. Click **Commit** or **Undo** in the QA tool.

Repos used:

- Main: `C:\REPO\github.io-main`
- Stage: `C:\REPO\Stagejasongroce-online`

---

## 1) Save the level from Builder

1. Open `C:\REPO\github.io-main\games\firefighter-game\mobile-deluxe-23.html`.
2. In Builder, set **Save As Official Slot** (1-23).
3. Click **Save Submission File**.
4. Confirm the file exists (example):
   - `C:\Users\jgroce\Downloads\mixed-mayday-20.kvfdsubmission.json`

---

## 2) Apply locally, test, then Commit/Undo (recommended)

Run:

- `C:\REPO\github.io-main\games\firefighter-game\tools\apply-builder-submission-local-qa.cmd`

What it does:

1. Prompts for your `*.kvfdsubmission.json`.
2. Syncs both repos to latest `main`.
3. Updates local source slot data in:
   - `C:\REPO\github.io-main\games\firefighter-game\mobile-deluxe-23.html`
4. Copies updated HTML to:
   - `C:\REPO\Stagejasongroce-online\games\firefighter-game\mobile-deluxe-23.html`
5. Opens local game file for testing.
6. Shows buttons:
   - **Commit**: commit + push Main and Stage
   - **Undo**: restore files to pre-apply state
   - **Keep (No Commit)**: keep local edits, no push yet

This is the safest flow and matches your request to test before publishing.

---

## 3) Optional fast path (direct publish)

If you want one-step apply + push:

- `C:\REPO\github.io-main\games\firefighter-game\tools\apply-builder-submission-and-publish.cmd`

This skips the test gate and pushes immediately.

---

## 4) Drag-and-drop image import tools

Use these when adding new scene images to `games/firefighter-game/images` and auto-registering them in `mobile-deluxe-23.html`.

### A) Local repo only (no push)

- Drag image file(s) onto:
  - `C:\REPO\github.io-main\games\firefighter-game\tools\apply-builder-images-local.cmd`

What it does:

1. Lets you choose file mode or folder mode (folder imports all supported images recursively).
2. Shows one review table so you can edit output filenames once before import.
3. Reads image dimensions and renames as:
   - `category_title_widthxheight.ext`
4. Copies into:
   - `C:\REPO\github.io-main\games\firefighter-game\images`
5. Updates source lists in:
   - `C:\REPO\github.io-main\games\firefighter-game\mobile-deluxe-23.html`
   - `SPRITE_FILES`
   - `DISCOVERED_SPRITE_FILENAMES`

### B) Local + online publish

- Drag image file(s) onto:
  - `C:\REPO\github.io-main\games\firefighter-game\tools\apply-builder-images-and-publish.cmd`

What it does:

1. Same import + source updates as local mode.
2. Syncs `main` in:
   - `C:\REPO\github.io-main`
   - `C:\REPO\Stagejasongroce-online`
   - `C:\REPO\Kennard_repo` (if available/accessible)
3. Copies updated HTML + images to stage/backup repos.
4. Asks for final commit approval, then commits and pushes to `origin main`.

---

## Troubleshooting

### A) `! [rejected] main -> main (fetch first)`

Meaning:

- Remote `main` has new commits that local does not have yet.

Resolution:

- The scripts now run `fetch + pull --rebase` and retry push once.
- If this still happens, rerun the script once.

---

### B) `LF will be replaced by CRLF`

Meaning:

- Windows line-ending warning only.
- Usually non-fatal.

Optional quieting:

```powershell
git -C C:\REPO\github.io-main config core.autocrlf true
git -C C:\REPO\Stagejasongroce-online config core.autocrlf true
```

---

### C) Builder/game is visible but buttons do not work

Likely cause:

- JavaScript syntax error in `mobile-deluxe-23.html`.

Quick check:

1. Open browser DevTools Console.
2. Look for `SyntaxError`.
3. Fix parser errors first, then rerun scripts.

---

## Manual PowerShell commands

Local QA flow:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\REPO\github.io-main\games\firefighter-game\tools\apply-builder-submission-local-qa.ps1"
```

Direct publish flow:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\REPO\github.io-main\games\firefighter-game\tools\apply-builder-submission-and-publish.ps1"
```

---

## Notes

- `Save To Game Slot` in Builder is browser-local only.
- `Save Submission File` is the source update export.
- Source level overrides are stored inside `mobile-deluxe-23.html`.
