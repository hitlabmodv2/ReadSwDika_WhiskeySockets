/**
 * ───────────────────────────────
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

// ── STATE (game yang sudah terkirim) ──────────────────────────────────────────

function bacaState() {
    try {
        if (fs.existsSync(FILE_STATE)) return JSON.parse(fs.readFileSync(FILE_STATE, 'utf-8'));
    } catch (_) {}
    return { urlTerkirim: [], lastCheck: null, initialized: false };
}

function simpanState(data) {
    try { fs.writeFileSync(FILE_STATE, JSON.stringify(data, null, 2), 'utf-8'); } catch (_) {}
}

// ── LOG PENGIRIMAN ─────────────────────────────────────────────────────────────

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

// ── PARSE GAME CARDS DARI HALAMAN GAMES LIST ──────────────────────────────────
// Pola markdown jina:
//   ![Image N: TITLE](IMAGE_URL)
//   [TITLE](GAME_URL "TITLE")
//   DEVELOPER
//   *   RATING

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
                dev = ln;
                continue;
            }

            if (!rating && /^\*\s+[\d.]+$/.test(ln)) {
                rating = ln.replace(/^\*\s+/, '').trim();
                break;
            }
        }

        if (!title || seen.has(gameUrl || title)) continue;
        seen.add(gameUrl || title);

        results.push({ title, image: imgUrl, url: gameUrl, developer: dev, rating });
    }

    return results;
}

// ── PARSE HASIL SEARCH ────────────────────────────────────────────────────────

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
                if (m) { gameUrl = m[2]; }
                continue;
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

// ── FORMAT CAPTION UNTUK NOTIF GRUP ──────────────────────────────────────────

const SEP  = '━━━━━━━━━━━━━━━━━━';
const SEP2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

function buatCaption(game) {
    const sekarang = new Date();
    const opsiHari = { timeZone: 'Asia/Jakarta', weekday: 'long' };
    const opsiTgl  = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const opsiJam  = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    const hari     = sekarang.toLocaleDateString('id-ID', opsiHari);
    const tgl      = sekarang.toLocaleDateString('id-ID', opsiTgl);
    const jam      = sekarang.toLocaleTimeString('id-ID', opsiJam);
    const headerWaktu = `${hari}, ${tgl} — ${jam} WIB`;

    const rating   = game.rating ? `⭐ *${game.rating}/5*` : '';
    const dev      = game.developer ? `\n👤 *Developer* : _${game.developer}_` : '';
    const url      = game.url ? `\n🔗 *Download*  : ${game.url}` : '';

    return (
        `🎮 *GAME BARU DI AN1.COM!*\n` +
        `${SEP}\n` +
        `📅 _${headerWaktu}_\n` +
        `${SEP}\n\n` +
        `🕹️ *${game.title}*\n` +
        `${dev}\n` +
        (rating ? `${rating}\n` : '') +
        `${url}\n\n` +
        `${SEP}\n` +
        `🌐 *Sumber* : https://an1.com/games/\n` +
        `📥 Klik link download di atas untuk unduh APK MOD gratis!`
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
                title     : game.title,
                url       : game.url || '',
                developer : game.developer || '',
                rating    : game.rating || '',
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
// Logika:
// - Ambil halaman games terbaru
// - Jika belum pernah diinisialisasi (bot baru start), tandai semua sebagai seen tanpa kirim
// - Jika sudah pernah, kirim game yang belum pernah terkirim

async function cariGameBaru() {
    const state = bacaState();
    state.lastCheck = Date.now();

    const games = await getGamesList(1);
    if (!games.length) {
        simpanState(state);
        return [];
    }

    // Inisialisasi pertama: tandai semua game saat ini sebagai seen, jangan kirim
    if (!state.initialized) {
        state.initialized = true;
        if (!state.urlTerkirim) state.urlTerkirim = [];
        for (const g of games) {
            if (g.url && !state.urlTerkirim.includes(g.url)) {
                state.urlTerkirim.unshift(g.url);
            }
        }
        if (state.urlTerkirim.length > 500) state.urlTerkirim = state.urlTerkirim.slice(0, 500);
        simpanState(state);
        console.log(`[AniGame] ✅ Inisialisasi: ${games.length} game ditandai, siap pantau game baru`);
        return [];
    }

    simpanState(state);

    // Temukan game yang belum pernah terkirim
    const baru = games.filter(g => g.url && !sudahDikirim(g.url));
    return baru;
}

// ── SIMULASI (TEST) ────────────────────────────────────────────────────────────

async function simulasi() {
    const games = await getGamesList(1);
    if (!games.length) throw new Error('Tidak ada game ditemukan di AN1.COM');
    const game    = games[0];
    const caption = buatCaption(game);
    return { caption, urlGambar: game.image || null, game };
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

module.exports = {
    getGamesList,
    searchGames,
    getEnabledGroups,
    setGroupEnabled,
    cariGameBaru,
    simulasi,
    buatCaption,
    tandaiSudahKirim,
    tandaiDanLog,
};
