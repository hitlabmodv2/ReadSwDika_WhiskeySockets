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
 *  cosplaytele.cjs — Ambil foto cosplay dari Telegram
 *  Fetch gambar cosplay dari channel Telegram publik
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Cosplay Telegram Fetcher
 *  Ambil & kirim gambar cosplay langsung dari channel Telegram
 *  publik — menjadi sumber gambar cosplay berkualitas tinggi.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const axios = require('axios');
const sharp = require('sharp');

const BASE = 'https://cosplaytele.com';
const API  = `${BASE}/wp-json/wp/v2`;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': BASE,
};

const MAX_VIDEOS = 5;

function toHD(url) {
    if (!url) return url;
    // Hapus suffix resize WordPress: -300x225, -1024x768, -scaled, dsb
    return url
        .replace(/-\d+x\d+(\.[a-zA-Z]+)$/, '$1')
        .replace(/-scaled(\.[a-zA-Z]+)$/, '$1');
}

function decodeEntities(str) {
    return String(str || '')
        .replace(/&#8211;/g, '–')
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();
}

function extractMediaFromContent(html) {
    const seen = new Set();
    const images = [];

    // 1. Ambil dari href='...' (single quote) — full-size originals
    const reSingle = /href='(https:\/\/cosplaytele\.com\/wp-content\/uploads\/[^'>\s]+\.(?:jpg|jpeg|png|webp|gif))'/gi;
    let m;
    while ((m = reSingle.exec(html)) !== null) {
        const url = toHD(m[1]);
        if (!seen.has(url)) { seen.add(url); images.push(url); }
    }

    // 2. Fallback: ambil dari src="..." (double quote) jika href kosong
    if (images.length === 0) {
        const reDouble = /src="(https:\/\/cosplaytele\.com\/wp-content\/uploads\/[^">\s]+\.(?:jpg|jpeg|png|webp|gif))"/gi;
        while ((m = reDouble.exec(html)) !== null) {
            const url = toHD(m[1]);
            if (!seen.has(url)) { seen.add(url); images.push(url); }
        }
    }

    // 3. Cossora video embeds (1 embed = semua video di post)
    const cossoraIds = [];
    const reCossora = /cossora\.stream\/embed\/([a-f0-9-]{36})/gi;
    const cossoraSeen = new Set();
    while ((m = reCossora.exec(html)) !== null) {
        if (!cossoraSeen.has(m[1])) {
            cossoraSeen.add(m[1]);
            cossoraIds.push(`https://cossora.stream/embed/${m[1]}`);
        }
    }

    return { images, cossoraIds };
}

function extractThumbnail(post) {
    try {
        const emb = post._embedded?.['wp:featuredmedia'];
        if (emb && emb[0]) {
            const sizes = emb[0]?.media_details?.sizes || {};
            const url = sizes.full?.source_url || emb[0].source_url || sizes.large?.source_url || sizes.medium?.source_url || '';
            return toHD(url);
        }
    } catch (_) {}
    return '';
}

async function cosplayteleSearch(keyword, { page = 1, perPage = 8 } = {}) {
    if (!keyword || !String(keyword).trim()) throw new Error('Keyword tidak boleh kosong.');

    const { data } = await axios.get(`${API}/posts`, {
        params: {
            search: String(keyword).trim(),
            per_page: perPage,
            page,
            _embed: 'wp:featuredmedia',
            _fields: 'id,title,link,date,_embedded',
        },
        headers: HEADERS,
        timeout: 15000,
    });

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`Tidak ada hasil untuk "${keyword}". Coba kata kunci lain.`);
    }

    return data.map(post => ({
        id: post.id,
        title: decodeEntities(post.title?.rendered || ''),
        link: post.link || '',
        date: post.date || '',
        thumbnail: extractThumbnail(post),
    }));
}

async function cosplayteleGetPost(postId) {
    const { data } = await axios.get(`${API}/posts/${postId}`, {
        params: { _fields: 'id,title,link,content' },
        headers: HEADERS,
        timeout: 20000,
    });

    const { images, cossoraIds } = extractMediaFromContent(data.content?.rendered || '');

    if (images.length === 0 && cossoraIds.length === 0) {
        throw new Error('Tidak ada media ditemukan di post ini.');
    }

    return {
        id: data.id,
        title: decodeEntities(data.title?.rendered || ''),
        link: data.link || '',
        images: images,
        cossoraIds,
        totalImages: images.length,
        hasVideos: cossoraIds.length > 0,
    };
}

async function cosplayteleRandom() {
    // Ambil total halaman dari header API
    let totalPages = 50;
    try {
        const head = await axios.head(`${API}/posts`, {
            params: { per_page: 10 },
            headers: HEADERS,
            timeout: 10000,
        });
        const tp = parseInt(head.headers['x-wp-totalpages'] || '0', 10);
        if (tp > 0) totalPages = Math.min(tp, 200);
    } catch (_) {}

    const randPage = Math.floor(Math.random() * totalPages) + 1;

    const { data } = await axios.get(`${API}/posts`, {
        params: { per_page: 10, page: randPage, _fields: 'id,title,link,date' },
        headers: HEADERS,
        timeout: 15000,
    });

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Gagal mengambil post random. Coba lagi.');
    }

    const randPost = data[Math.floor(Math.random() * data.length)];
    return await cosplayteleGetPost(randPost.id);
}

async function downloadBuffer(url) {
    const { data } = await axios.get(url, {
        headers: {
            ...HEADERS,
            Accept: 'image/webp,image/jpeg,image/png,video/mp4,*/*',
            Referer: BASE,
        },
        responseType: 'arraybuffer',
        timeout: 30000,
        maxRedirects: 5,
    });

    let buf = Buffer.from(data);

    // Auto-convert WebP → JPEG agar bisa dibuka di WhatsApp
    // WebP magic: RIFF....WEBP
    const isWebP = buf.length > 12 &&
        buf.slice(0, 4).toString('hex') === '52494646' &&
        buf.slice(8, 12).toString('ascii') === 'WEBP';

    if (isWebP) {
        try {
            buf = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
        } catch (_) {
            // Kalau convert gagal, tetap pakai buffer asli
        }
    }

    return buf;
}

function formatCosplayteleCaption(post, { imgIndex, imgTotal } = {}) {
    const title = post.title || '';
    const link  = post.link  || '';
    const vidHint = post.hasVideos ? ` • ada video` : '';
    return `📸 *${title}*\n` +
           `🖼️ ${imgIndex + 1}/${imgTotal}${vidHint}\n` +
           `🔗 ${link}`;
}

function formatCosplayteleSearchList(results) {
    const lines = results.map((r, i) => {
        const match = r.title.match(/"(\d+ photos?(?:\s*and\s*\d+ videos?)?)/i);
        const count = match ? ` *(${match[1]})* ` : '';
        const cleanTitle = r.title.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
        return `${i + 1}. ${cleanTitle}${count}`;
    });
    return lines.join('\n');
}

async function handleCosplay({ hisoka, m, query, tolak, logCommand, logError, _require, path, _sendCosplayImages, pendingCosplayChoices }) {
    try {
        const input = (query || '').trim();
        const pfx = m.prefix || '.';
        const isRandom = m.command === 'cosplayrand' || m.command === 'cosplayrandom' || input.toLowerCase() === 'random';

        if (!input && !isRandom) {
            await tolak(hisoka, m,
                `╭─「 👘 *COSPLAYTELE SEARCH* 」\n` +
                `│\n` +
                `│ Cari foto & video cosplay dari\n` +
                `│ cosplaytele.com secara realtime.\n` +
                `│\n` +
                `│ *Format:*\n` +
                `│ • ${pfx}cosplay <keyword>\n` +
                `│ • ${pfx}cosplay random\n` +
                `│\n` +
                `│ *Contoh:*\n` +
                `│ • ${pfx}cosplay mitsuri\n` +
                `│ • ${pfx}cosplay rem re:zero\n` +
                `│ • ${pfx}cosplay velma\n` +
                `│ • ${pfx}cosplay random\n` +
                `│\n` +
                `│ ℹ️ Hasil dikirim sebagai album\n` +
                `│    (foto + video terpisah).\n` +
                `╰──────────────────────`
            );
            return;
        }

        if (isRandom) {
            await hisoka.sendMessage(m.from, { react: { text: '🎲', key: m.key } });
            const loadMsg = await tolak(hisoka, m, `🎲 Mengambil cosplay *random* dari cosplaytele.com...`);
            try {
                const post = await cosplayteleRandom();
                if (loadMsg?.key) {
                    try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                }
                const vidInfo = post.hasVideos ? ` | 🎬 ada video` : '';
                const caption0 =
                    `╭─「 🎲 *COSPLAY RANDOM* 」\n` +
                    `│ 📌 *${post.title.slice(0, 80)}*\n` +
                    `│ 🖼️ ${post.totalImages} foto${vidInfo}\n` +
                    `│ 🔗 ${post.link}\n` +
                    `│\n` +
                    `│ ℹ️ Mengirim ${post.images.length} foto...\n` +
                    `╰──────────────────────`;
                await tolak(hisoka, m, caption0);
                await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });
                if (post.images.length > 0) {
                    await _sendCosplayImages(hisoka, m, post, downloadBuffer, formatCosplayteleCaption, '[CosplayRandom]');
                }
                if (post.hasVideos && post.cossoraIds?.length > 0) {
                    await hisoka.sendMessage(m.from, {
                        text: `╭─「 🎬 *VIDEO COSPLAY* 」\n│ Tonton video dari post ini:\n│\n${post.cossoraIds.map((u, i) => `│ ${i + 1}. ${u}`).join('\n')}\n╰──────────────────────`,
                    }, { quoted: m });
                }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'cosplayrand');
            } catch (err) {
                console.error('[CosplayRandom] Error:', err.message);
                logError(err, 'command:cosplayrand');
                if (loadMsg?.key) {
                    try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                }
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                await tolak(hisoka, m, `❌ Gagal ambil cosplay random.\n_${err.message}_`);
            }
            return;
        }

        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
        const loadMsg = await tolak(hisoka, m, `🔍 Mencari cosplay *"${input}"* di cosplaytele.com...`);
        const results = await cosplayteleSearch(input, { perPage: 8 });
        if (loadMsg?.key) {
            try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
        }

        const listText =
            `╭─「 👘 *COSPLAYTELE* 」\n` +
            `│ 🔍 Hasil: *"${input}"*\n` +
            `│ Ditemukan ${results.length} post\n` +
            `│\n` +
            results.map((r, i) => {
                const match = r.title.match(/(\d+\s*photos?\s*(?:and\s*\d+\s*videos?)?)/i);
                const count = match ? ` [${match[1]}]` : '';
                const cleanTitle = r.title.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
                return `│ *${i + 1}.* ${cleanTitle.slice(0, 65)}${count}`;
            }).join('\n') + '\n' +
            `│\n` +
            `│ 📩 *Balas pesan ini* dengan angka\n` +
            `│    pilihan kamu (1–${results.length})\n` +
            `│ ⏳ Menu berlaku 3 menit\n` +
            `╰──────────────────────`;

        const menuMsg = await tolak(hisoka, m, listText);
        await hisoka.sendMessage(m.from, { react: { text: '👘', key: m.key } });

        const cosKey = m.sender;
        const cosTimeout = setTimeout(() => pendingCosplayChoices.delete(cosKey), 3 * 60 * 1000);
        const old = pendingCosplayChoices.get(cosKey);
        if (old?.timeout) clearTimeout(old.timeout);
        pendingCosplayChoices.set(cosKey, {
            results,
            botMsgId: menuMsg?.key?.id || null,
            expiresAt: Date.now() + 3 * 60 * 1000,
            timeout: cosTimeout,
            loading: false,
        });

        logCommand(m, hisoka, 'cosplay');
    } catch (error) {
        console.error('\x1b[31m[Cosplay] Error:\x1b[39m', error.message);
        logError(error, 'command:cosplay');
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
        await tolak(hisoka, m,
            `❌ *Gagal mencari di Cosplaytele.*\n\n` +
            `_${error.message}_\n\n` +
            `Contoh: *.cosplay mitsuri*`
        );
    }
}

module.exports = {
    cosplayteleSearch,
    cosplayteleGetPost,
    cosplayteleRandom,
    downloadBuffer,
    formatCosplayteleCaption,
    formatCosplayteleSearchList,
    handleCosplay,
};
