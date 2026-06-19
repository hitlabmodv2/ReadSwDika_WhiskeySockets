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
 *  an1game.cjs — Scraper AN1.com (.an1game)
 *  Cari & info game Android modded dari an1.com
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const BASE        = 'https://an1.com';
const JINA        = 'https://r.jina.ai';
const DIR_DATA    = path.join(process.cwd(), 'data', 'an1game');
const FILE_STATE  = path.join(DIR_DATA, 'state.json');
const FILE_LOG    = path.join(DIR_DATA, 'log.json');
const FILE_CONFIG = path.join(process.cwd(), 'config.json');

fs.mkdirSync(DIR_DATA, { recursive: true });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
};

// ── STATE ─────────────────────────────────────────────────────────────────────

function bacaState() {
    try {
        if (fs.existsSync(FILE_STATE)) return JSON.parse(fs.readFileSync(FILE_STATE, 'utf-8'));
    } catch (_) {}
    return { urlTerkirim: [], lastCheck: null, initialized: false, idsTerlihat: [] };
}

// Ambil ID angka dari URL an1.com
function extractId(url) {
    const m = url.match(/an1\.com\/(\d+)-/);
    return m ? parseInt(m[1], 10) : null;
}

// Tentukan tipe game: 'baru' = baru ditambahkan ke an1.com, 'update' = versi baru game lama
function tentikanTipe(gameUrl, state) {
    const id  = extractId(gameUrl);
    if (!id) return 'update';
    const ids = state?.idsTerlihat || [];
    // Kalau ID-nya belum pernah ada di daftar saat init → kemungkinan game baru
    return ids.includes(id) ? 'update' : 'baru';
}

function simpanState(data) {
    try { fs.writeFileSync(FILE_STATE, JSON.stringify(data, null, 2), 'utf-8'); } catch (_) {}
}

// ── LOG ───────────────────────────────────────────────────────────────────────

function bacaLog() {
    try {
        if (fs.existsSync(FILE_LOG)) return JSON.parse(fs.readFileSync(FILE_LOG, 'utf-8'));
    } catch (_) {}
    return { terkirim: [] };
}

function simpanLog(log) {
    try { fs.writeFileSync(FILE_LOG, JSON.stringify(log, null, 2), 'utf-8'); } catch (_) {}
}

// ── CONFIG (grup aktif) ────────────────────────────────────────────────────────

function bacaConfig() {
    try {
        if (fs.existsSync(FILE_CONFIG)) return JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf-8'));
    } catch (_) {}
    return {};
}

function simpanConfig(cfg) {
    try { fs.writeFileSync(FILE_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) {}
}

function getEnabledGroups() {
    const cfg    = bacaConfig();
    const groups = cfg?.anigame?.groups || {};
    return Object.entries(groups)
        .filter(([, v]) => v?.enabled === true)
        .map(([jid]) => jid);
}

function setGroupEnabled(jid, enabled) {
    const cfg = bacaConfig();
    if (!cfg.anigame)        cfg.anigame        = { groups: {} };
    if (!cfg.anigame.groups) cfg.anigame.groups = {};
    cfg.anigame.groups[jid] = { enabled, diubahPada: Date.now() };
    simpanConfig(cfg);
}

// ── FETCH MARKDOWN VIA JINA ───────────────────────────────────────────────────

async function fetchMarkdown(url) {
    const res = await axios.get(`${JINA}/${url}`, { headers: HEADERS, timeout: 30000 });
    return res.data;
}

// ── TRANSLATE KE BAHASA INDONESIA (Google Translate gratis) ───────────────────

async function translateToIndo(text) {
    if (!text) return '';
    try {
        const url = 'https://translate.googleapis.com/translate_a/single'
            + '?client=gtx&sl=en&tl=id&dt=t&q='
            + encodeURIComponent(text);
        const res    = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const hasil  = (res.data[0] || []).map(x => x[0]).join('');
        return hasil || text;
    } catch (e) {
        console.warn('[AniGame] Translate gagal, pakai teks asli:', e?.message);
        return text; // fallback ke bahasa Inggris
    }
}

// ── TEXT HELPERS ──────────────────────────────────────────────────────────────

function potongTeks(teks, maks = 280) {
    if (!teks || teks.length <= maks) return teks || '';
    const potong    = teks.slice(0, maks);
    const lastSpace = potong.lastIndexOf(' ');
    return (lastSpace > 50 ? potong.slice(0, lastSpace) : potong) + '...';
}

function formatInstalls(raw) {
    if (!raw) return '';
    // "500 000 000+" → "500.000.000+"
    return raw.replace(/\s+/g, '.').replace(/\.$/, '');
}

function formatTanggalIndo(raw) {
    if (!raw) return '';
    const map = {
        January: 'Januari', February: 'Februari', March: 'Maret',
        April: 'April', May: 'Mei', June: 'Juni', July: 'Juli',
        August: 'Agustus', September: 'September', October: 'Oktober',
        November: 'November', December: 'Desember',
    };
    // Coba reorder "Month DD, YYYY" → "DD Month YYYY"
    let tgl = raw.trim();
    const mArr = tgl.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (mArr) tgl = `${mArr[2]} ${mArr[1]} ${mArr[3]}`;
    for (const [en, id] of Object.entries(map)) {
        tgl = tgl.replace(new RegExp(en, 'gi'), id);
    }
    return tgl;
}

// ── PARSE HALAMAN DETAIL GAME ─────────────────────────────────────────────────
//
// Struktur markdown jina untuk halaman detail an1.com:
//
// Title: Download TITLE VERSION APK for android
// Published Time: ...
//
// *   [AN1.com](...)
// *   [Games](...)
// *   [CATEGORY](...)        ← breadcrumb kategori
//
// ![Image 1: NAME mod apk](IMAGE_URL)ONLINE_STATUS  ← bisa ada "Offline"/"Online" langsung setelah ]
//
// *   Android X.X +
// *    Version: X.X.X
// *   XXXMb
//
// DEVELOPER
//
// **FULL_GAME_TITLE** - SINOPSIS TEXT
//
// Additional Information:
// *   **Updated**DATE
// *   **Price**$X
// *   **Installs** XXX
// *   **Rated for****X+** years

function parseDetailPage(md, fallbackUrl) {
    const lines = md.split('\n');

    // Judul dari baris Title:
    let fullTitle = '';
    const titleLine = lines.find(l => l.startsWith('Title:'));
    if (titleLine) {
        fullTitle = titleLine.replace(/^Title:\s*/, '').replace(/\s*APK for android$/i, '').replace(/^Download\s+/i, '').trim();
    }

    // Versi dari judul (misal "6.38.0" di akhir judul sebelum "APK")
    let version = '';
    const verFromTitle = fullTitle.match(/\s+([\d.]+)$/);
    if (verFromTitle) {
        version = verFromTitle[1];
        fullTitle = fullTitle.replace(verFromTitle[0], '').trim();
    }

    // Kategori dari breadcrumb (baris ke-3 link setelah [AN1.com] dan [Games])
    let category = '';
    let bcCount = 0;
    for (const ln of lines) {
        if (/\[AN1\.com\]/i.test(ln)) { bcCount++; continue; }
        if (/\[Games\]/i.test(ln) && bcCount >= 1) { bcCount++; continue; }
        if (bcCount === 2 && ln.match(/^\*\s+\[/)) {
            const m = ln.match(/\[([^\]]+)\]\(https:\/\/an1\.com\/games\//);
            if (m) { category = m[1]; break; }
        }
    }

    // Image + Online/Offline — pola: ![Image 1: NAME](URL)Offline atau ![...](URL)
    let image      = '';
    let koneksi    = '';
    for (const ln of lines) {
        const m = ln.match(/!\[Image 1:[^\]]+\]\((https:\/\/an1\.com\/uploads\/[^)]+)\)(Online|Offline)?/);
        if (m) {
            image   = m[1];
            koneksi = m[2] || '';
            break;
        }
    }

    // Spesifikasi: Android, Version, Size (3 bullet list berurutan)
    let android = '';
    let size    = '';
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        // Android requirement
        if (!android && /^\*\s+Android\s+[\d.]+/.test(ln)) {
            android = ln.replace(/^\*\s+/, '').trim();
        }
        // Version dari list (kalau belum dari title)
        if (!version && /^\*\s+Version:\s+[\d.]+/.test(ln)) {
            version = ln.replace(/^\*\s+Version:\s+/, '').trim();
        }
        // Size: angka + Mb/Gb
        if (!size && /^\*\s+[\d.]+\s*(Mb|Gb|MB|GB)/i.test(ln)) {
            size = ln.replace(/^\*\s+/, '').trim();
        }
    }

    // Developer — baris teks biasa setelah blok spesifikasi
    let developer = '';
    let foundSpec = false;
    for (let i = 0; i < lines.length; i++) {
        const ln = lines[i].trim();
        if (/^\*\s+(Android|Version|[\d.]+\s*(Mb|Gb))/i.test(ln)) { foundSpec = true; }
        if (foundSpec && !developer && ln &&
            !ln.startsWith('*') && !ln.startsWith('!') && !ln.startsWith('[') && !ln.startsWith('#') &&
            !ln.startsWith('**') && ln.length > 1 && ln.length < 60) {
            developer = ln;
            break;
        }
    }

    // Sinopsis — baris yang dimulai **JUDUL** - DESKRIPSI (ambil teks PENUH, tanpa potong)
    let sinopsis = '';
    for (const ln of lines) {
        const m = ln.match(/^\*\*[^*]+\*\*\s*[-–]\s*(.+)/);
        if (m && m[1].length > 30) {
            sinopsis = m[1].trim();
            break;
        }
    }
    // Fallback: ambil baris deskripsi panjang pertama
    if (!sinopsis) {
        for (const ln of lines) {
            const clean = ln.trim();
            if (clean.length > 80 && !clean.startsWith('*') && !clean.startsWith('!') &&
                !clean.startsWith('[') && !clean.startsWith('#') && !clean.startsWith('>')) {
                sinopsis = clean;
                break;
            }
        }
    }
    // Bersihkan trailing elipsis jika ada (kadang jina tambah "...")
    sinopsis = sinopsis.replace(/\s*\.\.\.\s*$/, '').trim();

    // Additional Information block
    let updatedRaw = '';
    let price      = '';
    let installs   = '';
    let ratedFor   = '';
    for (const ln of lines) {
        const l = ln.trim();
        if (!updatedRaw) {
            const m = l.match(/\*\*Updated\*\*(.+)/);
            if (m) updatedRaw = m[1].trim();
        }
        if (!price) {
            const m = l.match(/\*\*Price\*\*(.+)/);
            if (m) price = m[1].trim();
        }
        if (!installs) {
            const m = l.match(/\*\*Installs\*\*\s*(.+)/);
            if (m) installs = m[1].trim();
        }
        if (!ratedFor) {
            const m = l.match(/\*\*Rated for\*\*\*\*(.+?)\*\*/);
            if (m) ratedFor = m[1].trim();
        }
    }

    // MOD info dari judul: "(MOD, Unlimited Coins)" dll
    let modInfo = '';
    const modMatch = fullTitle.match(/\(MOD[^)]*\)/i);
    if (modMatch) modInfo = modMatch[0];

    return {
        fullTitle,
        version,
        category,
        image,
        koneksi,
        android,
        size,
        developer,
        sinopsis,          // teks penuh, belum di-translate (dilakukan di fetchGameDetail)
        updated: formatTanggalIndo(updatedRaw),
        price,
        installs: formatInstalls(installs),
        ratedFor,
        modInfo,
        url: fallbackUrl || '',
    };
}

// ── FETCH DIRECT APK DOWNLOAD LINK ────────────────────────────────────────────
// Ambil dari /file_ID-dw.html menggunakan axios (jina tidak render JS download btn)

async function fetchDownloadUrl(gameUrl) {
    try {
        // Extract ID dari URL: https://an1.com/266-slug.html → 266
        const idMatch = gameUrl.match(/an1\.com\/(\d+)-/);
        if (!idMatch) return '';

        const id          = idMatch[1];
        const downloadPage = `${BASE}/file_${id}-dw.html`;

        const res = await axios.get(downloadPage, {
            headers: {
                'User-Agent' : HEADERS['User-Agent'],
                'Accept'     : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': HEADERS['Accept-Language'],
                'Referer'    : gameUrl,
            },
            timeout: 20000,
            decompress: true,
        });

        const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        // Cari semua files.an1.net/*.apk — abaikan an1store.apk
        const matches = html.match(/https:\/\/files\.an1\.net\/[^\s"'<>]+\.apk/g) || [];
        const apkUrl  = matches.find(u => !u.includes('an1store'));
        return apkUrl || '';
    } catch (e) {
        console.warn('[AniGame] Gagal fetch download URL:', e?.message);
        return '';
    }
}

// ── FETCH DETAIL HALAMAN GAME ─────────────────────────────────────────────────

async function fetchGameDetail(gameUrl) {
    try {
        // Fetch detail page via jina + download URL secara paralel
        const [md, dlUrl] = await Promise.all([
            fetchMarkdown(gameUrl),
            fetchDownloadUrl(gameUrl),
        ]);

        const detail = parseDetailPage(md, gameUrl);
        if (!detail) return null;

        detail.downloadUrl = dlUrl || '';

        // Translate sinopsis ke Bahasa Indonesia (teks penuh, tanpa potong)
        if (detail.sinopsis) {
            detail.sinopsis = await translateToIndo(detail.sinopsis);
        }

        return detail;
    } catch (e) {
        console.warn('[AniGame] Gagal fetch detail:', gameUrl, e?.message);
        return null;
    }
}

// ── PARSE GAMES LIST (halaman /games/) ────────────────────────────────────────

function parseGamesList(md) {
    const results = [];
    const seen    = new Set();
    const lines   = md.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const imgLine = lines[i].trim();
        if (!imgLine.startsWith('![Image ') || !imgLine.includes('an1.com/uploads/')) continue;

        const imgMatch = imgLine.match(/!\[Image \d+:\s*([^\]]+)\]\((https:\/\/an1\.com\/uploads\/[^)]+)\)/);
        if (!imgMatch) continue;

        const imgTitle = imgMatch[1].trim();
        const imgUrl   = imgMatch[2];

        let gameUrl = '';
        let title   = imgTitle;
        let dev     = '';
        let rating  = '';

        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const ln = lines[j].trim();
            if (!ln) continue;
            if (!gameUrl && ln.startsWith('[') && ln.includes('an1.com/') && ln.includes('.html')) {
                const m = ln.match(/\[([^\]]+)\]\((https:\/\/an1\.com\/[0-9]+-[^)"]+\.html)/);
                if (m) { title = m[1].trim(); gameUrl = m[2]; }
                continue;
            }
            if (!dev && !ln.startsWith('*') && !ln.startsWith('!') && !ln.startsWith('[') && !ln.startsWith('#') && ln.length > 1 && ln.length < 80) {
                dev = ln; continue;
            }
            if (!rating && /^\*\s+[\d.]+$/.test(ln)) {
                rating = ln.replace(/^\*\s+/, '').trim(); break;
            }
        }

        if (!title || seen.has(gameUrl || title)) continue;
        seen.add(gameUrl || title);
        results.push({ title, image: imgUrl, url: gameUrl, developer: dev, rating });
    }

    return results;
}

// ── PARSE SEARCH RESULTS ──────────────────────────────────────────────────────

function parseSearchResults(md) {
    const results = [];
    const seen    = new Set();
    const lines   = md.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const imgLine = lines[i].trim();
        if (!imgLine.startsWith('![Image ') || !imgLine.includes('an1.com/uploads/')) continue;

        const imgMatch = imgLine.match(/!\[Image \d+:\s*([^\]]+)\]\((https:\/\/an1\.com\/uploads\/[^)]+)\)/);
        if (!imgMatch) continue;

        const title  = imgMatch[1].trim();
        const imgUrl = imgMatch[2];

        let dev     = '';
        let gameUrl = '';
        let rating  = '';

        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const ln = lines[j].trim();
            if (!ln) continue;
            if (!gameUrl && ln.startsWith('[') && ln.includes('an1.com/') && ln.includes('.html')) {
                const m = ln.match(/\[([^\]]+)\]\((https:\/\/an1\.com\/[0-9]+-[^)"]+\.html)/);
                if (m) { gameUrl = m[2]; } continue;
            }
            if (!dev && !ln.startsWith('*') && !ln.startsWith('!') && !ln.startsWith('[') && !ln.startsWith('#') && ln.length > 1 && ln.length < 80) {
                dev = ln; continue;
            }
            if (!rating && /^\*\s+[\d.]+$/.test(ln)) {
                rating = ln.replace(/^\*\s+/, '').trim(); break;
            }
        }

        if (!title || seen.has(title)) continue;
        seen.add(title);
        results.push({ title, image: imgUrl, url: gameUrl, developer: dev, rating });
    }

    return results;
}

// ── FETCH GAMES LIST ──────────────────────────────────────────────────────────

async function getGamesList(page = 1) {
    const url = page > 1 ? `${BASE}/games/page/${page}/` : `${BASE}/games/`;
    const md  = await fetchMarkdown(url);
    return parseGamesList(md);
}

// ── FETCH SEARCH ──────────────────────────────────────────────────────────────

async function searchGames(query) {
    const encoded = encodeURIComponent(query.trim());
    const url     = `${BASE}/?do=search&subaction=search&story=${encoded}`;
    const md      = await fetchMarkdown(url);
    const match   = md.match(/Found (\d+) apps?/i);
    const total   = match ? parseInt(match[1]) : null;
    const games   = parseSearchResults(md);
    return { games, total, searchUrl: `${BASE}/?do=search&subaction=search&story=${encoded}` };
}

// ── FORMAT CAPTION NOTIF GRUP (mobile-friendly WhatsApp) ─────────────────────

const SEP  = '━━━━━━━━━━━━━━━━━━━';
const SEP2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function buatCaption(game, detail = null) {
    // d = sumber data utama: detail jika ada, fallback ke game (yang sudah merged)
    const d = detail || game || {};

    // Waktu kirim
    const now      = new Date();
    const opsiHari = { timeZone: 'Asia/Jakarta', weekday: 'long' };
    const opsiTgl  = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const opsiJam  = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    const hari     = now.toLocaleDateString('id-ID', opsiHari);
    const tgl      = now.toLocaleDateString('id-ID', opsiTgl);
    const jam      = now.toLocaleTimeString('id-ID', opsiJam);

    const title   = d.fullTitle   || d.title     || game?.title   || '?';
    const dev     = d.developer   || game?.developer || '';
    const urlGame = d.url         || game?.url   || '';
    const rating  = game?.rating  || d.rating    || '';

    // Baris info teknis (hanya tampilkan yang ada datanya)
    const infoRows = [];
    if (d.version)  infoRows.push(`├ 📦 *Versi*     : \`${d.version}\``);
    if (d.android)  infoRows.push(`├ 🤖 *Android*   : \`${d.android}\``);
    if (d.size)     infoRows.push(`├ 💾 *Ukuran*    : \`${d.size}\``);
    if (d.koneksi)  infoRows.push(`├ 📶 *Koneksi*   : \`${d.koneksi}\``);
    if (d.updated)  infoRows.push(`├ 📅 *Update*    : ${d.updated}`);
    if (d.installs) infoRows.push(`├ 📲 *Unduhan*   : ${d.installs}`);
    if (d.ratedFor) infoRows.push(`├ 🔞 *Rating*    : ${d.ratedFor} tahun+`);
    if (d.category) infoRows.push(`├ 📂 *Kategori*  : ${d.category}`);
    if (d.price)    infoRows.push(`├ 💰 *Harga*     : ${d.price === '$0' ? 'Gratis' : d.price}`);
    if (rating)     infoRows.push(`├ ⭐ *Bintang*   : ${rating}/5`);

    // Ubah baris terakhir dari ├ ke ╰
    if (infoRows.length > 0) {
        infoRows[infoRows.length - 1] = infoRows[infoRows.length - 1].replace(/^├/, '╰');
    }

    // Blok sinopsis Bahasa Indo (format > WhatsApp quote)
    let sinopsisBlok = '';
    if (d.sinopsis) {
        const kalimat = d.sinopsis.replace(/\n+/g, ' ').trim();
        sinopsisBlok =
            `\n📖 *Sinopsis*\n` +
            `${SEP2}\n` +
            `> ${kalimat}\n`;
    }

    const infoBlok = infoRows.length
        ? `\n${SEP}\n📋 *Info Game*\n${SEP2}\n${infoRows.join('\n')}\n`
        : '';

    // Link download: prioritaskan direct APK, fallback ke halaman game
    const apkUrl       = d.downloadUrl || '';
    const downloadBlok = apkUrl
        ? `\n${SEP}\n📥 *Download APK (Langsung):*\n${apkUrl}\n\n🔗 *Halaman Game:*\n${urlGame}\n`
        : urlGame
            ? `\n${SEP}\n🔗 *Download / Info:*\n${urlGame}\n`
            : '';

    // Header dinamis: game baru vs update versi
    const tipe        = game?.tipeUpdate || 'baru';
    const headerEmoji = tipe === 'update' ? '🔄' : '🎮';
    const headerTeks  = tipe === 'update'
        ? `*UPDATE VERSI BARU DI AN1.COM!*`
        : `*GAME BARU DI AN1.COM!*`;

    return (
        `${headerEmoji} ${headerTeks}\n` +
        `${SEP}\n` +
        `📅 _${hari}, ${tgl}_\n` +
        `🕐 _${jam} WIB_\n` +
        `${SEP}\n\n` +
        `🕹️ *${title}*\n` +
        (dev ? `👤 _${dev}_\n` : '') +
        sinopsisBlok +
        infoBlok +
        downloadBlok +
        `${SEP}\n` +
        `🌐 _Sumber: AN1.COM — APK MOD Gratis_`
    );
}

// ── DEDUP ─────────────────────────────────────────────────────────────────────

function sudahDikirim(url) {
    const state = bacaState();
    return (state.urlTerkirim || []).includes(url);
}

function tandaiSudahKirim(url) {
    const state = bacaState();
    if (!state.urlTerkirim) state.urlTerkirim = [];
    if (!state.urlTerkirim.includes(url)) {
        state.urlTerkirim.unshift(url);
        if (state.urlTerkirim.length > 500) state.urlTerkirim = state.urlTerkirim.slice(0, 500);
        simpanState(state);
    }
}

function tandaiDanLog(game, grupList) {
    if (game.url) tandaiSudahKirim(game.url);
    try {
        const log = bacaLog();
        if (!Array.isArray(log.terkirim)) log.terkirim = [];
        const sudahAda = log.terkirim.some(e => e.url === game.url);
        if (!sudahAda) {
            log.terkirim.unshift({
                title     : game.fullTitle || game.title || '',
                url       : game.url       || '',
                developer : game.developer || '',
                version   : game.version   || '',
                size      : game.size      || '',
                waktuKirim: new Date().toISOString(),
                grupCount : grupList.length,
                grupList,
            });
            if (log.terkirim.length > 300) log.terkirim = log.terkirim.slice(0, 300);
            simpanLog(log);
        }
    } catch (e) {
        console.warn('[AniGame] Gagal simpan log:', e?.message);
    }
}

// ── CARI GAME BARU (REALTIME) ─────────────────────────────────────────────────

async function cariGameBaru() {
    const state = bacaState();
    state.lastCheck = Date.now();

    const games = await getGamesList(1);
    if (!games.length) {
        simpanState(state);
        return [];
    }

    // Inisialisasi pertama: tandai semua game saat ini, jangan kirim
    if (!state.initialized) {
        state.initialized = true;
        if (!state.urlTerkirim)  state.urlTerkirim  = [];
        if (!state.idsTerlihat)  state.idsTerlihat  = [];
        for (const g of games) {
            if (g.url && !state.urlTerkirim.includes(g.url)) {
                state.urlTerkirim.unshift(g.url);
            }
            const id = extractId(g.url);
            if (id && !state.idsTerlihat.includes(id)) state.idsTerlihat.push(id);
        }
        if (state.urlTerkirim.length > 500) state.urlTerkirim = state.urlTerkirim.slice(0, 500);
        simpanState(state);
        console.log(`[AniGame] ✅ Inisialisasi: ${games.length} game ditandai, siap pantau game baru`);
        return [];
    }

    // Migrasi: isi idsTerlihat dari urlTerkirim yang sudah ada (kalau belum ada)
    if (!state.idsTerlihat || !state.idsTerlihat.length) {
        state.idsTerlihat = (state.urlTerkirim || [])
            .map(u => extractId(u))
            .filter(Boolean);
    }

    simpanState(state);

    // Game yang belum pernah terkirim
    const baruList = games.filter(g => g.url && !sudahDikirim(g.url));
    if (!baruList.length) return [];

    // Fetch detail untuk tiap game baru (max 5 agar tidak lambat)
    const hasilBaru = [];
    for (const game of baruList.slice(0, 5)) {
        const tipeUpdate = tentikanTipe(game.url, state);
        const detail     = await fetchGameDetail(game.url);
        hasilBaru.push({
            ...game,
            ...(detail || {}),
            url       : game.url, // pastikan URL tidak tertimpa
            tipeUpdate,           // 'baru' atau 'update'
        });
        await new Promise(r => setTimeout(r, 1000));
    }

    return hasilBaru;
}

// ── SIMULASI (TEST) ────────────────────────────────────────────────────────────

async function simulasi() {
    const games = await getGamesList(1);
    if (!games.length) throw new Error('Tidak ada game ditemukan di AN1.COM');

    const game   = games[0];
    const detail = await fetchGameDetail(game.url);

    // Tentukan tipe realtime berdasarkan state
    const state      = bacaState();
    // Migrasi state lama yang belum punya idsTerlihat
    if (!state.idsTerlihat || !state.idsTerlihat.length) {
        state.idsTerlihat = (state.urlTerkirim || []).map(u => extractId(u)).filter(Boolean);
    }
    const tipeUpdate = tentikanTipe(game.url, state);

    const merged  = { ...game, ...(detail || {}), url: game.url, tipeUpdate };
    const caption = buatCaption(merged, detail);

    return {
        caption,
        urlGambar : detail?.image || game.image || null,
        game      : merged,
        tipeUpdate,
    };
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

module.exports = {
    getGamesList,
    searchGames,
    fetchGameDetail,
    getEnabledGroups,
    setGroupEnabled,
    cariGameBaru,
    simulasi,
    buatCaption,
    tandaiSudahKirim,
    tandaiDanLog,
};
