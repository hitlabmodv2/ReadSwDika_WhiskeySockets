---
name: Smeme colored emoji rendering
description: Smeme text needs image-based emoji rendering for accurate color and compound Unicode sequences
---

Render emoji in smeme as Twemoji SVG images rather than relying on the server's text font. This preserves color, skin-tone modifiers, flags, and ZWJ sequences while normal words continue using the meme font.

**Why:** The server renderer lacks a complete color emoji font; plain SVG text can turn emoji into tofu boxes or lose their visual form.

**How to apply:** Keep the Twemoji parser and colored SVG asset flow when changing smeme text layout. Cache successful assets, but remove failed requests from cache so a temporary CDN failure can recover on the next command.