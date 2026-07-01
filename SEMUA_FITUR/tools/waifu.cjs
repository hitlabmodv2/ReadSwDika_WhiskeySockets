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

// ── Tag list ───────────────────────────────────────────────────────────────────
// API: tbib.org (gelbooru-based, tidak pakai Cloudflare, selalu bisa diakses)
// Format URL: https://tbib.org/images/{directory}/{image}

// Safe tags — konten aman (rating:safe) — count real dari tbib.org
const SAFE_TAGS = [
    { label: '🧕 Waifu',          slug: '1girl rating:safe',              count: 4278481 },
    { label: '💃 Dress',           slug: 'dress rating:safe',              count: 1102668 },
    { label: '💫 Twintails',       slug: 'twintails rating:safe',          count: 653335  },
    { label: '🩱 Swimsuit',        slug: 'swimsuit rating:safe',           count: 600652  },
    { label: '🏫 School Uniform',  slug: 'school_uniform rating:safe',     count: 549907  },
    { label: '👙 Bikini',          slug: 'bikini rating:safe',             count: 482045  },
    { label: '👓 Kacamata',        slug: 'glasses rating:safe',            count: 327354  },
    { label: '👘 Kimono',          slug: 'kimono rating:safe',             count: 172580  },
    { label: '🌑 Dark Skin',       slug: 'dark_skin rating:safe',          count: 167327  },
    { label: '👕 Uniform',         slug: 'uniform rating:safe',            count: 155167  },
    { label: '✨ Genshin Impact',  slug: 'genshin_impact rating:safe',     count: 128804  },
    { label: '👗 Maid',            slug: 'maid rating:safe',               count: 114971  },
    { label: '🐱 Cat Girl',        slug: 'cat_girl rating:safe',           count: 64269   },
    { label: '😈 Demon Girl',      slug: 'demon_girl rating:safe',         count: 59330   },
    { label: '🧝 Elf',             slug: 'elf rating:safe',                count: 44137   },
    { label: '🎀 Gothic Lolita',   slug: 'gothic_lolita rating:safe',      count: 15312   },
    { label: '🤳 Selfie',          slug: 'selfie rating:safe',             count: 15980   },
    { label: '💀 Mori Calliope',   slug: 'mori_calliope rating:safe',      count: 7752    },
    { label: '💙 Rem (Re:Zero)',   slug: 'rem_(re:zero) rating:safe',      count: 7298    },
    { label: '🍊 Nami (One Piece)',slug: 'nami_(one_piece) rating:safe',   count: 6177    },
    { label: '🌸 Kamisato Ayaka',  slug: 'kamisato_ayaka rating:safe',     count: 3174    },
];

// NSFW tags — konten dewasa 18+ (rating:explicit) — count real dari tbib.org
const NSFW_TAGS = [
    { label: '🔞 Nipples',         slug: 'nipples rating:explicit',                  count: 2038285 },
    { label: '🌶️ Nude/Ero',       slug: 'nude rating:explicit',                     count: 1715697 },
    { label: '💦 Cum',             slug: 'cum rating:explicit',                      count: 1252162 },
    { label: '🍈 Large Breasts',   slug: 'large_breasts rating:explicit',            count: 492133  },
    { label: '👄 Oral',            slug: 'oral rating:explicit',                     count: 482597  },
    { label: '🍑 Ass',             slug: 'ass rating:explicit',                      count: 297261  },
    { label: '👭 Group Sex',       slug: 'group_sex rating:explicit',                count: 202376  },
    { label: '⛓️ Bondage',        slug: 'bondage rating:explicit',                  count: 184006  },
    { label: '🐙 Tentacles',       slug: 'tentacles rating:explicit',                count: 96845   },
    { label: '😵 Ahegao',          slug: 'ahegao rating:explicit',                   count: 86537   },
    { label: '💦 Paizuri',         slug: 'paizuri rating:explicit',                  count: 74287   },
    { label: '⚧ Futanari',        slug: 'futanari rating:explicit',                  count: 57965   },
    { label: '🩷 Yuri',            slug: 'yuri rating:explicit',                     count: 55759   },
    { label: '👊 Gangbang',        slug: 'gangbang rating:explicit',                 count: 52317   },
    { label: '👕 Uniform 18+',     slug: 'uniform rating:explicit',                  count: 36873   },
    { label: '👗 Maid 18+',        slug: 'maid rating:explicit',                     count: 20234   },
    { label: '🍈 Oppai',           slug: 'oppai rating:explicit',                    count: 10153   },
    { label: '👩 MILF',            slug: 'milf rating:explicit',                     count: 9602    },
];

// ── Ambil token waifu.im dari config.json ─────────────────────────────────────
// Cara dapat token: https://www.waifu.im/dashboard (login → Generate Token)
// Simpan di config.json: { "waifu": { "token": "TOKEN_KAMU_DISINI" } }

const WAIFU_TOKEN = 'lPcSc1Fh55RUQ6g3PSzm2YxCEVTUxhlsiRMSVajHCN8';

function _getWaifuToken() {
    try {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        return cfg?.waifu?.token || WAIFU_TOKEN;
    } catch (_) { return WAIFU_TOKEN; }
}

// ── HTTP helpers ───────────────────────────────────────────────────────────────

function _httpGetJson(url, token) {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept':          'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer':         'https://www.waifu.im/',
            'Origin':          'https://www.waifu.im',
            'Connection':      'keep-alive',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = https.get(url, { headers }, (res) => {
            const zlib    = require('zlib');
            const enc     = res.headers['content-encoding'];
            let   stream  = res;
            let   raw     = '';

            if (enc === 'gzip')    stream = res.pipe(zlib.createGunzip());
            else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
            else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());

            stream.on('data', d => raw += d);
            stream.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                try { resolve(JSON.parse(raw)); } catch (_) { reject(new Error('JSON parse error')); }
            });
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function _downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept':          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer':         'https://www.waifu.im/',
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

// ── Fetch gambar dari tbib.org (gelbooru-compatible, tanpa Cloudflare) ─────────
// API docs: https://tbib.org/index.php?page=help&topic=dapi
// Response: array of { directory, image, hash, tags, rating, ... }
// URL gambar: https://tbib.org/images/{directory}/{image}

async function _fetchWaifu(slug, isNsfw) {
    // Acak offset agar tiap request dapat gambar berbeda
    const pid    = Math.floor(Math.random() * 20);
    const params = new URLSearchParams({
        page:  'dapi',
        s:     'post',
        q:     'index',
        json:  '1',
        tags:  slug,
        limit: '10',
        pid:   String(pid),
    });

    const data = await _httpGetJson(`https://tbib.org/index.php?${params}`);

    if (!Array.isArray(data) || data.length === 0) {
        // Coba lagi tanpa pid jika tidak ada hasil
        const params2 = new URLSearchParams({ page: 'dapi', s: 'post', q: 'index', json: '1', tags: slug, limit: '10' });
        const data2   = await _httpGetJson(`https://tbib.org/index.php?${params2}`);
        if (!Array.isArray(data2) || data2.length === 0) throw new Error('Tidak ada gambar ditemukan untuk kategori ini');
        const pick = data2[Math.floor(Math.random() * data2.length)];
        return _normalizeTbib(pick);
    }

    const pick = data[Math.floor(Math.random() * data.length)];
    return _normalizeTbib(pick);
}

function _normalizeTbib(item) {
    const imageFile = item.image || (item.hash + '.jpg');
    const url       = `https://tbib.org/images/${item.directory}/${imageFile}`;
    const ext       = imageFile.split('.').pop()?.toLowerCase() || 'jpg';

    // Format tanggal dari Unix timestamp `change`
    let uploadedAt = null;
    if (item.change) {
        const d = new Date(item.change * 1000);
        const pad = n => String(n).padStart(2, '0');
        uploadedAt = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
    }

    return {
        url,
        extension:   '.' + ext,
        is_nsfw:     item.rating === 'explicit' || item.rating === 'questionable',
        artists:     [],
        source:      null,
        tags:        (item.tags || '').split(' ').slice(0, 5).map(n => ({ name: n })),
        // Metadata tambahan
        width:       item.width       || null,
        height:      item.height      || null,
        score:       item.score       ?? null,
        uploadedAt:  uploadedAt,
        postId:      item.id          || null,
        owner:       item.owner       || null,
        rating:      item.rating      || null,
    };
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
    const scoreStr  = imgData.score != null ? String(imgData.score) : '?';
    const dateStr   = imgData.uploadedAt || '?';
    const ratingStr = imgData.rating
        ? imgData.rating.charAt(0).toUpperCase() + imgData.rating.slice(1)
        : '?';
    const postUrl   = imgData.postId
        ? `https://tbib.org/index.php?page=post&s=view&id=${imgData.postId}`
        : null;

    const body =
        `╭─「 🖼️ *WAIFU* 」\n` +
        `│\n` +
        `│ 🎌 Kategori  : *${chosen.label}*\n` +
        `│ 🔒 Mode      : ${modeLabel}\n` +
        `│ 📐 Ukuran    : ${dimStr}\n` +
        `│ 💾 File      : ${fileSize} (.${ext})\n` +
        `│ ⭐ Score     : ${scoreStr}\n` +
        `│ 📅 Upload    : ${dateStr}\n` +
        `│ 🏷️  Rating    : ${ratingStr}\n` +
        (postUrl ? `│ 🔗 Post ID   : #${imgData.postId}\n` : '') +
        `│\n` +
        `╰──────────────────────`;

    const btn = new Button()
        .setBody(body)
        .setFooter('🖼️ tbib.org • WilyBot')
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
        .setFooter('🖼️ tbib.org • WilyBot')
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
            `│ 🌐 Source: tbib.org\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ tbib.org • WilyBot')
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
        .setFooter('🖼️ tbib.org • WilyBot')
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
        { text: `⏳ Mengambil gambar *${chosen.label}* dari tbib.org...` },
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

async function _doSearchAndSend(hisoka, m, Button, pendingWaifuChoices, getJadibotChoiceKey, tolak, logCommand, {
    keyword, mode,
}) {
    const isNsfw    = mode === 'nsfw';
    const ratingTag = isNsfw ? 'rating:explicit' : 'rating:safe';
    const slug      = keyword + ' ' + ratingTag;

    const loadMsg = await hisoka.sendMessage(
        m.from,
        { text: `⏳ Mencari *${keyword}* di tbib.org (mode: ${isNsfw ? 'NSFW' : 'Safe'})...` },
        { quoted: m }
    ).catch(() => null);

    let imgData;
    try {
        imgData = await _fetchWaifu(slug, isNsfw);
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
    const scoreStr  = imgData.score != null ? String(imgData.score) : '?';
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
        `│ ⭐ Score     : ${scoreStr}\n` +
        `│ 📅 Upload    : ${dateStr}\n` +
        `│ 🏷️  Rating    : ${ratingStr}\n` +
        (imgData.postId ? `│ 🔗 Post ID   : #${imgData.postId}\n` : '') +
        `│\n` +
        `╰──────────────────────`;

    const btn = new Button()
        .setBody(body)
        .setFooter('🔍 tbib.org • WilyBot')
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
        .setFooter('🔍 tbib.org • WilyBot')
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
