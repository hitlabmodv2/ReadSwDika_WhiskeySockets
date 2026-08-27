---
name: Command alias registration
description: Command aliases and the source parser used to build loadedCommands
---

Each command alias must have its own `case 'alias': {` block when command names are extracted from the message router source.

**Why:** The command registry is generated from case-block patterns; grouped aliases can leave earlier aliases absent, causing them to be treated as plain text and silently skipped.

**How to apply:** When adding aliases, verify every alias appears in the generated loaded command set, not only that the switch falls through correctly.