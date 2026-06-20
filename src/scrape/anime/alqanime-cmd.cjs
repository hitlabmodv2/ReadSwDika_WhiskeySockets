'use strict';

const path = require('path');

/**
 * Handle pending alqupdate list choice.
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleAlqUpdateChoice({
        hisoka, m, fs,
        pendingAlqUpdateChoices, pendingAlqDlChoices,
        getJadibotChoiceKey, getQuotedStanzaId,
        pickBestAlqLink, getAllAlqLinksByPriority, formatAlqLinkMsg,
        tolak, logError,
}) {
        const alqUpdKey = getJadibotChoiceKey(m);
        if (!pendingAlqUpdateChoices.has(alqUpdKey)) return false;

        const pendingUpd = pendingAlqUpdateChoices.get(alqUpdKey);
        const quotedId   = getQuotedStanzaId(m);
        const isReplyToMenu = m.isQuoted && (!pendingUpd.botMsgId || quotedId === pendingUpd.botMsgId);
        const rawChoice  = String(m.text || '').trim();

        if (!(isReplyToMenu && rawChoice && !m.prefix)) return false;

        if (pendingUpd.expiresAt <= Date.now()) {
                pendingAlqUpdateChoices.delete(alqUpdKey);
                await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.alqupdate` lagi.');
                return true;
        }
        if (/^(batal|cancel)$/i.test(rawChoice)) {
                if (pendingUpd.timeout) clearTimeout(pendingUpd.timeout);
                pendingAlqUpdateChoices.delete(alqUpdKey);
                await tolak(hisoka, m, '✅ Dibatalkan.');
                return true;
        }

        const updMatch = rawChoice.match(/^(\d+)(?:\s+(360p|480p|720p|1080p))?$/i);
        if (!updMatch) return false;

        if (pendingUpd.timeout) clearTimeout(pendingUpd.timeout);
        pendingAlqUpdateChoices.delete(alqUpdKey);

        const chosenIdx = parseInt(updMatch[1], 10) - 1;
        const prefRes   = (updMatch[2] || '').toLowerCase() || null;
        const items     = pendingUpd.items;

        if (chosenIdx < 0 || chosenIdx >= items.length) {
                await tolak(hisoka, m, `❌ Nomor tidak valid. Pilih 1–${items.length}.`);
                return true;
        }

        const chosen = items[chosenIdx];
        await hisoka.sendMessage(m.from, { react: { text: '📡', key: m.key } });
        await tolak(hisoka, m, `📡 Mengambil detail *${chosen.title}*...`);

        try {
                const _alqPath = path.resolve('./src/scrape/anime/alqanime.cjs');
                delete require.cache[_alqPath];
                const { getDetailAlqanime } = require(_alqPath);
                const detail = await getDetailAlqanime(chosen.url);
                const eps    = detail.episodes || [];

                if (!eps.length) {
                        await tolak(hisoka, m, `❌ Tidak ada episode/link download ditemukan untuk *${detail.title}*.`);
                        return true;
                }

                // Jika ada resolusi pilihan dan hanya 1 episode terbaru → langsung download
                if (prefRes && eps.length === 1) {
                        const ep   = eps[0];
                        const link = pickBestAlqLink(ep.links, prefRes);
                        if (!link) {
                                await tolak(hisoka, m, `❌ Resolusi *${prefRes.toUpperCase()}* tidak tersedia. Coba resolusi lain.`);
                                return true;
                        }

                        const _dlPath = path.resolve('./src/scrape/anime/alqanime-dl.cjs');
                        delete require.cache[_dlPath];
                        const { resolveDirectLink: alqResolve, downloadToTmp: alqDownload, formatSize: alqSize } = require(_dlPath);

                        const allLinks = getAllAlqLinksByPriority(ep.links, prefRes);
                        const progMsg = await tolak(hisoka, m,
                                `📥 *Mempersiapkan download...*\n🎌 ${detail.title}\n📺 Ep ${ep.episode} — ${link.res.toUpperCase()} (${link.host})`
                        );
                        const tmpDir  = path.join(process.cwd(), 'tmp');
                        let resolved;
                        let allOuo = true;
                        for (const candidate of allLinks) {
                                try {
                                        await m.reply({ edit: progMsg.key, text: `🔍 Mencoba host *${candidate.host}*...` });
                                        resolved = await alqResolve(candidate.url);
                                        allOuo = false;
                                        break;
                                } catch (re) {
                                        if (!re.message?.includes('ouo.io:blocked')) allOuo = false;
                                }
                        }
                        if (!resolved) {
                                if (allOuo) {
                                        const epResList = ['360p','480p','720p','1080p'].filter(r => ep.links[r]?.length);
                                        await hisoka.sendMessage(m.from, { react: { text: '🔗', key: m.key } });
                                        await m.reply({ edit: progMsg.key, text: `🔗 *Link ouo.io — buka manual di browser*\n_Bot tidak bisa download otomatis karena ouo.io memblokir server._` });
                                        await hisoka.sendMessage(m.from, { text: formatAlqLinkMsg(detail.title, ep, prefRes, epResList) }, { quoted: m });
                                } else {
                                        await m.reply({ edit: progMsg.key, text: `❌ Semua host gagal. Coba lagi nanti.` });
                                }
                                return true;
                        }
                        const { directUrl, fileName, host, size } = resolved;
                        const sizeStr = alqSize(size);
                        const MAX_BYTES = 1.9 * 1024 * 1024 * 1024;
                        if (size && size > MAX_BYTES) {
                                await m.reply({ edit: progMsg.key, text: `❌ File terlalu besar (${sizeStr}). Maks ~1.9 GB.` });
                                return true;
                        }
                        await m.reply({ edit: progMsg.key, text: `📥 *Download Ep ${ep.episode}*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[░░░░░░░░░░] 0%` });
                        const tmpFile = path.join(tmpDir, `alqupd_${Date.now()}_${fileName}`);
                        try {
                                await alqDownload(directUrl, tmpFile, async (done, total, pct) => {
                                        const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
                                        try { await m.reply({ edit: progMsg.key, text: `📥 *Download Ep ${ep.episode}*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[${bar}] ${pct}% (${alqSize(done)})` }); } catch (_) {}
                                });
                                await m.reply({ edit: progMsg.key, text: `📤 Mengirim file...` });
                                const fileBuf = fs.readFileSync(tmpFile);
                                const ext     = path.extname(fileName).toLowerCase();
                                const isVid   = ['.mp4', '.mkv', '.avi', '.webm'].includes(ext);
                                if (isVid) {
                                        await hisoka.sendMessage(m.from, { video: fileBuf, mimetype: 'video/mp4', fileName, caption: `🎬 *${detail.title}*\n📺 Episode ${ep.episode}\n💾 ${sizeStr} | 🏠 ${host}` }, { quoted: m });
                                } else {
                                        await hisoka.sendMessage(m.from, { document: fileBuf, mimetype: 'application/octet-stream', fileName, caption: `📄 *${fileName}*\n💾 ${sizeStr}` }, { quoted: m });
                                }
                                await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}` });
                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        } finally {
                                try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
                        }
                        return true;
                }

                // Tampilkan episode menu & daftarkan ke pendingAlqDlChoices
                const allRes = new Set();
                for (const ep of eps) for (const r of Object.keys(ep.links)) if (r !== 'batch') allRes.add(r);
                const resList = ['360p','480p','720p','1080p'].filter(r => allRes.has(r));

                let dlMenu = `📥 *PILIH EPISODE & RESOLUSI*\n`;
                dlMenu += `━━━━━━━━━━━━━━━━━━━\n`;
                dlMenu += `🎌 *${detail.title}*\n\n`;
                dlMenu += `*Daftar Episode (${eps.length}):*\n`;
                const maxShow = Math.min(eps.length, 15);
                eps.slice(0, maxShow).forEach((ep, i) => {
                        const epRes = Object.keys(ep.links).filter(r => r !== 'batch');
                        dlMenu += `${i + 1}. Ep ${ep.episode}`;
                        if (epRes.length) dlMenu += ` _(${epRes.join('/')})_`;
                        dlMenu += `\n`;
                });
                if (eps.length > maxShow) dlMenu += `_...dan ${eps.length - maxShow} episode lainnya_\n`;
                dlMenu += `\n`;
                if (resList.length) dlMenu += `📺 Resolusi: *${resList.join(' | ')}*\n`;
                dlMenu += `\n━━━━━━━━━━━━━━━━━━━\n`;
                dlMenu += `📌 *Reply pesan ini:*\n`;
                dlMenu += `• *1 720p* — 1 episode, kirim video\n`;
                dlMenu += `• *1-3 480p* — batch ep 1-3 (ZIP)\n`;
                dlMenu += `• *all 360p* — semua episode (ZIP)\n`;
                dlMenu += `⏳ Menu berlaku *5 menit*`;

                const menuMsg = await hisoka.sendMessage(m.from, { text: dlMenu }, { quoted: m });
                const oldAlq  = pendingAlqDlChoices.get(alqUpdKey);
                if (oldAlq?.timeout) clearTimeout(oldAlq.timeout);
                const alqTimeout = setTimeout(() => pendingAlqDlChoices.delete(alqUpdKey), 5 * 60 * 1000);
                pendingAlqDlChoices.set(alqUpdKey, {
                        animeTitle: detail.title,
                        episodes: eps,
                        botMsgId: menuMsg?.key?.id || '',
                        expiresAt: Date.now() + 5 * 60 * 1000,
                        timeout: alqTimeout,
                });
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[ALQUPDATE_CHOICE] Error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqupdate_choice');
                await tolak(hisoka, m, `❌ Gagal ambil detail.\n💬 ${err?.message?.slice(0, 120) || 'Coba lagi nanti'}`);
        }
        return true;
}

/**
 * Handle pending alqanime download choice.
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleAlqDlChoice({
        hisoka, m, fs,
        pendingAlqDlChoices,
        getJadibotChoiceKey, getQuotedStanzaId,
        pickBestAlqLink, getAllAlqLinksByPriority, formatAlqLinkMsg,
        tolak, logError,
}) {
        const alqKey = getJadibotChoiceKey(m);
        if (!pendingAlqDlChoices.has(alqKey)) return false;

        const pendingAlq = pendingAlqDlChoices.get(alqKey);
        const quotedId   = getQuotedStanzaId(m);
        const isReplyToMenu = m.isQuoted && (!pendingAlq.botMsgId || quotedId === pendingAlq.botMsgId);
        const rawChoice  = String(m.text || '').trim();

        if (!(isReplyToMenu && rawChoice && !m.prefix)) return false;

        if (pendingAlq.expiresAt <= Date.now()) {
                pendingAlqDlChoices.delete(alqKey);
                await tolak(hisoka, m, '⏳ Menu download sudah kedaluwarsa. Ketik `.alq` lagi.');
                return true;
        }
        if (/^(batal|cancel)$/i.test(rawChoice)) {
                if (pendingAlq.timeout) clearTimeout(pendingAlq.timeout);
                pendingAlqDlChoices.delete(alqKey);
                await tolak(hisoka, m, '✅ Download dibatalkan.');
                return true;
        }
        if (pendingAlq.downloading) {
                await tolak(hisoka, m, '⏳ Sedang memproses download sebelumnya, harap tunggu...');
                return true;
        }

        const choiceMatch = rawChoice.match(/^(all|\d[\d,\-\s]*)(?:\s+(360p|480p|720p|1080p))?$/i);
        if (!choiceMatch) return false;

        pendingAlq.downloading = true;
        if (pendingAlq.timeout) clearTimeout(pendingAlq.timeout);
        pendingAlqDlChoices.delete(alqKey);

        const episodes  = pendingAlq.episodes;
        const prefRes   = (choiceMatch[2] || '').toLowerCase() || null;
        const idxPart   = choiceMatch[1].trim().toLowerCase();
        const isBatch_pre = idxPart === 'all';

        const epIndices = [];
        if (isBatch_pre) {
                for (let i = 0; i < episodes.length; i++) epIndices.push(i);
        } else if (idxPart.includes('-')) {
                const [a, b] = idxPart.split('-').map(n => parseInt(n.trim(), 10));
                for (let i = a; i <= b; i++) if (i >= 1 && i <= episodes.length) epIndices.push(i - 1);
        } else {
                idxPart.split(',').forEach(n => {
                        const idx = parseInt(n.trim(), 10) - 1;
                        if (idx >= 0 && idx < episodes.length) epIndices.push(idx);
                });
        }

        const uniqueIdx = [...new Set(epIndices)].slice(0, 10);
        const isBatch   = uniqueIdx.length > 1;

        if (!uniqueIdx.length) {
                await tolak(hisoka, m, `❌ Episode tidak ditemukan. Pilih angka 1-${episodes.length}.`);
                return true;
        }

        const _dlPath2 = path.resolve('./src/scrape/anime/alqanime-dl.cjs');
        delete require.cache[_dlPath2];
        const { resolveDirectLink: alqResolve, downloadToTmp: alqDownload, formatSize: alqSize } = require(_dlPath2);

        await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });
        const progMsg = await tolak(hisoka, m,
                `📥 *Mempersiapkan ${isBatch ? uniqueIdx.length + ' episode' : '1 episode'}...*\n` +
                `🎌 ${pendingAlq.animeTitle}\n` +
                `📺 Resolusi: ${prefRes ? prefRes.toUpperCase() : 'Auto'}`
        );

        const tmpFiles = [];
        const MAX_BYTES = 1.9 * 1024 * 1024 * 1024;
        const tmpDir    = path.join(process.cwd(), 'tmp');

        try {
                for (let i = 0; i < uniqueIdx.length; i++) {
                        const ep    = episodes[uniqueIdx[i]];
                        const link  = pickBestAlqLink(ep.links, prefRes);
                        const batchLbl = isBatch ? ` (${i + 1}/${uniqueIdx.length})` : '';

                        if (!link) {
                                throw new Error(`Ep ${ep.episode}: tidak ada link untuk resolusi ${prefRes || 'apapun'}`);
                        }

                        const allLinks = getAllAlqLinksByPriority(ep.links, prefRes);
                        let resolved;
                        let allOuoBatch = true;
                        for (const candidate of allLinks) {
                                try {
                                        await m.reply({ edit: progMsg.key, text: `🔍 Ep ${ep.episode}${batchLbl}: mencoba *${candidate.host}* (${candidate.res.toUpperCase()})...` });
                                        resolved = await alqResolve(candidate.url);
                                        allOuoBatch = false;
                                        break;
                                } catch (re) {
                                        if (!re.message?.includes('ouo.io:blocked')) allOuoBatch = false;
                                }
                        }
                        if (!resolved) {
                                if (allOuoBatch) {
                                        const epResList = ['360p','480p','720p','1080p'].filter(r => ep.links[r]?.length);
                                        await hisoka.sendMessage(m.from, { text: formatAlqLinkMsg(pendingAlq.animeTitle, ep, prefRes, epResList) }, { quoted: m });
                                        tmpFiles.push({ file: null, fileName: 'link_only', ep: ep.episode, host: 'ouo.io', sizeStr: '-' });
                                        continue;
                                }
                                throw new Error(`Ep ${ep.episode}: semua host gagal.`);
                        }

                        const { directUrl, fileName, host, size } = resolved;
                        const sizeStr = alqSize(size);

                        if (size && size > MAX_BYTES) {
                                throw new Error(`Ep ${ep.episode} terlalu besar (${sizeStr}). Maks ~1.9 GB.`);
                        }

                        await m.reply({
                                edit: progMsg.key,
                                text: `📥 *Download Ep ${ep.episode}${batchLbl}*\n` +
                                      `📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[░░░░░░░░░░] 0%`,
                        });

                        const tmpFile = path.join(tmpDir, `alqdl_${Date.now()}_${i}_${fileName}`);
                        tmpFiles.push({ file: tmpFile, fileName, ep: ep.episode, host, sizeStr });

                        await alqDownload(directUrl, tmpFile, async (done, total, pct) => {
                                const filled = Math.round(pct / 10);
                                const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
                                try {
                                        await m.reply({
                                                edit: progMsg.key,
                                                text: `📥 *Download Ep ${ep.episode}${batchLbl}*\n` +
                                                      `📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[${bar}] ${pct}% (${alqSize(done)})`,
                                        });
                                } catch (_) {}
                        });
                }

                // Kirim semua file
                const realFiles = tmpFiles.filter(t => t.file && fs.existsSync(t.file));
                if (!realFiles.length && tmpFiles.every(t => t.fileName === 'link_only')) {
                        await m.reply({ edit: progMsg.key, text: `🔗 Semua link dikirim lewat pesan di atas.` });
                        return true;
                }

                if (isBatch && realFiles.length > 0) {
                        await m.reply({ edit: progMsg.key, text: `📦 Membuat ZIP...` });
                        const { execSync } = require('child_process');
                        const zipName = `alqdl_batch_${Date.now()}.zip`;
                        const zipFile = path.join(tmpDir, zipName);
                        try {
                                const fileArgs = realFiles.map(f => `"${f.file}"`).join(' ');
                                execSync(`zip -j "${zipFile}" ${fileArgs}`, { timeout: 60000 });
                                const zipBuf = fs.readFileSync(zipFile);
                                const totalSize = alqSize(zipBuf.length);
                                await hisoka.sendMessage(m.from, {
                                        document: zipBuf,
                                        mimetype: 'application/zip',
                                        fileName: zipName,
                                        caption: `📦 *Batch Download*\n🎌 ${pendingAlq.animeTitle}\n📺 ${realFiles.length} episode\n💾 ${totalSize}`,
                                }, { quoted: m });
                                await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n📦 ${realFiles.length} episode dikemas & dikirim.` });
                        } finally {
                                try { if (fs.existsSync(zipFile)) fs.unlinkSync(zipFile); } catch (_) {}
                        }
                } else if (realFiles.length === 1) {
                        const f = realFiles[0];
                        const fileBuf = fs.readFileSync(f.file);
                        const ext   = path.extname(f.fileName).toLowerCase();
                        const isVid = ['.mp4', '.mkv', '.avi', '.webm'].includes(ext);
                        await m.reply({ edit: progMsg.key, text: `📤 Mengirim file...` });
                        if (isVid) {
                                await hisoka.sendMessage(m.from, { video: fileBuf, mimetype: 'video/mp4', fileName: f.fileName, caption: `🎬 *${pendingAlq.animeTitle}*\n📺 Episode ${f.ep}\n💾 ${f.sizeStr} | 🏠 ${f.host}` }, { quoted: m });
                        } else {
                                await hisoka.sendMessage(m.from, { document: fileBuf, mimetype: 'application/octet-stream', fileName: f.fileName, caption: `📄 *${f.fileName}*\n💾 ${f.sizeStr}` }, { quoted: m });
                        }
                        await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n📄 ${f.fileName}\n💾 ${f.sizeStr} | 🏠 ${f.host}` });
                }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[ALQDL_CHOICE] Error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqdl_choice');
                await tolak(hisoka, m, `❌ Gagal download.\n💬 ${err?.message?.slice(0, 120) || 'Coba lagi nanti'}`);
        } finally {
                for (const t of tmpFiles) {
                        if (t.file) try { if (fs.existsSync(t.file)) fs.unlinkSync(t.file); } catch (_) {}
                }
        }
        return true;
}

module.exports = { handleAlqUpdateChoice, handleAlqDlChoice };
