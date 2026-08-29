---
name: DoujinDesu XXX API
description: Undocumented API behavior needed when scraping the current doujin.desu.xxx site
---

The current `doujin.desu.xxx` site is a client-rendered SPA. Its public API is under `/api`, returns an obfuscated `_enc_resp_` payload, and requires the public app/device headers used by its frontend. Chapter image URLs come from `/api/chapters/:id` and are signed URLs that should be fetched again when processing a chapter.

**Why:** The HTML shell contains no release cards, and the previous `ts_reader` markup belongs to the old site. Treating the shell as a normal HTML scraper silently produces an empty result.

**How to apply:** Use the three API content types (`manga`, `manhwa`, and `doujinshi`), decrypt responses with the current hourly key window, refresh chapter data before downloading pages, and keep source-versioned notification state when switching domains.