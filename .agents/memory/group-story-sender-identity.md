---
name: Group story sender identity
description: Resolusi identitas pengirim linked group story dan pencegahan paket kontrol tercatat sebagai story
---

Untuk story grup, jangan memakai JID grup atau digit LID sebagai nomor pengirim. Utamakan PN dari participant/participantAlt, lalu coba Signal LID mapping, cache grup, dan `resolveLidToPN`. Bila tetap gagal, tampilkan status LID belum ter-resolve dan jangan membuat statistik kontak dengan ID tersebut. Abaikan protocol, reaction, dan poll update walaupun context-nya memuat penanda group-status. Ambil subjek grup dari metadata jika cache belum memiliki nama.

**Why:** Payload linked-story Baileys dapat memakai LID untuk participant dan paket kontrol dapat membawa konteks group-status. Menganggapnya sebagai story/nomor HP menghasilkan log `Unknown`, nomor palsu, serta hitungan kontak yang salah.

**How to apply:** Terapkan pada jalur utama maupun jadibot yang membaca story GC, serta pertahankan fallback eksplisit bila pemetaan LID belum tersedia.