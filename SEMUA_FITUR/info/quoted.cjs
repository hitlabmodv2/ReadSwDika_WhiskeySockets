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
 *  quoted.cjs — Quoted message utilities
 *  Fungsi pembantu parsing & ekstraksi konten pesan yang di-quote/reply
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Quoted Message Utilities
 *  Fungsi pembantu untuk parsing, ekstraksi teks/media, dan
 *  re-forward pesan yang sedang di-quote (di-reply) —
 *  digunakan oleh banyak fitur yang butuh akses konten reply.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleQuoted({ hisoka, m, tolak, logCommand, injectMessage }) {
        if (!m.isQuoted) {
                await tolak(hisoka, m, 'No quoted message found.');
                return;
        }

        const message = hisoka.cacheMsg.get(m.quoted.key.id);
        if (!message) {
                await tolak(hisoka, m, 'Quoted message not found.');
                return;
        }

        const IMessage = await injectMessage(hisoka, message);
        if (!IMessage.isQuoted) {
                await tolak(hisoka, m, 'Quoted message not found.');
                return;
        }

        await m.reply({ forward: IMessage.quoted });
        logCommand(m, hisoka, 'quoted');
}

module.exports = { handleQuoted };
