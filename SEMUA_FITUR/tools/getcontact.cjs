'use strict';

const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const FILE_CONFIG = path.join(process.cwd(), 'config.json');
const BASE_URL    = 'https://web.getcontact.com';

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
    return {
        token : cfg?.getcontact?.token || '',
        hash  : cfg?.getcontact?.hash  || '',
    };
}

function simpanSession(token, hash) {
    const cfg = bacaConfig();
    if (!cfg.getcontact) cfg.getcontact = {};
    if (token) cfg.getcontact.token = token;
    if (hash)  cfg.getcontact.hash  = hash;
    simpanConfig(cfg);
}

// ── HEADERS ───────────────────────────────────────────────────────────────────

function buatHeaders(token) {
    return {
        'accept'          : 'application/json, text/javascript, */*; q=0.01',
        'accept-language' : 'en-US,en;q=0.9,id;q=0.8',
        'content-type'    : 'application/x-www-form-urlencoded; charset=UTF-8',
        'cookie'          : `accessToken=${token}; lang=en;`,
        'origin'          : BASE_URL,
        'referer'         : `${BASE_URL}/search`,
        'sec-fetch-dest'  : 'empty',
        'sec-fetch-mode'  : 'cors',
        'sec-fetch-site'  : 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        'user-agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    };
}

// ── SEARCH NOMOR ──────────────────────────────────────────────────────────────

async function searchNomor(phoneNumber, token, hash) {
    const body = `hash=${encodeURIComponent(hash)}&phoneNumber=${encodeURIComponent(phoneNumber)}`;
    const res  = await axios.post(`${BASE_URL}/search`, body, {
        headers : buatHeaders(token),
        timeout : 20000,
    });
    return res.data;
}

// ── AMBIL SEMUA TAG ───────────────────────────────────────────────────────────

async function getAllTags(phoneNumber, token, hash) {
    const body = `hash=${encodeURIComponent(hash)}&phoneNumber=${encodeURIComponent(phoneNumber)}`;
    const res  = await axios.post(`${BASE_URL}/list-tag`, body, {
        headers : buatHeaders(token),
        timeout : 20000,
    });
    return res.data;
}

// ── FORMAT NOMOR ──────────────────────────────────────────────────────────────

function formatNomor(input) {
    let n = input.replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    if (!n.startsWith('+')) n = '+' + n;
    return n;
}

// ── FORMAT CAPTION HASIL ──────────────────────────────────────────────────────

function buatCaption(nomor, searchData, tagData) {
    const SEP = '━━━━━━━━━━━━━━━━━━━';

    const nama     = searchData?.name     || searchData?.result?.name     || '-';
    const provider = searchData?.provider || searchData?.result?.provider || '-';
    const negara   = searchData?.country  || searchData?.result?.country  || '-';

    let tagList = '';
    const tags = tagData?.tags || tagData?.result?.tags || tagData?.data || [];
    if (Array.isArray(tags) && tags.length) {
        tagList = tags.slice(0, 15).map((t, i) => {
            const label = t.tag || t.name || t.label || t;
            const count = t.count || t.tagCount || '';
            return `│ ${String(i+1).padStart(2,' ')}. ${label}${count ? ` (${count}x)` : ''}`;
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
            ? `🏷️ *Nama di HP Orang Lain (Tag):*\n${tagList}\n${SEP}`
            : `ℹ️ _Tidak ada tag yang tersedia._\n${SEP}`) +
        `\n🌐 _Sumber: web.getcontact.com_`
    );
}

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleGetcontact({ hisoka, m, query, tolak, logCommand }) {
    const pfx  = m.prefix || '.';
    const args = (query || '').trim().split(/\s+/);
    const sub  = (args[0] || '').toLowerCase();

    // ── SET TOKEN ──
    if (sub === 'settoken') {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner yang bisa set token.'); return; }
        const token = args.slice(1).join(' ').trim();
        if (!token) {
            await tolak(hisoka, m,
                `╭─「 🔑 *SET TOKEN GETCONTACT* 」\n│\n` +
                `│ Format: *${pfx}getcontact settoken <token>*\n│\n` +
                `│ 📖 *Cara dapat token:*\n` +
                `│ 1. Buka https://web.getcontact.com di PC\n` +
                `│ 2. Login scan QR code\n` +
                `│ 3. Install ekstensi EditThisCookie\n` +
                `│ 4. Salin nilai *accessToken* dari cookie\n` +
                `│ 5. Ketik: ${pfx}getcontact settoken <nilai token>\n` +
                `╰──────────────────────`
            );
            return;
        }
        simpanSession(token, '');
        await tolak(hisoka, m, `✅ *Token GetContact berhasil disimpan!*\n\nSelanjutnya set hash:\n*${pfx}getcontact sethash <hash>*\n\n_Cara dapat hash: buka web.getcontact.com, cari nomor sembarang, lalu lihat Network tab → request ke /search → ambil nilai "hash" dari form data._`);
        logCommand(m, hisoka, 'getcontact-settoken');
        return;
    }

    // ── SET HASH ──
    if (sub === 'sethash') {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner yang bisa set hash.'); return; }
        const hash = args.slice(1).join(' ').trim();
        if (!hash) {
            await tolak(hisoka, m, `❌ Format: *${pfx}getcontact sethash <hash>*`);
            return;
        }
        simpanSession('', hash);
        await tolak(hisoka, m, `✅ *Hash GetContact berhasil disimpan!*\n\nSekarang bisa cek nomor:\n*${pfx}getcontact 08xxxxxxxxx*`);
        logCommand(m, hisoka, 'getcontact-sethash');
        return;
    }

    // ── STATUS ──
    if (sub === 'status') {
        if (!m.isOwner) { await tolak(hisoka, m, '❌ Hanya owner yang bisa lihat status.'); return; }
        const sess = getSession();
        await tolak(hisoka, m,
            `╭─「 📋 *STATUS GETCONTACT* 」\n│\n` +
            `│ Token : ${sess.token ? `✅ _${sess.token.slice(0,8)}..._` : '❌ Belum diset'}\n` +
            `│ Hash  : ${sess.hash  ? `✅ _${sess.hash.slice(0,8)}..._`  : '❌ Belum diset'}\n│\n` +
            `│ ${sess.token && sess.hash ? '🟢 Siap digunakan!' : '🔴 Belum lengkap — set token & hash dulu.'}\n` +
            `╰──────────────────────`
        );
        return;
    }

    // ── HELP ──
    if (!query || sub === 'help') {
        await tolak(hisoka, m,
            `╭─「 📋 *GETCONTACT — CEK NAMA DI HP ORANG* 」\n│\n` +
            `│ *Cek nomor:*\n` +
            `│ • ${pfx}getcontact 08xxxxxxxxx\n` +
            `│ • ${pfx}gtc 628xxxxxxxxx\n│\n` +
            `│ *Setup (owner):*\n` +
            `│ • ${pfx}getcontact settoken <token>\n` +
            `│ • ${pfx}getcontact sethash <hash>\n` +
            `│ • ${pfx}getcontact status\n│\n` +
            `│ 💡 Hasilnya: nama di HP orang lain,\n` +
            `│    provider, negara & semua tag/label.\n` +
            `│ 🌐 Sumber: web.getcontact.com\n` +
            `╰──────────────────────`
        );
        return;
    }

    // ── CEK NOMOR ──
    const sess = getSession();
    if (!sess.token || !sess.hash) {
        await tolak(hisoka, m,
            `❌ *GetContact belum dikonfigurasi!*\n\n` +
            `Owner harus set dulu:\n` +
            `1️⃣ *${pfx}getcontact settoken <token>*\n` +
            `2️⃣ *${pfx}getcontact sethash <hash>*\n\n` +
            `_Cara dapat token & hash: ketik ${pfx}getcontact help_`
        );
        return;
    }

    const nomor = formatNomor(query.trim());
    if (nomor.length < 8) {
        await tolak(hisoka, m, `❌ Nomor tidak valid: *${query}*\n\nContoh: *${pfx}getcontact 08123456789*`);
        return;
    }

    await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
    const loading = await tolak(hisoka, m, `🔍 *Mencari info nomor ${nomor} di GetContact...*`);

    try {
        // Fetch search + tags secara paralel
        const [searchRes, tagRes] = await Promise.allSettled([
            searchNomor(nomor, sess.token, sess.hash),
            getAllTags(nomor, sess.token, sess.hash),
        ]);

        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});

        const searchData = searchRes.status === 'fulfilled' ? searchRes.value : {};
        const tagData    = tagRes.status    === 'fulfilled' ? tagRes.value    : {};

        // Cek session expired / error
        if (searchData?.redirect === 'logout' || searchData?.status === 'error') {
            await tolak(hisoka, m,
                `❌ *Sesi GetContact kadaluarsa!*\n\n` +
                `Owner perlu perbarui token:\n*${pfx}getcontact settoken <token baru>*`
            );
            return;
        }

        const caption = buatCaption(nomor, searchData, tagData);
        await tolak(hisoka, m, caption);
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'getcontact');

    } catch (err) {
        await hisoka.sendMessage(m.from, { delete: loading.key }).catch(() => {});
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        const pesan = err?.response?.status === 403
            ? `❌ *Token tidak valid atau kadaluarsa.*\n\nPerbarui token:\n*${pfx}getcontact settoken <token baru>*`
            : `❌ *Gagal mengambil data GetContact.*\n\n_${err?.message || 'Unknown error'}_`;
        await tolak(hisoka, m, pesan);
    }
}

module.exports = { handleGetcontact, getSession, simpanSession };
