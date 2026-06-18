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

const BASE = 'https://an1.com';
const JINA = 'https://r.jina.ai';

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

/**
 * Parse game cards dari halaman games list (an1.com/games/)
 * Pola markdown jina:
 *   ![Image N: TITLE](IMAGE_URL)
 *   [TITLE](GAME_URL "TITLE")
 *   DEVELOPER
 *   *   RATING
 */
function parseGamesList(md) {
    const results = [];
    const seen = new Set();

    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const imgLine = lines[i].trim();
        if (!imgLine.startsWith('![Image ') || !imgLine.includes('an1.com/uploads/')) continue;

        const imgMatch = imgLine.match(/!\[Image \d+:\s*([^\]]+)\]\((https:\/\/an1\.com\/uploads\/[^)]+)\)/);
        if (!imgMatch) continue;

        const imgTitle = imgMatch[1].trim();
        const imgUrl   = imgMatch[2];

        let linkLine = '';
        let dev      = '';
        let rating   = '';
        let gameUrl  = '';

        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const ln = lines[j].trim();
            if (!ln) continue;

            if (!gameUrl && ln.startsWith('[') && ln.includes('an1.com/') && ln.includes('.html')) {
                const m = ln.match(/\[([^\]]+)\]\((https:\/\/an1\.com\/[0-9]+-[^)"]+\.html)/);
                if (m) {
                    linkLine = m[1].trim();
                    gameUrl  = m[2];
                }
                continue;
            }

            if (!dev && !ln.startsWith('*') && !ln.startsWith('!') && !ln.startsWith('[') && !ln.startsWith('#') && ln.length > 1 && ln.length < 80) {
                dev = ln;
                continue;
            }

            if (!rating && ln.match(/^\*\s+[\d.]+$/)) {
                rating = ln.replace(/^\*\s+/, '').trim();
                break;
            }
        }

        const title = linkLine || imgTitle;
        if (!title || seen.has(title)) continue;
        seen.add(title);

        results.push({
            title,
            image: imgUrl,
            url: gameUrl,
            developer: dev,
            rating,
        });
    }

    return results;
}

/**
 * Parse hasil search dari an1.com
 * Pola search tidak punya URL langsung, hanya:
 *   ![Image N: TITLE](IMAGE_URL)
 *   DEVELOPER
 */
function parseSearchResults(md) {
    const results = [];
    const seen = new Set();

    const lines = md.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const imgLine = lines[i].trim();
        if (!imgLine.startsWith('![Image ') || !imgLine.includes('an1.com/uploads/')) continue;

        const imgMatch = imgLine.match(/!\[Image \d+:\s*([^\]]+)\]\((https:\/\/an1\.com\/uploads\/[^)]+)\)/);
        if (!imgMatch) continue;

        const title  = imgMatch[1].trim();
        const imgUrl = imgMatch[2];

        let dev    = '';
        let gameUrl = '';
        let rating = '';

        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
            const ln = lines[j].trim();
            if (!ln) continue;

            if (!gameUrl && ln.startsWith('[') && ln.includes('an1.com/') && ln.includes('.html')) {
                const m = ln.match(/\[([^\]]+)\]\((https:\/\/an1\.com\/[0-9]+-[^)"]+\.html)/);
                if (m) gameUrl = m[2];
                continue;
            }

            if (!dev && !ln.startsWith('*') && !ln.startsWith('!') && !ln.startsWith('[') && !ln.startsWith('#') && ln.length > 1 && ln.length < 80) {
                dev = ln;
                continue;
            }

            if (!rating && ln.match(/^\*\s+[\d.]+$/)) {
                rating = ln.replace(/^\*\s+/, '').trim();
                break;
            }
        }

        if (!title || seen.has(title)) continue;
        seen.add(title);

        results.push({
            title,
            image: imgUrl,
            url: gameUrl,
            developer: dev,
            rating,
        });
    }

    return results;
}

/**
 * Ambil daftar game terbaru dari an1.com/games/
 * @param {number} page - halaman (default 1)
 */
async function getGamesList(page = 1) {
    const url = page > 1 ? `${BASE}/games/page/${page}/` : `${BASE}/games/`;
    const md  = await fetchMarkdown(url);
    return parseGamesList(md);
}

/**
 * Cari game di an1.com berdasarkan keyword
 * @param {string} query - keyword pencarian
 */
async function searchGames(query) {
    const encoded = encodeURIComponent(query.trim());
    const url     = `${BASE}/?do=search&subaction=search&story=${encoded}`;
    const md      = await fetchMarkdown(url);

    const foundMatch = md.match(/Found (\d+) apps?/i);
    const total      = foundMatch ? parseInt(foundMatch[1]) : null;

    const games = parseSearchResults(md);
    return { games, total, searchUrl: `${BASE}/?do=search&subaction=search&story=${encoded}` };
}

module.exports = { getGamesList, searchGames };
