---
name: WilyBot jadibot orphan expiry bug
description: Dua bug berkaitan: race condition folder vs data di expireJadibot, dan notif expired tidak terkirim saat bot offline/restart
---

## Bug 1: Race Condition Folder vs Data (orphan saat restart)

### Pola bug lama (sudah fix)
expireJadibot() hapus entry dari realtime.json → setTimeout 500ms → hapus folder.
Kalau bot crash dalam 500ms itu: data hilang dari realtime.json, folder masih ada.
Restart berikutnya: folder ada, data tiada → "orphan" → folder dihapus (benar tapi bikin bingung).

### Fix terbaru: balik urutan (folder dulu, baru data)
- DULU: removeJadibotExpiry (hapus data) → setTimeout 500ms → hapus folder
- SEKARANG: hapus folder (sync, langsung) → removeJadibotExpiry (hapus data)
- Kalau crash di antara keduanya: folder sudah tiada, data masih ada → tidak jadi orphan, session tidak re-start karena folder tidak ada

**Why:** Orphan terjadi karena jeda antara data dihapus dan folder dihapus. Dengan membalik urutan dan menghapus folder synchronously, tidak ada window untuk crash menghasilkan orphan.

## Bug 2: Notif Expired Tidak Terkirim Saat Bot Offline

### Pola bug
expireJadibot() dipanggil saat startup (bot restart setelah offline):
- getActiveMainSock() = null (bot belum konek)
- Notif dilewati diam-diam (silent skip)
- User tidak tahu jadibotnya sudah habis

### Fix: Pending Notification Queue
- File: `data_jadibot/pending_expire_notifs.json`
- Saat sock null → savePendingExpireNotif() → simpan ke file
- Saat bot connect (connection 'open') → drainPendingExpireNotifs() dipanggil (delay 3 detik)
- Queue dikirim satu per satu (jeda 1.5 detik antar pesan)

## Fix sebelumnya (isJadibotExpired null)
- isJadibotExpired: null meta → return TRUE (bukan false) — cegah auto-permanent
- connection 'open' else branch: expireJadibot bukan setPermanentJadibot
- index.js auto-start: orphan detection + guard realtime.json corrupt

**How to apply:** Kalau ada laporan "jadibot hilang tanpa notif saat restart" → cek pending_expire_notifs.json; kalau ada isinya berarti notif memang tertunda dan akan dikirim saat bot konek.
