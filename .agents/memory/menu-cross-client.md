---
name: Menu cross-client compatibility
description: Batas kompatibilitas pesan menu di WhatsApp Messenger dan WhatsApp Business
---

Pesan menu yang hanya berisi teks tidak boleh dibungkus sebagai `interactiveMessage` dengan `nativeFlowMessage.buttons` kosong. Gunakan pesan teks biasa untuk menu tersebut; simpan native-flow hanya untuk menu yang benar-benar memiliki tombol atau pilihan.

**Why:** WhatsApp Business masih dapat menampilkan body dari interactive kosong, sedangkan WhatsApp Messenger dapat menghilangkan seluruh pesan sehingga menu terlihat tidak terkirim.

**How to apply:** Saat membuat menu lintas versi WhatsApp, prioritaskan payload `text` biasa untuk konten statis. Uji setidaknya di jalur Messenger dan Business sebelum menambahkan metadata interaktif.