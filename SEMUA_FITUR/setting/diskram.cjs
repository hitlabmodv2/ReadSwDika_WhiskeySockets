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
    if (ramOn && diskOn)  return '✅ *Aktif Semua* _(RAM + Disk)_';
    if (ramOn)            return '🧠 *RAM Only* _— Disk mati_';
    if (diskOn)           return '💾 *Disk Only* _— RAM mati_';
    return '❌ *Nonaktif* _— semua monitor mati_';
}

// ── Helper: bangun body status ────────────────────────────────────────────────
function _buildBody(dr) {
    const ramOn  = dr.ramEnabled  === true;
    const diskOn = dr.diskEnabled === true;

    const ramLimitRaw = dr.ramAutoDetect === true
        ? `Auto Detect ${dr.ramAutoDetectPercent ?? 85}%`
        : `${dr.ramLimitMB ?? 8192} MB`;
    const diskLimitRaw = `${dr.diskLimitMB ?? 10240} MB`;
    const diskWarnRaw  = `${dr.diskWarnPercent ?? 80}%`;
    const ramCheckRaw  = `${(dr.ramCheckIntervalMs  ?? 30000)  / 1000}s`;
    const diskCheckRaw = `${(dr.diskCheckIntervalMs ?? 300000) / 1000}s`;

    const ramStatus  = ramOn  ? '_Aktif_ ✅' : '~Nonaktif~ ❌';
    const diskStatus = diskOn ? '_Aktif_ ✅' : '~Nonaktif~ ❌';

    return (
        `╭═══『 🖥️ *MONITOR RAM & DISK* 』═══╮\n` +
        `│\n` +
        `│ ⚡ *Status :* ${_statusLabel(ramOn, diskOn)}\n` +
        `│\n` +
        `│ *🧠 RAM Monitor*\n` +
        `│ • Status  : ${ramStatus}\n` +
        `│ • Limit   : \`${ramLimitRaw}\`\n` +
        `│ • Interval: \`${ramCheckRaw}\` sekali cek\n` +
        `│\n` +
        `│ *💾 Disk Monitor*\n` +
        `│ • Status  : ${diskStatus}\n` +
        `│ • Limit   : \`${diskLimitRaw}\`\n` +
        `│ • Warn    : \`${diskWarnRaw}\` pemakaian\n` +
        `│ • Interval: \`${diskCheckRaw}\` sekali cek\n` +
        `│\n` +
        `│ > 🦕 Panel *Pterodactyl®*\n` +
        `│ > _Sesuaikan limit dengan kuota panel kamu_\n` +
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

            // ── preset data ───────────────────────────────────────────────────
            const RAM_PRESETS = [
                { mb: 256,   label: '256 MB',         desc: 'Sangat kecil — bot ringan banget'          },
                { mb: 512,   label: '512 MB',          desc: 'Kecil — cocok VPS mini / free tier'        },
                { mb: 768,   label: '768 MB',          desc: 'Standar kecil — VPS basic'                 },
                { mb: 1024,  label: '1024 MB  (1 GB)', desc: 'Standar — paket VPS entry'                 },
                { mb: 1536,  label: '1536 MB',         desc: 'Menengah — 1.5 GB'                         },
                { mb: 2048,  label: '2048 MB  (2 GB)', desc: 'Nyaman — paket VPS umum'                   },
                { mb: 3072,  label: '3072 MB  (3 GB)', desc: 'Lega — 3 GB'                               },
                { mb: 4096,  label: '4096 MB  (4 GB)', desc: 'Besar — bot aktif banyak fitur'            },
                { mb: 6144,  label: '6144 MB  (6 GB)', desc: 'Lega sekali — 6 GB'                        },
                { mb: 7168,  label: '7168 MB  (7 GB)', desc: '7 GB — hampir full 8 GB'                   },
                { mb: 8192,  label: '8192 MB  (8 GB)', desc: '🔰 Default — umum di panel Pterodactyl®'   },
                { mb: 10240, label: '10240 MB (10 GB)', desc: 'Besar — panel premium 10 GB'              },
                { mb: 12288, label: '12288 MB (12 GB)', desc: '12 GB — VPS kelas menengah atas'          },
                { mb: 16384, label: '16384 MB (16 GB)', desc: '16 GB — VPS dedicated / high spec'        },
            ];

            const DISK_PRESETS = [
                { mb: 1024,   label: '1 GB',   desc: 'Sangat kecil — hanya untuk testing'               },
                { mb: 2048,   label: '2 GB',   desc: 'Kecil — bot minimal tanpa media besar'             },
                { mb: 5120,   label: '5 GB',   desc: 'Kecil-sedang — free tier / VPS mini'               },
                { mb: 10240,  label: '10 GB',  desc: '🔰 Default — umum di panel Pterodactyl®'           },
                { mb: 15360,  label: '15 GB',  desc: 'Sedang — cukup untuk bot aktif'                    },
                { mb: 20480,  label: '20 GB',  desc: 'Lega — cocok dengan banyak cache media'            },
                { mb: 25600,  label: '25 GB',  desc: '25 GB — paket menengah'                            },
                { mb: 30720,  label: '30 GB',  desc: '30 GB — storage nyaman'                            },
                { mb: 51200,  label: '50 GB',  desc: 'Besar — VPS storage kelas atas'                    },
                { mb: 76800,  label: '75 GB',  desc: '75 GB — dedicated storage'                         },
                { mb: 102400, label: '100 GB', desc: '100 GB — server / panel dedicated penuh'           },
                { mb: 153600, label: '150 GB', desc: '150 GB — server besar'                             },
                { mb: 204800, label: '200 GB', desc: '200 GB — storage sangat besar'                     },
                { mb: 512000, label: '500 GB', desc: '500 GB — dedicated server skala penuh'             },
            ];

            const WARN_PRESETS = [
                { pct: 50, desc: '50% — Sangat dini, cocok untuk pantau ketat'    },
                { pct: 60, desc: '60% — Dini, beri waktu luang cukup'             },
                { pct: 70, desc: '70% — Cukup awal untuk ambil tindakan'          },
                { pct: 75, desc: '75% — Titik tengah yang seimbang'               },
                { pct: 80, desc: '🔰 Default — standar umum Pterodactyl®'         },
                { pct: 85, desc: '85% — Sedikit mepet, masih aman'               },
                { pct: 90, desc: '90% — Hampir penuh, hati-hati'                  },
                { pct: 95,  desc: '95% — Kritis! Hanya untuk monitoring pasif'    },
                { pct: 100, desc: '100% — Penuh total, peringatan saat disk habis' },
            ];

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Monitor RAM & Disk  |  🦕 Pterodactyl®')
                .addSelection('🎛️ Pilih Pengaturan')

                // ── Section 1: Status On/Off ──────────────────────────────────
                .makeSections('⚡ Status Monitor')
                .makeRow(
                    markM('all') + '✅ Aktif Semua',
                    'RAM + Disk — keduanya nyala',
                    modeKey === 'all' ? activeDesc('Monitor RAM & Disk aktif bersamaan') : 'Aktifkan monitor RAM dan Disk sekaligus',
                    `${pref}ramdisk on`
                )
                .makeRow(
                    markM('ram') + '🧠 RAM Only',
                    'Hanya monitor RAM',
                    modeKey === 'ram' ? activeDesc('Hanya RAM, Disk dimatikan') : 'Monitor RAM saja, Disk tidak aktif',
                    `${pref}ramdisk ram`
                )
                .makeRow(
                    markM('disk') + '💾 Disk Only',
                    'Hanya monitor Disk',
                    modeKey === 'disk' ? activeDesc('Hanya Disk, RAM dimatikan') : 'Monitor Disk saja, RAM tidak aktif',
                    `${pref}ramdisk disk`
                )
                .makeRow(
                    markM('off') + '❌ Nonaktif',
                    'Matikan semua monitor',
                    modeKey === 'off' ? activeDesc('Semua monitor nonaktif') : 'Matikan RAM & Disk monitor sekaligus',
                    `${pref}ramdisk off`
                )

                // ── Section 2: RAM — Auto Detect ──────────────────────────────
                .makeSections('🧠 RAM — Mode Limit')
                .makeRow(
                    markAD(true) + '🔍 Auto Detect ON',
                    `Otomatis dari RAM fisik (${dr.ramAutoDetectPercent ?? 85}%)`,
                    autoDetect ? activeDesc(`${dr.ramAutoDetectPercent ?? 85}% dari total RAM terdeteksi`) : `Limit = ${dr.ramAutoDetectPercent ?? 85}% dari total RAM fisik panel`,
                    `${pref}ramdisk ram autodetect on`
                )
                .makeRow(
                    markAD(false) + '✏️ Manual Limit',
                    `Pakai nilai MB dari pilihan bawah`,
                    !autoDetect ? activeDesc(`Saat ini ${curRamMB} MB`) : 'Pilih salah satu nilai MB di bawah ini',
                    `${pref}ramdisk ram autodetect off`
                );

            // ── Section 3: RAM — Pilih Limit Manual (loop) ───────────────────
            btn.makeSections('🧠 RAM — Pilih Limit (MB)');
            for (const r of RAM_PRESETS) {
                const aktif = !autoDetect && curRamMB === r.mb;
                btn.makeRow(
                    markRL(r.mb) + r.label,
                    `RAM Limit ${r.label}`,
                    aktif ? activeDesc(r.desc) : r.desc,
                    `${pref}ramdisk ram limit ${r.mb}`
                );
            }

            // ── Section 4: Disk — Pilih Limit (loop) ─────────────────────────
            btn.makeSections('💾 Disk — Pilih Limit');
            for (const d of DISK_PRESETS) {
                const aktif = curDiskMB === d.mb;
                btn.makeRow(
                    markDL(d.mb) + d.label,
                    `Disk Limit ${d.label}`,
                    aktif ? activeDesc(d.desc) : d.desc,
                    `${pref}ramdisk disk limit ${d.mb}`
                );
            }

            // ── Section 5: Disk — Warning % (loop) ───────────────────────────
            btn.makeSections('⚠️ Disk — Batas Peringatan (%)');
            for (const w of WARN_PRESETS) {
                const aktif = curWarn === w.pct;
                btn.makeRow(
                    markDW(w.pct) + `⚠️ Warn ${w.pct}%`,
                    `Peringatan saat disk ≥ ${w.pct}%`,
                    aktif ? activeDesc(w.desc) : w.desc,
                    `${pref}ramdisk disk warn ${w.pct}`
                );
            }

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
    const p = pref;
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*📋 Cara Penggunaan .ramdisk*\n` +
        `\n` +
        `*⚡ Status Monitor*\n` +
        `1. \`${p}ramdisk on\` — _Aktifkan RAM + Disk sekaligus_\n` +
        `2. \`${p}ramdisk ram\` — _Hanya monitor RAM_\n` +
        `3. \`${p}ramdisk disk\` — _Hanya monitor Disk_\n` +
        `4. \`${p}ramdisk off\` — _Matikan semua monitor_\n` +
        `\n` +
        `*🧠 Pengaturan RAM*\n` +
        `5. \`${p}ramdisk ram autodetect on\` — _Limit otomatis dari sistem_\n` +
        `6. \`${p}ramdisk ram autodetect off\` — _Pakai limit manual_\n` +
        `7. \`${p}ramdisk ram limit <MB>\` — _Contoh:_ \`${p}ramdisk ram limit 2048\`\n` +
        `\n` +
        `*💾 Pengaturan Disk*\n` +
        `8. \`${p}ramdisk disk limit <MB>\` — _Contoh:_ \`${p}ramdisk disk limit 10240\`\n` +
        `9. \`${p}ramdisk disk warn <persen>\` — _Contoh:_ \`${p}ramdisk disk warn 80\`\n` +
        `\n` +
        `> 🦕 Panel *Pterodactyl®* — sesuaikan limit dengan kuota panel kamu`
    );
}

// ── Handler utama ──────────────────────────────────────────────────────────────
async function handleRamdisk({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, Button }) {
    if (!m.isOwner) return;
    if (hisoka?.isMainBot === false) return;

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
