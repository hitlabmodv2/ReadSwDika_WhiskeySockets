'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const FILE_CONFIG = path.join(process.cwd(), 'config.json');
const BASE_URL    = 'https://web.getcontact.com';
const UA          = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Track sesi QR yang sedang pending (jid → { hash, cookies })
const _pendingLogin = new Map();

// ── CONFIG ────────────────────────────────────────────────────────────────────

function bacaConfig() {
    try { return JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf-8')); } catch (_) { return {}; }
}
function simpanConfig(cfg) {
    try { fs.writeFileSync(FILE_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) {}
}
function getSession() {
    const c = bacaConfig();
    return { token: c?.getcontact?.token || '', hash: c?.getcontact?.hash || '' };
}
function simpanSession(token, hash) {
    const cfg = bacaConfig();
    if (!cfg.getcontact) cfg.getcontact = {};
    if (token) cfg.getcontact.token = token;
    if (hash)  cfg.getcontact.hash  = hash;
    simpanConfig(cfg);
}
function hapusSession() {
    const cfg = bacaConfig();
    delete cfg.getcontact;
    simpanConfig(cfg);
}

// ── HEADERS ───────────────────────────────────────────────────────────────────

function hBrowser(cookie = '') {
    return { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9', ...(cookie ? { Cookie: cookie } : {}) };
}
function hAjax(cookie = '') {
    return {
        'User-Agent': UA,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': BASE_URL, 'Referer': BASE_URL + '/search',
        ...(cookie ? { Cookie: cookie } : {}),
    };
}
function parseCookies(arr = []) { return (arr || []).map(c => c.split(';')[0]).join('; '); }
function mergeCookies(base, inc) {
    const map = new Map();
    for (const s of [base, inc]) (s || '').split(';').map(x => x.trim()).filter(Boolean).forEach(c => { const [k, v] = c.split('='); if (k && v) map.set(k.trim(), v.trim()); });
    return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
function ambilToken(cookies) { return (cookies || '').match(/accessToken=([^;]+)/)?.[1] || ''; }

// ── GETCONTACT WEB API ────────────────────────────────────────────────────────

async function initSession() {
    const res     = await axios.get(BASE_URL, { headers: hBrowser(), timeout: 20000 });
    const html    = typeof res.data === 'string' ? res.data : '';
    const cookies = parseCookies(res.headers['set-cookie']);
    const hash    = html.match(/hash:\s*'([a-fA-F0-9]+)'/)?.[1] || html.match(/<input[^>]+name="hash"[^>]+value="([^"]+)"/)?.[1] || '';
    const sudahLogin = /<input[^>]+name="hash"[^>]+value="([^"]+)"/.test(html);
    const token   = sudahLogin ? ambilToken(cookies) : '';
    return { hash, cookies, sudahLogin, token };
}

async function getQrBuf(cookies) {
    const res = await axios.get(`${BASE_URL}/get-qr-code`, { responseType: 'arraybuffer', timeout: 20000, headers: { ...hBrowser(cookies), Referer: BASE_URL + '/' } });
    return { buf: Buffer.from(res.data), cookies: mergeCookies(cookies, parseCookies(res.headers['set-cookie'])) };
}

async function pollQr(hash, cookies) {
    const res = await axios.post(`${BASE_URL}/check-qr-code`, `hash=${encodeURIComponent(hash)}`, { timeout: 15000, headers: { ...hAjax(cookies), Referer: BASE_URL + '/' } });
    return { scanned: !!res.data?.checkResult, cookies: mergeCookies(cookies, parseCookies(res.headers['set-cookie'])) };
}

async function ambilHashFinal(cookies) {
    const res  = await axios.get(BASE_URL, { headers: hBrowser(cookies), timeout: 20000 });
    const html = typeof res.data === 'string' ? res.data : '';
    const hash = html.match(/<input[^>]+name="hash"[^>]+value="([^"]+)"/)?.[1] || '';
    return { hash, cookies: mergeCookies(cookies, parseCookies(res.headers['set-cookie'])) };
}

// Ambil daftar siapa yang simpan nomorku (my tags)
async function ambilTagKu(token, hash) {
    const cookie = `accessToken=${token}; lang=en;`;
    const body   = `hash=${encodeURIComponent(hash)}`;
    for (const url of [`${BASE_URL}/my-tags`, `${BASE_URL}/profile`, `${BASE_URL}/profile-tags`]) {
        try {
            const res = await axios.post(url, body, { headers: hAjax(cookie), timeout: 15000 });
            const d   = res.data;
            if (d && typeof d === 'object' && !Array.isArray(d)) {
                const tags = d.tags || d.result?.tags || d.data?.tags || d.list || [];
                if (Array.isArray(tags)) return tags;
            }
        } catch (_) {}
    }
    // Fallback: parse dari HTML embed
    try {
        const res  = await axios.get(BASE_URL, { headers: hBrowser(cookie), timeout: 20000 });
        const html = typeof res.data === 'string' ? res.data : '';
        const raw  = html.match(/"tags"\s*:\s*(\[[^\]]*?\])/s)?.[1] || html.match(/tagList\s*:\s*(\[[^\]]*?\])/s)?.[1];
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
}

// Cari info nomor + tag orang lain
async function cariNomor(nomor, token, hash) {
    const cookie = `accessToken=${token}; lang=en;`;
    const body   = `hash=${encodeURIComponent(hash)}&phoneNumber=${encodeURIComponent(nomor)}`;
    const [s, t] = await Promise.allSettled([
        axios.post(`${BASE_URL}/search`,   body, { headers: hAjax(cookie), timeout: 20000 }),
        axios.post(`${BASE_URL}/list-tag`, body, { headers: hAjax(cookie), timeout: 20000 }),
    ]);
    return { search: s.status === 'fulfilled' ? s.value.data : {}, tags: t.status === 'fulfilled' ? t.value.data : {} };
}

// ── FORMAT ────────────────────────────────────────────────────────────────────

function formatNomor(input) {
    let n = input.replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return '+' + n;
}

function captionTagKu(tags) {
    const SEP  = '━━━━━━━━━━━━━━━━━━━';
    const list = tags.slice(0, 20).map((t, i) => {
        const label = t.tag || t.name || t.label || String(t);
        const count = t.count || t.tagCount || '';
        return `│ ${String(i + 1).padStart(2, ' ')}. *${label}*${count ? ` _(${count}x)_` : ''}`;
    }).join('\n');
    return `╭─「 👤 *SIAPA YANG SIMPAN NOMORKU* 」\n│\n${list}\n│\n│ 📊 Total: *${tags.length} nama*\n╰──────────────────────\n🌐 _Sumber: web.getcontact.com_`;
}

function captionCariNomor(nomor, s, t) {
    const SEP  = '━━━━━━━━━━━━━━━━━━━';
    const d    = s || {};
    const nama     = d.name     || d.result?.name     || '-';
    const provider = d.provider || d.result?.provider || '-';
    const negara   = d.country  || d.result?.country  || '-';
    const tags     = t?.tags    || t?.result?.tags     || t?.data || [];
    const list     = Array.isArray(tags) && tags.length
        ? tags.slice(0, 15).map((x, i) => `│ ${String(i + 1).padStart(2, ' ')}. ${x.tag || x.name || x.label || String(x)}${(x.count || x.tagCount) ? ` _(${x.count || x.tagCount}x)_` : ''}`).join('\n')
        : null;
    return (
        `📋 *HASIL CEK GETCONTACT*\n${SEP}\n` +
        `📱 *Nomor*    : \`${nomor}\`\n` +
        `👤 *Nama*     : *${nama}*\n` +
        `📡 *Provider* : ${provider}\n` +
        `🌏 *Negara*   : ${negara}\n${SEP}\n` +
        (list ? `🏷️ *Nama di HP Orang Lain:*\n${list}\n${SEP}` : `ℹ️ _Tidak ada tag tersedia._\n${SEP}`) +
        `\n🌐 _Sumber: web.getcontact.com_`
    );
}

// ── POLLING QR BACKGROUND ─────────────────────────────────────────────────────

function startPolling({ jid, hisoka, m, hash, cookies, tolak, logCommand, afterLogin }) {
    let attempt = 0;
    const poll  = async () => {
        if (!_pendingLogin.has(jid)) return;
        if (++attempt > 40) {
            _pendingLogin.delete(jid);
            await tolak(hisoka, m, `⏰ *QR kadaluarsa!* Ketik perintah lagi untuk minta QR baru.`).catch(() => {});
            return;
        }
        try {
            const { scanned, cookies: nc } = await pollQr(hash, cookies);
            if (scanned) {
                _pendingLogin.delete(jid);
                const { hash: fh, cookies: fc } = await ambilHashFinal(nc);
                const ft = ambilToken(fc);
                if (!ft || !fh) { await tolak(hisoka, m, `❌ Login gagal. Coba lagi.`).catch(() => {}); return; }
                simpanSession(ft, fh);
                await afterLogin(ft, fh);
                logCommand(m, hisoka, 'getcontact-login');
                return;
            }
        } catch (_) {}
        setTimeout(poll, 2000);
    };
    setTimeout(poll, 2000);
}

// ── KIRIM QR HELPER ───────────────────────────────────────────────────────────

async function kirimQr({ hisoka, m, tolak, logCommand, afterLogin }) {
    const jid = m.from;
    if (_pendingLogin.has(jid)) {
        await tolak(hisoka, m, `⏳ Sudah ada QR yang menunggu scan. Scan dulu atau tunggu kadaluarsa (±80 detik).`);
        return;
    }
    const { hash, cookies, sudahLogin, token: existingToken } = await initSession();
    if (sudahLogin && existingToken && hash) {
        simpanSession(existingToken, hash);
        await afterLogin(existingToken, hash);
        return;
    }
    if (!hash) { await tolak(hisoka, m, `❌ Gagal ambil sesi GetContact. Coba lagi.`); return; }
    const { buf, cookies: qc } = await getQrBuf(cookies);
    _pendingLogin.set(jid, true);
    await hisoka.sendMessage(jid, {
        image  : buf,
        caption:
            `📱 *SCAN QR INI PAKAI APP GETCONTACT*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `1️⃣ Buka app *GetContact* di HP\n` +
            `2️⃣ Tap ⚙️ → *Perangkat Tertautan*\n` +
            `3️⃣ Tap *"Tambah Perangkat"* → scan\n\n` +
            `⏰ QR berlaku ±80 detik.\n` +
            `Setelah scan, bot otomatis lanjut! ✅`,
    }, { quoted: m });
    startPolling({ jid, hisoka, m, hash, cookies: qc, tolak, logCommand, afterLogin });
}

// ── COMMAND HANDLER UTAMA ─────────────────────────────────────────────────────

async function handleGetcontact({ hisoka, m, query, tolak, logCommand }) {
    const pfx   = m.prefix || '.';
    const input = (query || '').trim();

    // Cek apakah ada nomor yang di-query (selain kata kunci)
    const KEYWORDS = /^(login|logout|reset)$/i;
    const punya_nomor = input && !KEYWORDS.test(input) && /\d{5,}/.test(input.replace(/\D/g,''));

    // ── RESET/LOGOUT (owner) ──────────────────────────────────────────────────
    if (/^(logout|reset)$/i.test(input)) {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner.'); return; }
        hapusSession();
        _pendingLogin.delete(m.from);
        await tolak(hisoka, m, `✅ Sesi GetContact dihapus. Ketik *${pfx}getcontact* lagi untuk setup ulang.`);
        return;
    }

    // ── CEK NOMOR ORANG LAIN ──────────────────────────────────────────────────
    if (punya_nomor) {
        const sess = getSession();

        // Belum login → minta QR dulu, setelah scan langsung cek nomor
        if (!sess.token || !sess.hash) {
            await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
            await tolak(hisoka, m, `🔐 Perlu login GetContact dulu (sekali saja). Scan QR berikut:`);
            await kirimQr({
                hisoka, m, tolak, logCommand,
                afterLogin: async (token, hash) => {
                    // Setelah login, langsung cek nomor
                    await execCariNomor({ hisoka, m, tolak, logCommand, input, token, hash });
                },
            });
            return;
        }

        await execCariNomor({ hisoka, m, tolak, logCommand, input, token: sess.token, hash: sess.hash });
        return;
    }

    // ── TAMPILKAN SIAPA YANG SIMPAN NOMORKU (default, tanpa args) ────────────
    if (!input || /^login$/i.test(input)) {
        const sess = getSession();

        // Belum login → kirim QR, setelah scan langsung tampil tag
        if (!sess.token || !sess.hash) {
            await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
            await tolak(hisoka, m, `🔐 Perlu login GetContact sekali. Scan QR berikut:`);
            await kirimQr({
                hisoka, m, tolak, logCommand,
                afterLogin: async (token, hash) => {
                    await execTagKu({ hisoka, m, tolak, logCommand, token, hash });
                },
            }).catch(async e => {
                await tolak(hisoka, m, `❌ Gagal ambil QR: ${e.message}`);
            });
            return;
        }

        // Sudah login → langsung tampilkan
        await execTagKu({ hisoka, m, tolak, logCommand, token: sess.token, hash: sess.hash });
    }
}

// ── Tampilkan siapa yang simpan nomorku ───────────────────────────────────────

async function execTagKu({ hisoka, m, tolak, logCommand, token, hash }) {
    await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
    const loading = await tolak(hisoka, m, `🔍 *Mengambil daftar siapa yang simpan nomormu...*`);
    try {
        const tags = await ambilTagKu(token, hash);
        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});
        if (!tags || !tags.length) {
            await tolak(hisoka, m, `ℹ️ Tidak ada data tag ditemukan.\n\nKemungkinan sesi expired. Ketik *${m.prefix || '.'}getcontact reset* lalu coba lagi.`);
            return;
        }
        await tolak(hisoka, m, captionTagKu(tags));
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'getcontact');
    } catch (err) {
        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});
        await tolak(hisoka, m, `❌ Gagal: ${err.message}`);
    }
}

// ── Cari nomor orang lain ─────────────────────────────────────────────────────

async function execCariNomor({ hisoka, m, tolak, logCommand, input, token, hash }) {
    const nomor = formatNomor(input);
    if (nomor.replace(/\D/g, '').length < 8) {
        await tolak(hisoka, m, `❌ Nomor tidak valid: *${input}*`);
        return;
    }
    await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
    const loading = await tolak(hisoka, m, `🔍 *Mencari info ${nomor}...*`);
    try {
        const { search, tags } = await cariNomor(nomor, token, hash);
        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});
        if (search?.redirect === 'logout' || search?.status === 'error') {
            hapusSession();
            await tolak(hisoka, m, `❌ Sesi expired. Ketik perintah lagi untuk login ulang.`);
            return;
        }
        await tolak(hisoka, m, captionCariNomor(nomor, search, tags));
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'getcontact');
    } catch (err) {
        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});
        await tolak(hisoka, m, err?.response?.status === 403
            ? `❌ Sesi tidak valid. Ketik perintah lagi untuk login ulang.`
            : `❌ Gagal: ${err.message}`
        );
    }
}

module.exports = { handleGetcontact, getSession, simpanSession, ambilTagKu };
