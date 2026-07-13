---
name: jadibot handler parameter shadowing
description: Why jadibot-cmd.cjs handlers must NOT destructure parseJadibotCommandQuery from their params
---

In `SEMUA_FITUR/jadibot/jadibot-cmd.cjs`, `parseJadibotCommandQuery` is a top-level
function in the same file. Handler functions (`handleUpbot`, `handleDownbot`, etc.)
must call it directly via closure, not destructure it from their params object.

**Why:** `handleUpbot` previously destructured `{ ..., parseJadibotCommandQuery, ... }`
as a parameter. `message.js`'s call site never passed that key, so the destructured
local was `undefined`, shadowing the real top-level function for the entire function
body — every `.upbot` invocation crashed with "parseJadibotCommandQuery is not a
function". `handleJadibot` never had this bug because it doesn't destructure the name.

**How to apply:** When adding new jadibot command handlers in this file (or editing
existing ones), never list `parseJadibotCommandQuery` in the destructured params —
just call it as a bare identifier. Same caution applies to any other same-file
top-level helper: destructuring its name as a param silently shadows it if the caller
omits that key.
