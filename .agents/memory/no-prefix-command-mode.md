---
name: No-prefix command mode
description: Perilaku aman untuk konfigurasi command dengan atau tanpa prefix
---

`BOT_ALLOWED_NO_PREFIX` hanya boleh membuka command yang dikenal saat nilainya `true`; saat `false`, prefix tetap wajib. Teks percakapan biasa tidak boleh masuk ke dispatcher command.

**Why:** Mode tanpa prefix yang tidak memvalidasi nama command dapat membuat semua pesan biasa dianggap command, sedangkan mode `false` yang tidak menjadi gate dapat tetap menjalankan command tanpa prefix.

**How to apply:** Saat mengubah parser pesan, validasi nama command terlebih dahulu, lalu gunakan konfigurasi hanya untuk menentukan apakah command valid tanpa prefix boleh diproses.