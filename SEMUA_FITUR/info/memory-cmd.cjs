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
 *  memory-cmd.cjs — AI memory command handler
 *  Perintah .memori dan .lupakan untuk kelola memori percakapan AI per pengguna
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  AI Memory Command Handler
 *  Perintah .memoriai untuk lihat & .lupakan untuk hapus memori
 *  percakapan AI per pengguna — memori disimpan di database
 *  agar AI tetap ingat konteks antar sesi.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleMemori({ hisoka, m, logCommand, loadUserMemory, memoryToReadable }) {
        const mem = loadUserMemory(m.sender);
        await m.reply(memoryToReadable(mem));
        logCommand(m, hisoka, 'memori');
}

async function handleLupakanaku({ hisoka, m, logCommand, clearUserMemory }) {
        clearUserMemory(m.sender);
        await m.reply('> *🧠 Memori AI tentang kamu sudah dihapus*\n\n_AI bakal mulai pelan-pelan kenal kamu lagi dari awal._');
        logCommand(m, hisoka, 'lupakanaku');
}

module.exports = { handleMemori, handleLupakanaku };
