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
 *  cosplay-cmd.cjs — Cosplay command handler
 *  Perintah pencarian & download foto cosplay dari berbagai sumber
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Cosplay Command Handler
 *  Perintah .cosplay untuk pencarian & pengiriman foto cosplay
 *  dari berbagai sumber web, mendukung filter karakter & seri
 *  anime tertentu.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const path = require('path');

/**
 * Kirim semua gambar cosplay dalam 1 album (fallback batch 10).
 */
async function sendCosplayImages(sock, msg, post, dlFn, capFn, tag) {
        const total = post.images.length;
        const CONCUR = 5;
        const allItems = [];
        for (let i = 0; i < total; i += CONCUR) {
                const chunk = post.images.slice(i, i + CONCUR);
                const results = await Promise.allSettled(chunk.map(async (url, ci) => {
                        const buf = await dlFn(url);
                        return { image: buf, caption: capFn(post, { imgIndex: i + ci, imgTotal: total }) };
                }));
                for (const r of results) {
                        if (r.status === 'fulfilled') allItems.push(r.value);
                        else console.error(`${tag} Gagal unduh:`, r.reason?.message);
                }
        }
        if (allItems.length === 0) return;
        try {
                await sock.sendMessage(msg.from, { albumMessage: allItems }, { quoted: msg });
        } catch (_) {
                const BATCH = 10;
                for (let b = 0; b < allItems.length; b += BATCH) {
                        const batch = allItems.slice(b, b + BATCH);
                        try {
                                await sock.sendMessage(msg.from, { albumMessage: batch }, { quoted: b === 0 ? msg : undefined });
                        } catch (_2) {
                                for (const item of batch) {
                                        try { await sock.sendMessage(msg.from, { image: item.image, caption: item.caption }, { quoted: msg }); } catch (_3) {}
                                }
                        }
                }
        }
}

/**
 * Handle pending cosplaytele search choice.
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleCosplayChoice({
        hisoka, m,
        pendingCosplayChoices,
        getQuotedStanzaId,
        tolak, logCommand, logError,
}) {
        if (!pendingCosplayChoices.has(m.sender)) return false;

        const pendingCos = pendingCosplayChoices.get(m.sender);
        const rawChoice  = String(m.text || '').trim();
        const isReply    = m.isQuoted && pendingCos.botMsgId && getQuotedStanzaId(m) === pendingCos.botMsgId;
        const isValid    = isReply && /^\d+$/.test(rawChoice);

        if (!isValid) return false;

        if (pendingCos.expiresAt <= Date.now()) {
                pendingCosplayChoices.delete(m.sender);
                await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.cosplay <keyword>` lagi.');
                return true;
        }
        if (/^(batal|cancel)$/i.test(rawChoice)) {
                if (pendingCos.timeout) clearTimeout(pendingCos.timeout);
                pendingCosplayChoices.delete(m.sender);
                await tolak(hisoka, m, '✅ Dibatalkan.');
                return true;
        }
        if (pendingCos.loading) {
                await tolak(hisoka, m, '⏳ Sedang memproses pilihan sebelumnya...');
                return true;
        }

        const idx = parseInt(rawChoice) - 1;
        if (idx < 0 || idx >= pendingCos.results.length) {
                await tolak(hisoka, m, `❌ Pilih angka 1–${pendingCos.results.length}.`);
                return true;
        }

        pendingCos.loading = true;
        if (pendingCos.timeout) clearTimeout(pendingCos.timeout);
        pendingCosplayChoices.delete(m.sender);

        const chosen = pendingCos.results[idx];
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        const loadMsg = await tolak(hisoka, m,
                `⏳ Mengambil media dari *${chosen.title.slice(0, 60)}*...\nMohon tunggu ✨`
        );

        try {
                const { cosplayteleGetPost, downloadBuffer, formatCosplayteleCaption } = require(path.resolve('./SEMUA_FITUR/anime/cosplaytele.cjs'));
                const post = await cosplayteleGetPost(chosen.id);

                if (loadMsg?.key) {
                        try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                }

                const vidInfo = post.hasVideos ? ` | 🎬 ada video` : '';
                const caption0 = `╭─「 👘 *COSPLAYTELE* 」\n` +
                        `│ 📌 *${post.title.slice(0, 80)}*\n` +
                        `│ 🖼️ ${post.totalImages} foto${vidInfo}\n` +
                        `│ 🔗 ${post.link}\n` +
                        `│\n` +
                        `│ ℹ️ Mengirim ${post.images.length} foto...\n` +
                        `╰──────────────────────`;

                await tolak(hisoka, m, caption0);
                await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });

                if (post.images.length > 0) {
                        await sendCosplayImages(hisoka, m, post, downloadBuffer, formatCosplayteleCaption, '[Cosplay]');
                }

                if (post.hasVideos && post.cossoraIds?.length > 0) {
                        await hisoka.sendMessage(m.from, {
                                text: `╭─「 🎬 *VIDEO COSPLAY* 」\n│ Tonton video dari post ini:\n│\n${post.cossoraIds.map((u, i) => `│ ${i + 1}. ${u}`).join('\n')}\n╰──────────────────────`,
                        }, { quoted: m });
                }

                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, m.command || 'cosplay');

                // Tampilkan ulang menu agar bisa pilih lagi
                const _reResults = pendingCos.results;
                const _reListText =
                        `╭─「 👘 *COSPLAYTELE* 」\n` +
                        `│ ✅ Selesai! Mau lihat yang lain?\n` +
                        `│\n` +
                        _reResults.map((r, i) => {
                                const match = r.title.match(/(\d+\s*photos?\s*(?:and\s*\d+\s*videos?)?)/i);
                                const count = match ? ` [${match[1]}]` : '';
                                const cleanTitle = r.title.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
                                return `│ *${i + 1}.* ${cleanTitle.slice(0, 65)}${count}`;
                        }).join('\n') + '\n' +
                        `│\n` +
                        `│ 📩 *Balas pesan ini* dengan angka\n` +
                        `│    pilihan kamu (1–${_reResults.length})\n` +
                        `│ ⏳ Menu berlaku 3 menit\n` +
                        `╰──────────────────────`;
                const _reMenuMsg = await tolak(hisoka, m, _reListText);
                const _reKey = m.sender;
                const _reTimeout = setTimeout(() => pendingCosplayChoices.delete(_reKey), 3 * 60 * 1000);
                pendingCosplayChoices.set(_reKey, {
                        results: _reResults,
                        botMsgId: _reMenuMsg?.key?.id || null,
                        expiresAt: Date.now() + 3 * 60 * 1000,
                        timeout: _reTimeout,
                        loading: false,
                });
        } catch (err) {
                console.error('[Cosplay] Error fetch post:', err.message);
                logError(err, 'cosplay:fetch');
                if (loadMsg?.key) {
                        try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                }
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                await tolak(hisoka, m, `❌ Gagal mengambil media.\n_${err.message}_`);
        }
        return true;
}

module.exports = { handleCosplayChoice, sendCosplayImages };
