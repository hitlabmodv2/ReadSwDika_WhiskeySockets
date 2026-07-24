---
name: Jadibot pairing config scope
description: Konfigurasi mode pairing harus tersedia di dalam callback yang meminta pairing code
---

Callback pairing jadibot berjalan asynchronous setelah fungsi pembuat socket melanjutkan eksekusi. Jika callback membaca variabel konfigurasi yang tidak didefinisikan di scope-nya, request pairing akan masuk retry walaupun masalah sebenarnya terjadi setelah kode diminta.

**Why:** Error `cfg is not defined` membuat alur `.jadibot` gagal saat membaca `jadibotPairingMode`, sehingga log terlihat seperti request pairing gagal dan retry berulang.

**How to apply:** Di callback pairing, panggil loader konfigurasi lokal sebelum membaca mode pairing. Jangan mengandalkan variabel lokal dari scope lain kecuali memang dipastikan berada dalam closure.