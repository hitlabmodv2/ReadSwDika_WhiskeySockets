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
 *  quoted-cmd.cjs — Quoted message command
 *  Perintah .quoted untuk tampilkan ulang isi pesan yang sedang di-reply
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Quoted Message Command (.quoted)
 *  Perintah .quoted untuk menampilkan ulang / meneruskan isi
 *  pesan yang sedang di-reply — berguna untuk forward pesan
 *  tersembunyi atau pesan lama yang susah dicari.
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
