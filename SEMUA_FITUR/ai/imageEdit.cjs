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
 *  imageEdit.cjs — AI Image Editor + Generator
 *  • Kirim gambar + prompt → edit via StableHorde (img2img)
 *  • Cuma prompt saja      → generate via NanaBanana (txt2img)
 * ───────────────────────────────
 */

'use strict';

const axios = require('axios');

const delay = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════
//  BAGIAN 1 — StableHorde img2img (edit gambar existing)
// ═══════════════════════════════════════════════════════

const HORDE_API  = 'https://stablehorde.net/api/v2';
const HORDE_KEY  = '0000000000'; // anonymous free key

/**
 * Edit gambar dengan prompt via StableHorde (img2img, gratis, tanpa API key)
 *
 * @param {Buffer} imageBuffer  - Buffer gambar input
 * @param {string} prompt       - Instruksi edit
 * @param {object} opts         - { denoise, steps, model, maxPoll }
 * @returns {Promise<{status:boolean, buffer?:Buffer, error?:string}>}
 */
async function stablehordeImg2img(imageBuffer, prompt, opts = {}) {
    const denoise  = opts.denoise  ?? 0.7;
    const steps    = opts.steps    ?? 20;
    const model    = opts.model    ?? 'Deliberate';
    const maxPoll  = opts.maxPoll  ?? 40;

    const b64 = imageBuffer.toString('base64');

    // Submit job
    const submitRes = await fetch(`${HORDE_API}/generate/async`, {
        method  : 'POST',
        headers : { 'content-type': 'application/json', 'apikey': HORDE_KEY },
        body    : JSON.stringify({
            prompt,
            params: {
                width              : 512,
                height             : 512,
                steps,
                sampler_name       : 'k_euler',
                cfg_scale          : 7,
                denoising_strength : denoise,
            },
            source_image      : b64,
            source_processing : 'img2img',
            models            : [model],
            r2                : true,
            shared            : false,
        }),
    });

    if (!submitRes.ok) {
        const err = await submitRes.text().catch(() => submitRes.status);
        throw new Error(`StableHorde submit gagal: ${err}`);
    }

    const { id: jobId } = await submitRes.json();
    if (!jobId) throw new Error('StableHorde tidak mengembalikan job ID.');

    // Poll status
    for (let i = 0; i < maxPoll; i++) {
        await delay(5000);

        const checkRes  = await fetch(`${HORDE_API}/generate/check/${jobId}`, {
            headers: { 'apikey': HORDE_KEY },
        });
        const checkData = await checkRes.json();

        if (checkData.faulted) throw new Error('StableHorde: job gagal (faulted).');

        if (checkData.done) {
            const statusRes  = await fetch(`${HORDE_API}/generate/status/${jobId}`, {
                headers: { 'apikey': HORDE_KEY },
            });
            const statusData = await statusRes.json();
            const gen        = statusData.generations?.[0];

            if (!gen?.img) throw new Error('StableHorde: hasil gambar tidak ada.');

            // Download hasil
            const imgRes = await fetch(gen.img);
            if (!imgRes.ok) throw new Error(`Gagal download hasil: ${imgRes.status}`);
            const buf = Buffer.from(await imgRes.arrayBuffer());
            return { status: true, buffer: buf };
        }
    }

    throw new Error('Timeout menunggu hasil edit dari StableHorde.');
}

// ═══════════════════════════════════════════════════════
//  BAGIAN 2 — NanaBanana txt2img (generate gambar baru)
// ═══════════════════════════════════════════════════════

const NB_HEADERS = {
    'user-agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    'accept'          : 'application/json, text/plain, */*',
    'accept-language' : 'id,en;q=0.9',
    'origin'          : 'https://nanobanana.im',
};

function updateCookies(oldCk, newSetCookies) {
    if (!newSetCookies) return oldCk || '';
    const map = new Map();
    if (oldCk) oldCk.split(';').forEach(c => {
        const p = c.trim().split('=');
        if (p[0]) map.set(p[0].trim(), p.slice(1).join('='));
    });
    newSetCookies.forEach(c => {
        const p = c.split(';')[0].trim().split('=');
        if (p[0]) map.set(p[0].trim(), p.slice(1).join('='));
    });
    return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function followRedirects(session, url, ck, maxHops = 10) {
    let currentUrl = url;
    let currentCk  = ck;
    for (let hop = 0; hop < maxHops; hop++) {
        const res = await session.get(currentUrl, {
            headers        : { ...NB_HEADERS, Cookie: currentCk },
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

async function waitMagicLink(email, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
        await delay(3000);
        try {
            const res = await axios.get(
                `https://api.tempmail.ing/api/emails/${encodeURIComponent(email)}`,
                { headers: NB_HEADERS, timeout: 10000 }
            );
            if (res.data?.emails?.length > 0) {
                const text  = res.data.emails[0].text || res.data.emails[0].html || '';
                const match = text.match(
                    /https:\/\/nanobanana\.im\/api\/auth\/magic-link\/verify\?token=[^\s"'<>&]+/
                );
                if (match) return match[0];
            }
        } catch (_) {}
    }
    throw new Error('Magic link tidak ditemukan, coba lagi.');
}

/**
 * Generate gambar baru dari teks via NanaBanana (txt2img, gratis, tanpa API key)
 *
 * @param {string} prompt       - Deskripsi gambar
 * @param {object} opts         - { maxPollAttempts }
 * @returns {Promise<{status:boolean, buffer?:Buffer, error?:string}>}
 */
async function nanobananaGenerate(prompt, opts = {}) {
    const maxPoll = opts.maxPollAttempts ?? 24;

    const mailRes = await axios.post(
        'https://api.tempmail.ing/api/generate', {},
        { headers: NB_HEADERS, timeout: 10000 }
    );
    if (!mailRes.data?.success) throw new Error('Gagal buat tempmail.');
    const email = mailRes.data.email.address;

    const session = axios.create({ headers: NB_HEADERS });
    let ck = '';

    const initRes = await session.get('https://nanobanana.im/', {
        maxRedirects: 0, validateStatus: s => s < 400, timeout: 10000,
    });
    ck = updateCookies(ck, initRes.headers['set-cookie']);

    const magicRes = await session.post(
        'https://nanobanana.im/api/auth/sign-in/magic-link',
        { email, callbackURL: '/' },
        { headers: { ...NB_HEADERS, Cookie: ck }, timeout: 10000 }
    );
    if (!magicRes.data?.status) throw new Error('Gagal kirim magic link.');

    const link = await waitMagicLink(email);
    ck = await followRedirects(session, link, ck);

    const homeRes = await session.get('https://nanobanana.im/', {
        headers: { ...NB_HEADERS, Cookie: ck },
        maxRedirects: 0, validateStatus: s => s < 400, timeout: 10000,
    });
    ck = updateCookies(ck, homeRes.headers['set-cookie']);
    if (!ck) throw new Error('Gagal login ke NanaBanana, session kosong.');

    const taskRes = await session.post(
        'https://nanobanana.im/api/img/nano-banana5',
        {
            prompt,
            dimension        : 'auto',
            aspect_ratio     : 'auto',
            image_urls       : [],
            num_images       : '1',
            batchSize        : 1,
            turnstileToken   : '',
            skipVerification : false,
            image_path       : 'hero',
            size             : '2K',
            resolution       : '2K',
            output_format    : 'png',
        },
        { headers: { ...NB_HEADERS, Cookie: ck, 'content-type': 'application/json' }, timeout: 15000 }
    );

    if (!taskRes.data?.taskId) {
        throw new Error('Gagal buat task: ' + JSON.stringify(taskRes.data));
    }
    const taskId = taskRes.data.taskId;

    for (let i = 0; i < maxPoll; i++) {
        await delay(5000);
        const checkRes = await session.post(
            'https://nanobanana.im/api/img/nano-banana5/taskResult',
            { taskId },
            { headers: { ...NB_HEADERS, Cookie: ck }, timeout: 10000 }
        );
        const d = checkRes.data;
        if (d?.status === 1 && d?.imgAfterSrc) {
            const imgFetch = await axios.get(d.imgAfterSrc, { responseType: 'arraybuffer', timeout: 20000 });
            return { status: true, buffer: Buffer.from(imgFetch.data) };
        }
        if (d?.status === -1 || d?.status === 2 ||
            (typeof d?.message === 'string' && /fail|error|rejected/i.test(d.message))) {
            throw new Error(`NanaBanana error: ${d?.message || 'unknown'}`);
        }
    }

    throw new Error('Timeout menunggu hasil gambar dari NanaBanana.');
}

module.exports = { stablehordeImg2img, nanobananaGenerate };

// ═══════════════════════════════════════════════════════
//  HANDLER: .editgambar / .editai / .aiedit
// ═══════════════════════════════════════════════════════

async function handleAiedit({ hisoka, m, query, tolak, logCommand, downloadMediaMessage }) {
    try {
        const isMediaMsg  = m.isMedia && m.type === 'imageMessage';
        const quoted      = m.quoted;
        const isQuotedImg = m.isQuoted && quoted?.isMedia && quoted?.type === 'imageMessage';
        const hasImage    = isMediaMsg || isQuotedImg;
        const prompt      = query?.trim();

        // ── Help / no prompt ──────────────────────────────
        if (!prompt) {
            await tolak(hisoka, m,
                `╭═══『 🎨 *AI Image Editor* 』═══╮\n│\n` +
                `│ *Dua mode tersedia:*\n│\n` +
                `│ 🖼 *Mode Edit Gambar (img2img):*\n` +
                `│ Kirim/reply gambar + caption:\n` +
                `│ *.editgambar* [deskripsi edit]\n│\n` +
                `│ Contoh:\n` +
                `│ *.editgambar* ganti jadi gaya anime\n` +
                `│ *.editgambar* ubah jadi malam hari\n│\n` +
                `│ ✨ *Mode Generate Gambar (txt2img):*\n` +
                `│ Ketik tanpa gambar:\n` +
                `│ *.editgambar* [deskripsi gambar]\n│\n` +
                `│ Contoh:\n` +
                `│ *.editgambar* anime girl cyberpunk\n` +
                `│ *.editgambar* sunset at beach 4K\n│\n` +
                `│ Alias: *.editai* / *.aiedit*\n│\n` +
                `│ ⏱ Estimasi: ~30-90 detik\n│\n` +
                `╰══════════════════════════════╯`
            );
            return;
        }

        // ── Mode img2img: ada gambar + prompt ────────────
        if (hasImage) {
            await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
            await tolak(hisoka, m,
                `⏳ Sedang mengedit gambar...\n` +
                `✏️ Prompt: _"${prompt}"_\n` +
                `🔄 Menggunakan StableHorde AI (~30-90 detik), mohon tunggu.`
            );

            // Download gambar
            let mediaBuffer;
            if (isMediaMsg) {
                mediaBuffer = await m.downloadMedia();
            } else {
                mediaBuffer = await downloadMediaMessage(
                    { ...m.quoted, message: m.quoted.raw },
                    'buffer', {},
                    { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                );
            }

            if (!mediaBuffer || mediaBuffer.length === 0) {
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, '❌ Gagal download gambar. Coba lagi!');
                return;
            }

            const result = await stablehordeImg2img(mediaBuffer, prompt);

            await hisoka.sendMessage(m.from, {
                image  : result.buffer,
                caption:
                    `✅ *Gambar berhasil diedit!*\n` +
                    `✏️ Prompt: _"${prompt}"_\n` +
                    `🔗 Powered by StableHorde AI`,
            }, { quoted: m });

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            logCommand(m, hisoka, 'editgambar');
            return;
        }

        // ── Mode txt2img: cuma prompt, tanpa gambar ───────
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        await tolak(hisoka, m,
            `⏳ Sedang membuat gambar...\n` +
            `📝 Prompt: _"${prompt}"_\n` +
            `🔄 Menggunakan NanaBanana AI (~30-60 detik), mohon tunggu.`
        );

        const result = await nanobananaGenerate(prompt);

        await hisoka.sendMessage(m.from, {
            image  : result.buffer,
            caption:
                `✅ *Gambar berhasil dibuat!*\n` +
                `📝 Prompt: _"${prompt}"_\n` +
                `🔗 Powered by NanaBanana AI`,
        }, { quoted: m });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'editgambar');

    } catch (error) {
        console.error('\x1b[31m[EditGambar] Error:\x1b[39m', error.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await tolak(hisoka, m, `❌ Gagal proses gambar: ${error.message}`);
    }
}

module.exports.handleAiedit = handleAiedit;
