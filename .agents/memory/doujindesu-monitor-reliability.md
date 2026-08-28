---
name: Doujindesu monitor reliability
description: External markup and delivery guarantees relevant to the Doujindesu chapter monitor
---

The Doujindesu homepage currently exposes four release sections: Doujinshi Terbaru, Manhwa Terbaru, Manga18+ Terbaru, and Eroge Terbaru. Eroge may include series cards without a chapter; those are not chapter notifications.

**Why:** The monitor must follow the site's release sections rather than assuming one global card list, and a series landing page is not a downloadable chapter.

**How to apply:** Keep category parsing scoped to each release block, validate chapter/image data before creating a PDF, and persist delivery status per group so transient send failures are retried before the item is considered historical.

Category selection is per WhatsApp group. Existing group records without a categories field remain backward-compatible and mean all four categories; the category menu stores an ordered subset for future changes.

**Why:** Different groups may want different release types, while older configurations must not silently stop receiving notifications after the feature gains category controls.

**How to apply:** Filter each item against the enabled group's selected categories before PDF generation and preserve the selection whenever ON/OFF is changed.

Notification captions should use WhatsApp formatting semantically: bold for headings/labels, italics for the title, monospace for exact category/chapter/file values, numbered steps for metadata, bullets for file details, and quote lines for context/source. Do not strike through active releases; reserve strike-through for genuinely unavailable values.

**Why:** Decorative box borders were less readable, while arbitrary strike-through makes a live release look cancelled or invalid.

**How to apply:** Keep captions compact and under WhatsApp's limit, include the category label from the scraped section, and report thumbnail availability accurately.