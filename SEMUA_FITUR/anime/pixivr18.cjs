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
 *  pixivr18.cjs — NSFW Image Search (18+)
 *  Backend: nHentai (100% NSFW guaranteed)
 *  Command tetap .pixivr18 tapi pakai nHentai API
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

const BASE = 'https://nhentai.to';
const CDN_LIST = ['https://t.nhentai.net', 'https://i.nhentai.net', 'https://i7.nhentai.net'];
const EXT_MAP = { j: 'jpg', p: 'png', g: 'gif' };

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://nhentai.to/',
};

async function fetchHtml(url) {
    const res = await axios.get(url, { headers: HEADERS, timeout: 20000, maxRedirects: 5 });
    return res.data;
}

function parseGalleryJson(html) {
    const start = html.indexOf('N.gallery({');
    if (start === -1) throw new Error('Data gallery tidak ditemukan');
    const braceStart = html.indexOf('{', start);
    let depth = 0, i = braceStart;
    while (i < html.length) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') { depth--; if (depth === 0) break; }
        i++;
    }
    const raw = html.slice(braceStart, i + 1);
    const clean = raw.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(clean);
}

function detectCoverUrl(html) {
    const m = html.match(/src="(https?:\/\/[^"]+\/galleries\/\d+\/cover\.[^"]+)"/) ||
              html.match(/data-src="(https?:\/\/[^"]+\/galleries\/\d+\/cover\.[^"]+)"/);
    return m ? m[1] : null;
}

async function nhentaiSearch(query, page = 1) {
    const html = await fetchHtml(`${BASE}/search/?q=${encodeURIComponent(query)}&page=${page}`);
    const matches = [...html.matchAll(/href="\/g\/(\d+)\/"/g)];
    return [...new Set(matches.map(m => m[1]))];
}

async function nhentaiGallery(id) {
    const html = await fetchHtml(`${BASE}/g/${id}/`);
    const data = parseGalleryJson(html);
    const coverUrl = detectCoverUrl(html);
    return { ...data, coverUrl };
}

async function downloadImage(mediaId, pageNum, hintExt = 'jpg') {
    const ext = EXT_MAP[hintExt] || hintExt;
    const errors = [];
    
    for (const cdn of CDN_LIST) {
        for (const tryExt of [ext, 'jpg', 'png']) {
            try {
                const url = `${cdn}/galleries/${mediaId}/${pageNum}.${tryExt}`;
                const res = await axios.get(url, {
                    headers: { ...HEADERS, Referer: BASE },
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    maxRedirects: 3,
                });
                return Buffer.from(res.data);
            } catch (e) {
                errors.push(`${cdn}/${pageNum}.${tryExt}: ${e.message}`);
            }
        }
    }
    throw new Error(`Gagal download image ${pageNum}: ${errors.join('; ')}`);
}

async function fetchNSFWImages(query, count = 5) {
    const wantCount = Math.min(Math.max(1, count), 10);
    
    // Fetch dari multiple pages untuk dapat pool lebih besar
    let allIds = [];
    for (let p = 1; p <= 2; p++) {
        try {
            const ids = await nhentaiSearch(query, p);
            allIds = allIds.concat(ids);
            if (allIds.length >= wantCount * 3) break;
        } catch (e) {
            console.error(`[NSFW] Search page ${p} error:`, e.message);
        }
    }
    
    if (!allIds.length) throw new Error('Tidak ada hasil NSFW ditemukan.');
    
    // Dedupe
    const uniqueIds = [...new Set(allIds)];
    const results = [];
    
    // Proses gallery secara paralel dengan batas concurrency
    const concurrency = 3;
    const batches = [];
    for (let i = 0; i < uniqueIds.length && results.length < wantCount; i += concurrency) {
        batches.push(uniqueIds.slice(i, i + concurrency));
    }
    
    for (const batch of batches) {
        if (results.length >= wantCount) break;
        
        const promises = batch.map(async (id) => {
            try {
                const gallery = await nhentaiGallery(id);
                const mediaId = gallery.media_id;
                const pages = gallery.images?.pages || [];
                const pageCount = pages.length;
                
                if (!pageCount || !mediaId) return null;
                
                // Ambil 1-2 halaman random
                const randomPageIdx = Math.floor(Math.random() * Math.min(pageCount, 15));
                const page = pages[randomPageIdx];
                const hintExt = page?.t || 'j';
                
                const buffer = await downloadImage(mediaId, randomPageIdx + 1, hintExt);
                
                return {
                    id,
                    title: gallery.title?.english || gallery.title?.pretty || 'Untitled',
                    tags: (gallery.tags || []).map(t => t.name).slice(0, 8),
                    url: `${BASE}/g/${id}/`,
                    buffer,
                    pageNum: randomPageIdx + 1,
                    totalPages: pageCount,
                };
            } catch (e) {
                console.error(`[NSFW] Gallery ${id} error:`, e.message);
                return null;
            }
        });
        
        const settled = await Promise.allSettled(promises);
        for (const s of settled) {
            if (s.status === 'fulfilled' && s.value && results.length < wantCount) {
                results.push(s.value);
            }
        }
    }
    
    if (!results.length) throw new Error('Gagal mengunduh gambar NSFW.');
    return results;
}

function formatNSFWCaption(data, { index = null, total = null } = {}) {
    const numPrefix = (index !== null && total !== null) ? `🖼️ *${index + 1} dari ${total}*\n` : '';
    const lines = [
        `${numPrefix}🔞 *${data.title}*`,
        `📄 *Page:* ${data.pageNum} / ${data.totalPages}`,
        ``,
        `🏷️ *Tags:* ${data.tags.length ? data.tags.map(t => `#${t}`).join(' ') : '-'}`,
        ``,
        `🔗 ${data.url}`,
    ];
    return lines.join('\n');
}

module.exports = { fetchNSFWImages, formatNSFWCaption };

// ── COMMAND HANDLER ────────────────────────────────────────────────────────────

async function handlePixiv18({ hisoka, m, query, tolak, logCommand, logError }) {
    try {
        const input = (query || '').trim();
        const pfx = m.prefix || '.';

        if (!input) {
            await tolak(hisoka, m,
                `╭─「 🔞 *NSFW IMAGE SEARCH* 」\n│\n│ Cari gambar NSFW (100% R18).\n│\n│ *Format:*\n│ • ${pfx}pixivr18 <query>\n│ • ${pfx}pixivr18 <query>,<jumlah>\n│\n│ *Contoh 1 gambar:*\n│ • ${pfx}pixivr18 yuri\n│ • ${pfx}pixivr18 maid\n│\n│ *Contoh banyak gambar (max 10):*\n│ • ${pfx}pixivr18 schoolgirl,5\n│ • ${pfx}pixivr18 catgirl,10\n│\n│ ⚠️ Konten dewasa (R18). 18+ only.\n╰──────────────────────`
            );
            logCommand(m, hisoka, m.command || 'pixivr18');
            return;
        }

        let realQuery = input;
        let imgCount = 1;
        const lastComma = input.lastIndexOf(',');
        if (lastComma !== -1) {
            const maybeNum = input.slice(lastComma + 1).trim();
            if (/^\d+$/.test(maybeNum)) {
                imgCount = Math.min(Math.max(1, parseInt(maybeNum)), 10);
                realQuery = input.slice(0, lastComma).trim();
            }
        }
        if (!realQuery) { await tolak(hisoka, m, `❌ Query kosong. Contoh: *.pixivr18 yuri,5*`); return; }

        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

        const loadMsg = await tolak(hisoka, m,
            imgCount > 1
                ? `🔍 Mencari *${imgCount} gambar NSFW* "${realQuery}"...`
                : `🔍 Mencari gambar NSFW *${realQuery}*...`
        );

        const images = await fetchNSFWImages(realQuery, imgCount);

        if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }

        if (images.length > 1) {
            try {
                const parentMsg = await hisoka.sendMessage(
                    m.from,
                    { album: { expectedImageCount: images.length, expectedVideoCount: 0 } },
                    { quoted: m }
                );
                for (let i = 0; i < images.length; i++) {
                    const buf = images[i].buffer;
                    const caption = formatNSFWCaption(images[i], { index: i, total: images.length });
                    await hisoka.sendMessage(m.from, { image: buf, albumParentKey: parentMsg.key, caption }, { quoted: m });
                }
            } catch (albumErr) {
                console.error('[NSFW] Album error:', albumErr?.message);
                for (let i = 0; i < images.length; i++) {
                    await hisoka.sendMessage(m.from, { image: images[i].buffer, caption: formatNSFWCaption(images[i], { index: i, total: images.length }) }, { quoted: i === 0 ? m : undefined });
                }
            }
        } else {
            const caption = formatNSFWCaption(images[0]);
            await hisoka.sendMessage(m.from, { image: images[0].buffer, caption }, { quoted: m });
        }

        await hisoka.sendMessage(m.from, { react: { text: '🔞', key: m.key } });
        logCommand(m, hisoka, m.command || 'pixivr18');
    } catch (error) {
        console.error('\x1b[31m[NSFW] Error:\x1b[39m', error.message);
        console.error('[NSFW] Stack:', error.stack);
        logError(error, 'command:pixivr18');
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
        await tolak(hisoka, m,
            `❌ *Gagal mencari gambar NSFW.*\n\n_${error.message}_\n\nContoh:\n• *.pixivr18 yuri* — 1 gambar\n• *.pixivr18 yuri,5* — 5 gambar sekaligus`
        );
    }
}

module.exports.handlePixiv18 = handlePixiv18;
