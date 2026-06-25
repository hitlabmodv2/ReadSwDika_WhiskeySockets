/**
 * ───────────────────────────────
 *  Base Script : Amane
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
 *  tenor-gif.cjs — Scraper & handler GIF anime dari Tenor
 *  Command: .animgif [query opsional]
 *  Scrape random GIF anime dari tenor.com via API v1
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

/* ── Tenor API config ── */
const TENOR_KEY    = 'LIVDSRZULELA';
const TENOR_BASE   = 'https://g.tenor.com/v1/search';
const LIMIT        = 50;
const MAX_POS_PAGE = 10; /* random dari halaman 0–9 (pos 0, 50, 100, ...) */

/* ── Default queries kalau user tidak kasih query ── */
const DEFAULT_QUERIES = [
    'anime girl cute',
    'anime girl happy',
    'anime girl waving',
    'anime girl dance',
    'anime girl smile',
    'anime girl blush',
    'anime kawaii',
    'anime girl reaction',
    'anime girl laugh',
    'anime girl shy',
];

/* ── Ambil random GIF dari Tenor ── */
async function fetchRandomTenorGif(query) {
    const q   = (query || DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)]).trim();
    const pos = Math.floor(Math.random() * MAX_POS_PAGE) * LIMIT;

    const res = await axios.get(TENOR_BASE, {
        params: {
            q,
            key           : TENOR_KEY,
            limit         : LIMIT,
            pos,
            media_filter  : 'minimal',
            contentfilter : 'off',
            locale        : 'id_ID',
        },
        timeout: 15000,
    });

    const results = res.data?.results;
    if (!results || results.length === 0) {
        throw new Error(`Tidak ada GIF ditemukan untuk: "${q}"`);
    }

    const pick   = results[Math.floor(Math.random() * results.length)];
    const gifUrl = pick.media?.[0]?.gif?.url || pick.media?.[0]?.tinygif?.url;

    if (!gifUrl) throw new Error('URL GIF tidak ditemukan dari response Tenor.');

    return {
        url        : gifUrl,
        title      : pick.title || pick.content_description || q,
        itemUrl    : pick.itemurl || `https://tenor.com/view/${pick.id}`,
        tags       : (pick.tags || []).slice(0, 5),
        query      : q,
        pos,
    };
}

/* ── Download GIF sebagai Buffer ── */
async function downloadGif(url) {
    const res = await axios.get(url, {
        responseType : 'arraybuffer',
        timeout      : 30000,
        headers      : {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
    });
    return Buffer.from(res.data);
}

/* ── Command handler .animgif ── */
async function handleAnimgif(hisoka, m, query, ctx) {
    const { tolak, logCommand } = ctx;

    await hisoka.sendMessage(m.from, { react: { text: '🎴', key: m.key } });
    const loadMsg = await tolak(hisoka, m, '🎴 _Mengambil GIF anime random..._');

    const editStep = async (text) => {
        try { await m.reply({ edit: loadMsg.key, text }); } catch (_) {}
    };

    try {
        await editStep('🔍 _Mencari GIF di Tenor..._');

        const gif = await fetchRandomTenorGif(query || null);

        await editStep('📥 _Mengunduh GIF..._');
        const buffer = await downloadGif(gif.url);

        const caption = [
            `🎴 *Anime GIF Random*`,
            ``,
            `🔍 *Query :* ${gif.query}`,
            gif.title ? `📝 *Judul :* ${gif.title}` : null,
            gif.tags.length > 0 ? `🏷️ *Tags  :* ${gif.tags.join(', ')}` : null,
            ``,
            `_Powered by Tenor • WilyBot_`,
        ].filter(Boolean).join('\n');

        await hisoka.sendMessage(m.from, {
            video    : buffer,
            caption,
            gifPlayback: true,
            mimetype : 'video/mp4',
        }, { quoted: m });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        await editStep(`✅ *GIF berhasil dikirim!*`);
        logCommand(m, hisoka, 'animgif');

    } catch (err) {
        console.error('[TenorGif]', err.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await editStep(`❌ *Gagal:* ${err.message}`);
    }
}

module.exports = { handleAnimgif, fetchRandomTenorGif };
