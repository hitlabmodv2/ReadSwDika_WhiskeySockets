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
 *
 *  sessioncleaner.cjs — Session cleaner system
 *  Sistem pembersih sesi WhatsApp yang sudah tidak aktif atau kedaluwarsa
 * ───────────────────────────────
 */
'use strict';

async function handleSessioncleaner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, cleanStaleSessionFiles }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                const config = loadConfig();
                const sc = config.sessionCleaner || { enabled: true };
                const args = query ? query.toLowerCase().split(' ') : [];

                if (args.length === 0) {
                        const statusText =
                                `╔══════════════════════════╗\n` +
                                `║  🔑 *SESSION CLEANER*  🔑  ║\n` +
                                `╚══════════════════════════╝\n\n` +
                                `📊 *Status:* ${sc.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n\n` +
                                `📋 *Fungsi:*\n` +
                                `Hapus otomatis pre-key & session WhatsApp yang sudah usang saat bot mulai. Menghemat memori dan storage.\n\n` +
                                `📋 *Perintah:*\n` +
                                `• *.sessioncleaner on* — Aktifkan\n` +
                                `• *.sessioncleaner off* — Nonaktifkan\n` +
                                `• *.sessioncleaner now* — Jalankan pembersihan session sekarang`;
                        await tolak(hisoka, m, statusText);
                        return;
                }

                if (args[0] === 'on') {
                        if (sc.enabled !== false) {
                                await tolak(hisoka, m, 'ℹ️ Session Cleaner sudah aktif.');
                        } else {
                                config.sessionCleaner = { enabled: true };
                                saveConfig(config);
                                await tolak(hisoka, m, `✅ *Session Cleaner diaktifkan!*\n\nPre-key & session lama akan dibersihkan otomatis saat bot mulai.`);
                        }
                } else if (args[0] === 'off') {
                        if (sc.enabled === false) {
                                await tolak(hisoka, m, 'ℹ️ Session Cleaner sudah nonaktif.');
                        } else {
                                config.sessionCleaner = { enabled: false };
                                saveConfig(config);
                                await tolak(hisoka, m, `✅ *Session Cleaner dinonaktifkan.*\n\nPre-key & session lama tidak akan dibersihkan otomatis.`);
                        }
                } else if (args[0] === 'now') {
                        const sessionDir = global.sessionDir || '';
                        if (!sessionDir) {
                                await tolak(hisoka, m, '❌ Direktori session tidak ditemukan.');
                                return;
                        }
                        cleanStaleSessionFiles(sessionDir, { skipConfigCheck: true });
                        await tolak(hisoka, m, `✅ *Pembersihan session selesai!*\n\nPre-key & session lama sudah dibersihkan.`);
                } else {
                        await tolak(hisoka, m, '❌ Perintah tidak valid.\n\nKetik *.sessioncleaner* untuk melihat bantuan.');
                }

                logCommand(m, hisoka, 'sessioncleaner');
        } catch (error) {
                console.error('\x1b[31m[SessionCleaner Cmd] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
        }
}

module.exports = { handleSessioncleaner };
