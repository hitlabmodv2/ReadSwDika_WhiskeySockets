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
 *  info.cjs — Bot info command handler
 *  Perintah .info, .listgroup, .listcontact, .own, .setpairing, dan info bot lainnya
 * ───────────────────────────────
 */
'use strict';
const nodePath = require('path');
const nodeFs   = require('fs');

// ── HELPER: parse emoji input ─────────────────────────────────────────────────
// Aturan pemisah:
//   Koma atau titik → memisahkan antar token (masing-masing token bisa single atau gabungan)
//   Spasi           → memisahkan antar token di dalam segmen yang sama
//   Tanpa pemisah   → seluruh rangkaian jadi 1 token gabungan
// Contoh:
//   "😊😄😁"            → ["😊😄😁"]          (1 gabungan)
//   "😊😄😁,🍞🥯🥐"    → ["😊😄😁","🍞🥯🥐"] (2 gabungan via koma)
//   "😊😄😁.🍞🥯🥐"    → ["😊😄😁","🍞🥯🥐"] (2 gabungan via titik)
//   "😊 😄 😁"          → ["😊","😄","😁"]     (3 terpisah via spasi)
//   "😊,😄,😁"          → ["😊","😄","😁"]     (3 terpisah via koma)
//   "😊.😄.😁"          → ["😊","😄","😁"]     (3 terpisah via titik)
function parseEmojiInput(input) {
        if (!input) return [];
        const _seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
        // Split by koma atau titik
        const byDelim = input.split(/[,.]/).map(s => s.trim()).filter(Boolean);
        const result = [];
        for (const seg of byDelim) {
                if (/\s/.test(seg)) {
                        const bySpace = seg.split(/\s+/).filter(Boolean);
                        // Spasi jadi pemisah HANYA jika semua token adalah 1 grapheme cluster (emoji tunggal)
                        // Jika ada token teks/text art (multi-karakter), seluruh segmen jadi 1 gabungan
                        const allSingle = bySpace.every(token => {
                                const clusters = [..._seg.segment(token)].filter(s => s.segment.trim());
                                return clusters.length === 1;
                        });
                        if (allSingle) {
                                // Contoh: .emojiadd 😊 😄 😁 → 3 emoji terpisah
                                result.push(...bySpace);
                        } else {
                                // Contoh: .emojiadd SAYA AKAN LAWAN 🤬 → 1 gabungan utuh
                                result.push(seg);
                        }
                } else {
                        // Tidak ada spasi → 1 token (bisa single atau gabungan)
                        result.push(seg);
                }
        }
        return result;
}

// ── HELPER: render daftar emoji — pisahkan single vs gabung ──────────────────
// Single = 1 grapheme cluster (contoh: 😊)
// Gabung = >1 grapheme cluster dalam 1 string (contoh: 👮🧠🦓 dari .emojiadd 👮🧠🦓)
function renderEmojiList(emojis) {
        if (!emojis || emojis.length === 0) return '❌ _Belum ada emoji tersimpan_\n';
        try {
                const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
                const single = [];
                const gabung = [];
                for (const e of emojis) {
                        const clusters = [...segmenter.segment(String(e))].filter(s => s.segment.trim()).length;
                        if (clusters > 1) gabung.push(e);
                        else single.push(e);
                }
                let out = '';
                if (single.length > 0) out += `📌 *Single (${single.length}):* ${single.join(' ')}\n`;
                if (gabung.length > 0) out += `🔗 *Gabung (${gabung.length}):* ${gabung.map((g, i) => `${i + 1}:[${g}]`).join(' ')}\n`;
                return out || '❌ _Belum ada emoji tersimpan_\n';
        } catch {
                return `*Daftar:* ${emojis.join(' ')}\n`;
        }
}

async function handleInfo({ hisoka, m, query, tolak, logCommand, loadConfig, fs, path }) {
        try {
                const config        = loadConfig();
                const autoTyping    = config.autoTyping    || {};
                const autoRecording = config.autoRecording || {};
                const autoOnline    = config.autoOnline    || {};
                const autoReadStory = config.autoReadStory || {};
                const antiDelete    = config.antiDelete    || {};
                const antiCall      = config.antiCall      || {};
                const antiCallVideo = config.antiCallVideo || {};
                const telegram      = config.telegram      || {};
                const autoSimi      = config.autoSimi      || {};

                const statusIcon = (enabled) => enabled ? '✅' : '❌';

                const features = [
                        { name: 'Auto Typing',    icon: '📝', enabled: autoTyping.enabled,    details: autoTyping.enabled    ? [`├ Private: ${statusIcon(autoTyping.privateChat !== false)}`, `├ Group: ${statusIcon(autoTyping.groupChat !== false)}`, `└ Delay: ${autoTyping.delaySeconds || 5}s`] : [] },
                        { name: 'Auto Recording', icon: '🎤', enabled: autoRecording.enabled, details: autoRecording.enabled ? [`├ Private: ${statusIcon(autoRecording.privateChat !== false)}`, `├ Group: ${statusIcon(autoRecording.groupChat !== false)}`, `└ Delay: ${autoRecording.delaySeconds || 5}s`] : [] },
                        { name: 'Auto Online',    icon: '🟢', enabled: autoOnline.enabled,    details: autoOnline.enabled    ? [`└ Interval: ${autoOnline.intervalSeconds || 30}s`] : [] },
                        { name: 'Auto Read Story',icon: '👁️', enabled: autoReadStory.enabled, details: autoReadStory.enabled ? [`├ Reaction: ${statusIcon(autoReadStory.autoReaction !== false)}`, `└ Random Delay: ${statusIcon(autoReadStory.randomDelay !== false)}`] : [] },
                        { name: 'Auto Simi',      icon: '🤖', enabled: autoSimi.enabled,      details: autoSimi.enabled      ? [`└ Group Only: ✅`] : [] },
                        { name: 'Anti Delete',    icon: '🗑️', enabled: antiDelete.enabled,   details: antiDelete.enabled    ? [`├ Private: ${statusIcon(antiDelete.privateChat)}`, `└ Group: ${statusIcon(antiDelete.groupChat)}`] : [] },
                        { name: 'Telegram Notif', icon: '📲', enabled: telegram.enabled,      details: telegram.enabled      ? [`└ Chat ID: ${telegram.chatId ? '✅ Terset' : '❌ Belum'}`] : [] },
                        { name: 'Anti Call',      icon: '📞', enabled: antiCall.enabled,      details: antiCall.enabled      ? [`└ Whitelist: ${(antiCall.whitelist || []).length} nomor`] : [] },
                        { name: 'Anti Call Video',icon: '📹', enabled: antiCallVideo.enabled, details: antiCallVideo.enabled ? [`└ Whitelist: ${(antiCallVideo.whitelist || []).length} nomor`] : [] },
                ];

                const activeFeatures   = features.filter(f => f.enabled);
                const inactiveFeatures = features.filter(f => !f.enabled);
                const sortedFeatures   = [...activeFeatures, ...inactiveFeatures];
                const userName         = m.pushName || 'Kak';

                let text = `Halo ${userName}! Berikut info bot:\n\n╭═══『 *INFO BOT* 』═══╮\n│\n`;
                for (const feature of sortedFeatures) {
                        text += `│ ${feature.icon} *${feature.name}*\n│ ${statusIcon(feature.enabled)} ${feature.enabled ? 'Aktif' : 'Nonaktif'}\n`;
                        for (const detail of feature.details) text += `│ ${detail}\n`;
                        text += `│\n`;
                }
                text += `╰═════════════════════╯\n\n_Gunakan command masing-masing fitur untuk mengubah pengaturan, ${userName}_`;

                const imagePath = path.join(process.cwd(), 'img', 'menu.png');
                if (fs.existsSync(imagePath)) {
                        await hisoka.sendMessage(m.from, { image: fs.readFileSync(imagePath), caption: text }, { quoted: m });
                } else {
                        await tolak(hisoka, m, text);
                }
                logCommand(m, hisoka, 'info');
        } catch (error) {
                console.error('\x1b[31m[Info] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
        }
}

module.exports = { handleInfo };

// ── GROUP HANDLER ─────────────────────────────────────────────────────────────

async function handleListgroup({ hisoka, m, tolak, logCommand }) {
        const groups = Object.values(await hisoka.groupFetchAllParticipating());
        groups.map(g => hisoka.groups.write(g.id, g));
        const { isJidGroup } = await import('@whiskeysockets/baileys');
        let text = `*Total ${groups.length} groups*\n\n`;
        text += `*Total Participants in all groups:* ${Array.from(groups).reduce((a, b) => a + b.participants.length, 0)}\n\n`;
        groups.filter(group => isJidGroup(group.id)).forEach((group, i) => {
                text += `${i + 1}. *${group.subject}* - ${group.participants.length} participants\n`;
        });
        await tolak(hisoka, m, text.trim());
        logCommand(m, hisoka, 'groups');
}

async function handleListcontact({ hisoka, m, tolak, logCommand }) {
        const contacts = Array.from(hisoka.contacts.values()).filter(c => c.id);
        let text = '*Total:*\n\n';
        text += `- All Contacts: ${contacts.length}\n`;
        text += `- Saved Contacts: ${contacts.filter(v => v.isContact).length}\n`;
        text += `- Not Saved Contacts: ${contacts.filter(v => !v.isContact).length}\n`;
        await tolak(hisoka, m, text.trim());
        logCommand(m, hisoka, 'contacts');
}

async function handleUpdate({ hisoka, m, tolak, logCommand, path, fs, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        try {
                const changelogPath = path.join(process.cwd(), 'changelog.txt');
                if (!fs.existsSync(changelogPath)) { await tolak(hisoka, m, '❌ File changelog.txt tidak ditemukan.'); return; }
                const isiChangelog = fs.readFileSync(changelogPath, 'utf8').trim();
                await hisoka.sendMessage(m.from, { react: { text: '📋', key: m.key } }).catch(() => {});
                await hisoka.sendMessage(m.from, { text: isiChangelog }, { quoted: m });
                logCommand(m, hisoka, 'infoupdate');
        } catch (error) {
                console.error('\x1b[31m[InfoUpdate] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Gagal membaca changelog: ${error.message}`);
        }
}

module.exports.handleListgroup   = handleListgroup;
module.exports.handleListcontact = handleListcontact;
module.exports.handleUpdate      = handleUpdate;

// ── MISC HANDLER ──────────────────────────────────────────────────────────────

async function handleSetpairing({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        const spQuery = (query || '').trim().toLowerCase();
        if (!spQuery) {
                const spCfg     = loadConfig();
                const spCurrent = spCfg.jadibotPairingMode || 'v2';
                await tolak(hisoka, m,
                        `╔══════════════════════╗\n║  ⚙️  *PAIRING MODE*   ║\n╚══════════════════════╝\n\n` +
                        `📌 *Mode aktif sekarang:* *${spCurrent.toUpperCase()}*\n\n` +
                        `📋 *Pilihan mode:*\n` +
                        `• *.setpairing v1* → Kode & notif tampil di *GC* (tidak ke nomor tujuan)\n` +
                        `• *.setpairing v2* → Kode & notif dikirim ke *private nomor tujuan*\n\n` +
                        `💡 Contoh: _.setpairing v1_`
                );
                return;
        }
        if (spQuery !== 'v1' && spQuery !== 'v2') {
                await tolak(hisoka, m, `❌ *Mode tidak valid!*\n\nGunakan:\n• *.setpairing v1* → kode ke GC/owner\n• *.setpairing v2* → kode ke nomor tujuan`);
                return;
        }
        const spCfg = loadConfig();
        spCfg.jadibotPairingMode = spQuery;
        saveConfig(spCfg);
        const spDesc = spQuery === 'v1'
                ? 'Kode & notif tampil di GC — tidak dikirim ke nomor tujuan'
                : 'Kode & notif dikirim langsung ke private nomor tujuan';
        await tolak(hisoka, m,
                `╔══════════════════════╗\n║  ✅  *PAIRING MODE*   ║\n╚══════════════════════╝\n\n` +
                `🔄 *Mode diperbarui ke: ${spQuery.toUpperCase()}*\n\n📌 ${spDesc}\n\n_Berlaku untuk jadibot berikutnya._`
        );
        logCommand(m, hisoka, 'setpairing');
}

async function handleJadibotmenu({ hisoka, m, tolak, logCommand, loadConfig }) {
        hisoka.sendMessage(m.from, { react: { text: `🤖`, key: m.key } });
        const jadibotTeks =
`╭─「 🤖 *JADIBOT* 」
│
├➤ *.jadibot [nomor] [durasi]*
│
├➤ *.stopbot [nomor]*
│
├➤ *.listbot*
│
╰➤ *.setpairing v1/v2*

`;
        const imgPath = nodePath.join(process.cwd(), 'image', 'menu1.jpg');
        if (nodeFs.existsSync(imgPath)) {
                await hisoka.sendMessage(m.from, { image: nodeFs.readFileSync(imgPath), caption: jadibotTeks }, { quoted: m });
        } else {
                await hisoka.sendMessage(m.from, { text: jadibotTeks }, { quoted: m });
        }
        logCommand(m, hisoka, 'jadibotmenu');
}

async function handleAddEmoji({ hisoka, m, query, tolak, logCommand, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        if (!query || !query.toLowerCase().startsWith('emoji')) return;
        try {
                const { addEmojis, listEmojis } = await import('../helper/emoji.js');
                const emojiInput = query.replace(/^emoji\s*/i, '').trim();
                if (!emojiInput) {
                        await tolak(hisoka, m, `❌ Format: add emoji 😊,😄,😁\n\nContoh:\nadd emoji 😊\nadd emoji 😊,😄,😁\nadd emoji 😊 😄 😁\nadd emoji 😊😄😁 *(tanpa pemisah = 1 gabungan)*\nadd emoji 😊😄😁,🍞🥯🥐 *(koma = 2 gabungan terpisah)*`);
                        return;
                }

                const emojisToAdd = parseEmojiInput(emojiInput);
                if (!emojisToAdd.length) { await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk ditambahkan'); return; }

                const results = addEmojis(emojisToAdd);
                const newList = listEmojis();
                const _modeLabel = newList.mode === 'custom' ? '🎨 Custom (kustom kamu)' : '🌐 Default (pool 1900)';

                let response = `╭═══『 *ADD EMOJI* 』═══╮\n│\n`;
                response += `│ ⚙️ *Mode:* ${_modeLabel}\n│\n`;
                if (results.added.length > 0) response += `│ ✅ *Ditambah (${results.added.length}):* ${results.added.join(' ')}\n`;
                if (results.alreadyExists.length > 0) response += `│ ⚠️ *Sudah ada (${results.alreadyExists.length}):* ${results.alreadyExists.join(' ')}\n`;
                response += `│\n│ 📊 *Total:* ${newList.count} emoji\n`;
                response += renderEmojiList(newList.emojis);
                response += `╰═════════════════╯`;
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'add emoji');
        } catch (error) {
                console.error('\x1b[31m[AddEmoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

async function handleListEmoji({ hisoka, m, query, tolak, logCommand, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        if (!query || !query.toLowerCase().startsWith('emoji')) return;
        try {
                const { listEmojis } = await import('../helper/emoji.js');
                const data = listEmojis();
                let response = `╭═══『 *LIST EMOJI* 』═══╮\n│\n│ 📊 *Total:* ${data.count} emoji\n│\n`;
                response += renderEmojiList(data.emojis);
                response += `│\n│ *Command:*\n│ add emoji 😊,😄\n│ del emoji 😊,😄\n╰═════════════════╯`;
                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'list emoji');
        } catch (error) {
                console.error('\x1b[31m[ListEmoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports.handleSetpairing  = handleSetpairing;
module.exports.handleJadibotmenu = handleJadibotmenu;
module.exports.handleAddEmoji    = handleAddEmoji;
module.exports.handleListEmoji   = handleListEmoji;

// ── OWNER HANDLER ─────────────────────────────────────────────────────────────

async function handleAddowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                if (!query) { await tolak(hisoka, m, 'Mohon masukkan nomor yang ingin ditambahkan.\n\nContoh:\n.addowner 6289667923162\n.addowner +62 896-6792-3162'); return; }
                const cleanNumber = query.replace(/[\s\-\+\(\)]/g, '').replace(/^0/, '62');
                if (!/^\d{10,15}$/.test(cleanNumber)) { await tolak(hisoka, m, 'Format nomor tidak valid, Kak. Pastikan nomor telepon benar.'); return; }
                const config = loadConfig();
                const owners = config.owners || [];
                if (owners.includes(cleanNumber)) { await tolak(hisoka, m, `Nomor ${cleanNumber} sudah terdaftar sebagai owner, Kak.`); return; }
                owners.push(cleanNumber);
                config.owners = owners;
                saveConfig(config);
                await tolak(hisoka, m, `✅ Berhasil menambahkan owner baru!\n\n📞 Nomor: ${cleanNumber}\n👥 Total Owner: ${owners.length}`);
                logCommand(m, hisoka, 'addowner');
        } catch (error) {
                console.error('\x1b[31m[AddOwner] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
        }
}

async function handleDelowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                if (!query) { await tolak(hisoka, m, 'Mohon masukkan nomor yang ingin dihapus.\n\nContoh:\n.delowner 6289667923162'); return; }
                const cleanNumber = query.replace(/[\s\-\+\(\)]/g, '').replace(/^0/, '62');
                const config = loadConfig();
                const owners = config.owners || [];
                if (!owners.includes(cleanNumber)) { await tolak(hisoka, m, `Nomor ${cleanNumber} tidak terdaftar sebagai owner, Kak.`); return; }
                if (owners.length <= 1) { await tolak(hisoka, m, 'Tidak bisa menghapus owner terakhir, Kak. Minimal harus ada 1 owner.'); return; }
                const newOwners = owners.filter(o => o !== cleanNumber);
                config.owners = newOwners;
                saveConfig(config);
                await tolak(hisoka, m, `✅ Berhasil menghapus owner!\n\n📞 Nomor: ${cleanNumber}\n👥 Sisa Owner: ${newOwners.length}`);
                logCommand(m, hisoka, 'delowner');
        } catch (error) {
                console.error('\x1b[31m[DelOwner] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
        }
}

async function handleOwn({ hisoka, m, tolak, logCommand, loadConfig }) {
        try {
                const config = loadConfig();
                const owners = config.owners || [];
                if (!owners.length) { await tolak(hisoka, m, 'Belum ada owner yang terdaftar.'); return; }
                let text = `╭═══『 *DAFTAR OWNER* 』═══╮\n│\n│ 👥 *Total:* ${owners.length} owner\n│\n`;
                owners.forEach((owner, index) => { text += `│ ${index + 1}. 📞 ${owner}\n`; });
                text += `│\n╰═════════════════════╯\n\n*Command:*\n.addowner <nomor> - Tambah owner\n.delowner <nomor> - Hapus owner`;
                await tolak(hisoka, m, text);
                logCommand(m, hisoka, 'listowner');
        } catch (error) {
                console.error('\x1b[31m[ListOwner] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
        }
}

module.exports.handleAddowner = handleAddowner;
module.exports.handleDelowner = handleDelowner;
module.exports.handleOwn      = handleOwn;

// ── WELGOD HANDLER ────────────────────────────────────────────────────────────

async function handleSetwelgod({ hisoka, m, query, tolak, logCommand, loadConfig }) {
        if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di dalam grup!');
        if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

        const argWg    = (query || '').trim().toLowerCase();

        // Guard: jika tidak ada prefix dan arg bukan perintah valid → accidental match → diam
        if (!m.prefix && !['on', 'off'].includes(argWg)) return;

        const cfgPathWg = nodePath.join(process.cwd(), 'config.json');
        const cfgWg    = loadConfig();
        if (!cfgWg.welcomeGoodbye) cfgWg.welcomeGoodbye = { enabled: true, groups: {} };
        if (!cfgWg.welcomeGoodbye.groups) cfgWg.welcomeGoodbye.groups = {};
        if (!cfgWg.welcomeGoodbye.groups[m.from]) cfgWg.welcomeGoodbye.groups[m.from] = {};

        if (!cfgWg.welcomeGoodbye.enabled) {
                return tolak(hisoka, m, `❌ Fitur Welcome/Goodbye dinonaktifkan secara global.\nUbah *welcomeGoodbye.enabled* di config.json menjadi *true*.`);
        }

        if (argWg === 'on') {
                cfgWg.welcomeGoodbye.groups[m.from].welcome = true;
                cfgWg.welcomeGoodbye.groups[m.from].goodbye = true;
                nodeFs.writeFileSync(cfgPathWg, JSON.stringify(cfgWg, null, 4));
                await tolak(hisoka, m,
                        `╭───〔 *✅ WELGOD CARD* 〕───╮\n│\n│ 🟢 *Welcome & Goodbye AKTIF!*\n│\n│ 🖼️ Bot akan otomatis kirim canvas\n│    saat ada anggota masuk/keluar grup.\n│\n│ 💡 Nonaktifkan: *.welgod off*\n│\n╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, 'setwelgod on');
        } else if (argWg === 'off') {
                cfgWg.welcomeGoodbye.groups[m.from].welcome = false;
                cfgWg.welcomeGoodbye.groups[m.from].goodbye = false;
                nodeFs.writeFileSync(cfgPathWg, JSON.stringify(cfgWg, null, 4));
                await tolak(hisoka, m,
                        `╭───〔 *❌ WELGOD CARD* 〕───╮\n│\n│ 🔴 *Welcome & Goodbye NONAKTIF!*\n│\n│ Bot tidak akan kirim canvas masuk\n│    maupun keluar di grup ini.\n│\n│ 💡 Aktifkan: *.welgod on*\n│\n╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, 'setwelgod off');
        } else {
                const wOn      = cfgWg.welcomeGoodbye.groups[m.from]?.welcome === true;
                const gOn      = cfgWg.welcomeGoodbye.groups[m.from]?.goodbye === true;
                const globalOn = cfgWg.welcomeGoodbye.enabled;
                await tolak(hisoka, m,
                        `╭───〔 *ℹ️ WELGOD CARD* 〕───╮\n│\n│ 🌐 Global    : ${globalOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n│ 👋 Welcome  : ${wOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n│ 🚪 Goodbye  : ${gOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n│\n│ 🖼️ Aktifkan keduanya sekaligus untuk\n│    canvas masuk & keluar di grup ini.\n│\n│ 📋 Cara penggunaan:\n│ • *.welgod on*  → Aktifkan keduanya\n│ • *.welgod off* → Nonaktifkan keduanya\n│\n╰────────────────────────────────────╯`
                );
        }
}

module.exports.handleSetwelgod = handleSetwelgod;

// ── HANDLER: emojiadd ─────────────────────────────────────────────────────────

async function handleEmojiadd({ hisoka, m, query, tolak, logCommand, getJadibotNumber, addJadibotEmojis, listJadibotEmojis }) {
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const _isJb = hisoka?.isMainBot === false;
                const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;

                if (!query) {
                        let _curList = _isJb ? listJadibotEmojis(_jbNum) : null;
                        if (!_isJb) { const { listEmojis } = await import('../helper/emoji.js'); _curList = listEmojis(); }
                        const _modeNow = _curList.mode === 'custom' ? '🎨 Custom' : '🌐 Default';
                        let msg = `╭═══『 *EMOJIADD* 』═══╮\n│\n`;
                        msg += `│ ⚙️ *Mode sekarang:* ${_modeNow}\n`;
                        msg += `│ 📊 *Emoji aktif:* ${_curList.count} emoji\n`;
                        msg += renderEmojiList(_curList.emojis);
                        msg += `│\n│ 📋 *Cara pakai:*\n`;
                        msg += `│ .emoji — lihat tutorial lengkap\n`;
                        msg += `│\n│ ➕ *Tambah emoji:*\n`;
                        msg += `│ .emojiadd 😊 — tambah 1 emoji\n`;
                        msg += `│ .emojiadd 😊,😄,😁 — pakai koma\n`;
                        msg += `│ .emojiadd 😊 😄 😁 — pakai spasi\n`;
                        msg += `│\n│ 🔗 *Gabung (tanpa koma/spasi = 1 gabungan):*\n`;
                        msg += `│ .emojiadd 😊😄😁 → tersimpan sbg 1\n`;
                        msg += `│ .emojiadd 😊😄😁,🍞🥯🥐 → 2 gabungan terpisah\n`;
                        msg += `│\n│ 🗑️ *Hapus emoji:*\n`;
                        msg += `│ .emojidel 😊 — hapus single\n`;
                        msg += `│ .emojidel 1,2 — hapus gabung by nomor\n`;
                        msg += `╰═════════════════╯`;
                        await tolak(hisoka, m, msg);
                        return;
                }

                // Parse: koma=pemisah, spasi=pemisah, tanpa keduanya=gabungan
                const emojisToAdd = parseEmojiInput(query);
                if (emojisToAdd.length === 0) {
                        await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk ditambahkan');
                        return;
                }

                let results, newList;
                if (_isJb) {
                        results = addJadibotEmojis(_jbNum, emojisToAdd);
                        newList = listJadibotEmojis(_jbNum);
                } else {
                        const { addEmojis, listEmojis } = await import('../helper/emoji.js');
                        results = addEmojis(emojisToAdd);
                        newList = listEmojis();
                }

                const _modeLabel = _isJb
                        ? (newList.mode === 'custom' ? '🎨 Custom' : '🌐 Default')
                        : (newList.mode === 'custom' ? '🎨 Custom (kustom kamu)' : '🌐 Default (pool 1900)');

                let response = `╭═══『 *ADD EMOJI* 』═══╮\n│\n`;
                if (_isJb) response += `│ 👤 *Emoji milik:* +${_jbNum}\n`;
                response += `│ ⚙️ *Mode:* ${_modeLabel}\n│\n`;
                if (results.added.length > 0) response += `│ ✅ *Ditambah (${results.added.length}):* ${results.added.join(' ')}\n`;
                if (results.alreadyExists.length > 0) response += `│ ⚠️ *Sudah ada (${results.alreadyExists.length}):* ${results.alreadyExists.join(' ')}\n`;
                response += `│\n│ 📊 *Total custom:* ${newList.count} emoji\n`;
                response += renderEmojiList(newList.emojis);
                if (_isJb && newList.mode === 'default') {
                        response += `│\n│ ⚠️ *Mode kamu masih Default*\n`;
                        response += `│ Emoji tersimpan di custom pool kamu\n`;
                        response += `│ tapi belum aktif dipakai.\n`;
                        response += `│ Ketik *.emojicustom* untuk aktifkan.\n`;
                }
                response += `│\n│ 📋 *Command:*\n`;
                response += `│ .emoji — lihat tutorial lengkap\n`;
                response += `│ .emojiadd 😊,😄 — tambah single\n`;
                response += `│ .emojiadd 😊😄😁 — tambah gabungan\n`;
                response += `│ .emojidel 😊 — hapus single\n`;
                response += `│ .emojidel 1,2 — hapus gabung by nomor\n`;
                response += `│ .emojidefault → pakai emoji bot utama\n`;
                response += `│ .emojicustom → pakai emoji kamu sendiri\n`;
                response += `╰═════════════════╯`;

                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojiadd');
        } catch (error) {
                console.error('\x1b[31m[EmojiAdd] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports.handleEmojiadd = handleEmojiadd;

// ── HANDLER: emojidel ─────────────────────────────────────────────────────────

async function handleEmojidel({ hisoka, m, query, tolak, logCommand, getJadibotNumber, deleteJadibotEmojis, listJadibotEmojis }) {
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const _isJb = hisoka?.isMainBot === false;
                const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;

                if (!query) {
                        let _curList = _isJb ? listJadibotEmojis(_jbNum) : null;
                        if (!_isJb) { const { listEmojis } = await import('../helper/emoji.js'); _curList = listEmojis(); }
                        const _modeNow = _curList.mode === 'custom' ? '🎨 Custom' : '🌐 Default';
                        let msg = `╭═══『 *EMOJIDEL* 』═══╮\n│\n`;
                        msg += `│ ⚙️ *Mode sekarang:* ${_modeNow}\n`;
                        msg += `│ 📊 *Emoji aktif:* ${_curList.count} emoji\n`;
                        msg += renderEmojiList(_curList.emojis);
                        msg += `│\n│ 📋 *Cara pakai:*\n`;
                        msg += `│ .emoji — lihat tutorial lengkap\n`;
                        msg += `│\n│ 🗑️ *Hapus emoji:*\n`;
                        msg += `│ .emojidel 😊 — hapus 1 emoji\n`;
                        msg += `│ .emojidel 😊,😄,😁 — pakai koma\n`;
                        msg += `│ .emojidel 😊 😄 😁 — pakai spasi\n`;
                        msg += `│\n│ 🔗 *Gabung (pakai nomor dari list):*\n`;
                        msg += `│ .emojidel 1 — hapus gabung nomor 1\n`;
                        msg += `│ .emojidel 1,2 — hapus gabung nomor 1 dan 2\n`;
                        msg += `│\n│ ➕ *Tambah emoji:*\n`;
                        msg += `│ .emojiadd 😊,😄 — tambah single\n`;
                        msg += `│ .emojiadd 😊😄😁 — tambah gabungan\n`;
                        msg += `╰═════════════════╯`;
                        await tolak(hisoka, m, msg);
                        return;
                }

                // Deteksi mode hapus by nomor: query hanya berisi angka, spasi, koma, titik
                const isNomorMode = /^[\d\s,.]+$/.test(query.trim());
                let emojisToDelete = [];

                if (isNomorMode) {
                        // Ambil list emoji saat ini untuk resolve nomor → emoji gabung
                        let currentEmojis;
                        if (_isJb) {
                                currentEmojis = listJadibotEmojis(_jbNum).emojis;
                        } else {
                                const { listEmojis } = await import('../helper/emoji.js');
                                currentEmojis = listEmojis().emojis;
                        }

                        // Filter emoji gabung (>1 grapheme cluster)
                        const _seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
                        const gabungList = currentEmojis.filter(e =>
                                [..._seg.segment(String(e))].filter(s => s.segment.trim()).length > 1
                        );

                        if (gabungList.length === 0) {
                                await tolak(hisoka, m, '❌ Tidak ada emoji gabungan dalam daftar kamu\n\nGunakan *.emojidel 😊* untuk hapus emoji single');
                                return;
                        }

                        // Parse nomor dari input (unik, 1-based)
                        const nomorRaw = query.split(/[\s,.]+/).map(s => s.trim()).filter(Boolean);
                        const nomor = [...new Set(nomorRaw.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n >= 1))];

                        if (nomor.length === 0) {
                                await tolak(hisoka, m, '❌ Nomor tidak valid\n\nContoh: *.emojidel 1* atau *.emojidel 1,2*');
                                return;
                        }

                        const diluar = nomor.filter(n => n > gabungList.length);
                        const valid  = nomor.filter(n => n <= gabungList.length);

                        if (valid.length === 0) {
                                await tolak(hisoka, m, `❌ Nomor di luar jangkauan\n\nEmoji gabungan ada *${gabungList.length}* (nomor 1–${gabungList.length})`);
                                return;
                        }

                        emojisToDelete = valid.map(n => gabungList[n - 1]);

                        // Kalau ada nomor yang di luar range, beri info tapi tetap lanjut
                        if (diluar.length > 0) {
                                await tolak(hisoka, m, `⚠️ Nomor ${diluar.join(', ')} tidak ada (max ${gabungList.length}), sisanya tetap diproses`);
                        }
                } else {
                        // Mode biasa: hapus emoji single berdasarkan karakter
                        emojisToDelete = parseEmojiInput(query);
                        if (emojisToDelete.length === 0) {
                                await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
                                return;
                        }
                }

                let results, newList;
                if (_isJb) {
                        results = deleteJadibotEmojis(_jbNum, emojisToDelete);
                        newList = listJadibotEmojis(_jbNum);
                } else {
                        const { deleteEmojis, listEmojis } = await import('../helper/emoji.js');
                        results = deleteEmojis(emojisToDelete);
                        newList = listEmojis();
                }

                const _modeLabelDel = _isJb
                        ? (newList.mode === 'custom' ? '🎨 Custom' : '🌐 Default')
                        : (newList.mode === 'custom' ? '🎨 Custom (kustom kamu)' : '🌐 Default (pool 1900)');

                let response = `╭═══『 *DEL EMOJI* 』═══╮\n│\n`;
                if (_isJb) response += `│ 👤 *Emoji milik:* +${_jbNum}\n`;
                response += `│ ⚙️ *Mode:* ${_modeLabelDel}\n│\n`;
                if (results.deleted.length > 0) response += `│ ✅ *Dihapus (${results.deleted.length}):* ${results.deleted.join(' ')}\n`;
                if (results.notFound.length > 0) response += `│ ⚠️ *Tidak ditemukan (${results.notFound.length}):* ${results.notFound.join(' ')}\n`;
                response += `│\n│ 📊 *Sisa:* ${newList.count} emoji\n`;
                response += renderEmojiList(newList.emojis);
                response += `│\n│ 📋 *Command:*\n`;
                response += `│ .emoji — lihat tutorial lengkap\n`;
                response += `│ .emojiadd 😊,😄 — tambah single\n`;
                response += `│ .emojiadd 😊😄😁 — tambah gabungan\n`;
                response += `│ .emojidel 😊 — hapus single\n`;
                response += `│ .emojidel 1,2 — hapus gabung by nomor\n`;
                response += `│ .emojidefault → pakai emoji bot utama\n`;
                response += `│ .emojicustom → pakai emoji kamu sendiri\n`;
                response += `╰═════════════════╯`;

                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojidel');
        } catch (error) {
                console.error('\x1b[31m[EmojiDel] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports.handleEmojidel = handleEmojidel;

// ── HANDLER: emoji (panduan lengkap) ──────────────────────────────────────────

// ── Map: simpan key pesan terakhir per JID untuk auto-delete ─────────────────
const _emojiLastMsgMap = new Map();

async function _deleteEmojiLastMsg(hisoka, jid) {
        const key = _emojiLastMsgMap.get(jid);
        if (!key) return;
        try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
        _emojiLastMsgMap.delete(jid);
}

async function handleEmoji({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis, Button }) {
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const _isJb = hisoka?.isMainBot === false;
                const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
                const pref   = m.prefix || '.';

                let data;
                if (_isJb) {
                        data = listJadibotEmojis(_jbNum);
                } else {
                        const { listEmojis } = await import('../helper/emoji.js');
                        data = listEmojis();
                }

                const isCustom    = data.mode === 'custom';
                const _modeLabel  = isCustom
                        ? (_isJb ? '🎨 Custom (emoji kamu sendiri)' : '🎨 Custom (kustom kamu)')
                        : (_isJb ? '🌐 Default (ikut bot utama)' : '🌐 Default (pool 1900 emoji)');
                const modeNow     = isCustom ? 'custom' : 'default';
                const markMode    = (key) => key === modeNow ? '✓ ' : '';

                let bodyText = `*🎭 EMOJI MANAGER*\n`;
                if (_isJb) bodyText += `👤 *Milik:* +${_jbNum}\n`;
                bodyText += `⚙️ *Mode:* ${_modeLabel}\n`;
                bodyText += `📊 *Total:* ${data.count} emoji aktif\n\n`;
                bodyText += renderEmojiList(data.emojis);
                bodyText += `\n*➕ Tambah Emoji*\n\n`;
                bodyText += `*Cara pakai (pilih salah satu):*\n`;
                bodyText += `1. \`\`\`.emojiadd 😊\`\`\` — _tambah 1 emoji_\n`;
                bodyText += `2. \`\`\`.emojiadd 😊,😄,😁\`\`\` — _banyak pakai koma_\n`;
                bodyText += `3. \`\`\`.emojiadd 😊 😄 😁\`\`\` — _banyak pakai spasi_\n`;
                bodyText += `\n🔗 *Gabung jadi 1* _(langsung tanpa pemisah):_\n`;
                bodyText += `• \`\`\`.emojiadd 😊😄😁\`\`\` → _tersimpan sbg 1_\n`;
                bodyText += `• \`\`\`.emojiadd 😊😄😁,🍞🥯🥐\`\`\` → _2 gabungan_\n`;
                bodyText += `\n*➖ Hapus Emoji*\n\n`;
                bodyText += `*Single:*\n`;
                bodyText += `• \`\`\`.emojidel 😊\`\`\` — _hapus 1 emoji_\n`;
                bodyText += `• \`\`\`.emojidel 😊,😄\`\`\` — _hapus banyak pakai koma_\n`;
                bodyText += `\n*Gabung* _(nomor dari_ \`\`\`.emojilist\`\`\`_):_\n`;
                bodyText += `• \`\`\`.emojidel 1\`\`\` — _hapus gabung nomor 1_\n`;
                bodyText += `• \`\`\`.emojidel 1,2\`\`\` — _hapus gabung nomor 1 dan 2_\n`;
                bodyText += `\n*⚙️ Mode & Lainnya*\n\n`;
                if (_isJb) {
                        bodyText += `• \`\`\`.emojicustom\`\`\` → _pakai emoji kamu sendiri_\n`;
                        bodyText += `• \`\`\`.emojidefault\`\`\` → _ikut emoji bot utama_\n`;
                        bodyText += `• \`\`\`.emojiclear\`\`\` → ~semua emoji~ _direset ke awal_ ⚠️\n`;
                } else {
                        bodyText += `• \`\`\`.emojicustom\`\`\` → _aktifkan emoji kustom_\n`;
                        bodyText += `• \`\`\`.emojidefault\`\`\` → _balik ke 1900 emoji default_\n`;
                        bodyText += `• \`\`\`.emojiclear\`\`\` → ~semua emoji~ _direset ke awal_ ⚠️\n`;
                }
                bodyText += `• \`\`\`.emojilist\`\`\` → _lihat daftar emoji aktif_\n`;
                bodyText += `• \`\`\`.emoji\`\`\` → _tampilkan panduan ini_\n`;
                if (_isJb) bodyText += `\n📁 *Data tersimpan di folder kamu sendiri*\n_tidak berpengaruh ke bot utama_ ✅\n`;
                bodyText += `\n> 💡 _Ketuk tombol di bawah untuk aksi cepat!_`;

                // ── Kirim dengan single button, fallback ke teks biasa ────────────────
                if (Button) {
                        let sent = false;
                        try {
                                const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

                                const btn = new Button()
                                        .setBody(bodyText)
                                        .setFooter('⚡ Wily Bot • Emoji Manager')
                                        .addSelection('🎛️ Pilih Aksi Emoji')

                                        // ── Section 1: Mode Emoji ─────────────────────────────────
                                        .makeSections('⚙️ Mode Emoji');

                                if (_isJb) {
                                        btn
                                                .makeRow(
                                                        markMode('custom') + '🎨 Emoji Kustom',
                                                        'Pakai emoji kamu sendiri',
                                                        isCustom ? activeDesc('Reaksi SW pakai daftar emoji kamu sendiri') : 'Aktifkan mode reaksi pakai emoji kustom kamu',
                                                        `${pref}emojicustom`
                                                )
                                                .makeRow(
                                                        markMode('default') + '🌐 Emoji Default',
                                                        'Ikut emoji bot utama',
                                                        !isCustom ? activeDesc('Reaksi SW ikut pool emoji dari bot utama') : 'Ikut pool emoji dari bot utama',
                                                        `${pref}emojidefault`
                                                );
                                } else {
                                        btn
                                                .makeRow(
                                                        markMode('custom') + '🎨 Emoji Kustom',
                                                        'Aktifkan emoji kustom',
                                                        isCustom ? activeDesc('Reaksi SW pakai emoji kustom kamu') : 'Aktifkan mode reaksi pakai emoji kustom kamu',
                                                        `${pref}emojicustom`
                                                )
                                                .makeRow(
                                                        markMode('default') + '🌐 Emoji Default',
                                                        'Balik ke 1900 emoji default',
                                                        !isCustom ? activeDesc('Reaksi SW pakai pool 1900 emoji default') : 'Balik ke pool 1900 emoji default bawaan bot',
                                                        `${pref}emojidefault`
                                                );
                                }

                                // ── Section 2: Kelola Emoji ───────────────────────────────────
                                btn
                                        .makeSections('🛠️ Kelola Emoji')
                                        .makeRow(
                                                '🗑️ Reset Emoji',
                                                _isJb ? 'Reset emoji kamu ke awal' : 'Reset emoji kustom ke awal',
                                                _isJb ? 'Hapus semua emoji kustom, kembali ke seed awal' : 'Reset semua emoji kustom ke kondisi seed awal',
                                                `${pref}emojiclear`
                                        )
                                        .makeRow(
                                                '📋 Lihat Daftar Emoji',
                                                'Tampilkan semua emoji aktif',
                                                'Lihat daftar lengkap emoji yang sedang aktif saat ini',
                                                `${pref}emojilist`
                                        )
                                        .makeRow(
                                                '📖 Panduan Emoji',
                                                'Tampilkan panduan ini lagi',
                                                'Refresh panduan lengkap emoji manager',
                                                `${pref}emoji`
                                        );

                                await _deleteEmojiLastMsg(hisoka, m.from);
                                const result = await btn.run(m.from, hisoka, m);
                                if (result?.key) _emojiLastMsgMap.set(m.from, result.key);
                                sent = true;
                        } catch (_) {}
                        if (!sent) await tolak(hisoka, m, bodyText);
                } else {
                        await tolak(hisoka, m, bodyText);
                }

                logCommand(m, hisoka, 'emoji');
        } catch (error) {
                console.error('\x1b[31m[Emoji] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports.handleEmoji = handleEmoji;

// ── HANDLER: emojilist ────────────────────────────────────────────────────────

async function handleEmojilist({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis, Button }) {
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const _isJb  = hisoka?.isMainBot === false;
                const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
                const pref   = m.prefix || '.';

                let data;
                if (_isJb) {
                        data = listJadibotEmojis(_jbNum);
                } else {
                        const { listEmojis } = await import('../helper/emoji.js');
                        data = listEmojis();
                }

                const isCustom   = data.mode === 'custom';
                const _modeLabel = _isJb
                        ? (isCustom ? '🎨 Custom (emoji kamu sendiri)' : '🌐 Default (ikut bot utama)')
                        : (isCustom ? '🎨 Custom (kustom kamu)' : '🌐 Default (pool 1900 emoji)');
                const modeNow    = isCustom ? 'custom' : 'default';
                const markMode   = (key) => key === modeNow ? '✓ ' : '';

                let response = `*📋 LIST EMOJI*\n`;
                if (_isJb) response += `👤 *Milik:* +${_jbNum}\n`;
                response += `⚙️ *Mode:* ${_modeLabel}\n`;
                response += `📊 *Total:* ${data.count} emoji\n\n`;
                response += renderEmojiList(data.emojis);
                response += `\n*⚡ Aksi Cepat*\n\n`;
                response += `*Tambah:*\n`;
                response += `• \`\`\`${pref}emojiadd 😊,😄\`\`\` — _tambah single_\n`;
                response += `• \`\`\`${pref}emojiadd 😊😄😁\`\`\` — _tambah gabungan_\n`;
                response += `\n*Hapus:*\n`;
                response += `• \`\`\`${pref}emojidel 😊\`\`\` — _hapus single_\n`;
                response += `• \`\`\`${pref}emojidel 1,2\`\`\` — _hapus gabung by nomor_\n`;
                response += `\n*Mode & Lainnya:*\n`;
                if (_isJb) {
                        response += `• \`\`\`${pref}emojicustom\`\`\` → _pakai emoji kamu sendiri_\n`;
                        response += `• \`\`\`${pref}emojidefault\`\`\` → _ikut emoji bot utama_\n`;
                        response += `• \`\`\`${pref}emojiclear\`\`\` → ~semua emoji~ _direset ke awal_ ⚠️\n`;
                } else {
                        response += `• \`\`\`${pref}emojicustom\`\`\` → _aktifkan emoji kustom_\n`;
                        response += `• \`\`\`${pref}emojidefault\`\`\` → _balik ke 1900 default_\n`;
                        response += `• \`\`\`${pref}emojiclear\`\`\` → ~semua emoji~ _direset ke awal_ ⚠️\n`;
                }
                response += `• \`\`\`${pref}emoji\`\`\` → _lihat tutorial lengkap_\n`;
                response += `\n> 💡 _Ketuk tombol di bawah untuk aksi cepat!_`;

                // ── Kirim dengan single button, fallback ke teks biasa ────────────────
                if (Button) {
                        let sent = false;
                        try {
                                const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

                                const btn = new Button()
                                        .setBody(response)
                                        .setFooter('⚡ Wily Bot • List Emoji')
                                        .addSelection('🎛️ Pilih Aksi Emoji')

                                        // ── Section 1: Mode Emoji ─────────────────────────────────
                                        .makeSections('⚙️ Mode Emoji');

                                if (_isJb) {
                                        btn
                                                .makeRow(
                                                        markMode('custom') + '🎨 Emoji Kustom',
                                                        'Pakai emoji kamu sendiri',
                                                        isCustom ? activeDesc('Reaksi SW pakai daftar emoji kamu sendiri') : 'Aktifkan mode reaksi pakai emoji kustom kamu',
                                                        `${pref}emojicustom`
                                                )
                                                .makeRow(
                                                        markMode('default') + '🌐 Emoji Default',
                                                        'Ikut emoji bot utama',
                                                        !isCustom ? activeDesc('Reaksi SW ikut pool emoji dari bot utama') : 'Ikut pool emoji dari bot utama',
                                                        `${pref}emojidefault`
                                                );
                                } else {
                                        btn
                                                .makeRow(
                                                        markMode('custom') + '🎨 Emoji Kustom',
                                                        'Aktifkan emoji kustom',
                                                        isCustom ? activeDesc('Reaksi SW pakai emoji kustom kamu') : 'Aktifkan mode reaksi pakai emoji kustom kamu',
                                                        `${pref}emojicustom`
                                                )
                                                .makeRow(
                                                        markMode('default') + '🌐 Emoji Default',
                                                        'Balik ke 1900 emoji default',
                                                        !isCustom ? activeDesc('Reaksi SW pakai pool 1900 emoji default') : 'Balik ke pool 1900 emoji default bawaan bot',
                                                        `${pref}emojidefault`
                                                );
                                }

                                // ── Section 2: Kelola Emoji ───────────────────────────────────
                                btn
                                        .makeSections('🛠️ Kelola Emoji')
                                        .makeRow(
                                                '🗑️ Reset Emoji',
                                                _isJb ? 'Reset emoji kamu ke awal' : 'Reset emoji kustom ke awal',
                                                _isJb ? 'Hapus semua emoji kustom, kembali ke seed awal' : 'Reset semua emoji kustom ke kondisi seed awal',
                                                `${pref}emojiclear`
                                        )
                                        .makeRow(
                                                '📖 Panduan Emoji',
                                                'Tampilkan tutorial lengkap',
                                                'Buka panduan lengkap emoji manager dengan semua command',
                                                `${pref}emoji`
                                        );

                                await _deleteEmojiLastMsg(hisoka, m.from);
                                const result = await btn.run(m.from, hisoka, m);
                                if (result?.key) _emojiLastMsgMap.set(m.from, result.key);
                                sent = true;
                        } catch (_) {}
                        if (!sent) await tolak(hisoka, m, response);
                } else {
                        await tolak(hisoka, m, response);
                }

                logCommand(m, hisoka, 'emojilist');
        } catch (error) {
                console.error('\x1b[31m[EmojiList] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports.handleEmojilist = handleEmojilist;
