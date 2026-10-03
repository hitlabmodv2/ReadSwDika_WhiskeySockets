---
name: WhatsApp Channel post reactions
description: Baileys Channel reaction support, post-link IDs, and live-session reliability checks
---

WhatsApp Channel post reactions do not need a third-party scraper: resolve the channel invite token with `newsletterMetadata('invite', code)`, take the post ID from the shared link, then use Baileys `newsletterReactMessage(jid, postId, emoji)`. A parser/mock test only proves local behavior; it does not establish WhatsApp accepted a live reaction. A public Baileys issue opened 2026-06-17 reported `smax-invalid (479)` for newsletter reactions on a v7 release candidate.

**Why:** Channel reactions use their own newsletter method rather than regular chat `sendMessage({ react })`, and library support does not guarantee the linked session/server accepts the request.

**How to apply:** Prefer the current Baileys newsletter API over HTML scraping, keep the post-link parser isolated, and distinguish dry-run success from actual server acceptance. Verify live only with explicit user authorization and one chosen test post.