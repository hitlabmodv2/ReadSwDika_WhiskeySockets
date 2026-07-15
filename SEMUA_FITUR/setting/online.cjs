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
 *  online.cjs — Auto online command handler
 *  Perintah .online untuk aktifkan/nonaktifkan status kehadiran selalu online
 *  Menggunakan single_select button dengan section Mode + Interval 10-300 detik
 * ───────────────────────────────
 */
'use strict';

// ── Helper: font keren (pinjam style "Bold Sans" dari fontgenerator.cjs) ───────
//    Dipakai untuk judul/section/label statis di dalam button — konsisten,
//    tetap mudah dibaca, dan tidak menyentuh angka/emoji/tanda ✓ yang dinamis.
let _fancyFontFn = null;
function _fancy(text) {
    try {
        if (!_fancyFontFn) {
            const { FONTS } = require('../tools/fontgenerator.cjs');
            const style = FONTS.find(f => f.name === 'Bold Sans');
            _fancyFontFn = style ? style.fn : (t => t);
        }
        return _fancyFontFn(text);
    } catch (_) {
        return text;
    }
}

// ── Preset interval populer ─────────────────────────────────────────────────
const _INTERVAL_PRESETS = [
    { sec: 10,  desc: 'Paling sering — sangat stabil, agak boros' },
    { sec: 30,  desc: '🔰 Default — seimbang, aman dan stabil' },
    { sec: 60,  desc: 'Cukup jarang — hemat, tetap stabil' },
    { sec: 120, desc: 'Jarang — hemat resource' },
    { sec: 300, desc: 'Paling jarang — paling hemat' },
];

// ── Helper bangun body status ────────────────────────────────────────────────
function _buildBody({ isJadibot, jadibotNum, autoOnline, running }) {
    const statusIcon = autoOnline.enabled ? '✅' : '🙈';
    const statusText = autoOnline.enabled ? '*Online* (terlihat online)' : '*Offline* (tersembunyi/stealth)';
    const interval    = autoOnline.intervalSeconds || 30;
    const jadibotNote = isJadibot ? `\n> ⚙️ _Setting khusus jadibot +${jadibotNum}_` : '';

    return (
        `╭═══『 🟢 ${_fancy(`AUTO ONLINE${isJadibot ? ' JADIBOT' : ''}`)} 』═══╮\n` +
        `│\n` +
        `│ ${statusIcon} *Status   :* ${statusText}\n` +
        `│ ⏱️ *Interval :* \`${interval} detik\`\n` +
        (isJadibot ? '' : `│ 🔄 *Running :* ${running ? '✅ Ya' : '❌ Tidak'}\n`) +
        `│\n` +
        `│ ℹ️ _Mode Online membuat bot terlihat_\n` +
        `│ _"online" terus di WhatsApp. Mode_\n` +
        `│ _Offline mengirim status "unavailable"_\n` +
        `│ _berkala agar tetap tersembunyi._\n` +
        `│\n` +
        `╰═════════════════════════╯` +
        jadibotNote
    );
}

// ── Map: simpan key pesan terakhir per JID untuk auto-delete ────────────────
const _lastMsgMap = new Map();

async function _deleteLastMsg(hisoka, jid) {
    const key = _lastMsgMap.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    _lastMsgMap.delete(jid);
}

// ── Kirim selection button + fallback teks ──────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, autoOnline) {
    if (Button) {
        let sent = false;
        try {
            const isMode   = (key) => (key === 'on' ? autoOnline.enabled : !autoOnline.enabled);
            const markMode = (key) => isMode(key) ? '✓ ' : '';
            const isPreset = (sec) => (autoOnline.intervalSeconds || 30) === sec;
            const markInt  = (sec) => isPreset(sec) ? '✓ ' : '';
            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter(`⚡ ${_fancy('Wily Bot')} • Auto Online`)
                .addSelection(`🎛️ ${_fancy('Pilih Pengaturan')}`)

                // ── Section 1: Mode ──────────────────────────────────────
                .makeSections(`⚙️ ${_fancy('Mode Kehadiran')}`)
                .makeRow(
                    markMode('on') + '✅ Online',
                    _fancy('Terlihat Online'),
                    isMode('on')  ? activeDesc('Bot selalu terlihat online') : 'Bot selalu terlihat online',
                    `${pref}online on`
                )
                .makeRow(
                    markMode('off') + '🙈 Offline',
                    _fancy('Mode Stealth'),
                    isMode('off') ? activeDesc('Bot tersembunyi/tidak terlihat online') : 'Bot tersembunyi/tidak terlihat online',
                    `${pref}online off`
                )

                // ── Section 2: Interval populer ──────────────────────────
                .makeSections(`⏱️ ${_fancy('Interval Populer')}`);

            for (const p of _INTERVAL_PRESETS) {
                const aktif = isPreset(p.sec);
                btn.makeRow(
                    markInt(p.sec) + `${p.sec} detik`,
                    _fancy(`Set Interval ${p.sec} Detik`),
                    aktif ? activeDesc(p.desc) : p.desc,
                    `${pref}online set ${p.sec}`
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

// ── Fallback teks biasa (format WA: bold, monospace, list, quote) ───────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `1. \`${pref}online on\` — Terlihat online\n` +
        `2. \`${pref}online off\` — Terlihat offline (stealth)\n` +
        `3. \`${pref}online set <detik>\` — Atur interval kirim ulang\n` +
        `   _(10-300 detik, makin kecil makin stabil tapi lebih boros)_\n\n` +
        `> 💡 _Tips: pakai tombol di atas biar lebih_\n` +
        `> _cepat & tidak salah ketik perintah._`
    );
}

// ── Handler utama ────────────────────────────────────────────────────────────
async function handleOnline({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoOnline, setJadibotUserSetting, startJadibotAutoOnline, Button }) {
    const isJadibot = hisoka?.isMainBot === false;

    try {
        const pref = m.prefix || '.';
        const args = query ? query.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];

        // ═══════════════════════════ MODE JADIBOT ═══════════════════════════
        if (isJadibot) {
            const _sn = (m.sender || '').split('@')[0].split(':')[0];
            const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
            const _isJadibotUser = !!_jn && _sn === _jn;
            if (!m.isOwner && !_isJadibotUser) return;

            const jadibotNum = getJadibotNumber(hisoka);
            const getAO = () => getJadibotAutoOnline(jadibotNum) || { enabled: false, intervalSeconds: 30 };

            // ── Tanpa argumen → status + selection button ────────────────
            if (args.length === 0) {
                const autoOnline = getAO();
                const bodyText   = _buildBody({ isJadibot: true, jadibotNum, autoOnline });
                await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, autoOnline);
                logCommand(m, hisoka, 'online');
                return;
            }

            const _notifSudahAktif = async (autoOnline, label) => {
                const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody({ isJadibot: true, jadibotNum, autoOnline });
                await _sendSelection(hisoka, m, Button, tolak, body, pref, autoOnline);
            };

            if (args[0] === 'on') {
                const autoOnline = getAO();
                if (autoOnline.enabled) {
                    await _notifSudahAktif(autoOnline, 'Mode Online');
                } else {
                    const newAO = { ...autoOnline, enabled: true };
                    setJadibotUserSetting(jadibotNum, 'autoOnline', newAO);
                    startJadibotAutoOnline(hisoka, jadibotNum);
                    const body = `✅ *Diaktifkan! Terlihat Online*\n\n` + _buildBody({ isJadibot: true, jadibotNum, autoOnline: newAO });
                    await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
                }
            } else if (args[0] === 'off') {
                const autoOnline = getAO();
                if (!autoOnline.enabled) {
                    await _notifSudahAktif(autoOnline, 'Mode Offline');
                } else {
                    const newAO = { ...autoOnline, enabled: false };
                    setJadibotUserSetting(jadibotNum, 'autoOnline', newAO);
                    startJadibotAutoOnline(hisoka, jadibotNum);
                    const body = `🙈 *Dinonaktifkan! Mode Stealth Aktif*\n\n` + _buildBody({ isJadibot: true, jadibotNum, autoOnline: newAO });
                    await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
                }
            } else if (args[0] === 'set' && args[1]) {
                const seconds = parseInt(args[1]);
                if (isNaN(seconds) || seconds < 10 || seconds > 300) {
                    await tolak(hisoka, m, '❌ Interval harus antara *10-300 detik*'); return;
                }
                const autoOnline = getAO();
                if (autoOnline.intervalSeconds === seconds) {
                    await _notifSudahAktif(autoOnline, `Interval ${seconds} Detik`);
                } else {
                    const newAO = { ...autoOnline, intervalSeconds: seconds };
                    setJadibotUserSetting(jadibotNum, 'autoOnline', newAO);
                    if (newAO.enabled) startJadibotAutoOnline(hisoka, jadibotNum);
                    const body = `✅ *Interval diset ke ${seconds} detik*\n\n` + _buildBody({ isJadibot: true, jadibotNum, autoOnline: newAO });
                    await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
                }
            } else {
                await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik \`${pref}online\` untuk bantuan.`);
            }

            logCommand(m, hisoka, 'online');
            return;
        }

        // ═══════════════════════════ MODE BOT UTAMA ═════════════════════════
        if (!m.isOwner) return;

        const getAOMain = () => loadConfig().autoOnline || { enabled: false, intervalSeconds: 30 };
        const saveAOMain = (newVal) => { const cfg = loadConfig(); cfg.autoOnline = newVal; saveConfig(cfg); };
        const isRunning  = () => !!global.autoOnlineInterval;

        // ── Tanpa argumen → status + selection button ────────────────────
        if (args.length === 0) {
            const autoOnline = getAOMain();
            const bodyText   = _buildBody({ isJadibot: false, autoOnline, running: isRunning() });
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, autoOnline);
            logCommand(m, hisoka, 'online');
            return;
        }

        const _notifSudahAktifMain = async (autoOnline, label) => {
            const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody({ isJadibot: false, autoOnline, running: isRunning() });
            await _sendSelection(hisoka, m, Button, tolak, body, pref, autoOnline);
        };

        if (args[0] === 'on') {
            const autoOnline = getAOMain();
            if (autoOnline.enabled) {
                await _notifSudahAktifMain(autoOnline, 'Mode Online');
            } else {
                const newAO = { ...autoOnline, enabled: true };
                saveAOMain(newAO);
                if (global.startAutoOnline) global.startAutoOnline();
                else if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('available');
                const body = `✅ *Diaktifkan! Terlihat Online*\n\n` + _buildBody({ isJadibot: false, autoOnline: newAO, running: isRunning() });
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
            }
        } else if (args[0] === 'off') {
            const autoOnline = getAOMain();
            if (!autoOnline.enabled) {
                await _notifSudahAktifMain(autoOnline, 'Mode Offline');
            } else {
                const newAO = { ...autoOnline, enabled: false };
                saveAOMain(newAO);
                if (global.startAutoOnline) {
                    global.startAutoOnline();
                } else {
                    if (global.autoOnlineInterval) { clearInterval(global.autoOnlineInterval); global.autoOnlineInterval = null; }
                    if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('unavailable');
                }
                console.log(`\x1b[33m[AutoOnline]\x1b[39m Switched to OFFLINE mode`);
                const body = `🙈 *Dinonaktifkan! Mode Stealth Aktif*\n\n` + _buildBody({ isJadibot: false, autoOnline: newAO, running: isRunning() });
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
            }
        } else if (args[0] === 'set' && args[1]) {
            const seconds = parseInt(args[1]);
            if (isNaN(seconds) || seconds < 10 || seconds > 300) {
                await tolak(hisoka, m, '❌ Interval harus antara *10-300 detik*'); return;
            }
            const autoOnline = getAOMain();
            if (autoOnline.intervalSeconds === seconds) {
                await _notifSudahAktifMain(autoOnline, `Interval ${seconds} Detik`);
            } else {
                const newAO = { ...autoOnline, intervalSeconds: seconds };
                saveAOMain(newAO);
                if (newAO.enabled && global.startAutoOnline) global.startAutoOnline();
                const body = `✅ *Interval diset ke ${seconds} detik*\n\n` + _buildBody({ isJadibot: false, autoOnline: newAO, running: isRunning() });
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
            }
        } else {
            await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik \`${pref}online\` untuk bantuan.`);
        }

        logCommand(m, hisoka, 'online');

    } catch (error) {
        console.error('\x1b[31m[Online] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

module.exports = { handleOnline };
