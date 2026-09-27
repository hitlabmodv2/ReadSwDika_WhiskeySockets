---
name: Browser switch reload boundary
description: Batas aman hot-reload untuk helper pergantian browser dan pairing.
---

`browserSwitch.js` tidak boleh dipaksa hot-reload ketika bot sedang berjalan karena modul memegang socket switching, timer, dan state koneksi aktif. Perubahan pada helper tersebut harus dimuat melalui restart workflow.

**Why:** Memuat ulang modul stateful saat socket aktif dapat meninggalkan koneksi atau timer lama dan menyebabkan proses pairing/switch berjalan ganda.

**How to apply:** Jika mengubah pengiriman pairing code, QR, atau logika switch di helper ini, restart workflow setelah validasi syntax dan simulasi offline. Jangan menambahkan watcher reload tanpa audit lifecycle socket.