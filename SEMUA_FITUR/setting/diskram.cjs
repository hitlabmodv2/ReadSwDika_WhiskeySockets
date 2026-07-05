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

const os            = require('os');
const { execSync }  = require('child_process');

// ── Real-time stats: baca RAM + Disk langsung dari server saat ini ─────────────
function _getRealtimeStats() {
    // ─ RAM ─────────────────────────────────────────────────────────────────────
    const totalRamMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeRamMB  = Math.round(os.freemem()  / 1024 / 1024);
    const usedRamMB  = totalRamMB - freeRamMB;
    const ramPct     = Math.round((usedRamMB / totalRamMB) * 100);

    // ─ Disk — coba path berurutan: Pterodactyl → cwd → / ──────────────────────
    let totalDiskMB = 0, usedDiskMB = 0, freeDiskMB = 0, diskPct = 0, diskOk = false;
    const diskPaths = ['/home/container', process.cwd(), '/'];
    for (const p of diskPaths) {
        try {
            const raw  = execSync(`df -Pk "${p}" 2>/dev/null`, { timeout: 3000 }).toString().trim().split('\n');
            const cols = raw[1].trim().split(/\s+/);
            const tKB  = parseInt(cols[1]);
            if (!isNaN(tKB) && tKB > 1024) {   // skip overlay kecil (<1 MB)
                totalDiskMB = Math.round(tKB / 1024);
                usedDiskMB  = Math.round(parseInt(cols[2]) / 1024);
                freeDiskMB  = Math.round(parseInt(cols[3]) / 1024);
                diskPct     = Math.round(parseInt(cols[2]) / tKB * 100);
                diskOk      = true;
                break;
            }
        } catch (_) {}
    }

    return { totalRamMB, usedRamMB, freeRamMB, ramPct, totalDiskMB, usedDiskMB, freeDiskMB, diskPct, diskOk };
}

// ── Helper: mini bar (10 blok) ─────────────────────────────────────────────────
function _bar(pct, len = 8) {
    const filled = Math.max(0, Math.min(len, Math.round((pct / 100) * len)));
    return '█'.repeat(filled) + '░'.repeat(len - filled);
}

// ── Helper: format MB → tampil singkat ────────────────────────────────────────
function _fmtMB(mb) {
    if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
    return mb + ' MB';
}

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

// ── Helper: bangun body status + realtime ─────────────────────────────────────
function _buildBody(dr) {
    const ramOn  = dr.ramEnabled  === true;
    const diskOn = dr.diskEnabled === true;

    // ── Realtime baca langsung dari server ──────────────────────────────────
    const rt = _getRealtimeStats();

    // ── Hitung limit RAM (autodetect pakai % dari total real) ───────────────
    const autoDetect   = dr.ramAutoDetect === true;
    const autoDetectPct = dr.ramAutoDetectPercent ?? 85;
    const ramLimitMB   = autoDetect
        ? Math.round(rt.totalRamMB * autoDetectPct / 100)
        : (dr.ramLimitMB ?? 8192);
    const ramLimitRaw  = autoDetect
        ? `Auto ${autoDetectPct}% → ${_fmtMB(ramLimitMB)}`
        : _fmtMB(ramLimitMB);

    const diskLimitRaw = _fmtMB(dr.diskLimitMB ?? 10240);
    const diskWarnRaw  = `${dr.diskWarnPercent ?? 80}%`;
    const ramCheckRaw  = `${(dr.ramCheckIntervalMs  ?? 30000)  / 1000}s`;
    const diskCheckRaw = `${(dr.diskCheckIntervalMs ?? 300000) / 1000}s`;

    const ramStatus  = ramOn  ? '_Aktif_ ✅' : '~Nonaktif~ ❌';
    const diskStatus = diskOn ? '_Aktif_ ✅' : '~Nonaktif~ ❌';

    // ── Bar realtime ────────────────────────────────────────────────────────
    const ramBar  = _bar(rt.ramPct);
    const ramIcon = rt.ramPct >= 90 ? '🔴' : rt.ramPct >= 70 ? '🟡' : '🟢';

    let diskLine = '';
    if (rt.diskOk) {
        const diskBar  = _bar(rt.diskPct);
        const diskIcon = rt.diskPct >= 90 ? '🔴' : rt.diskPct >= 70 ? '🟡' : '🟢';
        diskLine =
            `│\n` +
            `│ 📊 *Realtime Disk*\n` +
            `│ • ${diskIcon} \`${diskBar}\` ${rt.diskPct}%\n` +
            `│ • Pakai : \`${_fmtMB(rt.usedDiskMB)}\` / \`${_fmtMB(rt.totalDiskMB)}\`\n` +
            `│ • Sisa  : \`${_fmtMB(rt.freeDiskMB)}\`\n`;
    } else {
        diskLine = `│\n│ 📊 *Realtime Disk* : _tidak terdeteksi_\n`;
    }

    return (
        `╭═══『 🖥️ *MONITOR RAM & DISK* 』═══╮\n` +
        `│\n` +
        `│ ⚡ *Status :* ${_statusLabel(ramOn, diskOn)}\n` +
        `│\n` +
        `│ 📊 *Realtime RAM* _(server saat ini)_\n` +
        `│ • ${ramIcon} \`${ramBar}\` ${rt.ramPct}%\n` +
        `│ • Pakai : \`${_fmtMB(rt.usedRamMB)}\` / \`${_fmtMB(rt.totalRamMB)}\`\n` +
        `│ • Sisa  : \`${_fmtMB(rt.freeRamMB)}\`\n` +
        diskLine +
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
        `│ > _Limit menyesuaikan server tempat bot jalan_\n` +
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
                { mb: 256,   label: '𝟮𝟱𝟲 𝗠𝗕',           desc: 'Sangat kecil — bot ringan banget'        },
                { mb: 512,   label: '𝟱𝟭𝟮 𝗠𝗕',           desc: 'Kecil — cocok VPS mini / free tier'      },
                { mb: 768,   label: '𝟳𝟲𝟴 𝗠𝗕',           desc: 'Standar kecil — VPS basic'               },
                { mb: 1024,  label: '𝟭𝟬𝟮𝟰 𝗠𝗕 (𝟭 𝗚𝗕)',   desc: 'Standar — paket VPS entry'               },
                { mb: 1536,  label: '𝟭𝟱𝟯𝟲 𝗠𝗕',          desc: 'Menengah — 1.5 GB'                       },
                { mb: 2048,  label: '𝟮𝟬𝟰𝟴 𝗠𝗕 (𝟮 𝗚𝗕)',   desc: 'Nyaman — paket VPS umum'                 },
                { mb: 3072,  label: '𝟯𝟬𝟳𝟮 𝗠𝗕 (𝟯 𝗚𝗕)',   desc: 'Lega — 3 GB'                             },
                { mb: 4096,  label: '𝟰𝟬𝟵𝟲 𝗠𝗕 (𝟰 𝗚𝗕)',   desc: 'Besar — bot aktif banyak fitur'          },
                { mb: 6144,  label: '𝟲𝟭𝟰𝟰 𝗠𝗕 (𝟲 𝗚𝗕)',   desc: 'Lega sekali — 6 GB'                      },
                { mb: 7168,  label: '𝟳𝟭𝟲𝟴 𝗠𝗕 (𝟳 𝗚𝗕)',   desc: '7 GB — hampir full 8 GB'                 },
                { mb: 8192,  label: '𝟴𝟭𝟵𝟮 𝗠𝗕 (𝟴 𝗚𝗕)',   desc: '🔰 Default — umum di panel Pterodactyl®' },
                { mb: 10240, label: '𝟭𝟬𝟮𝟰𝟬 𝗠𝗕 (𝟭𝟬 𝗚𝗕)', desc: 'Besar — panel premium 10 GB'            },
                { mb: 12288, label: '𝟭𝟮𝟮𝟴𝟴 𝗠𝗕 (𝟭𝟮 𝗚𝗕)', desc: '12 GB — VPS kelas menengah atas'        },
                { mb: 16384, label: '𝟭𝟲𝟯𝟴𝟰 𝗠𝗕 (𝟭𝟲 𝗚𝗕)', desc: '16 GB — VPS dedicated / high spec'      },
            ];

            const DISK_PRESETS = [
                { mb: 1024,   label: '𝟭 𝗚𝗕',    desc: 'Sangat kecil — hanya untuk testing'              },
                { mb: 2048,   label: '𝟮 𝗚𝗕',    desc: 'Kecil — bot minimal tanpa media besar'            },
                { mb: 5120,   label: '𝟱 𝗚𝗕',    desc: 'Kecil-sedang — free tier / VPS mini'              },
                { mb: 10240,  label: '𝟭𝟬 𝗚𝗕',   desc: '🔰 Default — umum di panel Pterodactyl®'          },
                { mb: 15360,  label: '𝟭𝟱 𝗚𝗕',   desc: 'Sedang — cukup untuk bot aktif'                   },
                { mb: 20480,  label: '𝟮𝟬 𝗚𝗕',   desc: 'Lega — cocok dengan banyak cache media'           },
                { mb: 25600,  label: '𝟮𝟱 𝗚𝗕',   desc: '25 GB — paket menengah'                           },
                { mb: 30720,  label: '𝟯𝟬 𝗚𝗕',   desc: '30 GB — storage nyaman'                           },
                { mb: 51200,  label: '𝟱𝟬 𝗚𝗕',   desc: 'Besar — VPS storage kelas atas'                   },
                { mb: 76800,  label: '𝟳𝟱 𝗚𝗕',   desc: '75 GB — dedicated storage'                        },
                { mb: 102400, label: '𝟭𝟬𝟬 𝗚𝗕',  desc: '100 GB — server / panel dedicated penuh'          },
                { mb: 153600, label: '𝟭𝟱𝟬 𝗚𝗕',  desc: '150 GB — server besar'                            },
                { mb: 204800, label: '𝟮𝟬𝟬 𝗚𝗕',  desc: '200 GB — storage sangat besar'                    },
                { mb: 512000, label: '𝟱𝟬𝟬 𝗚𝗕',  desc: '500 GB — dedicated server skala penuh'            },
            ];

            const WARN_PRESETS = [
                { pct: 50,  boldPct: '𝟱𝟬',  desc: '50% — Sangat dini, cocok untuk pantau ketat'     },
                { pct: 60,  boldPct: '𝟲𝟬',  desc: '60% — Dini, beri waktu luang cukup'              },
                { pct: 70,  boldPct: '𝟳𝟬',  desc: '70% — Cukup awal untuk ambil tindakan'           },
                { pct: 75,  boldPct: '𝟳𝟱',  desc: '75% — Titik tengah yang seimbang'                },
                { pct: 80,  boldPct: '𝟴𝟬',  desc: '🔰 Default — standar umum Pterodactyl®'          },
                { pct: 85,  boldPct: '𝟴𝟱',  desc: '85% — Sedikit mepet, masih aman'                },
                { pct: 90,  boldPct: '𝟵𝟬',  desc: '90% — Hampir penuh, hati-hati'                   },
                { pct: 95,  boldPct: '𝟵𝟱',  desc: '95% — Kritis! Hanya untuk monitoring pasif'     },
                { pct: 100, boldPct: '𝟭𝟬𝟬', desc: '100% — Penuh total, peringatan saat disk habis'  },
            ];

            // ── Hitung auto-detect dulu (dipakai di Section 1 & body) ───────────
            const rt = _getRealtimeStats();
            const adPct     = dr.ramAutoDetectPercent ?? 85;
            const autoRamMB = Math.round(rt.totalRamMB * adPct / 100);
            const autoWarnPct = rt.diskOk
                ? Math.min(95, Math.max(50, Math.ceil((rt.diskPct + 10) / 5) * 5))
                : 80;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ 𝗪𝗶𝗹𝘆 𝗕𝗼𝘁 • ᴍᴏɴɪᴛᴏʀ ʀᴀᴍ & ᴅɪꜱᴋ  |  🦕 Pterodactyl®')
                .addSelection('🎛️ ᴘɪʟɪʜ ᴘᴇɴɢᴀᴛᴜʀᴀɴ')

                // ── Section 1: Auto-Detect & Simpan (PALING ATAS) ─────────────
                .makeSections('🤖 ᴀᴜᴛᴏ-ᴅᴇᴛᴇᴋꜱɪ & ꜱɪᴍᴘᴀɴ')
                .makeRow(
                    `⚡ 𝗦𝗮𝘃𝗲 𝗦𝗲𝗺𝘂𝗮 𝗦𝗲𝗸𝗮𝗹𝗶𝗴𝘂𝘀`,
                    rt.diskOk
                        ? `RAM ${_fmtMB(autoRamMB)} + Disk ${_fmtMB(rt.totalDiskMB)} + Warn ${autoWarnPct}%`
                        : `RAM ${_fmtMB(autoRamMB)} (disk tidak terdeteksi)`,
                    `Simpan semua nilai terdeteksi realtime ke config sekaligus`,
                    `${pref}ramdisk autodetect all`
                )
                .makeRow(
                    `🧠 𝗦𝗮𝘃𝗲 𝗥𝗔𝗠 𝗟𝗶𝗺𝗶𝘁`,
                    `${_fmtMB(rt.totalRamMB)} × ${adPct}% = ${_fmtMB(autoRamMB)}`,
                    `Simpan limit RAM ${_fmtMB(autoRamMB)} ke config (terdeteksi dari server sekarang)`,
                    `${pref}ramdisk autodetect ram`
                )

                // ── Section 2: Status On/Off ───────────────────────────────────
                .makeSections('⚡ ꜱᴛᴀᴛᴜꜱ ᴍᴏɴɪᴛᴏʀ')
                .makeRow(
                    markM('all') + '✅ 𝗔𝗸𝘁𝗶𝗳 𝗦𝗲𝗺𝘂𝗮',
                    '𝗥𝗔𝗠 + 𝗗𝗶𝘀𝗸 — keduanya nyala',
                    modeKey === 'all' ? activeDesc('Monitor RAM & Disk aktif bersamaan') : 'Aktifkan monitor RAM dan Disk sekaligus',
                    `${pref}ramdisk on`
                )
                .makeRow(
                    markM('ram') + '🧠 𝗥𝗔𝗠 𝗢𝗻𝗹𝘆',
                    'Hanya monitor 𝗥𝗔𝗠',
                    modeKey === 'ram' ? activeDesc('Hanya RAM, Disk dimatikan') : 'Monitor RAM saja, Disk tidak aktif',
                    `${pref}ramdisk ram`
                )
                .makeRow(
                    markM('disk') + '💾 𝗗𝗶𝘀𝗸 𝗢𝗻𝗹𝘆',
                    'Hanya monitor 𝗗𝗶𝘀𝗸',
                    modeKey === 'disk' ? activeDesc('Hanya Disk, RAM dimatikan') : 'Monitor Disk saja, RAM tidak aktif',
                    `${pref}ramdisk disk`
                )
                .makeRow(
                    markM('off') + '❌ 𝗡𝗼𝗻𝗮𝗸𝘁𝗶𝗳',
                    'Matikan semua monitor',
                    modeKey === 'off' ? activeDesc('Semua monitor nonaktif') : 'Matikan RAM & Disk monitor sekaligus',
                    `${pref}ramdisk off`
                )

                // ── Section 3: RAM — Auto Detect ──────────────────────────────
                .makeSections('🧠 ʀᴀᴍ — ᴍᴏᴅᴇ ʟɪᴍɪᴛ')
                .makeRow(
                    markAD(true) + '🔍 𝗔𝘂𝘁𝗼 𝗗𝗲𝘁𝗲𝗰𝘁 𝗢𝗡',
                    `Otomatis dari RAM fisik (${dr.ramAutoDetectPercent ?? 85}%)`,
                    autoDetect ? activeDesc(`${dr.ramAutoDetectPercent ?? 85}% dari total RAM terdeteksi`) : `Limit = ${dr.ramAutoDetectPercent ?? 85}% dari total RAM fisik panel`,
                    `${pref}ramdisk ram autodetect on`
                )
                .makeRow(
                    markAD(false) + '✏️ 𝗠𝗮𝗻𝘂𝗮𝗹 𝗟𝗶𝗺𝗶𝘁',
                    `Pakai nilai 𝗠𝗕 dari pilihan bawah`,
                    !autoDetect ? activeDesc(`Saat ini ${curRamMB} MB`) : 'Pilih salah satu nilai MB di bawah ini',
                    `${pref}ramdisk ram autodetect off`
                );

            // ── Section 4: RAM — Pilih Limit Manual (loop) ───────────────────
            btn.makeSections('🧠 ʀᴀᴍ — ᴘɪʟɪʜ ʟɪᴍɪᴛ (ᴍʙ)');
            for (const r of RAM_PRESETS) {
                const aktif = !autoDetect && curRamMB === r.mb;
                btn.makeRow(
                    markRL(r.mb) + r.label,
                    `𝗥𝗔𝗠 𝗟𝗶𝗺𝗶𝘁 ${r.label}`,
                    aktif ? activeDesc(r.desc) : r.desc,
                    `${pref}ramdisk ram limit ${r.mb}`
                );
            }

            // ── Section 5: Disk — Pilih Limit (loop) ─────────────────────────
            btn.makeSections('💾 ᴅɪꜱᴋ — ᴘɪʟɪʜ ʟɪᴍɪᴛ');
            if (rt.diskOk) {
                btn.makeRow(
                    `💾 𝗦𝗮𝘃𝗲 𝗗𝗶𝘀𝗸 𝗟𝗶𝗺𝗶𝘁`,
                    `Total disk terdeteksi: ${_fmtMB(rt.totalDiskMB)}`,
                    `Simpan limit disk ${_fmtMB(rt.totalDiskMB)} ke config (dari server sekarang)`,
                    `${pref}ramdisk autodetect disk`
                );
            }
            for (const d of DISK_PRESETS) {
                const aktif = curDiskMB === d.mb;
                btn.makeRow(
                    markDL(d.mb) + d.label,
                    `𝗗𝗶𝘀𝗸 𝗟𝗶𝗺𝗶𝘁 ${d.label}`,
                    aktif ? activeDesc(d.desc) : d.desc,
                    `${pref}ramdisk disk limit ${d.mb}`
                );
            }

            // ── Section 6: Disk — Warning % (loop) ───────────────────────────
            btn.makeSections('⚠️ ᴅɪꜱᴋ — ʙᴀᴛᴀꜱ ᴘᴇʀɪɴɢᴀᴛᴀɴ (%)');
            if (rt.diskOk) {
                btn.makeRow(
                    `⚠️ 𝗦𝗮𝘃𝗲 𝗪𝗮𝗿𝗻 𝗢𝘁𝗼`,
                    `Disk ${rt.diskPct}% → Warn ${autoWarnPct}%`,
                    `Set peringatan disk ${autoWarnPct}% (usage sekarang ${rt.diskPct}%, +10% margin keamanan)`,
                    `${pref}ramdisk autodetect warn`
                );
            }
            for (const w of WARN_PRESETS) {
                const aktif = curWarn === w.pct;
                btn.makeRow(
                    markDW(w.pct) + `⚠️ 𝗪𝗮𝗿𝗻 ${w.boldPct}%`,
                    `ᴘᴇʀɪɴɢᴀᴛᴀɴ saat disk ≥ ${w.boldPct}%`,
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

        // ── autodetect ram/disk/warn/all → deteksi realtime + simpan config ─────
        } else if (a0 === 'autodetect') {
            const sub = a1; // ram | disk | warn | all
            if (!sub || !['ram', 'disk', 'warn', 'all'].includes(sub)) {
                await tolak(hisoka, m, `❌ Format: ${pref}ramdisk autodetect ram/disk/warn/all`);
                logCommand(m, hisoka, 'ramdisk');
                return;
            }

            const rt    = _getRealtimeStats();
            const dr    = _getDr(loadConfig);
            const adPct = dr.ramAutoDetectPercent ?? 85;
            const patch = {};
            const parts = [];

            if (sub === 'ram' || sub === 'all') {
                if (rt.totalRamMB < 64) {
                    await tolak(hisoka, m, `❌ RAM tidak terdeteksi dengan benar (${rt.totalRamMB} MB). Coba lagi.`);
                    logCommand(m, hisoka, 'ramdisk');
                    return;
                }
                const limitMB = Math.round(rt.totalRamMB * adPct / 100);
                patch.ramLimitMB    = limitMB;
                patch.ramAutoDetect = false; // simpan sebagai nilai fixed dari detect
                parts.push(`🧠 RAM Limit → ${_fmtMB(limitMB)} (${adPct}% × ${_fmtMB(rt.totalRamMB)})`);
            }

            if (sub === 'disk' || sub === 'all') {
                if (!rt.diskOk || rt.totalDiskMB < 512) {
                    if (sub === 'disk') {
                        await tolak(hisoka, m, `❌ Disk tidak terdeteksi. Pastikan bot berjalan di server dengan disk yang terpasang.`);
                        logCommand(m, hisoka, 'ramdisk');
                        return;
                    }
                    // kalau 'all' dan disk gagal → skip disk, lanjut yang lain
                    parts.push(`💾 Disk → ⚠️ tidak terdeteksi, dilewati`);
                } else {
                    patch.diskLimitMB = rt.totalDiskMB;
                    parts.push(`💾 Disk Limit → ${_fmtMB(rt.totalDiskMB)}`);
                }
            }

            if (sub === 'warn' || sub === 'all') {
                if (!rt.diskOk) {
                    if (sub === 'warn') {
                        await tolak(hisoka, m, `❌ Disk tidak terdeteksi, tidak bisa hitung warn otomatis.`);
                        logCommand(m, hisoka, 'ramdisk');
                        return;
                    }
                    parts.push(`⚠️ Warn → tidak terdeteksi, dilewati`);
                } else {
                    const warnPct = Math.min(95, Math.max(50, Math.ceil((rt.diskPct + 10) / 5) * 5));
                    patch.diskWarnPercent = warnPct;
                    parts.push(`⚠️ Warn → ${warnPct}% (disk sekarang ${rt.diskPct}%)`);
                }
            }

            if (Object.keys(patch).length === 0) {
                await tolak(hisoka, m, `❌ Tidak ada nilai yang bisa disimpan karena deteksi gagal semua.`);
                logCommand(m, hisoka, 'ramdisk');
                return;
            }

            const label = `✅ *Auto-Deteksi Tersimpan!*\n\n` + parts.map(p => `• ${p}`).join('\n');
            _saveDr(loadConfig, saveConfig, patch);
            const drNew  = _getDr(loadConfig);
            const body   = label + `\n\n` + _buildBody(drNew);
            await _sendSelection(hisoka, m, Button, tolak, body, pref, drNew);

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
