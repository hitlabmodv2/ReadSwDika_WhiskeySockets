---
name: Story count processing time
description: Total story harus mencerminkan story yang sudah selesai diproses, bukan seluruh batch yang baru diterima WhatsApp
---

`TotalStory` gunakan waktu `processedAt`; `arrivedAt` hanya menandai story masuk ke antrean.

**Why:** WhatsApp dapat mengirim beberapa story sekaligus sebelum delay baca/reaksi selesai, sehingga menghitung `arrivedAt` membuat semua story dalam batch langsung terlihat selesai.

**How to apply:** Saat menampilkan jumlah story realtime, hitung entry yang sudah memiliki `processedAt`; pertahankan fallback untuk data lama yang hanya memiliki `read` dan `arrivedAt`.