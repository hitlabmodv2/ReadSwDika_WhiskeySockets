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
 *  Menggunakan single_select button dengan section Mode + Interval preset
 * ───────────────────────────────
 */
'use strict';

// ── Preset interval (detik) ────────────────────────────────────────────────────
const _INTERVAL_PRESETS = [
    { sec: 10,  desc: 'Paling stabil — sedikit lebih boros'          },
    { sec: 15,  desc: 'Stabil — cocok untuk pemakaian normal'        },
    { sec: 30,  desc: '🔰 Default — seimbang antara stabil & hemat'  },
    { sec: 60,  desc: 'Hemat — masih cukup stabil'                   },
    { sec: 120, desc: 'Sangat hemat — cocok jika jarang dipakai'     },
    { sec: 300, desc: 'Paling hemat — kurang stabil, jarang refresh' },
];

// ── Helper bangun body status ──────────────────────────────────────────────────
function _buildBody(autoOnline, isJadibot, jadibotNum) {
    const enabled  = !!autoOnline.enabled;
    const interval = autoOnline.intervalSeconds || 30;
    const statusIcon = enabled ? '✅' : '🙈';
    const statusText = enabled ? 'ONLINE (terlihat online)' : 'OFFLINE (tersembunyi)';
    const jadibotNote = isJadibot ? `\n_⚙️ Setting jadibot +${jadibotNum}_` : '';
    const label = isJadibot ? 'AUTO ONLINE JADIBOT' : 'AUTO PRESENCE';

    return (
        `╭═══『 📡 *${label}* 』═══╮\n` +
        `│\n` +
        `│ ${statusIcon} *Status  :* ${statusText}\n` +
        `│ ⏱️ *Interval:* ${interval} detik\n` +
        `│\n` +
        `│ ℹ️ *Catatan:* Mode OFFLINE tetap\n` +
        `│ kirim status "unavailable" tiap\n` +
        `│ ${interval}s agar bot terus tersembunyi\n` +
        `│ walau WhatsApp dibuka di HP.\n` +
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

// ── Kirim selection button + fallback teks ─────────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, autoOnline) {
    if (Button) {
        let sent = false;
        try {
            const isMode   = (key) => (autoOnline.enabled ? 'on' : 'off') === key;
            const markMode = (key) => isMode(key) ? '✓ ' : '';

            const interval   = autoOnline.intervalSeconds || 30;
            const isPreset   = (p) => interval === p.sec;
            const markPreset = (p) => isPreset(p) ? '✓ ' : '';
            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Auto Online')
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Mode ───────────────────────────────────────
                .makeSections('⚙️ Mode')
                .makeRow(
                    markMode('on') + '✅ Online',
                    'Aktifkan Auto Online',
                    isMode('on')  ? activeDesc('Bot terlihat online terus') : 'Bot akan terlihat online terus',
                    `${pref}online on`
                )
                .makeRow(
                    markMode('off') + '🙈 Offline',
                    'Sembunyikan Status (Stealth)',
                    isMode('off') ? activeDesc('Bot tersembunyi/offline')  : 'Bot akan tersembunyi/offline',
                    `${pref}online off`
                )

                // ── Section 2: Interval ────────────────────────────────────
                .makeSections('⏱️ Interval Refresh');

            for (const p of _INTERVAL_PRESETS) {
                const aktif = isPreset(p);
                btn.makeRow(
                    markPreset(p) + `${p.sec} detik`,
                    `Interval ${p.sec} Detik`,
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

// ── Fallback teks biasa ────────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `${pref}online on — Terlihat online\n` +
        `${pref}online off — Terlihat offline\n` +
        `${pref}online set <10-300> — Atur interval (detik)`
    );
}

// ── Handler utama ──────────────────────────────────────────────────────────────
async function handleOnline({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoOnline, setJadibotUserSetting, startJadibotAutoOnline, Button }) {

        // ══════════════════ JADIBOT ══════════════════
        if (hisoka?.isMainBot === false) {
                const _sn = (m.sender || '').split('@')[0].split(':')[0];
                const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
                const _isJadibotUser = !!_jn && _sn === _jn;
                if (!m.isOwner && !_isJadibotUser) return;
                try {
                        const pref       = m.prefix || '.';
                        const jadibotNum = getJadibotNumber(hisoka);
                        const args       = query ? query.toLowerCase().split(' ') : [];

                        const getCfg = () => getJadibotAutoOnline(jadibotNum) || { enabled: false, intervalSeconds: 30 };

                        if (args.length === 0) {
                                const autoOnline = getCfg();
                                const bodyText   = _buildBody(autoOnline, true, jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, autoOnline);
                                logCommand(m, hisoka, 'online');
                                return;
                        }

                        const _notifSudahAktif = async (autoOnline, label) => {
                                const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody(autoOnline, true, jadibotNum);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, autoOnline);
                        };

                        if (args[0] === 'on') {
                                const autoOnline = getCfg();
                                if (autoOnline.enabled) {
                                        await _notifSudahAktif(autoOnline, 'Auto Online');
                                } else {
                                        const newCfg = { ...autoOnline, enabled: true };
                                        setJadibotUserSetting(jadibotNum, 'autoOnline', newCfg);
                                        startJadibotAutoOnline(hisoka, jadibotNum);
                                        const body = `✅ *Auto Online diaktifkan!*\n\n` + _buildBody(newCfg, true, jadibotNum);
                                        await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
                                }
                        } else if (args[0] === 'off') {
                                const autoOnline = getCfg();
                                if (!autoOnline.enabled) {
                                        await _notifSudahAktif(autoOnline, 'Mode Offline');
                                } else {
                                        const newCfg = { ...autoOnline, enabled: false };
                                        setJadibotUserSetting(jadibotNum, 'autoOnline', newCfg);
                                        startJadibotAutoOnline(hisoka, jadibotNum);
                                        const body = `🙈 *Auto Online dinonaktifkan! Mode stealth aktif*\n\n` + _buildBody(newCfg, true, jadibotNum);
                                        await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
                                }
                        } else if (args[0] === 'set' && args[1]) {
                                const seconds = parseInt(args[1]);
                                if (isNaN(seconds) || seconds < 10 || seconds > 300) {
                                        await tolak(hisoka, m, '❌ Interval harus antara 10-300 detik'); return;
                                }
                                const autoOnline = getCfg();
                                if (autoOnline.intervalSeconds === seconds) {
                                        await _notifSudahAktif(autoOnline, `Interval ${seconds} Detik`);
                                } else {
                                        const newCfg = { ...autoOnline, intervalSeconds: seconds };
                                        setJadibotUserSetting(jadibotNum, 'autoOnline', newCfg);
                                        if (newCfg.enabled) startJadibotAutoOnline(hisoka, jadibotNum);
                                        const body = `✅ *Interval diset ke ${seconds} detik*\n\n` + _buildBody(newCfg, true, jadibotNum);
                                        await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
                                }
                        } else {
                                await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik ${pref}online untuk bantuan.`);
                        }
                        logCommand(m, hisoka, 'online');
                } catch (error) {
                        console.error('\x1b[31m[Online-Jadibot] Error:\x1b[39m', error.message);
                        await tolak(hisoka, m, `Error: ${error.message}`);
                }
                return;
        }

        // ══════════════════ BOT UTAMA ══════════════════
        if (!m.isOwner) return;
        try {
                const pref = m.prefix || '.';
                const args = query ? query.toLowerCase().split(' ') : [];

                const getCfg = () => {
                        const config = loadConfig();
                        return config.autoOnline || { enabled: false, intervalSeconds: 30 };
                };

                if (args.length === 0) {
                        const autoOnline = getCfg();
                        const bodyText   = _buildBody(autoOnline, false, null);
                        await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, autoOnline);
                        logCommand(m, hisoka, 'online');
                        return;
                }

                const _notifSudahAktif = async (autoOnline, label) => {
                        const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody(autoOnline, false, null);
                        await _sendSelection(hisoka, m, Button, tolak, body, pref, autoOnline);
                };

                if (args[0] === 'on') {
                        const autoOnline = getCfg();
                        if (autoOnline.enabled) {
                                await _notifSudahAktif(autoOnline, 'Auto Online');
                        } else {
                                const config = loadConfig();
                                const newCfg = { ...autoOnline, enabled: true };
                                config.autoOnline = newCfg; saveConfig(config);
                                if (global.startAutoOnline) global.startAutoOnline();
                                else if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('available');
                                const body = `✅ *Auto Online diaktifkan!*\n\n` + _buildBody(newCfg, false, null);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
                        }
                } else if (args[0] === 'off') {
                        const autoOnline = getCfg();
                        if (!autoOnline.enabled) {
                                await _notifSudahAktif(autoOnline, 'Mode Offline');
                        } else {
                                const config = loadConfig();
                                const newCfg = { ...autoOnline, enabled: false };
                                config.autoOnline = newCfg; saveConfig(config);
                                if (global.startAutoOnline) global.startAutoOnline();
                                else {
                                        if (global.autoOnlineInterval) { clearInterval(global.autoOnlineInterval); global.autoOnlineInterval = null; }
                                        if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('unavailable');
                                }
                                console.log(`\x1b[33m[AutoOnline]\x1b[39m Switched to OFFLINE mode`);
                                const body = `🙈 *Auto Online dinonaktifkan! Mode stealth aktif*\n\n` + _buildBody(newCfg, false, null);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
                        }
                } else if (args[0] === 'set' && args[1]) {
                        const seconds = parseInt(args[1]);
                        if (isNaN(seconds) || seconds < 10 || seconds > 300) {
                                await tolak(hisoka, m, '❌ Interval harus antara 10-300 detik'); return;
                        }
                        const autoOnline = getCfg();
                        if (autoOnline.intervalSeconds === seconds) {
                                await _notifSudahAktif(autoOnline, `Interval ${seconds} Detik`);
                        } else {
                                const config = loadConfig();
                                const newCfg = { ...autoOnline, intervalSeconds: seconds };
                                config.autoOnline = newCfg; saveConfig(config);
                                let timerStatus = '';
                                if (newCfg.enabled) {
                                        if (global.startAutoOnline) { global.startAutoOnline(); timerStatus = ' (timer restarted)'; }
                                        else timerStatus = ' (akan aktif saat reconnect)';
                                }
                                const body = `✅ *Interval diset ke ${seconds} detik${timerStatus}*\n\n` + _buildBody(newCfg, false, null);
                                await _sendSelection(hisoka, m, Button, tolak, body, pref, newCfg);
                        }
                } else {
                        await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik ${pref}online untuk bantuan.`);
                }
                logCommand(m, hisoka, 'online');
        } catch (error) {
                console.error('\x1b[31m[Online] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports = { handleOnline };
