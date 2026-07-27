---
name: Jadibot timeout dedup
description: Pencegahan dua pesan timeout saat timer pairing dan connection.close berlomba
---

Pairing timeout memiliki dua pemicu yang mungkin aktif: timer tiga menit dan event `connection.close`. Keduanya harus memakai satu klaim notifikasi per nomor, bukan guard terpisah yang hanya memeriksa state setelah salah satu jalur mulai berjalan.

**Why:** Timer dapat mengirim pesan ke chat peminta lalu event close mengirim format timeout lain, sehingga satu kegagalan pairing menghasilkan dua pesan berbeda.

**How to apply:** Klaim notifikasi sebelum operasi asynchronous pada kedua jalur. Untuk permintaan manual yang sudah memiliki `sendReply`, jangan kirim laporan owner tambahan; monitoring owner tetap boleh untuk auto-start tanpa peminta.