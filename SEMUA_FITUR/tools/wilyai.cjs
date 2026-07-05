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
 *  wilyai.cjs — WilyAI settings command
 *  Perintah .wilyai untuk atur mode, scope, auto reply, dan history
 *  Single-select button realtime — tanda ✓ bergeser ke pilihan aktif
 * ───────────────────────────────
 */
'use strict';

const path = require('path');
const { sendListMessage } = require(path.resolve('./SEMUA_FITUR/helper/interactive-msg.cjs'));

// ── Map: simpan key pesan terakhir per JID untuk auto-delete ─────────────────
const _lastMsgMap = new Map();

async function _deleteLastMsg(hisoka, jid) {
    const key = _lastMsgMap.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    _lastMsgMap.delete(jid);
}

// ── Helper: bangun body status terkini ───────────────────────────────────────
function _buildBody(w, totalSesi) {
    const scopeLabel = (s) => s === 'pm' ? '📩 Private (PM)' : s === 'gc' ? '👥 Grup (GC)' : '🌐 Semua (PM + GC)';
    const curScope   = w.scope || 'all';
    return (
        `╭═══『 ⚙️ *WILY AI SETTING* 』═══╮\n` +
        `│\n` +
        `│ 🤖 *.wily / .ai*   : ${w.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 💬 *Auto reply*    : ${w.autoReply !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 🎯 *Scope*         : ${scopeLabel(curScope)}\n` +
        `│ 🗂️ *Sesi tersimpan*: ${totalSesi} sesi\n` +
        `│\n` +
        `╰══════════════════════════════╯`
    );
}

// ── Kirim selection list ──────────────────────────────────────────────────────
// Pakai sendListMessage (interactiveMessage + fallback listMessage proto)
// → tidak pakai additionalNodes v:'9' name:'mixed' yang trigger Gemmy di WA lama
async function _sendSelection(hisoka, m, tolak, bodyText, pref, w, totalSesi) {
    const mark       = (cond) => cond ? '✓ ' : '';
    const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

    const isEnabled   = w.enabled !== false;
    const isAutoReply = w.autoReply !== false;
    const scope       = w.scope || 'all';

    await _deleteLastMsg(hisoka, m.from);

    // sendListMessage sudah punya fallback: interactiveMessage → listMessage → plain text
    // tidak akan throw, tidak perlu try-catch di sini
    await sendListMessage(hisoka, m.from, m, {
        body:       bodyText,
        buttonText: '🎛️ Pilih Pengaturan',
        footer:     '⚡ Wily Bot • Wily AI Setting',
        sections: [
            // ── Section 1: Status .wily ──────────────────────────────────
            {
                title: '⚙️ Status .wily',
                rows: [
                    {
                        rowId:       `${pref}wilyai on`,
                        title:       mark(isEnabled)  + '✅ Aktifkan .wily',
                        description: isEnabled  ? activeDesc('User bisa pakai .wily, .ai, .tanya') : 'Aktifkan perintah AI untuk semua user',
                    },
                    {
                        rowId:       `${pref}wilyai off`,
                        title:       mark(!isEnabled) + '❌ Matikan .wily',
                        description: !isEnabled ? activeDesc('Perintah AI dinonaktifkan') : 'Matikan — user tidak bisa pakai AI',
                    },
                ],
            },
            // ── Section 2: Auto Reply ─────────────────────────────────────
            {
                title: '💬 Auto Reply AI',
                rows: [
                    {
                        rowId:       `${pref}wilyai replay on`,
                        title:       mark(isAutoReply)  + '✅ Aktifkan Auto Reply',
                        description: isAutoReply  ? activeDesc('Bot otomatis balas pesan sesuai scope') : 'Aktifkan auto reply AI sesuai scope',
                    },
                    {
                        rowId:       `${pref}wilyai replay off`,
                        title:       mark(!isAutoReply) + '❌ Matikan Auto Reply',
                        description: !isAutoReply ? activeDesc('.wily masih bisa dipakai manual') : 'Matikan — .wily tetap bisa manual',
                    },
                ],
            },
            // ── Section 3: Scope ──────────────────────────────────────────
            {
                title: '🎯 Scope Auto Reply',
                rows: [
                    {
                        rowId:       `${pref}wilyai all`,
                        title:       mark(scope === 'all') + '🌐 Semua (PM + GC)',
                        description: scope === 'all' ? activeDesc('Auto reply aktif di PM dan Grup') : 'Auto reply di private chat dan grup',
                    },
                    {
                        rowId:       `${pref}wilyai pm`,
                        title:       mark(scope === 'pm')  + '📩 Private Only',
                        description: scope === 'pm'  ? activeDesc('Auto reply hanya di private chat') : 'Hanya auto reply di private chat (DM)',
                    },
                    {
                        rowId:       `${pref}wilyai gc`,
                        title:       mark(scope === 'gc')  + '👥 Grup Only',
                        description: scope === 'gc'  ? activeDesc('Auto reply hanya di grup') : 'Hanya auto reply di grup',
                    },
                ],
            },
            // ── Section 4: History ────────────────────────────────────────
            {
                title: '🗑️ History & Memori',
                rows: [
                    {
                        rowId:       `${pref}wilyai reset`,
                        title:       '🗑️ Reset Semua History',
                        description: totalSesi > 0 ? `Ada ${totalSesi} sesi — tap untuk hapus semua` : 'Tidak ada sesi tersimpan',
                    },
                ],
            },
        ],
    });
}

// ── Fallback teks biasa ───────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `📋 *Cara pakai:*\n` +
        `${pref}wilyai on/off        → nyala/matikan .wily\n` +
        `${pref}wilyai replay on/off → toggle auto reply\n` +
        `${pref}wilyai pm            → hanya private chat\n` +
        `${pref}wilyai gc            → hanya grup\n` +
        `${pref}wilyai all           → private + grup\n` +
        `${pref}wilyai reset         → hapus semua history`
    );
}

// ── HANDLER: wilyai ───────────────────────────────────────────────────────────
async function handleWilyai({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, countHistory, clearAllHistory, clearAllUserMemory }) {
    if (!isMainBot(hisoka)) return;
    if (!m.isOwner) return;
    try {
        const cfg  = loadConfig();
        if (!cfg.wilyAI) cfg.wilyAI = { enabled: true, autoReply: true, scope: 'all' };
        const w    = cfg.wilyAI;
        const args = (query || '').trim().toLowerCase().split(/\s+/);
        const sub  = args[0];
        const val  = args[1];
        const pref = m.prefix || '.';

        // ── Helper lokal: ambil snapshot terkini & tampilkan button ───────
        const showButton = async (extraPrefix = '') => {
            const totalSesi = countHistory();
            const freshCfg  = loadConfig();
            const freshW    = freshCfg.wilyAI || { enabled: true, autoReply: true, scope: 'all' };
            const bodyText  = extraPrefix
                ? extraPrefix + '\n\n' + _buildBody(freshW, totalSesi)
                : _buildBody(freshW, totalSesi);
            await _sendSelection(hisoka, m, tolak, bodyText, pref, freshW, totalSesi);
        };

        // ── Tanpa sub-command → tampilkan button ─────────────────────────
        if (!sub) {
            await showButton();
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── on / off ──────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            const aktif = sub === 'on';
            if (w.enabled === aktif || (w.enabled !== false && aktif)) {
                await showButton(`ℹ️ Fitur .wily sudah ${aktif ? 'aktif' : 'nonaktif'} sebelumnya.`);
            } else {
                cfg.wilyAI.enabled = aktif;
                saveConfig(cfg);
                await hisoka.sendMessage(m.from, { react: { text: aktif ? '✅' : '🚫', key: m.key } });
                await showButton();
            }
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── replay on / off ───────────────────────────────────────────────
        if (sub === 'replay') {
            if (val !== 'on' && val !== 'off') {
                await tolak(hisoka, m, `⚠️ Format: ${pref}wilyai replay on  atau  ${pref}wilyai replay off`);
                logCommand(m, hisoka, 'wilyai');
                return;
            }
            const aktif = val === 'on';
            cfg.wilyAI.autoReply = aktif;
            saveConfig(cfg);
            await hisoka.sendMessage(m.from, { react: { text: aktif ? '✅' : '🚫', key: m.key } });
            await showButton();
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── scope: pm / gc / all ─────────────────────────────────────────
        if (sub === 'pm' || sub === 'gc' || sub === 'all') {
            cfg.wilyAI.scope = sub;
            saveConfig(cfg);
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            await showButton();
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── reset / clear / hapus ─────────────────────────────────────────
        if (sub === 'reset' || sub === 'clear' || sub === 'hapus') {
            const totalSesi   = countHistory();
            await clearAllHistory();
            const totalMemori = clearAllUserMemory();
            await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
            await showButton(
                `🗑️ *Reset AI selesai!*\n\n` +
                `• 💬 *${totalSesi} sesi* percakapan dihapus\n` +
                `• 🧠 *${totalMemori} memori* user dihapus\n\n` +
                `Semua user mulai dari awal — AI tidak ingat percakapan maupun preferensi siapapun.`
            );
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── Sub-command tidak dikenal → tetap tampilkan button + pesan error ─
        await showButton(`⚠️ Sub-perintah _"${sub}"_ tidak dikenal. Gunakan pilihan di bawah:`);
        logCommand(m, hisoka, 'wilyai');

    } catch (e) {
        console.error(`[wilyai] ❌ ERROR | code: ${e.code || 'N/A'} | message: ${e.message}`);
        await tolak(hisoka, m, `❌ Error: ${e.message}`);
    }
}

module.exports = { handleWilyai };

// ── HANDLER: autosimi ─────────────────────────────────────────────────────────

async function handleSimi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
    if (!isMainBot(hisoka)) return;
    if (!m.isOwner) return;
    try {
        const config   = loadConfig();
        const autoSimi = config.autoSimi || { enabled: false };
        const args     = query ? query.split(' ') : [];
        if (args.length === 0) {
            let text = `╭═══『 *🤖 WILY AI AUTO* 』═══╮\n│\n│ *Status:* ${autoSimi.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ *AI Engine:* Gemini Vision (Gratis)\n│ *Mode:* Grup & Private Chat\n│ *Trigger:* Mention bot / Reply pesan bot\n│\n│ *Kemampuan AI:*\n│ ✅ Analisis gambar & sticker\n│ ✅ Baca teks di dalam gambar\n│ ✅ Tahu judul anime/film/series\n│ ✅ Kenali karakter anime/game\n│ ✅ Ingat nama pengguna\n│ ✅ Ngobrol santai & cerdas\n│\n│ *Perintah Manual AI:*\n│ .wily [pertanyaan]\n│ .wily (reply gambar/sticker)\n│\n│ *Pengaturan:*\n│ .simi on  - Aktifkan\n│ .simi off - Nonaktifkan\n│\n╰══════════════════════════╯`;
            await tolak(hisoka, m, text);
            return;
        }
        if (args[0].toLowerCase() === 'on') {
            if (autoSimi.enabled) {
                await tolak(hisoka, m, 'ℹ️ Wily AI Auto sudah aktif sebelumnya');
            } else {
                config.autoSimi = { ...autoSimi, enabled: true };
                saveConfig(config);
                await tolak(hisoka, m, '✅ Wily AI Auto diaktifkan!\n\n🤖 Bot akan otomatis membalas dengan AI Gemini ketika di-mention atau di-reply.\n\nFitur: analisis gambar, sticker, teks, dan lainnya!');
            }
        } else if (args[0].toLowerCase() === 'off') {
            if (!autoSimi.enabled) {
                await tolak(hisoka, m, 'ℹ️ Wily AI Auto sudah nonaktif sebelumnya');
            } else {
                config.autoSimi = { ...autoSimi, enabled: false };
                saveConfig(config);
                await tolak(hisoka, m, '❌ Wily AI Auto dinonaktifkan');
            }
        } else if (args[0].toLowerCase() === 'key' && args[1]) {
            const newKey = args.slice(1).join(' ').trim();
            if (newKey.length < 20) {
                await tolak(hisoka, m, '❌ API Key tidak valid.');
            } else {
                config.autoSimi = { ...autoSimi, apiKey: newKey };
                saveConfig(config);
                await tolak(hisoka, m, `✅ API Key berhasil diset!\n\nGunakan .autosimi on untuk mengaktifkan.`);
            }
        } else {
            await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .autosimi untuk melihat bantuan.');
        }
        logCommand(m, hisoka, 'autosimi');
    } catch (error) {
        console.error('\x1b[31m[AutoSimi] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

module.exports.handleSimi = handleSimi;
