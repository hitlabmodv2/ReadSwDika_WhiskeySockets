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
 *  komiktap-cmd.cjs — KomikTap command handler
 *  Perintah baca & download komik/manga dari KomikTap
 * ───────────────────────────────
 */
'use strict';

const path = require('path');

const _CHAP_PER_PAGE = 100;

function buildChapPageText(chapters, page = 1) {
        const total = chapters.length;
        const totalPages = Math.ceil(total / _CHAP_PER_PAGE);
        const p = Math.max(1, Math.min(page, totalPages));
        const start = (p - 1) * _CHAP_PER_PAGE;
        const slice = chapters.slice(start, start + _CHAP_PER_PAGE);
        let txt = `╭─「 📋 *DAFTAR CHAPTER* (${total} chapter) 」\n│ 📄 Hal. *${p}/${totalPages}*  •  Ch. ${start + 1}–${Math.min(start + _CHAP_PER_PAGE, total)}\n│\n`;
        slice.forEach((ch, j) => {
                txt += `│ *${start + j + 1}.* ${ch.name}${ch.date ? `  _${ch.date}_` : ''}\n`;
        });
        txt += `│\n`;
        const nav = [];
        if (p > 1)          nav.push(`*a* ← hal.${p - 1}`);
        if (p < totalPages) nav.push(`hal.${p + 1} → *d*`);
        if (totalPages > 1) {
                txt += `│ 🎮 ${nav.join('   ')}`;
                if (p > 1)          txt += `   *q* awal`;
                if (p < totalPages) txt += `   *e* akhir`;
                txt += `   *w* daftar hal.\n│\n`;
        }
        txt += `│ 💡 Ketik nomor chapter  •  *p${p < totalPages ? p + 1 : 1}* = loncat hal.\n╰──────────────────────`;
        return txt;
}

function buildChapOverview(chapters) {
        const total = chapters.length;
        const totalPages = Math.ceil(total / _CHAP_PER_PAGE);
        let txt = `╭─「 🗂️ *SEMUA HALAMAN* (${total} chapter) 」\n│\n`;
        for (let pg = 1; pg <= totalPages; pg++) {
                const s = (pg - 1) * _CHAP_PER_PAGE + 1;
                const e = Math.min(pg * _CHAP_PER_PAGE, total);
                txt += `│ *p${pg}* → Ch. ${s}–${e}\n`;
        }
        txt += `│\n│ 💡 Ketik *p<N>* untuk loncat, misal *p1* atau *p${totalPages}*\n╰──────────────────────`;
        return txt;
}

/**
 * Handle pending komiktap interactive reply.
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleKomiktapChoice({
        hisoka, m,
        pendingKomikChoices,
        getJadibotChoiceKey, getQuotedStanzaId,
        tolak, logError,
}) {
        const komikKey = getJadibotChoiceKey(m);
        const quotedId = getQuotedStanzaId(m);

        let _komikEntry = pendingKomikChoices.has(komikKey)
                ? { key: komikKey, session: pendingKomikChoices.get(komikKey) }
                : null;
        if (!_komikEntry && m.isQuoted && quotedId) {
                for (const [_k, _s] of pendingKomikChoices.entries()) {
                        if (_k.startsWith(m.from + ':') && _s.botMsgId && _s.botMsgId === quotedId) {
                                _komikEntry = { key: _k, session: _s };
                                break;
                        }
                }
        }

        if (!_komikEntry) return false;

        const matchedKey   = _komikEntry.key;
        const pendingKomik = _komikEntry.session;
        const rawChoice    = String(m.text || '').trim();
        const _isNavCmd = /^(a|d|q|e|w|p\d+|batal|cancel|x)$/i.test(rawChoice);
        const isReplyToMenu =
                (m.isQuoted && (!pendingKomik.botMsgId || quotedId === pendingKomik.botMsgId)) ||
                (pendingKomik.phase === 'detail' && !m.prefix && (/^\d+$/.test(rawChoice) || _isNavCmd));

        const _komikDelete = () => pendingKomikChoices.delete(matchedKey);
        const _komikSet    = (val) => pendingKomikChoices.set(matchedKey, val);

        if (!(isReplyToMenu && rawChoice && !m.prefix)) return false;

        if (pendingKomik.expiresAt <= Date.now()) {
                _komikDelete();
                await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.komik <judul>` lagi.');
                return true;
        }
        if (/^(batal|cancel|x)$/i.test(rawChoice)) {
                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);
                _komikDelete();
                await tolak(hisoka, m, '✅ Dibatalkan.');
                return true;
        }

        // Navigasi halaman chapter: a/d/q/e/w/p<N>
        if (pendingKomik.phase === 'detail' && _isNavCmd) {
                const chapters   = pendingKomik.chapters || [];
                const totalPages = Math.ceil(chapters.length / _CHAP_PER_PAGE);
                const curPage    = pendingKomik.chapPage || 1;
                const lc = rawChoice.toLowerCase();

                let targetPage = curPage;
                if (lc === 'd') targetPage = Math.min(curPage + 1, totalPages);
                else if (lc === 'a') targetPage = Math.max(curPage - 1, 1);
                else if (lc === 'q') targetPage = 1;
                else if (lc === 'e') targetPage = totalPages;
                else if (/^p\d+$/i.test(lc)) targetPage = Math.max(1, Math.min(parseInt(lc.slice(1), 10), totalPages));

                if (lc === 'w') {
                        const overviewText = buildChapOverview(chapters);
                        if (pendingKomik.chapMsgKey) {
                                try { await hisoka.sendMessage(m.from, { edit: pendingKomik.chapMsgKey, text: overviewText }); } catch { await tolak(hisoka, m, overviewText); }
                        } else { await tolak(hisoka, m, overviewText); }
                } else {
                        if (targetPage === curPage && lc !== 'q' && lc !== 'e') {
                                await tolak(hisoka, m, targetPage === 1 ? `⚠️ Sudah di halaman pertama.` : `⚠️ Sudah di halaman terakhir (${totalPages}).`);
                                return true;
                        }
                        const newText = buildChapPageText(chapters, targetPage);
                        if (pendingKomik.chapMsgKey) {
                                try { await hisoka.sendMessage(m.from, { edit: pendingKomik.chapMsgKey, text: newText }); } catch { await tolak(hisoka, m, newText); }
                        } else { await tolak(hisoka, m, newText); }
                }

                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);
                const _navTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                _komikSet({ ...pendingKomik, chapPage: lc === 'w' ? curPage : targetPage, timeout: _navTimeout, expiresAt: Date.now() + 10 * 60 * 1000 });
                return true;
        }

        if (pendingKomik.loading) {
                await tolak(hisoka, m, '⏳ Sedang memproses, harap tunggu...');
                return true;
        }

        const { komiktapDetail, komiktapPdf, komiktapChapterImages, makeProgressBar, formatDetailText } = require(path.resolve('./scrape/anime/komiktap.cjs'));

        // FASE 1: user balas nomor dari daftar pencarian
        if (pendingKomik.phase === 'search') {
                const idx = parseInt(rawChoice, 10);
                const results = pendingKomik.results || [];
                if (isNaN(idx) || idx < 1 || idx > results.length) {
                        await tolak(hisoka, m, `❌ Nomor tidak valid. Balas dengan angka 1–${results.length}.`);
                        return true;
                }

                pendingKomik.loading = true;
                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);

                try {
                        const pfx = m.prefix || '.';
                        await hisoka.sendMessage(m.from, { react: { text: '📖', key: m.key } });
                        await tolak(hisoka, m, `📖 Mengambil detail *${results[idx - 1].title}*...`);

                        const detail = await komiktapDetail(results[idx - 1].url);
                        const chapters = detail.chapters;

                        const infoText = formatDetailText(detail, pfx);
                        if (detail.cover) {
                                try {
                                        const axios = require('axios');
                                        const imgRes = await axios.get(detail.cover, {
                                                responseType: 'arraybuffer', timeout: 10000,
                                                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' },
                                        });
                                        await hisoka.sendMessage(m.from, { image: Buffer.from(imgRes.data), caption: infoText }, { quoted: m });
                                } catch {
                                        await hisoka.sendMessage(m.from, { text: infoText }, { quoted: m });
                                }
                        } else {
                                await hisoka.sendMessage(m.from, { text: infoText }, { quoted: m });
                        }

                        const chapPage1Text = buildChapPageText(chapters, 1);
                        const chapListMsg = await hisoka.sendMessage(m.from, { text: chapPage1Text }, { quoted: m });

                        if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);
                        const newTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                        _komikSet({
                                phase: 'detail',
                                detail,
                                chapters,
                                botMsgId: '',
                                chapMsgKey: chapListMsg?.key || null,
                                chapPage: 1,
                                expiresAt: Date.now() + 10 * 60 * 1000,
                                timeout: newTimeout,
                                loading: false,
                        });

                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                } catch (err) {
                        console.error('[KOMIK] Detail error:', err?.message);
                        _komikDelete();
                        logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-interactive-detail');
                        await tolak(hisoka, m, `❌ Gagal ambil detail komik.\n💬 ${err?.message || 'Coba lagi nanti'}`);
                }
                return true;
        }

        // FASE 2: user balas nomor chapter → download PDF
        if (pendingKomik.phase === 'detail') {
                const idx = parseInt(rawChoice, 10);
                const chapters = pendingKomik.chapters || [];
                if (isNaN(idx) || idx < 1 || idx > chapters.length) {
                        await tolak(hisoka, m, `❌ Nomor tidak valid. Balas dengan angka 1–${chapters.length}.`);
                        return true;
                }

                pendingKomik.loading = true;
                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);

                const chapter = chapters[idx - 1];
                const savedDetail = pendingKomik.detail;
                const savedChapters = pendingKomik.chapters;

                try {
                        await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });

                        const images = await komiktapChapterImages(chapter.url);
                        const totalAvail = images.length;
                        const dlCount = Math.min(totalAvail, 20);

                        const mangaTitle = savedDetail?.title || chapter.name;
                        const _buildDlProgress = (bar, pct, done, total, status) =>
                                `${bar} ${pct}%\n` +
                                `╭─「 📥 *MENGUNDUH PDF* 」\n` +
                                `│ 📖 ${mangaTitle}\n` +
                                `│ 📑 ${chapter.name}\n` +
                                `│ 📄 ${done}/${total} halaman\n` +
                                `│ ${status}\n` +
                                `╰──────────────────────`;

                        const loadingMsg = await m.reply(_buildDlProgress('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛', 0, 0, dlCount, '⏳ Memulai download...'));

                        let lastPct = 0;
                        const onProgress = async (done, total) => {
                                const { pct, bar } = makeProgressBar(done, total);
                                if (pct - lastPct < 10 && pct < 100) return;
                                lastPct = pct;
                                try {
                                        await m.reply({ edit: loadingMsg.key, text: _buildDlProgress(bar, pct, done, total, `⏳ Mengunduh halaman ${done}...`) });
                                } catch (_) {}
                        };

                        const pdfBuf = await komiktapPdf(chapter.url, 20, onProgress);

                        try {
                                await m.reply({ edit: loadingMsg.key, text: _buildDlProgress('██████████', 100, dlCount, dlCount, '📦 Mengemas & mengirim PDF...') });
                        } catch (_) {}

                        const safeName = `${mangaTitle} - ${chapter.name}`.replace(/[^\w\s,!'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
                        const sizeMB = (pdfBuf.length / 1024 / 1024).toFixed(1);
                        const pdfCaption =
                                `╭─「 📚 *KOMIKTAP* 」\n│\n` +
                                `│ 📖 *${mangaTitle}*\n` +
                                `│ 📑 *${chapter.name}*\n` +
                                `│ 📄 ${dlCount}/${totalAvail} halaman\n` +
                                `│ 💾 ${sizeMB} MB\n` +
                                `│ 🔗 ${chapter.url}\n│\n` +
                                `│ 💡 _Ketik nomor chapter lain untuk download lagi_\n` +
                                `╰──────────────────────`;

                        await m.reply({
                                document: pdfBuf,
                                mimetype: 'application/pdf',
                                fileName: `${safeName}.pdf`,
                                caption: pdfCaption,
                        });

                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                        const restoreTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                        _komikSet({
                                phase: 'detail',
                                detail: savedDetail,
                                chapters: savedChapters,
                                botMsgId: '',
                                expiresAt: Date.now() + 10 * 60 * 1000,
                                timeout: restoreTimeout,
                                loading: false,
                        });
                } catch (err) {
                        console.error('[KOMIK] PDF error:', err?.message);
                        logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-interactive-pdf');
                        const restoreTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                        _komikSet({
                                phase: 'detail',
                                detail: savedDetail,
                                chapters: savedChapters,
                                botMsgId: '',
                                expiresAt: Date.now() + 10 * 60 * 1000,
                                timeout: restoreTimeout,
                                loading: false,
                        });
                        await tolak(hisoka, m, `❌ Gagal download chapter.\n💬 ${err?.message || 'Coba lagi nanti'}`);
                }
                return true;
        }

        return false;
}

module.exports = { handleKomiktapChoice, buildChapPageText, buildChapOverview };
