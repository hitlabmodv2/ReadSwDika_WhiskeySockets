---
name: clearsesi/ceksesi auto-repopulate
description: Why .ceksesi can show contacts/groups full again right after .clearsesi — not a bug
---

`.clearsesi` (clearCacheInPlace in authState.js) correctly zeroes contacts/groups/sender-key/etc
both in memory and on disk immediately — verified by direct simulation of clearCacheInPlace +
getSizeReport in isolation (all counts drop to 0 in memory and in the flushed hisoka.json).

If `.ceksesi` shows contacts/groups populated again shortly after `.clearsesi`, it is expected
behavior, not a bug: Baileys auto-refills those caches as soon as there's activity.
- `cachedGroupMetadata` in index.js calls `groups.write(jid, metadata)` any time a group's
  cached metadata is missing/empty — triggered by essentially any incoming group message.
- `contacts.upsert`/`contacts.update` event listeners write straight back into the contacts cache
  on every WA contact sync event.

**How to apply:** only treat empty-after-clear-but-full-later as a real bug if fields that have
no such auto-refill path (sender-key, lid-mapping, tctoken, app-state-sync-version) stay non-zero
immediately after `.clearsesi` with zero bot activity in between. Contacts/groups refilling within
seconds of any group message or contact sync event is by design (see the "aman dihapus
(auto re-populate)" labels already in ceksesi.cjs).
