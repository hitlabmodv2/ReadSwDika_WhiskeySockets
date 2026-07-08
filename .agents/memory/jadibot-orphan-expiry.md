---
name: WilyBot jadibot orphan expiry bug
description: Pola bug: session folder jadibot tetap ada setelah expire, lalu di-auto-start dan jadi permanent karena isJadibotExpired(null)=false
---

## Bug Pattern
Saat expireJadibot() hapus entry dari realtime.json tapi folder sesi gagal terhapus (try/catch silent),
lalu bot utama restart → auto-start nemuin folder → isJadibotExpired return false (null meta) → bot konek ulang
→ connection 'open': getJadibotExpiry=null → setPermanentJadibot → PERMANENT gratis.

## Fix yang diterapkan (3 titik)
1. isJadibotExpired: null meta → return TRUE (bukan false)
2. connection 'open' else branch: setTimeout(()=>expireJadibot,500) bukan setPermanentJadibot — berlaku di pairing-code mode DAN QR mode
3. index.js auto-start: orphan detection + guard realtime.json corrupt sebelum cleanup massal

**Why:** null meta = entry sudah dihapus oleh expireJadibot tapi folder belum hilang — harus diperlakukan expired, bukan "tidak diketahui = permanent"

**How to apply:** kalau ada laporan jadibot expired tapi masih aktif/permanent → cek apakah folder jadibot/{number}/ masih ada setelah expiry; isJadibotExpired adalah pintu utama yang harus di-trace.
