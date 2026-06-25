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
 *  Command: .animgif [list | kategori | query bebas]
 *  Scrape random GIF anime dari tenor.com via API v1
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

/* ── Tenor API config ── */
const TENOR_KEY    = 'LIVDSRZULELA';
const TENOR_BASE   = 'https://g.tenor.com/v1/search';
const LIMIT        = 50;
const MAX_POS_PAGE = 10;

/* ── Kategori preset (keyword → query Tenor) ── */
const PRESET_CATEGORIES = {
    dance    : { emoji: '💃', label: 'Dance',    query: 'anime girl dance'       },
    blush    : { emoji: '😳', label: 'Blush',    query: 'anime girl blush'       },
    cry      : { emoji: '😢', label: 'Cry',      query: 'anime girl cry'         },
    laugh    : { emoji: '😂', label: 'Laugh',    query: 'anime girl laugh'       },
    shy      : { emoji: '🙈', label: 'Shy',      query: 'anime girl shy'         },
    happy    : { emoji: '😊', label: 'Happy',    query: 'anime girl happy'       },
    angry    : { emoji: '😤', label: 'Angry',    query: 'anime girl angry'       },
    cute     : { emoji: '🌸', label: 'Cute',     query: 'anime girl cute'        },
    wave     : { emoji: '👋', label: 'Wave',     query: 'anime girl waving'      },
    smile    : { emoji: '😄', label: 'Smile',    query: 'anime girl smile'       },
    sleep    : { emoji: '😴', label: 'Sleep',    query: 'anime girl sleeping'    },
    eat      : { emoji: '🍜', label: 'Eat',      query: 'anime girl eating'      },
    run      : { emoji: '🏃', label: 'Run',      query: 'anime girl running'     },
    fight    : { emoji: '⚔️', label: 'Fight',    query: 'anime girl fight'       },
    think    : { emoji: '🤔', label: 'Think',    query: 'anime girl thinking'    },
    kawaii   : { emoji: '✨', label: 'Kawaii',   query: 'anime kawaii'           },
    reaction : { emoji: '🎭', label: 'Reaction', query: 'anime girl reaction'    },
    surprise : { emoji: '😱', label: 'Surprise', query: 'anime girl surprised'   },
    hug      : { emoji: '🤗', label: 'Hug',      query: 'anime girl hug'        },
    wave2    : { emoji: '🌊', label: 'Wink',     query: 'anime girl wink'        },
};

/* ── Default kalau tidak ada query ── */
const DEFAULT_QUERIES = Object.values(PRESET_CATEGORIES).map(c => c.query);

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
            contentfilter : 'off',
            locale        : 'id_ID',
        },
        timeout: 15000,
    });

    const results = res.data?.results;
    if (!results || results.length === 0) throw new Error(`Tidak ada GIF untuk: "${q}"`);

    const pick   = results[Math.floor(Math.random() * results.length)];
    const med    = pick.media?.[0] || {};

    /* Prioritas: loopedmp4 (loop native) → mp4 → tinymp4 */
    const mp4Url = med.loopedmp4?.url || med.mp4?.url || med.tinymp4?.url;
    if (!mp4Url) throw new Error('URL MP4 tidak ditemukan dari Tenor.');

    return {
        url    : mp4Url,
        title  : pick.title || pick.content_description || q,
        tags   : (pick.tags || []).slice(0, 5),
        query  : q,
        pos,
    };
}

/* ── Download MP4 sebagai Buffer ── */
async function downloadGif(url) {
    const res = await axios.get(url, {
        responseType : 'arraybuffer',
        timeout      : 30000,
        headers      : { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36' },
    });
    return Buffer.from(res.data);
}

/* ── Teks list kategori ── */
function buildListText(pfx) {
    const cmd = `${pfx}animgif`;
    const rows = Object.entries(PRESET_CATEGORIES)
        .map(([key, c]) => `│ ${c.emoji} *${key}* — ${c.label}`)
        .join('\n');

    return [
        `╭══『 🎴 *ANIMGIF KATEGORI* 』══╮`,
        rows,
        `│`,
        `├── *Cara Pakai:*`,
        `│ • ${cmd} dance`,
        `│ • ${cmd} blush`,
        `│ • ${cmd} <query bebas>`,
        `│ • ${cmd} ← tanpa query = random`,
        `╰══════════════════════════╯`,
    ].join('\n');
}

/* ── Command handler .animgif ── */
async function handleAnimgif(hisoka, m, query, ctx) {
    const { tolak, logCommand } = ctx;
    const pfx = m.prefix || '.';

    /* ── Subcommand: list ── */
    const qLower = (query || '').trim().toLowerCase();
    if (qLower === 'list' || qLower === 'kategori' || qLower === 'help') {
        await tolak(hisoka, m, buildListText(pfx));
        logCommand(m, hisoka, 'animgif list');
        return;
    }

    /* ── Resolve query: preset keyword → query Tenor ── */
    let resolvedQuery = null;
    let usedLabel     = null;

    if (qLower && PRESET_CATEGORIES[qLower]) {
        resolvedQuery = PRESET_CATEGORIES[qLower].query;
        usedLabel     = `${PRESET_CATEGORIES[qLower].emoji} ${PRESET_CATEGORIES[qLower].label}`;
    } else if (query && query.trim()) {
        resolvedQuery = query.trim();
    }

    await hisoka.sendMessage(m.from, { react: { text: '🎴', key: m.key } });
    const loadMsg = await tolak(hisoka, m, '🎴 _Mengambil GIF anime..._');

    const editStep = async (text) => {
        try { await m.reply({ edit: loadMsg.key, text }); } catch (_) {}
    };

    try {
        await editStep('🔍 _Mencari GIF di Tenor..._');

        const gif = await fetchRandomTenorGif(resolvedQuery);

        await editStep('📥 _Mengunduh GIF..._');
        const buffer = await downloadGif(gif.url);

        const caption = [
            `🎴 *Anime GIF Random*`,
            ``,
            `🔍 *Query   :* ${gif.query}`,
            usedLabel              ? `🏷️ *Kategori:* ${usedLabel}`            : null,
            gif.title              ? `📝 *Judul   :* ${gif.title}`            : null,
            gif.tags.length > 0    ? `🔖 *Tags    :* ${gif.tags.join(', ')}` : null,
            ``,
            `_💡 Ketik ${pfx}animgif list untuk lihat kategori_`,
            `_Powered by Tenor • WilyBot_`,
        ].filter(Boolean).join('\n');

        await hisoka.sendMessage(m.from, {
            video      : buffer,
            caption,
            gifPlayback: true,
            mimetype   : 'video/mp4',
        }, { quoted: m });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        await editStep('✅ *GIF berhasil dikirim!*');
        logCommand(m, hisoka, 'animgif');

    } catch (err) {
        console.error('[TenorGif]', err.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await editStep(`❌ *Gagal:* ${err.message}`);
    }
}

module.exports = { handleAnimgif, fetchRandomTenorGif };
