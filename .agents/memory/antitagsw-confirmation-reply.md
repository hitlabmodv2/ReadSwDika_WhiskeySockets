---
name: AntiTagSW confirmation reply
description: AntiTagSW activation confirmation must remain visible across WhatsApp clients
---
Use a normal quoted text reply for the main AntiTagSW activation confirmation instead of relying on a native list message.

**Why:** Some WhatsApp clients acknowledge the native list relay without rendering it, making `.antitagsw on` look unresponsive even though the group setting was saved.

**How to apply:** Keep optional interactive controls out of the critical success response; the feature activation result must be delivered through the plain `m.reply` path.