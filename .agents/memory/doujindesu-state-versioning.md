---
name: DoujinDesu state versioning
description: State source harus mengikuti perubahan identitas item dan aturan pemilihan chapter.
---

Jika scraper DoujinDesu mengubah cara memilih chapter, membentuk chapter key, atau mengubah bentuk item, naikkan versi source state sebelum polling berikutnya.

**Why:** History lama yang dianggap kompatibel padahal berasal dari aturan berbeda dapat membuat chapter historis dari API dianggap rilisan baru dan terkirim massal setelah restart.

**How to apply:** Saat source version berubah, lakukan baseline dari hasil scan terbaru, pertahankan history lama untuk mencegah pengiriman ulang, dan pastikan simulasi memeriksa jumlah item baru sebelum scheduler mengirim.