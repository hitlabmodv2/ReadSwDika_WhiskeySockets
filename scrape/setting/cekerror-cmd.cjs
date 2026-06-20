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
 *  cekerror-cmd.cjs — Cek error log command
 *  Perintah .cekerror untuk tampilkan, hapus, dan ekspor log error terbaru bot
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Cek Error Log Command (.cekerror)
 *  Tampilkan, hapus, dan ekspor log error terbaru bot langsung
 *  dari chat WhatsApp — memudahkan debugging tanpa perlu
 *  akses terminal server secara langsung.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleCekerror({ hisoka, m, query, tolak, logCommand, clearErrors, formatErrorReport, generateErrorFileTxt, getInfoErrorTxtPath, getErrorStats, fs }) {
        if (!m.isOwner) return;

        const arg = (query || '').trim().toLowerCase();

        if (arg !== '' && arg !== 'reset' && arg !== 'clear' && !/^\d+$/.test(arg)) return;

        await hisoka.sendMessage(m.from, { react: { text: `🔍`, key: m.key } });

        if (arg === 'reset' || arg === 'clear') {
                clearErrors();
                await tolak(hisoka, m, `╭─「 🗑️ *ERROR LOG* 」\n│\n╰➤ Semua log error berhasil dihapus!\n\n┗━➤ 🚀 *Powered By Wily Bot*`);
                logCommand(m, hisoka, 'cekerror');
                return;
        }

        const limit = parseInt(arg) || 3;
        const summary = formatErrorReport(Math.min(limit, 50));
        await tolak(hisoka, m, summary);

        generateErrorFileTxt();
        const txtPath   = getInfoErrorTxtPath();
        const txtExists = fs.existsSync(txtPath);

        if (txtExists) {
                const fileBuffer = fs.readFileSync(txtPath);
                const { uniqueErrors, totalOccurred } = getErrorStats();
                const dupCount = totalOccurred - uniqueErrors;
                await hisoka.sendMessage(m.from, {
                        document: fileBuffer,
                        mimetype: 'text/plain',
                        fileName: 'infoerror.txt',
                        caption:
                                `📄 *infoerror.txt*\n` +
                                `├ 🔴 Jenis error unik : *${uniqueErrors}*\n` +
                                `├ 🔁 Total kejadian   : *${totalOccurred}*\n` +
                                `╰ ♻️ Duplikat digabung : *${dupCount > 0 ? dupCount : 0}*`
                }, { quoted: m });
        }

        logCommand(m, hisoka, 'cekerror');
}

module.exports = { handleCekerror };
