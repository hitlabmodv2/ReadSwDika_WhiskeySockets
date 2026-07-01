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
 *  Perintah .emojicustom/.emojidefault/.emojiclear dengan single button
 * ───────────────────────────────
 */
'use strict';

// ── Shared map — auto-delete pesan emoji lintas command ──────────────────────
const { emojiDeleteLast, emojiSaveLast } = require('../helper/emoji-msgmap.cjs');

// ── Helper: kirim pesan + button, fallback ke teks biasa ──────────────────────
async function _sendWithButton(hisoka, m, tolak, bodyText, footer, sections, Button) {
        if (Button) {
                let sent = false;
                try {
                        const btn = new Button()
                                .setBody(bodyText)
                                .setFooter(footer)
                                .addSelection('🎛️ Navigasi Emoji');

                        for (const { title, rows } of sections) {
                                btn.makeSections(title);
                                for (const { label, subtitle, desc, id } of rows) {
                                        btn.makeRow(label, subtitle, desc, id);
                                }
                        }

                        await emojiDeleteLast(hisoka, m.from);
                        const result = await btn.run(m.from, hisoka, m);
                        if (result?.key) emojiSaveLast(m.from, result.key);
                        sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, bodyText);
        } else {
                await tolak(hisoka, m, bodyText);
        }
}

// ── HANDLER: .emojidefault ────────────────────────────────────────────────────

async function handleEmojidefault({ hisoka, m, tolak, logCommand, getJadibotNumber, resetToDefaultEmojis, Button }) {
        const _isJb = hisoka?.isMainBot === false;
        const pref  = m.prefix || '.';
        try {
                let count;
                let ownerLine = '';

                if (!_isJb) {
                        const { setDefaultMode } = await import('../helper/emoji.js');
                        const result = setDefaultMode();
                        count = result.count;
                        ownerLine = `🤖 *Bot Utama*\n`;
                } else {
                        const _jbNum = getJadibotNumber(hisoka);
                        count = resetToDefaultEmojis(_jbNum);
                        ownerLine = `👤 *Milik:* +${_jbNum}\n`;
                }

                let response = `*🌐 DEFAULT EMOJI*\n`;
                response += ownerLine;
                response += `\n✅ Mode diubah ke *Default*\n`;
                response += `\n🌐 Reaksi SW sekarang pakai _pool *${count} emoji default*_\n`;
                response += `\n*Langkah selanjutnya:*\n`;
                response += `1. \`\`\`${pref}emojicustom\`\`\` — _aktifkan emoji kustom kamu_\n`;
                response += `2. \`\`\`${pref}emojilist\`\`\` — _cek daftar emoji aktif_\n`;
                response += `3. \`\`\`${pref}emoji\`\`\` — _lihat panduan lengkap_\n`;
                response += `\n> 💡 _Ketuk tombol di bawah untuk navigasi cepat!_`;

                const sections = [
                        {
                                title: '⚙️ Mode Emoji',
                                rows: [
                                        {
                                                label: '🎨 Aktifkan Emoji Kustom',
                                                subtitle: 'Pakai emoji kamu sendiri',
                                                desc: 'Ganti ke mode Custom — reaksi SW pakai emoji kustom kamu',
                                                id: `${pref}emojicustom`
                                        }
                                ]
                        },
                        {
                                title: '🛠️ Kelola & Info',
                                rows: [
                                        {
                                                label: '🗑️ Reset Emoji Kustom',
                                                subtitle: 'Reset emoji ke seed awal',
                                                desc: 'Hapus semua emoji kustom dan kembali ke seed awal',
                                                id: `${pref}emojiclear`
                                        },
                                        {
                                                label: '📋 Lihat Daftar Emoji',
                                                subtitle: 'Tampilkan semua emoji aktif',
                                                desc: 'Lihat daftar lengkap emoji yang sedang aktif saat ini',
                                                id: `${pref}emojilist`
                                        },
                                        {
                                                label: '📖 Panduan Emoji',
                                                subtitle: 'Tutorial lengkap emoji manager',
                                                desc: 'Buka panduan lengkap emoji manager dengan semua command',
                                                id: `${pref}emoji`
                                        }
                                ]
                        }
                ];

                await _sendWithButton(hisoka, m, tolak, response, '⚡ Wily Bot • Default Emoji', sections, Button);
                logCommand(m, hisoka, 'emojidefault');
        } catch (error) {
                console.error('\x1b[31m[EmojiDefault] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

// ── HANDLER: .emojicustom ─────────────────────────────────────────────────────

async function handleEmojicustom({ hisoka, m, tolak, logCommand, getJadibotNumber, setCustomEmojiMode, listJadibotEmojis, Button }) {
        const _isJb = hisoka?.isMainBot === false;
        const pref  = m.prefix || '.';
        try {
                let count, ownerLine, seedLine = '';

                if (!_isJb) {
                        const { setCustomMode } = await import('../helper/emoji.js');
                        const result = setCustomMode();
                        count = result.count;
                        ownerLine = `🤖 *Bot Utama*\n`;
                        if (result.isNew) {
                                seedLine = `\n🆕 *File custom baru dibuat!*\n_Seed: ${result.emojis.join(' ')}_\n`;
                        }
                } else {
                        const _jbNum = getJadibotNumber(hisoka);
                        const _result = setCustomEmojiMode(_jbNum);
                        const data = listJadibotEmojis(_jbNum);
                        count = data.count;
                        ownerLine = `👤 *Milik:* +${_jbNum}\n`;
                        if (_result && _result.isFirstTime && _result.seeded && _result.seeded.length > 0) {
                                seedLine = `\n🆕 *Pertama kali Custom!*\n_Auto-seed: ${_result.seeded.join(' ')}_\n`;
                        }
                }

                let response = `*🎨 CUSTOM EMOJI*\n`;
                response += ownerLine;
                response += `\n✅ Mode diubah ke *Custom*\n`;
                response += seedLine;
                response += `\n🎨 Reaksi SW sekarang pakai _emoji kustom kamu sendiri_\n`;
                response += `📊 *Total:* ${count} emoji tersimpan\n`;
                response += `\n*Aksi cepat:*\n`;
                response += `• \`\`\`${pref}emojiadd 😊,😄\`\`\` — _tambah single_\n`;
                response += `• \`\`\`${pref}emojidel 😊\`\`\` — _hapus single_\n`;
                response += `• \`\`\`${pref}emojiclear\`\`\` → ~semua emoji~ _direset ke awal_ ⚠️\n`;
                response += `• \`\`\`${pref}emojilist\`\`\` → _lihat daftar emoji aktif_\n`;
                response += `\n> 💡 _Ketuk tombol di bawah untuk navigasi cepat!_`;

                const sections = [
                        {
                                title: '⚙️ Mode Emoji',
                                rows: [
                                        {
                                                label: '🌐 Balik Emoji Default',
                                                subtitle: 'Balik ke 1900 emoji default',
                                                desc: 'Ganti ke mode Default — reaksi SW pakai pool 1900 emoji default',
                                                id: `${pref}emojidefault`
                                        }
                                ]
                        },
                        {
                                title: '🛠️ Kelola & Info',
                                rows: [
                                        {
                                                label: '🗑️ Reset Emoji Kustom',
                                                subtitle: 'Reset emoji ke seed awal',
                                                desc: 'Hapus semua emoji kustom dan kembali ke seed awal',
                                                id: `${pref}emojiclear`
                                        },
                                        {
                                                label: '📋 Lihat Daftar Emoji',
                                                subtitle: 'Tampilkan semua emoji aktif',
                                                desc: 'Lihat daftar lengkap emoji yang sedang aktif saat ini',
                                                id: `${pref}emojilist`
                                        },
                                        {
                                                label: '📖 Panduan Emoji',
                                                subtitle: 'Tutorial lengkap emoji manager',
                                                desc: 'Buka panduan lengkap emoji manager dengan semua command',
                                                id: `${pref}emoji`
                                        }
                                ]
                        }
                ];

                await _sendWithButton(hisoka, m, tolak, response, '⚡ Wily Bot • Custom Emoji', sections, Button);
                logCommand(m, hisoka, 'emojicustom');
        } catch (error) {
                console.error('\x1b[31m[EmojiCustom] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

// ── HANDLER: .emojiclear ──────────────────────────────────────────────────────

async function handleEmojiclear({ hisoka, m, tolak, logCommand, getJadibotNumber, clearJadibotEmojis, Button }) {
        const _isJb = hisoka?.isMainBot === false;
        const pref  = m.prefix || '.';
        try {
                let seedEmojis, ownerLine;

                if (!_isJb) {
                        const { resetCustomEmojis } = await import('../helper/emoji.js');
                        const result = resetCustomEmojis();
                        seedEmojis = result.emojis;
                        ownerLine = `🤖 *Bot Utama*\n`;
                } else {
                        const _jbNum = getJadibotNumber(hisoka);
                        seedEmojis = clearJadibotEmojis(_jbNum);
                        ownerLine = `👤 *Milik:* +${_jbNum}\n`;
                }

                let response = `*🗑️ CLEAR EMOJI*\n`;
                response += ownerLine;
                response += `\n✅ ~Semua emoji kustom~ berhasil di-reset!\n`;
                response += `\n💚 *Seed awal:* ${seedEmojis.join(' ')}\n`;
                response += `⚙️ *Mode otomatis:* _Custom_ (aktif)\n`;
                response += `\n*Langkah selanjutnya:*\n`;
                response += `1. \`\`\`${pref}emojiadd 😊,😄\`\`\` — _tambah emoji baru_\n`;
                response += `2. \`\`\`${pref}emojilist\`\`\` — _lihat daftar emoji aktif_\n`;
                response += `3. \`\`\`${pref}emojidefault\`\`\` — _balik ke 1900 emoji default_\n`;
                response += `\n> 💡 _Ketuk tombol di bawah untuk navigasi cepat!_`;

                const sections = [
                        {
                                title: '⚙️ Mode Emoji',
                                rows: [
                                        {
                                                label: '🎨 Aktifkan Emoji Kustom',
                                                subtitle: 'Pakai emoji kamu sendiri',
                                                desc: 'Ganti ke mode Custom — reaksi SW pakai emoji kustom kamu',
                                                id: `${pref}emojicustom`
                                        },
                                        {
                                                label: '🌐 Balik Emoji Default',
                                                subtitle: 'Balik ke 1900 emoji default',
                                                desc: 'Ganti ke mode Default — reaksi SW pakai pool 1900 emoji default',
                                                id: `${pref}emojidefault`
                                        }
                                ]
                        },
                        {
                                title: '🛠️ Info',
                                rows: [
                                        {
                                                label: '📋 Lihat Daftar Emoji',
                                                subtitle: 'Tampilkan semua emoji aktif',
                                                desc: 'Lihat daftar lengkap emoji yang sedang aktif saat ini',
                                                id: `${pref}emojilist`
                                        },
                                        {
                                                label: '📖 Panduan Emoji',
                                                subtitle: 'Tutorial lengkap emoji manager',
                                                desc: 'Buka panduan lengkap emoji manager dengan semua command',
                                                id: `${pref}emoji`
                                        }
                                ]
                        }
                ];

                await _sendWithButton(hisoka, m, tolak, response, '⚡ Wily Bot • Clear Emoji', sections, Button);
                logCommand(m, hisoka, 'emojiclear');
        } catch (error) {
                console.error('\x1b[31m[ClearEmoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports = { handleEmojidefault, handleEmojicustom, handleEmojiclear };
