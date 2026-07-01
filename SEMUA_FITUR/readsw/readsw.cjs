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
 *  readsw.cjs — Read SW command handler
 *  Perintah .readsw untuk aktifkan/nonaktifkan auto-baca status WhatsApp
 *  Menggunakan single_select button dengan section Mode + Delay 1-20 detik
 * ───────────────────────────────
 */
'use strict';

// ── Helper: ambil mode reaction (Custom/Default) ───────────────────────────────
function _getReactionModeLabel(isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode) {
    try {
        let mode;
        if (isJadibot && jadibotNum && getJadibotEmojiMode) {
            mode = getJadibotEmojiMode(jadibotNum);
        } else if (!isJadibot && getMainEmojiMode) {
            mode = getMainEmojiMode();
        }
        if (String(mode).toLowerCase() === 'custom') return 'Custom 🟢';
        return 'Default 🔵';
    } catch (_) {
        return 'Default 🔵';
    }
}

// ── Helper bangun body status ──────────────────────────────────────────────────
function _buildBody(cfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode) {
    let statusIcon, statusText, modeText;
    if (!cfg.enabled) {
        statusIcon = '❌'; statusText = 'Nonaktif'; modeText = '-';
    } else if (cfg.autoReaction !== false) {
        statusIcon = '✅'; statusText = 'Aktif'; modeText = 'Read + Reaksi 💬';
    } else {
        statusIcon = '✅'; statusText = 'Aktif'; modeText = 'Read Only 📖';
    }

    const delayMin   = (cfg.delayMinMs   || 1000)  / 1000;
    const delayMax   = (cfg.delayMaxMs   || 20000) / 1000;
    const fixedDelay = (cfg.fixedDelayMs || 3000)  / 1000;
    const isRandom   = cfg.randomDelay !== false;
    const delayInfo  = cfg.enabled
        ? (isRandom ? `${delayMin}-${delayMax}s (acak)` : `${fixedDelay}s (tetap)`)
        : '-';

    const reactionMode = cfg.enabled && cfg.autoReaction !== false
        ? _getReactionModeLabel(isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode)
        : '-';

    const jadibotNote = isJadibot ? `\n_⚙️ Setting jadibot +${jadibotNum}_` : '';

    return (
        `╭═══『 📖 *AUTO READ STORY* 』═══╮\n` +
        `│\n` +
        `│ ${statusIcon} *Status    :* ${statusText}\n` +
        `│ 🎭 *Mode      :* ${modeText}\n` +
        `│ ⏱️ *Delay     :* ${delayInfo}\n` +
        `│ 💬 *Reaksi    :* ${cfg.autoReaction !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 🎨 *ModeReaksi:* ${reactionMode}\n` +
        `│\n` +
        `╰═════════════════════════╯` +
        jadibotNote
    );
}

// ── Map: simpan key pesan terakhir per JID untuk auto-delete ──────────────────
const _lastMsgMap = new Map();

async function _deleteLastMsg(hisoka, jid) {
    const key = _lastMsgMap.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    _lastMsgMap.delete(jid);
}

// ── Preset delay acak ─────────────────────────────────────────────────────────
const _RANDOM_PRESETS = [
    { min: 1, max: 20, label: '1–20 detik', desc: '🔰 Default — full range acak bawaan bot' },
    { min: 1, max: 5,  label: '1–5 detik',  desc: 'Sangat cepat — tidak disarankan'          },
    { min: 1, max: 10, label: '1–10 detik', desc: 'Cepat — cocok untuk banyak kontak'        },
    { min: 1, max: 15, label: '1–15 detik', desc: 'Normal — aman dan stabil'                 },
    { min: 1, max: 20, label: '1–20 detik', desc: 'Lambat — paling aman dari ban'            },
];

// ── Kirim selection button + fallback teks ─────────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg) {
    if (Button) {
        let sent = false;
        try {
            // ── tanda ✓ Mode ─────────────────────────────────────────────
            const modeAktif = !cfg.enabled ? 'off'
                : cfg.autoReaction !== false ? 'on' : 'false';
            const isMode   = (key) => key === modeAktif;
            const markMode = (key) => isMode(key) ? '✓ ' : '';

            // ── tanda ✓ Delay Tetap & Acak ───────────────────────────────
            const isRandom    = cfg.randomDelay === true;
            const fixedMs     = cfg.fixedDelayMs || 3000;
            const isFixed     = (i)      => !isRandom && fixedMs === i * 1000;
            const isPreset    = (preset) => isRandom &&
                (cfg.delayMinMs || 1000)  === preset.min * 1000 &&
                (cfg.delayMaxMs || 20000) === preset.max * 1000;
            const markFixed   = (i)      => isFixed(i)    ? '✓ ' : '';
            const markRandom  = (preset) => isPreset(preset) ? '✓ ' : '';

            // ── label desc tambahan untuk row yang aktif ──────────────────
            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Auto Read Story')
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Mode ───────────────────────────────────────
                .makeSections('⚙️ Mode')
                .makeRow(
                    markMode('on') + '✅ Aktif',
                    'Read + Reaksi',
                    isMode('on')    ? activeDesc('Baca story + reaksi emoji otomatis') : 'Baca story + kirim reaksi emoji otomatis',
                    `${pref}readsw true`
                )
                .makeRow(
                    markMode('false') + '📖 Aktif',
                    'Read Only',
                    isMode('false') ? activeDesc('Hanya baca story, tanpa reaksi')     : 'Hanya baca story, tanpa reaksi',
                    `${pref}readsw false`
                )
                .makeRow(
                    markMode('off') + '❌ Nonaktif',
                    'Matikan Auto Read Story',
                    isMode('off')   ? activeDesc('Bot tidak membaca story siapapun')   : 'Bot tidak akan membaca story siapapun',
                    `${pref}readsw off`
                )

                // ── Section 2: Delay Acak (preset) ───────────────────────
                .makeSections('🎲 Delay Acak (Preset)');

            for (const p of _RANDOM_PRESETS) {
                const aktif = isPreset(p);
                btn.makeRow(
                    markRandom(p) + p.label,
                    `Acak ${p.label}`,
                    aktif ? activeDesc(p.desc) : p.desc,
                    `${pref}readsw delay ${p.min} ${p.max}`
                );
            }

            // ── Section 3: Delay Tetap 1-20 detik ────────────────────────
            btn.makeSections('⏱️ Delay Tetap (1–20 detik)');

            for (let i = 1; i <= 20; i++) {
                let baseDesc;
                if (i <= 3)       baseDesc = 'Sangat cepat — tidak disarankan';
                else if (i <= 7)  baseDesc = 'Cepat — cocok untuk banyak kontak';
                else if (i <= 13) baseDesc = 'Normal — aman dan stabil';
                else              baseDesc = 'Lambat — paling aman dari ban';
                const aktif = isFixed(i);
                btn.makeRow(
                    markFixed(i) + `${i} detik`,
                    `Delay Tetap ${i} Detik`,
                    aktif ? activeDesc(baseDesc) : baseDesc,
                    `${pref}readsw delay ${i}`
                );
            }

            // ── Auto-delete pesan sebelumnya → kirim baru → simpan key ───
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

// ── Fallback teks biasa ────────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `${pref}readsw true — Read + Reaksi\n` +
        `${pref}readsw false — Read Only\n` +
        `${pref}readsw off — Nonaktifkan\n` +
        `${pref}readsw delay <1-20> — Delay tetap\n` +
        `${pref}readsw delay <min> <max> — Delay acak`
    );
}

// ── Handler utama ──────────────────────────────────────────────────────────────
async function handleReadsw({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadsw, setJadibotUserSetting, Button, getMainEmojiMode, getJadibotEmojiMode }) {
    const _sn = (m.sender || '').split('@')[0].split(':')[0];
    const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
    const _isJadibotUser = hisoka?.isMainBot === false && !!_jn && _sn === _jn;
    if (!m.isOwner && !_isJadibotUser) return;

    try {
        const pref       = m.prefix || '.';
        const isJadibot  = hisoka?.isMainBot === false;
        const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;
        const jadibotNote = isJadibot ? `\n_⚙️ Setting jadibot +${jadibotNum}_` : '';

        const getReadswConfig = () => isJadibot
            ? getJadibotReadsw(jadibotNum)
            : (loadConfig().autoReadStory || { enabled: true, autoReaction: true, randomDelay: true, delayMinMs: 1000, delayMaxMs: 20000, fixedDelayMs: 3000 });

        const saveReadswConfig = (newVal) => {
            if (isJadibot) setJadibotUserSetting(jadibotNum, 'readsw', newVal);
            else { const cfg = loadConfig(); cfg.autoReadStory = newVal; saveConfig(cfg); }
        };

        const args = query ? query.toLowerCase().split(' ') : [];

        // ── Tanpa argumen → tampil status + selection button ──────────────────
        if (args.length === 0) {
            const cfg      = getReadswConfig();
            const bodyText = _buildBody(cfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg);
            logCommand(m, hisoka, 'readsw');
            return;
        }

        // ── Helper: buat notif "sudah aktif" dengan body + button ────────────────
        const _notifSudahAktif = async (cfg, label) => {
            const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` +
                _buildBody(cfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
            await _sendSelection(hisoka, m, Button, tolak, body, pref, cfg);
        };

        // ── true / on → Read + Reaksi ─────────────────────────────────────────
        if (args[0] === 'true' || args[0] === 'on') {
            const cfg = getReadswConfig();
            if (cfg.enabled && cfg.autoReaction !== false) {
                await _notifSudahAktif(cfg, 'Mode Read + Reaksi');
            } else {
                const newCfg = { ...cfg, enabled: true, autoReaction: true };
                saveReadswConfig(newCfg);
                const body = `✅ *Diaktifkan! Read + Reaksi*\n\n` + _buildBody(newCfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
            }

        // ── false → Read Only ─────────────────────────────────────────────────
        } else if (args[0] === 'false') {
            const cfg = getReadswConfig();
            if (cfg.enabled && cfg.autoReaction === false) {
                await _notifSudahAktif(cfg, 'Mode Read Only');
            } else {
                const newCfg = { ...cfg, enabled: true, autoReaction: false };
                saveReadswConfig(newCfg);
                const body = `✅ *Diaktifkan! Read Only*\n\n` + _buildBody(newCfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
            }

        // ── off → Nonaktifkan ─────────────────────────────────────────────────
        } else if (args[0] === 'off') {
            const cfg = getReadswConfig();
            if (!cfg.enabled) {
                await _notifSudahAktif(cfg, 'Nonaktif');
            } else {
                const newCfg = { ...cfg, enabled: false };
                saveReadswConfig(newCfg);
                const body = `❌ *Dinonaktifkan!*\n\n` + _buildBody(newCfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
            }

        // ── delay <min> <max> → Random delay ──────────────────────────────────
        } else if (args[0] === 'delay' && args[1] && args[2]) {
            const minDelay = parseInt(args[1]);
            const maxDelay = parseInt(args[2]);
            if (isNaN(minDelay) || isNaN(maxDelay)) {
                await tolak(hisoka, m, `❌ Delay harus angka. Contoh: ${pref}readsw delay 1 20`); return;
            }
            if (minDelay < 1 || maxDelay > 60) {
                await tolak(hisoka, m, `❌ Delay min ≥ 1 detik dan max ≤ 60 detik`); return;
            }
            if (minDelay >= maxDelay) {
                await tolak(hisoka, m, `❌ Delay min harus lebih kecil dari delay max`); return;
            }
            const cfg = getReadswConfig();
            if (cfg.randomDelay === true && cfg.delayMinMs === minDelay * 1000 && cfg.delayMaxMs === maxDelay * 1000) {
                await _notifSudahAktif(cfg, `Delay Acak ${minDelay}–${maxDelay} Detik`);
            } else {
                const newCfg = { ...cfg, delayMinMs: minDelay * 1000, delayMaxMs: maxDelay * 1000, randomDelay: true };
                saveReadswConfig(newCfg);
                const body = `✅ *Delay acak: ${minDelay}–${maxDelay} detik*\n\n` + _buildBody(newCfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
            }

        // ── delay <n> → Fixed delay ───────────────────────────────────────────
        } else if (args[0] === 'delay' && args[1] && !args[2]) {
            const fixedDelay = parseInt(args[1]);
            if (isNaN(fixedDelay) || fixedDelay < 1 || fixedDelay > 60) {
                await tolak(hisoka, m, `❌ Delay harus antara 1-60 detik`); return;
            }
            const cfg = getReadswConfig();
            if (cfg.randomDelay === false && cfg.fixedDelayMs === fixedDelay * 1000) {
                await _notifSudahAktif(cfg, `Delay Tetap ${fixedDelay} Detik`);
            } else {
                const newCfg = { ...cfg, fixedDelayMs: fixedDelay * 1000, randomDelay: false };
                saveReadswConfig(newCfg);
                const body = `✅ *Delay tetap: ${fixedDelay} detik*\n\n` + _buildBody(newCfg, isJadibot, jadibotNum, getMainEmojiMode, getJadibotEmojiMode);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
            }

        // ── Perintah tidak dikenal ────────────────────────────────────────────
        } else {
            await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik ${pref}readsw untuk bantuan.`);
        }

        logCommand(m, hisoka, 'readsw');

    } catch (error) {
        console.error('\x1b[31m[ReadSW] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

module.exports = { handleReadsw };
