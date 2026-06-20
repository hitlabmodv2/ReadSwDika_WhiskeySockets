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
 *  autocleaner.cjs — Auto cleaner system
 *  Sistem pembersih otomatis file sementara, cache, dan media lama
 * ───────────────────────────────
 */
'use strict';

async function handleAutocleaner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, restartAutoCleaner, stopAutoCleaner, clearOldFiles }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                const config = loadConfig();
                const ac = config.autoCleaner || { enabled: true, intervalHours: 6 };
                const args = query ? query.toLowerCase().split(' ') : [];

                if (args.length === 0) {
                        const statusText =
                                `╔════════════════════════╗\n` +
                                `║  🧹 *AUTO CLEANER*  🧹  ║\n` +
                                `╚════════════════════════╝\n\n` +
                                `📊 *Status:* ${ac.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
                                `⏱️ *Interval:* Setiap ${ac.intervalHours || 6} jam\n\n` +
                                `📋 *Fungsi:*\n` +
                                `Hapus otomatis file sementara (hasil download) di folder tmp/ setiap beberapa jam.\n\n` +
                                `📋 *Perintah:*\n` +
                                `• *.autocleaner on* — Aktifkan\n` +
                                `• *.autocleaner off* — Nonaktifkan\n` +
                                `• *.autocleaner now* — Jalankan pembersihan sekarang\n` +
                                `• *.autocleaner interval <jam>* — Ubah interval (contoh: interval 3)`;
                        await tolak(hisoka, m, statusText);
                        return;
                }

                if (args[0] === 'on') {
                        if (ac.enabled !== false) {
                                await tolak(hisoka, m, 'ℹ️ Auto Cleaner sudah aktif.');
                        } else {
                                config.autoCleaner = { ...ac, enabled: true };
                                saveConfig(config);
                                restartAutoCleaner();
                                await tolak(hisoka, m, `✅ *Auto Cleaner diaktifkan!*\n\nFile tmp/ akan dibersihkan otomatis setiap ${ac.intervalHours || 6} jam.`);
                        }
                } else if (args[0] === 'off') {
                        if (ac.enabled === false) {
                                await tolak(hisoka, m, 'ℹ️ Auto Cleaner sudah nonaktif.');
                        } else {
                                config.autoCleaner = { ...ac, enabled: false };
                                saveConfig(config);
                                stopAutoCleaner();
                                await tolak(hisoka, m, `✅ *Auto Cleaner dinonaktifkan.*\n\nFile tmp/ tidak akan dibersihkan otomatis.`);
                        }
                } else if (args[0] === 'now') {
                        const result = clearOldFiles(0);
                        await tolak(hisoka, m,
                                `✅ *Pembersihan selesai!*\n\n` +
                                `🗑️ File dihapus: ${result.deleted}\n` +
                                `💾 Ruang dibebaskan: ${result.sizeFormatted || '0 B'}`
                        );
                } else if (args[0] === 'interval') {
                        const jam = parseInt(args[1]);
                        if (isNaN(jam) || jam < 1 || jam > 168) {
                                await tolak(hisoka, m, '❌ Interval harus angka antara 1–168 jam.\n\nContoh: *.autocleaner interval 3*');
                        } else {
                                config.autoCleaner = { ...ac, enabled: true, intervalHours: jam };
                                saveConfig(config);
                                restartAutoCleaner();
                                await tolak(hisoka, m, `✅ *Interval Auto Cleaner diubah!*\n\n⏱️ Sekarang: setiap *${jam} jam*\n\nPerubahan juga tersimpan di config.json.`);
                        }
                } else {
                        await tolak(hisoka, m, '❌ Perintah tidak valid.\n\nKetik *.autocleaner* untuk melihat bantuan.');
                }

                logCommand(m, hisoka, 'autocleaner');
        } catch (error) {
                console.error('\x1b[31m[AutoCleaner Cmd] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
        }
}

module.exports = { handleAutocleaner };
