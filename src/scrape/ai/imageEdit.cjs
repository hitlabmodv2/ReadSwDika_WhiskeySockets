/**
 * 【 DeepAI Image Editor 】
 * Category : AI / Image Editing
 * Base     : https://deepai.org/api/image-editor
 * Desc     : Edit gambar dengan prompt teks via DeepAI (gratis, tanpa API key)
 * Recode   : CJS + Buffer support
 */

'use strict';

const crypto = require('crypto');
const { basename, extname } = require('path');

const AGENT = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36';
const SALT  = 'hackers_become_a_little_stinkier_every_time_they_hack';

const md5     = s => crypto.createHash('md5').update(s).digest('hex');
const reverse = s => s.split('').reverse().join('');
const generateRandomIP = () =>
    Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 254)).join('.');

function mimeFromExt(ext = '') {
    const map = {
        '.jpg'  : 'image/jpeg',
        '.jpeg' : 'image/jpeg',
        '.png'  : 'image/png',
        '.webp' : 'image/webp',
    };
    return map[ext.toLowerCase()] || 'image/jpeg';
}

function genKEY() {
    const r  = String(Math.floor(Math.random() * 1e11));
    const h1 = reverse(md5(AGENT + r  + SALT));
    const h2 = reverse(md5(AGENT + h1));
    const h3 = reverse(md5(AGENT + h2));
    return `tryit-${r}-${h3}`;
}

/**
 * Edit gambar menggunakan DeepAI Image Editor.
 *
 * @param {Buffer|string} input  - Buffer gambar ATAU URL https://...
 * @param {string}        prompt - Instruksi edit, contoh: "make it cinematic"
 * @param {object}        opts   - { mimeType, fileName, retries }
 * @returns {Promise<{status:boolean, result_url?:string, id?:string, error?:string}>}
 */
async function deepaiEditImage(input, prompt = 'make it cinematic', opts = {}) {
    let imgBuf;
    let mimeType = opts.mimeType || 'image/jpeg';
    let fileName = opts.fileName || 'image.jpg';

    if (Buffer.isBuffer(input)) {
        imgBuf = input;
    } else if (/^https?:\/\//i.test(String(input))) {
        const res = await fetch(String(input), {
            headers: { 'user-agent': AGENT, accept: 'image/*,*/*;q=0.8' }
        });
        if (!res.ok) throw new Error(`Gagal fetch image URL: ${res.status}`);
        imgBuf = Buffer.from(await res.arrayBuffer());
        const ct = res.headers.get('content-type');
        if (ct) mimeType = ct.split(';')[0].trim();
    } else {
        const { readFile } = require('fs/promises');
        imgBuf   = await readFile(String(input));
        mimeType = mimeFromExt(extname(String(input)));
        fileName = basename(String(input));
    }

    const maxTries = opts.retries ?? 6;
    let lastError  = 'request failed';

    for (let i = 0; i < maxTries; i++) {
        try {
            const form = new FormData();
            form.append('image', new Blob([imgBuf], { type: mimeType }), fileName);
            form.append('text', prompt);
            form.append('image_generator_version', 'standard');

            const res = await fetch('https://api.deepai.org/api/image-editor', {
                method : 'POST',
                headers: {
                    accept            : '*/*',
                    origin            : 'https://deepai.org',
                    referer           : 'https://deepai.org/',
                    'user-agent'      : AGENT,
                    'api-key'         : genKEY(),
                    'x-forwarded-for' : generateRandomIP(),
                },
                body: form,
            });

            const json = await res.json().catch(() => null);

            if (json?.output_url) {
                return {
                    status     : true,
                    result_url : json.output_url,
                    id         : json.id || null,
                };
            }

            lastError = json?.status || `http ${res.status}`;
        } catch (e) {
            lastError = e.message;
        }
    }

    return { status: false, error: lastError };
}

module.exports = { deepaiEditImage };
