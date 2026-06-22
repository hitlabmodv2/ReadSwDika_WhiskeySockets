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
                        // Bot utama: ganti ke mode default (pakai pool 1900 emoji)
                        const { setDefaultMode } = await import('../helper/emoji.js');
                        const result = setDefaultMode();
                        let response = `╭═══『 *DEFAULT EMOJI* 』═══╮\n│\n`;
                        response += `│ 🤖 *Bot Utama*\n│\n`;
                        response += `│ ✅ Mode diubah ke *Default*\n`;
                        response += `│\n│ 🌐 Reaksi SW sekarang pakai\n`;
                        response += `│ pool *${result.count} emoji default*\n`;
                        response += `│\n│ 💡 Ketik *.emojicustom* untuk\n`;
                        response += `│ balik ke emoji kustom kamu\n│\n`;
                        response += `│ 📋 *Command:*\n`;
                        response += `│ .emoji — lihat tutorial lengkap\n`;
                        response += `│ .emojilist — cek daftar emoji\n`;
                        response += `│ .emojiadd 😊,😄 — tambah single\n`;
                        response += `│ .emojidel 😊 — hapus single\n`;
                        response += `╰═════════════════════╯`;
                        await tolak(hisoka, m, response);
                        logCommand(m, hisoka, 'emojidefault');
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
                response += `│ 📋 *Command:*\n`;
                response += `│ .emoji — lihat tutorial lengkap\n`;
                response += `│ .emojilist — cek daftar emoji\n`;
                response += `│ .emojiadd 😊,😄 — tambah single\n`;
                response += `│ .emojidel 😊 — hapus single\n`;
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
                        // Bot utama: ganti ke mode custom — buat file custom baru jika belum ada
                        const { setCustomMode } = await import('../helper/emoji.js');
                        const result = setCustomMode();
                        let response = `╭═══『 *CUSTOM EMOJI* 』═══╮\n│\n`;
                        response += `│ 🤖 *Bot Utama*\n│\n`;
                        response += `│ ✅ Mode diubah ke *Custom*\n`;
                        if (result.isNew) {
                                response += `│\n│ 🆕 File custom baru dibuat!\n`;
                                response += `│ Seed: ${result.emojis.join(' ')}\n`;
                        }
                        response += `│\n│ 🎨 Reaksi SW sekarang pakai\n`;
                        response += `│ emoji *kustom kamu sendiri*\n`;
                        response += `│ 📊 Total: ${result.count} emoji tersimpan\n`;
                        response += `│\n│ 📋 *Command:*\n`;
                        response += `│ .emoji — lihat tutorial lengkap\n`;
                        response += `│ .emojiadd 😊,😄 — tambah single\n`;
                        response += `│ .emojidel 😊 — hapus single\n`;
                        response += `│ .emojiclear — reset ke seed\n`;
                        response += `│ .emojilist — lihat daftar\n`;
                        response += `│ .emojidefault — balik ke 1900 default\n`;
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
                response += `│\n│ 📋 *Command:*\n`;
                response += `│ .emoji — lihat tutorial lengkap\n`;
                response += `│ .emojiadd 😊,😄 — tambah single\n`;
                response += `│ .emojidel 😊 — hapus single\n`;
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
                        // Bot utama: reset customEmojis ke seed ❤️, paksa mode custom
                        const { resetCustomEmojis } = await import('../helper/emoji.js');
                        const result = resetCustomEmojis();
                        let response = `╭═══『 *CLEAR EMOJI* 』═══╮\n│\n`;
                        response += `│ 🤖 *Bot Utama*\n│\n`;
                        response += `│ ✅ Emoji kustom di-reset!\n│\n`;
                        response += `│ 💚 Seed awal: ${result.emojis.join(' ')}\n│\n`;
                        response += `│ ⚙️ Mode: *Custom* (aktif)\n│\n`;
                        response += `│ 📋 *Command:*\n`;
                        response += `│ .emoji — lihat tutorial lengkap\n`;
                        response += `│ .emojiadd 😊,😄 — tambah single\n`;
                        response += `│ .emojidel 😊 — hapus single\n`;
                        response += `│ .emojidefault — balik ke 1900 default\n`;
                        response += `╰═════════════════════╯`;
                        await tolak(hisoka, m, response);
                        logCommand(m, hisoka, 'emojiclear');
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
                response += `│ 📋 *Command:*\n`;
                response += `│ .emoji — lihat tutorial lengkap\n`;
                response += `│ .emojiadd 😊,😄 — tambah single\n`;
                response += `│ .emojidel 😊 — hapus single\n`;
                response += `│ .emojidefault — balik ke default\n`;
                response += `╰═════════════════════╯`;
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojiclear');
        } catch (error) {
                console.error('\x1b[31m[ClearEmoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports = { handleEmojidefault, handleEmojicustom, handleEmojiclear };
