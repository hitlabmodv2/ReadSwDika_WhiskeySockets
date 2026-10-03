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
 *  waifu.cjs — Anime Image Scraper (.waifu)
 *  Ambil gambar dari waifu.im via endpoint /images.
 *  Alur: pilih mode → pilih karakter → gambar + [Next] [Back].
 *  Preferensi mode tersimpan di config.json per user.
 * ───────────────────────────────
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const _TTL        = 5 * 60 * 1000;  // 5 menit sesi aktif
const _PFX_MODE        = 'waifu_mode_';   // waifu_mode_safe | waifu_mode_nsfw
const _PFX_CHAR        = 'waifu_char_';   // waifu_char_0 … waifu_char_N
const _PFX_NEXT        = 'waifu_next_';   // waifu_next_{idx}_{mode}
const _PFX_BACK        = 'waifu_back_';   // waifu_back_{mode}
const _PFX_SWITCH      = 'waifu_switch_'; // waifu_switch_{newmode} — ganti mode
const _PFX_RETRY       = 'waifu_retry_';  // waifu_retry_{idx}_{mode} — coba lagi setelah error
const _PFX_SEARCH_NEXT = 'waifu_srch_';  // waifu_srch_{mode}_{keyword+encoded} — search lagi
const CONFIG_PATH = path.join(process.cwd(), 'config.json');

// ── Tag list dari waifu.im API v6 ──────────────────────────────────────────────
// Safe tags
const SAFE_TAGS = [
    { label: '🎲 Random Safe',     slug: '',                   count: 4278 },
    { label: '🧕 Waifu',           slug: 'waifu',              count: 4278 },
    { label: '👗 Maid',            slug: 'maid',               count: 273  },
    { label: '🎌 Genshin Impact',  slug: 'genshin-impact',     count: 84   },
    { label: '⚔️ Raiden Shogun',   slug: 'raiden-shogun',      count: 69   },
    { label: '🎀 Marin Kitagawa',  slug: 'marin-kitagawa',     count: 47   },
    { label: '💀 Mori Calliope',   slug: 'mori-calliope',      count: 26   },
    { label: '❄️ Kamisato Ayaka',  slug: 'kamisato-ayaka',     count: 14   },
    { label: '💙 Rem',             slug: 'rem',                count: 12   },
    { label: '🍊 Nami',            slug: 'nami',               count: 1    },
];

// NSFW tags
const NSFW_TAGS = [
    { label: '🎲 Random NSFW',     slug: '',                   count: 4200 },
    { label: '🔞 Ero',             slug: 'ero',                count: 3014 },
    { label: '📚 Ecchi',           slug: 'ecchi',              count: 2138 },
    { label: '🍈 Oppai',           slug: 'oppai',              count: 1084 },
    { label: '🔥 Hentai',          slug: 'hentai',             count: 883  },
    { label: '👩 MILF',            slug: 'milf',              count: 468  },
    { label: '👕 Uniform',         slug: 'uniform',            count: 448  },
    { label: '🍑 Ass',             slug: 'ass',                count: 414  },
    { label: '👗 Maid 18+',        slug: 'maid',               count: 273  },
    { label: '🤳 Selfies',         slug: 'selfies',            count: 181  },
    { label: '💦 Paizuri',         slug: 'paizuri',            count: 146  },
    { label: '👄 Oral',            slug: 'oral',               count: 145  },
];

const WAIFU_API_BASE = 'https://api.waifu.im/images';

// ── Update fetcher ke endpoint resmi waifu.im
async function _fetchWaifu(tags, isNsfw) {
    let url = `${WAIFU_API_BASE}?isNsfw=${isNsfw ? 'true' : 'false'}&limit=1`;
    if (tags) {
        url += `&included_tags=${encodeURIComponent(tags)}`;
    }
    const data = await _httpGetJson(url);
    if (!data?.items?.length) throw new Error('Tidak ada gambar ditemukan di waifu.im');
    return _normalizeWaifuIm(data.items[0]);
}

// ── Normalize data dari waifu.im API v6
function _normalizeWaifuIm(item) {
    const ext = item.extension || '.jpg';
    return {
        url:        item.url,
        extension:  ext,
        is_nsfw:    item.isNsfw,
        artists:    item.artists?.map(a => a.name) || [],
        source:     item.source,
        tags:       item.tags || [],
        width:      item.width,
        height:     item.height,
        score:      0, // waifu.im API tidak kirim score
        uploadedAt: item.uploadedAt ? item.uploadedAt.split('T')[0] : null,
        postId:     item.id,
        owner:      null,
        rating:     item.isNsfw ? 'explicit' : 'safe',
    };
}

function _httpGetJson(url) {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept':          'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection':      'keep-alive',
        };

        const req = https.get(url, { headers }, (res) => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    const err = new Error(`HTTP ${res.statusCode}`);
                    err.statusCode = res.statusCode;
                    return reject(err);
                }
                try { resolve(JSON.parse(raw)); } catch (_) { reject(new Error('JSON parse error')); }
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function _downloadBuffer(url) {
    const http = require('http');
    const transport = url.startsWith('http://') ? http : https;

    return new Promise((resolve, reject) => {
        const req = transport.get(url, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept':          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return _downloadBuffer(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`Download HTTP ${res.statusCode}`));
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(20000, () => { req.destroy(); reject(new Error('Download timeout')); });
    });
}


// ── Helper: build gelbooru-style params ────────────────────────────────────────
function _buildWaifuUrl(slug, isNsfw) {
    const params = new URLSearchParams({
        included_tags: slug,
        isNsfw: isNsfw ? 'true' : 'false',
        limit: '1',
    });
    return `${WAIFU_API_BASE}?${params.toString()}`;
}


// ── Config helpers ─────────────────────────────────────────────────────────────

function _bacaConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch (_) {}
    return {};
}

function _simpanConfig(cfg) {
    try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) {}
}

function _getUserMode(sender) {
    return _bacaConfig()?.waifu?.userModes?.[sender] || null;
}

function _setUserMode(sender, mode) {
    const cfg = _bacaConfig();
    if (!cfg.waifu) cfg.waifu = {};
    if (!cfg.waifu.userModes) cfg.waifu.userModes = {};
    cfg.waifu.userModes[sender] = mode;
    _simpanConfig(cfg);
}

// ── Kirim gambar + tombol aksi lengkap ────────────────────────────────────────

function _formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '?';
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
    if (bytes >= 1024)    return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

async function _sendImageResult(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
    imgData, chosen, idx, mode, quotedTarget,
}) {
    const isNsfw      = mode === 'nsfw';
    const modeLabel   = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';
    const switchMode  = isNsfw ? 'safe' : 'nsfw';
    const switchLabel = isNsfw ? '✅ Ganti ke Safe' : '🔞 Ganti ke NSFW 18+';
    const switchDesc  = isNsfw ? 'Beralih ke gambar aman' : 'Beralih ke konten dewasa 18+';
    const ext         = (imgData.extension || '.jpg').replace('.', '').toLowerCase();

    // ── Info gambar dari metadata tbib ──────────────────────────────────────
    const fileSize  = imgData.buffer ? _formatFileSize(imgData.buffer.length) : '?';
    const dimStr    = (imgData.width && imgData.height)
        ? `${imgData.width} × ${imgData.height} px`
        : '?';
    const scoreStr  = (imgData.score !== null && imgData.score !== undefined) ? String(imgData.score) : '0';
    const dateStr   = imgData.uploadedAt || '?';
    const ratingStr = imgData.rating
        ? imgData.rating.charAt(0).toUpperCase() + imgData.rating.slice(1)
        : '?';
    const postUrl   = imgData.postId
        ? `https://www.waifu.im/gallery?image_id=${imgData.postId}`
        : null;

    const body =
        `╭─「 🖼️ *WAIFU* 」\n` +
        `│\n` +
        `│ 🎌 Kategori  : *${chosen.label}*\n` +
        `│ 🔒 Mode      : ${modeLabel}\n` +
        `│ 📐 Ukuran    : ${dimStr}\n` +
        `│ 💾 File      : ${fileSize} (.${ext})\n` +
        `│ 📅 Upload    : ${dateStr}\n` +
        `│ 🏷️  Rating    : ${ratingStr}\n` +
        `│\n` +
        `╰──────────────────────`;

    const btn = new Button()
        .setBody(body)
        .setFooter('🖼️ waifu.im • WilyBot')
        .addSelection('📋 Pilih Aksi');

    if (ext === 'gif') {
        btn.setVideo(imgData.buffer, { gifPlayback: true });
    } else {
        btn.setImage(imgData.buffer);
    }

    // ── Seksi 1: Aksi gambar sekarang
    btn.makeSections('🎮 Aksi Gambar');
    btn.makeRow('', '➡️ Gambar Lagi', `Ambil gambar ${chosen.label} baru`, `${_PFX_NEXT}${idx}_${mode}`);
    btn.makeRow('', '🔙 Kembali ke List', 'Pilih kategori/karakter lain', `${_PFX_BACK}${mode}`);

    // ── Seksi 2: Ganti mode & menu utama
    btn.makeSections('🔄 Ganti Mode');
    btn.makeRow('', switchLabel, switchDesc, `${_PFX_SWITCH}${switchMode}`);
    btn.makeRow('', '🏠 Menu Utama', 'Kembali ke pilihan Safe / NSFW', `${_PFX_MODE}main`);

    let sentBtn;
    try { sentBtn = await btn.run(m.from, hisoka, m); } catch (_) {}

    const choiceKey = getJadibotChoiceKey(m);
    const old = pendingWaifuChoices.get(choiceKey);
    if (old?.timeout) clearTimeout(old.timeout);

    const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
    pendingWaifuChoices.set(choiceKey, {
        stage:     'image',
        idx,
        mode,
        botMsgKey: sentBtn?.key || null,
        expiresAt: Date.now() + _TTL,
        timeout,
    });
}

// ── Kirim button error + retry ─────────────────────────────────────────────────

async function _sendErrorButton(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
    chosen, idx, mode, errMsg,
}) {
    const isNsfw = mode === 'nsfw';

    const btn = new Button()
        .setBody(
            `╭─「 ❌ *GAGAL* 」\n` +
            `│\n` +
            `│ 🎌 Kategori : *${chosen.label}*\n` +
            `│ 🔒 Mode     : ${isNsfw ? '🔞 NSFW 18+' : '✅ Safe'}\n` +
            `│\n` +
            `│ ⚠️  ${errMsg.slice(0, 80)}\n` +
            `│\n` +
            `│ Pilih aksi di bawah:\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ waifu.im • WilyBot')
        .addSelection('🔄 Pilih Aksi');

    btn.makeSections('🔄 Aksi');
    btn.makeRow('', '🔄 Coba Lagi', `Ulangi ambil gambar ${chosen.label}`, `${_PFX_RETRY}${idx}_${mode}`);
    btn.makeRow('', '🔙 Kembali ke List', 'Pilih kategori lain', `${_PFX_BACK}${mode}`);
    btn.makeRow('', '🏠 Menu Utama', 'Kembali ke pilihan Safe / NSFW', `${_PFX_MODE}main`);

    let sentBtn;
    try { sentBtn = await btn.run(m.from, hisoka, m); } catch (_) {}

    const choiceKey = getJadibotChoiceKey(m);
    const old = pendingWaifuChoices.get(choiceKey);
    if (old?.timeout) clearTimeout(old.timeout);

    const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
    pendingWaifuChoices.set(choiceKey, {
        stage:     'error',
        idx,
        mode,
        botMsgKey: sentBtn?.key || null,
        expiresAt: Date.now() + _TTL,
        timeout,
    });
}

// ── Button: pilih mode ─────────────────────────────────────────────────────────

async function _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode) {
    const modeLabel = savedMode === 'nsfw' ? '🔞 NSFW 18+' : savedMode === 'safe' ? '✅ Safe' : null;
    const modeInfo  = modeLabel ? `\n│ 💾 Mode tersimpan: *${modeLabel}*` : '';

    const btn = new Button()
        .setBody(
            `╭─「 🖼️ *WAIFU* 」\n` +
            `│\n` +
            `│ 📌 Pilih mode gambar:\n` +
            `│\n` +
            `│ ✅ *Safe* — gambar aman untuk umum\n` +
            `│ 🔞 *NSFW 18+* — konten dewasa\n` +
            `│${modeInfo}\n` +
            `│\n` +
            `│ 🌐 Source: waifu.im\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ waifu.im • WilyBot')
        .addSelection('🖼️ Pilih Mode');

    btn.makeSections('🔒 Mode Gambar');
    btn.makeRow('', '✅ Safe Mode', 'Gambar anime aman, tidak ada konten dewasa', `${_PFX_MODE}safe`);
    btn.makeRow('', '🔞 NSFW 18+', 'Konten dewasa, 18 tahun ke atas', `${_PFX_MODE}nsfw`);

    let sentMsg;
    try { sentMsg = await btn.run(m.from, hisoka, m); } catch (_) {}

    const choiceKey = getJadibotChoiceKey(m);
    const old = pendingWaifuChoices.get(choiceKey);
    if (old?.timeout) clearTimeout(old.timeout);

    const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
    pendingWaifuChoices.set(choiceKey, {
        stage:     'mode',
        botMsgKey: sentMsg?.key || null,
        expiresAt: Date.now() + _TTL,
        timeout,
    });
}

// ── Button: pilih karakter ─────────────────────────────────────────────────────

async function _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, mode) {
    const isNsfw    = mode === 'nsfw';
    const tags      = isNsfw ? NSFW_TAGS : SAFE_TAGS;
    const modeLabel = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';

    const btn = new Button()
        .setBody(
            `╭─「 🖼️ *WAIFU.IM* 」\n` +
            `│\n` +
            `│ Mode: *${modeLabel}*\n` +
            `│\n` +
            `│ 👇 Pilih karakter/kategori\n` +
            `│    anime yang ingin kamu lihat!\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ waifu.im • WilyBot')
        .addSelection('🎌 Pilih Kategori');

    btn.makeSections(isNsfw ? '🔞 Kategori NSFW 18+' : '✅ Karakter / Kategori Safe');
    tags.forEach((t, i) => {
        btn.makeRow('', t.label, `${t.count.toLocaleString()} gambar tersedia`, `${_PFX_CHAR}${i}`);
    });

    let sentMsg;
    try { sentMsg = await btn.run(m.from, hisoka, m); } catch (_) {}

    const choiceKey = getJadibotChoiceKey(m);
    const old = pendingWaifuChoices.get(choiceKey);
    if (old?.timeout) clearTimeout(old.timeout);

    const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
    pendingWaifuChoices.set(choiceKey, {
        stage:     'char',
        mode,
        botMsgKey: sentMsg?.key || null,
        expiresAt: Date.now() + _TTL,
        timeout,
    });
}

// ── Handler utama ──────────────────────────────────────────────────────────────

async function handleWaifu(m, hisoka, { Button, logCommand, tolak, pendingWaifuChoices, getJadibotChoiceKey }) {
    // Deteksi keyword setelah perintah, misal: .waifu ayaka
    let keyword = '';
    if (Array.isArray(m.args) && m.args.length > 0) {
        keyword = m.args.join(' ').trim();
    } else if (m.text) {
        // Strip prefix perintah (.waifu / /waifu / !waifu dll) lalu ambil sisa teks
        const stripped = m.text.replace(/^[.!/]?waifu\s*/i, '').trim();
        // Jangan anggap prefix button sebagai keyword
        if (stripped && !stripped.startsWith('waifu_')) keyword = stripped;
    }

    if (keyword) {
        const mode = _getUserMode(m.sender) || 'safe';
        return _doSearchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
            keyword, mode,
        });
    }

    const savedMode = _getUserMode(m.sender);
    await _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode);
    logCommand(m, hisoka, 'waifu');
}

// ── Helper: ambil + kirim gambar ──────────────────────────────────────────────

async function _doFetchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
    idx, mode, quotedTarget,
}) {
    const isNsfw = mode === 'nsfw';
    const tags   = isNsfw ? NSFW_TAGS : SAFE_TAGS;
    if (idx < 0 || idx >= tags.length) return false;
    const chosen = tags[idx];

    const loadMsg = await hisoka.sendMessage(
        m.from,
        { text: `⏳ Mengambil gambar *${chosen.label}* dari waifu.im...` },
        { quoted: m }
    ).catch(() => null);

    let imgData;
    try {
        imgData = await _fetchWaifu(chosen.slug, isNsfw);
    } catch (err) {
        if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
        await _sendErrorButton(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
            chosen, idx, mode, errMsg: err.message,
        });
        return true;
    }

    let buffer;
    try {
        buffer = await _downloadBuffer(imgData.url);
    } catch (err) {
        if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
        await _sendErrorButton(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
            chosen, idx, mode, errMsg: `Gagal download gambar: ${err.message}`,
        });
        return true;
    }

    if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}

    await _sendImageResult(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
        imgData: { ...imgData, buffer },
        chosen, idx, mode, quotedTarget,
    });

    logCommand(m, hisoka, 'waifu');
    return true;
}

// ── Helper: search keyword langsung + kirim gambar ────────────────────────────

// ── Smart tag matcher untuk waifu.im API ────────────────────────────────────────
function _matchWaifuTag(keyword) {
    const kw = keyword.toLowerCase().trim();
    const allTags = [...SAFE_TAGS, ...NSFW_TAGS];
    
    // 1. Exact match slug atau label
    const exact = allTags.find(t => {
        if (!t.slug) return false; // Skip random tags
        return t.slug === kw || t.label.toLowerCase().includes(kw);
    });
    if (exact) return exact.slug;

    // 2. Partial match slug
    const partial = allTags.find(t => {
        if (!t.slug) return false;
        return t.slug.includes(kw) || kw.includes(t.slug);
    });
    if (partial) return partial.slug;

    // 3. Fallback default
    return 'waifu';
}

async function _doSearchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
    keyword, mode,
}) {
    const isNsfw  = mode === 'nsfw';
    const matchedSlug = _matchWaifuTag(keyword);

    const loadMsg = await hisoka.sendMessage(
        m.from,
        { text: `⏳ Mencari *${keyword}* (tag: ${matchedSlug}) di waifu.im (mode: ${isNsfw ? 'NSFW' : 'Safe'})...` },
        { quoted: m }
    ).catch(() => null);

    let imgData;
    try {
        imgData = await _fetchWaifu(matchedSlug, isNsfw);
    } catch (err) {
        if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
        await _sendSearchErrorButton(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
            keyword, mode, errMsg: err.message,
        });
        return true;
    }

    let buffer;
    try {
        buffer = await _downloadBuffer(imgData.url);
    } catch (err) {
        if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
        await _sendSearchErrorButton(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
            keyword, mode, errMsg: `Gagal download gambar: ${err.message}`,
        });
        return true;
    }

    if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}

    await _sendSearchResult(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
        imgData: { ...imgData, buffer }, keyword, mode,
    });

    logCommand(m, hisoka, 'waifu');
    return true;
}

async function _sendSearchResult(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
    imgData, keyword, mode,
}) {
    const isNsfw      = mode === 'nsfw';
    const modeLabel   = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';
    const switchMode  = isNsfw ? 'safe' : 'nsfw';
    const switchLabel = isNsfw ? '✅ Ganti ke Safe' : '🔞 Ganti ke NSFW 18+';
    const switchDesc  = isNsfw ? 'Beralih ke gambar aman' : 'Beralih ke konten dewasa 18+';
    const ext         = (imgData.extension || '.jpg').replace('.', '').toLowerCase();

    const fileSize  = imgData.buffer ? _formatFileSize(imgData.buffer.length) : '?';
    const dimStr    = (imgData.width && imgData.height) ? `${imgData.width} × ${imgData.height} px` : '?';
    const scoreStr  = (imgData.score !== null && imgData.score !== undefined) ? String(imgData.score) : '0';
    const dateStr   = imgData.uploadedAt || '?';
    const ratingStr = imgData.rating
        ? imgData.rating.charAt(0).toUpperCase() + imgData.rating.slice(1)
        : '?';

    // Encode keyword untuk ID button (spasi → +)
    const kwEncoded = keyword.replace(/ /g, '+');
    const searchId  = `${_PFX_SEARCH_NEXT}${mode}_${kwEncoded}`;

    const body =
        `╭─「 🔍 *WAIFU SEARCH* 」\n` +
        `│\n` +
        `│ 🔑 Keyword   : *${keyword}*\n` +
        `│ 🔒 Mode      : ${modeLabel}\n` +
        `│ 📐 Ukuran    : ${dimStr}\n` +
        `│ 💾 File      : ${fileSize} (.${ext})\n` +
        `│ 📅 Upload    : ${dateStr}\n` +
        `│ 🏷️  Rating    : ${ratingStr}\n` +
        `│\n` +
        `╰──────────────────────`;

    const btn = new Button()
        .setBody(body)
        .setFooter('🔍 waifu.im • WilyBot')
        .addSelection('📋 Pilih Aksi');

    if (ext === 'gif') {
        btn.setVideo(imgData.buffer, { gifPlayback: true });
    } else {
        btn.setImage(imgData.buffer);
    }

    btn.makeSections('🎮 Aksi Gambar');
    btn.makeRow('', '🔍 Cari Lagi', `Gambar lain dengan keyword "${keyword}"`, searchId);
    btn.makeRow('', '🔙 Pilih Kategori', 'Kembali ke daftar kategori', `${_PFX_BACK}${mode}`);

    btn.makeSections('🔄 Ganti Mode');
    btn.makeRow('', switchLabel, switchDesc, `${_PFX_SWITCH}${switchMode}`);
    btn.makeRow('', '🏠 Menu Utama', 'Kembali ke pilihan Safe / NSFW', `${_PFX_MODE}main`);

    let sentBtn;
    try { sentBtn = await btn.run(m.from, hisoka, m); } catch (_) {}

    const choiceKey = getJadibotChoiceKey(m);
    const old = pendingWaifuChoices.get(choiceKey);
    if (old?.timeout) clearTimeout(old.timeout);

    const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
    pendingWaifuChoices.set(choiceKey, {
        stage:     'search',
        keyword,
        mode,
        botMsgKey: sentBtn?.key || null,
        expiresAt: Date.now() + _TTL,
        timeout,
    });
}

async function _sendSearchErrorButton(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, {
    keyword, mode, errMsg,
}) {
    const isNsfw    = mode === 'nsfw';
    const kwEncoded = keyword.replace(/ /g, '+');
    const searchId  = `${_PFX_SEARCH_NEXT}${mode}_${kwEncoded}`;

    const btn = new Button()
        .setBody(
            `╭─「 ❌ *TIDAK DITEMUKAN* 」\n` +
            `│\n` +
            `│ 🔑 Keyword  : *${keyword}*\n` +
            `│ 🔒 Mode     : ${isNsfw ? '🔞 NSFW 18+' : '✅ Safe'}\n` +
            `│\n` +
            `│ ⚠️  ${errMsg.slice(0, 80)}\n` +
            `│\n` +
            `│ Pilih aksi di bawah:\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🔍 waifu.im • WilyBot')
        .addSelection('📋 Pilih Aksi');

    btn.makeSections('🔄 Aksi');
    btn.makeRow('', '🔍 Coba Lagi', `Ulangi pencarian "${keyword}"`, searchId);
    btn.makeRow('', '🔙 Pilih Kategori', 'Kembali ke daftar kategori', `${_PFX_BACK}${mode}`);
    btn.makeRow('', '🏠 Menu Utama', 'Kembali ke pilihan Safe / NSFW', `${_PFX_MODE}main`);

    try { await btn.run(m.from, hisoka, m); } catch (_) {}
}

// ── Intercept semua pilihan waifu ──────────────────────────────────────────────

async function handleWaifuChoice({
    hisoka, m,
    pendingWaifuChoices,
    getJadibotChoiceKey, getQuotedStanzaId,
    Button, tolak, logCommand,
}) {
    const rawText = (m.text || '').trim();

    const isMode       = rawText.startsWith(_PFX_MODE);
    const isChar       = rawText.startsWith(_PFX_CHAR);
    const isNext       = rawText.startsWith(_PFX_NEXT);
    const isBack       = rawText.startsWith(_PFX_BACK);
    const isSwitch     = rawText.startsWith(_PFX_SWITCH);
    const isRetry      = rawText.startsWith(_PFX_RETRY);
    const isSearchNext = rawText.startsWith(_PFX_SEARCH_NEXT);

    if (!isMode && !isChar && !isNext && !isBack && !isSwitch && !isRetry && !isSearchNext) return false;

    // ── Helper: hapus button lama ─────────────────────────────────────────────
    const _clearSession = async (choiceKey) => {
        const pending = pendingWaifuChoices.get(choiceKey);
        if (pending?.timeout)    clearTimeout(pending.timeout);
        if (pending?.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }
        pendingWaifuChoices.delete(choiceKey);
        return pending;
    };

    // ── NEXT: ambil gambar baru kategori & mode yang sama ────────────────────
    if (isNext) {
        const payload = rawText.slice(_PFX_NEXT.length);
        const lastUs  = payload.lastIndexOf('_');
        if (lastUs < 0) return false;
        const idx  = parseInt(payload.slice(0, lastUs), 10);
        const mode = payload.slice(lastUs + 1);
        if (isNaN(idx) || (mode !== 'safe' && mode !== 'nsfw')) return false;

        await _clearSession(getJadibotChoiceKey(m));
        return _doFetchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
            idx, mode, quotedTarget: null,
        });
    }

    // ── RETRY: ulangi ambil gambar setelah error ──────────────────────────────
    if (isRetry) {
        const payload = rawText.slice(_PFX_RETRY.length);
        const lastUs  = payload.lastIndexOf('_');
        if (lastUs < 0) return false;
        const idx  = parseInt(payload.slice(0, lastUs), 10);
        const mode = payload.slice(lastUs + 1);
        if (isNaN(idx) || (mode !== 'safe' && mode !== 'nsfw')) return false;

        await _clearSession(getJadibotChoiceKey(m));
        return _doFetchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
            idx, mode, quotedTarget: null,
        });
    }

    // ── SEARCH NEXT: cari lagi dengan keyword yang sama ──────────────────────
    if (isSearchNext) {
        // Format: waifu_srch_{mode}_{keyword+encoded}
        const payload  = rawText.slice(_PFX_SEARCH_NEXT.length);
        const firstUs  = payload.indexOf('_');
        if (firstUs < 0) return false;
        const mode     = payload.slice(0, firstUs);
        const kwRaw    = payload.slice(firstUs + 1);
        if (mode !== 'safe' && mode !== 'nsfw') return false;
        const keyword  = kwRaw.replace(/\+/g, ' ').trim();
        if (!keyword) return false;

        await _clearSession(getJadibotChoiceKey(m));
        return _doSearchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
            keyword, mode,
        });
    }

    // ── BACK: kembali ke list kategori mode saat ini ──────────────────────────
    if (isBack) {
        const mode = rawText.slice(_PFX_BACK.length);
        if (mode !== 'safe' && mode !== 'nsfw') return false;

        await _clearSession(getJadibotChoiceKey(m));
        await _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, mode);
        logCommand(m, hisoka, 'waifu');
        return true;
    }

    // ── SWITCH: ganti ke mode lain, tampilkan list kategori mode baru ─────────
    if (isSwitch) {
        const newMode = rawText.slice(_PFX_SWITCH.length);
        if (newMode !== 'safe' && newMode !== 'nsfw') return false;

        await _clearSession(getJadibotChoiceKey(m));
        _setUserMode(m.sender, newMode);
        await _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, newMode);
        logCommand(m, hisoka, 'waifu');
        return true;
    }

    // ── MODE main: kembali ke menu pilih Safe / NSFW ──────────────────────────
    if (isMode && rawText === `${_PFX_MODE}main`) {
        await _clearSession(getJadibotChoiceKey(m));
        const savedMode = _getUserMode(m.sender);
        await _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode);
        logCommand(m, hisoka, 'waifu');
        return true;
    }

    // ── Cari sesi untuk MODE dan CHAR ────────────────────────────────────────
    const choiceKey = getJadibotChoiceKey(m);
    let entry = pendingWaifuChoices.has(choiceKey)
        ? { key: choiceKey, session: pendingWaifuChoices.get(choiceKey) }
        : null;

    if (!entry) {
        const quotedId = getQuotedStanzaId(m);
        if (quotedId) {
            for (const [k, s] of pendingWaifuChoices.entries()) {
                if (k.startsWith(m.from + ':') && s.botMsgKey?.id === quotedId) {
                    entry = { key: k, session: s };
                    break;
                }
            }
        }
    }

    if (!entry) return false;

    const { key: matchedKey, session: pending } = entry;
    if (pending.expiresAt <= Date.now()) {
        pendingWaifuChoices.delete(matchedKey);
        return false;
    }

    // ── STAGE: pilih mode (safe/nsfw) ─────────────────────────────────────────
    if (isMode && pending.stage === 'mode') {
        const modeVal = rawText.slice(_PFX_MODE.length);
        if (modeVal !== 'safe' && modeVal !== 'nsfw') return false;

        if (pending.timeout) clearTimeout(pending.timeout);
        if (pending.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }
        pendingWaifuChoices.delete(matchedKey);

        _setUserMode(m.sender, modeVal);
        await _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, modeVal);
        logCommand(m, hisoka, 'waifu');
        return true;
    }

    // ── STAGE: pilih karakter ─────────────────────────────────────────────────
    if (isChar && pending.stage === 'char') {
        const idx  = parseInt(rawText.slice(_PFX_CHAR.length), 10);
        const mode = pending.mode;
        if (isNaN(idx)) return false;

        if (pending.timeout) clearTimeout(pending.timeout);
        if (pending.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }
        pendingWaifuChoices.delete(matchedKey);

        return _doFetchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
            idx, mode, quotedTarget: null,
        });
    }

    return false;
}

module.exports = { handleWaifu, handleWaifuChoice };
