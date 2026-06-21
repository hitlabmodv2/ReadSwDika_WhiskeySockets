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
 *  emoji-cmd.cjs — Emoji command handler
 *  Perintah .emojiadd/.emojidel/.emojilist untuk kelola emoji kustom per pengguna
 * ───────────────────────────────
 */
'use strict';

async function handleEmojidefault({ hisoka, m, tolak, logCommand, getJadibotNumber, resetToDefaultEmojis }) {
        if (!m.prefix && m.query) return;
        const _isJb = hisoka?.isMainBot === false;
        try {
                if (!_isJb) {
                        await tolak(hisoka, m,
                                `╭═══『 *DEFAULT EMOJI* 』═══╮\n│\n` +
                                `│ ℹ️ *Bot Utama* tidak punya mode\n` +
                                `│ default/custom seperti jadibot.\n│\n` +
                                `│ 📋 Emoji bot utama dikelola\n` +
                                `│ langsung dengan perintah:\n│\n` +
                                `│ .emojiadd 😊,😄 — tambah emoji\n` +
                                `│ .emojidel 😊 — hapus emoji\n` +
                                `│ .emojilist — lihat daftar emoji\n` +
                                `╰═════════════════════╯`
                        );
                        return;
                }
                const _jbNum = getJadibotNumber(hisoka);
                const count = resetToDefaultEmojis(_jbNum);
                let response = `╭═══『 *DEFAULT EMOJI* 』═══╮\n│\n`;
                response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
                response += `│ ✅ Mode diubah ke *Default*\n`;
                response += `│\n│ 🌐 Reaksi SW sekarang pakai\n`;
                response += `│ emoji dari *bot utama* (${count} emoji)\n`;
                response += `│\n│ 💡 Ketik *.emojicustom* untuk\n`;
                response += `│ balik ke emoji kamu sendiri\n│\n`;
                response += `│ *.emojilist* — cek daftar emoji\n`;
                response += `╰═════════════════════╯`;
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojidefault');
        } catch (error) {
                console.error('\x1b[31m[EmojiDefault] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

async function handleEmojicustom({ hisoka, m, tolak, logCommand, getJadibotNumber, setCustomEmojiMode, listJadibotEmojis }) {
        if (!m.prefix && m.query) return;
        const _isJb = hisoka?.isMainBot === false;
        try {
                if (!_isJb) {
                        const { listEmojis } = await import('../helper/emoji.js');
                        const data = listEmojis();
                        let response = `╭═══『 *CUSTOM EMOJI* 』═══╮\n│\n`;
                        response += `│ 🤖 *Bot Utama*\n│\n`;
                        response += `│ ✅ Mode: *Custom (Aktif)*\n`;
                        response += `│\n│ 🎨 Emoji bot utama dikelola\n`;
                        response += `│ langsung oleh owner.\n`;
                        response += `│ 📊 Total: ${data.count} emoji tersimpan\n`;
                        response += `│\n│ 💡 Atur emoji:\n`;
                        response += `│ .emojiadd 😊,😄 — tambah\n`;
                        response += `│ .emojidel 😊 — hapus\n`;
                        response += `│ .emojilist — lihat daftar\n`;
                        response += `╰═════════════════════╯`;
                        await tolak(hisoka, m, response);
                        logCommand(m, hisoka, 'emojicustom');
                        return;
                }
                const _jbNum = getJadibotNumber(hisoka);
                setCustomEmojiMode(_jbNum);
                const data = listJadibotEmojis(_jbNum);
                let response = `╭═══『 *CUSTOM EMOJI* 』═══╮\n│\n`;
                response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
                response += `│ ✅ Mode diubah ke *Custom*\n`;
                response += `│\n│ 🎨 Reaksi SW sekarang pakai\n`;
                response += `│ emoji dari *file kamu sendiri*\n`;
                response += `│ (${data.count} emoji tersimpan)\n`;
                response += `│\n│ 💡 Atur emoji kamu:\n`;
                response += `│ .emojiadd 😊,😄 — tambah\n`;
                response += `│ .emojidel 😊 — hapus\n`;
                response += `│ .emojiclear — reset ke seed WA\n`;
                response += `│ .emojilist — lihat daftar\n`;
                response += `│ .emojidefault — balik ke default\n`;
                response += `╰═════════════════════╯`;
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojicustom');
        } catch (error) {
                console.error('\x1b[31m[EmojiCustom] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

async function handleEmojiclear({ hisoka, m, tolak, logCommand, getJadibotNumber, clearJadibotEmojis }) {
        if (!m.prefix && m.query) return;
        const _isJb = hisoka?.isMainBot === false;
        try {
                if (!_isJb) {
                        await tolak(hisoka, m,
                                `╭═══『 *CLEAR EMOJI* 』═══╮\n│\n` +
                                `│ ℹ️ *Bot Utama* tidak punya fitur\n` +
                                `│ clear/reset emoji seperti jadibot.\n│\n` +
                                `│ 💡 Untuk hapus emoji bot utama:\n│\n` +
                                `│ .emojidel 😊 — hapus satu per satu\n` +
                                `│ .emojilist — lihat daftar emoji\n` +
                                `╰═════════════════════╯`
                        );
                        return;
                }
                const _jbNum = getJadibotNumber(hisoka);
                const seedEmojis = clearJadibotEmojis(_jbNum);
                let response = `╭═══『 *CLEAR EMOJI* 』═══╮\n│\n`;
                response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
                response += `│ ✅ Emoji berhasil di-reset!\n│\n`;
                response += `│ 💚 Sekarang pakai *1 emoji* seed WA:\n`;
                response += `│ ${seedEmojis.join(' ')}\n│\n`;
                response += `│ ⚙️ Mode otomatis: *Custom*\n│\n`;
                response += `│ 💡 Tambah emoji kamu sendiri:\n`;
                response += `│ .emojiadd 😊,😄,😁\n│\n`;
                response += `│ Balik ke 1900 emoji bot utama:\n`;
                response += `│ .emojidefault\n`;
                response += `╰═════════════════════╯`;
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojiclear');
        } catch (error) {
                console.error('\x1b[31m[ClearEmoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports = { handleEmojidefault, handleEmojicustom, handleEmojiclear };
