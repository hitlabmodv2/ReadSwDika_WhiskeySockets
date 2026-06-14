'use strict';

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
 */

const { PassThrough } = require('stream');

// ── Peta warna background status ────────────────────────────────────────────

const WARNA_MAP = {
        biru:   '#34B7F1',
        hijau:  '#25D366',
        kuning: '#FFD700',
        jingga: '#FF8C00',
        merah:  '#FF3B30',
        ungu:   '#9C27B0',
        abu:    '#9E9E9E',
        hitam:  '#000000',
        putih:  '#FFFFFF',
        cyan:   '#00BCD4',
};

/**
 * Ambil warna acak dari WARNA_MAP
 */
function randomWarna() {
        const vals = Object.values(WARNA_MAP);
        return vals[Math.floor(Math.random() * vals.length)];
}

/**
 * Parse argumen command upswgc
 * Format: [teks]|[warna]|[target grup]  (urutan bebas kecuali teks harus duluan)
 *
 * @param {string} query - teks setelah nama command
 * @returns {{ teks: string, warna: string, target: string }}
 */
function parseUpswgcArgs(query) {
        const args = (query || '').split('|').map(v => v.trim()).filter(Boolean);
        let teks = '', warna = '', target = '';

        for (const v of args) {
                if (/chat\.whatsapp\.com\//i.test(v)) {
                        target = v;
                } else if (/@g\.us$/i.test(v) || /^\d{5,}$/.test(v)) {
                        target = v;
                } else if (WARNA_MAP[v.toLowerCase()]) {
                        warna = v.toLowerCase();
                } else if (!teks) {
                        teks = v;
                }
        }

        return { teks, warna, target };
}

/**
 * Resolve JID grup dari teks target (link invite / nomor / @g.us langsung)
 * Kembalikan null jika target kosong (pakai m.from di handler)
 *
 * @param {object} hisoka  - Baileys socket
 * @param {string} target  - string target dari parseUpswgcArgs
 * @param {string} fromJid - fallback jid (m.from)
 * @returns {Promise<string>}  group JID
 */
async function resolveSwJid(hisoka, target, fromJid) {
        if (!target) return fromJid;

        if (/chat\.whatsapp\.com\//i.test(target)) {
                const code = target.split('chat.whatsapp.com/')[1].trim();
                const info = await hisoka.groupGetInviteInfo(code);
                return info.id;
        }

        return /^\d+$/.test(target) ? target + '@g.us' : target;
}

/**
 * Konversi buffer audio ke OGG Opus (PTT-compatible)
 * Dipakai sebelum kirim audio sebagai group status
 *
 * @param {Buffer} inputBuf - buffer audio asli
 * @returns {Promise<Buffer>} buffer OGG Opus
 */
async function convertAudioToOpus(inputBuf) {
        const ffmpegLib = require('fluent-ffmpeg');
        return new Promise((resolve, reject) => {
                const inp    = new PassThrough();
                const out    = new PassThrough();
                const chunks = [];

                inp.end(inputBuf);

                ffmpegLib(inp)
                        .noVideo()
                        .audioCodec('libopus')
                        .format('ogg')
                        .on('error', reject)
                        .on('end', () => resolve(Buffer.concat(chunks)))
                        .pipe(out);

                out.on('data', c => chunks.push(c));
        });
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
        WARNA_MAP,
        randomWarna,
        parseUpswgcArgs,
        resolveSwJid,
        convertAudioToOpus,
};
