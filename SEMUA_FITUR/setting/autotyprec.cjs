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
 *  autotyprec.cjs — Auto typing/recording toggle
 *  Perintah .typing dan .recording untuk aktifkan animasi sedang mengetik/merekam
 *  Menggunakan single_select button dengan section Mode + Chat Target + Delay
 * ───────────────────────────────
 */
'use strict';

// ── Preset delay populer (detik) ────────────────────────────────────────────
const _DELAY_PRESETS = [
    { sec: 1,  desc: 'Sangat cepat — hampir instan' },
    { sec: 3,  desc: 'Cepat — terasa natural' },
    { sec: 5,  desc: '🔰 Default — seimbang & wajar' },
    { sec: 10, desc: 'Normal — terlihat sedang mengetik lama' },
    { sec: 20, desc: 'Lambat — untuk pesan panjang' },
    { sec: 30, desc: 'Sangat lambat — jarang dipakai' },
];

// ── Helper bangun body status ────────────────────────────────────────────────
function _buildBody(label, icon, cfg, isJadibot, jadibotNum) {
    const jadibotNote = isJadibot ? `\n> ⚙️ _Setting khusus jadibot +${jadibotNum}_` : '';
    return (
        `╭═══『 ${icon} *AUTO ${label.toUpperCase()}* 』═══╮\n` +
        `│\n` +
        `│ ${cfg.enabled ? '✅' : '❌'} *Status      :* ${cfg.enabled ? '*Aktif*' : '*Nonaktif*'}\n` +
        `│ ⏱️ *Delay       :* \`${cfg.delaySeconds || 5} detik\`\n` +
        `│ 💬 *Private Chat:* ${cfg.privateChat !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 👥 *Group Chat  :* ${cfg.groupChat !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│\n` +
        `│ ℹ️ _Bot akan menampilkan animasi_\n` +
        `│ _"sedang ${label.toLowerCase()}..." sebelum membalas._\n` +
        `│\n` +
        `╰═════════════════════════╯` +
        jadibotNote
    );
}

// ── Map key pesan terakhir per fitur (typing/recording) & per JID ───────────
const _lastMsgMapTyping = new Map();
const _lastMsgMapRecord = new Map();

async function _deleteLastMsg(hisoka, jid, map) {
    const key = map.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    map.delete(jid);
}

// ── Kirim selection button + fallback teks (generik utk typing & recording) ─
async function _sendSelection({ hisoka, m, Button, tolak, bodyText, pref, cfg, cmd, label, footer, lastMsgMap }) {
    if (Button) {
        let sent = false;
        try {
            const isMode      = (key) => (key === 'on' ? cfg.enabled : !cfg.enabled);
            const markMode    = (key) => isMode(key) ? '✓ ' : '';
            const isPrivateOn = cfg.privateChat !== false;
            const isGroupOn   = cfg.groupChat !== false;
            const markPriv    = (key) => (key === 'on' ? isPrivateOn : !isPrivateOn) ? '✓ ' : '';
            const markGroup   = (key) => (key === 'on' ? isGroupOn : !isGroupOn) ? '✓ ' : '';
            const isPreset    = (sec) => (cfg.delaySeconds || 5) === sec;
            const markDelay   = (sec) => isPreset(sec) ? '✓ ' : '';
            const activeDesc  = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter(footer)
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Mode ──────────────────────────────────────
                .makeSections('⚙️ Mode')
                .makeRow(
                    markMode('on') + '✅ Aktif',
                    `Nyalakan Auto ${label}`,
                    isMode('on')  ? activeDesc(`Auto ${label} aktif`) : `Aktifkan animasi auto ${label.toLowerCase()}`,
                    `${pref}${cmd} on`
                )
                .makeRow(
                    markMode('off') + '❌ Nonaktif',
                    `Matikan Auto ${label}`,
                    isMode('off') ? activeDesc(`Auto ${label} nonaktif`) : `Nonaktifkan animasi auto ${label.toLowerCase()}`,
                    `${pref}${cmd} off`
                )

                // ── Section 2: Target Chat ────────────────────────────────
                .makeSections('🎯 Target Chat')
                .makeRow(
                    markPriv('on') + (isPrivateOn ? '✅ Private ON' : '☑️ Private ON'),
                    'Private Chat',
                    isPrivateOn ? activeDesc('Berlaku di private chat') : 'Aktifkan di private chat',
                    `${pref}${cmd} private on`
                )
                .makeRow(
                    markPriv('off') + (!isPrivateOn ? '✅ Private OFF' : '☑️ Private OFF'),
                    'Private Chat',
                    !isPrivateOn ? activeDesc('Tidak berlaku di private chat') : 'Nonaktifkan di private chat',
                    `${pref}${cmd} private off`
                )
                .makeRow(
                    markGroup('on') + (isGroupOn ? '✅ Grup ON' : '☑️ Grup ON'),
                    'Group Chat',
                    isGroupOn ? activeDesc('Berlaku di grup') : 'Aktifkan di grup',
                    `${pref}${cmd} group on`
                )
                .makeRow(
                    markGroup('off') + (!isGroupOn ? '✅ Grup OFF' : '☑️ Grup OFF'),
                    'Group Chat',
                    !isGroupOn ? activeDesc('Tidak berlaku di grup') : 'Nonaktifkan di grup',
                    `${pref}${cmd} group off`
                )

                // ── Section 3: Delay ──────────────────────────────────────
                .makeSections('⏱️ Delay Populer');

            for (const p of _DELAY_PRESETS) {
                const aktif = isPreset(p.sec);
                btn.makeRow(
                    markDelay(p.sec) + `${p.sec} detik`,
                    `Set Delay ${p.sec} Detik`,
                    aktif ? activeDesc(p.desc) : p.desc,
                    `${pref}${cmd} set ${p.sec}`
                );
            }

            await _deleteLastMsg(hisoka, m.from, lastMsgMap);
            const result = await btn.run(m.from, hisoka, m);
            if (result?.key) lastMsgMap.set(m.from, result.key);
            sent = true;
        } catch (_) {}
        if (!sent) await _sendFallback(tolak, hisoka, m, bodyText, pref, cmd, label);
    } else {
        await _sendFallback(tolak, hisoka, m, bodyText, pref, cmd, label);
    }
}

// ── Fallback teks biasa (format WA: bold, monospace, list, quote) ───────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref, cmd, label) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `1. \`${pref}${cmd} on\` / \`off\` — Aktif/nonaktifkan\n` +
        `2. \`${pref}${cmd} set <detik>\` — Atur delay _(1-60 detik)_\n` +
        `3. \`${pref}${cmd} private on/off\` — Target private chat\n` +
        `4. \`${pref}${cmd} group on/off\` — Target grup\n\n` +
        `> 💡 _Tips: pakai tombol di atas biar lebih_\n` +
        `> _cepat & tidak salah ketik perintah._`
    );
}

// ═══════════════════════════ AUTO TYPING ═══════════════════════════════════
async function handleTyp({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoTyping, setJadibotUserSetting, Button }) {
    if (!m.isOwner && hisoka?.isMainBot !== false) return;
    try {
        const _isJadibot  = hisoka?.isMainBot === false;
        const _jadibotNum = _isJadibot ? getJadibotNumber(hisoka) : null;
        const pref        = m.prefix || '.';

        if (_isJadibot) {
            const _sn = (m.sender || '').split('@')[0].split(':')[0];
            const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
            const _isJadibotUser = !!_jn && _sn === _jn;
            if (!m.isOwner && !_isJadibotUser) return;
        }

        const getTyping = () => _isJadibot
            ? getJadibotAutoTyping(_jadibotNum)
            : (loadConfig().autoTyping || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true });

        const _saveTyping = (newVal) => {
            if (_isJadibot) setJadibotUserSetting(_jadibotNum, 'autoTyping', newVal);
            else { const cfg = loadConfig(); cfg.autoTyping = newVal; saveConfig(cfg); }
        };

        const args = query ? query.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];
        const _send = (cfg, prefixText = '') => _sendSelection({
            hisoka, m, Button, tolak, cmd: 'typing', label: 'Typing', footer: '⚡ Wily Bot • Auto Typing',
            bodyText: prefixText + _buildBody('Typing', '⌨️', cfg, _isJadibot, _jadibotNum),
            pref, cfg, lastMsgMap: _lastMsgMapTyping,
        });

        if (args.length === 0) {
            await _send(getTyping());
            logCommand(m, hisoka, 'typing');
            return;
        }

        if (args[0] === 'on') {
            const cfg = getTyping();
            if (cfg.enabled) await _send(cfg, 'ℹ️ *Auto Typing sudah aktif sebelumnya!*\n\n');
            else { const n = { ...cfg, enabled: true }; _saveTyping(n); await _send(n, '✅ *Auto Typing diaktifkan!*\n\n'); }
        } else if (args[0] === 'off') {
            const cfg = getTyping();
            if (!cfg.enabled) await _send(cfg, 'ℹ️ *Auto Typing sudah nonaktif sebelumnya!*\n\n');
            else { const n = { ...cfg, enabled: false }; _saveTyping(n); await _send(n, '❌ *Auto Typing dinonaktifkan!*\n\n'); }
        } else if (args[0] === 'set' && args[1]) {
            const seconds = parseInt(args[1]);
            if (isNaN(seconds) || seconds < 1 || seconds > 60) { await tolak(hisoka, m, '❌ Delay harus antara *1-60 detik*'); return; }
            const cfg = getTyping();
            if ((cfg.delaySeconds || 5) === seconds) await _send(cfg, `ℹ️ *Delay ${seconds} detik sudah aktif sebelumnya!*\n\n`);
            else { const n = { ...cfg, delaySeconds: seconds }; _saveTyping(n); await _send(n, `✅ *Delay diset ke ${seconds} detik!*\n\n`); }
        } else if (args[0] === 'private' && args[1]) {
            const enabled = args[1] === 'on';
            const cfg = getTyping();
            if ((cfg.privateChat !== false) === enabled) await _send(cfg, `ℹ️ *Private Chat sudah ${enabled ? 'aktif' : 'nonaktif'} sebelumnya!*\n\n`);
            else { const n = { ...cfg, privateChat: enabled }; _saveTyping(n); await _send(n, `${enabled ? '✅' : '❌'} *Private Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}!*\n\n`); }
        } else if (args[0] === 'group' && args[1]) {
            const enabled = args[1] === 'on';
            const cfg = getTyping();
            if ((cfg.groupChat !== false) === enabled) await _send(cfg, `ℹ️ *Group Chat sudah ${enabled ? 'aktif' : 'nonaktif'} sebelumnya!*\n\n`);
            else { const n = { ...cfg, groupChat: enabled }; _saveTyping(n); await _send(n, `${enabled ? '✅' : '❌'} *Group Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}!*\n\n`); }
        } else {
            await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik \`${pref}typing\` untuk bantuan.`);
        }
        logCommand(m, hisoka, 'typing');
    } catch (error) {
        console.error('\x1b[31m[Typing] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

// ═══════════════════════════ AUTO RECORDING ════════════════════════════════
async function handleRecord({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoRecording, setJadibotUserSetting, Button }) {
    if (!m.isOwner && hisoka?.isMainBot !== false) return;
    try {
        const _isJadibot  = hisoka?.isMainBot === false;
        const _jadibotNum = _isJadibot ? getJadibotNumber(hisoka) : null;
        const pref        = m.prefix || '.';

        if (_isJadibot) {
            const _sn = (m.sender || '').split('@')[0].split(':')[0];
            const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
            const _isJadibotUser = !!_jn && _sn === _jn;
            if (!m.isOwner && !_isJadibotUser) return;
        }

        const getRecording = () => _isJadibot
            ? getJadibotAutoRecording(_jadibotNum)
            : (loadConfig().autoRecording || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true });

        const _saveRecording = (newVal) => {
            if (_isJadibot) setJadibotUserSetting(_jadibotNum, 'autoRecording', newVal);
            else { const cfg = loadConfig(); cfg.autoRecording = newVal; saveConfig(cfg); }
        };

        const args = query ? query.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];
        const _send = (cfg, prefixText = '') => _sendSelection({
            hisoka, m, Button, tolak, cmd: 'recording', label: 'Recording', footer: '⚡ Wily Bot • Auto Recording',
            bodyText: prefixText + _buildBody('Recording', '🎙️', cfg, _isJadibot, _jadibotNum),
            pref, cfg, lastMsgMap: _lastMsgMapRecord,
        });

        if (args.length === 0) {
            await _send(getRecording());
            logCommand(m, hisoka, 'recording');
            return;
        }

        if (args[0] === 'on') {
            const cfg = getRecording();
            if (cfg.enabled) await _send(cfg, 'ℹ️ *Auto Recording sudah aktif sebelumnya!*\n\n');
            else { const n = { ...cfg, enabled: true }; _saveRecording(n); await _send(n, '✅ *Auto Recording diaktifkan!*\n\n'); }
        } else if (args[0] === 'off') {
            const cfg = getRecording();
            if (!cfg.enabled) await _send(cfg, 'ℹ️ *Auto Recording sudah nonaktif sebelumnya!*\n\n');
            else { const n = { ...cfg, enabled: false }; _saveRecording(n); await _send(n, '❌ *Auto Recording dinonaktifkan!*\n\n'); }
        } else if (args[0] === 'set' && args[1]) {
            const seconds = parseInt(args[1]);
            if (isNaN(seconds) || seconds < 1 || seconds > 60) { await tolak(hisoka, m, '❌ Delay harus antara *1-60 detik*'); return; }
            const cfg = getRecording();
            if ((cfg.delaySeconds || 5) === seconds) await _send(cfg, `ℹ️ *Delay ${seconds} detik sudah aktif sebelumnya!*\n\n`);
            else { const n = { ...cfg, delaySeconds: seconds }; _saveRecording(n); await _send(n, `✅ *Delay diset ke ${seconds} detik!*\n\n`); }
        } else if (args[0] === 'private' && args[1]) {
            const enabled = args[1] === 'on';
            const cfg = getRecording();
            if ((cfg.privateChat !== false) === enabled) await _send(cfg, `ℹ️ *Private Chat sudah ${enabled ? 'aktif' : 'nonaktif'} sebelumnya!*\n\n`);
            else { const n = { ...cfg, privateChat: enabled }; _saveRecording(n); await _send(n, `${enabled ? '✅' : '❌'} *Private Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}!*\n\n`); }
        } else if (args[0] === 'group' && args[1]) {
            const enabled = args[1] === 'on';
            const cfg = getRecording();
            if ((cfg.groupChat !== false) === enabled) await _send(cfg, `ℹ️ *Group Chat sudah ${enabled ? 'aktif' : 'nonaktif'} sebelumnya!*\n\n`);
            else { const n = { ...cfg, groupChat: enabled }; _saveRecording(n); await _send(n, `${enabled ? '✅' : '❌'} *Group Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}!*\n\n`); }
        } else {
            await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik \`${pref}recording\` untuk bantuan.`);
        }
        logCommand(m, hisoka, 'recording');
    } catch (error) {
        console.error('\x1b[31m[Recording] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

module.exports = { handleTyp, handleRecord };
