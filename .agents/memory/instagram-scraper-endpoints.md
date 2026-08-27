---
name: Instagram scraper endpoint reliability
description: Public Instagram downloader services may fail independently or block server-origin requests
---

Do not rely on one public Instagram downloader endpoint. Server-origin requests can be blocked with 403, return permission errors, fail DNS, or return an empty result even for a public reel.

**Why:** A public reel test encountered all of these failure modes across multiple providers, so a single fallback does not provide reliable delivery.

**How to apply:** Keep provider calls isolated with timeouts and `Promise.allSettled`, validate that returned media URLs exist, and retain an HTML/direct scraper fallback before showing a failure message.