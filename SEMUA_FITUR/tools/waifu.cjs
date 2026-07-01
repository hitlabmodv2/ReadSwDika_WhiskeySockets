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
 *  Ambil gambar anime safe/NSFW18 via tombol interaktif.
 *  Source: nekos.best + nekos.life
 *  Preferensi mode tersimpan di config.json per user.
 * ───────────────────────────────
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const _TTL      = 5 * 60 * 1000;
const _PFX_MODE = 'waifu_mode_';
const _PFX_CHAR = 'waifu_char_';
const CONFIG_PATH = path.join(process.cwd(), 'config.json');

// ── Daftar tag ─────────────────────────────────────────────────────────────────
// api: 'nekobest' → GET https://nekos.best/api/v2/<endpoint> → { results:[{url}] }
// api: 'nekoslife' → GET https://nekos.life/api/v2/img/<endpoint> → { url }

const SAFE_TAGS = [
    { label: '🧕 Waifu',      api: 'nekobest',   ep: 'waifu',    src: 'nekos.best'  },
    { label: '🐱 Neko',       api: 'nekobest',   ep: 'neko',     src: 'nekos.best'  },
    { label: '🦊 Kitsune',    api: 'nekobest',   ep: 'kitsune',  src: 'nekos.best'  },
    { label: '👨 Husbando',   api: 'nekobest',   ep: 'husbando', src: 'nekos.best'  },
    { label: '🦊 Fox Girl',   api: 'nekoslife',  ep: 'fox_girl', src: 'nekos.life'  },
    { label: '😏 Smug',       api: 'nekoslife',  ep: 'smug',     src: 'nekos.life'  },
    { label: '🐶 Woof',       api: 'nekoslife',  ep: 'woof',     src: 'nekos.life'  },
    { label: '🖼️ Wallpaper',  api: 'nekoslife',  ep: 'wallpaper',src: 'nekos.life'  },
    { label: '🐾 Meow',       api: 'nekoslife',  ep: 'meow',     src: 'nekos.life'  },
    { label: '😊 Avatar',     api: 'nekoslife',  ep: 'avatar',   src: 'nekos.life'  },
];

const NSFW_TAGS = [
    { label: '💋 Lewd',   api: 'nekoslife', ep: 'lewd',  src: 'nekos.life' },
    { label: '🌶️ Gasm',   api: 'nekoslife', ep: 'gasm',  src: 'nekos.life' },
    { label: '👋 Spank',  api: 'nekoslife', ep: 'spank', src: 'nekos.life' },
];

// ── HTTP helper ────────────────────────────────────────────────────────────────

function _httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'WilyBot/1.0', 'Accept': 'application/json', ...headers } }, (res) => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => resolve({ status: res.statusCode, body: raw }));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function _downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'WilyBot/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return _downloadBuffer(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('Download timeout')); });
    });
}

// ── Fetch per API ──────────────────────────────────────────────────────────────

async function _fetchNekobest(ep) {
    const { status, body } = await _httpGet(`https://nekos.best/api/v2/${ep}`);
    if (status !== 200) throw new Error(`nekos.best HTTP ${status}`);
    const json = JSON.parse(body);
    const results = json?.results;
    if (!results || !results.length) throw new Error('Tidak ada hasil');
    const item = results[Math.floor(Math.random() * results.length)];
    return item.url; // langsung URL gambar
}

async function _fetchNekoslife(ep) {
    const { status, body } = await _httpGet(`https://nekos.life/api/v2/img/${ep}`);
    if (status !== 200) throw new Error(`nekos.life HTTP ${status}`);
    const json = JSON.parse(body);
    if (!json?.url) throw new Error('URL tidak ditemukan');
    return json.url;
}

async function fetchWaifuUrl(tag) {
    if (tag.api === 'nekobest') return _fetchNekobest(tag.ep);
    if (tag.api === 'nekoslife') return _fetchNekoslife(tag.ep);
    throw new Error('API tidak dikenal');
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
            `╭─「 🖼️ *WAIFU* 」\n` +
            `│\n` +
            `│ 📌 Pilih mode gambar yang kamu inginkan:\n` +
            `│\n` +
            `│ ✅ *Safe* — gambar aman untuk umum\n` +
            `│ 🔞 *NSFW 18+* — konten dewasa\n` +
            `│${modeInfo}\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ Waifu • WilyBot')
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
            `╭─「 🖼️ *WAIFU* 」\n` +
            `│\n` +
            `│ Mode: *${modeLabel}*\n` +
            `│\n` +
            `│ 👇 Pilih karakter/kategori anime\n` +
            `│    yang ingin kamu lihat!\n` +
            `│\n` +
            `╰──────────────────────`
        )
        .setFooter('🖼️ Waifu • WilyBot')
        .addSelection('🎌 Pilih Karakter');

    btn.makeSections(isNsfw ? '🔞 Kategori NSFW 18+' : '✅ Karakter/Kategori Safe');
    tags.forEach((t, i) => {
        btn.makeRow('', t.label, `via ${t.src}`, `${_PFX_CHAR}${i}`);
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
 * Intercept reply pilihan waifu.
 * @returns {boolean} true jika sudah ditangani
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

        // Hapus button mode sebelumnya
        if (pending.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }

        // Simpan preferensi ke config.json
        setUserMode(m.sender, mode);

        // Kirim button pilih karakter
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

        // Hapus button karakter sebelumnya
        if (pending.botMsgKey) {
            try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
        }

        // Loading
        const loadMsg = await hisoka.sendMessage(
            m.from,
            { text: `⏳ Mengambil gambar *${chosen.label}* dari ${chosen.src}...` },
            { quoted: m }
        ).catch(() => null);

        // Fetch URL gambar
        let imgUrl;
        try {
            imgUrl = await fetchWaifuUrl(chosen);
        } catch (err) {
            if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
            await tolak(hisoka, m, `❌ Gagal mengambil gambar *${chosen.label}*.\nError: ${err.message}\nCoba lagi.`);
            return true;
        }

        // Download buffer
        let buffer;
        try {
            buffer = await _downloadBuffer(imgUrl);
        } catch (err) {
            if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
            await tolak(hisoka, m, `❌ Gagal mendownload gambar.\nError: ${err.message}`);
            return true;
        }

        // Hapus loading
        if (loadMsg?.key) try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}

        const modeLabel = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';
        const ext       = (imgUrl.split('.').pop() || 'jpg').toLowerCase().split('?')[0];
        const caption   =
            `╭─「 🖼️ *WAIFU* 」\n` +
            `│\n` +
            `│ 🎌 Kategori : *${chosen.label}*\n` +
            `│ 🔒 Mode     : ${modeLabel}\n` +
            `│ 🌐 Source   : ${chosen.src}\n` +
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
