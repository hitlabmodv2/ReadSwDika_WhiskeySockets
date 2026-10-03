---
name: NovaMail provider behavior
description: External behavior and reliability constraints for the NovaMail temporary-mail API
---

NovaMail's public API uses the `nm_sess`/`nm_sess.sig` cookie pair for mailbox sessions. When a bot process restores a saved session, the first inbox request should also send the saved mailbox as the `restore` query hint; otherwise the service may assign a different mailbox after a restart or instance change.

**Why:** The provider is session-backed and serverless; cookie persistence alone was not sufficient to guarantee mailbox identity during a process restore.

**How to apply:** Keep the provider adapter responsible for cookie serialization and one-time restore hints. Treat a response with HTTP 500 and an error mentioning upstream 429/busy as a rate-limit condition, back off polling, and surface a readable retry message instead of silently reporting an empty inbox.

Email payloads may expose no usable link array even when the HTML contains links, and HTML can arrive quoted-printable encoded. Link extraction must merge provider entries with HTML/plain-text extraction and decode only known URL-safe markers; broad `=HH` decoding corrupts normal query values.

**Why:** Verification URLs such as `oobCode=ABC123` were otherwise either missed or transformed before allowlist validation, so the watcher could open the wrong URL or report no candidate.

**How to apply:** Normalize `url`, `href`, `link`, and string entries, preserve query values, and test both HTML anchors and plain-text URLs before running auto-verification.