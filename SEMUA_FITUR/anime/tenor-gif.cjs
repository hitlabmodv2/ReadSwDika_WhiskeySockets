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

/* ── Format bytes ke KB/MB ── */
function formatSize(bytes) {
    if (!bytes || bytes <= 0) return 'N/A';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/* ── Format durasi detik ── */
function formatDuration(secs) {
    if (!secs || secs <= 0) return 'N/A';
    return parseFloat(secs).toFixed(3) + ' sec';
}

/* ── Format tanggal dari Unix timestamp ── */
function formatDate(unixTs) {
    if (!unixTs) return 'N/A';
    const d = new Date(unixTs * 1000);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}`;
}

/* ── Frame animasi loading (berputar agar tidak spam) ── */
const LOAD_FRAMES_SEARCH = [
    '🔍 _Mencari GIF di Tenor..._',
    '🌐 _Menghubungi server Tenor..._',
    '📡 _Mengambil data GIF..._',
    '🎴 _Memproses hasil pencarian..._',
];

const LOAD_FRAMES_DOWNLOAD = [
    '📥 _Mengunduh GIF... (0%)_',
    '📥 _Mengunduh GIF... (25%)_',
    '📥 _Mengunduh GIF... (50%)_',
    '📥 _Mengunduh GIF... (75%)_',
    '📥 _Mengunduh GIF... (99%)_',
];

/* ── Animasi edit berputar selama proses berlangsung ── */
async function animateLoading(editFn, frames, intervalMs = 900) {
    let i = 0;
    let running = true;
    const tick = async () => {
        while (running) {
            await editFn(frames[i % frames.length]).catch(() => {});
            i++;
            await new Promise(r => setTimeout(r, intervalMs));
        }
    };
    tick();
    return () => { running = false; };
}

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

    const pick = results[Math.floor(Math.random() * results.length)];
    const med  = pick.media?.[0] || {};

    /*
     * Prioritas format MP4 ukuran KECIL dulu agar tidak gagal muat:
     * nanomp4 → tinymp4 → mp4 (hindari loopedmp4 karena terlalu besar)
     * gifPlayback:true di Baileys menjadikannya tampil sebagai GIF di WhatsApp
     */
    const mp4Meta =
        med.nanomp4  ||
        med.tinymp4  ||
        med.mp4      ||
        {};

    if (!mp4Meta.url) throw new Error('URL MP4 tidak ditemukan dari Tenor.');

    /* Meta dari format GIF (untuk info ukuran/dimensi yang lebih akurat) */
    const gifMeta =
        med.tinygif  ||
        med.nanogif  ||
        med.gif      ||
        {};

    /* Dimensi: coba dari gif → mp4 → null */
    const dims     = gifMeta.dims     || mp4Meta.dims     || null;
    const duration = gifMeta.duration ?? mp4Meta.duration ?? null;
    /* Ukuran file: ambil dari mp4 yang dipilih */
    const fileSize = mp4Meta.size     || null;

    return {
        url        : mp4Meta.url,
        title      : pick.title || pick.content_description || q,
        description: pick.content_description || pick.title || '',
        tags       : (pick.tags || []).slice(0, 5),
        query      : q,
        pos,
        created    : pick.created || null,
        dims,
        duration,
        fileSize,
    };
}

/* ── Download buffer ── */
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

/* ── Teks list kategori ── */
function buildListText(pfx) {
    const cmd  = `${pfx}animgif`;
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

    let stopAnim = null;

    try {
        /* ── Animasi tahap 1: cari ── */
        stopAnim = await animateLoading(editStep, LOAD_FRAMES_SEARCH, 900);
        const gif = await fetchRandomTenorGif(resolvedQuery);

        /* ── Animasi tahap 2: download ── */
        if (stopAnim) { stopAnim(); stopAnim = null; }
        stopAnim = await animateLoading(editStep, LOAD_FRAMES_DOWNLOAD, 700);
        const buffer = await downloadGif(gif.url);

        /* ── Stop animasi ── */
        if (stopAnim) { stopAnim(); stopAnim = null; }

        /* ── Info ukuran aktual dari buffer ── */
        const actualSize = formatSize(gif.fileSize || buffer.byteLength);
        const dimsStr    = gif.dims ? `${gif.dims[0]}x${gif.dims[1]}` : 'N/A';

        /* ── Caption detail lengkap ── */
        const caption = [
            `🎴 *Anime GIF Random*`,
            ``,
            `🔍 *Query    :* ${gif.query}`,
            usedLabel             ? `🏷️ *Kategori :* ${usedLabel}`            : null,
            gif.title             ? `📝 *Judul    :* ${gif.title}`            : null,
            gif.tags.length > 0  ? `🔖 *Tags     :* ${gif.tags.join(', ')}`  : null,
            ``,
            `╭──『 📋 *Detail* 』──`,
            gif.description       ? `│ 📄 *Deskripsi Konten:*`               : null,
            gif.description       ? `│     ${gif.description}`               : null,
            `│ 📦 *Ukuran File    :* ${actualSize}`,
            `│ ⏱️ *Durasi         :* ${formatDuration(gif.duration)}`,
            `│ 📐 *Dimensi        :* ${dimsStr}`,
            `│ 📅 *Dibuat         :* ${formatDate(gif.created)}`,
            `╰───────────────────`,
            ``,
            `_💡 Ketik ${pfx}animgif list untuk lihat kategori_`,
            `_Powered by Tenor • WilyBot_`,
        ].filter(v => v !== null).join('\n');

        /*
         * Kirim sebagai VIDEO dengan gifPlayback:true
         * → WhatsApp menampilkan badge GIF + auto-play tanpa suara (persis seperti GIF)
         */
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
        if (stopAnim) { stopAnim(); stopAnim = null; }
        console.error('[TenorGif]', err.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await editStep(`❌ *Gagal:* ${err.message}`);
    }
}

module.exports = { handleAnimgif, fetchRandomTenorGif };
