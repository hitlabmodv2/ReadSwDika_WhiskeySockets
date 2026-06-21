'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const FILE_CONFIG = path.join(process.cwd(), 'config.json');
const BASE_URL    = 'https://web.getcontact.com';

// Simpan sesi login sementara (nomor → { hash, cookie, timer })
const _pendingLogin = new Map();

// ── CONFIG ────────────────────────────────────────────────────────────────────

function bacaConfig() {
    try {
        if (fs.existsSync(FILE_CONFIG)) return JSON.parse(fs.readFileSync(FILE_CONFIG, 'utf-8'));
    } catch (_) {}
    return {};
}

function simpanConfig(cfg) {
    try { fs.writeFileSync(FILE_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) {}
}

function getSession() {
    const cfg = bacaConfig();
    return { token: cfg?.getcontact?.token || '', hash: cfg?.getcontact?.hash || '' };
}

function simpanSession(token, hash) {
    const cfg = bacaConfig();
    if (!cfg.getcontact) cfg.getcontact = {};
    if (token) cfg.getcontact.token = token;
    if (hash)  cfg.getcontact.hash  = hash;
    simpanConfig(cfg);
}

// ── HEADERS ───────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function headersBrowser(cookie = '') {
    return {
        'User-Agent'     : UA,
        'Accept'         : 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(cookie ? { 'Cookie': cookie } : {}),
    };
}

function headersAjax(cookie = '') {
    return {
        'User-Agent'       : UA,
        'Accept'           : 'application/json, text/javascript, */*; q=0.01',
        'Content-Type'     : 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With' : 'XMLHttpRequest',
        'Origin'           : BASE_URL,
        'Referer'          : BASE_URL + '/search',
        ...(cookie ? { 'Cookie': cookie } : {}),
    };
}

// Ambil semua set-cookie jadi string cookie
function parseCookies(setCookieArr = []) {
    return (setCookieArr || []).map(c => c.split(';')[0]).join('; ');
}

// ── STEP 1: Ambil hash + cookie sesi dari halaman utama ──────────────────────

async function initSession() {
    const res  = await axios.get(BASE_URL, { headers: headersBrowser(), timeout: 20000 });
    const html = typeof res.data === 'string' ? res.data : '';
    const cookies = parseCookies(res.headers['set-cookie']);

    // Hash untuk user belum login
    const m1 = html.match(/hash:\s*'([a-fA-F0-9]+)'/);
    // Hash untuk user sudah login
    const m2 = html.match(/<input[^>]+name="hash"[^>]+value="([^"]+)"/);

    const hash     = m1?.[1] || m2?.[1] || '';
    const isLogged = !!m2?.[1];

    // Kalau sudah login, ambil accessToken dari cookie
    const tokenMatch = cookies.match(/accessToken=([^;]+)/);
    const token = isLogged && tokenMatch ? tokenMatch[1] : '';

    return { hash, cookies, isLogged, token };
}

// ── STEP 2: Ambil gambar QR ───────────────────────────────────────────────────

async function getQrImage(cookies) {
    const res = await axios.get(`${BASE_URL}/get-qr-code`, {
        responseType : 'arraybuffer',
        timeout      : 20000,
        headers      : { ...headersBrowser(cookies), 'Referer': BASE_URL + '/' },
    });
    // Gabung cookie baru kalau ada
    const newCookies = parseCookies(res.headers['set-cookie']);
    const merged = mergeCookies(cookies, newCookies);
    return { buf: Buffer.from(res.data), cookies: merged };
}

// ── STEP 3: Poll cek apakah QR sudah di-scan ─────────────────────────────────

async function checkQrScanned(hash, cookies) {
    const body = `hash=${encodeURIComponent(hash)}`;
    const res  = await axios.post(`${BASE_URL}/check-qr-code`, body, {
        timeout : 15000,
        headers : { ...headersAjax(cookies), 'Referer': BASE_URL + '/' },
    });
    const newCookies = parseCookies(res.headers['set-cookie']);
    const merged     = mergeCookies(cookies, newCookies);
    return { scanned: !!res.data?.checkResult, cookies: merged };
}

// ── STEP 4: Ambil hash final setelah login ────────────────────────────────────

async function getHashAfterLogin(cookies) {
    const res  = await axios.get(BASE_URL, { headers: headersBrowser(cookies), timeout: 20000 });
    const html = typeof res.data === 'string' ? res.data : '';
    const m    = html.match(/<input[^>]+name="hash"[^>]+value="([^"]+)"/);
    const newCookies = parseCookies(res.headers['set-cookie']);
    return { hash: m?.[1] || '', cookies: mergeCookies(cookies, newCookies) };
}

// ── UTILS: Merge cookies ──────────────────────────────────────────────────────

function mergeCookies(base, incoming) {
    if (!incoming) return base;
    const map = new Map();
    const parse = str => (str || '').split(';').map(s => s.trim()).filter(Boolean);
    parse(base).forEach(c => { const [k,v]= c.split('='); if(k&&v) map.set(k.trim(), v.trim()); });
    parse(incoming).forEach(c => { const [k,v]= c.split('='); if(k&&v) map.set(k.trim(), v.trim()); });
    return [...map.entries()].map(([k,v]) => `${k}=${v}`).join('; ');
}

function extractToken(cookies) {
    const m = (cookies || '').match(/accessToken=([^;]+)/);
    return m?.[1] || '';
}

// ── SEARCH + TAG ──────────────────────────────────────────────────────────────

async function cariNomor(phoneNumber, token, hash) {
    const cookie = `accessToken=${token}; lang=en;`;
    const body   = `hash=${encodeURIComponent(hash)}&phoneNumber=${encodeURIComponent(phoneNumber)}`;

    const [searchRes, tagRes] = await Promise.allSettled([
        axios.post(`${BASE_URL}/search`, body, { headers: headersAjax(cookie), timeout: 20000 }),
        axios.post(`${BASE_URL}/list-tag`, body, { headers: headersAjax(cookie), timeout: 20000 }),
    ]);

    return {
        search: searchRes.status === 'fulfilled' ? searchRes.value.data : {},
        tags  : tagRes.status    === 'fulfilled' ? tagRes.value.data    : {},
    };
}

// ── FORMAT NOMOR ──────────────────────────────────────────────────────────────

function formatNomor(input) {
    let n = input.replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return '+' + n;
}

// ── FORMAT CAPTION ────────────────────────────────────────────────────────────

function buatCaption(nomor, searchData, tagData) {
    const SEP = '━━━━━━━━━━━━━━━━━━━';
    const d   = searchData || {};

    const nama     = d.name     || d.result?.name     || '-';
    const provider = d.provider || d.result?.provider || '-';
    const negara   = d.country  || d.result?.country  || '-';

    const tags = tagData?.tags || tagData?.result?.tags || tagData?.data || [];
    let tagList = '';
    if (Array.isArray(tags) && tags.length) {
        tagList = tags.slice(0, 15).map((t, i) => {
            const label = t.tag || t.name || t.label || String(t);
            const count = t.count || t.tagCount || '';
            return `│ ${String(i+1).padStart(2,' ')}. ${label}${count ? ` _(${count}x)_` : ''}`;
        }).join('\n');
    }

    return (
        `📋 *HASIL CEK GETCONTACT*\n` +
        `${SEP}\n` +
        `📱 *Nomor*    : \`${nomor}\`\n` +
        `👤 *Nama*     : *${nama}*\n` +
        `📡 *Provider* : ${provider}\n` +
        `🌏 *Negara*   : ${negara}\n` +
        `${SEP}\n` +
        (tagList
            ? `🏷️ *Nama di HP Orang Lain:*\n${tagList}\n${SEP}`
            : `ℹ️ _Tidak ada tag yang tersedia._\n${SEP}`) +
        `\n🌐 _Sumber: web.getcontact.com_`
    );
}

// ── POLLING QR (background) ───────────────────────────────────────────────────

async function startPolling(jid, hisoka, m, hash, cookies, tolak, logCommand) {
    const MAX    = 40;   // maks 40x poll = ~80 detik
    const DELAY  = 2000; // tiap 2 detik
    let attempt  = 0;

    const poll = async () => {
        if (!_pendingLogin.has(jid)) return; // dibatalkan
        attempt++;
        if (attempt > MAX) {
            _pendingLogin.delete(jid);
            await tolak(hisoka, m, `⏰ *QR kadaluarsa!* Silakan ulangi: *.getcontact login*`).catch(() => {});
            return;
        }
        try {
            const { scanned, cookies: newCookies } = await checkQrScanned(hash, cookies);
            if (scanned) {
                _pendingLogin.delete(jid);
                // Ambil hash final setelah login
                const { hash: finalHash, cookies: finalCookies } = await getHashAfterLogin(newCookies);
                const finalToken = extractToken(finalCookies);
                if (!finalToken || !finalHash) {
                    await tolak(hisoka, m, `❌ *Login gagal.* Token tidak ditemukan. Coba lagi: *.getcontact login*`).catch(() => {});
                    return;
                }
                simpanSession(finalToken, finalHash);
                await tolak(hisoka, m,
                    `✅ *Login GetContact berhasil!*\n\n` +
                    `Token & hash sudah tersimpan otomatis.\n` +
                    `Sekarang bisa langsung cek nomor:\n` +
                    `*${m.prefix || '.'}gtc 08xxxxxxxxx*`
                ).catch(() => {});
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } }).catch(() => {});
                logCommand(m, hisoka, 'getcontact-login');
                return;
            }
        } catch (_) {}

        setTimeout(poll, DELAY);
    };

    setTimeout(poll, DELAY);
}

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleGetcontact({ hisoka, m, query, tolak, logCommand }) {
    const pfx  = m.prefix || '.';
    const args = (query || '').trim().split(/\s+/);
    const sub  = (args[0] || '').toLowerCase();

    // ── LOGIN via QR ──────────────────────────────────────────────────────────
    if (sub === 'login') {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner yang bisa login.'); return; }

        // Cegah login ganda
        if (_pendingLogin.has(m.from)) {
            await tolak(hisoka, m, `⏳ *Sedang menunggu scan QR!*\nScan dulu QR yang sudah dikirim, atau tunggu kadaluarsa.`);
            return;
        }

        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

        try {
            // Ambil hash + cookie sesi
            const { hash, cookies, isLogged, token } = await initSession();

            if (isLogged && token && hash) {
                simpanSession(token, hash);
                await tolak(hisoka, m, `✅ *Sudah login!* Token diperbarui otomatis.\n\nCek nomor: *${pfx}gtc 08xxxxxxxxx*`);
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                return;
            }

            if (!hash) {
                await tolak(hisoka, m, `❌ Gagal ambil sesi dari GetContact. Coba lagi.`);
                return;
            }

            // Ambil gambar QR
            const { buf: qrBuf, cookies: qrCookies } = await getQrImage(cookies);

            // Simpan pending
            _pendingLogin.set(m.from, { hash, cookies: qrCookies });

            // Kirim QR ke user
            await hisoka.sendMessage(m.from, {
                image  : qrBuf,
                caption:
                    `📱 *LOGIN GETCONTACT*\n` +
                    `━━━━━━━━━━━━━━━━━━━\n` +
                    `Scan QR ini pakai *app GetContact* di HP kamu:\n\n` +
                    `1️⃣ Buka app *GetContact* di HP\n` +
                    `2️⃣ Tap ikon ⚙️ (Pengaturan)\n` +
                    `3️⃣ Pilih *"Perangkat Tertautan"*\n` +
                    `4️⃣ Tap *"Tambah Perangkat"* → scan QR\n\n` +
                    `⏰ QR berlaku ±80 detik. Bot akan otomatis konfirmasi setelah scan.`,
            }, { quoted: m });

            // Mulai polling background
            startPolling(m.from, hisoka, m, hash, qrCookies, tolak, logCommand);

        } catch (err) {
            _pendingLogin.delete(m.from);
            await tolak(hisoka, m, `❌ Gagal ambil QR GetContact.\n_${err.message}_`);
        }
        return;
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    if (sub === 'logout') {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner.'); return; }
        const cfg = bacaConfig();
        if (cfg.getcontact) { delete cfg.getcontact; simpanConfig(cfg); }
        _pendingLogin.delete(m.from);
        await tolak(hisoka, m, `✅ *Sesi GetContact dihapus.* Login lagi dengan *${pfx}getcontact login*`);
        return;
    }

    // ── STATUS ────────────────────────────────────────────────────────────────
    if (sub === 'status') {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner.'); return; }
        const sess = getSession();
        await tolak(hisoka, m,
            `╭─「 📋 *STATUS GETCONTACT* 」\n│\n` +
            `│ Token : ${sess.token ? `✅ Tersimpan` : '❌ Belum login'}\n` +
            `│ Hash  : ${sess.hash  ? `✅ Tersimpan` : '❌ Belum login'}\n│\n` +
            `│ ${sess.token && sess.hash ? '🟢 Siap digunakan!' : `🔴 Belum login — ketik *${pfx}getcontact login*`}\n` +
            `╰──────────────────────`
        );
        return;
    }

    // ── HELP / TIDAK ADA QUERY ────────────────────────────────────────────────
    if (!query || sub === 'help') {
        const sess = getSession();
        await tolak(hisoka, m,
            `╭─「 📋 *GETCONTACT — CEK NAMA DI HP ORANG* 」\n│\n` +
            `│ Status: ${sess.token ? '🟢 Sudah login' : `🔴 Belum login — *${pfx}getcontact login*`}\n│\n` +
            `│ *Cek nomor:*\n` +
            `│ • ${pfx}getcontact 08xxxxxxxxx\n` +
            `│ • ${pfx}gtc 628xxxxxxxxx\n│\n` +
            `│ *Login/Logout (owner):*\n` +
            `│ • ${pfx}getcontact login — scan QR pakai app\n` +
            `│ • ${pfx}getcontact logout — hapus sesi\n` +
            `│ • ${pfx}getcontact status — cek status login\n│\n` +
            `│ 💡 Hasil: nama simpanan orang, provider,\n` +
            `│    negara & semua label/tag nomor.\n` +
            `╰──────────────────────`
        );
        return;
    }

    // ── CEK NOMOR ─────────────────────────────────────────────────────────────
    const sess = getSession();
    if (!sess.token || !sess.hash) {
        await tolak(hisoka, m,
            `❌ *Belum login GetContact!*\n\n` +
            `Owner ketik: *${pfx}getcontact login*\n` +
            `Lalu scan QR pakai app GetContact di HP.`
        );
        return;
    }

    const nomor = formatNomor(query.trim());
    if (nomor.replace(/\D/g,'').length < 8) {
        await tolak(hisoka, m, `❌ Nomor tidak valid: *${query}*\nContoh: *${pfx}gtc 08123456789*`);
        return;
    }

    await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
    const loading = await tolak(hisoka, m, `🔍 *Mencari info ${nomor} di GetContact...*`);

    try {
        const { search, tags } = await cariNomor(nomor, sess.token, sess.hash);

        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});

        // Sesi kadaluarsa
        if (search?.redirect === 'logout' || search?.status === 'error') {
            await tolak(hisoka, m, `❌ *Sesi kadaluarsa!* Login ulang: *${pfx}getcontact login*`);
            return;
        }

        const caption = buatCaption(nomor, search, tags);
        await tolak(hisoka, m, caption);
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'getcontact');

    } catch (err) {
        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
        const pesan = err?.response?.status === 403
            ? `❌ *Sesi tidak valid.* Login ulang: *${pfx}getcontact login*`
            : `❌ *Gagal ambil data.*\n_${err?.message}_`;
        await tolak(hisoka, m, pesan);
    }
}

module.exports = { handleGetcontact, getSession, simpanSession };
