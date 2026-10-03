---
name: Anime quote source
description: Sumber dan batasan data untuk command anime quote
---

Situs Anime Quote Generator tidak menyediakan API; daftar quote berada di `script.js` dan perlu diparse dari assignment JavaScript.

**Why:** Mengambil HTML halaman saja hanya menghasilkan shell halaman, sedangkan quote yang sebenarnya dibuat oleh JavaScript di browser.

**How to apply:** Gunakan cache dan fallback lokal, validasi field quote/karakter/anime, dan saring entry eksplisit sebelum dikirim ke chat umum. Terjemahan Google Translate publik juga dapat terkena rate limit, jadi terjemahan harus punya cache dan fallback ke teks asli.