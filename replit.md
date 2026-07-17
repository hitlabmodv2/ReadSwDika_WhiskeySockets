# Wily Bot V25 — WhatsApp Multi-Fitur Bot

Bot WhatsApp otomatis berbasis Node.js, dibuat oleh Bang Wily. Dijalankan di Replit menggunakan Baileys (WhiskeySockets).

---

## Cara Menjalankan

Klik tombol **Run** (▶) di bagian atas — workflow `WhatsApp Bot` akan otomatis berjalan dengan `bash start-ptero.sh`.

### Pairing Bot ke WhatsApp
Sebelum bot bisa digunakan, kamu perlu menghubungkan nomor WhatsApp:

1. **Isi `BOT_NUMBER_PAIR`** di file `.env` atau di tab **Secrets** Replit
   - Contoh: `6281234567890` (tanpa `+`, pakai kode negara)
2. Jalankan bot → lihat QR code atau kode pairing di Console
3. Scan QR / masukkan kode pairing di WhatsApp kamu

### File Penting
| File | Fungsi |
|---|---|
| `config.json` | Pengaturan utama bot (prefix, owner, fitur, dll) |
| `.env` | Environment variables (nomor pairing, session name, dll) |
| `index.js` | Entry point bot |
| `message.js` | Handler pesan & command |
| `start-ptero.sh` | Script start untuk Pterodactyl / Replit (aktif) |
| `start-replit.sh` | Script start alternatif untuk Replit + PM2 |
| `sessions/` | Data sesi WhatsApp (jangan dihapus!) |

---

## Konfigurasi Environment Variables

Sudah tersimpan di `.replit` (tab Secrets / userenv):

| Variabel | Nilai Default | Keterangan |
|---|---|---|
| `BOT_NUMBER_PAIR` | *(kosong)* | **Wajib diisi** — nomor WA untuk pairing |
| `BOT_SESSION_NAME` | `hisoka` | Nama folder sesi |
| `BOT_LOGGER_LEVEL` | `silent` | Level log Baileys |
| `BOT_LOG_MESSAGE` | `true` | Log pesan masuk |
| `BOT_MAX_RETRIES` | `3` | Maks reconnect otomatis |
| `BOT_PREFIX` | `(?:[°•π...])` | Prefix command bot |
| `BOT_ALLOWED_NO_PREFIX` | `true` | Izinkan command tanpa prefix |

---

## Tips Penting

- **Sesi WhatsApp** tersimpan di folder `sessions/` — jangan dihapus agar tidak perlu scan ulang
- Untuk bot jalan **24/7**, gunakan **Replit Deployments** (klik Deploy / ikon roket)
- Edit pengaturan bot di `config.json` langsung dari editor Replit
- Notifikasi Telegram bisa diaktifkan di `config.json` → bagian `telegram`

---

## Preferensi Pengguna

- Semua penjelasan AI di Replit menggunakan **Bahasa Indonesia**
- Setiap selesai melakukan edit/perubahan kode, selalu tampilkan tombol **View Checkpoints** (SuggestUserAction rollback) agar user bisa rollback ke versi sebelumnya kapan saja
