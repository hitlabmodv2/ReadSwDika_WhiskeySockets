/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  Support dari kalian bikin saya
 *  makin semangat update fitur,
 *  fix bug, dan rawat script ini.
 *
 *  Dilarang menjual ulang script ini
 *  Tanpa izin resmi dari developer.
 *  Jika ketahuan = NO UPDATE / NO FIX
 *
 *  Hargai karya, gunakan dengan bijak.
 *  Terima kasih sudah support.
 * ───────────────────────────────
 */
// PM2 Ecosystem Config — Wily Bot (ReadswDika V13)
// Usage:
//   pm2 start ecosystem.config.cjs        → jalanin bot
//   pm2 monit                             → pantau CPU/RAM realtime
//   pm2 logs wily-bot                     → liat log realtime
//   pm2 restart wily-bot                  → restart bot
//   pm2 stop wily-bot                     → matiin bot
//   pm2 delete wily-bot                   → hapus dari pm2 list
//   pm2 save && pm2 startup               → auto-start saat server reboot

const path = require('path');
const pkg  = require('./package.json');
const node = process.version;

const ROOT = __dirname; // path absolut folder project, bukan relatif

module.exports = {
  apps: [
    {
      // ── Identitas ────────────────────────────────────────────
      name        : "wily-bot",
      script      : path.join(ROOT, 'index.js'), // ABSOLUT — pm2_env.version jadi akurat
      cwd         : ROOT,                         // ABSOLUT — daemon baca pkg.json benar
      interpreter : "node",
      version     : pkg.version,   // tampil di pm2 monit → Metadata > Version

      // ── Mode & Instance ──────────────────────────────────────
      instances   : 1,
      exec_mode   : "fork",   // fork = satu proses, akurat di pm2 monit

      // ── Node.js args (heap size eksplisit agar monit akurat) ─
      node_args   : "--max-old-space-size=512",

      // ── Restart Policy ───────────────────────────────────────
      autorestart    : true,
      watch          : false,
      max_memory_restart : "500M",   // restart kalau RAM > 500 MB
      min_uptime     : "10s",        // kalau mati < 10 detik = crash
      max_restarts   : 10,           // max 10 crash berturut-turut
      restart_delay  : 3000,         // tunggu 3 detik sebelum restart
      kill_timeout   : 5000,         // timeout sebelum SIGKILL (ms)
      exp_backoff_restart_delay : 100, // backoff eksponensial antar restart

      // ── Logging (wajib untuk pm2 monit & pm2 logs akurat) ────
      log_date_format : "YYYY-MM-DD HH:mm:ss Z",
      merge_logs      : true,        // gabung stdout+stderr → 1 file
      time            : true,        // tambah timestamp di tiap baris log
      out_file        : "./logs/pm2-out.log",
      error_file      : "./logs/pm2-error.log",
      log_file        : "./logs/pm2-combined.log",

      // ── Monitoring (untuk pm2 monit realtime akurat) ─────────
      pmx             : true,        // aktifkan APM & metrics di monit
      source_map_support : false,    // matikan source-map (hemat RAM)
      instance_var    : "INSTANCE_ID", // ID instance unik di monit
      // vizion TIDAK di-set false — kalau false, PM2 skip finalizeProcedure
      // dan pm2_env.version tidak pernah di-set → tampil N/A di monit

      // ── Environment ──────────────────────────────────────────
      env: {
        NODE_ENV             : "production",
        FORCE_COLOR          : "1",
        npm_package_version  : pkg.version,  // PM2 baca ini untuk kolom Version
        npm_package_name     : pkg.name,
        NODE_VERSION         : node,
        BOT_VERSION          : pkg.version,
      },
      env_development: {
        NODE_ENV             : "development",
        FORCE_COLOR          : "1",
        npm_package_version  : pkg.version,
        npm_package_name     : pkg.name,
        NODE_VERSION         : node,
        BOT_VERSION          : pkg.version,
      },
    },
  ],
};
