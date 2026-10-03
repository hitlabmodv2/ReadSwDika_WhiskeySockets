---
name: NovaMail auto verification
description: Safety boundary for automatically opening verification links found in tempmail messages
---

Automatic link verification is opt-in through an explicit domain allowlist. The current approved domain is `replit.com`; only HTTPS URLs with verification patterns are opened. Signup, registration, password reset, login, unsubscribe, non-allowlisted domains, and redirects outside the allowlist are rejected.

**Why:** The user requested automatic verification for disposable-mail flows, but arbitrary email links can trigger account changes or destructive actions. Verification URLs also contain sensitive tokens that must not appear in workflow logs.

**How to apply:** Keep OTP extraction separate from link opening. Redact query strings in logs, deduplicate processed URLs per watcher, cap redirects, and do not claim OTP verification was completed unless a service-specific form/session integration exists.