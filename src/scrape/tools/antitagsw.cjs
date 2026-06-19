'use strict';

async function handleAntitagsw({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, toggleAntiTagSW, saveCekautoTimestamp, sendConfirmWithButtons, isAntiTagSWEnabled, getAllAntiTagSWGroups, getWarnings, resetWarnings, kvGet, Button, clearAntiTagSWLog, getAntiTagSWLog, resolveLidFromContacts }) {
        if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di grup!');
        if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

        const arg = (query || '').trim().toLowerCase();

        if (arg === 'global on') {
                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner bot yang bisa mengubah pengaturan global!');
                const config = loadConfig();
                if (!config.antiTagSW) config.antiTagSW = {};
                config.antiTagSW.enabled = true;
                saveConfig(config);
                await tolak(hisoka, m,
                        `╭───〔 *🌐 ANTITAGSW GLOBAL* 〕───╮\n` +
                        `│\n` +
                        `│ ✅ *Global AntiTagSW DIAKTIFKAN!*\n` +
                        `│\n` +
                        `│ ℹ️ Sekarang admin grup bisa\n` +
                        `│    mengaktifkan fitur ini di\n` +
                        `│    masing-masing grup.\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, 'antitagsw global on');
        } else if (arg === 'global off') {
                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner bot yang bisa mengubah pengaturan global!');
                const config = loadConfig();
                if (!config.antiTagSW) config.antiTagSW = {};
                config.antiTagSW.enabled = false;
                saveConfig(config);
                await tolak(hisoka, m,
                        `╭───〔 *🌐 ANTITAGSW GLOBAL* 〕───╮\n` +
                        `│\n` +
                        `│ 🔴 *Global AntiTagSW DINONAKTIFKAN!*\n` +
                        `│\n` +
                        `│ ℹ️ Fitur ini tidak akan aktif\n` +
                        `│    di semua grup meskipun sudah\n` +
                        `│    di-on per grup.\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, 'antitagsw global off');
        } else if (arg === 'on') {
                const config = loadConfig();
                let globalAutoEnabled = false;
                if (!config.antiTagSW?.enabled) {
                        if (!m.isOwner) {
                                return tolak(hisoka, m, '❌ Fitur AntiTagSW dinonaktifkan secara global oleh owner bot.\nMinta owner aktifkan dengan perintah: *.antitagsw global on*');
                        }
                        if (!config.antiTagSW) config.antiTagSW = {};
                        config.antiTagSW.enabled = true;
                        saveConfig(config);
                        globalAutoEnabled = true;
                }
                toggleAntiTagSW(m.from, true);
                saveCekautoTimestamp('antiTagSWGrup', m.from);
                await sendConfirmWithButtons(hisoka, m,
                        `╭───〔 *✅ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                        `│\n` +
                        `│ 🟢 *Fitur AntiTagSW AKTIF!*\n` +
                        (globalAutoEnabled ? `│ 🌐 *Global juga diaktifkan otomatis!*\n` : '') +
                        `│\n` +
                        `│ ⚙️ Konfigurasi:\n` +
                        `│ • Maks. warning: *${config.antiTagSW?.maxWarnings ?? 3}x*\n` +
                        `│\n` +
                        `│ ℹ️ Anggota yang mentag grup lewat\n` +
                        `│    STATUS akan diperingatkan & dikick!\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`,
                        [{ text: '➕ Aktifkan Semua Grup', id: '__addallgrp__antiTagSWGrup' }]
                );
                logCommand(m, hisoka, 'antitagsw on');
        } else if (arg === 'off') {
                toggleAntiTagSW(m.from, false);
                await tolak(hisoka, m,
                        `╭───〔 *❌ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                        `│\n` +
                        `│ 🔴 *Fitur AntiTagSW NONAKTIF!*\n` +
                        `│\n` +
                        `│ ℹ️ Semua warning di grup ini\n` +
                        `│    juga telah direset.\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, 'antitagsw off');
        } else if (arg === 'reset') {
                resetWarnings(m.from);
                await tolak(hisoka, m, '✅ Semua warning AntiTagSW di grup ini telah direset!');
                logCommand(m, hisoka, 'antitagsw reset');

        } else if (arg.startsWith('warn')) {
                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mengubah batas warning!');
                const warnNum = parseInt((arg.replace(/^warn\s*/, '') || '').trim(), 10);
                if (!warnNum || isNaN(warnNum) || warnNum < 1 || warnNum > 100) {
                        return tolak(hisoka, m,
                                `╭───〔 *⚠️ ANTITAGSW WARN* 〕───╮\n` +
                                `│\n` +
                                `│ ❌ Angka tidak valid!\n` +
                                `│\n` +
                                `│ 📌 Format: *.antitagsw warn <angka>*\n` +
                                `│ 📌 Contoh: *.antitagsw warn 5*\n` +
                                `│\n` +
                                `│ ℹ️ Angka valid: *1 - 100*\n` +
                                `│\n` +
                                `╰────────────────────────────────────╯`
                        );
                }
                const config = loadConfig();
                if (!config.antiTagSW) config.antiTagSW = {};
                const oldMax = config.antiTagSW.maxWarnings ?? 3;
                config.antiTagSW.maxWarnings = warnNum;
                saveConfig(config);
                await tolak(hisoka, m,
                        `╭───〔 *⚠️ ANTITAGSW WARN* 〕───╮\n` +
                        `│\n` +
                        `│ ✅ Batas warning berhasil diubah!\n` +
                        `│\n` +
                        `│ 📊 Sebelum : *${oldMax}x*\n` +
                        `│ 📊 Sekarang: *${warnNum}x*\n` +
                        `│\n` +
                        `│ ℹ️ Anggota akan dikick setelah\n` +
                        `│    melanggar sebanyak *${warnNum}x*\n` +
                        `│\n` +
                        `│ 💾 Tersimpan ke config.json\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, `antitagsw warn ${warnNum}`);

        } else if (arg === 'add') {
                const config = loadConfig();
                if (!config.antiTagSW?.enabled) {
                        if (!m.isOwner) return tolak(hisoka, m, '❌ Fitur AntiTagSW dinonaktifkan secara global.\nMinta owner aktifkan dulu: *.antitagsw global on*');
                        if (!config.antiTagSW) config.antiTagSW = {};
                        config.antiTagSW.enabled = true;
                        saveConfig(config);
                }
                const alreadyAdded = isAntiTagSWEnabled(m.from);
                toggleAntiTagSW(m.from, true);
                await tolak(hisoka, m,
                        `╭───〔 *✅ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                        `│\n` +
                        `│ ${alreadyAdded ? '🔄 Grup ini *sudah terdaftar* sebelumnya.' : '➕ Grup ini berhasil *ditambahkan!*'}\n` +
                        `│\n` +
                        `│ 🌐 Global   : 🟢 Aktif\n` +
                        `│ 📌 Grup ini : 🟢 *Aktif*\n` +
                        `│\n` +
                        `│ ⚙️ Konfigurasi:\n` +
                        `│ • Maks. warning: *${config.antiTagSW?.maxWarnings ?? 3}x*\n` +
                        `│\n` +
                        `│ ℹ️ Anggota yang mentag grup lewat\n` +
                        `│    STATUS akan diperingatkan & dikick!\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, 'antitagsw add');

        } else if (arg === 'list') {
                if (!m.isOwner && !m.isAdmin) return tolak(hisoka, m, '❌ Hanya owner atau admin yang bisa melihat daftar ini!');
                const allGroups = getAllAntiTagSWGroups();
                if (!allGroups.length) {
                        return tolak(hisoka, m,
                                `╭───〔 *📋 DAFTAR ANTITAGSW* 〕───╮\n` +
                                `│\n` +
                                `│ ❌ Belum ada grup yang terdaftar.\n` +
                                `│\n` +
                                `│ Gunakan *.antitagsw add* di grup\n` +
                                `│ yang ingin diaktifkan.\n` +
                                `│\n` +
                                `╰────────────────────────────────────╯`
                        );
                }

                const botAdminCache = kvGet('botadmin/botadmin', {});
                const botNum = (hisoka.user?.id || '').split(':')[0].split('@')[0];

                const grupInfoList = [];
                for (let i = 0; i < allGroups.length; i++) {
                        const gid = allGroups[i];
                        let namaGrup = '-';
                        let totalMember = '?';
                        let totalAdmin = '?';
                        let botIsAdmin = botAdminCache[gid] === true;

                        try {
                                const meta = await hisoka.groupMetadata(gid);
                                if (meta) {
                                        namaGrup = meta.subject || '-';
                                        const participants = meta.participants || [];
                                        totalMember = participants.length;
                                        totalAdmin = participants.filter(p => p.admin).length;
                                        const botP = participants.find(p => {
                                                const pNum = (p.jid || p.id || '').split('@')[0].split(':')[0];
                                                return pNum === botNum;
                                        });
                                        botIsAdmin = botP !== undefined ? !!botP.admin : (botAdminCache[gid] === true);
                                }
                        } catch {
                                try {
                                        const cached = hisoka.groups?.read(gid);
                                        if (cached) {
                                                namaGrup = cached.subject || '-';
                                                const participants = cached.participants || [];
                                                totalMember = participants.length;
                                                totalAdmin = participants.filter(p => p.admin).length;
                                        }
                                } catch {}
                        }

                        const warnings = getWarnings(gid);
                        const totalWarned = Object.keys(warnings).length;
                        grupInfoList.push({ gid, namaGrup, totalMember, totalAdmin, totalWarned, botIsAdmin });
                }

                let listBaris = '';
                for (let i = 0; i < grupInfoList.length; i++) {
                        const { gid, namaGrup, totalMember, totalAdmin, totalWarned, botIsAdmin } = grupInfoList[i];
                        listBaris +=
                                `│ *${i + 1}.* ${namaGrup}\n` +
                                `│    🆔 \`${gid}\`\n` +
                                `│    👥 Anggota : *${totalMember}* | 🛡️ Admin: *${totalAdmin}*\n` +
                                `│    🤖 Bot Admin: ${botIsAdmin ? '✅ Ya' : '❌ Bukan'}\n` +
                                `│    ⚠️ Warned  : *${totalWarned} orang*\n` +
                                `│\n`;
                }

                const listText =
                        `╭───〔 *📋 DAFTAR ANTITAGSW* 〕───╮\n` +
                        `│\n` +
                        `│ 🟢 Total aktif: *${allGroups.length} grup*\n` +
                        `│\n` +
                        listBaris +
                        `│ ─────────────────────────────────\n` +
                        `│ 🗑️ *Cara hapus:*\n` +
                        `│ Reply pesan ini dengan nomor urut\n` +
                        `│ Contoh: *1* atau *1,2* atau *1,2,3*\n` +
                        `│\n` +
                        `│ Ketik *semua* → hapus semua grup\n` +
                        `│ Ketik *reset* → reset warning semua\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`;

                if (!global.__antiTagSWListSessions) global.__antiTagSWListSessions = new Map();
                const sentList = await hisoka.sendMessage(m.from, { text: listText }, { quoted: m }).catch(() => null);
                if (sentList?.key?.id) {
                        global.__antiTagSWListSessions.set(sentList.key.id, {
                                groups: grupInfoList,
                                from: m.from,
                                by: m.sender || m.key?.participant || m.from,
                                ts: Date.now()
                        });
                        setTimeout(() => global.__antiTagSWListSessions?.delete(sentList.key.id), 5 * 60 * 1000);
                }
                logCommand(m, hisoka, 'antitagsw list');

        } else if (arg === 'log' || arg.startsWith('log ')) {
                const logSub = arg.slice(3).trim();

                if (logSub === 'clear all') {
                        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa clear semua log!');
                        clearAntiTagSWLog();
                        return tolak(hisoka, m, '✅ Semua log AntiTagSW berhasil dihapus!');
                }

                if (logSub === 'clear') {
                        clearAntiTagSWLog(m.from);
                        return tolak(hisoka, m, '✅ Log AntiTagSW grup ini berhasil dihapus!');
                }

                const showAll = (logSub === 'all') && m.isOwner;
                const rawLogs = getAntiTagSWLog(showAll ? null : m.from);

                if (!rawLogs.length) {
                        return tolak(hisoka, m,
                                `╭───〔 *📜 LOG ANTITAGSW* 〕───╮\n` +
                                `│\n` +
                                `│ ℹ️ Belum ada riwayat pelanggaran${showAll ? '' : ' di grup ini'}.\n` +
                                `│\n` +
                                `│ 📋 Sub-perintah:\n` +
                                `│ • *.antitagsw log*       → Log grup ini\n` +
                                (m.isOwner ? `│ • *.antitagsw log all*   → Semua grup\n` : '') +
                                `│ • *.antitagsw log clear* → Hapus log grup ini\n` +
                                (m.isOwner ? `│ • *.antitagsw log clear all* → Hapus semua\n` : '') +
                                `│\n` +
                                `╰────────────────────────────────────╯`
                        );
                }

                const _fmtWaktu = (ts) => new Date(ts).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                });
                const _fmtAction = (l) => l.action === 'kick' ? `🔴 KICK` : `🟡 WARN ${l.warnCount}/${l.maxWarn}`;

                const totalWarn = rawLogs.filter(l => l.action === 'warn').length;
                const totalKick = rawLogs.filter(l => l.action === 'kick').length;

                if (showAll) {
                        const byGid = {};
                        for (const l of rawLogs) {
                                if (!byGid[l.gid]) byGid[l.gid] = [];
                                byGid[l.gid].push(l);
                        }
                        const uniqueGids = Object.keys(byGid);

                        const namaGrupCache = {};
                        await Promise.all(uniqueGids.map(async (gid) => {
                                try {
                                        const mt = await hisoka.groupMetadata(gid);
                                        namaGrupCache[gid] = mt?.subject || gid.split('@')[0];
                                } catch {
                                        try { namaGrupCache[gid] = hisoka.groups?.read(gid)?.subject || gid.split('@')[0]; }
                                        catch { namaGrupCache[gid] = gid.split('@')[0]; }
                                }
                        }));

                        const GRUP_PER_MSG = 5;
                        const header =
                                `╭───〔 *📜 LOG ANTITAGSW — SEMUA GRUP* 〕───╮\n` +
                                `│\n` +
                                `│ 🏘️ Jumlah grup: *${uniqueGids.length}*\n` +
                                `│ 📊 Total log  : *${rawLogs.length}*\n` +
                                `│ 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n` +
                                `│\n` +
                                `╰────────────────────────────────────╯`;

                        for (let gi = 0; gi < uniqueGids.length; gi += GRUP_PER_MSG) {
                                const batch = uniqueGids.slice(gi, gi + GRUP_PER_MSG);
                                let batchTxt = '';
                                for (const gid of batch) {
                                        const logs = byGid[gid].slice(-10).reverse();
                                        const gWarn = byGid[gid].filter(l => l.action === 'warn').length;
                                        const gKick = byGid[gid].filter(l => l.action === 'kick').length;
                                        batchTxt +=
                                                `┌─〔 *🏘️ ${namaGrupCache[gid]}* 〕\n` +
                                                `│ 📊 Total: *${byGid[gid].length}* | 🟡 ${gWarn} warn | 🔴 ${gKick} kick\n` +
                                                `│ (${logs.length} terbaru)\n` +
                                                `│\n`;
                                        for (let i = 0; i < logs.length; i++) {
                                                const l = logs[i];
                                                batchTxt +=
                                                        `│ *${i + 1}.* ${_fmtAction(l)}\n` +
                                                        `│    👤 ${l.senderJid?.includes('@lid') ? (r=>r?('@'+r.number+(r.name?' ('+r.name+')':'')):'⚠️ ID tidak dikenal (LID)')(resolveLidFromContacts(l.senderJid)) : '@'+l.senderNum}\n` +
                                                        `│    📡 ${l.method || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n` +
                                                        `│\n`;
                                        }
                                        batchTxt += `└────────────────────────────────\n\n`;
                                }
                                const finalTxt = gi === 0 ? header + '\n\n' + batchTxt.trim() : batchTxt.trim();
                                await tolak(hisoka, m, finalTxt);
                                if (gi + GRUP_PER_MSG < uniqueGids.length) await new Promise(r => setTimeout(r, 600));
                        }

                } else {
                        const recentLogs = rawLogs.slice(-25).reverse();
                        let logBaris = '';
                        for (let i = 0; i < recentLogs.length; i++) {
                                const l = recentLogs[i];
                                logBaris +=
                                        `│ *${i + 1}.* ${_fmtAction(l)}\n` +
                                        `│    👤 ${l.senderJid?.includes('@lid') ? (r=>r?('@'+r.number+(r.name?' ('+r.name+')':'')):'⚠️ ID tidak dikenal (LID)')(resolveLidFromContacts(l.senderJid)) : '@'+l.senderNum}\n` +
                                        `│    📡 ${l.method || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n` +
                                        `│\n`;
                        }
                        await tolak(hisoka, m,
                                `╭───〔 *📜 LOG ANTITAGSW* 〕───╮\n` +
                                `│\n` +
                                `│ 📊 Total log grup ini: *${rawLogs.length}*\n` +
                                `│ 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n` +
                                `│ (Tampil 25 terbaru)\n` +
                                `│\n` +
                                logBaris +
                                `│ 📋 Sub-perintah:\n` +
                                `│ • *.antitagsw log*       → Log grup ini\n` +
                                (m.isOwner ? `│ • *.antitagsw log all*   → Semua grup\n` : '') +
                                `│ • *.antitagsw log clear* → Hapus log grup ini\n` +
                                (m.isOwner ? `│ • *.antitagsw log clear all* → Hapus semua\n` : '') +
                                `│\n` +
                                `╰────────────────────────────────────╯`
                        );
                }
                logCommand(m, hisoka, 'antitagsw log');

        } else {
                const config = loadConfig();
                const isEnabled = isAntiTagSWEnabled(m.from);
                const globalEnabled = config.antiTagSW?.enabled ?? false;
                const warnings = getWarnings(m.from);
                const totalWarned = Object.keys(warnings).length;

                let grupStatus;
                if (isEnabled) {
                        grupStatus = '🟢 Aktif';
                } else if (globalEnabled) {
                        grupStatus = '🔴 Nonaktif *(belum ditambahkan)*';
                } else {
                        grupStatus = '🔴 Nonaktif';
                }

                const hintAdd = globalEnabled && !isEnabled
                        ? `│ 💡 Ketik *.antitagsw add* untuk\n│    mengaktifkan di grup ini!\n│\n`
                        : '';

                let statusText =
                        `╭───〔 *ℹ️ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                        `│\n` +
                        `│ 🌐 Global   : ${globalEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
                        `│ 📌 Grup ini : ${grupStatus}\n` +
                        `│\n` +
                        `│ ⚙️ Konfigurasi:\n` +
                        `│ • Maks. warning: *${config.antiTagSW?.maxWarnings ?? 3}x*\n` +
                        `│ • Member warned: *${totalWarned} orang*\n` +
                        `│\n` +
                        `│ ℹ️ Mendeteksi tag grup via STATUS\n` +
                        `│\n` +
                        hintAdd +
                        `│ 📋 Cara penggunaan:\n` +
                        `│ • *.antitagsw add*      → Tambah grup ini\n` +
                        `│ • *.antitagsw on*       → Aktifkan\n` +
                        `│ • *.antitagsw off*      → Nonaktifkan\n` +
                        `│ • *.antitagsw reset*    → Reset warning\n` +
                        `│ • *.antitagsw list*     → Daftar grup aktif\n` +
                        `│ • *.antitagsw log*      → Riwayat pelanggaran\n` +
                        (m.isOwner ?
                        `│ • *.antitagsw warn <n>* → Set maks warning\n` +
                        `│ • *.antitagsw log all*  → Log semua grup\n` +
                        `│ • *.antitagsw global on*  → Aktifkan global\n` +
                        `│ • *.antitagsw global off* → Nonaktifkan global\n` : '') +
                        `│\n` +
                        `╰────────────────────────────────────╯`;

                await tolak(hisoka, m, statusText);
        }
}

module.exports = { handleAntitagsw };
