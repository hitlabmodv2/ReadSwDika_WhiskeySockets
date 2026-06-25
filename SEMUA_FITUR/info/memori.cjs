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
 *  memori.cjs — Memory info command
 *  Perintah cek penggunaan memori RAM dan statistik sistem bot
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Memory Info Command (.memori)
 *  Cek penggunaan RAM, CPU, uptime, dan statistik sistem bot
 *  secara real-time — berguna untuk monitoring kondisi
 *  server dan performa bot.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleMemori({ m, hisoka, logCommand, loadUserMemory, memoryToReadable }) {
        const mem = loadUserMemory(m.sender);
        await m.reply(memoryToReadable(mem));
        logCommand(m, hisoka, 'memori');
}

async function handleForgetme({ m, hisoka, logCommand, clearUserMemory }) {
        clearUserMemory(m.sender);
        await m.reply('> *🧠 Memori AI tentang kamu sudah dihapus*\n\n_AI bakal mulai pelan-pelan kenal kamu lagi dari awal._');
        logCommand(m, hisoka, 'lupakanaku');
}

module.exports = { handleMemori, handleForgetme };
