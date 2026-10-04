---
name: SwTrack Read Only pending semantics
description: Keep startup and live retry selection consistent with whether reactions are enabled.
---

An entry with `read:true` and `reacted:false` is retryable only when it explicitly records `reactionExpected:true` and reactions are enabled. A mode change must not backfill Read Only history; unmarked legacy entries are not proof that a reaction was expected.

**Why:** The tracker records `read` and `reacted` separately, so the active mode alone cannot distinguish an intentionally unreacted Read Only story from a failed reaction.

**How to apply:** Persist `reactionExpected` when each main-bot or jadibot story is tracked; use the shared predicate for startup and live retries, and re-read the current mode immediately before sending. Unread stories remain eligible for read recovery, but a retry reaction also requires `reactionExpected:true`. Reconcile startup SwStats by message ID only inside its 24-hour dedupe window; do not infer or rewrite the original mode of legacy entries.