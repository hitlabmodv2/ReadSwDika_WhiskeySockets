---
name: Fake message relay cleanup
description: Batas aman saat memakai relayMessage dengan protocol edit
---

Jika `relayMessage` dipanggil dengan opsi `messageId` yang sama dengan stanza target, nilai baliknya dapat menjadi ID target tersebut. ID itu tidak boleh dimasukkan ke proses delete sementara.

**Why:** Menghapus semua ID hasil relay tanpa membandingkan target dapat ikut menghapus pesan yang sedang di-reply, terutama pada Baileys versi yang mengembalikan `messageId` override.

**How to apply:** Simpan ID pesan sementara secara terpisah, bersihkan hanya ID yang bukan stanza target, dan gunakan `remoteJid` pada message key.

Untuk fake edit pesan orang, `protocolMessage.key` wajib memakai key asli dari pesan yang direply, termasuk `fromMe` dan `participant`. Jangan membuat key sementara dengan `fromMe: true`, karena WhatsApp akan menganggap targetnya pesan bot sendiri. Biarkan ID relay luar dibuat fresh; jangan override dengan ID target.

**Why:** Key sementara milik bot mengubah target edit menjadi pesan bot, walaupun command dikirim dengan reply ke pesan orang lain.

**How to apply:** Clone `m.quoted.key`, pastikan `remoteJid` tersedia, dan kirim protocol edit tanpa mengirim pesan kosong sementara atau memakai `options.messageId` target.

`relayMessage` yang resolve hanya berarti stanza berhasil diserahkan ke socket, bukan jaminan client WhatsApp menerapkan edit. Handler perlu mengirim status eksplisit dan memakai timeout agar command tidak tampak diam.

**Why:** Percobaan fake edit dapat tercatat sukses di log tetapi tidak menghasilkan perubahan visual atau balasan apa pun ke chat.

**How to apply:** Bungkus relay dengan timeout, tangkap error, dan balas status sukses dengan catatan bahwa server WhatsApp dapat menolak edit pesan milik orang lain.

Identitas pengirim pesan baru divalidasi server WhatsApp; `userJid` atau `participant` pada payload tidak menjadikan bot benar-benar mengirim sebagai akun orang lain. Format mention paling aman dipakai untuk memilih pesan asli terbaru target dari cache, lalu mengirim protocol edit ke key pesan tersebut.

**Why:** Mencoba membuat pesan baru dengan sender palsu tetap tampil sebagai bot atau ditolak server, sehingga hasilnya menyesatkan dan sulit didiagnosis.

**How to apply:** Jangan menjanjikan spoof sender. Jelaskan batasan ini dan gunakan mention sebagai selector pesan target yang benar-benar ada.

Untuk memilih pesan berdasarkan mention di grup, bandingkan alias `@lid` dan nomor PN hasil resolusi, tetapi tetap kirim protocol edit memakai key mentah dari cache.

**Why:** Pesan grup dan mention dapat memakai representasi JID berbeda; mencocokkan string langsung membuat pesan target terlihat tidak ada walaupun baru masuk.

**How to apply:** Resolver hanya dipakai saat lookup participant/chat, bukan untuk mengganti `protocolMessage.key` yang diteruskan ke WhatsApp.