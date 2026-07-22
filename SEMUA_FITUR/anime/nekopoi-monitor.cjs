/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  nekopoi-monitor.cjs — Monitor NekoPoi.care
 *  Cek update realtime dari 3 kategori:
 *  Hentai · 2D Animation · 3D Hentai
 *  Kirim notif otomatis ke grup yang terdaftar.
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const path  = require('path');
const fs    = require('fs');

const DIR_DATA    = path.join(process.cwd(), 'data', 'nekopoinotif');
const FILE_DATA   = path.join(DIR_DATA, 'state.json');
const FILE_LOG    = path.join(DIR_DATA, 'log.json');
const FILE_CONFIG = path.join(process.cwd(), 'config.json');
fs.mkdirSync(DIR_DATA, { recursive: true });

// Berapa lama (ms) post gagal-fetch dicoba ulang sebelum diabaikan
const RETRY_TTL_MS   = 30 * 60 * 1000;  // 30 menit
// Jangkauan awal saat belum ada lastCheckTime
const INIT_WINDOW_MS = 30 * 60 * 1000;  // 30 menit

const SEP  = '━━━━━━━━━━━━━━━━━━';
const SEP2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
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
    const groups = cfg?.nekopoinotif?.groups || {};
    return Object.entries(groups)
        .filter(([, v]) => v?.enabled === true)
        .map(([jid]) => jid);
}

function setGroupEnabled(jid, enabled) {
    const cfg = bacaConfig();
    if (!cfg.nekopoinotif)        cfg.nekopoinotif        = { groups: {}, categories: ['hentai', '2d-animation', '3d-hentai'] };
    if (!cfg.nekopoinotif.groups) cfg.nekopoinotif.groups = {};
    cfg.nekopoinotif.groups[jid] = { enabled, diubahPada: Date.now() };
    simpanConfig(cfg);
}

function getActiveCategories() {
    const cfg = bacaConfig();
    return cfg?.nekopoinotif?.categories || ['hentai', '2d-animation', '3d-hentai'];
}

// ── DEDUP ─────────────────────────────────────────────────────────────────────

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
        console.warn('[NekopoinNotif] Gagal simpan log:', e?.message);
    }
}

function getRecentLog(jumlah = 20) {
    return (bacaLog().terkirim || []).slice(0, jumlah);
}

// ── BUAT ID UNIK ──────────────────────────────────────────────────────────────

function buatId(url) {
    return (url || '').replace(/^https?:\/\/nekopoi\.care\//, '').replace(/\/+$/, '');
}

// ── CARI KONTEN BARU ──────────────────────────────────────────────────────────

async function cariKontenBaru() {
    const { getCategoryPosts, getDetailNekopoi } = require('./nekopoi.cjs');

    const now        = Date.now();
    const data       = bacaData();
    const isFirstRun = !data.lastCheckTime;

    data.lastCheckTime = now;
    if (!data.idTerkirim) data.idTerkirim = [];
    if (!data.idGagal)    data.idGagal    = [];
    simpanData(data);

    const kategoriAktif = getActiveCategories();
    const semuaPost     = [];
    const seenUrl       = new Set();

    // ── Fetch semua kategori aktif secara paralel ──────────────────────────────
    const fetchResults = await Promise.allSettled(
        kategoriAktif.map(async (slug) => {
            try {
                const posts = await getCategoryPosts(slug);
                return posts;
            } catch (e) {
                console.error(`[NekopoinNotif] ❌ Gagal fetch kategori ${slug}:`, e?.message);
                return [];
            }
        })
    );

    for (const result of fetchResults) {
        if (result.status !== 'fulfilled') continue;
        for (const post of (result.value || [])) {
            if (!post.url || seenUrl.has(post.url)) continue;
            seenUrl.add(post.url);
            semuaPost.push(post);
        }
    }

    // ── First run — tandai semua sebagai seen ─────────────────────────────────
    if (isFirstRun) {
        console.log(`[NekopoinNotif] 🚀 First run — tandai ${semuaPost.length} post sebagai seen`);
        const df = bacaData();
        for (const post of semuaPost) {
            const id = buatId(post.url);
            if (!df.idTerkirim.includes(String(id))) df.idTerkirim.unshift(String(id));
        }
        simpanData(df);
        return [];
    }

    // ── Retry gagal sebelumnya ────────────────────────────────────────────────
    const baru        = [];
    const idGagalBaru = [];

    for (const gagal of (data.idGagal || [])) {
        if (sudahDikirim(gagal.id)) continue;
        const usiaGagal = now - new Date(gagal.pertamaGagal || now).getTime();
        if (usiaGagal > RETRY_TTL_MS) {
            console.log(`[NekopoinNotif] ⏭️ Retry timeout: "${gagal.title}" diabaikan`);
            tandaiSudahKirim(gagal.id);
            continue;
        }
        try {
            const detail = await getDetailNekopoi(gagal.url);
            baru.push({
                id      : gagal.id,
                url     : gagal.url,
                title   : detail.title || gagal.title,
                kategori: detail.kategori || gagal.kategori || 'hentai',
                ...detail,
            });
            console.log(`[NekopoinNotif] 🔄 Retry berhasil: "${gagal.title}"`);
        } catch (e) {
            console.warn(`[NekopoinNotif] 🔄 Retry masih gagal "${gagal.title}":`, e?.message);
            idGagalBaru.push(gagal);
        }
    }

    // ── Cek post baru ─────────────────────────────────────────────────────────
    for (const post of semuaPost) {
        const id = buatId(post.url);
        if (sudahDikirim(id)) continue;

        try {
            const detail = await getDetailNekopoi(post.url);
            baru.push({
                id,
                url     : post.url,
                title   : detail.title || post.title,
                kategori: detail.kategori || post.kategori || 'hentai',
                ...detail,
            });
        } catch (e) {
            console.warn(`[NekopoinNotif] ❌ Gagal fetch detail "${post.title}":`, e?.message);
            idGagalBaru.push({
                id,
                url         : post.url,
                title       : post.title,
                kategori    : post.kategori || 'hentai',
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
// slug: 'hentai' | '2d-animation' | '3d-hentai' (default: 'hentai')
async function simulasi(slug) {
    const { getCategoryPosts, getDetailNekopoi } = require('./nekopoi.cjs');

    const katSlug = slug || 'hentai';
    const posts   = await getCategoryPosts(katSlug);
    if (!posts.length) throw new Error(`Tidak ada post dari nekopoi.care/category/${katSlug}/`);

    const post   = posts[0];
    const id     = buatId(post.url);
    const detail = await getDetailNekopoi(post.url);

    const item      = { id, url: post.url, title: detail.title || post.title, kategori: detail.kategori || katSlug, ...detail };
    const caption   = buatCaption(item);
    const urlGambar = item.thumbnail || null;
    return { caption, urlGambar, item };
}

// ── FORMAT CAPTION ────────────────────────────────────────────────────────────

const KATEGORI_INFO = {
    'hentai'      : { emoji: '🎌', label: 'Hentai',       header: '🎌 *HENTAI BARU — NEKOPOI!*' },
    '2d-animation': { emoji: '🎥', label: '2D Animation',  header: '🎥 *2D ANIMATION BARU — NEKOPOI!*' },
    '3d-hentai'   : { emoji: '🧊', label: '3D Hentai',     header: '🧊 *3D HENTAI BARU — NEKOPOI!*' },
};

function getKatInfo(kategori) {
    return KATEGORI_INFO[kategori] || KATEGORI_INFO['hentai'];
}

function waktuSekarang() {
    const sekarang   = new Date();
    const opsiHari   = { timeZone: 'Asia/Jakarta', weekday: 'long' };
    const opsiTgl    = { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' };
    const opsiJam    = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
    const namaHari   = sekarang.toLocaleDateString('id-ID', opsiHari);
    const tglLengkap = sekarang.toLocaleDateString('id-ID', opsiTgl);
    const jamMenit   = sekarang.toLocaleTimeString('id-ID', opsiJam).replace('.', ':');
    return `${namaHari}, ${tglLengkap} · ${jamMenit} WIB`;
}

function potongTeks(teks, maks = 400) {
    const t = (teks || '').trim();
    if (!t || t === '-') return '-';
    if (t.length <= maks) return t;
    return t.slice(0, maks).trimEnd() + '…';
}

function buatBarisInfo(items) {
    const valid = items.filter(([, v]) => v && v !== '' && v !== '-');
    return valid.map(([label, val], i) => {
        const prefix = i === valid.length - 1 ? '╰' : '├';
        return `${prefix} ${label}: ${val}`;
    }).join('\n');
}

function buatCaption(data) {
    const {
        title, kategori, tanggal, sinopsis,
        genre, producers, durasi, ukuran, status,
        episode, tayang, judulJp, url,
        downloads = [],
        originalTitle = '', parody = '',
    } = data;

    const katInfo     = getKatInfo(kategori);
    const headerWaktu = waktuSekarang();

    // Sinopsis — untuk konten 2D/3D yang tidak punya sinopsis,
    // pakai kombinasi Original Title + Parody sebagai gantinya
    let sinOpsi = sinopsis || '';
    if (!sinOpsi) {
        const bagian = [];
        if (originalTitle && originalTitle !== '-') bagian.push(`Original: *${originalTitle}*`);
        if (parody && parody !== '-')               bagian.push(`Parody: *${parody}*`);
        sinOpsi = bagian.join('\n') || '';
    }
    const sinopsisBlok = sinOpsi
        ? potongTeks(sinOpsi, 350).split('\n').map(b => b.trim() ? `> ${b}` : '').join('\n')
        : null; // null = sembunyikan blok sinopsis jika benar-benar kosong

    // Info blok
    const infoBlok = buatBarisInfo([
        ['🗂️ Kategori', katInfo.label],
        ['🇯🇵 Judul JP', judulJp   || null],
        ['🎬 Anime   ', (!judulJp && data.anime && data.anime !== title) ? data.anime : null],
        ['🏢 Produser', producers  || null],
        ['📡 Status  ', status     || null],
        ['📺 Episode ', episode    || null],
        ['🗓️ Tayang  ', tayang     || null],
        ['⏱️ Durasi  ', durasi     || null],
        ['🎭 Genre   ', genre      || null],
        ['💾 Ukuran  ', ukuran     || null],
    ]);

    // Download blok — tampilkan per resolusi dengan semua host
    let dlBlok = '';
    if (downloads && downloads.length) {
        dlBlok  = `${SEP}\n`;
        dlBlok += `📥 *DOWNLOAD*\n`;
        dlBlok += `${SEP2}\n`;
        downloads.forEach((dl, i) => {
            const isLast  = i === downloads.length - 1;
            const prefix  = isLast ? '╰' : '├';
            const hostStr = dl.links
                .slice(0, 4)
                .map(h => `[${h.host}](${h.url})`)
                .join('  ');
            dlBlok += `${prefix} *${dl.resolusi}* → ${hostStr}\n`;
        });
        dlBlok = dlBlok.trimEnd();
    }

    // Streaming blok — konstruksi dari URL post
    const streamBlok = url
        ? `▶️ *Streaming* : [Server 1](${url}#nk-stream-1)  [Server 2](${url}#nk-stream-2)  [Server 3](${url}#nk-stream-3)`
        : null;

    const baris = [
        katInfo.header,
        SEP,
        `📅 _${headerWaktu}_`,
        SEP,
        ``,
        `*${title || '-'}*`,
        ``,
        sinopsisBlok ? `📖 *Sinopsis*` : null,
        sinopsisBlok || null,
        sinopsisBlok ? `` : null,
        SEP,
        `📋 *Info*`,
        SEP2,
        infoBlok || '-',
        dlBlok     ? dlBlok     : null,
        `${SEP}`,
        streamBlok ? streamBlok : null,
        `🔗 *Post*    : ${url}`,
        `🌐 *Source*  : nekopoi.care`,
    ];

    return baris.filter(b => b !== null && b !== undefined).join('\n');
}

// ── IMAGE HELPER ──────────────────────────────────────────────────────────────

// Cache strategi per domain: 'direct' | 'proxy'
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
            headers: {
                ...HEADERS,
                Referer: `https://${domain}/`,
                Origin : `https://${domain}`,
            },
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

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleNekopoinotif({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs: fsMod, path: pathMod, loadConfig, pendingNekpoiNotifChoices }) {
    if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner yang bisa gunakan perintah ini.'); return; }

    const cfgPath = pathMod.join(process.cwd(), 'config.json');
    const sub     = (query || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const pfx     = m.prefix || '.';
    const cfg     = loadConfig();

    if (!cfg.nekopoinotif)           cfg.nekopoinotif           = { groups: {}, categories: ['hentai', '2d-animation', '3d-hentai'] };
    if (!cfg.nekopoinotif.groups)    cfg.nekopoinotif.groups    = {};
    if (!cfg.nekopoinotif.categories) cfg.nekopoinotif.categories = ['hentai', '2d-animation', '3d-hentai'];

    // ── HELP ──────────────────────────────────────────────────────────────────
    if (!sub || sub === 'help') {
        const aktifDiSini = m.isGroup
            ? (cfg.nekopoinotif.groups[m.from]?.enabled === true ? '✅ Aktif' : '❌ Nonaktif')
            : '-';
        const katAktif = (cfg.nekopoinotif.categories || []).join(', ') || 'semua';
        await tolak(hisoka, m,
            `╭─「 🎌 *NEKOPOI NOTIF* 」\n` +
            `│\n` +
            (m.isGroup ? `│ Status grup ini  : *${aktifDiSini}*\n│\n` : '') +
            `│ Kategori aktif   : _${katAktif}_\n│\n` +
            `│ *Perintah:*\n` +
            `│ • ${pfx}nekopoinotif on — aktifkan GC ini\n` +
            `│ • ${pfx}nekopoinotif off — nonaktifkan GC ini\n` +
            `│ • ${pfx}nekopoinotif status — list semua GC\n` +
            `│   ↳ Reply status: *add 1,2* — aktifkan\n` +
            `│   ↳ Reply status: *del 1,2* — nonaktifkan\n` +
            `│ • ${pfx}nekopoinotif test — test ke sini\n` +
            `│ • ${pfx}nekopoinotif test grup — test ke semua GC aktif\n` +
            `│ • ${pfx}nekopoinotif kategori — lihat/atur kategori\n` +
            `│\n` +
            `│ 💡 Bot kirim notif otomatis saat:\n` +
            `│    🎌 Hentai · 🎥 2D Animation · 🧊 3D Hentai\n` +
            `│ ⏱️ Realtime · cek tiap 2 menit\n` +
            `╰──────────────────────`
        );
        return;
    }

    // ── ON ────────────────────────────────────────────────────────────────────
    if (sub === 'on') {
        if (!m.isGroup) { await tolak(hisoka, m, '❌ Perintah ini hanya untuk grup.'); return; }
        const sebelumnya = cfg.nekopoinotif.groups[m.from]?.enabled === true;
        cfg.nekopoinotif.groups[m.from] = { enabled: true, diubahPada: Date.now() };
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        await sendConfirmWithButtons(hisoka, m,
            `╭─「 🎌 *NEKOPOI NOTIF* 」\n│\n` +
            `│ Status sebelumnya : ${sebelumnya ? '✅ ON' : '❌ OFF'}\n` +
            `│ Status sekarang   : ✅ *ON*\n│\n` +
            (sebelumnya
                ? `│ ℹ️ Sudah aktif sebelumnya.\n`
                : `│ ✅ Berhasil diaktifkan!\n│    Notif otomatis akan masuk ke GC ini.\n`) +
            `│\n│ Ketik *${pfx}nekopoinotif off* untuk nonaktifkan.\n` +
            `╰──────────────────────`,
            [{ text: '➕ Aktifkan Semua Grup', id: '__addallgrp__nekopoinotif' }]
        );
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'nekopoinotif-on');
        return;
    }

    // ── OFF ───────────────────────────────────────────────────────────────────
    if (sub === 'off') {
        if (!m.isGroup) { await tolak(hisoka, m, '❌ Perintah ini hanya untuk grup.'); return; }
        const sebelumnya = cfg.nekopoinotif.groups[m.from]?.enabled === true;
        cfg.nekopoinotif.groups[m.from] = { enabled: false, diubahPada: Date.now() };
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        await tolak(hisoka, m,
            `╭─「 🎌 *NEKOPOI NOTIF* 」\n│\n` +
            `│ Status sebelumnya : ${sebelumnya ? '✅ ON' : '❌ OFF'}\n` +
            `│ Status sekarang   : ❌ *OFF*\n│\n` +
            (sebelumnya ? `│ ❌ Berhasil dinonaktifkan.\n` : `│ ℹ️ Sudah nonaktif sebelumnya.\n`) +
            `│\n│ Ketik *${pfx}nekopoinotif on* untuk aktifkan.\n` +
            `╰──────────────────────`
        );
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'nekopoinotif-off');
        return;
    }

    // ── KATEGORI ─────────────────────────────────────────────────────────────
    if (sub === 'kategori' || sub.startsWith('kategori ')) {
        const arg = sub.replace(/^kategori\s*/, '').trim();
        if (!arg) {
            const katAktif = (cfg.nekopoinotif.categories || []);
            await tolak(hisoka, m,
                `╭─「 🎌 *NEKOPOI KATEGORI* 」\n│\n` +
                `│ Aktif: *${katAktif.join(', ') || 'tidak ada'}*\n│\n` +
                `│ Tersedia:\n` +
                `│ • hentai\n` +
                `│ • 2d-animation\n` +
                `│ • 3d-hentai\n│\n` +
                `│ Contoh:\n` +
                `│ *${pfx}nekopoinotif kategori hentai 2d-animation*\n` +
                `│ → set kategori yang dimonitor\n` +
                `╰──────────────────────`
            );
            return;
        }
        const valid    = ['hentai', '2d-animation', '3d-hentai'];
        const dipilih  = arg.split(/[\s,]+/).map(s => s.trim()).filter(s => valid.includes(s));
        if (!dipilih.length) {
            await tolak(hisoka, m, `❌ Kategori tidak valid.\nPilih dari: ${valid.join(', ')}`);
            return;
        }
        cfg.nekopoinotif.categories = dipilih;
        fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
        await tolak(hisoka, m,
            `✅ Kategori diperbarui!\nAktif: *${dipilih.join(', ')}*`
        );
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'nekopoinotif-kategori');
        return;
    }

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const allGroupsRaw = await hisoka.groupFetchAllParticipating();
            const allGroups    = Object.values(allGroupsRaw || {})
                .sort((a, b) => (a.subject || '').localeCompare(b.subject || '', 'id'));

            const cfgSt     = loadConfig();
            const registered = cfgSt?.nekopoinotif?.groups || {};
            const totalAktif = Object.values(registered).filter(v => v?.enabled === true).length;
            const totalNon   = Object.values(registered).filter(v => v?.enabled === false).length;

            let txt = `╭─「 📋 *STATUS NEKOPOI NOTIF* 」\n│\n`;
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
                const noStr = String(no).padStart(2, ' ');
                txt += `│ ${noStr}. ${ikon} ${nama}\n`;
            });

            txt += `│\n│ 📌 *Reply pesan ini:*\n`;
            txt += `│ • *add 1,2,3* — aktifkan GC nomor tsb\n`;
            txt += `│ • *del 2,4* — nonaktifkan GC nomor tsb\n`;
            txt += `│ ⏳ Menu berlaku *5 menit*\n╰──────────────────────`;

            const statusMsg = await hisoka.sendMessage(m.from, { text: txt }, { quoted: m });
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

            if (pendingNekpoiNotifChoices) {
                const choiceKey = `${m.from}::${m.sender || m.key?.participant || ''}`;
                const old = pendingNekpoiNotifChoices.get(choiceKey);
                if (old?.timeout) clearTimeout(old.timeout);
                const t = setTimeout(() => pendingNekpoiNotifChoices.delete(choiceKey), 5 * 60 * 1000);
                pendingNekpoiNotifChoices.set(choiceKey, {
                    gcList,
                    botMsgId : statusMsg?.key?.id || '',
                    expiresAt: Date.now() + 5 * 60 * 1000,
                    timeout  : t,
                });
            }
            logCommand(m, hisoka, 'nekopoinotif-status');
        } catch (err) {
            console.error('[NekopoinNotif] status error:', err?.message);
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal ambil list grup: ${err?.message || err}`);
        }
        return;
    }

    // ── TEST per kategori (test hentai / test 2d / test 3d) ──────────────────
    if (/^test\s+(hentai|2d|3d|2d-animation|3d-hentai)$/.test(sub)) {
        const katArg = sub.split(/\s+/)[1];
        const katSlug = katArg === '2d' ? '2d-animation' : katArg === '3d' ? '3d-hentai' : 'hentai';
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        try {
            const hasil = await simulasi(katSlug);
            const imgBuf = hasil.urlGambar ? await downloadImageBuffer(hasil.urlGambar) : null;
            if (imgBuf) {
                await hisoka.sendMessage(m.from, { image: imgBuf, mimetype: 'image/jpeg', caption: hasil.caption }, { quoted: m });
            } else if (hasil.urlGambar) {
                await hisoka.sendMessage(m.from, { image: { url: buatProxyUrl(hasil.urlGambar) }, caption: hasil.caption }, { quoted: m });
            } else {
                await tolak(hisoka, m, hasil.caption);
            }
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, `nekopoinotif-test-${katSlug}`);
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
                await tolak(hisoka, m, `❌ Belum ada GC aktif.\nKetik *${pfx}nekopoinotif on* di GC tujuan.`);
                return;
            }
            const hasil = await simulasi();
            let berhasil = 0, gagal = 0;
            for (const jid of daftarGrup) {
                try {
                    const imgBuf    = hasil.urlGambar ? await downloadImageBuffer(hasil.urlGambar) : null;
                    const proxyUrl  = hasil.urlGambar ? buatProxyUrl(hasil.urlGambar) : null;
                    if (imgBuf) {
                        await hisoka.sendMessage(jid, { image: imgBuf, mimetype: 'image/jpeg', caption: hasil.caption });
                    } else if (proxyUrl) {
                        await hisoka.sendMessage(jid, { image: { url: proxyUrl }, caption: hasil.caption });
                    } else {
                        await hisoka.sendMessage(jid, { text: hasil.caption });
                    }
                    berhasil++;
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    gagal++;
                    console.error(`[NekopoinNotif] Gagal kirim test ke ${jid}:`, e?.message);
                }
            }
            await hisoka.sendMessage(m.from, {
                text: `✅ *Test NekoPoi Notif selesai!*\n\n📤 Terkirim ke: *${berhasil}/${daftarGrup.length} grup*` +
                      (gagal ? `\n❌ Gagal: ${gagal} grup` : ''),
            }, { quoted: m });
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, 'nekopoinotif-test-grup');
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
                const proxyUrl = buatProxyUrl(hasil.urlGambar);
                await hisoka.sendMessage(m.from, { image: { url: proxyUrl }, caption: hasil.caption }, { quoted: m });
            } else {
                await tolak(hisoka, m, hasil.caption);
            }
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, 'nekopoinotif-test');
        } catch (err) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, `❌ Gagal: ${err?.message || err}`);
        }
        return;
    }

    await tolak(hisoka, m, `❌ Sub-perintah tidak dikenal.\nKetik *${pfx}nekopoinotif* untuk bantuan.`);
}

// ── REPLY HANDLER ─────────────────────────────────────────────────────────────

async function handleNekpoiNotifReply({ hisoka, m, pendingNekpoiNotifChoices, getQuotedStanzaId, tolak, logCommand, loadConfig, fs: fsMod, path: pathMod }) {
    if (!pendingNekpoiNotifChoices || !pendingNekpoiNotifChoices.size) return false;
    if (!m.isOwner) return false;

    const quotedId  = getQuotedStanzaId(m);
    if (!quotedId) return false;

    const choiceKey = `${m.from}::${m.sender || m.key?.participant || ''}`;
    const pending   = pendingNekpoiNotifChoices.get(choiceKey);
    if (!pending || pending.botMsgId !== quotedId) return false;
    if (Date.now() > pending.expiresAt) {
        pendingNekpoiNotifChoices.delete(choiceKey);
        return false;
    }

    const teks  = (m.body || m.text || '').trim().toLowerCase();
    const match = teks.match(/^(add|del)\s+([\d,\s]+)$/i);
    if (!match) return false;

    const aksi    = match[1].toLowerCase();
    const nomor   = [...new Set(
        match[2].split(/[,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1)
    )];
    if (!nomor.length) return false;

    const { gcList } = pending;
    const dipilih    = nomor.map(n => gcList[n - 1]).filter(Boolean);
    if (!dipilih.length) {
        await tolak(hisoka, m, `❌ Nomor tidak valid. Pilih antara 1–${gcList.length}.`);
        return true;
    }

    const cfgPath = pathMod.join(process.cwd(), 'config.json');
    const cfg     = loadConfig();
    if (!cfg.nekopoinotif)        cfg.nekopoinotif        = { groups: {}, categories: ['hentai', '2d-animation', '3d-hentai'] };
    if (!cfg.nekopoinotif.groups) cfg.nekopoinotif.groups = {};

    const namaList = [];
    for (const { jid, nama } of dipilih) {
        cfg.nekopoinotif.groups[jid] = { enabled: aksi === 'add', diubahPada: Date.now() };
        namaList.push(nama);
    }
    fsMod.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

    const ikon   = aksi === 'add' ? '✅' : '❌';
    const action = aksi === 'add' ? 'Diaktifkan' : 'Dinonaktifkan';

    let txt = `${ikon} *${action} (${dipilih.length} GC):*\n`;
    namaList.forEach((n, i) => { txt += `${i + 1}. ${n}\n`; });
    txt += `\n💡 Ketik *nekopoinotif status* untuk cek ulang.`;

    await hisoka.sendMessage(m.from, { react: { text: ikon, key: m.key } });
    await tolak(hisoka, m, txt);
    logCommand(m, hisoka, `nekopoinotif-${aksi}`);

    clearTimeout(pending.timeout);
    pendingNekpoiNotifChoices.delete(choiceKey);
    return true;
}

module.exports.handleNekopoinotif    = handleNekopoinotif;
module.exports.handleNekpoiNotifReply = handleNekpoiNotifReply;
