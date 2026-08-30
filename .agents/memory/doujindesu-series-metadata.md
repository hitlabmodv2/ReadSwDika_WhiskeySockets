---
name: DoujinDesu series metadata
description: Source-of-truth fields for DoujinDesu notification PDFs
---

Chapter-list responses are intentionally compact. The series detail endpoint is the source of truth for cover, synopsis, alternative titles, taxonomy, rating, and views; fetch it immediately before building a notification PDF.

**Why:** List snapshots omit description/authors and can lag behind the detail page, while the WhatsApp thumbnail must represent the series cover rather than an arbitrary chapter page.

**How to apply:** Require a valid series slug and cover before delivery, keep the chapter pages separate from the metadata page, and leave the item pending when detail or cover retrieval fails so the next poll can retry.