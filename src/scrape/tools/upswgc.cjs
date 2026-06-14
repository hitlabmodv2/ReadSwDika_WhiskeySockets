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

// Cooldown per-sender agar tidak bisa double-trigger spam
const _cooldown = new Map();
const _COOLDOWN_MS = 3000;

function _isCooldown(key) {
        const last = _cooldown.get(key) || 0;
        return (Date.now() - last) < _COOLDOWN_MS;
}

function _setCooldown(key) {
        _cooldown.set(key, Date.now());
        setTimeout(() => _cooldown.delete(key), _COOLDOWN_MS + 500);
}

function _randomWarna() {
        const vals = Object.values(WARNA_MAP);
        return vals[Math.floor(Math.random() * vals.length)];
}

/**
 * Parse argumen command upswgc
 * Format: [teks]|[warna]|[target grup]
 */
function parseArgs(query) {
        const args = (query || '').split('|').map(v => v.trim()).filter(Boolean);
        let teks = '', warna = '', target = '';
        for (const v of args) {
                if (/chat\.whatsapp\.com\//i.test(v)) {
                        target = v;
                } else if (/@g\.us$/i.test(v) || /^\d+$/.test(v)) {
                        target = v;
                } else if (!teks) {
                        teks = v;
                } else if (!warna) {
                        warna = v;
                }
        }
        return { teks, warna, target };
}

/**
 * Upload status ke grup (groupStatusMessageV2 / isGroupStatus)
 *
 * @param {object} hisoka  - Baileys socket instance
 * @param {object} m       - Injected message object
 * @param {string} query   - Argumen setelah command (sudah trim)
 * @returns {{ ok: boolean, swJid?: string, showHelp?: boolean, error?: string }}
 */
async function uploadGroupStatus(hisoka, m, query) {
        // Guard: blokir eksekusi jika pesan berasal dari bot sendiri
        if (m.key?.fromMe && !m.isRealOwner) return { ok: false, selfSkip: true };

        // Guard: cooldown anti-spam per sender
        const cdKey = `upswgc:${m.sender}`;
        if (_isCooldown(cdKey)) return { ok: false, cooldown: true };
        _setCooldown(cdKey);

        const { teks, warna, target } = parseArgs(query);

        // Resolve target JID grup
        let swJid = m.from;
        if (target) {
                if (/chat\.whatsapp\.com\//i.test(target)) {
                        const code = target.split('chat.whatsapp.com/')[1];
                        try {
                                const info = await hisoka.groupGetInviteInfo(code);
                                swJid = info.id;
                        } catch {
                                return { ok: false, error: '❌ Link grup tidak valid / bot belum join' };
                        }
                } else {
                        swJid = /^\d+$/.test(target) ? target + '@g.us' : target;
                }
        }

        // Gunakan pesan yang di-reply sebagai sumber media/caption
        // JANGAN fallback ke m sendiri untuk menghindari rekursi
        const quoted = m.quoted || null;
        const mime   = quoted?.content?.mimetype || '';
        const caption = (quoted?.content?.caption || teks || '').trim();
        const bgColor = warna
                ? (WARNA_MAP[warna.toLowerCase()] || _randomWarna())
                : _randomWarna();

        // Butuh teks atau media
        if (!caption && !quoted) {
                return { ok: false, showHelp: true };
        }

        // Gambar
        if (/image/i.test(mime)) {
                const buf = await quoted.downloadMedia();
                await hisoka.sendMessage(swJid, {
                        image:       buf,
                        caption,
                        contextInfo: { isGroupStatus: true },
                });
                return { ok: true, swJid };
        }

        // Video
        if (/video/i.test(mime)) {
                const buf = await quoted.downloadMedia();
                await hisoka.sendMessage(swJid, {
                        video:       buf,
                        caption,
                        contextInfo: { isGroupStatus: true },
                });
                return { ok: true, swJid };
        }

        // Audio — konversi ke OGG Opus PTT
        if (/audio/i.test(mime)) {
                const buf = await quoted.downloadMedia();
                let ffmpegLib;
                try {
                        ffmpegLib = require('fluent-ffmpeg');
                } catch {
                        return { ok: false, error: '❌ fluent-ffmpeg tidak tersedia di server ini.' };
                }
                const vnBuf = await new Promise((resolve, reject) => {
                        const inp    = new PassThrough();
                        const out    = new PassThrough();
                        const chunks = [];
                        inp.end(buf);
                        ffmpegLib(inp)
                                .noVideo()
                                .audioCodec('libopus')
                                .format('ogg')
                                .on('error', reject)
                                .on('end', () => resolve(Buffer.concat(chunks)))
                                .pipe(out);
                        out.on('data', c => chunks.push(c));
                });
                await hisoka.sendMessage(swJid, {
                        audio:       vnBuf,
                        ptt:         true,
                        mimetype:    'audio/ogg; codecs=opus',
                        contextInfo: { isGroupStatus: true },
                });
                return { ok: true, swJid };
        }

        // Sticker
        if (/sticker/i.test(mime)) {
                const buf = await quoted.downloadMedia();
                await hisoka.sendMessage(swJid, {
                        sticker:     buf,
                        contextInfo: { isGroupStatus: true },
                });
                return { ok: true, swJid };
        }

        // Teks status
        await hisoka.sendMessage(swJid, {
                text:            caption,
                backgroundColor: bgColor,
                contextInfo:     { isGroupStatus: true },
        });
        return { ok: true, swJid };
}

module.exports = { uploadGroupStatus, parseArgs, WARNA_MAP };
