---
    name: WilyBot CJS hot-reload registration
    description: how to make a lazy-required .cjs feature file hot-reloadable without bot restart
    ---
    Add `{ key: 'cjs:<name>', rel: '<path>.cjs', type: 'cjs' }` to WATCHED_FILES in src/helper/hotReload.js (media/group/etc section by category). For CJS type, hot-reload just clears require.cache on change — no restart needed, next `_require()` call in message.js loads fresh code. Confirmed live in logs: editing menu_utama.js/menupages.cjs triggered a "[HotReload] reloaded" message with zero workflow restart.
    **Why:** file must be lazy-loaded via `_require(path.resolve(...))` inside message.js (not imported at top-level) for cache-clearing to take effect: top-level CJS requires are loaded once at startup and need a real restart (see the SKIP CJS top-level list already documented in that file).
    **How to apply:** whenever adding a new lazy-required .cjs feature file, register it in WATCHED_FILES the same turn, so future edits to it take effect without asking the user to restart.
    