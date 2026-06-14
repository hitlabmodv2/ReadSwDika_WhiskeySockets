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

// ── Handler utama fitur upswgc / swgc ────────────────────────────────────────

/**
 * Handler command upswgc/swgc — upload status ke grup
 *
 * @param {object} hisoka  - Baileys socket
 * @param {object} m       - message object
 * @param {string} query   - argumen setelah nama command
 * @param {Function} tolak - fungsi balas/tolak dari message handler
 * @returns {Promise<void>}
 */
async function handleUpswgc(hisoka, m, query, tolak) {
        const isJadibotUser = hisoka?.isMainBot === false;
        if (!m.isOwner && !isJadibotUser) return tolak(hisoka, m, '❌ Fitur ini hanya untuk owner!');

        // Deduplication: cegah eksekusi ganda dari WA sync (append event)
        if (!hisoka._upswgcDone) hisoka._upswgcDone = new Map();
        const _swMsgId = m.key?.id || '';
        if (_swMsgId && hisoka._upswgcDone.has(_swMsgId)) return;
        if (_swMsgId) {
                hisoka._upswgcDone.set(_swMsgId, Date.now());
                setTimeout(() => hisoka._upswgcDone?.delete(_swMsgId), 10000);
        }

        const swPrefix = m.prefix || '.';
        const { teks: swTeks, warna: swWarna, target: swTarget } = parseUpswgcArgs(query);

        // Resolve target grup — error kalau link tidak valid
        let swJid;
        try {
                swJid = await resolveSwJid(hisoka, swTarget, m.from);
        } catch {
                return m.reply('❌ Link grup tidak valid / bot belum join');
        }

        // Sumber media: attachment langsung (m.isMedia) atau quoted, tidak keduanya
        const swSrc     = m.isMedia ? m : (m.quoted || null);
        const swType    = swSrc?.type || '';
        const swMime    = swSrc?.content?.mimetype || '';
        // Kalau media langsung (bukan quoted), jangan pakai m.text karena isinya command itu sendiri
        const swCaption = swSrc === m
                ? swTeks.trim()
                : (swTeks || swSrc?.text || swSrc?.content?.caption || '').trim();
        const swBgColor = swWarna ? (WARNA_MAP[swWarna] || randomWarna()) : randomWarna();

        if (!swCaption && !swSrc) {
                return m.reply(
                        `*Contoh Penggunaan:*\n\n` +
                        `${swPrefix}swgc halo\n` +
                        `${swPrefix}swgc halo|merah\n` +
                        `${swPrefix}swgc halo|linkgrup atau groupid\n\n` +
                        `Reply / kirim foto/video/audio/sticker:\n` +
                        `${swPrefix}swgc\n` +
                        `${swPrefix}swgc linkgrup atau groupid`
                );
        }

        if (swType === 'imageMessage' || /image/i.test(swMime)) {
                const swBuf = await swSrc.downloadMedia();
                await hisoka.sendMessage(swJid, { image: swBuf, caption: swCaption, contextInfo: { isGroupStatus: true } });
                return m.reply(`✅ Sukses upload status!\n*GroupID:* ${swJid}`);
        }

        if (swType === 'videoMessage' || /video/i.test(swMime)) {
                const swBuf = await swSrc.downloadMedia();
                await hisoka.sendMessage(swJid, { video: swBuf, caption: swCaption, contextInfo: { isGroupStatus: true } });
                return m.reply(`✅ Sukses upload status!\n*GroupID:* ${swJid}`);
        }

        if (swType === 'audioMessage' || swType === 'pttMessage' || /audio/i.test(swMime)) {
                const swBuf = await swSrc.downloadMedia();
                const swOpusBuf = await convertAudioToOpus(swBuf);
                await hisoka.sendMessage(swJid, { audio: swOpusBuf, ptt: true, mimetype: 'audio/ogg; codecs=opus', contextInfo: { isGroupStatus: true } });
                return m.reply(`✅ Sukses upload status!\n*GroupID:* ${swJid}`);
        }

        if (swType === 'stickerMessage') {
                const swBuf = await swSrc.downloadMedia();
                await hisoka.sendMessage(swJid, { sticker: swBuf, contextInfo: { isGroupStatus: true } });
                return m.reply(`✅ Sukses upload status!\n*GroupID:* ${swJid}`);
        }

        // Teks status
        await hisoka.sendMessage(swJid, { text: swCaption, backgroundColor: swBgColor, contextInfo: { isGroupStatus: true } });
        return m.reply(`✅ Sukses upload status!\n*GroupID:* ${swJid}`);
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
        WARNA_MAP,
        randomWarna,
        parseUpswgcArgs,
        resolveSwJid,
        convertAudioToOpus,
        handleUpswgc,
};
