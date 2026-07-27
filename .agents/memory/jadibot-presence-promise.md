---
name: Jadibot presence Promise
description: Penanganan rejection asynchronous dari Baileys saat socket jadibot tertutup
---

Pemanggilan `sendPresenceUpdate()` pada socket jadibot harus menangani Promise yang dikembalikan. Socket dapat tertutup setelah pengecekan awal, sehingga error `Connection Closed` muncul sebagai unhandled rejection walaupun pemanggilan berada di dalam `try/catch`.

**Why:** Timer auto-online dan timer typing/recording tetap berjalan saat koneksi putus atau sedang cleanup. Rejection dari Baileys dapat terlihat sebagai error proses dan mengganggu diagnostik bot.

**How to apply:** Gunakan helper yang menangkap synchronous throw dan memasang `.catch()` pada hasil `sendPresenceUpdate()`. Hentikan interval saat cleanup socket, tetapi tetap perlakukan rejection saat race sebagai kondisi aman.