---
name: WhatsApp sticker anti-copy boundary
description: Native WhatsApp stickers cannot disable the recipient's save/add-to-pack controls
---

Native WhatsApp sticker messages do not expose a supported control for disabling save, forwarding, or “add to sticker pack” actions. Pack and author metadata identify the sticker but do not provide access control. The reliable mitigation is a visible watermark embedded into the sticker artwork; sending an image/document can avoid sticker UI controls but is no longer a native sticker.

**Why:** WhatsApp controls the recipient-side sticker UI, and malformed or non-native sticker payloads risk rendering failures without preventing screenshots or re-uploads.

**How to apply:** Keep pack/author metadata current from project configuration and use a visible, readable watermark for features that need attribution. Do not promise cryptographic or absolute anti-copy protection for WhatsApp stickers.