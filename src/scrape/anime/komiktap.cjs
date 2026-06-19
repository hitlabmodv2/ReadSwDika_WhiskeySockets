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
 *  komiktap.cjs — Scraper Komiktap
 *  Cari, info, dan baca manga/komik dari komiktap.com
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

const BASE = 'https://komiktap.info';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
    'Referer': `${BASE}/`,
};

async function fetchHtml(url) {
    const res = await axios.get(url, {
        headers: HEADERS,
        timeout: 20000,
        maxRedirects: 5,
    });
    return res.data;
}

async function komiktapSearch(query) {
    const html = await fetchHtml(`${BASE}/?s=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);
    const results = [];

    $('.bsx').each((i, el) => {
        const a = $(el).find('a').first();
        const href = a.attr('href') || '';
        const title = (a.attr('title') || $(el).find('.tt').text() || '').trim();
        const cover = $(el).find('img').first().attr('src') || '';
        const status = $(el).find('[class*="status"]').first().text().trim();
        const type = $(el).find('[class*="type"]').first().text().trim();
        const rating = $(el).find('[style*="width"]').first().attr('style') || '';
        const ratingVal = (rating.match(/width:(\d+)%/) || [])[1] || null;
        const lastChap = $(el).find('.epxs').first().text().trim();

        if (href && title) {
            results.push({ title, url: href, cover, status, type, rating: ratingVal ? `${ratingVal}%` : null, lastChap });
        }
    });

    return results;
}

async function komiktapDetail(url) {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('h1.entry-title').first().text().trim() || $('h1').first().text().trim();
    const altTitle = $('.alternative').first().text().replace(/^alternative\s*/i, '').trim();
    const cover = $('div.thumb img').first().attr('src') || $('div[itemprop="image"] img').first().attr('src') || '';

    const info = {};
    $('table.infotable tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length >= 2) {
            const key = $(tds[0]).text().trim();
            const val = $(tds[1]).text().replace(/\s+/g, ' ').trim();
            if (key && val) info[key] = val;
        }
    });

    const genres = [];
    $('a[rel="tag"]').each((i, el) => {
        const g = $(el).text().trim();
        if (g && !genres.includes(g)) genres.push(g);
    });

    const synopsis = $('.entry-content p, .synops p').filter((i, el) => {
        const txt = $(el).text().trim();
        return txt.length > 30;
    }).first().text().trim();

    const chapters = [];
    $('li[data-num]').each((i, el) => {
        const num = $(el).attr('data-num') || '';
        const chUrl = $(el).find('a').first().attr('href') || '';
        const chName = $(el).find('.chapternum').text().trim();
        const chDate = $(el).find('.chapterdate').text().trim();
        if (chUrl) chapters.push({ num, name: chName || `Chapter ${num}`, url: chUrl, date: chDate });
    });

    chapters.reverse();

    return { title, altTitle, cover, info, genres, synopsis, chapters, url };
}

async function komiktapChapterImages(chapterUrl) {
    const html = await fetchHtml(chapterUrl);
    const match = html.match(/ts_reader\.run\(({[\s\S]+?})\);/);
    if (!match) throw new Error('Tidak bisa menemukan data gambar di chapter ini');

    let data;
    try { data = JSON.parse(match[1]); } catch (e) { throw new Error('Gagal parse data gambar chapter'); }

    const sources = data.sources || [];
    if (!sources.length) throw new Error('Tidak ada sumber gambar ditemukan');

    const images = sources[0].images || [];
    if (!images.length) throw new Error('Daftar gambar kosong');

    return images;
}

async function downloadImage(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 25000,
        headers: {
            ...HEADERS,
            Accept: 'image/*',
            Referer: `${BASE}/`,
        },
    });
    if (res.status !== 200 || res.data.byteLength < 200) throw new Error(`Gambar kosong: ${url}`);
    return Buffer.from(res.data);
}

async function batchDownload(imageUrls, concurrency = 3, onProgress) {
    const results = new Array(imageUrls.length);
    let done = 0;

    for (let i = 0; i < imageUrls.length; i += concurrency) {
        const batch = imageUrls.slice(i, i + concurrency);
        const bufs = await Promise.all(
            batch.map((url, bi) =>
                downloadImage(url).then(buf => {
                    done++;
                    if (onProgress) onProgress(done, imageUrls.length);
                    return buf;
                }).catch(() => {
                    done++;
                    if (onProgress) onProgress(done, imageUrls.length);
                    return null;
                })
            )
        );
        for (let j = 0; j < bufs.length; j++) results[i + j] = bufs[j];
    }
    return results;
}

async function komiktapPdf(chapterUrl, maxPages = 20, onProgress) {
    const images = await komiktapChapterImages(chapterUrl);
    const limited = images.slice(0, maxPages);

    const rawBufs = await batchDownload(limited, 3, onProgress);

    const processedBufs = await Promise.all(rawBufs.map(async (buf, i) => {
        if (!buf) return { buf: null, width: 1280, height: 1800 };
        try {
            const meta = await sharp(buf).metadata();
            const jpeg = await sharp(buf).jpeg({ quality: 85 }).toBuffer();
            return { buf: jpeg, width: meta.width || 1280, height: meta.height || 1800 };
        } catch {
            return { buf: null, width: 1280, height: 1800 };
        }
    }));

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        processedBufs.forEach((page, i) => {
            doc.addPage({ size: [page.width, page.height], margin: 0 });
            if (page.buf) {
                try { doc.image(page.buf, 0, 0, { width: page.width, height: page.height }); }
                catch { doc.fontSize(12).text(`[Error halaman ${i + 1}]`, 10, 10); }
            } else {
                doc.fontSize(12).text(`[Gagal load halaman ${i + 1}]`, 10, 10);
            }
        });

        doc.end();
    });
}

function makeProgressBar(done, total) {
    const pct = Math.round((done / total) * 100);
    const filled = Math.round((done / total) * 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return { pct, bar };
}

function formatSearchResults(results, query) {
    if (!results.length) return `❌ Tidak ada hasil untuk: _${query}_`;
    let text = `╭─「 🔍 *KOMIKTAP SEARCH* 」\n│\n│ Hasil: _${query}_\n│\n`;
    results.slice(0, 10).forEach((r, i) => {
        const status = r.status ? ` [${r.status}]` : '';
        const type = r.type ? ` • ${r.type}` : '';
        const rating = r.rating ? ` ⭐${r.rating}` : '';
        text += `│ *${i + 1}.* ${r.title.slice(0, 55)}${r.title.length > 55 ? '…' : ''}\n`;
        text += `│     ${status}${type}${rating}\n`;
    });
    text += `│\n│ 💡 Ketik *.komik <judul>* untuk detail\n╰──────────────────────`;
    return text;
}

function formatDetailText(detail, pfx = '.') {
    const { title, altTitle, info, genres, synopsis, chapters } = detail;

    const genreList = genres.slice(0, 8).join(', ') || '-';
    const status = info['Status'] || info['status'] || '-';
    const type = info['Type'] || info['Tipe'] || '-';
    const author = info['Author'] || info['Penulis'] || '-';
    const artist = info['Artist'] || '-';
    const released = info['Released'] || info['Rilis'] || '-';
    const updated = info['Updated'] || info['Diperbarui'] || '-';
    const totalCh = chapters.length;
    const latestCh = chapters.length ? chapters[chapters.length - 1].name : '-';
    const firstCh = chapters.length ? chapters[0].name : '-';

    let text = `╭─「 📖 *KOMIKTAP* 」\n│\n`;
    text += `│ 📌 *Judul*   : ${title}\n`;
    if (altTitle) text += `│ 📝 *Alt*     : ${altTitle.slice(0, 60)}\n`;
    text += `│\n`;
    text += `│ 📺 *Tipe*    : ${type}\n`;
    text += `│ ✅ *Status*  : ${status}\n`;
    if (author !== '-') text += `│ ✍️ *Author*  : ${author}\n`;
    if (artist !== '-') text += `│ 🎨 *Artist*  : ${artist}\n`;
    if (released !== '-') text += `│ 📅 *Rilis*   : ${released}\n`;
    if (updated !== '-') text += `│ 🔄 *Update*  : ${updated}\n`;
    text += `│\n`;
    text += `│ 📚 *Chapter* : ${totalCh} chapter\n`;
    text += `│ 📖 *Pertama* : ${firstCh}\n`;
    text += `│ 🆕 *Terbaru* : ${latestCh}\n`;
    text += `│\n`;
    text += `│ 🏷️ *Genre*   : ${genreList}\n`;

    if (synopsis) {
        text += `│\n│ 📃 *Sinopsis:*\n│ _${synopsis.slice(0, 250)}${synopsis.length > 250 ? '...' : ''}_\n`;
    }

    if (chapters.length > 0) {
        text += `│\n│ 💡 Download PDF:\n│ ${pfx}komikget <url chapter>\n`;
        text += `│ Contoh:\n│ ${pfx}komikget ${chapters[chapters.length - 1].url}\n`;
    }

    text += `╰──────────────────────`;
    return text;
}

async function komiktapLatestUpdates() {
    const html = await fetchHtml(`${BASE}/manga/?orderby=modified`);
    const $ = cheerio.load(html);
    const items = [];

    // MangaReader theme: .listupd .bs .bsx
    $('.listupd .bsx, .utao .uta').each((i, el) => {
        if (items.length >= 20) return false;
        const a = $(el).find('a').first();
        const href = a.attr('href') || '';
        const title = (a.attr('title') || $(el).find('.tt, h4, h3').first().text() || '').trim();
        const cover = $(el).find('img').first().attr('src') || '';
        const status = $(el).find('[class*="status"]').first().text().trim();
        const type = $(el).find('[class*="type"]').first().text().trim();
        const lastChap = $(el).find('.epxs, .lch a').first().text().trim();
        if (href && title) items.push({ title, url: href, cover, status, type, lastChap });
    });

    // Fallback: homepage .bsx cards
    if (!items.length) {
        $('.bsx').each((i, el) => {
            if (items.length >= 20) return false;
            const a = $(el).find('a').first();
            const href = a.attr('href') || '';
            const title = (a.attr('title') || $(el).find('.tt').text() || '').trim();
            const cover = $(el).find('img').first().attr('src') || '';
            const status = $(el).find('[class*="status"]').first().text().trim();
            const type = $(el).find('[class*="type"]').first().text().trim();
            const lastChap = $(el).find('.epxs').first().text().trim();
            if (href && title) items.push({ title, url: href, cover, status, type, lastChap });
        });
    }

    return items;
}

module.exports = {
    komiktapSearch,
    komiktapDetail,
    komiktapChapterImages,
    komiktapPdf,
    komiktapLatestUpdates,
    makeProgressBar,
    formatSearchResults,
    formatDetailText,
};

// ── COMMAND HANDLER (komik search) ────────────────────────────────────────────

async function handleKomik({ hisoka, m, query, tolak, logCommand, logError, path, pendingKomikChoices, getJadibotChoiceKey }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                if (!input) {
                        await tolak(hisoka, m,
                                `╭─「 📖 *KOMIKTAP* 」\n│\n│ *Cari manga/manhwa/manhua:*\n│ ${pfx}komik <judul>\n│\n` +
                                `│ *Detail manga:*\n│ ${pfx}komikinfo <url manga>\n│\n` +
                                `│ *Download chapter jadi PDF:*\n│ ${pfx}komikget <url chapter>\n│ ${pfx}komikget <url chapter> <jumlah hal>\n│\n` +
                                `│ *Contoh:*\n│ ${pfx}komik naruto\n│ ${pfx}komikinfo https://komiktap.info/manga/naruto/\n│ ${pfx}komikget https://komiktap.info/naruto-chapter-1/\n│ ${pfx}komikget https://komiktap.info/naruto-chapter-1/ 15\n│\n│ ℹ️ Default 20 hal, max 50 hal\n╰──────────────────────`
                        );
                        return;
                }

                const { komiktapSearch } = exports;
                const ax = require('axios');

                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
                await tolak(hisoka, m, `🔍 Mencari *${input}* di Komiktap...`);

                const results = await komiktapSearch(input);
                if (!results.length) { await tolak(hisoka, m, `❌ Tidak ada hasil untuk: _${input}_`); return; }

                const topResults = results.slice(0, 10);
                const coverDownloads = await Promise.allSettled(
                        topResults.map((r) => {
                                if (!r.cover) return Promise.reject(new Error('no cover'));
                                return ax.get(r.cover, { responseType: 'arraybuffer', timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' } }).then(res => Buffer.from(res.data));
                        })
                );

                const albumItems = [];
                coverDownloads.forEach((res, i) => {
                        const r = topResults[i];
                        const statusTxt = r.status ? `[${r.status}]` : '';
                        const typeTxt   = r.type   ? ` • ${r.type}`  : '';
                        const ratingTxt = r.rating ? ` ⭐${r.rating}` : '';
                        const cap = `*${i + 1}.* ${r.title}${statusTxt ? '\n' + statusTxt : ''}${typeTxt}${ratingTxt}`;
                        if (res.status === 'fulfilled') albumItems.push({ image: res.value, caption: cap });
                });

                if (albumItems.length > 0) {
                        try {
                                await m.reply({ albumMessage: albumItems });
                        } catch {
                                const BATCH = 10;
                                for (let _b = 0; _b < albumItems.length; _b += BATCH) {
                                        const _batch = albumItems.slice(_b, _b + BATCH);
                                        try {
                                                await (_b === 0 ? m.reply({ albumMessage: _batch }) : hisoka.sendMessage(m.from, { albumMessage: _batch }));
                                        } catch {
                                                for (const item of _batch) {
                                                        try { await m.reply({ image: item.image, caption: item.caption }); } catch (_) {}
                                                }
                                        }
                                }
                        }
                }

                let menuText = `╭─「 🔍 *KOMIKTAP SEARCH* 」\n│\n│ Hasil: _${input}_\n│\n`;
                topResults.forEach((r, i) => {
                        const status = r.status ? ` [${r.status}]` : '';
                        const type   = r.type   ? ` • ${r.type}`   : '';
                        const rating = r.rating ? ` ⭐${r.rating}`  : '';
                        menuText += `│ *${i + 1}.* ${r.title.slice(0, 55)}${r.title.length > 55 ? '…' : ''}\n│     ${status}${type}${rating}\n`;
                });
                menuText += `│\n│ 💡 *Balas pesan ini* dengan nomor\n│ Contoh: balas *1* untuk manga pertama\n│ Ketik *batal* untuk membatalkan\n╰──────────────────────`;

                const menuMsg = await m.reply(menuText);
                const komikKey = getJadibotChoiceKey(m);
                const oldKomik = pendingKomikChoices.get(komikKey);
                if (oldKomik?.timeout) clearTimeout(oldKomik.timeout);
                const komikTimeout = setTimeout(() => pendingKomikChoices.delete(komikKey), 5 * 60 * 1000);
                pendingKomikChoices.set(komikKey, {
                        phase: 'search', results: topResults,
                        botMsgId: menuMsg?.key?.id || '',
                        expiresAt: Date.now() + 5 * 60 * 1000,
                        timeout: komikTimeout, loading: false,
                });
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[KOMIKTAP] Search error:', err?.message);
                if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-search');
                await tolak(hisoka, m, `❌ Gagal cari komik.\n💬 ${err?.message || 'Coba lagi nanti'}`);
        }
}

module.exports.handleKomik = handleKomik;

// ── COMMAND HANDLER: KOMIKDL ──────────────────────────────────────────────────

async function handleKomikdl({ hisoka, m, query, tolak, logCommand, logError }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                if (!input || !input.startsWith('http')) {
                        await tolak(hisoka, m,
                                `╭─「 📥 *KOMIKGET* 」\n│\n│ *Format:*\n│ ${pfx}komikget <url chapter>\n│ ${pfx}komikget <url chapter> <jumlah hal>\n│\n│ *Contoh:*\n│ ${pfx}komikget https://komiktap.info/naruto-chapter-1/\n│ ${pfx}komikget https://komiktap.info/naruto-chapter-1/ 15\n│\n│ ℹ️ Default 20 hal, max 50 hal\n│ ⏳ Proses ~30–90 detik\n╰──────────────────────`
                        );
                        return;
                }

                const parts      = input.split(/\s+/);
                const chapterUrl = parts[0];
                let maxPg = 20;
                if (parts[1] && /^\d+$/.test(parts[1])) maxPg = Math.min(Math.max(1, parseInt(parts[1])), 50);

                await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });
                await tolak(hisoka, m, `📥 Mengambil daftar gambar chapter...`);

                const images    = await komiktapChapterImages(chapterUrl);
                const totalAvail = images.length;
                const dlCount   = Math.min(totalAvail, maxPg);
                const chapterName = chapterUrl.replace(/.*\/([^/]+)\/?$/, '$1').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                const _buildDlProg = (bar, pct, done, total, status) =>
                        `${bar} ${pct}%\n╭─「 📥 *MENGUNDUH PDF* 」\n│ 📖 ${chapterName}\n│ 📄 ${done}/${total} halaman\n│ ${status}\n╰──────────────────────`;

                const loadingMsg = await m.reply(_buildDlProg('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛', 0, 0, dlCount, '⏳ Memulai download...'));

                let lastPct = 0;
                const onProgress = async (done, total) => {
                        const { pct, bar } = makeProgressBar(done, total);
                        if (pct - lastPct < 10 && pct < 100) return;
                        lastPct = pct;
                        try { await m.reply({ edit: loadingMsg.key, text: _buildDlProg(bar, pct, done, total, `⏳ Mengunduh halaman ${done}...`) }); } catch (_) {}
                };

                const pdfBuf = await komiktapPdf(chapterUrl, maxPg, onProgress);

                try { await m.reply({ edit: loadingMsg.key, text: _buildDlProg('██████████', 100, dlCount, dlCount, '📦 Mengemas & mengirim PDF...') }); } catch (_) {}

                const safeName  = chapterName.slice(0, 60) || 'komiktap_chapter';
                const sizeMB    = (pdfBuf.length / 1024 / 1024).toFixed(1);
                const pdfCaption =
                        `╭─「 📚 *KOMIKTAP* 」\n│\n│ 📖 *${chapterName}*\n│ 📄 ${dlCount}/${totalAvail} halaman\n│ 💾 ${sizeMB} MB\n│ 🔗 ${chapterUrl}\n╰──────────────────────`;

                await m.reply({ document: pdfBuf, mimetype: 'application/pdf', fileName: `${safeName}.pdf`, caption: pdfCaption });
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[KOMIKTAP] Download error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-download');
                await tolak(hisoka, m, `❌ Gagal download chapter.\n💬 ${err?.message || 'Coba lagi nanti'}`);
        }
}

// ── COMMAND HANDLER: KOMIKUPDATE ──────────────────────────────────────────────

async function handleKomikup({ hisoka, m, tolak, logError }) {
        if (!m.prefix && m.query) return;
        try {
                await hisoka.sendMessage(m.from, { react: { text: '🔄', key: m.key } });
                await tolak(hisoka, m, `🔄 Mengambil update terbaru dari Komiktap...`);

                const items = await komiktapLatestUpdates();
                if (!items.length) { await tolak(hisoka, m, `❌ Tidak ada data update saat ini.`); return; }

                const coverDls = await Promise.allSettled(
                        items.map(r => {
                                if (!r.cover) return Promise.reject(new Error('no cover'));
                                return axios.get(r.cover, {
                                        responseType: 'arraybuffer', timeout: 12000,
                                        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' },
                                }).then(res => Buffer.from(res.data));
                        })
                );

                const albumUpd = [];
                coverDls.forEach((res, i) => {
                        const r = items[i];
                        const typeTxt = r.type ? ` • ${r.type}` : '';
                        const statusTxt = r.status ? ` [${r.status}]` : '';
                        const lastTxt = r.lastChap ? `\n📖 ${r.lastChap}` : '';
                        const cap = `*${i + 1}.* ${r.title}${statusTxt}${typeTxt}${lastTxt}`;
                        if (res.status === 'fulfilled') albumUpd.push({ image: res.value, caption: cap });
                });

                if (albumUpd.length > 0) {
                        try {
                                await m.reply({ albumMessage: albumUpd });
                        } catch {
                                const BATCH = 10;
                                for (let _b = 0; _b < albumUpd.length; _b += BATCH) {
                                        const _batch = albumUpd.slice(_b, _b + BATCH);
                                        try {
                                                await (_b === 0 ? m.reply({ albumMessage: _batch }) : hisoka.sendMessage(m.from, { albumMessage: _batch }));
                                        } catch {
                                                for (const item of _batch) {
                                                        try { await m.reply({ image: item.image, caption: item.caption }); } catch (_) {}
                                                }
                                        }
                                }
                        }
                }

                let updText = `╭─「 🔄 *UPDATE TERBARU KOMIKTAP* 」\n│\n`;
                items.forEach((r, i) => {
                        const typeTxt = r.type ? ` • ${r.type}` : '';
                        const lastTxt = r.lastChap ? `  _${r.lastChap}_` : '';
                        updText += `│ *${i + 1}.* ${r.title.slice(0, 50)}${typeTxt}${lastTxt}\n`;
                });
                updText += `│\n│ 🔗 ${m.prefix || '.'}komik <judul> untuk cari & download\n╰──────────────────────`;
                await m.reply(updText);
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[KOMIKUPDATE] Error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-update');
                await tolak(hisoka, m, `❌ Gagal ambil update.\n💬 ${err?.message || 'Coba lagi nanti'}`);
        }
}

// ── COMMAND HANDLER: KOMIKINFO ────────────────────────────────────────────────

async function handleKomikinfo({ hisoka, m, query, tolak, logError }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';
                if (!input || !input.startsWith('http')) {
                        await tolak(hisoka, m,
                                `╭─「 📖 *KOMIKINFO* 」\n│\n│ Kirim URL manga dari komiktap.info\n│\n│ *Contoh:*\n│ ${pfx}komikinfo https://komiktap.info/manga/naruto/\n╰──────────────────────`
                        );
                        return;
                }
                await hisoka.sendMessage(m.from, { react: { text: '📖', key: m.key } });
                await tolak(hisoka, m, `📖 Mengambil detail manga...`);
                const detail = await komiktapDetail(input);
                const text   = formatDetailText(detail, pfx);
                if (detail.cover) {
                        try {
                                const imgRes = await axios.get(detail.cover, {
                                        responseType: 'arraybuffer', timeout: 10000,
                                        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' },
                                });
                                await hisoka.sendMessage(m.from, { image: Buffer.from(imgRes.data), caption: text }, { quoted: m });
                        } catch {
                                await tolak(hisoka, m, text);
                        }
                } else {
                        await tolak(hisoka, m, text);
                }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[KOMIKTAP] Detail error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-detail');
                await tolak(hisoka, m, `❌ Gagal ambil detail manga.\n💬 ${err?.message || 'Coba lagi nanti'}`);
        }
}

module.exports.handleKomikdl = handleKomikdl;
module.exports.handleKomikup = handleKomikup;
module.exports.handleKomikinfo = handleKomikinfo;
