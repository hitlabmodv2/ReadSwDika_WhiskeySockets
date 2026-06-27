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
 *  alqanime.cjs — Scraper AlqAnime
 *  Cari & info anime dari alqanime.org, mendukung pencarian
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  AlqAnime Scraper
 *  Cari & ambil info anime terbaru dari alqanime.net —
 *  mendukung pencarian judul, daftar episode, dan link download
 *  Sub Indo. Dipakai oleh alqanime-cmd.cjs & alqanime-dl.cjs.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const axios = require('axios');

const BASE    = 'https://alqanime.net';
const JINA    = 'https://r.jina.ai';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
};

async function fetchMarkdown(url) {
    const res = await axios.get(`${JINA}/${url}`, {
        headers: HEADERS,
        timeout: 30000,
    });
    return res.data;
}

function parseAnimeCards(md) {
    const results = [];
    const seen = new Set();
    const regex = /!\[Image \d+: ([^\]]+)\]\((https:\/\/alqanime\.net\/wp-content[^)]+)\)[^\[\n]*## ([^\]]+)\]\((https:\/\/alqanime\.net\/[^/"]+\/)[^\)\n]*\)/g;
    let m;
    while ((m = regex.exec(md)) !== null) {
        const url  = m[4];
        if (url.includes('wp-content') || url.includes('?') || seen.has(url)) continue;
        seen.add(url);
        const title     = m[3].trim();
        const thumbnail = m[2];
        const altText   = m[1];
        const scoreM    = altText.match(/([\d.]+)$/);
        const score     = scoreM ? scoreM[1] : '';
        const typeM     = altText.match(/^(Completed|Ongoing)/i);
        const status    = typeM ? typeM[1] : '';
        results.push({ title, thumbnail, url, score, status });
    }
    return results;
}

function parseDownloadLinks(md) {
    const episodes  = [];
    const dlSection = md.match(/## Download [^\n]+\n([\s\S]*?)(?:### Series Terkait|### Komentar|### Rekomendasi|$)/);
    if (!dlSection) return episodes;

    const dlContent = dlSection[1];

    // Split by ### Episode ATAU ### Batch
    const epBlocks = dlContent.split(/(?=###\s+(?:Episode|Batch))/i);

    function parseLinks(block) {
        const links = {};
        const lines = block.split('\n').filter(l => /360p|480p|720p|1080p/i.test(l));
        for (const line of lines) {
            const resM = line.match(/^(360p|480p|720p|1080p)/i);
            if (!resM) continue;
            const res   = resM[1].toLowerCase();
            const hosts = [];
            const lRe   = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
            let lm;
            while ((lm = lRe.exec(line)) !== null) {
                hosts.push({ host: lm[1], url: lm[2] });
            }
            if (hosts.length) links[res] = hosts;
        }
        return links;
    }

    for (const block of epBlocks) {
        // Tangkap Episode
        const epMatch = block.match(/###\s+Episode\s+([^\n]+)/i);
        if (epMatch) {
            const epLabel = epMatch[1].trim();
            const links   = parseLinks(block);
            if (Object.keys(links).length) episodes.push({ episode: epLabel, links });
            continue;
        }

        // Tangkap Batch (label "Batch" atau "Complete" dll)
        const batchMatch = block.match(/###\s+(Batch[^\n]*|Complete[^\n]*|BD[^\n]*)/i);
        if (batchMatch) {
            const epLabel = batchMatch[1].trim();
            const links   = parseLinks(block);
            if (Object.keys(links).length) episodes.push({ episode: epLabel, links });
        }
    }

    return episodes;
}

function parseDetail(md) {
    const titleM  = md.match(/^# ([^\n]+)/m);
    const title   = titleM ? titleM[1].replace(/ - Alqanime$/, '').trim() : '';

    // Scan semua gambar wp-content → pisahkan landscape banner vs portrait 200x300
    // Regex broad: ambil semua URL wp-content (termasuk yg ada query params / tanpa ekstensi eksplisit)
    const imgRe = /!\[[^\]]*\]\((https:\/\/alqanime\.net\/wp-content\/uploads\/[^)\s"]+)\)/gi;
    let bannerUrl = '', portraitUrl = '', imgM;
    while ((imgM = imgRe.exec(md)) !== null) {
        const imgUrl = imgM[1].split('?')[0]; // hapus query params
        if (/Header|logo|favicon|icon/i.test(imgUrl)) continue;
        if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(imgUrl)) continue; // harus file gambar
        if (/[_-]200x300|[_-]150x225|[_-]300x450/i.test(imgUrl)) {
            if (!portraitUrl) portraitUrl = imgUrl; // poster kecil
        } else {
            if (!bannerUrl) bannerUrl = imgUrl;     // gambar besar/landscape pertama
        }
    }
    // thumbnail = portrait untuk chat; banner = landscape untuk PDF
    const thumbnail = portraitUrl || bannerUrl;
    const banner    = bannerUrl || portraitUrl;

    const info = {};
    for (const field of [
        'Status','Studio','Dirilis','Durasi','Musim','Tipe','Episode',
        'Subtitle','Credit','Score',
        'Casts','Diposting oleh','Diposting pada','Diperbarui pada',
    ]) {
        const re  = new RegExp(`\\*\\*${field.replace(/ /g,'\\s+')}:\\*\\*\\s*([^\\*\\n]+)`);
        const hit = md.match(re);
        if (hit) {
            info[field] = hit[1].trim()
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/^_+|_+$/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }
    }
    const scoreM = md.match(/Score\s+([\d.]+)/);
    if (scoreM && !info.Score) info.Score = scoreM[1];

    // Judul alternatif (English / Kanji) — baris kosong sebelum **Status:**
    const altM = md.match(/\n\n([^\n#*!\[<\\]{3,})\n\n\*\*Status:/);
    if (altM) info.judulAlt = altM[1].trim();

    // Ambil sinopsis — hanya paragraf pertama sebelum baris notice/emoji
    const synM    = md.match(/## Sinopsis[^\n]*\n\n([^#]+)/);
    let sinopsis = '';
    if (synM) {
        const raw = synM[1].trim();
        // Potong di baris yang ada icon notice (✴, !, gambar)
        const cutIdx = raw.search(/\n\s*(?:✴|!|#+\s)/);
        sinopsis = (cutIdx > 0 ? raw.slice(0, cutIdx) : raw)
            .replace(/\r\n/g, '\n')           // normalkan CRLF
            .replace(/\n{3,}/g, '\n\n')        // 3+ newline → 2 (satu baris kosong)
            .replace(/([^\n])\n([^\n])/g, '$1 $2') // newline tunggal dalam paragraf → spasi
            .trim();
    }

    // Ambil genre hanya dari konten post, sebelum sidebar genre list
    const postContent = md.split(/### Sukai Kami|### Rekomendasi|### Komentar/)[0];
    const genres = [];
    const genRe  = /\[([^\]]+)\]\(https:\/\/alqanime\.net\/tag\/[^)]+\)/g;
    let gm;
    while ((gm = genRe.exec(postContent)) !== null) {
        if (!genres.includes(gm[1])) genres.push(gm[1]);
    }

    const episodes = parseDownloadLinks(md);

    return { title, thumbnail, banner, info, sinopsis, genres, episodes };
}

async function searchAlqanime(query) {
    const md = await fetchMarkdown(`${BASE}/?s=${encodeURIComponent(query)}`);
    return parseAnimeCards(md);
}

async function getDetailAlqanime(urlOrSlug) {
    const url = urlOrSlug.startsWith('http') ? urlOrSlug : `${BASE}/${urlOrSlug}/`;
    const md  = await fetchMarkdown(url);
    return parseDetail(md);
}

async function getLatestAlqanime() {
    const md = await fetchMarkdown(BASE);
    return parseAnimeCards(md);
}

async function getRilisanTerbaru() {
    const md = await fetchMarkdown(BASE);
    const sectionM = md.match(/###\s*Rilisan Terbaru\s*\n([\s\S]*?)(?=###\s|\n##\s|$)/i);
    if (!sectionM) return parseAnimeCards(md);
    return parseAnimeCards(sectionM[1]);
}

// Fetch homepage 1x, parse semua section sekaligus — tidak ada request ganda
async function getHomepageData() {
    const md = await fetchMarkdown(BASE);

    const _parseSection = (pattern) => {
        const m = md.match(pattern);
        return m ? parseAnimeCards(m[1]) : [];
    };

    const lagiHangat     = _parseSection(/###\s*Lagi\s*Hangat\s*(?:Saat\s*Ini)?\s*\n([\s\S]*?)(?=###\s|\n##\s|$)/i);
    const rilisanTerbaru = _parseSection(/###\s*Rilisan\s*Terbaru\s*\n([\s\S]*?)(?=###\s|\n##\s|$)/i);
    const semua          = parseAnimeCards(md);

    return { lagiHangat, rilisanTerbaru, semua };
}

// ── Season helpers ─────────────────────────────────────────────────────────────

const SEASON_NAMES_ALQ = {
    winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall',
};

function parseAlqSeasonInput(input) {
    const lower = input.toLowerCase().trim();
    const seasons = ['winter', 'spring', 'summer', 'fall'];
    const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : null;
    const season = seasons.find(s => lower.includes(s)) || null;
    return season && year ? { season, year } : null;
}

async function getAlqSeasonAnimeList(season, year) {
    const slug    = `${season.toLowerCase()}-${year}`;
    // status=completed: hanya ambil anime yg sudah tamat & ada batch
    const baseUrl = `${BASE}/advanced-search/?season%5B%5D=${slug}&status=completed&order=update`;
    const all     = [];
    let page = 1;

    while (true) {
        const url = page === 1 ? baseUrl : `${baseUrl}&page=${page}`;
        try {
            const md = await fetchMarkdown(url);
            const items = parseAnimeCards(md);
            if (!items.length) break;
            // Deduplikasi berdasarkan URL
            for (const item of items) {
                if (!all.find(x => x.url === item.url)) all.push(item);
            }
            if (items.length < 10) break; // halaman terakhir
            page++;
            if (page > 5) break; // safety limit
            await new Promise(r => setTimeout(r, 500));
        } catch (_) { break; }
    }

    return all;
}

async function batchFetchAlqDetails(animeList, onProgress) {
    const BATCH = 3;
    const results = [];
    for (let i = 0; i < animeList.length; i += BATCH) {
        const chunk = animeList.slice(i, i + BATCH);
        const settled = await Promise.allSettled(chunk.map(a =>
            getDetailAlqanime(a.url).then(d => ({
                ...d,
                url      : a.url,
                listThumb: a.thumbnail || '',          // thumbnail card dari listing (pasti valid)
                thumbnail: d.thumbnail || a.thumbnail || '',
            }))
        ));
        for (const s of settled) {
            results.push(s.status === 'fulfilled' ? s.value : null);
        }
        if (onProgress) onProgress(Math.min(i + BATCH, animeList.length), animeList.length);
        if (i + BATCH < animeList.length) await new Promise(r => setTimeout(r, 800));
    }
    return results;
}

function formatAlqSeasonTxt(season, year, animes) {
    const label = SEASON_NAMES_ALQ[season.toLowerCase()] || season;
    const now = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const W    = 60;
    const SEP  = '='.repeat(W);
    const SEP2 = '-'.repeat(W);
    const valid = animes.filter(Boolean);
    let out = '';

    out += `${SEP}\n`;
    out += ` ALQANIME - ANIME ${label.toUpperCase()} ${year}\n`;
    out += ` Source  : alqanime.net\n`;
    out += ` Diambil : ${now}\n`;
    out += ` Total   : ${valid.length} judul\n`;
    out += `${SEP}\n`;

    out += `\n DAFTAR JUDUL:\n${SEP2}\n`;
    let idx = 1;
    for (const anime of animes) {
        if (!anime) continue;
        out += ` > ${String(idx++).padStart(2, '0')}. ${anime.title}\n`;
    }
    out += `${SEP}\n`;

    out += `\n DETAIL & DOWNLOAD LINKS:\n${SEP}\n`;
    let no = 1;
    for (const anime of animes) {
        if (!anime) continue;
        out += `\n[${String(no++).padStart(2, '0')}] ${anime.title}\n${SEP2}\n`;
        const info = anime.info || {};
        for (const [k, lbl] of [
            ['Status', 'Status  '], ['Tipe', 'Tipe    '], ['Studio', 'Studio  '],
            ['Dirilis', 'Rilis   '], ['Musim', 'Musim   '], ['Episode', 'Episode '],
            ['Durasi', 'Durasi  '], ['Score', 'Score   '],
        ]) {
            if (info[k]) out += ` ${lbl} : ${info[k]}\n`;
        }
        if (anime.genres?.length) out += ` Genre    : ${anime.genres.join(', ')}\n`;
        if (anime.sinopsis) {
            const syn = anime.sinopsis.slice(0, 300) + (anime.sinopsis.length > 300 ? '...' : '');
            out += ` Sinopsis : ${syn}\n`;
        }
        if (anime.url) out += ` URL      : ${anime.url}\n`;
        if (anime.episodes?.length) {
            out += `\n Download Links:\n`;
            for (const ep of anime.episodes) {
                out += `\n  >> Episode ${ep.episode}\n`;
                for (const [res, hosts] of Object.entries(ep.links || {})) {
                    out += `     [${res.toUpperCase()}]\n`;
                    for (const h of (hosts || [])) {
                        out += `       - ${(h.host || '-').padEnd(14)}: ${h.url}\n`;
                    }
                }
            }
        }
        out += `\n${SEP}\n`;
    }
    out += ` Generated by Wily Bot | alqanime.net\n${SEP}\n`;
    return out;
}

module.exports = {
    searchAlqanime, getDetailAlqanime, getLatestAlqanime, getRilisanTerbaru, getHomepageData,
    parseAlqSeasonInput, getAlqSeasonAnimeList, batchFetchAlqDetails, formatAlqSeasonTxt, SEASON_NAMES_ALQ,
};

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleAlq({ hisoka, m, query, tolak, logCommand, logError, path, pendingAlqDlChoices, getJadibotChoiceKey }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                /* .alqanime (dengan atau tanpa query) → selalu tampilkan rilisan terbaru realtime */
                /* .alq [judul] → untuk pencarian spesifik */
                const isAlqanimeCmd = (m.command || '').toLowerCase() === 'alqanime';

                // ── Deteksi input musim → kirim TXT + PDF (berlaku untuk .alqanime & .alq) ───
                if (input) {
                    const seasonParsed = parseAlqSeasonInput(input);
                    if (seasonParsed) {
                        const { season, year } = seasonParsed;
                        const label    = SEASON_NAMES_ALQ[season] || season;
                        const baseName = `Alqanime_${label}_${year}`;

                        await hisoka.sendMessage(m.from, { react: { text: '📅', key: m.key } });
                        const loadingMsg = await m.reply(
                            `📅 *Mengambil daftar ${label} ${year}...*\n⏳ Mohon tunggu, proses ~2–5 menit\n📡 Mengambil daftar anime dari alqanime.net...`
                        );

                        const animeList = await getAlqSeasonAnimeList(season, year);
                        if (!animeList.length) {
                            await m.reply({ edit: loadingMsg.key, text: `❌ Season *${label} ${year}* tidak ditemukan di Alqanime.` });
                            return;
                        }

                        await m.reply({
                            edit: loadingMsg.key,
                            text: `📅 *${label} ${year}* — ${animeList.length} anime\n⏳ Mengambil detail + link download...\n[░░░░░░░░░░] 0/${animeList.length}`,
                        });

                        let lastUpdate = 0;
                        const details = await batchFetchAlqDetails(animeList, async (done, total) => {
                            const now2 = Date.now();
                            if (now2 - lastUpdate < 4000 && done < total) return;
                            lastUpdate = now2;
                            const pct    = Math.round((done / total) * 100);
                            const filled = Math.round(pct / 10);
                            const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
                            try {
                                await m.reply({
                                    edit: loadingMsg.key,
                                    text: `📅 *${label} ${year}* — ${animeList.length} anime\n⏳ Mengambil detail...\n[${bar}] ${pct}% (${done}/${total})`,
                                });
                            } catch (_) {}
                        });

                        const validCount = details.filter(Boolean).length;
                        const txtContent = formatAlqSeasonTxt(season, year, details);
                        const txtBuf     = Buffer.from(txtContent, 'utf8');

                        try { await m.reply({ edit: loadingMsg.key, text: `✅ Detail selesai!\n🖨 Membuat file PDF (${validCount} anime + gambar)...` }); } catch (_) {}

                        const { generateAlqSeasonPdf } = require(path.resolve('./SEMUA_FITUR/anime/alqanime-pdf.cjs'));
                        const pdfBuf = await generateAlqSeasonPdf(season, year, details);

                        try { await m.reply({ edit: loadingMsg.key, text: `✅ Semua file siap! Mengirim TXT + PDF...` }); } catch (_) {}

                        const caption =
                            `📅 *Alqanime — ${label} ${year}*\n━━━━━━━━━━━━━━━━━━━\n` +
                            `🎌 Total anime  : *${validCount}* judul\n` +
                            `📄 File TXT     : info + semua link download\n` +
                            `🎨 File PDF     : desain keren + gambar anime\n` +
                            `🌐 Sumber       : alqanime.net`;

                        await hisoka.sendMessage(m.from, { document: txtBuf, mimetype: 'text/plain', fileName: `${baseName}.txt`, caption }, { quoted: m });
                        await hisoka.sendMessage(m.from, {
                            document: pdfBuf, mimetype: 'application/pdf', fileName: `${baseName}.pdf`,
                            caption: `📄 *PDF ${label} ${year}* — ${validCount} anime\n🎨 Termasuk cover, poster, info & link download tiap anime`,
                        }, { quoted: m });
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        logCommand(m, hisoka, `alqanime season ${season} ${year}`);
                        return;
                    }
                }

                if (!input || isAlqanimeCmd) {
                        await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
                        const { getRilisanTerbaru } = module.exports;
                        const latest = await getRilisanTerbaru();
                        if (!latest.length) {
                                await tolak(hisoka, m, `❌ Gagal ambil rilisan terbaru. Coba lagi.`);
                                return;
                        }
                        let latestText = `🎌 *Rilisan Terbaru — Alqanime*\n━━━━━━━━━━━━━━━━━━━\n`;
                        latest.slice(0, 15).forEach((a, i) => { latestText += `${i + 1}. ${a.title}\n`; });
                        latestText += `━━━━━━━━━━━━━━━━━━━\n🌐 alqanime.net\n\n`;
                        latestText += `📌 *Cari anime spesifik:* ${pfx}alq <judul>\n`;
                        latestText += `📅 *Per musim (TXT + PDF):*\n`;
                        latestText += `   ${pfx}alq winter 2025\n`;
                        latestText += `   ${pfx}alq spring 2025\n`;
                        latestText += `   ${pfx}alqanime fall 2024`;
                        await tolak(hisoka, m, latestText);
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        logCommand(m, hisoka, 'alqanime');
                        return;
                }

                const { searchAlqanime, getDetailAlqanime } = module.exports;

                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

                const results = await searchAlqanime(input);
                if (!results.length) { await tolak(hisoka, m, `❌ Tidak ada hasil untuk *${input}*.\nCoba kata kunci lain.`); return; }

                const detail = await getDetailAlqanime(results[0].url);
                const info   = detail.info || {};
                const eps    = detail.episodes || [];
                const latestEp = eps[0];

                let text = `🎌 *${detail.title}*\n━━━━━━━━━━━━━━━━━━━\n`;
                if (info.Status)  text += `📌 Status   : ${info.Status}\n`;
                if (info.Tipe)    text += `🎬 Tipe     : ${info.Tipe}\n`;
                if (info.Studio)  text += `🏢 Studio   : ${info.Studio}\n`;
                if (info.Dirilis) text += `📅 Dirilis  : ${info.Dirilis}\n`;
                if (info.Durasi)  text += `⏱ Durasi   : ${info.Durasi}\n`;
                if (info.Episode) text += `📺 Episode  : ${info.Episode}\n`;
                if (info.Score)   text += `⭐ Score    : ${info.Score}\n`;
                if (detail.genres?.length) text += `🏷 Genre    : ${detail.genres.join(', ')}\n`;
                if (detail.sinopsis) {
                        text += `━━━━━━━━━━━━━━━━━━━\n📖 *Sinopsis:*\n${detail.sinopsis.slice(0, 300)}${detail.sinopsis.length > 300 ? '...' : ''}\n`;
                }
                if (latestEp) {
                        text += `━━━━━━━━━━━━━━━━━━━\n📥 *Download Episode ${latestEp.episode}:*\n`;
                        for (const [res, hosts] of Object.entries(latestEp.links)) {
                                const hostList = hosts.map(h => `[${h.host}](${h.url})`).join(' | ');
                                text += `• *${res.toUpperCase()}* : ${hostList}\n`;
                        }
                        if (eps.length > 1) text += `\n_...dan ${eps.length - 1} episode lainnya_\n`;
                }
                text += `━━━━━━━━━━━━━━━━━━━\n🌐 ${results[0].url}`;

                if (detail.thumbnail) {
                        /* Download gambar — butuh Referer + UA untuk bypass hotlink alqanime.net */
                        const thumbBuf = await axios.get(detail.thumbnail, {
                                headers: {
                                        ...HEADERS,
                                        'Referer': 'https://alqanime.net/',
                                        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                                },
                                responseType: 'arraybuffer',
                                timeout: 15000,
                        }).then(r => {
                                console.log('[ALQANIME] Thumbnail OK:', detail.thumbnail, 'size:', r.data.byteLength);
                                return Buffer.from(r.data);
                        }).catch(e => {
                                console.warn('[ALQANIME] Thumbnail gagal:', e?.message);
                                return null;
                        });

                        if (thumbBuf) {
                                await hisoka.sendMessage(m.from, { image: thumbBuf, caption: text }, { quoted: m });
                        } else {
                                await tolak(hisoka, m, text);
                        }
                } else {
                        await tolak(hisoka, m, text);
                }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                if (eps.length > 0) {
                        const allRes = new Set();
                        for (const ep of eps) for (const r of Object.keys(ep.links)) if (r !== 'batch') allRes.add(r);
                        const resList = ['360p','480p','720p','1080p'].filter(r => allRes.has(r));
                        let dlMenu = `📥 *PILIH EPISODE & RESOLUSI*\n━━━━━━━━━━━━━━━━━━━\n🎌 *${detail.title}*\n\n*Daftar Episode (${eps.length}):*\n`;
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
                        dlMenu += `\n━━━━━━━━━━━━━━━━━━━\n📌 *Reply pesan ini:*\n• *1 720p* — 1 episode, kirim video\n• *1-3 480p* — batch ep 1-3 (ZIP)\n• *1,3,5 360p* — ep pilihan (ZIP)\n• *all 360p* — semua episode (ZIP)\n• Tanpa resolusi = otomatis terbaik\n\n⏳ Menu berlaku *5 menit*`;

                        const menuMsg = await hisoka.sendMessage(m.from, { text: dlMenu }, { quoted: m });
                        const alqKey  = getJadibotChoiceKey(m);
                        const oldAlq  = pendingAlqDlChoices.get(alqKey);
                        if (oldAlq?.timeout) clearTimeout(oldAlq.timeout);
                        const alqTimeout = setTimeout(() => pendingAlqDlChoices.delete(alqKey), 5 * 60 * 1000);
                        pendingAlqDlChoices.set(alqKey, {
                                animeTitle: detail.title, episodes: eps,
                                botMsgId: menuMsg?.key?.id || '',
                                expiresAt: Date.now() + 5 * 60 * 1000,
                                timeout: alqTimeout,
                        });
                }
        } catch (err) {
                console.error('[ALQANIME] Error:', err?.message);
                if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqanime');
                await tolak(hisoka, m, `❌ Gagal ambil data Alqanime.\n💬 ${err?.message?.slice(0, 120) || 'Coba lagi nanti'}`);
        }
}

module.exports.handleAlq = handleAlq;

async function handleAlqupdate({ hisoka, m, tolak, logCommand, logError, _require, path, getJadibotChoiceKey, pendingAlqUpdateChoices }) {
        try {
                const items = await getLatestAlqanime();

                if (!items.length) {
                        await tolak(hisoka, m, `❌ Gagal ambil data terbaru.`);
                        return;
                }

                await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
                await tolak(hisoka, m, `📺 Mengambil rilisan terbaru Alqanime...`);

                const showItems = items.slice(0, 15);
                let text = `🎌 *Rilisan Terbaru — Alqanime*\n`;
                text += `━━━━━━━━━━━━━━━━━━━\n`;
                showItems.forEach((a, i) => {
                        text += `${i + 1}. ${a.title}\n`;
                });
                text += `━━━━━━━━━━━━━━━━━━━\n`;
                text += `🌐 alqanime.net\n\n`;
                text += `📌 *Reply pesan ini:*\n`;
                text += `• *1* — lihat episode & pilih resolusi\n`;
                text += `• *1 720p* — langsung download ep terbaru 720p\n`;
                text += `• *batal* — batalkan\n`;
                text += `⏳ Menu berlaku *5 menit*`;

                const updMenuMsg = await hisoka.sendMessage(m.from, { text }, { quoted: m });
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                const alqUpdKey2 = getJadibotChoiceKey(m);
                const oldUpd = pendingAlqUpdateChoices.get(alqUpdKey2);
                if (oldUpd?.timeout) clearTimeout(oldUpd.timeout);
                const updTimeout = setTimeout(() => pendingAlqUpdateChoices.delete(alqUpdKey2), 5 * 60 * 1000);
                pendingAlqUpdateChoices.set(alqUpdKey2, {
                        items: showItems,
                        botMsgId: updMenuMsg?.key?.id || '',
                        expiresAt: Date.now() + 5 * 60 * 1000,
                        timeout: updTimeout,
                });

        } catch (err) {
                console.error('[ALQUPDATE] Error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqanimeupdate');
                await tolak(hisoka, m, `❌ Gagal ambil update Alqanime.\n💬 ${err?.message?.slice(0, 100) || 'Coba lagi nanti'}`);
        }
}

module.exports.handleAlqupdate = handleAlqupdate;
