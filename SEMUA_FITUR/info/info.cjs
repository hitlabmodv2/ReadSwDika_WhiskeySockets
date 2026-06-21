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

// ── HELPER: parse emoji input (tanpa koma, dengan koma, +, atau spasi) ───────
function parseEmojiInput(input) {
        if (!input) return [];
        try {
                // Support separator: koma (,), plus (+), atau spasi
                const normalized = input.replace(/[,+]/g, ' ').replace(/\s+/g, ' ').trim();
                if (!normalized) return [];
                const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
                return [...segmenter.segment(normalized)]
                        .map(s => s.segment)
                        .filter(s => s.trim().length > 0);
        } catch {
                return input.replace(/[,+]/g, ' ').split(/\s+/).map(e => e.trim()).filter(e => e);
        }
}

async function handleInfo({ hisoka, m, query, tolak, logCommand, loadConfig, fs, path }) {
        if (!m.prefix && m.query) return;
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
        if (!m.prefix && m.query) return;
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
        if (!m.prefix && m.query) return;
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
        if (!m.prefix && m.query) return;
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
                if (!emojiInput) { await tolak(hisoka, m, `❌ Format: add emoji 😊,😄,😁\n\nContoh:\nadd emoji 😊\nadd emoji 😊,😄,😁\nadd emoji 👮+🧠+🦓`); return; }
                const emojisToAdd = parseEmojiInput(emojiInput);
                if (!emojisToAdd.length) { await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk ditambahkan'); return; }
                const results = addEmojis(emojisToAdd);
                const newList = listEmojis();
                let response = `╭═══『 *ADD EMOJI* 』═══╮\n│\n`;
                if (results.added.length > 0) response += `│ ✅ *Berhasil (${results.added.length}):* ${results.added.join(',')}\n`;
                if (results.alreadyExists.length > 0) response += `│ ⚠️ *Sudah ada (${results.alreadyExists.length}):* ${results.alreadyExists.join(',')}\n`;
                response += `│\n│ 📊 *Total:* ${newList.count} emoji\n│ *Daftar:* ${newList.emojis.join(',')}\n╰═════════════════╯`;
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
                if (data.emojis.length > 0) response += `│ *Daftar:* ${data.emojis.join(',')}\n`;
                else response += `│ ❌ Belum ada emoji tersimpan\n`;
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
        if (!m.prefix && m.query) return;
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
                        await tolak(hisoka, m, `❌ Format salah!\n\nContoh:\n.emojiadd 😊\n.emojiadd 😊,😄,😁`);
                        return;
                }

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
                response += `│\n│ 📊 *Total:* ${newList.count} emoji\n`;
                if (newList.emojis.length > 0) response += `│ *Daftar:* ${newList.emojis.join(' ')}\n`;
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
                        await tolak(hisoka, m, `❌ Format salah!\n\nContoh:\n.emojidel 😊\n.emojidel 😊,😄,😁`);
                        return;
                }

                const emojisToDelete = parseEmojiInput(query);

                if (emojisToDelete.length === 0) {
                        await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
                        return;
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
                if (results.notFound.length > 0) response += `│ ⚠️ *Tidak ada (${results.notFound.length}):* ${results.notFound.join(' ')}\n`;
                response += `│\n│ 📊 *Sisa:* ${newList.count} emoji\n`;
                if (newList.emojis.length > 0) response += `│ *Daftar:* ${newList.emojis.join(' ')}\n`;
                response += `╰═════════════════╯`;

                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojidel');
        } catch (error) {
                console.error('\x1b[31m[EmojiDel] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports.handleEmojidel = handleEmojidel;

// ── HANDLER: emojilist ────────────────────────────────────────────────────────

async function handleEmojilist({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis }) {
        if (!m.prefix && m.query) return;
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const _isJb = hisoka?.isMainBot === false;
                const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;

                let data;
                if (_isJb) {
                        data = listJadibotEmojis(_jbNum);
                } else {
                        const { listEmojis } = await import('../helper/emoji.js');
                        data = listEmojis();
                }

                const _modeLabel = _isJb
                        ? (data.mode === 'custom' ? '🎨 Custom (emoji kamu sendiri)' : '🌐 Default (ikut bot utama)')
                        : (data.mode === 'custom' ? '🎨 Custom (kustom kamu)' : '🌐 Default (pool 1900 emoji)');

                let response = `╭═══『 *LIST EMOJI* 』═══╮\n│\n`;
                if (_isJb) response += `│ 👤 *Milik:* +${_jbNum}\n`;
                response += `│ ⚙️ *Mode:* ${_modeLabel}\n`;
                response += `│ 📊 *Total:* ${data.count} emoji\n│\n`;
                if (data.emojis.length > 0) {
                        response += `│ *Daftar:* ${data.emojis.join(' ')}\n`;
                } else {
                        response += `│ ❌ Belum ada emoji tersimpan\n`;
                }
                response += `│\n│ *Command:*\n`;
                response += `│ .emojiadd 😊 😄\n`;
                response += `│ .emojidel 😊 😄\n`;
                if (_isJb) {
                        response += `│ .emojidefault → pakai emoji bot utama\n`;
                        response += `│ .emojicustom → pakai emoji kamu sendiri\n`;
                } else {
                        response += `│ .emojicustom → pakai emoji kustom\n`;
                        response += `│ .emojidefault → balik ke 1900 default\n`;
                        response += `│ .emojiclear → reset emoji kustom\n`;
                }
                response += `╰═════════════════╯`;

                await tolak(hisoka, m, response);
                logCommand(m, hisoka, 'emojilist');
        } catch (error) {
                console.error('\x1b[31m[EmojiList] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports.handleEmojilist = handleEmojilist;
