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
 *  ceksw.cjs — Cek SW tracking command
 *  Perintah .ceksw untuk tampilkan status dan statistik tracking story status WA
 * ───────────────────────────────
 */
'use strict';

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleCeksw({ hisoka, m, query, tolak, logCommand, fs, path, loadConfig, saveConfig, getJadibotNumber, pruneSwStatsAt, countActiveSW, getJadibotEmojiMode }) {
        if (!m.prefix && m.query) return;
        if (!m.isOwner) return;
        try {
                const isJadibot    = hisoka?.isMainBot === false;
                const jadibotNum   = isJadibot ? getJadibotNumber(hisoka) : null;
                const _botNum      = jadibotNum || hisoka.user?.id?.split(':')[0] || '';
                const swStatsPath  = isJadibot
                        ? path.join(process.cwd(), 'data_jadibot', jadibotNum, 'ceksw', 'swstats.json')
                        : path.join(process.cwd(), 'data', 'ceksw', 'swstats.json');
                const swTrackDir   = isJadibot
                        ? path.join(process.cwd(), 'data_jadibot', jadibotNum, 'swtrack', 'users')
                        : path.join(process.cwd(), 'data', 'swtrack', 'users');

                const qLower = query ? query.trim().toLowerCase() : '';

                if (qLower === 'on' || qLower === 'off') {
                        const cfg   = loadConfig();
                        const nowOn = qLower === 'on';
                        const wasOn = cfg.cekswTracking !== false;
                        if (nowOn === wasOn) {
                                await tolak(hisoka, m, `ℹ️ Tracking SW stats sudah *${nowOn ? 'aktif' : 'nonaktif'}* sebelumnya.`);
                                return;
                        }
                        cfg.cekswTracking = nowOn;
                        saveConfig(cfg);
                        await hisoka.sendMessage(m.from, { react: { text: nowOn ? '✅' : '❌', key: m.key } });
                        await tolak(hisoka, m,
                                `╭══『 📊 *CEK SW TRACKING* 』══╮\n│\n` +
                                `│ ${nowOn ? '✅ Tracking *diaktifkan*' : '❌ Tracking *dinonaktifkan*'}\n│\n` +
                                `│ _Data ${nowOn ? 'mulai direkam lagi' : 'tidak direkam sementara'}_\n│\n╰══════════════════════════╯`
                        );
                        logCommand(m, hisoka, `ceksw ${qLower}`);
                        return;
                }

                if (qLower === 'reset') {
                        if (fs.existsSync(swStatsPath)) fs.writeFileSync(swStatsPath, '{}', 'utf-8');
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        await tolak(hisoka, m,
                                `╭══『 🗑️ *RESET SW STATS* 』══╮\n│\n│ ✅ Data berhasil direset!\n│ Semua data mulai dari 0 lagi.\n│\n╰══════════════════════════╯`
                        );
                        logCommand(m, hisoka, 'ceksw reset');
                        return;
                }

                pruneSwStatsAt(swStatsPath);

                let stats = {};
                if (fs.existsSync(swStatsPath)) {
                        try { stats = JSON.parse(fs.readFileSync(swStatsPath, 'utf-8')); } catch {}
                }

                const emojiStats = stats._emojiStats || {};
                const entries    = Object.values(stats).filter(e => e && e.number);

                if (entries.length === 0) {
                        await tolak(hisoka, m,
                                `╭══『 📊 *CEK SW STATS* 』══╮\n│\n│ ⚠️ Belum ada data SW yang tercatat.\n│\n` +
                                `│ _Pastikan Auto Read Story aktif_\n│ _ketik .readsw untuk cek status_\n│\n╰══════════════════════════╯`
                        );
                        return;
                }

                const getActiveSW = (e) => countActiveSW(e.activeSW);

                // ── SwTrack: baca folder users ──
                const swTrackedNums = new Set();
                const swRetryMap    = {};
                try {
                        if (fs.existsSync(swTrackDir)) {
                                const files = fs.readdirSync(swTrackDir).filter(f => f.endsWith('.json'));
                                for (const file of files) {
                                        const num = file.replace('.json', '');
                                        swTrackedNums.add(num);
                                        try {
                                                const uData = JSON.parse(fs.readFileSync(path.join(swTrackDir, file), 'utf-8'));
                                                const retriedEntries = Object.values(uData).filter(e => e && e.retriedOnStartup === true);
                                                if (retriedEntries.length > 0) {
                                                        const suksesEntries = retriedEntries.filter(e => e.reacted === true);
                                                        const sukses = suksesEntries.length;
                                                        const gagal  = retriedEntries.length - sukses;
                                                        const emojiCount = {};
                                                        for (const e of suksesEntries) {
                                                                if (e.emoji) emojiCount[e.emoji] = (emojiCount[e.emoji] || 0) + 1;
                                                        }
                                                        const withName = retriedEntries.find(e => e.name) || Object.values(uData).find(e => e && e.name);
                                                        const name   = withName?.name || num;
                                                        const lastAt = retriedEntries.map(e => e.retriedAt || e.updatedAt || '').filter(Boolean).sort().pop() || null;
                                                        swRetryMap[num] = { total: retriedEntries.length, sukses, gagal, emojiCount, name, lastAt };
                                                }
                                        } catch {}
                                }
                        }
                } catch {}

                for (const [num, info] of Object.entries(swRetryMap)) {
                        if (!info.name || info.name === num) {
                                const found = entries.find(e => e.number === num);
                                if (found?.name) info.name = found.name;
                        }
                }

                const isTracked = (number) => swTrackedNums.has(String(number).replace(/[^0-9]/g, ''));

                const sorted         = [...entries].sort((a, b) => (b.reactions || 0) - (a.reactions || 0) || (b.reads || 0) - (a.reads || 0));
                const top10          = sorted.slice(0, 10);
                const totalReads     = entries.reduce((s, e) => s + (e.reads || 0), 0);
                const totalReactions = entries.reduce((s, e) => s + (e.reactions || 0), 0);
                const totalActiveSW  = entries.reduce((s, e) => s + getActiveSW(e), 0);

                const topBySW = [...entries].filter(e => getActiveSW(e) > 0).sort((a, b) => getActiveSW(b) - getActiveSW(a)).slice(0, 10);
                const topRetry = Object.entries(swRetryMap).sort((a, b) => b[1].sukses - a[1].sukses || a[1].gagal - b[1].gagal || b[1].total - a[1].total).slice(0, 10);
                const sortedEmojis = Object.entries(emojiStats).sort((a, b) => b[1] - a[1]).slice(0, 10);

                const fmtPct = (val, total) => {
                        if (!total) return '0%';
                        const p = (val / total) * 100;
                        return p >= 10 ? `${Math.round(p)}%` : `${p.toFixed(1)}%`;
                };
                const medals = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                const now = new Date().toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit',
                        day: '2-digit', month: 'short', year: 'numeric'
                });

                let text = `╭══『 📊 *CEK SW STATS* 』══╮\n│\n`;
                text += `│ 🕐 *Update:* ${now} WIB\n│ 👥 *Total orang:* ${entries.length}\n`;
                text += `│ 🗂️ *Terdaftar SwTrack:* ${swTrackedNums.size}\n│ 🟢 *SW aktif sekarang:* ${totalActiveSW} story\n`;
                text += `│ 👁️ *Total read:* ${totalReads}\n│ ✨ *Total reaction:* ${totalReactions}\n│\n`;

                if (topBySW.length > 0) {
                        text += `├──『 🟢 *SW AKTIF SEKARANG* 』\n`;
                        for (let i = 0; i < topBySW.length; i++) {
                                const e = topBySW[i]; const active = getActiveSW(e);
                                const swt = isTracked(e.number) ? ' 🗂️' : '';
                                text += `│ ${medals[i]} *${e.name || e.number}*${swt} : ${active} SW\n`;
                        }
                        text += `│\n`;
                }

                text += `├──『 🏆 *TOP ${top10.length} TERBANYAK DI-REACT* 』\n`;
                for (let i = 0; i < top10.length; i++) {
                        const e = top10[i]; const swt = isTracked(e.number) ? ' 🗂️' : '';
                        text += `│ ${medals[i]} ${e.name || e.number}${swt} : ×${e.reactions || 0}\n`;
                }
                text += `│\n`;

                if (topRetry.length > 0) {
                        const totalAllRetry  = topRetry.reduce((s, [, r]) => s + r.total, 0);
                        const totalSuksesAll = topRetry.reduce((s, [, r]) => s + r.sukses, 0);
                        const totalGagalAll  = topRetry.reduce((s, [, r]) => s + r.gagal, 0);
                        text += `├──『 ♻️ *TOP STARTUP RETRY* 』\n`;
                        text += `│ 📦 Total: ${totalAllRetry} SW  ✅${totalSuksesAll} berhasil  ❌${totalGagalAll} gagal\n│\n`;
                        for (let i = 0; i < topRetry.length; i++) {
                                const [num, r] = topRetry[i]; const nama = r.name || num;
                                let waktu = '';
                                if (r.lastAt) {
                                        try { waktu = new Date(r.lastAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }); } catch {}
                                }
                                const sukBadge  = r.sukses > 0 ? `✅ ${r.sukses} berhasil` : '';
                                const gaiBadge  = r.gagal  > 0 ? `❌ ${r.gagal} gagal`    : '';
                                const badge     = [sukBadge, gaiBadge].filter(Boolean).join('  ');
                                const emojiLine = r.emojiCount && Object.keys(r.emojiCount).length > 0
                                        ? '│    ' + Object.entries(r.emojiCount).sort((a, b) => b[1] - a[1]).map(([em, ct]) => ct > 1 ? `${em} ${ct}x` : em).join('  ')
                                        : '';
                                text += `│ ${medals[i]} *${nama}*\n│    ↳ ${r.total}x retry  ${badge}\n`;
                                if (emojiLine) text += `${emojiLine}\n`;
                                if (waktu)     text += `│    🕐 ${waktu} WIB\n`;
                        }
                        text += `│\n`;
                }

                if (sortedEmojis.length > 0) {
                        const totalEmojiUsed = Object.values(emojiStats).reduce((s, c) => s + c, 0);
                        text += `├──『 😎 *TOP EMOJI REACTION* 』\n`;
                        for (let i = 0; i < sortedEmojis.length; i++) {
                                const [emoji, count] = sortedEmojis[i];
                                text += `│ ${medals[i]} ${emoji}  ×${count}  (${fmtPct(count, totalEmojiUsed)})\n`;
                        }
                        text += `│\n`;
                }

                const trackingOn  = loadConfig().cekswTracking !== false;
                const _rawMode    = getJadibotEmojiMode ? getJadibotEmojiMode(_botNum) : 'default';
                const _isCustom   = String(_rawMode).toLowerCase() === 'custom';
                const _emojiLabel = _isCustom ? '🟢 Custom' : '🔵 Default';
                text += `╰══════════════════════════╯\n`;
                text += `_💾 Realtime • Tracking: ${trackingOn ? '✅ ON • .ceksw off untuk matikan' : '❌ OFF • .ceksw on untuk aktifkan'} • .ceksw reset hapus data_\n`;
                text += `_🗂️ = terdaftar SwTrack • ♻️ = SW diproses ulang saat bot nyala_\n`;
                text += `_🎭 EmojiMode bot ini: *${_emojiLabel}*_`;

                await tolak(hisoka, m, text);
                logCommand(m, hisoka, 'ceksw');
        } catch (error) {
                console.error('\x1b[31m[CekSW] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `❌ Error: ${error.message}`);
        }
}

module.exports = { handleCeksw };
