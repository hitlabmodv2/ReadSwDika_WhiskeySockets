---
name: 9Router Replit binding
description: 9Router must bind to all interfaces before Replit can proxy its dashboard publicly.
---

9Router's default localhost binding is not reachable through a Replit public URL; start it with a `0.0.0.0` host binding and expose the mapped external port.

**Why:** Replit's proxy cannot forward traffic to services listening only on `127.0.0.1`, producing an unreachable-app/502 page even when the local port responds.

**How to apply:** When running 9Router in Replit, set `HOSTNAME=0.0.0.0` and use the CLI host/port options if available, then open the external Networking port rather than the bare dev domain.