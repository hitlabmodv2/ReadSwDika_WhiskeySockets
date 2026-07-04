---
name: WilyBot logCommand missing in help/empty-input branches
description: Many SEMUA_FITUR/**/*.cjs command handlers show a help/menu text when called with no query and return early WITHOUT calling logCommand — so usage isn't logged at all. Distinct from alias-mismatch bugs.
---

Pattern: `if (!input/query) { await tolak(...menu text...); return; }` at the top of a handler, before the try/processing block that normally calls `logCommand`. The early return skips logging entirely, so `.command` (no args) never shows in logs even though the bot responded.

**Why:** User expects every typed command (with or without args) to appear in logs ("akurat realtime no bug"). Discovered via `.musikai2` (no args) not logging; same shape existed across ~20+ other handlers (musikai, cekhp, bandingkanhp, stickerly, pixivr18, bluearchive, genius, reactapi, tempmail, pixiv, nhentai, komiktap, youtube-dl/tiktok-dl/instagram-dl/facebook-dl, cuaca, alqanime-dl, kusonime, emoji-cmd).

**How to apply:** When auditing or adding any new command handler, check every early-return branch (empty input, invalid format, help menu) and ensure it calls `logCommand(m, hisoka, m.command || '<fallback-name>')` before `return`, not just the success path at the end of the try block.
