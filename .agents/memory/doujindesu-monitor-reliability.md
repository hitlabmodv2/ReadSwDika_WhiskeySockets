---
name: Doujindesu monitor reliability
description: External markup and delivery guarantees relevant to the Doujindesu chapter monitor
---

The current DoujinDesu API exposes three monitored release categories: Manga 18, Manhwa 18, and Doujinshi 18. Each category is fetched independently and may fail without invalidating the other categories.

**Why:** The monitor must follow the site's current API categories rather than assuming one global card list or relying on the older four-section site layout.

**How to apply:** Keep category parsing independent, validate chapter/image data before creating a PDF, and persist delivery status per group so transient send failures are retried before the item is considered historical.

Category selection is per WhatsApp group. Existing group records without a categories field remain backward-compatible and mean all three categories; the category menu stores an ordered subset for future changes.

**Why:** Different groups may want different release types, while older configurations must not silently stop receiving notifications after the feature gains category controls.

**How to apply:** Filter each item against the enabled group's selected categories before PDF generation and preserve the selection whenever ON/OFF is changed.

Notification captions should use WhatsApp formatting semantically: bold for headings/labels, italics for the title, monospace for exact category/chapter/file values, numbered steps for metadata, bullets for file details, and quote lines for context/source. Do not strike through active releases; reserve strike-through for genuinely unavailable values.

**Why:** Decorative box borders were less readable, while arbitrary strike-through makes a live release look cancelled or invalid.

**How to apply:** Keep captions compact and under WhatsApp's limit, include the category label from the scraped section, and report thumbnail availability accurately.