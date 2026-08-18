---
name: Menu cross-client compatibility
description: Batas kompatibilitas pesan menu di WhatsApp Messenger dan WhatsApp Business
---

Pesan menu yang hanya berisi teks tidak boleh dibungkus sebagai `interactiveMessage` dengan `nativeFlowMessage.buttons` kosong atau diberi metadata preview yang tidak perlu. Gunakan pesan teks biasa untuk menu tersebut; simpan native-flow hanya untuk menu yang benar-benar memiliki tombol atau pilihan. Untuk menu panjang, pecah payload menjadi bagian UTF-8 kecil.

**Why:** WhatsApp Business masih dapat menampilkan body dari interactive kosong, sedangkan WhatsApp Messenger dapat menghilangkan seluruh pesan sehingga menu terlihat tidak terkirim. Payload teks panjang dengan `externalAdReply` juga tidak konsisten di client Messenger.

**How to apply:** Saat membuat menu lintas versi WhatsApp, prioritaskan payload `text` biasa tanpa `contextInfo` tambahan untuk konten statis. Jika lebih dari sekitar 3.500 byte per bagian, pecah di batas baris dan uji setidaknya di jalur Messenger dan Business.