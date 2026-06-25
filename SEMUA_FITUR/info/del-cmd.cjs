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
 *  del-cmd.cjs — Delete message command
 *  Perintah .del untuk hapus pesan bot sendiri atau pesan yang di-reply
 * ───────────────────────────────
 */
'use strict';

async function handleDel({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet }) {

        if (m.isQuoted && !query) {
                try {
                        const quotedKey = m.quoted.key;
                        const isOwnMessage = quotedKey.fromMe === true;

                        if (m.isGroup) {
                                // Grup: boleh hapus kalau pesan bot sendiri ATAU bot adalah admin grup
                                const botAdminData = kvGet('botadmin/botadmin', {});
                                const isBotGroupAdmin = botAdminData[m.from] === true;

                                if (!isOwnMessage && !isBotGroupAdmin) {
                                        await tolak(hisoka, m, '❌ Bot bukan admin di grup ini!\nHanya bisa hapus pesan bot sendiri.');
                                        return;
                                }

                                const deleteKey = {
                                        remoteJid: m.from,
                                        fromMe: quotedKey.fromMe,
                                        id: quotedKey.id,
                                        ...(quotedKey.participant ? { participant: quotedKey.participant } : {}),
                                };
                                await hisoka.sendMessage(m.from, { delete: deleteKey });

                        } else {
                                // Private chat: TIDAK cek isOwnMessage dulu karena fromMe bisa salah
                                // ketika pesan lama (tidak di cache) & contextInfo.participant kosong.
                                // Paksa fromMe:true → WA server yang reject kalau bukan pesan bot.
                                const deleteKey = {
                                        remoteJid: m.from,
                                        fromMe: true,
                                        id: quotedKey.id,
                                };
                                await hisoka.sendMessage(m.from, { delete: deleteKey });
                        }

                        // Hapus juga pesan .del milik user (silent, tidak apa-apa kalau gagal)
                        try { await hisoka.sendMessage(m.from, { delete: m.key }); } catch (_) {}

                } catch (error) {
                        await tolak(hisoka, m, `❌ Gagal menghapus pesan: ${error.message}`);
                }
                return;
        }

        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        if (!query || !query.toLowerCase().startsWith('emoji')) return;
        try {
                const { deleteEmojis, listEmojis } = await import('../helper/emoji.js');
                
                const emojiInput = query.replace(/^emoji\s*/i, '').trim();
                
                if (!emojiInput) {
                        await tolak(hisoka, m, `❌ Format: del emoji 😊,😄\n\nContoh:\ndel emoji 😊\ndel emoji 😊,😄,😁`);
                        return;
                }

                const emojisToDelete = (() => {
                        try {
                                const normalized = emojiInput.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
                                const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
                                return [...segmenter.segment(normalized)].map(s => s.segment).filter(s => s.trim().length > 0);
                        } catch {
                                return emojiInput.replace(/,/g, ' ').split(/\s+/).map(e => e.trim()).filter(e => e);
                        }
                })();
                
                if (emojisToDelete.length === 0) {
                        await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
                        return;
                }

                const results = deleteEmojis(emojisToDelete);
                const newList = listEmojis();
                
                let response = `╭═══『 *DEL EMOJI* 』═══╮\n│\n`;

                if (results.deleted.length > 0) {
                        response += `│ ✅ *Dihapus (${results.deleted.length}):* ${results.deleted.join(',')}\n`;
                }

                if (results.notFound.length > 0) {
                        response += `│ ⚠️ *Tidak ada (${results.notFound.length}):* ${results.notFound.join(',')}\n`;
                }

                response += `│\n│ 📊 *Sisa:* ${newList.count} emoji\n`;
                if (newList.emojis.length > 0) {
                        response += `│ *Daftar:* ${newList.emojis.join(',')}\n`;
                }
                response += `╰═════════════════╯`;
                
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'del emoji');
        } catch (error) {
                console.error('\x1b[31m[DelEmoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports = { handleDel };
