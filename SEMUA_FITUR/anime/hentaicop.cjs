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
 *  hentaicop.cjs — Scraper HentaiCop.com
 *  Scrape konten terbaru dari hentaicop.com per kategori:
 *  Hentai · JAV · 2D
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

const BASE = 'https://hentaicop.com';
const JINA = 'https://r.jina.ai';

const HEADERS = {
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
    'X-Return-Format': 'markdown',
};

// Kategori yang didukung
const KATEGORI_MAP = {
    'hentai': { label: '🎌 Hentai', slug: 'hentai', emoji: '🎌', url: `${BASE}/hentai/` },
    'jav'   : { label: '🎬 JAV',    slug: 'jav',    emoji: '🎬', url: `${BASE}/jav/`    },
    '2d'    : { label: '🎥 2D',     slug: '2d',     emoji: '🎥', url: `${BASE}/2d/`     },
};

async function fetchMarkdown(url) {
    const jinaUrl = `${JINA}/${url}`;
    const res = await axios.get(jinaUrl, {
        headers : HEADERS,
        timeout : 30000,
    });
    return res.data || '';
}

// ── Skip URL yang bukan konten series ─────────────────────────────────────────
const SKIP_REGEX = /\/(genre|genres|studio|producer|uncensored|list-mode|bookmark|histori|jadwal|faq|contact|request|dmca|login|download|member)\//i;

// ── Parse listing kategori ─────────────────────────────────────────────────────
// Format Jina (tiap baris):
// [Hentai Ep 2 Sub ![Image N: Title](thumb) Views Title ## Title](https://hentaicop.com/series/slug/ "Title")
// [JAV Completed Sub ![Image N: Title](thumb) Title ## Title](https://hentaicop.com/series/slug/ "Title")
function parseListing(md, defaultKategori) {
    const results = [];
    const seen    = new Set();

    const lines = md.split('\n');
    for (const line of lines) {
        if (!line.includes('hentaicop.com/series/')) continue;
        if (!line.includes('##')) continue;

        // Ambil URL series
        const urlM = line.match(/\(https?:\/\/hentaicop\.com\/series\/([\w-]+)\/?/);
        if (!urlM) continue;
        const slug = urlM[1];
        const url  = `${BASE}/series/${slug}/`;
        if (seen.has(url)) continue;
        if (SKIP_REGEX.test(url)) continue;
        seen.add(url);

        // Ambil judul dari setelah ## sampai sebelum ](https://hentaicop.com
        // Pakai greedy agar judul yang mengandung [] seperti [UNCENSORED] ikut tertangkap
        const titleM = line.match(/##\s+([^#]+?)\]\(https?:\/\/hentaicop\.com/);
        const title  = titleM ? titleM[1].trim() : slug;

        // Ambil ep badge — "Ep N Sub" → N, "Completed" → "completed", "Ongoing" → "ongoing"
        const epNumM  = line.match(/\bEp\s+(\d+)\s+Sub/i);
        const epBadge = epNumM ? epNumM[1] : (line.match(/Completed/i) ? 'completed' : 'ongoing');

        // Ambil thumbnail dari inline image dalam baris
        const thumbM  = line.match(/!\[[^\]]*\]\((https:\/\/hentaicop\.com\/wp-content\/uploads\/[^)]+)\)/);
        const thumbnail = thumbM ? thumbM[1] : null;

        // Deteksi kategori dari badge text
        let kategori = defaultKategori;
        if (/^\[JAV\s/i.test(line))    kategori = 'jav';
        else if (/^\[2D\s/i.test(line)) kategori = '2d';
        else if (/^\[Hentai\s/i.test(line)) kategori = 'hentai';

        results.push({ title, url, slug, thumbnail, epBadge, kategori });
    }

    return results;
}

// ── Parse halaman detail series ───────────────────────────────────────────────
// URL: https://hentaicop.com/series/slug/
function parseDetailSeries(md, url) {
    // ── Thumbnail ──────────────────────────────────────────────────────────────
    // Preferensi: full-size (tanpa suffix ukuran), bukan logo/banner
    let thumbnail = null;
    const thumbRegex = /!\[[^\]]*\]\((https:\/\/hentaicop\.com\/wp-content\/uploads\/[^)]+)\)/g;
    let tm;
    while ((tm = thumbRegex.exec(md)) !== null) {
        const imgUrl = tm[1];
        if (/logo|logo-white|pentaslot|kaiko|rusia|indo66|bm88|koko|arab77|judi|sigacor|jpdewa|ratu|gaza/i.test(imgUrl)) continue;
        if (!/-\d+x\d+\./.test(imgUrl)) { thumbnail = imgUrl; break; } // full-size
    }
    // Fallback: gambar apapun yang bukan banner
    if (!thumbnail) {
        const tr2 = /!\[[^\]]*\]\((https:\/\/hentaicop\.com\/wp-content\/uploads\/[^)]+)\)/g;
        let t2;
        while ((t2 = tr2.exec(md)) !== null) {
            const imgUrl = t2[1];
            if (/logo|logo-white|pentaslot|kaiko|rusia|indo66|bm88|koko|arab77|judi|sigacor|jpdewa|ratu|gaza/i.test(imgUrl)) continue;
            thumbnail = imgUrl;
            break;
        }
    }

    // ── Judul H1 ──────────────────────────────────────────────────────────────
    const titleM = md.match(/^#\s+([^\n]+)/m);
    const title  = titleM ? titleM[1].trim() : '';

    // ── Metadata — semua dalam satu baris panjang ─────────────────────────────
    // **Status:** Completed**Studio:**[X](url)**Released:** 2007...
    const metaRaw = md.match(/\*\*Status:\*\*([^\n]{10,500})/)?.[1] || '';

    function parseMeta(field) {
        const r = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^*]+?)(?=\\*\\*|\\n|$)`);
        const m = metaRaw.match(r);
        return m ? m[1]
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // strip link lengkap [teks](url)
            .replace(/\[([^\]]+)\]\([^)]*$/g, '$1')    // strip link terpotong di akhir string
            .replace(/,\s*/g, ', ')
            .trim() : '';
    }

    const status    = parseMeta('Status');
    const studio    = parseMeta('Studio');
    const released  = parseMeta('Released');
    const duration  = parseMeta('Duration');
    const type      = parseMeta('Type');
    const epTotal   = parseMeta('Episodes');
    const censor    = parseMeta('Censor');
    const producers = parseMeta('Producers');
    const casts     = parseMeta('Casts');
    const tanggal   = parseMeta('Dirilis pada') || parseMeta('Dirilis Pada') || parseMeta('Diposting pada');
    const updatedOn = parseMeta('Updated on');

    // ── Kategori dari field Type ───────────────────────────────────────────────
    let kategori = 'hentai';
    if (/\bjav\b/i.test(type))     kategori = 'jav';
    else if (/\b2d\b/i.test(type)) kategori = '2d';

    // ── Genre dari genre links ─────────────────────────────────────────────────
    const genreMatches = [...md.matchAll(/\[([^\]]+)\]\(https:\/\/hentaicop\.com\/genres\/[^)]+\)/g)];
    const genres = [...new Set(genreMatches.map(m => m[1].trim()))].filter(Boolean).slice(0, 10);

    // ── Rating ────────────────────────────────────────────────────────────────
    const ratingM = md.match(/\*\*Rating\s+([\d.]+)\*\*/i);
    const rating  = ratingM ? ratingM[1] : '';

    // ── Sinopsis dari ## Synopsis ... ─────────────────────────────────────────
    const synopsisM = md.match(/## Synopsis[^\n]*\n+([\s\S]+?)(?=\n\s*\n\s*(?:Sumber asli|##)|\nSumber asli|$)/i);
    let synopsis = '';
    if (synopsisM) {
        synopsis = synopsisM[1]
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/ - Sinopsis[^\n]*/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .trim();
    }

    // ── Daftar episode dari ## Tonton ... ─────────────────────────────────────
    // Format: * [EpNum Title Sub Date - Hentaicop](url)
    const episodeList = [];
    const epRegex = /\*\s*\[(\d+)\s+([^\]]+)\]\((https:\/\/hentaicop\.com\/[^)]+)\)/g;
    let em;
    while ((em = epRegex.exec(md)) !== null) {
        episodeList.push({
            epNum : parseInt(em[1]),
            title : em[2].replace(/\s*-\s*Hentaicop\s*$/i, '').trim(),
            url   : em[3].trim(),
        });
    }
    // Urutan: index 0 = episode terbaru (nomor terbesar)
    episodeList.sort((a, b) => b.epNum - a.epNum);

    // Episode terbaru
    const latestEp    = episodeList[0] || null;
    let latestEpUrl   = latestEp?.url || null;
    let latestEpNum   = latestEp?.epNum || 0;

    // Fallback dari [Episode Baru ...](url)
    if (!latestEpUrl) {
        const latestM = md.match(/\[Episode Baru\s+([^\]]+)\]\((https:\/\/hentaicop\.com\/[^)]+)\)/i);
        if (latestM) {
            latestEpUrl = latestM[2].trim();
            const numM  = latestM[1].match(/(\d+)/);
            if (numM) latestEpNum = parseInt(numM[1]);
        }
    }

    return {
        title, thumbnail, status, studio, released, duration,
        type, epTotal, censor, producers, casts, tanggal, updatedOn,
        kategori, genres, synopsis, rating,
        episodeList, latestEpUrl, latestEpNum, url,
    };
}

// ── Parse tabel download dari halaman episode ─────────────────────────────────
// Format markdown tabel dari jina.ai:
// | HepiDrive Cepat | [1080-Hentaicop-p](ep_url "...") | 296.58 MB | [Download](https://hepidrive.online/...) |
function parseEpisodeDownloads(md) {
    const downloads = [];
    // Cocokkan tiap baris tabel: server | [Nnn-xxx](url) | size | [Download](dl_url)
    const rowRegex = /\|\s*([^|]+?)\s*\|\s*\[(\d+)-[^\]]*\]\([^)]*\)\s*\|\s*([^|]+?)\s*\|\s*\[Download\]\((https?:\/\/[^)]+)\)\s*\|/gi;
    let m;
    while ((m = rowRegex.exec(md)) !== null) {
        const server  = m[1].trim();
        const quality = m[2].trim() + 'p'; // "1080" → "1080p"
        const size    = m[3].trim();
        const url     = m[4].trim();
        downloads.push({ server, quality, size, url });
    }
    // Urutkan: 1080p → 720p → 480p → 360p → 240p
    const ORDER = ['1080p', '720p', '480p', '360p', '240p'];
    downloads.sort((a, b) => {
        const ia = ORDER.indexOf(a.quality);
        const ib = ORDER.indexOf(b.quality);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return downloads;
}

// ── API Publik ─────────────────────────────────────────────────────────────────

async function getCategoryPosts(slug) {
    // slug: 'hentai' | 'jav' | '2d'
    const url = `${BASE}/${slug}/`;
    const md  = await fetchMarkdown(url);
    return parseListing(md, slug);
}

async function getDetailHentaicop(url) {
    const md = await fetchMarkdown(url);
    return parseDetailSeries(md, url);
}

async function getEpisodeDownloads(url) {
    // url: halaman episode (bukan series) — berisi tabel download realtime
    const md = await fetchMarkdown(url);
    return parseEpisodeDownloads(md);
}

module.exports = {
    KATEGORI_MAP,
    getCategoryPosts,
    getDetailHentaicop,
    getEpisodeDownloads,
};
