# Native satellite history engine

This bundle adapts the orbit-search and imagery engine from [Watched](https://github.com/dev-Armaan/satellites), copyright Armaan Gupta, MIT licensed. The license and third-party notices are included here. Upstream snapshot inspected: `47c348b26830a072a7774b4d203a2939059efc29`.

The local source and build configuration used for this integration are in the workspace at `watched-source/satellites-main`. `groce-entry.ts` exports `computeReport` and `getSatInfo`; `vite.groce.config.ts` builds the ES module and workers. The catalog loader requests the upstream public orbital catalog and falls back to the bundled snapshot. The engine warns when element data becomes stale. Captures are fetched from their original imagery services; the interface distinguishes images from predicted passes.

The bundle is built for the `/groce-eye/history-engine/` path. Rebuild and verify if the hosting path changes. Third-party service availability, terms and catalog formats can change.
