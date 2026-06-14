---
name: Baileys groupStatusMessageV2 unwrap
description: Baileys normalizeMessageContent unwraps groupStatusMessageV2, so m.message in the injected object no longer has that key — use m.raw instead.
---

## Rule
In `src/handler/event.js` (and any handler that uses the injected `m` object), check `m.raw?.groupStatusMessageV2` to detect group status messages — NOT `m.message?.groupStatusMessageV2`.

For the inner media type, use `m.type` directly — it is already the inner content type (e.g. `imageMessage`) because `parseMessage` drilled down.

**Why:** Baileys `normalizeMessageContent` (called inside `extractMessageContent`) treats `groupStatusMessageV2` as a "future-proof wrapper" and drills into its `.message` property. The result is assigned to `m.message` (drilled-down inner content), while `m.raw` (`WAMessage.message`) keeps the original raw shape.

**How to apply:**
- Detection check: `m.raw?.groupStatusMessageV2` (not `m.message?.groupStatusMessageV2`)
- Inner media type: `m.type` (already the unwrapped type from inject.js `getContentType(m.message)`)
- `m.raw` is defined as `WAMessage.message` (non-enumerable) in `src/helper/inject.js`
- In `jadibot.js` (`handleJadibotSW`), `msg` is the RAW Baileys message — `msg.message?.groupStatusMessageV2` still works there, no change needed.
