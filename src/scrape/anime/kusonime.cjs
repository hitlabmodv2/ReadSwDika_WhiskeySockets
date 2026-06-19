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
 *  kusonime.cjs — Scraper Kusonime
 *  Cari anime batch download subtitle Indonesia dari kusonime.com
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const BASE = 'https://kusonime.com';

const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Referer': 'https://kusonime.com/',
};

const SEASON_NAMES = {
        winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall',
};

async function fetchHtml(url) {
        const res = await axios.get(url, {
                headers: HEADERS,
                timeout: 20000,
                maxRedirects: 5,
        });
        return res.data;
}

async function searchKusonime(query) {
        const html = await fetchHtml(`${BASE}/?s=${encodeURIComponent(query)}`);
        const $ = cheerio.load(html);
        const results = [];
        $('h2.episodeye a').each((i, el) => {
                const title = $(el).attr('title') || $(el).text().trim();
                const href = $(el).attr('href');
                if (title && href) results.push({ title, url: href });
        });
        return results;
}

function parseResolutionLinks($urlDiv) {
        const resolutions = {};
        let currentRes = 'Unknown';
        $urlDiv.contents().each((i, node) => {
                if (node.type === 'tag' && node.name === 'strong') {
                        const txt = cheerio.load(node).text().trim();
                        if (txt) currentRes = txt;
                } else if (node.type === 'tag' && node.name === 'a') {
                        const $a = cheerio.load(node);
                        const label = $a('a').text().trim();
                        const href = $a('a').attr('href');
                        if (label && href && href !== '#') {
                                if (!resolutions[currentRes]) resolutions[currentRes] = [];
                                resolutions[currentRes].push({ label, url: href });
                        }
                }
        });
        return resolutions;
}

async function getDetailKusonime(animeUrl) {
        const html = await fetchHtml(animeUrl);
        const $ = cheerio.load(html);

        const title = $('h1.posttitle, h1').eq(1).text().trim() || $('h1').first().text().trim();
        const thumbnail = $('img.wp-post-image, .post-thumb img').first().attr('src') || '';

        const info = {};
        $('.info p').each((i, el) => {
                const key = $(el).find('b').first().text().replace(/\s*:\s*$/, '').trim();
                if (!key) return;
                const val = $(el).text().replace(key, '').replace(/^\s*:\s*/, '').trim();
                info[key] = val;
        });

        const synopsis = (() => {
                let syn = '';
                $('.entry-content p').each((i, el) => {
                        const txt = $(el).text().replace(/\s+/g, ' ').trim();
                        if (txt.length > 60 && !/^(NOTE|Download|Donwload|Sumber|Source)/i.test(txt) && !txt.includes('&nbsp')) {
                                syn = txt;
                                return false;
                        }
                });
                return syn;
        })();

        const downloadGroups = [];
        $('.smokeddlrh').each((i, el) => {
                const groupTitle = $(el).find('.smokettlrh').text().trim();
                const resolutions = parseResolutionLinks($(el).find('.smokeurlrh'));
                if (groupTitle && Object.keys(resolutions).length > 0) {
                        downloadGroups.push({ groupTitle, resolutions });
                }
        });

        return { title, thumbnail, info, synopsis, downloadGroups, url: animeUrl };
}

async function getSeasonAnimeList(season, year) {
        const slug = `${season.toLowerCase()}-${year}`;
        const baseUrl = `${BASE}/seasons/${slug}/`;
        const allAnime = [];
        let page = 1;

        while (true) {
                const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
                let html;
                try {
                        html = await fetchHtml(url);
                } catch (e) {
                        break;
                }
                const $ = cheerio.load(html);

                let found = 0;
                $('h2.episodeye a').each((i, el) => {
                        const title = $(el).attr('title') || $(el).text().trim();
                        const href = $(el).attr('href');
                        if (title && href) { allAnime.push({ title, url: href }); found++; }
                });

                if (found === 0) break;

                // Cek ada next page — cari link "Next Page »"
                let hasNext = false;
                $('a').each((i, el) => {
                        const txt = $(el).text().trim();
                        const href = $(el).attr('href') || '';
                        if (/next\s*page|»/i.test(txt) && href.includes(`/page/${page + 1}/`)) {
                                hasNext = true;
                        }
                });

                if (!hasNext) break;
                page++;
                if (page > 30) break;
                await new Promise(r => setTimeout(r, 500));
        }

        return allAnime;
}

async function batchFetchDetails(animeList, onProgress) {
        const BATCH = 5;
        const results = [];
        for (let i = 0; i < animeList.length; i += BATCH) {
                const chunk = animeList.slice(i, i + BATCH);
                const settled = await Promise.allSettled(chunk.map(a => getDetailKusonime(a.url)));
                for (const s of settled) {
                        results.push(s.status === 'fulfilled' ? s.value : null);
                }
                if (onProgress) onProgress(Math.min(i + BATCH, animeList.length), animeList.length);
                if (i + BATCH < animeList.length) await new Promise(r => setTimeout(r, 600));
        }
        return results;
}

function cleanTitle(title) {
        return title
                .replace(/\s*Batch\s+Subtitle\s+Indonesia\s*/gi, '')
                .replace(/\s*Subtitle\s+Indonesia\s*/gi, '')
                .replace(/\s*Sub\s+Indo\s*/gi, '')
                .trim();
}

function wrapText(text, width, indent) {
        const words = text.split(' ');
        const lines = [];
        let cur = indent;
        for (const w of words) {
                if (cur.length + w.length + 1 > width && cur.trim()) {
                        lines.push(cur.trimEnd());
                        cur = indent + w + ' ';
                } else {
                        cur += w + ' ';
                }
        }
        if (cur.trim()) lines.push(cur.trimEnd());
        return lines.join('\n');
}

function formatSeasonTxt(season, year, animes) {
        const seasonLabel = SEASON_NAMES[season.toLowerCase()] || season;
        const now = new Date().toLocaleString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
        });

        const W = 60;
        const SEP  = '='.repeat(W);
        const SEP2 = '-'.repeat(W);

        const validAnimes = animes.filter(Boolean);
        let out = '';

        // ── HEADER ──────────────────────────────────────────────
        out += `${SEP}\n`;
        out += ` KUSONIME - ANIME ${seasonLabel.toUpperCase()} ${year}\n`;
        out += ` Source  : kusonime.com/seasons/${season.toLowerCase()}-${year}/\n`;
        out += ` Diambil : ${now}\n`;
        out += ` Total   : ${validAnimes.length} judul\n`;
        out += `${SEP}\n`;

        // ── DAFTAR JUDUL (TOC) ───────────────────────────────────
        out += `\n DAFTAR JUDUL:\n`;
        out += `${SEP2}\n`;
        let idx = 1;
        for (const anime of animes) {
                if (!anime) continue;
                const num = String(idx++).padStart(2, '0');
                const clean = cleanTitle(anime.title);
                out += ` > ${num}. ${clean}\n`;
        }
        out += `${SEP}\n`;

        // ── DETAIL & DOWNLOAD ────────────────────────────────────
        out += `\n DETAIL & DOWNLOAD LINKS:\n`;
        out += `${SEP}\n`;

        let no = 1;
        for (const anime of animes) {
                if (!anime) continue;
                const num = String(no++).padStart(2, '0');
                out += `\n[${num}] ${cleanTitle(anime.title)}\n`;
                out += `${SEP2}\n`;

                const fields = [
                        ['Japanese',      'Judul JP'],
                        ['Genre',         'Genre   '],
                        ['Seasons',       'Season  '],
                        ['Type',          'Tipe    '],
                        ['Status',        'Status  '],
                        ['Total Episode', 'Episode '],
                        ['Score',         'Score   '],
                        ['Duration',      'Durasi  '],
                        ['Released on',   'Rilis   '],
                        ['Producers',     'Studio  '],
                ];
                for (const [k, lbl] of fields) {
                        if (anime.info?.[k]) out += ` ${lbl} : ${anime.info[k]}\n`;
                }

                if (anime.synopsis) {
                        out += ` Sinopsis: ${wrapText(anime.synopsis.slice(0, 350), W, '          ')}\n`;
                }

                out += ` URL     : ${anime.url}\n`;

                if (anime.downloadGroups?.length) {
                        out += `\n Download Links:\n`;
                        for (const group of anime.downloadGroups) {
                                const gTitle = group.groupTitle
                                        .replace(/Download\s+/i, '')
                                        .replace(/\s*Batch\s+Subtitle\s+Indonesia\s*/gi, '')
                                        .replace(/\s*Subtitle\s+Indonesia\s*/gi, '')
                                        .trim();
                                out += `\n  >> ${gTitle}\n`;
                                for (const [res, links] of Object.entries(group.resolutions)) {
                                        out += `     [${res}]\n`;
                                        for (const lnk of links) {
                                                out += `       - ${lnk.label.padEnd(14)}: ${lnk.url}\n`;
                                        }
                                }
                        }
                }
                out += `\n${SEP}\n`;
        }

        out += ` Generated by Wily Bot | kusonime.com\n`;
        out += `${SEP}\n`;
        return out;
}

function formatDetailText(detail, maxGroups = 3) {
        const { title, info, synopsis, downloadGroups, url } = detail;
        let text = `🎌 *${title}*\n`;
        text += `━━━━━━━━━━━━━━━━━━━\n`;
        const infoMap = {
                'Japanese': '🇯🇵 Judul JP', 'Genre': '🏷️ Genre',
                'Seasons': '📅 Season', 'Type': '📺 Tipe',
                'Status': '✅ Status', 'Total Episode': '📋 Episode',
                'Score': '⭐ Score', 'Duration': '⏱️ Durasi',
                'Released on': '📆 Rilis', 'Producers': '🏢 Studio',
        };
        for (const [k, lbl] of Object.entries(infoMap)) {
                if (info[k]) text += `${lbl}: ${info[k]}\n`;
        }
        if (synopsis) {
                text += `\n📖 *Synopsis:*\n_${synopsis.slice(0, 300)}${synopsis.length > 300 ? '...' : ''}_\n`;
        }
        text += `\n━━━━━━━━━━━━━━━━━━━\n📥 *Download Links:*\n`;
        for (const group of downloadGroups.slice(0, maxGroups)) {
                text += `\n📦 *${group.groupTitle}*\n`;
                for (const [res, links] of Object.entries(group.resolutions)) {
                        const mirrors = links.map(l => `[${l.label}](${l.url})`).join(' | ');
                        text += `  • *${res}* → ${mirrors}\n`;
                }
        }
        if (downloadGroups.length > maxGroups) {
                text += `\n_...dan ${downloadGroups.length - maxGroups} grup lainnya_\n`;
        }
        text += `\n🔗 *Link Lengkap:* ${url}`;
        return text;
}

function formatSearchResults(results) {
        if (!results.length) return '❌ Tidak ada hasil ditemukan di Kusonime.';
        let text = `🔍 *Hasil Pencarian Kusonime:*\n━━━━━━━━━━━━━━━━━━━\n`;
        results.slice(0, 8).forEach((r, i) => { text += `${i + 1}. ${r.title}\n`; });
        text += `\nTotal: *${results.length} hasil*`;
        return text;
}

function parseSeasonInput(input) {
        const lower = input.toLowerCase().trim();
        const seasons = ['winter', 'spring', 'summer', 'fall'];
        const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : null;
        const season = seasons.find(s => lower.includes(s)) || null;
        return season && year ? { season, year } : null;
}

async function getLatestUpdates(limit = 10) {
        const res = await axios.get(`${BASE}/feed/`, {
                headers: HEADERS,
                timeout: 15000,
        });

        const items = [];
        const blocks = res.data.match(/<item>([\s\S]*?)<\/item>/g) || [];

        for (const block of blocks.slice(0, limit)) {
                const title = (
                        block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                        block.match(/<title>(.*?)<\/title>/)
                )?.[1]?.trim();
                const url = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim();
                const rawDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim();

                if (!title || !url) continue;

                const date = rawDate ? new Date(rawDate) : null;
                const dateStr = date ? date.toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                        timeZone: 'Asia/Jakarta',
                }) : '-';

                items.push({ title: cleanTitle(title), url, dateStr, rawDate });
        }

        return items;
}

function formatLatestUpdates(items) {
        if (!items.length) return '❌ Tidak ada update terbaru dari Kusonime.';

        let text = `📺 *Update Terbaru Kusonime*\n`;
        text += `━━━━━━━━━━━━━━━━━━━\n`;
        text += `🕐 Realtime dari kusonime.com\n\n`;

        items.forEach((it, i) => {
                text += `*${i + 1}.* ${it.title}\n`;
                text += `    📅 ${it.dateStr}\n`;
                text += `    🔗 ${it.url}\n\n`;
        });

        text += `━━━━━━━━━━━━━━━━━━━\n`;
        text += `_Ketik .anime <judul> untuk detail + link download_`;
        return text;
}

module.exports = {
        searchKusonime, getDetailKusonime, getSeasonAnimeList,
        batchFetchDetails, formatSeasonTxt, formatDetailText,
        formatSearchResults, parseSeasonInput, SEASON_NAMES,
        getLatestUpdates, formatLatestUpdates,
};

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleAnime({ hisoka, m, query, tolak, logCommand, logError, path }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                if (!input) {
                        await tolak(hisoka, m,
                                `╭─「 🎌 *KUSONIME* 」\n│\n│ *Cari anime sub indo:*\n│ ${pfx}anime <judul>\n│\n` +
                                `│ *Per musim (kirim .txt + .pdf):*\n│ ${pfx}anime winter 2026\n│ ${pfx}anime spring 2025\n` +
                                `│ ${pfx}anime summer 2024\n│ ${pfx}anime fall 2024\n│\n│ *Cari judul:*\n` +
                                `│ ${pfx}anime one piece\n│ ${pfx}anime attack on titan\n│\n` +
                                `│ 📄 TXT: info + semua link download\n│ 🎨 PDF: desain keren + poster anime\n│ 🌐 Source: kusonime.com\n╰──────────────────────`
                        );
                        return;
                }

                const { searchKusonime, getDetailKusonime, formatDetailText, formatSearchResults, parseSeasonInput, getSeasonAnimeList, batchFetchDetails, formatSeasonTxt, SEASON_NAMES } = exports;

                const seasonParsed = parseSeasonInput(input);

                if (seasonParsed) {
                        const { season, year } = seasonParsed;
                        const seasonLabel = SEASON_NAMES[season] || season;
                        const baseName    = `Kusonime_${seasonLabel}_${year}`;

                        await hisoka.sendMessage(m.from, { react: { text: '📅', key: m.key } });
                        const loadingMsg = await m.reply(
                                `📅 *Mengambil daftar ${seasonLabel} ${year}...*\n⏳ Mohon tunggu, proses ~2–5 menit\n📡 Mengambil daftar anime...`
                        );

                        const animeList = await getSeasonAnimeList(season, year);
                        if (!animeList.length) {
                                await m.reply({ edit: loadingMsg.key, text: `❌ Season *${seasonLabel} ${year}* tidak ditemukan di Kusonime.` });
                                return;
                        }

                        await m.reply({
                                edit: loadingMsg.key,
                                text: `📅 *${seasonLabel} ${year}* — ${animeList.length} anime\n⏳ Mengambil detail + link download...\n[░░░░░░░░░░] 0/${animeList.length}`,
                        });

                        let lastUpdate = 0;
                        const details  = await batchFetchDetails(animeList, async (done, total) => {
                                const now = Date.now();
                                if (now - lastUpdate < 4000 && done < total) return;
                                lastUpdate = now;
                                const pct    = Math.round((done / total) * 100);
                                const filled = Math.round(pct / 10);
                                const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
                                try {
                                        await m.reply({
                                                edit: loadingMsg.key,
                                                text: `📅 *${seasonLabel} ${year}* — ${animeList.length} anime\n⏳ Mengambil detail...\n[${bar}] ${pct}% (${done}/${total})`,
                                        });
                                } catch (_) {}
                        });

                        const validCount = details.filter(Boolean).length;
                        const txtContent = formatSeasonTxt(season, year, details);
                        const txtBuf     = Buffer.from(txtContent, 'utf8');

                        try { await m.reply({ edit: loadingMsg.key, text: `✅ Detail selesai!\n🖨 Membuat file PDF (${validCount} anime + gambar)...` }); } catch (_) {}

                        const { generateSeasonPdf } = require(path.resolve('./src/scrape/anime/kusonime-pdf.cjs'));
                        const pdfBuf = await generateSeasonPdf(season, year, details);

                        try { await m.reply({ edit: loadingMsg.key, text: `✅ Semua file siap! Mengirim TXT + PDF...` }); } catch (_) {}

                        const caption =
                                `📅 *Kusonime — ${seasonLabel} ${year}*\n━━━━━━━━━━━━━━━━━━━\n` +
                                `🎌 Total anime  : *${validCount}* judul\n📄 File TXT     : info + semua link download\n` +
                                `🎨 File PDF     : desain keren + gambar anime\n                   (GDrive, Mega, HXFile, dll)\n🌐 Sumber       : kusonime.com`;

                        await hisoka.sendMessage(m.from, { document: txtBuf, mimetype: 'text/plain', fileName: `${baseName}.txt`, caption }, { quoted: m });
                        await hisoka.sendMessage(m.from, {
                                document: pdfBuf, mimetype: 'application/pdf', fileName: `${baseName}.pdf`,
                                caption: `📄 *PDF ${seasonLabel} ${year}* — ${validCount} anime\n🎨 Termasuk cover, poster, info & link download tiap anime`,
                        }, { quoted: m });
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                } else {
                        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
                        await tolak(hisoka, m, `🔍 Mencari *${input}* di Kusonime...`);
                        const results = await searchKusonime(input);

                        if (!results.length) {
                                await tolak(hisoka, m, `❌ Tidak ada hasil untuk *${input}*.\nCoba kata kunci lain, contoh: _one piece batch_ atau _attack on titan_`);
                                return;
                        }

                        if (results.length === 1) {
                                await tolak(hisoka, m, `📡 Mengambil detail *${results[0].title}*...`);
                                const detail   = await getDetailKusonime(results[0].url);
                                const text     = formatDetailText(detail, 5);
                                const thumbBuf = detail.thumbnail
                                        ? await require('axios').get(detail.thumbnail, { responseType: 'arraybuffer', timeout: 15000 }).then(r => Buffer.from(r.data)).catch(() => null)
                                        : null;
                                if (thumbBuf) await hisoka.sendMessage(m.from, { image: thumbBuf, caption: text }, { quoted: m });
                                else           await tolak(hisoka, m, text);
                        } else {
                                const listText = formatSearchResults(results) + `\n\n💡 _Ketik *${pfx}anime <judul lebih spesifik>* untuk langsung ke detail_`;
                                await tolak(hisoka, m, listText);
                                await tolak(hisoka, m, `📡 Mengambil detail hasil pertama...`);
                                const detail   = await getDetailKusonime(results[0].url);
                                const text     = formatDetailText(detail, 3);
                                const thumbBuf = detail.thumbnail
                                        ? await require('axios').get(detail.thumbnail, { responseType: 'arraybuffer', timeout: 15000 }).then(r => Buffer.from(r.data)).catch(() => null)
                                        : null;
                                if (thumbBuf) await hisoka.sendMessage(m.from, { image: thumbBuf, caption: text }, { quoted: m });
                                else           await tolak(hisoka, m, text);
                        }
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                }

        } catch (err) {
                console.error('[KUSO] Error:', err?.message);
                if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'kusonime');
                await tolak(hisoka, m, `❌ Gagal ambil data Kusonime.\n💬 ${err?.message?.slice(0, 120) || 'Coba lagi nanti'}`);
        }
}

module.exports.handleAnime = handleAnime;

// ── HANDLER: animeupdate ──────────────────────────────────────────────────────

async function handleAnimeupdate({ hisoka, m, tolak, logCommand, logError }) {
        if (!m.prefix && m.query) return;
        try {
                await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
                await tolak(hisoka, m, `📺 Mengambil update terbaru Kusonime...`);
                const items = await getLatestUpdates(10);
                await tolak(hisoka, m, formatLatestUpdates(items));
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        } catch (err) {
                console.error('[KUSOUPDATE] Error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'kusoupdate');
                await tolak(hisoka, m, `❌ Gagal ambil update Kusonime.\n💬 ${err?.message?.slice(0, 100) || 'Coba lagi nanti'}`);
        }
}

module.exports.handleAnimeupdate = handleAnimeupdate;
