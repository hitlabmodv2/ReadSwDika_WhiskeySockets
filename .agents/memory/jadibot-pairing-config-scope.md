---
name: Jadibot pairing config scope
description: Konfigurasi mode pairing harus tersedia di dalam callback yang meminta pairing code
---

Callback pairing jadibot berjalan asynchronous setelah fungsi pembuat socket melanjutkan eksekusi. Callback harus memuat konfigurasi sendiri, lalu memakai `pairingCode` dari config sebagai kode custom 8 karakter; kode acak hanya menjadi fallback saat nilainya kosong.

**Why:** Error `cfg is not defined` membuat alur `.jadibot` gagal saat membaca `jadibotPairingMode`. Sebelumnya jadibot juga mengabaikan `config.json` dan selalu meminta kode acak, tidak konsisten dengan bot utama.

**How to apply:** Di callback pairing, panggil loader konfigurasi lokal sebelum membaca `pairingCode` dan `jadibotPairingMode`. Normalisasi `pairingCode` menjadi huruf besar alfanumerik maksimal 8 karakter dan pastikan panjangnya 8 sebelum diteruskan ke `requestPairingCode`.