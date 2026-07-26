---
name: Status audience path
description: Jalur pengiriman status WhatsApp yang wajib dipakai agar audience close friends/custom diterapkan
---

Untuk status grup dengan audience, teks dan semua media harus dikirim melalui `castleys-community` `groupStatusV2`. Jalur `sendMessage` biasa dapat mengirim konten, tetapi tidak menjadikannya status grup dengan metadata audience yang benar.

**Why:** Audience metadata diproses dan di-encode oleh `groupStatusV2`; menambahkan `contextInfo` pada pengiriman media biasa tidak menjamin payload status yang valid.

**How to apply:** Saat menambah tipe media baru pada fitur status, berikan buffer/media dan `audience` ke `groupStatusV2`, bukan memanggil `sendMessage` langsung untuk pesan status.