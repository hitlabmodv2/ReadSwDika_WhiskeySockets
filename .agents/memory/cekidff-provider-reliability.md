---
name: Free Fire UID lookup reliability
description: The public isan Free Fire nickname endpoint can return success for arbitrary input without a nickname, so responses need strict profile validation.
---

Never treat `success: true` or an echoed UID as proof that a Free Fire player exists. A lookup is verified only when the response contains a non-empty nickname and the returned UID matches the requested numeric UID. If providers fail, report the service as unavailable rather than inventing a profile.

**Why:** The public endpoint returned successful responses for zero, text, and arbitrary long IDs while omitting player identity data.

**How to apply:** Validate numeric UID input before calling providers, require nickname plus matching UID, and keep fallback providers behind the same validation.

The official Free Fire Mania card is not a static image URL: its page renders `#ffShareCard` and the Download card button creates a PNG with html2canvas. Use the `/profile/{uid}.html` page in a browser session, read caption data from that same DOM, and send the downloaded PNG with the caption. The older `/akun/{uid}.html` route may trigger Cloudflare, and separate lookup requests can be rate-limited.

**Why:** Rebuilding the card locally can diverge from the website, while making separate API and card requests caused intermittent lookup-unavailable failures.

**How to apply:** Keep card capture and profile extraction in one Chromium session; treat Cloudflare/browser unavailability as an explicit user-facing failure rather than fabricating a card.