---
name: WilyBot changelog.txt format
description: Formatting convention for changelog.txt entries — when to update it and what WA text styles to use
---

`changelog.txt` should be updated habitually at the end of any session that adds a feature, fixes a bug, or changes bot behavior — the user explicitly asked for this to be a standing habit, not a one-off.

**Structure:** header block with rilis info, then counts (`✨ N Fitur Baru`, `🔧 N Bug/Error Fix`, `🚀 N Perubahan`), then one section per category, each entry numbered.

**Why:** the user reads this file/sends it to their own users as release notes over WhatsApp, so it must render correctly with WhatsApp's inline formatting rules (single `*`, `_`, `~`, `` ` `` — no double-asterisk markdown).

**How to apply — use each style contextually, not decoratively:**
- `*bold*` — entry titles, key terms, important values
- `_italic_` — secondary notes, captions, "kenapa/catatan" asides
- `~strikethrough~` — describing the old buggy behavior being fixed
- `` `monospace` `` — file names, command names, config keys/values
- Numbered list (`1. 2. 3.`) — sequential cause→fix reasoning
- Bullet list (`•`) — parallel/unordered items (e.g. multiple deps, multiple options)
- `> quote` — the final outcome/result line at the end of each entry
