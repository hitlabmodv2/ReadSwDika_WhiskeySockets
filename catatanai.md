# CATATAN ANALISIS SCRIPT WILY BOT (V27)

---

## 1. IDENTITAS & DESKRIPSI UTAMA
* **Nama Script**: WILY BOT (Base: Bang Dika Ardnt, Recode: Bang Wilykun)
* **Versi**: V27 / V27.1
* **Teknologi Utama**: Node.js (ES Modules, `type: "module"`), Baileys (`@whiskeysockets/baileys`)
* **Penggunaan Utama**: WhatsApp Bot Multi-Fitur (Downloader, Jadibot Multi-Session, AI Chat Gemini/Groq, Keamanan Grup, Auto Read Story, Anti-Call, Anti-Delete)
* **Karakteristik**: Khusus Donasi/VIP, siap deploy 24/7 di Replit, Railway, Fly.io, Pterodactyl, atau PM2.

---

## 2. ARSITEKTUR & SKEMA SYSTEM

### A. Core Entry Point (`index.js`)
* Initialisasi koneksi Baileys Socket.
* Multi-file auth / single-file auth wrapper (`src/helper/authState.js`).
* Multi-session manager: Auto-start sesi **Jadibot** secara sekuensial (jeda 3.5s untuk cegah rate-limit).
* Guard System: Crash Guard (`src/helper/crashGuard.js`), Memory Monitor (`src/helper/memoryMonitor.js`), Disk Monitor (`src/helper/diskMonitor.js`).
* Dynamic Hot-Reload (`src/helper/hotReload.js`): Mengamati perubahan di `SEMUA_FITUR/` dan `src/` tanpa perlu restart socket.

### B. Message Dispatcher (`message.js`)
* Penanganan event pesan masuk (`messages.upsert` / `messaging-history.set`).
* Routing command berdasarkan prefix (default `.`).
* Self-mode guard (pembatasan akses antara Owner Asli, Bot Utama, dan User Jadibot).
* Menangani interactive buttons, status reply, callback flow, dan auto-reaction story.

### C. Folder Feature (`SEMUA_FITUR/`)
Terbagi secara modular berdasarkan kategori:
1. `download/` — Downloader TikTok, IG, FB, YT, Twitter, Stickerly, HD Video.
2. `music/` — Search & Download MP3 YouTube (`.play`, `.ytmp3`), Music AI, Shazam song identifier.
3. `jadibot/` — Clone bot via pairing code (`.jadibot`), manajemen durasi/expiry, list bot aktif.
4. `ai/` — Integrasi WilyAI (Gemini / Groq), Sparkpix image generator, Auto Simi.
5. `tools/` — Font generator, Temp Mail, Cuaca, Screenshot, Cek HP, Cek ID FF.
6. `antidel/`, `antilink/`, `antitag/`, `antitagsw/` — Keamanan grup & privat.
7. `media/` — Sticker maker, View-Once bypass (`.rvo`), audio convert, Smeme.
8. `setting/` — Atur fitur per-grup, anti-call, auto-sholat, browser device setting.
9. `system/` — Shutdown, Backup, Auto/Session Cleaner, Welcome Card.
10. `news/` & `anime/` — Scraper berita TVOne, MalNews, AlQolam Anime updates.
11. `event/` & `readsw/` — Auto read SW, auto reaction SW, SW tracker.

### D. Helper & Database (`src/`)
* **`src/db/`**:
  * `datadb.js` — Key-Value (KV) database berbasis file JSON di `data/kv/`.
  * `userDb.js` — Pelacak nama user berdasarkan JID.
  * `aiHistory.js` — Memori percakapan AI per-user.
  * `botStats.js` — Tracking uptime dan total perintah dieksekusi.
  * `errorLog.js` — Logging error realtime ke `data/system/error.json`.
* **`src/helper/`**:
  * `jadibot.js` — Engine clone bot: pairing code, expiry countdown, auto-reconnect, cleanup.
  * `hotReload.js` — Engine reload modul tanpa disconnect.
  * `memoryMonitor.js` & `diskMonitor.js` — Monitoring resource server.
  * `voCache.js` — Cache otomatis pesan View-Once.
  * `cleaner.js` — Pembersih berkas sementara/stale session.
  * `inject.js` — Patch/enhancement untuk object `hisoka` (client) dan `m` (message).

---

## 3. KONFIGURASI UTAMA (`config.json`)

* `botVersion`: Identitas versi bot (misal: "V27.1").
* `botNumber` & `owners`: Array nomor WhatsApp owner utama.
* `autoReadStory`: Pengaturan auto-baca dan auto-react story.
* `antiDelete`, `antiCall`, `antiLink`, `antiTagSW`: Flag saklar fitur keamanan.
* `wilyAI` & `autoSimi`: Pengaturan kecerdasan buatan.
* `monitor.DisRam`: Limit RAM (MB) & Disk (MB) sebelum trigger restart/warning.
* `welcomeGoodbye`, `infowibu`, `animasu`, `malnews`: Pengaturan notifikasi per-grup (`g.us`).

---

## 4. FITUR-FITUR UNGGULAN & COMMAND PENTING

| Kategori | Command | Fungsi |
|---|---|---|
| **Downloader** | `.play [judul]` | Cari & download audio MP3 YouTube |
| | `.ytmp3 [url]`, `.ytmp4 [url]` | Download audio/video YouTube via URL |
| | `.tt [url]`, `.ig [url]`, `.fb [url]` | Download media TikTok, Instagram, Facebook |
| **Jadibot** | `.jadibot [durasi]` | Dapatkan pairing code untuk clone bot ke nomor lain |
| | `.listbot` | Lihat & atur durasi/stop bot clone |
| | `.delbot` | Hapus sesi jadibot dari sistem |
| **AI & Tools** | `.ai [teks]`, `.wilyai` | Tanya jawab AI Gemini |
| | `.stiker`, `.toimg` | Konversi gambar <-> sticker |
| | `.rvo` / `.viewonce` | Ambil media view-once yang dikirim di chat |
| **Grup & Keamanan**| `.hidetag`, `.ghosttag` | Tag anggota grup |
| | `.antidel on/off` | Simpan pesan dihapus |
| | `.anticall on/off` | Tolak panggilan otomatis |
| | `.cekauto` | Menu atur fitur otomatis per-grup |
| **Admin System** | `.ping`, `.ram`, `.info` | Cek performa & status server |
| | `.clearsesi`, `.autocleaner` | Bersihkan cache & file temporary |

---

## 5. ALUR PENJALANAN (DEPLOYMENT & RUNTIME)

1. **Inisialisasi**: Node.js menjalankan `index.js` (atau via `pm2 start ecosystem.config.cjs` / `bash start-ptero.sh`).
2. **Restore / Pairing**:
   * Jika ada file session di `sessions/`, bot langsung **Restore Connection**.
   * Jika belum, bot meminta **Pairing Code** via nomor di environment `BOT_NUMBER_PAIR`.
3. **Pemuatan Modul**: Hot reload memuat handler dari `SEMUA_FITUR/`.
4. **Auto-Start Jadibot**: Memeriksa folder `jadibot/` dan menyalakan semua sesi aktif secara bertahap.
5. **Runtime Listener**:
   * Message masuk ke `message.js` -> diproses handler -> balasan dikirim.
   * Background task (Memory Monitor, Auto Read Story, View-Once Cache, Session Cleaner) berjalan konsisten.

---

## 6. CATATAN PENTING UNTUK DEVELOPER / ADMIN

* **Penyimpanan Persistent**: Pastikan folder `sessions/`, `jadibot/`, dan `data/` terhubung ke Volume jika menggunakan Docker/Railway/Fly.io agar login tidak hilang saat restart.
* **Perizinan File**: Pastikan `tmp/yt-dlp` memiliki izin eksekusi (`chmod +x tmp/yt-dlp`).
* **Satu Sumber Config**: Parameter limit memori dan versi bot berpusat di `config.json` dan `package.json`.
