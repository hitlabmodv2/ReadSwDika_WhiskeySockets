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
 *  imageEdit.cjs — Generate gambar AI via NanoBanana
 *  Text-to-image gratis tanpa API key via nanobanana.im
 * ───────────────────────────────
 */

'use strict';

const axios = require('axios');

const BASE_HEADERS = {
    'user-agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'accept'          : 'application/json, text/plain, */*',
    'accept-language' : 'id,en;q=0.9',
    'origin'          : 'https://nanobanana.im',
};

const delay = ms => new Promise(r => setTimeout(r, ms));

// ── Kelola cookies dari multiple Set-Cookie header ──
function updateCookies(oldCk, newSetCookies) {
    if (!newSetCookies) return oldCk || '';
    const map = new Map();
    if (oldCk) {
        oldCk.split(';').forEach(c => {
            const p = c.trim().split('=');
            if (p[0]) map.set(p[0].trim(), p.slice(1).join('='));
        });
    }
    newSetCookies.forEach(c => {
        const p = c.split(';')[0].trim().split('=');
        if (p[0]) map.set(p[0].trim(), p.slice(1).join('='));
    });
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ── Follow redirect manual agar cookies tidak hilang ──
async function followRedirects(session, url, ck, maxHops = 10) {
    let currentUrl = url;
    let currentCk  = ck;
    for (let hop = 0; hop < maxHops; hop++) {
        const res = await session.get(currentUrl, {
            headers        : { ...BASE_HEADERS, Cookie: currentCk },
            maxRedirects   : 0,
            validateStatus : s => s >= 200 && s < 400,
            timeout        : 12000,
        });
        currentCk = updateCookies(currentCk, res.headers['set-cookie']);
        if (res.status < 300) break;
        const loc = res.headers['location'];
        if (!loc) break;
        currentUrl = loc.startsWith('http') ? loc : 'https://nanobanana.im' + loc;
    }
    return currentCk;
}

// ── Tunggu magic link masuk di inbox tempmail ──
async function waitMagicLink(email, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
        await delay(3000);
        try {
            const res = await axios.get(
                `https://api.tempmail.ing/api/emails/${encodeURIComponent(email)}`,
                { headers: BASE_HEADERS, timeout: 10000 }
            );
            if (res.data?.emails?.length > 0) {
                const text  = res.data.emails[0].text || res.data.emails[0].html || '';
                const match = text.match(
                    /https:\/\/nanobanana\.im\/api\/auth\/magic-link\/verify\?token=[^\s"'<>&]+/
                );
                if (match) return match[0];
            }
        } catch (_) { /* lanjut */ }
    }
    throw new Error('Magic link tidak ditemukan, coba lagi.');
}

/**
 * Generate gambar dari teks via NanoBanana (gratis, tanpa API key)
 *
 * @param {string} prompt  - Deskripsi gambar yang ingin dibuat
 * @param {object} opts    - { maxPollAttempts }
 * @returns {Promise<{status:boolean, url?:string, error?:string}>}
 */
async function nanobananaGenerate(prompt, opts = {}) {
    const maxPoll = opts.maxPollAttempts ?? 24;

    // 1. Buat tempmail
    const mailRes = await axios.post(
        'https://api.tempmail.ing/api/generate', {},
        { headers: BASE_HEADERS, timeout: 10000 }
    );
    if (!mailRes.data?.success) throw new Error('Gagal buat tempmail.');
    const email = mailRes.data.email.address;

    const session = axios.create({ headers: BASE_HEADERS });
    let ck = '';

    // 2. Init session nanobanana
    const initRes = await session.get('https://nanobanana.im/', {
        maxRedirects: 0, validateStatus: s => s < 400, timeout: 10000,
    });
    ck = updateCookies(ck, initRes.headers['set-cookie']);

    // 3. Kirim magic link ke email
    const magicRes = await session.post(
        'https://nanobanana.im/api/auth/sign-in/magic-link',
        { email, callbackURL: '/' },
        { headers: { ...BASE_HEADERS, Cookie: ck }, timeout: 10000 }
    );
    if (!magicRes.data?.status) throw new Error('Gagal kirim magic link.');

    // 4. Tunggu magic link di inbox
    const link = await waitMagicLink(email);

    // 5. Verify login (follow redirect manual agar cookie aman)
    ck = await followRedirects(session, link, ck);

    // Refresh homepage untuk finalisasi sesi
    const homeRes = await session.get('https://nanobanana.im/', {
        headers: { ...BASE_HEADERS, Cookie: ck },
        maxRedirects: 0, validateStatus: s => s < 400, timeout: 10000,
    });
    ck = updateCookies(ck, homeRes.headers['set-cookie']);

    if (!ck) throw new Error('Gagal login ke nanobanana, session kosong.');

    // 6. Buat task generate gambar
    const taskRes = await session.post(
        'https://nanobanana.im/api/img/nano-banana5',
        {
            prompt,
            dimension         : 'auto',
            aspect_ratio      : 'auto',
            image_urls        : [],
            num_images        : '1',
            batchSize         : 1,
            turnstileToken    : '',
            skipVerification  : false,
            image_path        : 'hero',
            size              : '2K',
            resolution        : '2K',
            output_format     : 'png',
        },
        { headers: { ...BASE_HEADERS, Cookie: ck, 'content-type': 'application/json' }, timeout: 15000 }
    );

    if (!taskRes.data?.taskId) {
        throw new Error('Gagal buat task: ' + JSON.stringify(taskRes.data));
    }
    const taskId = taskRes.data.taskId;

    // 7. Poll hasil task
    for (let i = 0; i < maxPoll; i++) {
        await delay(5000);
        const checkRes = await session.post(
            'https://nanobanana.im/api/img/nano-banana5/taskResult',
            { taskId },
            { headers: { ...BASE_HEADERS, Cookie: ck }, timeout: 10000 }
        );
        const d = checkRes.data;
        // Sukses
        if (d?.status === 1 && d?.imgAfterSrc) {
            return { status: true, url: d.imgAfterSrc };
        }
        // Gagal terminal dari provider — tidak perlu tunggu terus
        if (d?.status === -1 || d?.status === 2 ||
            (typeof d?.message === 'string' && /fail|error|rejected/i.test(d.message))) {
            throw new Error(`NanoBanana error: ${d?.message || 'unknown error'}`);
        }
    }

    throw new Error('Timeout menunggu hasil gambar dari NanoBanana.');
}

module.exports = { nanobananaGenerate };

// ── HANDLER: aiedit / editgambar ──────────────────────────────────────────────

async function handleAiedit({ hisoka, m, query, tolak, logCommand, downloadMediaMessage }) {
    try {
        const prompt = query?.trim();

        if (!prompt) {
            await tolak(hisoka, m,
                `╭═══『 🎨 *AI Image Generator* 』═══╮\n│\n` +
                `│ Buat gambar dari teks pakai AI!\n│\n` +
                `│ *Cara Pakai:*\n` +
                `│ Ketik command + deskripsi gambar:\n│\n` +
                `│ *.editgambar* [deskripsi gambar]\n│\n` +
                `│ *Contoh:*\n` +
                `│ *.editgambar* anime girl cyberpunk\n` +
                `│ *.editgambar* sunset at the beach 4K\n` +
                `│ *.editgambar* kucing lucu memakai topi\n│\n` +
                `│ Alias: *.editai* / *.aiedit*\n│\n` +
                `│ ⏱ Estimasi: ~30-60 detik\n│\n` +
                `╰══════════════════════════════╯`
            );
            return;
        }

        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        await tolak(hisoka, m,
            `⏳ Sedang membuat gambar...\n` +
            `📝 Prompt: _"${prompt}"_\n` +
            `🔄 Proses login + generate (~30-60 detik), mohon tunggu.`
        );

        const result = await nanobananaGenerate(prompt);

        if (!result.status || !result.url) {
            throw new Error(result.error || 'NanoBanana gagal generate gambar.');
        }

        // Download hasil gambar
        const imgFetch = await axios.get(result.url, { responseType: 'arraybuffer', timeout: 20000 });
        const imgBuffer = Buffer.from(imgFetch.data);

        await hisoka.sendMessage(m.from, {
            image  : imgBuffer,
            caption:
                `✅ *Gambar berhasil dibuat!*\n` +
                `📝 Prompt: _"${prompt}"_\n` +
                `🔗 Powered by NanoBanana AI`,
        }, { quoted: m });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'editgambar');

    } catch (error) {
        console.error('\x1b[31m[EditGambar] Error:\x1b[39m', error.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await tolak(hisoka, m, `❌ Gagal generate gambar: ${error.message}`);
    }
}

module.exports.handleAiedit = handleAiedit;
