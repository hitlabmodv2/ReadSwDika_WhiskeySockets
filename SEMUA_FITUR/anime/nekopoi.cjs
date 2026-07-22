/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  nekopoi.cjs — Scraper NekoPoi.care
 *  Scrape konten terbaru dari nekopoi.care per kategori:
 *  Hentai, 2D Animation, 3D Hentai
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

const BASE = 'https://nekopoi.care';
const JINA = 'https://r.jina.ai';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
    'Referer': 'https://nekopoi.care/',
};

// Kategori yang didukung
const KATEGORI_MAP = {
    'hentai'       : { label: '🎌 Hentai',        slug: 'hentai',        emoji: '🎌' },
    '2d-animation' : { label: '🎥 2D Animation',   slug: '2d-animation',  emoji: '🎥' },
    '3d-hentai'    : { label: '🧊 3D Hentai',      slug: '3d-hentai',     emoji: '🧊' },
};

async function fetchMarkdown(url) {
    const jinaUrl = `${JINA}/${url}`;
    const res = await axios.get(jinaUrl, {
        headers: HEADERS,
        timeout: 30000,
    });
    return res.data || '';
}

// ── Deteksi kategori dari URL ──────────────────────────────────────────────────
function deteksiKategori(url) {
    const u = (url || '').toLowerCase();
    if (/\/l2d-|l2d-sub-indo|-l2d-|\/category\/2d-animation/.test(u)) return '2d-animation';
    if (/\/3d-|-3d-|\/category\/3d-hentai/.test(u)) return '3d-hentai';
    return 'hentai';
}

// ── Parse listing kategori ─────────────────────────────────────────────────────
// Format markdown dari r.jina.ai:
// *   ## [[4K] Title Sinopsis : ...](URL)
// *   ## [Title Sinopsis : ...](URL)
// Judul bisa mengandung [4K], [BATCH], [L2D] dll — pakai greedy [^\n]+ + backtrack
function parseCategoryListing(md, defaultKategori) {
    const results = [];
    const seen    = new Set();

    // Pakai greedy [^\n]+ agar backtrack bisa menemukan ](URL) di akhir baris
    // Cocok dengan judul yang mengandung [] seperti [4K], [BATCH], [L2D]
    const regex = /##\s+\[([^\n]+)\]\((https?:\/\/nekopoi\.care\/[^\s)]+)\)/g;
    let m;
    while ((m = regex.exec(md)) !== null) {
        const url = m[2].trim().replace(/\/+$/, '');
        // Skip halaman kategori/list/nav
        if (seen.has(url)) continue;
        if (/\/(category|genre|hentai-list|jav-list|jadwal|privacy-policy|2257|random)/.test(url)) continue;
        if (url === BASE || url === BASE + '/') continue;
        seen.add(url);

        // Bersihkan judul — strip sinopsis snippet, original title, dll
        let title = m[1].trim();
        title = title
            .replace(/\s+Sinopsis\s*:.*/i, '')       // "Sinopsis : ..."
            .replace(/\s+Sinopsis\s+.*/i, '')         // "Sinopsis Suatu hari..."
            .replace(/\s+Original Title\s*:.*/i, '')
            .replace(/\s+Parody\s*:.*/i, '')
            .replace(/\s+Producers?\s*:.*/i, '')
            .replace(/\s+Duration\s*:.*/i, '')
            .replace(/\s+Genre\s*:.*/i, '')
            .replace(/\s*Subtitle Indonesia\s*/gi, ' Sub Indo')
            .replace(/\s{2,}/g, ' ')
            .trim();

        const kategori = defaultKategori || deteksiKategori(url);
        results.push({ title, url, kategori });
    }
    return results;
}

// ── Parse homepage — ambil "Episode Terbaru" ──────────────────────────────────
function parseHomepageEpisodeTerbaru(md) {
    const results = [];
    const seen    = new Set();

    // Cari section "# Episode Terbaru"
    const sectionM = md.match(/# Episode Terbaru\s*\n([\s\S]*?)(?:\n# [^\n]|\n## Posts pagination|$)/);
    if (!sectionM) return results;

    const section = sectionM[1];
    // Tiap post: ## [Title](URL)\nDate
    const regex = /## \[([^\]]+)\]\((https?:\/\/nekopoi\.care\/[^)]+)\)\s*\n+([^\n]+)/g;
    let m;
    while ((m = regex.exec(section)) !== null) {
        const url = m[2].trim().replace(/\/+$/, '');
        if (seen.has(url)) continue;
        seen.add(url);
        const title    = m[1].trim();
        const tanggal  = m[3].trim();
        const kategori = deteksiKategori(url);
        results.push({ title, url, tanggal, kategori });
    }
    return results;
}

// ── Parse section # Unduh (download links per resolusi) ───────────────────────
// Format markdown:
//   Title [720p]
//   **LINK**
//   [Mp4Upload](https://ouo.io/xxx)[Pixeldrain](https://ouo.io/xxx)[Mirror](https://ouo.io/xxx)
function parseDownloadLinks(md) {
    const downloads = [];

    // Cari section # Unduh
    const unduhM = md.match(/# Unduh\s*\n+([\s\S]+?)(?=\n# |\n## |$)/);
    if (!unduhM) return downloads;

    const content = unduhM[1];

    // Tiap blok: judul + [Resolusi]\n**LINK**\n[Host](URL)...
    const blockRegex = /\[(4K|1080p|720p|480p|360p)\]\s*\n+\*\*LINK\*\*\s*\n+([^\n]+)/gi;
    let m;
    while ((m = blockRegex.exec(content)) !== null) {
        const resolusi = m[1].toLowerCase().replace('4k', '4K');
        const linkLine = m[2];

        const links = [];
        // Host bisa mengandung [ouo] → pakai pola yang izinkan satu level inner bracket
        const linkRe = /\[((?:[^\[\]]|\[[^\[\]]*\])+)\]\((https?:\/\/[^)]+)\)/g;
        let lm;
        while ((lm = linkRe.exec(linkLine)) !== null) {
            // Bersihkan suffix [ouo], [ouo.io] dll dari nama host
            const host = lm[1].trim().replace(/\s*\[ouo(?:\.io)?\]/gi, '').trim();
            links.push({ host, url: lm[2].trim() });
        }
        if (links.length) downloads.push({ resolusi, links });
    }

    // Urutkan: 4K → 1080p → 720p → 480p → 360p
    const URUTAN = ['4K', '1080p', '720p', '480p', '360p'];
    downloads.sort((a, b) => {
        const ia = URUTAN.indexOf(a.resolusi);
        const ib = URUTAN.indexOf(b.resolusi);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return downloads;
}

// ── Parse halaman detail post ──────────────────────────────────────────────────
function parseDetailPost(md, url) {
    // Thumbnail — ambil dari wp-content/uploads, skip logo/app
    // Pakai regex URL langsung agar tidak terpengaruh [4K] di alt text
    let thumbnail = null;
    const thumbRegex = /\]\((https:\/\/nekopoi\.care\/wp-content\/uploads\/[^)"\s]+)\)/g;
    let tm;
    while ((tm = thumbRegex.exec(md)) !== null) {
        const imgUrl = tm[1];
        if (/logo\.png|app\.png|histats/.test(imgUrl)) continue;
        thumbnail = imgUrl;
        break;
    }

    // Judul utama dari H1
    const titleM = md.match(/^# ([^\n]+)/m);
    const title  = titleM ? titleM[1].replace(/\d+\s+kali\s*$/, '').trim() : '';

    // View count — posisi H1: "TITLE 1234 kali"
    // atau sebelum tanggal: "1234 kali Senin, 20 Juli 2026"
    let viewCount = '';
    if (titleM) {
        const vcM = titleM[1].match(/(\d[\d.]*)\s+kali\s*$/i);
        if (vcM) viewCount = vcM[1].replace(/\./g, '');
    }
    if (!viewCount) {
        const vcM2 = md.match(/(\d[\d.]*)\s+kali\s+(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
        if (vcM2) viewCount = vcM2[1].replace(/\./g, '');
    }

    // Tanggal posting — format: "N kali Senin, 20 Juli 2026" atau standalone
    const dateM   = md.match(/((?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s+\d+\s+\w+\s+\d{4})/);
    const tanggal = dateM ? dateM[1].trim() : '';

    // Sinopsis — format bisa **Sinopsis** atau **Sinopsis :**
    let sinopsis = '';
    const sinM = md.match(/\*\*Sinopsis\s*:?\*\*\s*\n+([\s\S]+?)(?=\n\n|\*\*Genre|\*\*Anime\s*:|#\s|$)/i);
    if (sinM) {
        sinopsis = sinM[1].replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    // Genre — bisa mengandung link [Genre](URL) — strip ke teks saja
    const genreM  = md.match(/\*\*Genre\s*:?\*\*\s*([^\n]+)/i);
    const genre   = genreM ? genreM[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/,\s*/g, ', ').trim() : '';

    // Original Title (biasanya ada di konten 2D / 3D sebagai pengganti anime)
    const origM       = md.match(/\*\*Original Title\s*:?\*\*\s*([^\n]+)/i);
    const originalTitle = origM ? origM[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim() : '';

    // Parody (anime/game yang di-parody — ada di 2D & 3D)
    const parodyM = md.match(/\*\*Parody\s*:?\*\*\s*([^\n]+)/i);
    const parody  = parodyM ? parodyM[1].trim().replace(/^–$/, '') : '';

    // Judul anime (original — field khusus hentai series)
    const animeM  = md.match(/\*\*Anime\s*:?\*\*\s*([^\n]+)/i);
    const anime   = animeM ? animeM[1].trim() : '';

    // Judul Jepang
    const jpM     = md.match(/\*\*Judul Jepang\*\*\s*:\s*([^\n]+)/i);
    const judulJp = jpM ? jpM[1].trim() : '';

    // Producers / Studio — strip leading colon kalau ada (format: **Producers**: value)
    const prodM     = md.match(/\*\*(?:Producers?|Studio)\s*:?\*\*\s*:?\s*([^\n]+)/i);
    const producers = prodM ? prodM[1].trim() : '';

    // Duration
    const durM    = md.match(/\*\*Duration\s*:?\*\*\s*([^\n]+)/i);
    const durasi  = durM ? durM[1].trim() : '';

    // Size — strip bold markers
    const sizeM   = md.match(/\*\*Size\s*:?\*\*\s*([^\n]+)/i);
    const ukuran  = sizeM ? sizeM[1].replace(/\*\*/g, '').trim() : '';

    // Status
    const statusM = md.match(/\*\*Status\*\*\s*:\s*([^\n]+)/i);
    const status  = statusM ? statusM[1].trim() : '';

    // Episode info
    const epM     = md.match(/\*\*Episode\*\*\s*:\s*([^\n]*)/i);
    const episode = epM ? epM[1].trim() : '';

    // Tayang
    const tayangM = md.match(/\*\*Tayang\*\*\s*:\s*([^\n]+)/i);
    const tayang  = tayangM ? tayangM[1].trim() : '';

    // Download links
    const downloads = parseDownloadLinks(md);

    // Kategori dari URL
    const kategori = deteksiKategori(url);

    return {
        title, thumbnail, tanggal, sinopsis, genre,
        originalTitle, parody,
        anime, judulJp,
        producers, durasi, ukuran, status, episode, tayang,
        kategori, url, downloads, viewCount,
    };
}

// ── API Publik ─────────────────────────────────────────────────────────────────

async function getHomepageData() {
    const md = await fetchMarkdown(`${BASE}/`);
    const episodeTerbaru = parseHomepageEpisodeTerbaru(md);
    return { episodeTerbaru };
}

async function getCategoryPosts(slug) {
    // slug: 'hentai' | '2d-animation' | '3d-hentai'
    const md = await fetchMarkdown(`${BASE}/category/${slug}/`);
    return parseCategoryListing(md, slug);
}

async function getDetailNekopoi(url) {
    const md = await fetchMarkdown(url);
    return parseDetailPost(md, url);
}

module.exports = {
    KATEGORI_MAP,
    deteksiKategori,
    getHomepageData,
    getCategoryPosts,
    getDetailNekopoi,
};
