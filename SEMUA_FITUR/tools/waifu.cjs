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
 *  Ambil gambar anime safe/NSFW18 dari waifu.im
 *  via endpoint /images (bukan /search — tidak terblock CF).
 *  Preferensi mode tersimpan di config.json per user.
 * ───────────────────────────────
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const _TTL        = 5 * 60 * 1000;
const _PFX_MODE   = 'waifu_mode_';
const _PFX_CHAR   = 'waifu_char_';
const CONFIG_PATH = path.join(process.cwd(), 'config.json');

// ── Daftar tag waifu.im ────────────────────────────────────────────────────────
// Endpoint: GET https://api.waifu.im/images?included_tags=<slug>&is_nsfw=<bool>&page_size=1&order_by=Random

const SAFE_TAGS = [
    { label: '🧕 Waifu',           slug: 'waifu',           count: 4274 },
    { label: '👗 Maid',             slug: 'maid',            count: 273  },
    { label: '👕 Uniform',          slug: 'uniform',         count: 446  },
    { label: '🍑 Oppai',            slug: 'oppai',           count: 1084 },
    { label: '🤳 Selfies',          slug: 'selfies',         count: 181  },
    { label: '🌸 Marin Kitagawa',   slug: 'marin-kitagawa',  count: 43   },
    { label: '💀 Mori Calliope',    slug: 'mori-calliope',   count: 26   },
    { label: '⚡ Raiden Shogun',    slug: 'raiden-shogun',   count: 69   },
    { label: '🌸 Kamisato Ayaka',   slug: 'kamisato-ayaka',  count: 14   },
    { label: '✨ Genshin Impact',   slug: 'genshin-impact',  count: 84   },
];

const NSFW_TAGS = [
    { label: '🌶️ Ero',     slug: 'ero',     count: 3012 },
    { label: '💋 Ecchi',   slug: 'ecchi',   count: 2136 },
    { label: '📖 Hentai',  slug: 'hentai',  count: 882  },
    { label: '👩 Milf',    slug: 'milf',    count: 468  },
    { label: '🍑 Ass',     slug: 'ass',     count: 413  },
    { label: '🍈 Paizuri', slug: 'paizuri', count: 146  },
    { label: '💋 Oral',    slug: 'oral',    count: 145  },
];

// ── HTTP helpers ───────────────────────────────────────────────────────────────

function _httpGetJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'WilyBot/1.0',
                'Accept':     'application/json',
            },
        }, (res) => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('JSON parse error')); }
            });
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function _downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'WilyBot/1.0' } }, (res) => {
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

// ── Fetch dari waifu.im /images ───────────────────────────────────────────────

async function fetchWaifu(slug, isNsfw) {
    // Ambil total halaman dulu (page_size=1 efisien)
    const params  = new URLSearchParams({
        included_tags: slug,
        is_nsfw:       isNsfw ? 'true' : 'false',
        page_size:     '1',
        order_by:      'Random',
    });
    const url  = `https://api.waifu.im/images?${params.toString()}`;
    const data = await _httpGetJson(url);
    const items = data?.items;
    if (!items || !items.length) throw new Error('Tidak ada gambar ditemukan untuk tag ini');
    return items[0]; // { id, url, extension, isNsfw, tags, source, artists, ... }
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

function getUserMode(sender) {
    const cfg = _bacaConfig();
    return cfg?.waifu?.userModes?.[sender] || null;
}

function setUserMode(sender, mode) {
    const cfg = _bacaConfig();
    if (!cfg.waifu) cfg.waifu = {};
    if (!cfg.waifu.userModes) cfg.waifu.userModes = {};
    cfg.waifu.userModes[sender] = mode;
    _simpanConfig(cfg);
}

// ── Button builders ────────────────────────────────────────────────────────────

async function _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode) {
    const modeLabel = savedMode === 'nsfw' ? '🔞 NSFW 18+' : savedMode === 'safe' ? '✅ Safe' : null;
    const modeInfo  = modeLabel ? `\n│ 💾 Mode tersimpan: *${modeLabel}*` : '';

    const btn = new Button()
        .setBody(
            `╭─「 🖼️ *WAIFU.IM* 」\n` +
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
        .setFooter('🖼️ Waifu.im • WilyBot')
        .addSelection('🖼️ Pilih Mode');

    btn.makeSections('🔒 Pilih Mode Gambar');
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
            `│ 👇 Pilih karakter/kategori anime\n` +
            `│    yang ingin kamu lihat!\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ Waifu.im • WilyBot')
        .addSelection('🎌 Pilih Karakter');

    btn.makeSections(isNsfw ? '🔞 Kategori NSFW 18+' : '✅ Karakter/Kategori Safe');
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
    const savedMode = getUserMode(m.sender);
    await _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode);
    logCommand(m, hisoka, 'waifu');
}

/**
 * Intercept reply pilihan waifu — dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah ditangani
 */
async function handleWaifuChoice({
    hisoka, m,
    pendingWaifuChoices,
    getJadibotChoiceKey, getQuotedStanzaId,
    Button, tolak, logCommand,
}) {
    const rawText = (m.text || '').trim();
    const isMode  = rawText.startsWith(_PFX_MODE);
    const isChar  = rawText.startsWith(_PFX_CHAR);
    if (!isMode && !isChar) return false;

    // ── Cari sesi ────────────────────────────────────────────────────────────
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

    // ── STAGE 1: pilih mode ───────────────────────────────────────────────────
    if (isMode && pending.stage === 'mode') {
        if (pending.timeout) clearTimeout(pending.timeout);
        pendingWaifuChoices.delete(matchedKey);

        const mode = rawText.slice(_PFX_MODE.length) === 'nsfw' ? 'nsfw' : 'safe';

        if (pending.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }

        setUserMode(m.sender, mode);
        await _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, mode);
        logCommand(m, hisoka, 'waifu');
        return true;
    }

    // ── STAGE 2: pilih karakter ───────────────────────────────────────────────
    if (isChar && pending.stage === 'char') {
        if (pending.timeout) clearTimeout(pending.timeout);
        pendingWaifuChoices.delete(matchedKey);

        const idxStr = rawText.slice(_PFX_CHAR.length);
        const idx    = parseInt(idxStr, 10);
        const isNsfw = pending.mode === 'nsfw';
        const tags   = isNsfw ? NSFW_TAGS : SAFE_TAGS;

        if (isNaN(idx) || idx < 0 || idx >= tags.length) return false;
        const chosen = tags[idx];

        if (pending.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }

        const loadMsg = await hisoka.sendMessage(
            m.from,
            { text: `⏳ Mengambil gambar *${chosen.label}* dari waifu.im...` },
            { quoted: m }
        ).catch(() => null);

        // Fetch data dari waifu.im /images
        let imgData;
        try {
            imgData = await fetchWaifu(chosen.slug, isNsfw);
        } catch (err) {
            if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
            await tolak(hisoka, m,
                `❌ Gagal mengambil gambar *${chosen.label}*.\n` +
                `Error: ${err.message}\n` +
                `Coba lagi beberapa saat.`
            );
            return true;
        }

        // Download buffer gambar dari CDN
        let buffer;
        try {
            buffer = await _downloadBuffer(imgData.url);
        } catch (err) {
            if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
            await tolak(hisoka, m, `❌ Gagal download gambar.\nError: ${err.message}`);
            return true;
        }

        if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}

        const modeLabel  = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';
        const ext        = (imgData.extension || '.jpg').replace('.', '').toLowerCase();
        const artistName = imgData.artists?.[0]?.name || null;
        const source     = imgData.source || null;

        const caption =
            `╭─「 🖼️ *WAIFU.IM* 」\n` +
            `│\n` +
            `│ 🎌 Kategori : *${chosen.label}*\n` +
            `│ 🔒 Mode     : ${modeLabel}\n` +
            (artistName ? `│ 🎨 Artist   : ${artistName}\n` : '') +
            (source     ? `│ 🔗 Source   : ${source.slice(0, 45)}${source.length > 45 ? '…' : ''}\n` : '') +
            `│ 🌐 Via      : waifu.im\n` +
            `│\n` +
            `│ 💡 Ketik *.waifu* untuk pilih lagi\n` +
            `│\n` +
            `╰──────────────────────`;

        try {
            if (ext === 'gif') {
                await hisoka.sendMessage(m.from, { video: buffer, gifPlayback: true, caption }, { quoted: m });
            } else {
                await hisoka.sendMessage(m.from, { image: buffer, caption }, { quoted: m });
            }
        } catch (_) {
            await tolak(hisoka, m, `❌ Gagal mengirim gambar. Coba lagi.`);
        }

        logCommand(m, hisoka, 'waifu');
        return true;
    }

    return false;
}

module.exports = { handleWaifu, handleWaifuChoice };
