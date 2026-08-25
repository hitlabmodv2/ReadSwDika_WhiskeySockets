---
name: Channel command and metadata quirks
description: WhatsApp channel commands and newsletter metadata require explicit handling.
---

Channel commands are blocked by the global newsletter guard unless explicitly allowlisted; newsletter metadata names may be nested objects rather than plain strings.

**Why:** A direct channel command can otherwise disappear before reaching its feature handler, and coercing the metadata object directly produces `[object Object]`.

**How to apply:** Preserve a narrow allowlist for channel configuration commands and normalize candidate name fields recursively before saving or displaying them.