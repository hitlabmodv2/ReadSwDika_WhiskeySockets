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
 *  pixiv.cjs — Scraper Pixiv ilustrasi
 *  Ambil ilustrasi dari pixiv.net via Gemini vision AI
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Pixiv Illustration Scraper
 *  Cari & ambil ilustrasi dari pixiv.net menggunakan Gemini
 *  vision AI untuk analisis konten — mendukung pencarian tag,
 *  karakter, dan artis tertentu.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const axios = require('axios');

// Analisis pakai metadata (title + tags + author) via API teks — tidak perlu kirim gambar
// Retry otomatis 3x dengan jeda, fallback endpoint gemini-flash jika gemini gagal
const AI_ENDPOINTS = [
    'https://api.alwayscodex.my.id/api/ai/gemini',
    'https://api.alwayscodex.my.id/api/ai/gemini-flash',
];
async function analyzeIllustration({ title, tags, author } = {}) {
    try {
        const tagStr = (tags || []).slice(0, 8).join(', ');
        const prompt =
            `Judul: ${title || '-'}. Artist: ${author || '-'}. Tags: ${tagStr || '-'}.\n` +
            `Berikan analisis singkat WAJIB dalam Bahasa Indonesia, persis 3 baris format ini:\n` +
            `🎭 Karakter: <nama> (<seri>) atau "Tidak dikenali"\n` +
            `🎨 Gaya: <art style singkat, max 8 kata>\n` +
            `✨ Detail: <suasana/detail menonjol, max 12 kata>\n` +
            `Hanya 3 baris itu. Jangan tambah kalimat lain.`;
        const encoded = encodeURIComponent(prompt);

        for (const ep of AI_ENDPOINTS) {
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    if (attempt > 0) await new Promise(r => setTimeout(r, 1200 * attempt));
                    const res = await Promise.race([
                        fetch(`${ep}?teks=${encoded}`),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), 12000)),
                    ]);
                    const json = await res.json();
                    if (json?.status && json?.result) return String(json.result).trim();
                } catch (_) {}
            }
        }
        return null;
    } catch (e) {
        console.error('[Pixiv] AI gagal:', e.message);
        return null;
    }
}

const BASE = 'https://www.pixiv.net';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
    'Referer': 'https://www.pixiv.net/',
    'Origin': 'https://www.pixiv.net',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
};

async function pixivSearch(query, { safe = true, page = 1 } = {}) {
    if (!query || !String(query).trim()) throw new Error('Query diperlukan.');
    const encoded = encodeURIComponent(String(query).trim());
    const mode = safe ? 'safe' : 'all';
    const url = `${BASE}/ajax/search/illustrations/${encoded}?word=${encoded}&order=date_d&mode=${mode}&p=${page}&s_mode=s_tag_full&type=illust&lang=en`;

    const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });

    if (data?.error) throw new Error(data.message || 'Pixiv API error');

    let results = data?.body?.illust?.data || [];

    if (!results.length) {
        const url2 = `${BASE}/ajax/search/illustrations/${encoded}?word=${encoded}&order=date_d&mode=${mode}&p=${page}&s_mode=s_tag&type=illust&lang=en`;
        const { data: data2 } = await axios.get(url2, { headers: HEADERS, timeout: 15000 });
        results = data2?.body?.illust?.data || [];
    }

    if (!results.length) throw new Error('Tidak ada hasil ditemukan untuk query tersebut.');

    if (safe) results = results.filter(r => r.xRestrict === 0);
    if (!results.length) throw new Error('Tidak ada hasil aman (safe) yang ditemukan. Coba query lain.');

    return results;
}

async function pixivDetail(id) {
    const { data } = await axios.get(`${BASE}/ajax/illust/${id}`, {
        headers: HEADERS,
        timeout: 12000
    });
    if (data?.error) throw new Error(data.message || 'Gagal mengambil detail karya.');
    return data?.body || null;
}

async function pixivDownloadImage(imageUrl) {
    const { data } = await axios.get(imageUrl, {
        headers: {
            ...HEADERS,
            'Referer': 'https://www.pixiv.net/',
        },
        responseType: 'arraybuffer',
        timeout: 30000
    });
    return Buffer.from(data);
}

function buildImageUrl(thumbUrl, quality = 'regular') {
    if (!thumbUrl) return null;
    const sizes = {
        small: 'c/360x360_70/img-master',
        regular: 'c/600x1200_90/img-master',
        large: 'img-master',
    };
    const sizeKey = sizes[quality] || sizes.regular;
    return thumbUrl
        .replace(/https:\/\/i\.pximg\.net\/[^/]+\/img-master/, `https://i.pximg.net/${sizeKey}/img-master`)
        .replace(/c\/\d+x\d+[^/]*\/img-master/, sizeKey);
}

function shufflePickN(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
}

async function fetchOnePick(pick) {
    let imgUrl = null;
    let detail = null;
    try {
        detail = await pixivDetail(pick.id);
        imgUrl = detail?.urls?.regular || detail?.urls?.small || detail?.urls?.thumb;
    } catch (_) {}

    if (!imgUrl) {
        imgUrl = buildImageUrl(pick.url, 'regular') || pick.url;
    }

    const buffer = await pixivDownloadImage(imgUrl);

    return {
        id: pick.id,
        title: pick.title || '(no title)',
        author: pick.userName || 'Unknown',
        authorId: pick.userId,
        tags: (pick.tags || []).slice(0, 8),
        views: detail?.viewCount ?? '-',
        likes: detail?.likeCount ?? '-',
        bookmarks: detail?.bookmarkCount ?? pick.bookmarkCount ?? '-',
        xRestrict: pick.xRestrict,
        pageUrl: `https://www.pixiv.net/artworks/${pick.id}`,
        buffer,
    };
}

async function pixivFetch(query, { safe = true, index = 0 } = {}) {
    const results = await pixivSearch(query, { safe });
    const pick = results[index % results.length];
    const data = await fetchOnePick(pick);
    data.totalResults = results.length;
    data.aiInfo = await analyzeIllustration(data);
    return data;
}

async function pixivFetchMultiple(query, { safe = true, count = 3 } = {}) {
    const max = Math.min(Math.max(1, count), 10);
    const results = await pixivSearch(query, { safe });

    const picks = shufflePickN(results, Math.min(max, results.length));

    const settled = await Promise.allSettled(picks.map(p => fetchOnePick(p)));

    const successful = settled
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    if (!successful.length) throw new Error('Gagal mengunduh semua gambar dari Pixiv.');

    const aiResults = await Promise.all(successful.map(s => analyzeIllustration(s)));
    successful.forEach((s, i) => { s.aiInfo = aiResults[i]; });

    return successful;
}

function formatPixivCaption(data, { index = null, total = null } = {}) {
    const numPrefix = (index !== null && total !== null)
        ? `🖼️ *${index + 1} dari ${total}*\n`
        : '';
    const lines = [
        `${numPrefix}🎨 *${data.title}*`,
        `👤 *Artist:* ${data.author}`,
        ``,
    ];
    if (data.aiInfo) {
        lines.push(`🤖 *AI Analisis:*`, data.aiInfo, ``);
    }
    lines.push(
        `🏷️ *Tags:* ${data.tags.length ? data.tags.map(t => `#${t}`).join(' ') : '-'}`,
        ``,
        `👁️ *Views:* ${data.views}    ❤️ *Likes:* ${data.likes}    🔖 *Bookmarks:* ${data.bookmarks}`,
        ``,
        `🔗 ${data.pageUrl}`,
    );
    return lines.join('\n');
}

module.exports = { pixivFetch, pixivFetchMultiple, pixivSearch, formatPixivCaption };

// ── COMMAND HANDLER ────────────────────────────────────────────────────────────

async function handlePixiv({ hisoka, m, query, tolak, logCommand, logError }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                if (!input) {
                        await tolak(hisoka, m,
                                `╭─「 🎨 *PIXIV SEARCH* 」\n│\n│ Cari ilustrasi anime dari Pixiv.\n│\n│ *Format:*\n│ • ${pfx}pixiv <query>\n│ • ${pfx}pixiv <query>,<jumlah>\n│\n│ *Contoh 1 gambar:*\n│ • ${pfx}pixiv megumin\n│ • ${pfx}pixiv rem re:zero\n│\n│ *Contoh banyak gambar (max 10):*\n│ • ${pfx}pixiv megumin chan,5\n│ • ${pfx}pixiv naruto,10\n│\n│ ℹ️ Hanya konten aman (safe).\n╰──────────────────────`
                        );
                        logCommand(m, hisoka, m.command || 'pixiv');
                        return;
                }

                let realQuery = input;
                let imgCount  = 1;
                const lastComma = input.lastIndexOf(',');
                if (lastComma !== -1) {
                        const maybeNum = input.slice(lastComma + 1).trim();
                        if (/^\d+$/.test(maybeNum)) {
                                imgCount  = Math.min(Math.max(1, parseInt(maybeNum)), 10);
                                realQuery = input.slice(0, lastComma).trim();
                        }
                }
                if (!realQuery) { await tolak(hisoka, m, `❌ Query kosong. Contoh: *.pixiv megumin,5*`); return; }

                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

                const loadMsg = await tolak(hisoka, m,
                        imgCount > 1
                                ? `🔍 Mencari *${imgCount} ilustrasi* "${realQuery}" dari Pixiv...`
                                : `🔍 Mencari ilustrasi *${realQuery}* di Pixiv...`
                );

                if (imgCount > 1) {
                        const images     = await pixivFetchMultiple(realQuery, { safe: true, count: imgCount });
                        const albumItems = images.map((img, i) => ({ image: img.buffer, caption: formatPixivCaption(img, { index: i, total: images.length }) }));
                        if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
                        try {
                                await hisoka.sendMessage(m.from, { albumMessage: albumItems }, { quoted: m });
                        } catch (_) {
                                for (let i = 0; i < images.length; i++) {
                                        await hisoka.sendMessage(m.from, { image: images[i].buffer, caption: formatPixivCaption(images[i], { index: i, total: images.length }) }, { quoted: i === 0 ? m : undefined });
                                }
                        }
                } else {
                        const randomIndex = Math.floor(Math.random() * 10);
                        const data    = await pixivFetch(realQuery, { safe: true, index: randomIndex });
                        const caption = formatPixivCaption(data);
                        if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
                        await hisoka.sendMessage(m.from, { image: data.buffer, caption }, { quoted: m });
                }

                await hisoka.sendMessage(m.from, { react: { text: '🎨', key: m.key } });
                logCommand(m, hisoka, 'pixiv');
        } catch (error) {
                console.error('\x1b[31m[Pixiv] Error:\x1b[39m', error.message);
                logError(error, 'command:pixiv');
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                await tolak(hisoka, m,
                        `❌ *Gagal mencari di Pixiv.*\n\n_${error.message}_\n\nContoh:\n• *.pixiv megumin* — 1 gambar\n• *.pixiv megumin,5* — 5 gambar sekaligus`
                );
        }
}

module.exports.handlePixiv = handlePixiv;
