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
 *  hentaicop-monitor.cjs — Monitor HentaiCop.com
 *  Cek update realtime dari 3 kategori:
 *  🎌 Hentai · 🎬 JAV · 🎥 2D
 *  Kirim notif otomatis ke grup yang terdaftar.
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const path  = require('path');
const fs    = require('fs');

const DIR_DATA    = path.join(process.cwd(), 'data', 'hentaicopnotif');
const FILE_DATA   = path.join(DIR_DATA, 'state.json');
const FILE_LOG    = path.join(DIR_DATA, 'log.json');
const FILE_CONFIG = path.join(process.cwd(), 'config.json');
fs.mkdirSync(DIR_DATA, { recursive: true });

const RETRY_TTL_MS = 30 * 60 * 1000; // 30 menit

const SEP  = '━━━━━━━━━━━━━━━━━━';
const SEP2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

const IMG_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    'Accept'    : 'image/webp,image/apng,image/*,*/*;q=0.8',
};

// ── BACA / SIMPAN ─────────────────────────────────────────────────────────────

function bacaData() {
    try {
        if (fs.existsSync(FILE_DATA)) return JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
    } catch (_) {}
    return { idTerkirim: [], idGagal: [], lastCheckTime: null };
}

function simpanData(data) {
    try { fs.writeFileSync(FILE_DATA, JSON.stringify(data, null, 2), 'utf-8'); } catch (_) {}
}

function bacaLog() {
    try {
        if (fs.existsSync(FILE_LOG)) return JSON.parse(fs.readFileSync(FILE_LOG, 'utf-8'));
    } catch (_) {}
    return { terkirim: [] };
}

function simpanLog(log) {
    try { fs.writeFileSync(FILE_LOG, JSON.stringify(log, null, 2), 'utf-8'); } catch (_) {}
}

function bacaConfig() {
    try {
        if (fs.existsSync(FILE_CONFIG)) return JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf-8'));
    } catch (_) {}
    return {};
}

function simpanConfig(cfg) {
    try { fs.writeFileSync(FILE_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) {}
}

// ── PENGATURAN GRUP ───────────────────────────────────────────────────────────

function getEnabledGroups() {
    const cfg    = bacaConfig();
    const groups = cfg?.hentaicopnotif?.groups || {};
    return Object.entries(groups)
        .filter(([, v]) => v?.enabled === true)
        .map(([jid]) => jid);
}

function setGroupEnabled(jid, enabled) {
    const cfg = bacaConfig();
    if (!cfg.hentaicopnotif)        cfg.hentaicopnotif        = { groups: {}, categories: ['hentai', 'jav', '2d'] };
    if (!cfg.hentaicopnotif.groups) cfg.hentaicopnotif.groups = {};
    cfg.hentaicopnotif.groups[jid] = { enabled, diubahPada: Date.now() };
    simpanConfig(cfg);
}

function getActiveCategories() {
    const cfg = bacaConfig();
    return cfg?.hentaicopnotif?.categories || ['hentai', 'jav', '2d'];
}

// ── DEDUP ─────────────────────────────────────────────────────────────────────

function buatId(url, epBadge) {
    const slug = (url || '').replace(/^https?:\/\/hentaicop\.com\/series\//, '').replace(/\/+$/, '');
    return `${slug}::ep${epBadge || '0'}`;
}

function sudahDikirim(id) {
    return (bacaData().idTerkirim || []).includes(String(id));
}

function tandaiSudahKirim(id) {
    const data = bacaData();
    if (!data.idTerkirim) data.idTerkirim = [];
    if (!data.idTerkirim.includes(String(id))) {
        data.idTerkirim.unshift(String(id));
        if (data.idTerkirim.length > 500) data.idTerkirim = data.idTerkirim.slice(0, 500);
        simpanData(data);
    }
}

function tandaiDanLog(item, grupList) {
    tandaiSudahKirim(item.id);
    try {
        const log = bacaLog();
        if (!Array.isArray(log.terkirim)) log.terkirim = [];
        if (!log.terkirim.some(e => String(e.id) === String(item.id))) {
            log.terkirim.unshift({
                id        : String(item.id),
                title     : item.title || '-',
                kategori  : item.kategori || 'hentai',
                waktuKirim: new Date().toISOString(),
                grupCount : grupList.length,
                thumbnail : item.thumbnail || null,
                url       : item.url || null,
            });
            if (log.terkirim.length > 300) log.terkirim = log.terkirim.slice(0, 300);
            simpanLog(log);
        }
    } catch (e) {
        console.warn('[HentaicopNotif] Gagal simpan log:', e?.message);
    }
}

function getRecentLog(jumlah = 20) {
    return (bacaLog().terkirim || []).slice(0, jumlah);
}

// ── CARI KONTEN BARU ──────────────────────────────────────────────────────────

async function cariKontenBaru() {
    const { getCategoryPosts, getDetailHentaicop, getEpisodeDownloads } = require('./hentaicop.cjs');

    const now        = Date.now();
    const data       = bacaData();
    const isFirstRun = !data.lastCheckTime;

    data.lastCheckTime = now;
    if (!data.idTerkirim) data.idTerkirim = [];
    if (!data.idGagal)    data.idGagal    = [];
    simpanData(data);

    const kategoriAktif = getActiveCategories();
    const semuaPost     = [];
    const seenId        = new Set();

    // Fetch semua kategori aktif secara paralel
    const fetchResults = await Promise.allSettled(
        kategoriAktif.map(async (slug) => {
            try {
                return await getCategoryPosts(slug);
            } catch (e) {
                console.error(`[HentaicopNotif] ❌ Gagal fetch kategori ${slug}:`, e?.message);
                return [];
            }
        })
    );

    for (const result of fetchResults) {
        if (result.status !== 'fulfilled') continue;
        for (const post of (result.value || [])) {
            if (!post.url) continue;
            const id = buatId(post.url, post.epBadge);
            if (seenId.has(id)) continue;
            seenId.add(id);
            semuaPost.push({ ...post, id });
        }
    }

    // First run — tandai semua sebagai seen, jangan kirim
    if (isFirstRun) {
        console.log(`[HentaicopNotif] 🚀 First run — tandai ${semuaPost.length} post sebagai seen`);
        const df = bacaData();
        for (const post of semuaPost) {
            if (!df.idTerkirim.includes(String(post.id))) df.idTerkirim.unshift(String(post.id));
        }
        df.idGagal = [];
        simpanData(df);
        return [];
    }

    const baru        = [];
    const idGagalBaru = [];

    // Retry gagal sebelumnya
    for (const gagal of (data.idGagal || [])) {
        if (sudahDikirim(gagal.id)) continue;
        const usiaGagal = now - new Date(gagal.pertamaGagal || now).getTime();
        if (usiaGagal > RETRY_TTL_MS) {
            console.log(`[HentaicopNotif] ⏭️ Retry timeout: "${gagal.title}" diabaikan`);
            tandaiSudahKirim(gagal.id);
            continue;
        }
        try {
            const detail = await getDetailHentaicop(gagal.url);
            let episodeDownloads = [];
            if (detail.latestEpUrl) {
                try { episodeDownloads = await getEpisodeDownloads(detail.latestEpUrl); } catch (_) {}
            }
            baru.push({ id: gagal.id, url: gagal.url, title: detail.title || gagal.title, kategori: detail.kategori || gagal.kategori, episodeDownloads, ...detail });
            console.log(`[HentaicopNotif] 🔄 Retry berhasil: "${gagal.title}"`);
        } catch (e) {
            console.warn(`[HentaicopNotif] 🔄 Retry masih gagal "${gagal.title}":`, e?.message);
            idGagalBaru.push(gagal);
        }
    }

    // Cek post baru
    for (const post of semuaPost) {
        if (sudahDikirim(post.id)) continue;

        try {
            const detail = await getDetailHentaicop(post.url);
            let episodeDownloads = [];
            if (detail.latestEpUrl) {
                try { episodeDownloads = await getEpisodeDownloads(detail.latestEpUrl); } catch (_) {}
            }
            baru.push({
                id      : post.id,
                url     : post.url,
                title   : detail.title || post.title,
                kategori: detail.kategori || post.kategori || 'hentai',
                thumbnail: detail.thumbnail || post.thumbnail,
                epBadge : post.epBadge,
                episodeDownloads,
                ...detail,
            });
        } catch (e) {
            console.warn(`[HentaicopNotif] ❌ Gagal fetch detail "${post.title}":`, e?.message);
            idGagalBaru.push({
                id          : post.id,
                url         : post.url,
                title       : post.title,
                kategori    : post.kategori || 'hentai',
                thumbnail   : post.thumbnail,
                pertamaGagal: new Date().toISOString(),
            });
        }
    }

    const dataFinal = bacaData();
    dataFinal.idGagal = idGagalBaru;
    simpanData(dataFinal);

    return baru;
}

// ── SIMULASI ──────────────────────────────────────────────────────────────────
// slug: 'hentai' | 'jav' | '2d' (default: 'hentai')
async function simulasi(slug) {
    const { getCategoryPosts, getDetailHentaicop, getEpisodeDownloads } = require('./hentaicop.cjs');
    const katSlug = slug || 'hentai';
    const posts   = await getCategoryPosts(katSlug);
    if (!posts.length) throw new Error(`Tidak ada post dari hentaicop.com/${katSlug}/`);

    const post   = posts[0];
    const id     = buatId(post.url, post.epBadge);
    const detail = await getDetailHentaicop(post.url);

    // Fetch link download realtime dari halaman episode terbaru
    let episodeDownloads = [];
    if (detail.latestEpUrl) {
        try { episodeDownloads = await getEpisodeDownloads(detail.latestEpUrl); } catch (_) {}
    }

    const item    = { id, url: post.url, title: detail.title || post.title, kategori: detail.kategori || katSlug, thumbnail: detail.thumbnail || post.thumbnail, epBadge: post.epBadge, episodeDownloads, ...detail };
    const caption = buatCaption(item);
    return { caption, urlGambar: item.thumbnail || null, item };
}

// ── FORMAT CAPTION ────────────────────────────────────────────────────────────

const KATEGORI_INFO = {
    'hentai': { emoji: '🎌', label: 'Hentai', header: '🎌 *HENTAI BARU — HENTAICOP!*' },
    'jav'   : { emoji: '🎬', label: 'JAV',    header: '🎬 *JAV BARU — HENTAICOP!*'    },
    '2d'    : { emoji: '🎥', label: '2D',      header: '🎥 *2D BARU — HENTAICOP!*'    },
};

function getKatInfo(kategori) {
    return KATEGORI_INFO[kategori] || KATEGORI_INFO['hentai'];
}

function waktuSekarang() {
    const now      = new Date();
    const opsiHari = { timeZone: 'Asia/Jakarta', weekday: 'long' };
    const opsiTgl  = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const opsiJam  = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    const hari     = now.toLocaleDateString('id-ID', opsiHari);
    const tgl      = now.toLocaleDateString('id-ID', opsiTgl);
    const jam      = now.toLocaleTimeString('id-ID', opsiJam).replace('.', ':');
    return `${hari}, ${tgl} · ${jam} WIB`;
}

function potongTeks(teks, maks = 400) {
    const t = (teks || '').trim();
    if (!t || t === '-') return '';
    return t.length <= maks ? t : t.slice(0, maks).trimEnd() + '…';
}

function buatCaption(data) {
    const {
        title, kategori, url,
        status     = '', studio     = '', released   = '',
        duration   = '', epTotal    = '', censor     = '',
        producers  = '', casts      = '', tanggal    = '',
        genres     = [], synopsis   = '', rating     = '',
        episodeList = [], latestEpUrl = null, latestEpNum = 0,
        epBadge    = '',
        episodeDownloads = [],
    } = data;

    const katInfo     = getKatInfo(kategori);
    const headerWaktu = waktuSekarang();

    // ── Sinopsis (> kutip, potong per ~120 karakter biar enak dibaca) ───────────
    const sinopsisTeks = (synopsis || '').trim();
    let sinopsisBlok = null;
    if (sinopsisTeks) {
        // Pecah jadi baris ~120 karakter di batas spasi
        const kata = sinopsisTeks.split(' ');
        const barisSin = [];
        let barisIni = '';
        for (const k of kata) {
            if ((barisIni + ' ' + k).trim().length > 120) {
                if (barisIni) barisSin.push(barisIni.trim());
                barisIni = k;
            } else {
                barisIni = barisIni ? barisIni + ' ' + k : k;
            }
        }
        if (barisIni) barisSin.push(barisIni.trim());
        sinopsisBlok = barisSin.map(b => `> ${b}`).join('\n');
    }

    // ── Episode badge ─────────────────────────────────────────────────────────
    let epLabel = '';
    if (epBadge && epBadge !== 'completed' && epBadge !== 'ongoing') {
        epLabel = `\`Ep ${epBadge}\``;
    } else if (epTotal) {
        epLabel = `\`${epTotal} Episode\``;
    }

    // ── Info block (tree style ├ ╰) ───────────────────────────────────────────
    const genreStr = genres.length ? genres.slice(0, 6).join(', ') : '';
    const infoItems = [
        ['🗂️ *Kategori*', katInfo.label                    ],
        ['📡 *Status*',   status || null                    ],
        ['🎭 *Tipe*',     censor ? `${censor}` : null       ],
        ['🏢 *Studio*',   studio || null                    ],
        // BUG FIX: tampilkan released di info block, tanggal hanya jika released kosong
        ['🗓️ *Rilis*',    released || tanggal || null       ],
        ['⏱️ *Durasi*',   duration || null                  ],
        ['⭐ *Rating*',   rating ? `${rating}/10` : null    ],
        ['🎭 *Genre*',    genreStr || null                  ],
        ['🎬 *Produser*', producers || null                 ],
        ['👥 *Casts*',    casts ? potongTeks(casts, 80) : null],
    ].filter(([, v]) => v && v !== '' && v !== '-');

    const infoBlok = infoItems.map(([label, val]) => {
        return `${label} : _${val}_`;
    }).join('\n');

    // ── Episode list (daftar bernomor, maks 5 episode) ────────────────────────
    let epBlok = '';
    if (episodeList.length) {
        const tampil = episodeList.slice(0, 5);
        epBlok  = `${SEP}\n`;
        epBlok += `📺 *DAFTAR EPISODE*\n`;
        epBlok += `${SEP2}\n`;
        tampil.forEach((ep, i) => {
            const epNum    = String(ep.epNum).padStart(2, '0');
            const isLatest = i === 0 ? ' ← *Terbaru*' : '';
            epBlok += `${i + 1}. \`Ep ${epNum}\` — [Tonton](${ep.url})${isLatest}\n`;
        });
        if (episodeList.length > 5) epBlok += `_...dan ${episodeList.length - 5} episode lainnya_\n`;
        epBlok = epBlok.trimEnd();
    }

    // ── Download realtime (dari halaman episode) ──────────────────────────────
    // Format: 1. `1080p` · _49.86 MB_ → [HepiDrive Cepat](url)
    let dlBlok = '';
    if (episodeDownloads && episodeDownloads.length) {
        dlBlok  = `${SEP}\n`;
        dlBlok += `📥 *DOWNLOAD*\n`;
        dlBlok += `${SEP2}\n`;
        episodeDownloads.forEach((dl, i) => {
            dlBlok += `${i + 1}. \`${dl.quality}\` · _${dl.size}_ → [${dl.server}](${dl.url})\n`;
        });
        dlBlok = dlBlok.trimEnd();
    }

    // ── Streaming (pisah dari download) ──────────────────────────────────────
    const streamBlok = latestEpUrl
        ? `${SEP}\n` +
          `▶️ *STREAMING*\n` +
          `${SEP2}\n` +
          `• [▶ Tonton Sekarang](${latestEpUrl})\n` +
          `• [📋 Semua Episode](${url})`
        : url
        ? `${SEP}\n` +
          `▶️ *TONTON*\n` +
          `${SEP2}\n` +
          `• [🔗 Buka Halaman Series](${url})`
        : null;

    // ── Susun baris caption ───────────────────────────────────────────────────
    const baris = [
        katInfo.header,
        SEP,
        `📅 _${headerWaktu}_`,
        SEP,
        ``,
        `*${title || '-'}*`,
        epLabel ? epLabel : null,
        // BUG FIX: tanggal di bawah judul hanya tampil jika released kosong (hindari duplikat)
        (!released && tanggal) ? `_🗓 Dirilis: ${tanggal}_` : null,
        sinopsisBlok ? `` : null,
        sinopsisBlok ? `📖 *Sinopsis*` : null,
        sinopsisBlok || null,
        ``,
        SEP,
        `📋 *INFO*`,
        SEP2,
        infoBlok || '-',
        epBlok     ? `\n${epBlok}`     : null,
        dlBlok     ? `\n${dlBlok}`     : null,
        streamBlok ? `\n${streamBlok}` : null,
        `\n${SEP}`,
        `🌐 *Source:* \`hentaicop.com\``,
    ];

    return baris.filter(b => b !== null && b !== undefined).join('\n');
}

// ── IMAGE HELPER ──────────────────────────────────────────────────────────────

const _domainStrategy  = {};
const STRATEGY_TTL_MS  = 6 * 60 * 60 * 1000; // 6 jam

function _getStrategy(domain) {
    const entry = _domainStrategy[domain];
    if (!entry) return 'direct';
    if (Date.now() - entry.since > STRATEGY_TTL_MS) { delete _domainStrategy[domain]; return 'direct'; }
    return entry.mode;
}

function _setStrategy(domain, mode) {
    _domainStrategy[domain] = { mode, since: Date.now() };
}

function buatProxyUrl(url) {
    if (!url) return null;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=85`;
}

async function downloadImageBuffer(url) {
    if (!url) return null;
    let domain;
    try { domain = new URL(url).hostname; } catch (_) { return null; }

    if (_getStrategy(domain) === 'proxy') return null;

    try {
        const r = await axios.get(url, {
            headers     : { ...IMG_HEADERS, Referer: `https://${domain}/`, Origin: `https://${domain}` },
            responseType: 'arraybuffer',
            timeout     : 12000,
        });
        if (r.data && r.data.byteLength > 1000) {
            _setStrategy(domain, 'direct');
            return Buffer.from(r.data);
        }
    } catch (_) {
        _setStrategy(domain, 'proxy');
    }
    return null;
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

module.exports = {
    getEnabledGroups,
    setGroupEnabled,
    getActiveCategories,
    cariKontenBaru,
    buatCaption,
    tandaiSudahKirim,
    tandaiDanLog,
    getRecentLog,
    simulasi,
    downloadImageBuffer,
    buatProxyUrl,
};

// ── BUTTON HELPERS ────────────────────────────────────────────────────────────

const _KAT_META = {
    'hentai': { id: '__hcnotif_kat_hentai__', emoji: '🎌', nama: 'Hentai' },
    'jav'   : { id: '__hcnotif_kat_jav__',    emoji: '🎬', nama: 'JAV'    },
    '2d'    : { id: '__hcnotif_kat_2d__',     emoji: '🎥', nama: '2D'     },
};

function _tambahBtnKat(btn, katAktif) {
    for (const [slug, meta] of Object.entries(_KAT_META)) {
        const aktif = katAktif.includes(slug);
        btn.addReply(`${aktif ? '✅' : '❌'} ${meta.emoji} ${meta.nama}`, meta.id);
    }
    btn.addReply('🔙 Kembali', '__hcnotif_back__');
}

function _tambahBtnOnOff(btn, isActive) {
    if (isActive) btn.addReply('❌ Matikan GC Ini',  '__hcnotif_off__');
    else          btn.addReply('✅ Aktifkan GC Ini', '__hcnotif_on__');
    btn.addReply('✏️ Edit Kategori',   '__hcnotif_kat_menu__');
    btn.addReply('📋 Lihat GC Aktif', '__hcnotif_list__');
}

function _katInfoLine(katAktif) {
    const str = katAktif.map(s => (_KAT_META[s]?.emoji || '') + ' ' + (_KAT_META[s]?.nama || s)).join(', ') || 'tidak ada';
    return `_${str}_`;
}

// Auto-clean & send helper
const _prevBtnKey = new Map();

async function _autoClean(hisoka, m) {
    const prev = _prevBtnKey.get(m.from);
    if (prev) { try { await hisoka.sendMessage(m.from, { delete: prev }); } catch (_) {} _prevBtnKey.delete(m.from); }
    if (m.key) { try { await hisoka.sendMessage(m.from, { delete: m.key }); } catch (_) {} }
}

async function _runBtn(hisoka, m, btn, fallbackBody, tolakFn) {
    try {
        const sent = await btn.run(m.from, hisoka, m);
        if (sent?.key) _prevBtnKey.set(m.from, sent.key);
    } catch (_) {
        await tolakFn(hisoka, m, fallbackBody);
    }
}

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleHentaicopnotif({ hisoka, m, query, tolak, logCommand, Button, fs: fsMod, path: pathMod, loadConfig, pendingHentaicopNotifChoices }) {
    if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner yang bisa gunakan perintah ini.'); return; }

    const cfgPath = pathMod.join(process.cwd(), 'config.json');
    const sub     = (query || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const pfx     = m.prefix || '.';
    const cfg     = loadConfig();

    if (!cfg.hentaicopnotif)              cfg.hentaicopnotif              = { groups: {}, categories: ['hentai', 'jav', '2d'] };
    if (!cfg.hentaicopnotif.groups)       cfg.hentaicopnotif.groups       = {};
    if (!cfg.hentaicopnotif.categories)   cfg.hentaicopnotif.categories   = ['hentai', 'jav', '2d'];

    // ── NO SUBCOMMAND di grup → button menu ──────────────────────────────────
    if (!sub || sub === 'help') {
        if (m.isGroup) {
            const gcEntry  = cfg.hentaicopnotif.groups[m.from];
            const isReg    = gcEntry !== undefined;
            const isActive = gcEntry?.enabled === true;

            if (isActive) {
                const _body =
                    `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                    `│ Status grup ini : ✅ *AKTIF*\n│\n` +
                    `│ Notif otomatis dari hentaicop.com\n` +
                    `│ akan masuk ke grup ini.\n│\n` +
                    `│ Ketik *${pfx}hentaicopnotif off* untuk matikan.\n│\n` +
                    `╰──────────────────────`;
                const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
                _tambahBtnOnOff(_btn, true);
                try { await _btn.run(m.from, hisoka, m); } catch (_) { await tolak(hisoka, m, _body); }
            } else if (isReg) {
                const _body =
                    `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                    `│ Status grup ini : ❌ *BELUM AKTIF*\n│\n` +
                    `│ ⚠️ ID grup ini sudah ada di daftar,\n` +
                    `│    tapi fitur belum diaktifkan.\n│\n` +
                    `│ Aktifkan notif hentaicop di GC ini?\n│\n` +
                    `╰──────────────────────`;
                try {
                    await new Button().setBody(_body).setFooter('💜 Hentaicop Notif')
                        .addReply('✅ Ya, Aktifkan',    '__hcnotif_on__')
                        .addReply('❌ Tidak, Batal',    '__hcnotif_cancel__')
                        .addReply('📋 Lihat GC Aktif', '__hcnotif_list__')
                        .run(m.from, hisoka, m);
                } catch (_) { await tolak(hisoka, m, _body + `\n\n✅ Ketik *${pfx}hentaicopnotif on* untuk aktifkan.`); }
            } else {
                const _body =
                    `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                    `│ Status grup ini : ➕ *BELUM TERDAFTAR*\n│\n` +
                    `│ Fitur ini belum aktif di grup ini.\n│\n` +
                    `│ Aktifkan notif hentaicop di GC ini?\n│\n` +
                    `╰──────────────────────`;
                try {
                    await new Button().setBody(_body).setFooter('💜 Hentaicop Notif')
                        .addReply('✅ Ya, Aktifkan',    '__hcnotif_on__')
                        .addReply('❌ Tidak, Batal',    '__hcnotif_cancel__')
                        .addReply('📋 Lihat GC Aktif', '__hcnotif_list__')
                        .run(m.from, hisoka, m);
                } catch (_) { await tolak(hisoka, m, _body + `\n\n✅ Ketik *${pfx}hentaicopnotif on* untuk aktifkan.`); }
            }
            logCommand(m, hisoka, 'hentaicopnotif-menu');
            return;
        }

        // Private chat → help teks
        const katAktif = (cfg.hentaicopnotif.categories || []).join(', ') || 'semua';
        await tolak(hisoka, m,
            `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
            `│ Kategori aktif  : _${katAktif}_\n│\n` +
            `│ *Perintah (jalankan di GC):*\n` +
            `│ • ${pfx}hentaicopnotif — menu aktifkan/nonaktifkan\n` +
            `│ • ${pfx}hentaicopnotif on — aktifkan GC ini\n` +
            `│ • ${pfx}hentaicopnotif off — nonaktifkan GC ini\n` +
            `│ • ${pfx}hentaicopnotif status — list semua GC\n` +
            `│   ↳ Reply: *add 1,2* — aktifkan\n` +
            `│   ↳ Reply: *del 1,2* — nonaktifkan\n` +
            `│ • ${pfx}hentaicopnotif test — test ke sini\n` +
            `│ • ${pfx}hentaicopnotif test grup — test ke semua GC aktif\n` +
            `│ • ${pfx}hentaicopnotif test jav — test kategori JAV\n` +
            `│ • ${pfx}hentaicopnotif test 2d — test kategori 2D\n` +
            `│ • ${pfx}hentaicopnotif kategori — atur kategori monitor\n` +
            `│\n` +
            `│ 💡 Notif otomatis saat ada rilis baru:\n` +
            `│    🎌 Hentai · 🎬 JAV · 🎥 2D\n` +
            `│ ⏱️ Realtime · cek tiap 2 menit\n` +
            `╰──────────────────────`
        );
        return;
    }

    // ── ON ────────────────────────────────────────────────────────────────────
    if (sub === 'on') {
        if (!m.isGroup) { await tolak(hisoka, m, '❌ Perintah ini hanya untuk grup.'); return; }
        const sebelumnya = cfg.hentaicopnotif.groups[m.from]?.enabled === true;
        cfg.hentaicopnotif.groups[m.from] = { enabled: true, diubahPada: Date.now() };
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        const katStr = _katInfoLine(cfg.hentaicopnotif.categories || ['hentai', 'jav', '2d']);
        const _body  =
            `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
            `│ Status sebelumnya : ${sebelumnya ? '✅ ON' : '❌ OFF'}\n` +
            `│ Status sekarang   : ✅ *ON*\n│\n` +
            (sebelumnya ? `│ ℹ️ Sudah aktif sebelumnya.\n` : `│ ✅ Berhasil diaktifkan!\n│    Notif otomatis akan masuk ke GC ini.\n`) +
            `│\n│ Kategori : ${katStr}\n│\n` +
            `╰──────────────────────`;
        const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
        _tambahBtnOnOff(_btn, true);
        await _runBtn(hisoka, m, _btn, _body, tolak);
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'hentaicopnotif-on');
        return;
    }

    // ── OFF ───────────────────────────────────────────────────────────────────
    if (sub === 'off') {
        if (!m.isGroup) { await tolak(hisoka, m, '❌ Perintah ini hanya untuk grup.'); return; }
        const sebelumnya = cfg.hentaicopnotif.groups[m.from]?.enabled === true;
        cfg.hentaicopnotif.groups[m.from] = { enabled: false, diubahPada: Date.now() };
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        const _body =
            `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
            `│ Status sebelumnya : ${sebelumnya ? '✅ ON' : '❌ OFF'}\n` +
            `│ Status sekarang   : ❌ *OFF*\n│\n` +
            (sebelumnya ? `│ ❌ Berhasil dinonaktifkan.\n` : `│ ℹ️ Sudah nonaktif sebelumnya.\n`) +
            `│\n╰──────────────────────`;
        const _btnOff = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
        _tambahBtnOnOff(_btnOff, false);
        await _runBtn(hisoka, m, _btnOff, _body, tolak);
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'hentaicopnotif-off');
        return;
    }

    // ── KATEGORI ─────────────────────────────────────────────────────────────
    if (sub === 'kategori' || sub.startsWith('kategori ')) {
        const arg = sub.replace(/^kategori\s*/, '').trim();
        if (!arg) {
            const katAktif = cfg.hentaicopnotif.categories || [];
            await tolak(hisoka, m,
                `╭─「 💜 *HENTAICOP KATEGORI* 」\n│\n` +
                `│ Aktif: *${katAktif.join(', ') || 'tidak ada'}*\n│\n` +
                `│ Tersedia:\n│ • hentai\n│ • jav\n│ • 2d\n│\n` +
                `│ Contoh:\n│ *${pfx}hentaicopnotif kategori hentai jav*\n` +
                `╰──────────────────────`
            );
            return;
        }
        const valid   = ['hentai', 'jav', '2d'];
        const dipilih = arg.split(/[\s,]+/).map(s => s.trim()).filter(s => valid.includes(s));
        if (!dipilih.length) { await tolak(hisoka, m, `❌ Kategori tidak valid.\nPilih dari: ${valid.join(', ')}`); return; }
        cfg.hentaicopnotif.categories = dipilih;
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        await tolak(hisoka, m, `✅ Kategori diperbarui!\nAktif: *${dipilih.join(', ')}*`);
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'hentaicopnotif-kategori');
        return;
    }

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const allGroupsRaw = await hisoka.groupFetchAllParticipating();
            const allGroups    = Object.values(allGroupsRaw || {}).sort((a, b) => (a.subject || '').localeCompare(b.subject || '', 'id'));

            const cfgSt      = loadConfig();
            const registered = cfgSt?.hentaicopnotif?.groups || {};
            const totalAktif = Object.values(registered).filter(v => v?.enabled === true).length;
            const totalNon   = Object.values(registered).filter(v => v?.enabled === false).length;

            let txt = `╭─「 📋 *STATUS HENTAICOP NOTIF* 」\n│\n`;
            txt += `│ Total GC bot   : *${allGroups.length} grup*\n`;
            txt += `│ Terdaftar aktif: *${totalAktif} grup*\n`;
            if (totalNon) txt += `│ Nonaktif       : *${totalNon} grup*\n`;
            txt += `│\n│ Ket: ✅ Aktif  ❌ Nonaktif  ➕ Belum daftar\n`;
            txt += `│━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

            const _urutan = (g) => {
                const reg = registered[g.id];
                if (reg?.enabled === true)  return 0;
                if (reg?.enabled === false) return 1;
                return 2;
            };
            allGroups.sort((a, b) => {
                const uA = _urutan(a), uB = _urutan(b);
                if (uA !== uB) return uA - uB;
                return (a.subject || '').localeCompare(b.subject || '', 'id');
            });

            const gcList = allGroups.map((g, i) => {
                const jid  = g.id;
                const nama = (g.subject || 'Tanpa Nama').slice(0, 28);
                const reg  = registered[jid];
                const ikon = reg?.enabled === true ? '✅' : reg ? '❌' : '➕';
                return { no: i + 1, jid, nama, ikon };
            });

            let lastIkon = '';
            gcList.forEach(({ no, nama, ikon }) => {
                if (ikon !== lastIkon) {
                    const label = ikon === '✅' ? 'Aktif' : ikon === '❌' ? 'Nonaktif' : 'Belum daftar';
                    txt += `│ ┄ ${label} ┄\n`;
                    lastIkon = ikon;
                }
                txt += `│ ${String(no).padStart(2, ' ')}. ${ikon} ${nama}\n`;
            });

            txt += `│\n│ 📌 *Reply pesan ini:*\n`;
            txt += `│ • *add 1,2,3* — aktifkan GC nomor tsb\n`;
            txt += `│ • *del 2,4* — nonaktifkan GC nomor tsb\n`;
            txt += `│ ⏳ Menu berlaku *5 menit*\n╰──────────────────────`;

            const statusMsg = await hisoka.sendMessage(m.from, { text: txt }, { quoted: m });
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

            if (pendingHentaicopNotifChoices) {
                const choiceKey = `${m.from}::${m.sender || m.key?.participant || ''}`;
                const old = pendingHentaicopNotifChoices.get(choiceKey);
                if (old?.timeout) clearTimeout(old.timeout);
                const t = setTimeout(() => pendingHentaicopNotifChoices.delete(choiceKey), 5 * 60 * 1000);
                pendingHentaicopNotifChoices.set(choiceKey, {
                    gcList,
                    botMsgId : statusMsg?.key?.id || '',
                    expiresAt: Date.now() + 5 * 60 * 1000,
                    timeout  : t,
                });
            }
            logCommand(m, hisoka, 'hentaicopnotif-status');
        } catch (err) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal ambil list grup: ${err?.message || err}`);
        }
        return;
    }

    // ── TEST per kategori ─────────────────────────────────────────────────────
    if (/^test\s+(hentai|jav|2d)$/.test(sub)) {
        const katSlug = sub.split(/\s+/)[1];
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const hasil  = await simulasi(katSlug);
            const imgBuf = hasil.urlGambar ? await downloadImageBuffer(hasil.urlGambar) : null;
            if (imgBuf) {
                await hisoka.sendMessage(m.from, { image: imgBuf, mimetype: 'image/jpeg', caption: hasil.caption }, { quoted: m });
            } else if (hasil.urlGambar) {
                await hisoka.sendMessage(m.from, { image: { url: buatProxyUrl(hasil.urlGambar) }, caption: hasil.caption }, { quoted: m });
            } else {
                await tolak(hisoka, m, hasil.caption);
            }
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, `hentaicopnotif-test-${katSlug}`);
        } catch (err) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal: ${err?.message || err}`);
        }
        return;
    }

    // ── TEST GRUP ─────────────────────────────────────────────────────────────
    if (sub === 'test grup') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const daftarGrup = getEnabledGroups();
            if (!daftarGrup.length) {
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, `❌ Belum ada GC aktif.\nKetik *${pfx}hentaicopnotif on* di GC tujuan.`);
                return;
            }
            const hasil      = await simulasi();
            const imgBuf     = hasil.urlGambar ? await downloadImageBuffer(hasil.urlGambar) : null;
            const proxyUrl   = hasil.urlGambar ? buatProxyUrl(hasil.urlGambar) : null;
            let berhasil = 0, gagal = 0;
            for (const jid of daftarGrup) {
                try {
                    if (imgBuf)       await hisoka.sendMessage(jid, { image: imgBuf, mimetype: 'image/jpeg', caption: hasil.caption });
                    else if (proxyUrl) await hisoka.sendMessage(jid, { image: { url: proxyUrl }, caption: hasil.caption });
                    else               await hisoka.sendMessage(jid, { text: hasil.caption });
                    berhasil++;
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    gagal++;
                    console.error(`[HentaicopNotif] Gagal kirim test ke ${jid}:`, e?.message);
                }
            }
            await hisoka.sendMessage(m.from, {
                text: `✅ *Test Hentaicop Notif selesai!*\n\n📤 Terkirim ke: *${berhasil}/${daftarGrup.length} grup*` +
                      (gagal ? `\n❌ Gagal: ${gagal} grup` : ''),
            }, { quoted: m });
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, 'hentaicopnotif-test-grup');
        } catch (err) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal: ${err?.message || err}`);
        }
        return;
    }

    // ── TEST ke sini ──────────────────────────────────────────────────────────
    if (sub === 'test') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const hasil  = await simulasi();
            const imgBuf = hasil.urlGambar ? await downloadImageBuffer(hasil.urlGambar) : null;
            if (imgBuf) {
                await hisoka.sendMessage(m.from, { image: imgBuf, mimetype: 'image/jpeg', caption: hasil.caption }, { quoted: m });
            } else if (hasil.urlGambar) {
                await hisoka.sendMessage(m.from, { image: { url: buatProxyUrl(hasil.urlGambar) }, caption: hasil.caption }, { quoted: m });
            } else {
                await tolak(hisoka, m, hasil.caption);
            }
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, 'hentaicopnotif-test');
        } catch (err) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal: ${err?.message || err}`);
        }
        return;
    }

    await tolak(hisoka, m, `❌ Sub-perintah tidak dikenal.\nKetik *${pfx}hentaicopnotif* untuk bantuan.`);
}

// ── REPLY HANDLER ─────────────────────────────────────────────────────────────

async function handleHentaicopNotifReply({ hisoka, m, pendingHentaicopNotifChoices, getQuotedStanzaId, tolak, logCommand, loadConfig, fs: fsMod, path: pathMod }) {
    if (!pendingHentaicopNotifChoices || !pendingHentaicopNotifChoices.size) return false;
    if (!m.isOwner) return false;

    const quotedId  = getQuotedStanzaId(m);
    if (!quotedId) return false;

    const choiceKey = `${m.from}::${m.sender || m.key?.participant || ''}`;
    const pending   = pendingHentaicopNotifChoices.get(choiceKey);
    if (!pending || pending.botMsgId !== quotedId) return false;
    if (Date.now() > pending.expiresAt) { pendingHentaicopNotifChoices.delete(choiceKey); return false; }

    const teks  = (m.body || m.text || '').trim().toLowerCase();
    const match = teks.match(/^(add|del)\s+([\d,\s]+)$/i);
    if (!match) return false;

    const aksi  = match[1].toLowerCase();
    const nomor = [...new Set(
        match[2].split(/[,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1)
    )];
    if (!nomor.length) return false;

    const { gcList } = pending;
    const dipilih    = nomor.map(n => gcList[n - 1]).filter(Boolean);
    if (!dipilih.length) { await tolak(hisoka, m, `❌ Nomor tidak valid. Pilih antara 1–${gcList.length}.`); return true; }

    const cfgPath = pathMod.join(process.cwd(), 'config.json');
    const cfg     = loadConfig();
    if (!cfg.hentaicopnotif)        cfg.hentaicopnotif        = { groups: {}, categories: ['hentai', 'jav', '2d'] };
    if (!cfg.hentaicopnotif.groups) cfg.hentaicopnotif.groups = {};

    const namaList = [];
    for (const { jid, nama } of dipilih) {
        cfg.hentaicopnotif.groups[jid] = { enabled: aksi === 'add', diubahPada: Date.now() };
        namaList.push(nama);
    }
    fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    const ikon   = aksi === 'add' ? '✅' : '❌';
    const action = aksi === 'add' ? 'Diaktifkan' : 'Dinonaktifkan';
    let txt = `${ikon} *${action} (${dipilih.length} GC):*\n`;
    namaList.forEach((n, i) => { txt += `${i + 1}. ${n}\n`; });
    txt += `\n💡 Ketik *hentaicopnotif status* untuk cek ulang.`;

    await hisoka.sendMessage(m.from, { react: { text: ikon, key: m.key } });
    await tolak(hisoka, m, txt);
    logCommand(m, hisoka, `hentaicopnotif-${aksi}`);

    clearTimeout(pending.timeout);
    pendingHentaicopNotifChoices.delete(choiceKey);
    return true;
}

// ── BUTTON CALLBACK HANDLER ───────────────────────────────────────────────────

async function handleHentaicopnotifCallbacks({ hisoka, m, tolak, logCommand, Button, loadConfig, fs: fsMod, path: pathMod }) {
    if (!m.isOwner) return false;
    const txt = typeof m.text === 'string' ? m.text.trim() : '';
    const _VALID_CBS = [
        '__hcnotif_on__', '__hcnotif_off__', '__hcnotif_cancel__', '__hcnotif_list__',
        '__addallgrp__hentaicopnotif', '__delallgrp__hentaicopnotif',
        '__hcnotif_kat_menu__', '__hcnotif_back__',
        '__hcnotif_kat_hentai__', '__hcnotif_kat_jav__', '__hcnotif_kat_2d__',
    ];
    if (!_VALID_CBS.includes(txt)) return false;

    await _autoClean(hisoka, m);

    const pfx     = m.prefix || '.';
    const cfgPath = pathMod.join(process.cwd(), 'config.json');

    // ── BATALKAN ─────────────────────────────────────────────────────────────
    if (txt === '__hcnotif_cancel__') {
        await hisoka.sendMessage(m.from, { react: { text: '👋', key: m.key } });
        await tolak(hisoka, m, `ℹ️ Dibatalkan. Fitur hentaicop notif tidak diaktifkan di grup ini.`);
        return true;
    }

    // ── LIST GC AKTIF ─────────────────────────────────────────────────────────
    if (txt === '__hcnotif_list__') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const cfg      = loadConfig();
            const groups   = cfg?.hentaicopnotif?.groups || {};
            const totalReg = Object.keys(groups).length;

            const aktifJids = Object.entries(groups).filter(([, v]) => v?.enabled === true).map(([jid]) => jid);
            const nonJids   = Object.entries(groups).filter(([, v]) => v?.enabled === false).map(([jid]) => jid);

            if (!totalReg) {
                const _body =
                    `💜 *Hentaicop Notif — Daftar GC*\n${SEP}\n\n` +
                    `> _Belum ada GC yang terdaftar._\n\n` +
                    `• Masuk ke GC tujuan\n` +
                    `• Ketik *${pfx}hentaicopnotif* lalu pilih *✅ Ya, Aktifkan*`;
                const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif').addReply('🔄 Refresh', '__hcnotif_list__');
                await _runBtn(hisoka, m, _btn, _body, tolak);
                await hisoka.sendMessage(m.from, { react: { text: '📋', key: m.key } });
                return true;
            }

            let allGroupsMap = {};
            try {
                const raw = await hisoka.groupFetchAllParticipating();
                for (const [jid, meta] of Object.entries(raw || {}))
                    allGroupsMap[jid] = (meta.subject || '').trim().slice(0, 28) || jid.split('@')[0];
            } catch (_) {}
            const getNama = (jid) => allGroupsMap[jid] || jid.split('@')[0];

            const katAktif = (cfg?.hentaicopnotif?.categories || []).join(', ') || 'semua';
            let out = `💜 *Hentaicop Notif — Daftar GC*\n${SEP}\n\n`;
            out += `• *Total terdaftar :* ${totalReg} GC\n`;
            out += `• *Aktif           :* *${aktifJids.length} GC*\n`;
            if (nonJids.length) out += `• *Nonaktif        :* ~${nonJids.length} GC~\n`;
            out += `• *Kategori        :* _${katAktif}_\n\n`;

            if (aktifJids.length) {
                out += `✅ *GC Aktif* _(notif berjalan)_\n${SEP2}\n`;
                aktifJids.forEach((jid, i) => { out += `${i + 1}. *${getNama(jid)}*\n`; });
                out += `\n`;
            }
            if (nonJids.length) {
                out += `❌ *GC Nonaktif* _(notif dimatikan)_\n${SEP2}\n`;
                nonJids.forEach((jid, i) => { out += `${i + 1}. ~${getNama(jid)}~\n`; });
                out += `\n`;
            }
            out += `> _Diperbarui otomatis setiap tap Refresh._`;

            const gcEntry    = groups[m.from];
            const gcAktif    = gcEntry?.enabled === true;
            const gcNonAktif = gcEntry?.enabled === false;
            const gcBelum    = !gcEntry;

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

            const _btnList = new Button().setBody(out).setFooter('💜 Hentaicop Notif');
            if (gcAktif)                       _btnList.addReply('❌ Nonaktifkan GC Ini',  '__hcnotif_off__');
            if (gcNonAktif || gcBelum)         _btnList.addReply('✅ Aktifkan GC Ini',     '__hcnotif_on__');
            const _adaYgNon = nonJids.length > 0 || gcBelum || gcNonAktif;
            const _semuaOn  = aktifJids.length > 0 && !_adaYgNon;
            if (_adaYgNon)   _btnList.addReply('➕ Aktifkan Semua GC', '__addallgrp__hentaicopnotif');
            else if (_semuaOn) _btnList.addReply('❌ Matikan Semua GC', '__delallgrp__hentaicopnotif');
            _btnList.addReply('🔄 Refresh', '__hcnotif_list__');

            await _runBtn(hisoka, m, _btnList, out, tolak);
            logCommand(m, hisoka, 'hentaicopnotif-list-btn');
        } catch (e) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal: ${e.message}`);
        }
        return true;
    }

    // ── AKTIFKAN SEMUA GRUP ───────────────────────────────────────────────────
    if (txt === '__addallgrp__hentaicopnotif') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const allJids = Object.keys(await hisoka.groupFetchAllParticipating() || {});
            if (!allJids.length) { await tolak(hisoka, m, '❌ Bot tidak ada di grup manapun.'); return true; }
            const cfg = loadConfig();
            if (!cfg.hentaicopnotif)        cfg.hentaicopnotif        = { groups: {}, categories: ['hentai', 'jav', '2d'] };
            if (!cfg.hentaicopnotif.groups) cfg.hentaicopnotif.groups = {};
            for (const jid of allJids) cfg.hentaicopnotif.groups[jid] = { enabled: true, diubahPada: Date.now() };
            fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            const _body =
                `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                `│ ✅ *${allJids.length} grup berhasil diaktifkan!*\n│\n` +
                `│ Notif dari hentaicop.com akan masuk\n│ ke semua GC yang ada bot.\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif')
                .addReply('❌ Matikan Semua GC', '__delallgrp__hentaicopnotif')
                .addReply('📋 Lihat GC Aktif',   '__hcnotif_list__');
            await _runBtn(hisoka, m, _btn, _body, tolak);
            logCommand(m, hisoka, 'hentaicopnotif-addallgrp');
        } catch (e) { await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }); await tolak(hisoka, m, `❌ Gagal: ${e.message}`); }
        return true;
    }

    // ── NONAKTIFKAN SEMUA GRUP ────────────────────────────────────────────────
    if (txt === '__delallgrp__hentaicopnotif') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const allJids = Object.keys(await hisoka.groupFetchAllParticipating() || {});
            const cfg = loadConfig();
            if (!cfg.hentaicopnotif)        cfg.hentaicopnotif        = { groups: {}, categories: ['hentai', 'jav', '2d'] };
            if (!cfg.hentaicopnotif.groups) cfg.hentaicopnotif.groups = {};
            for (const jid of allJids) cfg.hentaicopnotif.groups[jid] = { enabled: false, diubahPada: Date.now() };
            fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            const _body =
                `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                `│ ❌ *${allJids.length} grup dinonaktifkan.*\n│\n` +
                `│ Notif tidak akan masuk ke GC manapun.\n│\n` +
                `│ Ketik *${pfx}hentaicopnotif on* di GC yang\n│ ingin diaktifkan kembali.\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif')
                .addReply('➕ Aktifkan Semua GC', '__addallgrp__hentaicopnotif')
                .addReply('📋 Lihat GC Aktif',    '__hcnotif_list__');
            await _runBtn(hisoka, m, _btn, _body, tolak);
            logCommand(m, hisoka, 'hentaicopnotif-delallgrp');
        } catch (e) { await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }); await tolak(hisoka, m, `❌ Gagal: ${e.message}`); }
        return true;
    }

    // ── KEMBALI ke layar ON/OFF ───────────────────────────────────────────────
    if (txt === '__hcnotif_back__') {
        try {
            const cfg      = loadConfig();
            const gcEntry  = cfg?.hentaicopnotif?.groups?.[m.from];
            const isActive = gcEntry?.enabled === true;
            const katAktif = cfg?.hentaicopnotif?.categories || ['hentai', 'jav', '2d'];
            await hisoka.sendMessage(m.from, { react: { text: '🔙', key: m.key } });
            const _body =
                `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                `│ Status   : ${isActive ? '✅ *AKTIF*' : '❌ *NONAKTIF*'}\n│\n` +
                `│ Kategori : ${_katInfoLine(katAktif)}\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
            _tambahBtnOnOff(_btn, isActive);
            await _runBtn(hisoka, m, _btn, _body, tolak);
            logCommand(m, hisoka, 'hentaicopnotif-back');
        } catch (e) { await tolak(hisoka, m, `❌ Gagal: ${e.message}`); }
        return true;
    }

    // ── MENU KATEGORI ─────────────────────────────────────────────────────────
    if (txt === '__hcnotif_kat_menu__') {
        try {
            const cfg      = loadConfig();
            const katAktif = cfg?.hentaicopnotif?.categories || ['hentai', 'jav', '2d'];
            await hisoka.sendMessage(m.from, { react: { text: '✏️', key: m.key } });
            const _body =
                `╭─「 💜 *HENTAICOP NOTIF — KATEGORI* 」\n│\n` +
                `│ Kategori aktif :\n│ ${_katInfoLine(katAktif)}\n│\n` +
                `│ Tap tombol untuk aktifkan / matikan.\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
            _tambahBtnKat(_btn, katAktif);
            await _runBtn(hisoka, m, _btn, _body, tolak);
            logCommand(m, hisoka, 'hentaicopnotif-kat-menu');
        } catch (e) { await tolak(hisoka, m, `❌ Gagal: ${e.message}`); }
        return true;
    }

    // ── TOGGLE KATEGORI ───────────────────────────────────────────────────────
    const _katSlugMap = {
        '__hcnotif_kat_hentai__': 'hentai',
        '__hcnotif_kat_jav__'   : 'jav',
        '__hcnotif_kat_2d__'    : '2d',
    };
    if (txt in _katSlugMap) {
        const slug = _katSlugMap[txt];
        try {
            const cfg = loadConfig();
            if (!cfg.hentaicopnotif)            cfg.hentaicopnotif            = { groups: {}, categories: ['hentai', 'jav', '2d'] };
            if (!cfg.hentaicopnotif.categories) cfg.hentaicopnotif.categories = ['hentai', 'jav', '2d'];
            const katAktif  = [...cfg.hentaicopnotif.categories];
            const idx       = katAktif.indexOf(slug);
            const diaktifkan = idx === -1;
            if (diaktifkan) katAktif.push(slug);
            else            katAktif.splice(idx, 1);
            // Urutan baku: hentai → jav → 2d
            cfg.hentaicopnotif.categories = ['hentai', 'jav', '2d'].filter(s => katAktif.includes(s));
            fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

            const meta     = _KAT_META[slug];
            const aktifStr = cfg.hentaicopnotif.categories.map(s => _KAT_META[s]?.emoji + ' ' + (_KAT_META[s]?.nama || s)).join(', ') || 'tidak ada';
            await hisoka.sendMessage(m.from, { react: { text: diaktifkan ? '✅' : '❌', key: m.key } });

            const _body =
                `╭─「 💜 *HENTAICOP NOTIF — KATEGORI* 」\n│\n` +
                `│ ${meta.emoji} *${meta.nama}* : ${diaktifkan ? '✅ Diaktifkan' : '❌ Dinonaktifkan'}\n│\n` +
                `│ Kategori aktif :\n│ _${aktifStr || 'tidak ada'}_\n│\n` +
                `│ Tap tombol untuk toggle kategori lainnya.\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
            _tambahBtnKat(_btn, cfg.hentaicopnotif.categories);
            await _runBtn(hisoka, m, _btn, _body, tolak);
            logCommand(m, hisoka, `hentaicopnotif-kat-${slug}-${diaktifkan ? 'on' : 'off'}`);
        } catch (e) { await tolak(hisoka, m, `❌ Gagal toggle kategori: ${e.message}`); }
        return true;
    }

    // ── AKTIFKAN / NONAKTIFKAN GC INI ─────────────────────────────────────────
    if (!m.isGroup) { await tolak(hisoka, m, '❌ Hanya bisa digunakan di dalam grup.'); return true; }

    const enabled = txt === '__hcnotif_on__';
    try {
        const cfg = loadConfig();
        if (!cfg.hentaicopnotif)        cfg.hentaicopnotif        = { groups: {}, categories: ['hentai', 'jav', '2d'] };
        if (!cfg.hentaicopnotif.groups) cfg.hentaicopnotif.groups = {};
        cfg.hentaicopnotif.groups[m.from] = { enabled, diubahPada: Date.now() };
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        await hisoka.sendMessage(m.from, { react: { text: enabled ? '✅' : '❌', key: m.key } });

        const katAktif = loadConfig()?.hentaicopnotif?.categories || ['hentai', 'jav', '2d'];
        if (enabled) {
            const _body =
                `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                `│ Status   : ✅ *BERHASIL DIAKTIFKAN!*\n│\n` +
                `│ Notif dari hentaicop.com akan\n│ otomatis masuk ke grup ini. 💜\n│\n` +
                `│ Kategori : ${_katInfoLine(katAktif)}\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
            _tambahBtnOnOff(_btn, true);
            await _runBtn(hisoka, m, _btn, _body, tolak);
        } else {
            const _body =
                `╭─「 💜 *HENTAICOP NOTIF* 」\n│\n` +
                `│ Status   : ❌ *DINONAKTIFKAN*\n│\n` +
                `│ Notif hentaicop tidak akan masuk ke\n│ grup ini lagi.\n│\n` +
                `╰──────────────────────`;
            const _btn = new Button().setBody(_body).setFooter('💜 Hentaicop Notif');
            _tambahBtnOnOff(_btn, false);
            await _runBtn(hisoka, m, _btn, _body, tolak);
        }
        logCommand(m, hisoka, enabled ? 'hentaicopnotif-on-btn' : 'hentaicopnotif-off-btn');
    } catch (e) { await tolak(hisoka, m, `❌ Gagal: ${e.message}`); }
    return true;
}

module.exports.handleHentaicopnotif          = handleHentaicopnotif;
module.exports.handleHentaicopNotifReply     = handleHentaicopNotifReply;
module.exports.handleHentaicopnotifCallbacks = handleHentaicopnotifCallbacks;
