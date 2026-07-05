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
 *  Perintah .wilyai untuk atur mode, scope, auto reply, dan history AI bot
 *  Menggunakan single_select button dengan section fitur lengkap
 * ───────────────────────────────
 */
'use strict';

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
        `╭═══『 *⚙️ WILY AI SETTING* 』═══╮\n` +
        `│\n` +
        `│ 🤖 *.wily command* : ${w.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 💬 *Auto reply*    : ${w.autoReply !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 🎯 *Scope*         : ${scopeLabel(curScope)}\n` +
        `│ 🗂️ *Sesi tersimpan*: ${totalSesi} sesi\n` +
        `│\n` +
        `╰══════════════════════════════╯`
    );
}

// ── Kirim selection button ────────────────────────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, w, totalSesi) {
    if (Button) {
        let sent = false;
        try {
            const isEnabled   = w.enabled !== false;
            const isAutoReply = w.autoReply !== false;
            const scope       = w.scope || 'all';

            const mark = (cond) => cond ? '✓ ' : '';
            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Wily AI Setting')
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Status .wily ───────────────────────────────
                .makeSections('🤖 Status .wily / .ai / .tanya')
                .makeRow(
                    mark(isEnabled) + '✅ Aktifkan',
                    'Fitur .wily ON',
                    isEnabled  ? activeDesc('User bisa pakai .wily, .ai, .tanya') : 'Aktifkan perintah AI untuk semua user',
                    `${pref}wilyai on`
                )
                .makeRow(
                    mark(!isEnabled) + '🚫 Matikan',
                    'Fitur .wily OFF',
                    !isEnabled ? activeDesc('Perintah AI dinonaktifkan') : 'Matikan perintah AI — user tidak bisa pakai',
                    `${pref}wilyai off`
                )

                // ── Section 2: Auto Reply ─────────────────────────────────
                .makeSections('💬 Auto Reply AI')
                .makeRow(
                    mark(isAutoReply) + '✅ Auto Reply ON',
                    'Bot auto balas dengan AI',
                    isAutoReply  ? activeDesc('Bot otomatis balas pesan sesuai scope') : 'Aktifkan auto reply AI sesuai scope',
                    `${pref}wilyai replay on`
                )
                .makeRow(
                    mark(!isAutoReply) + '🚫 Auto Reply OFF',
                    'Matikan auto reply',
                    !isAutoReply ? activeDesc('.wily masih bisa dipakai manual') : 'Matikan auto reply, .wily tetap bisa dipakai manual',
                    `${pref}wilyai replay off`
                )

                // ── Section 3: Scope ─────────────────────────────────────
                .makeSections('🎯 Scope Auto Reply')
                .makeRow(
                    mark(scope === 'all') + '🌐 Semua (PM + GC)',
                    'Private + Grup',
                    scope === 'all' ? activeDesc('Auto reply aktif di PM dan Grup') : 'Auto reply di private chat dan grup',
                    `${pref}wilyai all`
                )
                .makeRow(
                    mark(scope === 'pm') + '📩 Private Only',
                    'Hanya Private Chat (DM)',
                    scope === 'pm' ? activeDesc('Auto reply hanya di private chat') : 'Auto reply hanya di private chat (DM)',
                    `${pref}wilyai pm`
                )
                .makeRow(
                    mark(scope === 'gc') + '👥 Grup Only',
                    'Hanya Grup',
                    scope === 'gc' ? activeDesc('Auto reply hanya di grup') : 'Auto reply hanya di grup',
                    `${pref}wilyai gc`
                )

                // ── Section 4: History ────────────────────────────────────
                .makeSections('🗑️ History & Memori')
                .makeRow(
                    '🗑️ Reset Semua History',
                    `Hapus ${totalSesi} sesi + semua memori user`,
                    'Hapus semua percakapan & memori — AI mulai dari awal',
                    `${pref}wilyai reset`
                );

            await _deleteLastMsg(hisoka, m.from);
            const result = await btn.run(m.from, hisoka, m);
            if (result?.key) _lastMsgMap.set(m.from, result.key);
            sent = true;
        } catch (_) {}
        if (!sent) await _sendFallback(tolak, hisoka, m, bodyText, pref);
    } else {
        await _sendFallback(tolak, hisoka, m, bodyText, pref);
    }
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
async function handleWilyai({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, countHistory, clearAllHistory, clearAllUserMemory, Button }) {
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

        // ── Tanpa sub-command → tampilkan button ─────────────────────────
        if (!sub) {
            const totalSesi = countHistory();
            const bodyText  = _buildBody(w, totalSesi);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, w, totalSesi);
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── on / off ──────────────────────────────────────────────────────
        if (sub === 'on' || sub === 'off') {
            const aktif = sub === 'on';
            if (w.enabled === aktif || (w.enabled !== false && aktif)) {
                // no-op: tetap tampilkan button dengan status terkini
                const totalSesi = countHistory();
                const bodyText  = `ℹ️ Fitur .wily sudah ${aktif ? 'aktif' : 'nonaktif'} sebelumnya.\n\n` + _buildBody(w, totalSesi);
                await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, w, totalSesi);
            } else {
                cfg.wilyAI.enabled = aktif;
                saveConfig(cfg);
                await hisoka.sendMessage(m.from, { react: { text: aktif ? '✅' : '🚫', key: m.key } });
                const totalSesi = countHistory();
                const bodyText  = _buildBody(cfg.wilyAI, totalSesi);
                await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg.wilyAI, totalSesi);
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
            const totalSesi = countHistory();
            const bodyText  = _buildBody(cfg.wilyAI, totalSesi);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg.wilyAI, totalSesi);
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── scope: pm / gc / all ─────────────────────────────────────────
        if (sub === 'pm' || sub === 'gc' || sub === 'all') {
            cfg.wilyAI.scope = sub;
            saveConfig(cfg);
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            const totalSesi = countHistory();
            const bodyText  = _buildBody(cfg.wilyAI, totalSesi);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg.wilyAI, totalSesi);
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── reset / clear / hapus ─────────────────────────────────────────
        if (sub === 'reset' || sub === 'clear' || sub === 'hapus') {
            const totalSesi   = countHistory();
            await clearAllHistory();
            const totalMemori = clearAllUserMemory();
            await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
            const resetInfo = `🗑️ *Reset AI selesai!*\n\n• 💬 *${totalSesi} sesi* percakapan dihapus\n• 🧠 *${totalMemori} memori* user dihapus\n\nSemua user mulai dari awal — AI tidak ingat percakapan maupun preferensi siapapun.`;
            const totalSesiNow = countHistory(); // selalu 0 setelah reset
            const bodyText     = resetInfo + '\n\n' + _buildBody(w, totalSesiNow);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, w, totalSesiNow);
            logCommand(m, hisoka, 'wilyai');
            return;
        }

        // ── Sub-command tidak dikenal ────────────────────────────────────
        await tolak(hisoka, m, `⚠️ Sub-perintah tidak dikenal.\n\nGunakan:\n${pref}wilyai on/off\n${pref}wilyai replay on/off\n${pref}wilyai pm | gc | all\n${pref}wilyai reset`);
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
            let text = `╭═══『 *🤖 WILY AI AUTO* 』═══╮\n│\n│ *Status:* ${autoSimi.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ *AI Engine:* Gemini Vision (Gratis)\n│ *Mode:* Grup & Private Chat\n│ *Trigger:* Mention bot / Reply pesan bot\n│\n│ *Kemampuan AI:*\n│ ✅ Analisis gambar & sticker\n│ ✅ Baca teks di dalam gambar\n│ ✅ Tahu judul anime/film/series\n│ ✅ Kenali karakter anime/game\n│ ✅ Ingat nama pengguna\n│ ✅ Ngobrol santai & cerdas\n│\n│ *Perintah Manual AI:*\n│ .wily [pertanyaan]\n│ .wily (reply gambar/sticker)\n│\n│ *Pengaturan:*\n│ .autosimi on  - Aktifkan\n│ .autosimi off - Nonaktifkan\n│\n╰══════════════════════════╯`;
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
