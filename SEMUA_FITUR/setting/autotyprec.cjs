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
 *  Menggunakan single_select button dengan section Mode + Delay + Target Chat
 * ───────────────────────────────
 */
'use strict';

// ── Preset delay (detik) — dipakai untuk typing & recording ───────────────────
const _DELAY_PRESETS = [
    { sec: 1,  desc: 'Sangat cepat — hampir instan'            },
    { sec: 3,  desc: 'Cepat'                                   },
    { sec: 5,  desc: '🔰 Default — natural, tidak terburu-buru' },
    { sec: 8,  desc: 'Sedang'                                  },
    { sec: 10, desc: 'Normal — terasa seperti mengetik manual' },
    { sec: 15, desc: 'Santai'                                  },
    { sec: 20, desc: 'Lambat'                                  },
    { sec: 30, desc: 'Sangat lambat'                            },
    { sec: 60, desc: 'Maksimal — paling lama'                  },
];

// ── Map: simpan key pesan terakhir per JID (terpisah untuk typing & recording) ─
const _lastMsgMapTyp = new Map();
const _lastMsgMapRec = new Map();

async function _deleteLastMsg(map, hisoka, jid) {
    const key = map.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    map.delete(jid);
}

// ── Helper bangun body status (dipakai sama untuk typing & recording) ─────────
function _buildBody(cfg, label, icon, isJadibot, jadibotNum) {
    const jadibotNote = isJadibot ? `\n_⚙️ Setting jadibot +${jadibotNum}_` : '';
    return (
        `╭═══『 ${icon} *AUTO ${label}* 』═══╮\n` +
        `│\n` +
        `│ ${cfg.enabled ? '✅' : '❌'} *Status      :* ${cfg.enabled ? 'Aktif' : 'Nonaktif'}\n` +
        `│ ⏱️ *Delay       :* ${cfg.delaySeconds || 5} detik\n` +
        `│ 💬 *Private Chat:* ${cfg.privateChat !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│ 👥 *Group Chat  :* ${cfg.groupChat !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
        `│\n` +
        `╰═════════════════════════╯` +
        jadibotNote
    );
}

// ── Kirim selection button + fallback teks (generik utk typing & recording) ───
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg, cmd, footerLabel, lastMsgMap) {
    if (Button) {
        let sent = false;
        try {
            const isMode   = (key) => (cfg.enabled ? 'on' : 'off') === key;
            const markMode = (key) => isMode(key) ? '✓ ' : '';

            const delay      = cfg.delaySeconds || 5;
            const isPreset    = (p) => delay === p.sec;
            const markPreset  = (p) => isPreset(p) ? '✓ ' : '';

            const isPrivate  = cfg.privateChat !== false;
            const isGroup    = cfg.groupChat !== false;
            const markBool   = (val, want) => val === want ? '✓ ' : '';
            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter(`⚡ Wily Bot • ${footerLabel}`)
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Mode ───────────────────────────────────────
                .makeSections('⚙️ Mode')
                .makeRow(
                    markMode('on') + '✅ Aktif',
                    `Aktifkan Auto ${footerLabel}`,
                    isMode('on')  ? activeDesc(`Bot otomatis ${footerLabel.toLowerCase()} sebelum balas`) : `Bot otomatis ${footerLabel.toLowerCase()} sebelum balas`,
                    `${pref}${cmd} on`
                )
                .makeRow(
                    markMode('off') + '❌ Nonaktif',
                    `Matikan Auto ${footerLabel}`,
                    isMode('off') ? activeDesc('Bot tidak menampilkan animasi') : 'Bot tidak menampilkan animasi',
                    `${pref}${cmd} off`
                )

                // ── Section 2: Delay ───────────────────────────────────────
                .makeSections('⏱️ Delay (Detik)');

            for (const p of _DELAY_PRESETS) {
                const aktif = isPreset(p);
                btn.makeRow(
                    markPreset(p) + `${p.sec} detik`,
                    `Delay ${p.sec} Detik`,
                    aktif ? activeDesc(p.desc) : p.desc,
                    `${pref}${cmd} set ${p.sec}`
                );
            }

            // ── Section 3: Target Chat ─────────────────────────────────────
            btn.makeSections('🎯 Target Chat')
                .makeRow(
                    markBool(isPrivate, true) + '💬 Private Chat: Aktif',
                    'Aktifkan di Private Chat',
                    isPrivate ? activeDesc('Berlaku di chat pribadi') : 'Aktifkan animasi di chat pribadi',
                    `${pref}${cmd} private on`
                )
                .makeRow(
                    markBool(isPrivate, false) + '💬 Private Chat: Nonaktif',
                    'Matikan di Private Chat',
                    !isPrivate ? activeDesc('Tidak berlaku di chat pribadi') : 'Matikan animasi di chat pribadi',
                    `${pref}${cmd} private off`
                )
                .makeRow(
                    markBool(isGroup, true) + '👥 Group Chat: Aktif',
                    'Aktifkan di Group Chat',
                    isGroup ? activeDesc('Berlaku di grup') : 'Aktifkan animasi di grup',
                    `${pref}${cmd} group on`
                )
                .makeRow(
                    markBool(isGroup, false) + '👥 Group Chat: Nonaktif',
                    'Matikan di Group Chat',
                    !isGroup ? activeDesc('Tidak berlaku di grup') : 'Matikan animasi di grup',
                    `${pref}${cmd} group off`
                );

            // ── Auto-delete pesan sebelumnya → kirim baru → simpan key ───
            await _deleteLastMsg(lastMsgMap, hisoka, m.from);
            const result = await btn.run(m.from, hisoka, m);
            if (result?.key) lastMsgMap.set(m.from, result.key);
            sent = true;
        } catch (_) {}
        if (!sent) await _sendFallback(tolak, hisoka, m, bodyText, pref, cmd);
    } else {
        await _sendFallback(tolak, hisoka, m, bodyText, pref, cmd);
    }
}

// ── Fallback teks biasa ────────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref, cmd) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `${pref}${cmd} on — Aktifkan\n` +
        `${pref}${cmd} off — Nonaktifkan\n` +
        `${pref}${cmd} set <1-60> — Atur delay (detik)\n` +
        `${pref}${cmd} private on/off — Toggle private chat\n` +
        `${pref}${cmd} group on/off — Toggle group chat`
    );
}

// ══════════════════════════════ AUTO TYPING ═══════════════════════════════════
async function handleTyp({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoTyping, setJadibotUserSetting, Button }) {
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const pref        = m.prefix || '.';
                const _isJadibot  = hisoka?.isMainBot === false;
                const _jadibotNum = _isJadibot ? getJadibotNumber(hisoka) : null;

                const getTyping = () => _isJadibot
                        ? (getJadibotAutoTyping(_jadibotNum) || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true })
                        : (loadConfig().autoTyping || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true });

                const _saveTyping = (newVal) => {
                        if (_isJadibot) setJadibotUserSetting(_jadibotNum, 'autoTyping', newVal);
                        else { const cfg = loadConfig(); cfg.autoTyping = newVal; saveConfig(cfg); }
                };

                const args = query ? query.toLowerCase().split(' ') : [];

                const _show = async (cfg) => {
                        const bodyText = _buildBody(cfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                        await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                };

                const _notifSudahAktif = async (cfg, label) => {
                        const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody(cfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                        await _sendSelection(hisoka, m, Button, tolak, body, pref, cfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                };

                if (args.length === 0) {
                        await _show(getTyping());
                        logCommand(m, hisoka, 'typing');
                        return;
                }

                if (args[0] === 'on') {
                        const cfg = getTyping();
                        if (cfg.enabled) { await _notifSudahAktif(cfg, 'Auto Typing'); }
                        else {
                                const newCfg = { ...cfg, enabled: true };
                                _saveTyping(newCfg);
                                const body = `✅ *Auto Typing diaktifkan!*\n\n` + _buildBody(newCfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                        }
                } else if (args[0] === 'off') {
                        const cfg = getTyping();
                        if (!cfg.enabled) { await _notifSudahAktif(cfg, 'Mode Nonaktif'); }
                        else {
                                const newCfg = { ...cfg, enabled: false };
                                _saveTyping(newCfg);
                                const body = `❌ *Auto Typing dinonaktifkan!*\n\n` + _buildBody(newCfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                        }
                } else if (args[0] === 'set' && args[1]) {
                        const seconds = parseInt(args[1]);
                        if (isNaN(seconds) || seconds < 1 || seconds > 60) { await tolak(hisoka, m, '❌ Delay harus antara 1-60 detik'); return; }
                        const cfg = getTyping();
                        if (cfg.delaySeconds === seconds) { await _notifSudahAktif(cfg, `Delay ${seconds} Detik`); }
                        else {
                                const newCfg = { ...cfg, delaySeconds: seconds };
                                _saveTyping(newCfg);
                                const body = `✅ *Delay Auto Typing diset ke ${seconds} detik*\n\n` + _buildBody(newCfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                        }
                } else if (args[0] === 'private' && args[1]) {
                        const enabled = args[1] === 'on';
                        const cfg = getTyping();
                        if (cfg.privateChat === enabled) { await _notifSudahAktif(cfg, `Private Chat ${enabled ? 'Aktif' : 'Nonaktif'}`); }
                        else {
                                const newCfg = { ...cfg, privateChat: enabled };
                                _saveTyping(newCfg);
                                const body = `${enabled ? '✅' : '❌'} *Auto Typing untuk Private Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}*\n\n` + _buildBody(newCfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                        }
                } else if (args[0] === 'group' && args[1]) {
                        const enabled = args[1] === 'on';
                        const cfg = getTyping();
                        if (cfg.groupChat === enabled) { await _notifSudahAktif(cfg, `Group Chat ${enabled ? 'Aktif' : 'Nonaktif'}`); }
                        else {
                                const newCfg = { ...cfg, groupChat: enabled };
                                _saveTyping(newCfg);
                                const body = `${enabled ? '✅' : '❌'} *Auto Typing untuk Group Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}*\n\n` + _buildBody(newCfg, 'TYPING', '⌨️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'typing', 'Auto Typing', _lastMsgMapTyp);
                        }
                } else {
                        await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik ${pref}typing untuk bantuan.`);
                }
                logCommand(m, hisoka, 'typing');
        } catch (error) {
                console.error('\x1b[31m[Typing] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

// ══════════════════════════════ AUTO RECORDING ════════════════════════════════
async function handleRecord({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoRecording, setJadibotUserSetting, Button }) {
        if (!m.isOwner && hisoka?.isMainBot !== false) return;
        try {
                const pref        = m.prefix || '.';
                const _isJadibot  = hisoka?.isMainBot === false;
                const _jadibotNum = _isJadibot ? getJadibotNumber(hisoka) : null;

                const getRecording = () => _isJadibot
                        ? (getJadibotAutoRecording(_jadibotNum) || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true })
                        : (loadConfig().autoRecording || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true });

                const _saveRecording = (newVal) => {
                        if (_isJadibot) setJadibotUserSetting(_jadibotNum, 'autoRecording', newVal);
                        else { const cfg = loadConfig(); cfg.autoRecording = newVal; saveConfig(cfg); }
                };

                const args = query ? query.toLowerCase().split(' ') : [];

                const _show = async (cfg) => {
                        const bodyText = _buildBody(cfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                        await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, cfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                };

                const _notifSudahAktif = async (cfg, label) => {
                        const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody(cfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                        await _sendSelection(hisoka, m, Button, tolak, body, pref, cfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                };

                if (args.length === 0) {
                        await _show(getRecording());
                        logCommand(m, hisoka, 'recording');
                        return;
                }

                if (args[0] === 'on') {
                        const cfg = getRecording();
                        if (cfg.enabled) { await _notifSudahAktif(cfg, 'Auto Recording'); }
                        else {
                                const newCfg = { ...cfg, enabled: true };
                                _saveRecording(newCfg);
                                const body = `✅ *Auto Recording diaktifkan!*\n\n` + _buildBody(newCfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                        }
                } else if (args[0] === 'off') {
                        const cfg = getRecording();
                        if (!cfg.enabled) { await _notifSudahAktif(cfg, 'Mode Nonaktif'); }
                        else {
                                const newCfg = { ...cfg, enabled: false };
                                _saveRecording(newCfg);
                                const body = `❌ *Auto Recording dinonaktifkan!*\n\n` + _buildBody(newCfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                        }
                } else if (args[0] === 'set' && args[1]) {
                        const seconds = parseInt(args[1]);
                        if (isNaN(seconds) || seconds < 1 || seconds > 60) { await tolak(hisoka, m, '❌ Delay harus antara 1-60 detik'); return; }
                        const cfg = getRecording();
                        if (cfg.delaySeconds === seconds) { await _notifSudahAktif(cfg, `Delay ${seconds} Detik`); }
                        else {
                                const newCfg = { ...cfg, delaySeconds: seconds };
                                _saveRecording(newCfg);
                                const body = `✅ *Delay Auto Recording diset ke ${seconds} detik*\n\n` + _buildBody(newCfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                        }
                } else if (args[0] === 'private' && args[1]) {
                        const enabled = args[1] === 'on';
                        const cfg = getRecording();
                        if (cfg.privateChat === enabled) { await _notifSudahAktif(cfg, `Private Chat ${enabled ? 'Aktif' : 'Nonaktif'}`); }
                        else {
                                const newCfg = { ...cfg, privateChat: enabled };
                                _saveRecording(newCfg);
                                const body = `${enabled ? '✅' : '❌'} *Auto Recording untuk Private Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}*\n\n` + _buildBody(newCfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                        }
                } else if (args[0] === 'group' && args[1]) {
                        const enabled = args[1] === 'on';
                        const cfg = getRecording();
                        if (cfg.groupChat === enabled) { await _notifSudahAktif(cfg, `Group Chat ${enabled ? 'Aktif' : 'Nonaktif'}`); }
                        else {
                                const newCfg = { ...cfg, groupChat: enabled };
                                _saveRecording(newCfg);
                                const body = `${enabled ? '✅' : '❌'} *Auto Recording untuk Group Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}*\n\n` + _buildBody(newCfg, 'RECORDING', '🎙️', _isJadibot, _jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg, 'recording', 'Auto Recording', _lastMsgMapRec);
                        }
                } else {
                        await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik ${pref}recording untuk bantuan.`);
                }
                logCommand(m, hisoka, 'recording');
        } catch (error) {
                console.error('\x1b[31m[Recording] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports = { handleTyp, handleRecord };
