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
 *  Perintah .online untuk aktifkan status online sementara lalu otomatis offline
 *  Menggunakan single_select button dengan 5 section: Mode, Detik, Menit, Jam, Hari
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

const _MIN_DURATION_SECONDS = 5;
const _MAX_DURATION_SECONDS = 7 * 24 * 60 * 60;

// ── Preset durasi: tiap unit punya section sendiri di single-select ──────────
const _DURATION_SECTIONS = [
    {
        title: '⏱️ Durasi Detik',
        unit: 's',
        options: [
            { value: 5,  desc: 'Online sebentar lalu otomatis offline' },
            { value: 10, desc: 'Online singkat lalu otomatis offline' },
            { value: 30, desc: '🔰 Default — seimbang dan stabil' },
        ],
    },
    {
        title: '⏱️ Durasi Menit',
        unit: 'm',
        options: [
            { value: 1,  desc: 'Online selama 1 menit' },
            { value: 5,  desc: 'Online selama 5 menit' },
            { value: 10, desc: 'Online selama 10 menit' },
        ],
    },
    {
        title: '⏱️ Durasi Jam',
        unit: 'h',
        options: [
            { value: 1,  desc: 'Online selama 1 jam' },
            { value: 6,  desc: 'Online selama 6 jam' },
            { value: 12, desc: 'Online selama 12 jam' },
        ],
    },
    {
        title: '⏱️ Durasi Hari',
        unit: 'd',
        options: [
            { value: 1, desc: 'Online selama 1 hari' },
            { value: 3, desc: 'Online selama 3 hari' },
            { value: 7, desc: 'Online selama 7 hari' },
        ],
    },
];

function _durationSeconds(autoOnline) {
    const value = Number(autoOnline?.durationSeconds ?? autoOnline?.intervalSeconds ?? 30);
    return Number.isFinite(value) && value >= _MIN_DURATION_SECONDS
        ? Math.min(Math.floor(value), _MAX_DURATION_SECONDS)
        : 30;
}

function _formatDuration(totalSeconds) {
    let remaining = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const parts = [];
    if (days) parts.push(`${days} hari`);
    if (hours) parts.push(`${hours} jam`);
    if (minutes) parts.push(`${minutes} menit`);
    if (seconds || !parts.length) parts.push(`${seconds} detik`);
    return parts.join(' ');
}

function _parseDuration(raw) {
    const match = String(raw || '').trim().toLowerCase()
        .match(/^(\d+)(s|sec|secs|detik|m|min|mins|menit|h|hr|hrs|jam|d|day|days|hari)?$/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    const unit = match[2] || 's';
    const multiplier = /^(m|min|mins|menit)$/.test(unit)
        ? 60
        : /^(h|hr|hrs|jam)$/.test(unit)
            ? 3600
            : /^(d|day|days|hari)$/.test(unit)
                ? 86400
                : 1;
    const seconds = amount * multiplier;
    return seconds >= _MIN_DURATION_SECONDS && seconds <= _MAX_DURATION_SECONDS ? seconds : null;
}

// ── Helper bangun body status ────────────────────────────────────────────────
function _buildBody({ isJadibot, jadibotNum, autoOnline, running }) {
    const statusIcon = autoOnline.enabled ? '✅' : '🙈';
    const statusText = autoOnline.enabled ? '*Online* (akan otomatis offline)' : '*Offline* (siap online)';
    const duration    = _durationSeconds(autoOnline);
    const jadibotNote = isJadibot ? `\n> ⚙️ _Setting khusus jadibot +${jadibotNum}_` : '';

    return (
        `╭═══『 🟢 ${_fancy(`AUTO ONLINE${isJadibot ? ' JADIBOT' : ''}`)} 』═══╮\n` +
        `│\n` +
        `│ ${statusIcon} *Status   :* ${statusText}\n` +
        `│ ⏱️ *Durasi   :* \`${_formatDuration(duration)}\`\n` +
        (isJadibot ? '' : `│ 🔄 *Running :* ${running ? '✅ Ya' : '❌ Tidak'}\n`) +
        `│\n` +
        `│ ℹ️ _Mode Online: kontak bisa lihat online_\n` +
        `│ _realtime. Mode Stealth: kontak tidak_\n` +
        `│ _bisa lihat online realtime, tapi_\n` +
        `│ _Perangkat Tertaut tetap "Aktif"._\n` +
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
                    markMode('off') + '🙈 Stealth',
                    _fancy('Mode Stealth'),
                    isMode('off') ? activeDesc('Kontak tidak bisa lihat online, Perangkat Tertaut tetap Aktif') : 'Kontak tidak bisa lihat online, Perangkat Tertaut tetap Aktif',
                    `${pref}online off`
                )

                // ── Section 2-5: Durasi per satuan waktu ────────────────
                for (const section of _DURATION_SECTIONS) {
                    btn.makeSections(_fancy(section.title));
                    for (const option of section.options) {
                        const seconds = option.value * (
                            section.unit === 'm' ? 60
                                : section.unit === 'h' ? 3600
                                    : section.unit === 'd' ? 86400 : 1
                        );
                        const aktif = _durationSeconds(autoOnline) === seconds;
                        btn.makeRow(
                            (aktif ? '✓ ' : '') + `${option.value} ${section.unit === 's' ? 'detik' : section.unit === 'm' ? 'menit' : section.unit === 'h' ? 'jam' : 'hari'}`,
                            _fancy(`Online ${_formatDuration(seconds)}`),
                            aktif ? activeDesc(`${_formatDuration(seconds)}, lalu otomatis offline`) : option.desc,
                            `${pref}online set ${option.value}${section.unit}`
                        );
                    }
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
        `3. \`${pref}online set <durasi>\` — Online lalu otomatis offline\n` +
        `   _Contoh: \`${pref}online set 30s\`, \`${pref}online set 5m\`, \`${pref}online set 2h\`, \`${pref}online set 1d\`_\n\n` +
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
            const getAO = () => getJadibotAutoOnline(jadibotNum) || { enabled: false, durationSeconds: 30 };

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
                    const newAO = { ...autoOnline, enabled: true, startedAt: Date.now() };
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
                    const newAO = { ...autoOnline, enabled: false, startedAt: null };
                    setJadibotUserSetting(jadibotNum, 'autoOnline', newAO);
                    startJadibotAutoOnline(hisoka, jadibotNum);
                    const body = `🙈 *Dinonaktifkan! Mode Stealth Aktif*\n\n` + _buildBody({ isJadibot: true, jadibotNum, autoOnline: newAO });
                    await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
                }
            } else if (args[0] === 'set' && args[1]) {
                const seconds = _parseDuration(args[1]);
                if (!seconds) {
                    await tolak(hisoka, m, '❌ Durasi tidak valid. Gunakan *5 detik sampai 7 hari*, contoh: `30s`, `5m`, `2h`, `1d`'); return;
                }
                const autoOnline = getAO();
                if (_durationSeconds(autoOnline) === seconds) {
                    await _notifSudahAktif(autoOnline, `Durasi ${_formatDuration(seconds)}`);
                } else {
                    const newAO = { ...autoOnline, durationSeconds: seconds, intervalSeconds: seconds, startedAt: autoOnline.enabled ? Date.now() : null };
                    setJadibotUserSetting(jadibotNum, 'autoOnline', newAO);
                    if (newAO.enabled) startJadibotAutoOnline(hisoka, jadibotNum);
                    const body = `✅ *Durasi diset ke ${_formatDuration(seconds)}*\n\n` + _buildBody({ isJadibot: true, jadibotNum, autoOnline: newAO });
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

        const getAOMain = () => loadConfig().autoOnline || { enabled: false, durationSeconds: 30 };
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
                const newAO = { ...autoOnline, enabled: true, startedAt: Date.now() };
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
                const newAO = { ...autoOnline, enabled: false, startedAt: null };
                saveAOMain(newAO);
                if (global.startAutoOnline) {
                    global.startAutoOnline();
                } else {
                    // hanya stop interval — tidak kirim unavailable agar bot tetap
                    // terlihat aktif di daftar Perangkat Tertaut WhatsApp
                    if (global.autoOnlineInterval) { clearInterval(global.autoOnlineInterval); global.autoOnlineInterval = null; }
                }
                console.log(`\x1b[33m[AutoOnline]\x1b[39m Switched to OFFLINE mode`);
                const body = `🙈 *Dinonaktifkan! Mode Stealth Aktif*\n\n` + _buildBody({ isJadibot: false, autoOnline: newAO, running: isRunning() });
                await _sendSelection(hisoka, m, Button, tolak, body, pref, newAO);
            }
        } else if (args[0] === 'set' && args[1]) {
            const seconds = _parseDuration(args[1]);
            if (!seconds) {
                await tolak(hisoka, m, '❌ Durasi tidak valid. Gunakan *5 detik sampai 7 hari*, contoh: `30s`, `5m`, `2h`, `1d`'); return;
            }
            const autoOnline = getAOMain();
            if (_durationSeconds(autoOnline) === seconds) {
                await _notifSudahAktifMain(autoOnline, `Durasi ${_formatDuration(seconds)}`);
            } else {
                const newAO = { ...autoOnline, durationSeconds: seconds, intervalSeconds: seconds, startedAt: autoOnline.enabled ? Date.now() : null };
                saveAOMain(newAO);
                if (newAO.enabled && global.startAutoOnline) global.startAutoOnline();
                const body = `✅ *Durasi diset ke ${_formatDuration(seconds)}*\n\n` + _buildBody({ isJadibot: false, autoOnline: newAO, running: isRunning() });
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
