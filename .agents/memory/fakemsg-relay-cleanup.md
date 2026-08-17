---
name: Fake message relay cleanup
description: Batas aman saat memakai relayMessage dengan protocol edit
---

Jika `relayMessage` dipanggil dengan opsi `messageId` yang sama dengan stanza target, nilai baliknya dapat menjadi ID target tersebut. ID itu tidak boleh dimasukkan ke proses delete sementara.

**Why:** Menghapus semua ID hasil relay tanpa membandingkan target dapat ikut menghapus pesan yang sedang di-reply, terutama pada Baileys versi yang mengembalikan `messageId` override.

**How to apply:** Simpan ID pesan sementara secara terpisah, bersihkan hanya ID yang bukan stanza target, dan gunakan `remoteJid` pada message key.