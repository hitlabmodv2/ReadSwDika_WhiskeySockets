/**
 * ───────────────────────────────
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
 *  diskram.cjs — Monitor RAM & Disk command handler
 *  Perintah .ramdisk / .diskram untuk kelola monitor RAM + Disk
 *  Menggunakan single_select button dengan section Status + RAM + Disk
 * ───────────────────────────────
 */
'use strict';

// ── Helper: ambil config DisRam dari config.json ───────────────────────────────
function _getDr(loadConfig) {
    const cfg = loadConfig();
    return cfg?.monitor?.DisRam || {};
}

// ── Helper: simpan perubahan ke config.json → monitor.DisRam ─────────────────
function _saveDr(loadConfig, saveConfig, patch) {
    const cfg = loadConfig();
    if (!cfg.monitor) cfg.monitor = {};
    if (!cfg.monitor.DisRam) cfg.monitor.DisRam = {};
    Object.assign(cfg.monitor.DisRam, patch);
    saveConfig(cfg);
}

// ── Helper: label status ──────────────────────────────────────────────────────
function _statusLabel(ramOn, diskOn) {
    if (ramOn && diskOn)  return '✅ Aktif Semua (RAM + Disk)';
    if (ramOn)            return '🧠 RAM Only';
    if (diskOn)           return '💾 Disk Only';
    return '❌ Nonaktif';
}

// ── Helper: bangun body status ────────────────────────────────────────────────
function _buildBody(dr) {
    const ramOn  = dr.ramEnabled  === true;
    const diskOn = dr.diskEnabled === true;

    const ramLimit  = dr.ramAutoDetect === true
        ? `Auto Detect (${dr.ramAutoDetectPercent ?? 85}%)`
        : `${dr.ramLimitMB ?? 8192} MB`;
    const diskLimit = `${dr.diskLimitMB ?? 10240} MB`;
    const diskWarn  = `${dr.diskWarnPercent ?? 80}%`;

    return (
        `╭═══『 🖥️ *MONITOR RAM & DISK* 』═══╮\n` +
        `│\n` +
        `│ ⚡ *Status   :* ${_statusLabel(ramOn, diskOn)}\n` +
        `│\n` +
        `│ 🧠 *RAM Monitor*\n` +
        `│   ${ramOn ? '✅' : '❌'} ${ramOn ? 'Aktif' : 'Nonaktif'} — Limit: ${ramLimit}\n` +
        `│   ⏱️ Check: ${(dr.ramCheckIntervalMs ?? 30000) / 1000}s\n` +
        `│\n` +
        `│ 💾 *Disk Monitor*\n` +
        `│   ${diskOn ? '✅' : '❌'} ${diskOn ? 'Aktif' : 'Nonaktif'} — Limit: ${diskLimit}\n` +
        `│   ⚠️ Warn: ${diskWarn}\n` +
        `│   ⏱️ Check: ${(dr.diskCheckIntervalMs ?? 300000) / 1000}s\n` +
        `│\n` +
        `╰══════════════════════════════╯`
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

// ── Kirim selection button ─────────────────────────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, dr) {
    if (Button) {
        let sent = false;
        try {
            const ramOn  = dr.ramEnabled  === true;
            const diskOn = dr.diskEnabled === true;

            // ── tanda ✓ status aktif ─────────────────────────────────────────
            const modeKey = ramOn && diskOn ? 'all' : ramOn ? 'ram' : diskOn ? 'disk' : 'off';
            const markM   = (k) => k === modeKey ? '✓ ' : '';

            // ── tanda ✓ RAM autodetect ───────────────────────────────────────
            const autoDetect = dr.ramAutoDetect === true;
            const markAD  = (v) => (v === autoDetect) ? '✓ ' : '';

            // ── tanda ✓ RAM limit manual ─────────────────────────────────────
            const curRamMB  = dr.ramLimitMB ?? 8192;
            const markRL    = (mb) => (!autoDetect && curRamMB === mb) ? '✓ ' : '';

            // ── tanda ✓ Disk limit ───────────────────────────────────────────
            const curDiskMB = dr.diskLimitMB ?? 10240;
            const markDL    = (mb) => curDiskMB === mb ? '✓ ' : '';

            // ── tanda ✓ Disk warn ────────────────────────────────────────────
            const curWarn   = dr.diskWarnPercent ?? 80;
            const markDW    = (pct) => curWarn === pct ? '✓ ' : '';

            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Monitor RAM & Disk')
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Status ─────────────────────────────────────────
                .makeSections('⚡ Status Monitor')
                .makeRow(
                    markM('all') + '✅ Aktif Semua',
                    'RAM + Disk',
                    modeKey === 'all' ? activeDesc('Monitor RAM dan Disk keduanya nyala') : 'Aktifkan monitor RAM dan Disk sekaligus',
                    `${pref}ramdisk on`
                )
                .makeRow(
                    markM('ram') + '🧠 RAM Only',
                    'Hanya Monitor RAM',
                    modeKey === 'ram' ? activeDesc('Hanya monitor RAM, Disk mati') : 'Aktifkan monitor RAM saja, Disk dimatikan',
                    `${pref}ramdisk ram`
                )
                .makeRow(
                    markM('disk') + '💾 Disk Only',
                    'Hanya Monitor Disk',
                    modeKey === 'disk' ? activeDesc('Hanya monitor Disk, RAM mati') : 'Aktifkan monitor Disk saja, RAM dimatikan',
                    `${pref}ramdisk disk`
                )
                .makeRow(
                    markM('off') + '❌ Nonaktif',
                    'Matikan Semua Monitor',
                    modeKey === 'off' ? activeDesc('Semua monitor dinonaktifkan') : 'Matikan monitor RAM dan Disk keduanya',
                    `${pref}ramdisk off`
                )

                // ── Section 2: Pengaturan RAM ─────────────────────────────────
                .makeSections('🧠 Pengaturan RAM')
                .makeRow(
                    markAD(true) + '🔍 Auto Detect ON',
                    'Limit RAM otomatis dari sistem',
                    autoDetect ? activeDesc(`Saat ini ${dr.ramAutoDetectPercent ?? 85}% dari total RAM fisik`) : `Limit otomatis ${dr.ramAutoDetectPercent ?? 85}% dari total RAM fisik`,
                    `${pref}ramdisk ram autodetect on`
                )
                .makeRow(
                    markAD(false) + '✏️ Manual Limit',
                    'Pakai limit MB dari config',
                    !autoDetect ? activeDesc(`Saat ini ${curRamMB} MB`) : 'Gunakan nilai ramLimitMB dari config',
                    `${pref}ramdisk ram autodetect off`
                )
                .makeRow(
                    markRL(512) + '512 MB',
                    'RAM Limit 512 MB',
                    !autoDetect && curRamMB === 512 ? activeDesc('512 MB') : 'Set limit RAM 512 MB (cocok VPS mini)',
                    `${pref}ramdisk ram limit 512`
                )
                .makeRow(
                    markRL(1024) + '1024 MB (1 GB)',
                    'RAM Limit 1024 MB',
                    !autoDetect && curRamMB === 1024 ? activeDesc('1024 MB') : 'Set limit RAM 1024 MB',
                    `${pref}ramdisk ram limit 1024`
                )
                .makeRow(
                    markRL(2048) + '2048 MB (2 GB)',
                    'RAM Limit 2048 MB',
                    !autoDetect && curRamMB === 2048 ? activeDesc('2048 MB') : 'Set limit RAM 2048 MB',
                    `${pref}ramdisk ram limit 2048`
                )
                .makeRow(
                    markRL(4096) + '4096 MB (4 GB)',
                    'RAM Limit 4096 MB',
                    !autoDetect && curRamMB === 4096 ? activeDesc('4096 MB') : 'Set limit RAM 4096 MB',
                    `${pref}ramdisk ram limit 4096`
                )
                .makeRow(
                    markRL(8192) + '8192 MB (8 GB)',
                    'RAM Limit 8192 MB',
                    !autoDetect && curRamMB === 8192 ? activeDesc('8192 MB') : 'Set limit RAM 8192 MB',
                    `${pref}ramdisk ram limit 8192`
                )

                // ── Section 3: Pengaturan Disk ────────────────────────────────
                .makeSections('💾 Pengaturan Disk')
                .makeRow(
                    markDL(5120) + '5 GB',
                    'Disk Limit 5 GB',
                    curDiskMB === 5120 ? activeDesc('5 GB (5120 MB)') : 'Set limit disk 5 GB (5120 MB)',
                    `${pref}ramdisk disk limit 5120`
                )
                .makeRow(
                    markDL(10240) + '10 GB',
                    'Disk Limit 10 GB',
                    curDiskMB === 10240 ? activeDesc('10 GB (10240 MB)') : 'Set limit disk 10 GB (10240 MB) — default',
                    `${pref}ramdisk disk limit 10240`
                )
                .makeRow(
                    markDL(20480) + '20 GB',
                    'Disk Limit 20 GB',
                    curDiskMB === 20480 ? activeDesc('20 GB (20480 MB)') : 'Set limit disk 20 GB (20480 MB)',
                    `${pref}ramdisk disk limit 20480`
                )
                .makeRow(
                    markDL(51200) + '50 GB',
                    'Disk Limit 50 GB',
                    curDiskMB === 51200 ? activeDesc('50 GB (51200 MB)') : 'Set limit disk 50 GB (51200 MB)',
                    `${pref}ramdisk disk limit 51200`
                )
                .makeRow(
                    markDW(70) + '⚠️ Warn 70%',
                    'Peringatan saat disk ≥ 70%',
                    curWarn === 70 ? activeDesc('Warn 70%') : 'Kirim peringatan jika disk terpakai ≥ 70%',
                    `${pref}ramdisk disk warn 70`
                )
                .makeRow(
                    markDW(80) + '⚠️ Warn 80%',
                    'Peringatan saat disk ≥ 80%',
                    curWarn === 80 ? activeDesc('Warn 80%') : 'Kirim peringatan jika disk terpakai ≥ 80% — default',
                    `${pref}ramdisk disk warn 80`
                )
                .makeRow(
                    markDW(90) + '⚠️ Warn 90%',
                    'Peringatan saat disk ≥ 90%',
                    curWarn === 90 ? activeDesc('Warn 90%') : 'Kirim peringatan jika disk terpakai ≥ 90%',
                    `${pref}ramdisk disk warn 90`
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

// ── Fallback teks biasa ────────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `${pref}ramdisk on — Aktifkan RAM + Disk\n` +
        `${pref}ramdisk ram — RAM Only\n` +
        `${pref}ramdisk disk — Disk Only\n` +
        `${pref}ramdisk off — Nonaktifkan semua\n` +
        `${pref}ramdisk ram autodetect on/off — Auto detect RAM\n` +
        `${pref}ramdisk ram limit <MB> — Set limit RAM manual\n` +
        `${pref}ramdisk disk limit <MB> — Set limit Disk\n` +
        `${pref}ramdisk disk warn <pct> — Set warn % Disk`
    );
}

// ── Handler utama ──────────────────────────────────────────────────────────────
async function handleRamdisk({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, Button }) {
    if (!m.isOwner) return;

    try {
        const pref = m.prefix || '.';
        const args = query ? query.trim().toLowerCase().split(/\s+/) : [];

        // ── Tanpa argumen → tampil status + button ────────────────────────────
        if (args.length === 0) {
            const dr       = _getDr(loadConfig);
            const bodyText = _buildBody(dr);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, dr);
            logCommand(m, hisoka, 'ramdisk');
            return;
        }

        // ── Helper: kirim notif sudah aktif ──────────────────────────────────
        const _notifSudahAktif = async (label) => {
            const dr   = _getDr(loadConfig);
            const body = `ℹ️ *${label} sudah aktif sebelumnya!*\n\n` + _buildBody(dr);
            await _sendSelection(hisoka, m, Button, tolak, body, pref, dr);
        };

        // ── Helper: simpan + kirim respons ────────────────────────────────────
        const _saveAndReply = async (patch, label) => {
            _saveDr(loadConfig, saveConfig, patch);
            const dr   = _getDr(loadConfig);
            const body = `✅ *${label}*\n\n` + _buildBody(dr);
            await _sendSelection(hisoka, m, Button, tolak, body, pref, dr);
        };

        const a0 = args[0];
        const a1 = args[1];
        const a2 = args[2];

        // ── on → aktifkan RAM + Disk ──────────────────────────────────────────
        if (a0 === 'on') {
            const dr = _getDr(loadConfig);
            if (dr.ramEnabled === true && dr.diskEnabled === true) {
                await _notifSudahAktif('Aktif Semua (RAM + Disk)');
            } else {
                await _saveAndReply({ ramEnabled: true, diskEnabled: true }, 'Monitor RAM + Disk Diaktifkan');
            }

        // ── ram → RAM only ────────────────────────────────────────────────────
        } else if (a0 === 'ram' && !a1) {
            const dr = _getDr(loadConfig);
            if (dr.ramEnabled === true && dr.diskEnabled === false) {
                await _notifSudahAktif('RAM Only');
            } else {
                await _saveAndReply({ ramEnabled: true, diskEnabled: false }, 'Monitor RAM Only Diaktifkan');
            }

        // ── disk → Disk only ──────────────────────────────────────────────────
        } else if (a0 === 'disk' && !a1) {
            const dr = _getDr(loadConfig);
            if (dr.ramEnabled === false && dr.diskEnabled === true) {
                await _notifSudahAktif('Disk Only');
            } else {
                await _saveAndReply({ ramEnabled: false, diskEnabled: true }, 'Monitor Disk Only Diaktifkan');
            }

        // ── off → matikan semua ────────────────────────────────────────────────
        } else if (a0 === 'off') {
            const dr = _getDr(loadConfig);
            if (dr.ramEnabled === false && dr.diskEnabled === false) {
                await _notifSudahAktif('Nonaktif');
            } else {
                await _saveAndReply({ ramEnabled: false, diskEnabled: false }, 'Semua Monitor Dinonaktifkan');
            }

        // ── ram autodetect on/off ─────────────────────────────────────────────
        } else if (a0 === 'ram' && a1 === 'autodetect') {
            if (!a2 || (a2 !== 'on' && a2 !== 'off')) {
                const dr = _getDr(loadConfig);
                await tolak(hisoka, m, `❌ Format salah. Contoh: ${pref}ramdisk ram autodetect on/off`);
                logCommand(m, hisoka, 'ramdisk');
                return;
            }
            const newVal = a2 === 'on';
            const dr     = _getDr(loadConfig);
            if (dr.ramAutoDetect === newVal) {
                await _notifSudahAktif(`Auto Detect RAM ${a2.toUpperCase()}`);
            } else {
                await _saveAndReply({ ramAutoDetect: newVal }, `RAM Auto Detect ${newVal ? 'Aktif' : 'Nonaktif'}`);
            }

        // ── ram limit <MB> ────────────────────────────────────────────────────
        } else if (a0 === 'ram' && a1 === 'limit') {
            const mb = parseInt(a2);
            if (isNaN(mb) || mb < 64 || mb > 65536) {
                await tolak(hisoka, m, `❌ Limit RAM harus antara 64 – 65536 MB. Contoh: ${pref}ramdisk ram limit 2048`);
                logCommand(m, hisoka, 'ramdisk');
                return;
            }
            const dr = _getDr(loadConfig);
            if (dr.ramAutoDetect === false && dr.ramLimitMB === mb) {
                await _notifSudahAktif(`RAM Limit ${mb} MB`);
            } else {
                await _saveAndReply({ ramLimitMB: mb, ramAutoDetect: false }, `RAM Limit Di-set ${mb} MB`);
            }

        // ── disk limit <MB> ───────────────────────────────────────────────────
        } else if (a0 === 'disk' && a1 === 'limit') {
            const mb = parseInt(a2);
            if (isNaN(mb) || mb < 512 || mb > 524288) {
                await tolak(hisoka, m, `❌ Limit disk harus antara 512 – 524288 MB. Contoh: ${pref}ramdisk disk limit 10240`);
                logCommand(m, hisoka, 'ramdisk');
                return;
            }
            const dr = _getDr(loadConfig);
            if (dr.diskLimitMB === mb) {
                await _notifSudahAktif(`Disk Limit ${mb} MB`);
            } else {
                await _saveAndReply({ diskLimitMB: mb }, `Disk Limit Di-set ${mb} MB`);
            }

        // ── disk warn <pct> ───────────────────────────────────────────────────
        } else if (a0 === 'disk' && a1 === 'warn') {
            const pct = parseInt(a2);
            if (isNaN(pct) || pct < 10 || pct > 99) {
                await tolak(hisoka, m, `❌ Warn harus antara 10 – 99 (persen). Contoh: ${pref}ramdisk disk warn 80`);
                logCommand(m, hisoka, 'ramdisk');
                return;
            }
            const dr = _getDr(loadConfig);
            if (dr.diskWarnPercent === pct) {
                await _notifSudahAktif(`Disk Warn ${pct}%`);
            } else {
                await _saveAndReply({ diskWarnPercent: pct }, `Disk Warn Di-set ${pct}%`);
            }

        // ── Perintah tidak dikenal ─────────────────────────────────────────────
        } else {
            const dr = _getDr(loadConfig);
            await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik ${pref}ramdisk untuk bantuan.`);
        }

        logCommand(m, hisoka, 'ramdisk');

    } catch (error) {
        console.error('\x1b[31m[DiskRam] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

module.exports = { handleRamdisk };
