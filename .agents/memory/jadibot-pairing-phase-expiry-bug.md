---
name: Jadibot pairing-phase false expiry
description: Why a brand-new jadibot session could show "JADIBOT EXPIRED" seconds after pairing, before ever connecting, regardless of chosen duration.
---

In `src/helper/jadibot.js`, `startJadibot()`/`startJadibotQR()` only write expiry
metadata (`ensureJadibotExpiry`/`setPermanentJadibot`) inside the `connection === 'open'`
branch. Before the first successful open, `getJadibotExpiry(number)` is legitimately
`null` — not because the session expired, but because it hasn't connected yet.

`isJadibotExpired()` treats `meta === null` as expired (`return true`) — this was an
intentional earlier fix so truly orphaned sessions (previously connected, expiry data
lost) don't silently become permanent on reconnect.

The bug: the `connection.update` close-handler called `isJadibotExpired(number)` on
every non-logout, non-`_wasStillPairing` close — including the very common
Baileys mid-pairing disconnects (e.g. `restartRequired`) that happen before the socket
ever reaches `open` once. Combined with the null→expired rule, this made ANY early
disconnect during initial pairing get treated as "expired" and call `expireJadibot()`,
deleting the brand-new session and sending a wrong "JADIBOT EXPIRED" notice within
seconds — independent of the duration the user requested (1h, 30d, permanent, etc).

**Fix applied:** gate the `isJadibotExpired()` check in the close-handler behind a
local `hasConnectedOnce`/`hasConnected` flag, so it only fires for sessions that
already opened successfully at least once during this run. Pre-first-open closes now
fall through to the existing normal-reconnect retry path instead, which correctly
re-passes the original requested duration.

**Why this matters going forward:** any future change to jadibot connection-lifecycle
logic must keep "no expiry data yet" (never connected) and "expiry data missing after
having connected" (real orphan) as distinct cases — collapsing them again reintroduces
this bug in one direction or the orphan-permanent bug in the other.
