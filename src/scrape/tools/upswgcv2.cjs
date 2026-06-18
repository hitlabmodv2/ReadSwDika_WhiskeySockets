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
 *
 *  upswgcv2 — Pakai castleys-community
 *  Mendukung: teks, gambar, video, audio,
 *  hex background, close_friends, custom audience
 * ───────────────────────────────
 */

const { PassThrough } = require('stream');

// ── Lazy-load castleys-community (ESM) ──────────────────────────────────────
let _groupStatusV2 = null;
async function getGroupStatusV2() {
        if (_groupStatusV2) return _groupStatusV2;
        const mod = await import('castleys-community');
        _groupStatusV2 = mod.groupStatusV2 || mod.default?.send?.bind(mod.default) || null;
        if (!_groupStatusV2) throw new Error('castleys-community: groupStatusV2 tidak ditemukan');
        return _groupStatusV2;
}

// ── Peta warna background status ────────────────────────────────────────────
const WARNA_MAP = {
        biru:    '#34B7F1',
        hijau:   '#25D366',
        kuning:  '#FFD700',
        jingga:  '#FF8C00',
        merah:   '#FF3B30',
        ungu:    '#9C27B0',
        abu:     '#9E9E9E',
        hitam:   '#000000',
        putih:   '#FFFFFF',
        cyan:    '#00BCD4',
        pink:    '#E91E8C',
        coklat:  '#795548',
        navy:    '#1A237E',
        toska:   '#009688',
};

// ── Peta audience ────────────────────────────────────────────────────────────
// close_friends → kirim ke close friends list
// all           → semua kontak (default, tanpa audience)
const AUDIENCE_MAP = {
        all:           undefined,
        semua:         undefined,
        closefriends:  'close_friends',
        cf:            'close_friends',
        dekat:         'close_friends',
        close_friends: 'close_friends',
};

/**
 * Ambil warna acak dari WARNA_MAP
 */
function randomWarna() {
        const vals = Object.values(WARNA_MAP);
        return vals[Math.floor(Math.random() * vals.length)];
}

/**
 * Validasi format hex warna (#RGB atau #RRGGBB)
 */
function isHex(str) {
        return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(str.trim());
}

/**
 * Parse argumen command upswgcv2
 *
 * Format bebas, dipisah |:
 *   [teks] | [warna/hex] | [target] | [audience]
 *
 * Contoh:
 *   Halo semua | hijau
 *   Halo semua | #FF0000 | linkgrup
 *   Halo semua | biru | linkgrup | cf
 *
 * @param {string} query
 * @returns {{ teks: string, warna: string, target: string, audience: string|undefined }}
 */
function parseArgs(query) {
        const parts = (query || '').split('|').map(v => v.trim()).filter(Boolean);
        let teks = '', warna = '', target = '', audience = undefined;

        for (const v of parts) {
                // Deteksi target grup: link invite atau @g.us
                if (/chat\.whatsapp\.com\//i.test(v)) {
                        target = v;
                } else if (/@g\.us$/i.test(v)) {
                        target = v;
                } else if (/^\d{10,}$/.test(v)) {
                        target = v;
                }
                // Deteksi audience
                else if (AUDIENCE_MAP[v.toLowerCase()] !== undefined || v.toLowerCase() in AUDIENCE_MAP) {
                        audience = v.toLowerCase();
                }
                // Deteksi warna — nama atau hex
                else if (WARNA_MAP[v.toLowerCase()]) {
                        warna = v.toLowerCase();
                } else if (isHex(v)) {
                        warna = v.trim();
                }
                // Sisanya = teks
                else if (!teks) {
                        teks = v;
                }
        }

        return { teks, warna, target, audience };
}

/**
 * Resolve JID grup dari teks target (link invite / nomor / @g.us langsung)
 *
 * @param {object} hisoka  - Baileys socket
 * @param {string} target  - string target dari parseArgs
 * @param {string} fromJid - fallback jid (m.from)
 * @returns {Promise<string>} group JID
 */
async function resolveJid(hisoka, target, fromJid) {
        if (!target) return fromJid;

        if (/chat\.whatsapp\.com\//i.test(target)) {
                const code = target.split('chat.whatsapp.com/')[1].trim();
                const info = await hisoka.groupGetInviteInfo(code);
                return info.id;
        }

        if (/^\d+$/.test(target)) return target + '@g.us';
        return target;
}

/**
 * Konversi buffer audio ke OGG Opus (PTT-compatible)
 *
 * @param {Buffer} inputBuf
 * @returns {Promise<Buffer>}
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

/**
 * Resolve warna background — nama atau hex langsung
 * Kalau kosong, kembalikan warna acak
 *
 * @param {string} warna - nama warna atau hex (#RRGGBB)
 * @returns {string}
 */
function resolveWarna(warna) {
        if (!warna) return randomWarna();
        if (isHex(warna)) return warna;
        return WARNA_MAP[warna.toLowerCase()] || randomWarna();
}

/**
 * Resolve audience untuk castleys-community
 * Kembalikan string 'close_friends' atau undefined
 *
 * @param {string|undefined} audienceKey
 * @returns {string|undefined}
 */
function resolveAudience(audienceKey) {
        if (!audienceKey) return undefined;
        return AUDIENCE_MAP[audienceKey.toLowerCase()] ?? undefined;
}

// ── Handler utama ─────────────────────────────────────────────────────────────

/**
 * Handler command upswgcv2/swgcv2
 * Menggunakan castleys-community (groupStatusV2) untuk kirim status grup
 *
 * @param {object}   hisoka  - Baileys socket
 * @param {object}   m       - message object
 * @param {string}   query   - argumen setelah nama command
 * @param {Function} tolak   - fungsi balas/tolak dari message handler
 * @returns {Promise<void>}
 */
async function handleUpswgcV2(hisoka, m, query, tolak) {
        // Akses: hanya owner / jadibot user
        const isJadibotUser = hisoka?.isMainBot === false;
        if (!m.isOwner && !isJadibotUser) {
                return tolak(hisoka, m, '❌ Fitur ini hanya untuk owner!');
        }

        // Deduplication: cegah eksekusi ganda dari WA sync (append event)
        if (!hisoka._upswgcv2Done) hisoka._upswgcv2Done = new Map();
        const _msgId = m.key?.id || '';
        if (_msgId && hisoka._upswgcv2Done.has(_msgId)) return;
        if (_msgId) {
                hisoka._upswgcv2Done.set(_msgId, Date.now());
                setTimeout(() => hisoka._upswgcv2Done?.delete(_msgId), 10000);
        }

        const prefix = m.prefix || '.';
        const { teks, warna, target, audience } = parseArgs(query);

        // Resolve target grup
        let jid;
        try {
                jid = await resolveJid(hisoka, target, m.from);
        } catch {
                return m.reply('❌ Link grup tidak valid / bot belum join grup tersebut');
        }

        if (!jid || !jid.endsWith('@g.us')) {
                return m.reply('❌ Harus dipakai di dalam grup atau sertakan link/ID grup yang valid');
        }

        // Sumber media
        const src     = m.isMedia ? m : (m.quoted || null);
        const mType   = src?.type || '';
        const mMime   = src?.content?.mimetype || '';
        const caption = src === m
                ? teks.trim()
                : (teks || src?.text || src?.content?.caption || '').trim();
        const bgColor  = resolveWarna(warna);
        const audience_ = resolveAudience(audience);

        // Tampilkan panduan kalau tidak ada konten sama sekali
        if (!caption && !src) {
                const audienceList = Object.keys(AUDIENCE_MAP).filter(k => k !== 'all' && k !== 'semua').join(', ');
                return m.reply(
                        `*📋 Panduan upswgcv2*\n\n` +
                        `*Teks:*\n` +
                        `${prefix}swgcv2 Halo semua!\n` +
                        `${prefix}swgcv2 Halo|hijau\n` +
                        `${prefix}swgcv2 Halo|#FF5722|linkgrup\n` +
                        `${prefix}swgcv2 Halo|biru|linkgrup|cf\n\n` +
                        `*Media (reply/kirim foto, video, audio):*\n` +
                        `${prefix}swgcv2\n` +
                        `${prefix}swgcv2 caption di sini\n` +
                        `${prefix}swgcv2 caption|linkgrup\n\n` +
                        `*Warna:* ${Object.keys(WARNA_MAP).join(', ')}\n` +
                        `*Atau hex:* #RRGGBB\n\n` +
                        `*Audience:* ${audienceList}`
                );
        }

        // Load castleys-community
        let groupStatusV2;
        try {
                groupStatusV2 = await getGroupStatusV2();
        } catch (e) {
                return m.reply(`❌ Gagal load castleys-community: ${e.message}\nPastikan package sudah terinstall.`);
        }

        // ── Kirim berdasarkan tipe media ────────────────────────────────────

        try {
                // Gambar
                if (mType === 'imageMessage' || /image/i.test(mMime)) {
                        const buf = await src.downloadMedia();
                        await groupStatusV2(hisoka, jid, {
                                image:    buf,
                                caption:  caption,
                                audience: audience_,
                        });
                        return m.reply(`✅ Status gambar berhasil dikirim!\n*Group:* ${jid}${audience_ ? `\n*Audience:* ${audience_}` : ''}`);
                }

                // Video
                if (mType === 'videoMessage' || /video/i.test(mMime)) {
                        const buf = await src.downloadMedia();
                        await groupStatusV2(hisoka, jid, {
                                video:    buf,
                                caption:  caption,
                                audience: audience_,
                        });
                        return m.reply(`✅ Status video berhasil dikirim!\n*Group:* ${jid}${audience_ ? `\n*Audience:* ${audience_}` : ''}`);
                }

                // Audio / PTT
                if (mType === 'audioMessage' || mType === 'pttMessage' || /audio/i.test(mMime)) {
                        const rawBuf  = await src.downloadMedia();
                        const opusBuf = await convertAudioToOpus(rawBuf);
                        await groupStatusV2(hisoka, jid, {
                                audio:    opusBuf,
                                ptt:      true,
                                audience: audience_,
                        });
                        return m.reply(`✅ Status audio berhasil dikirim!\n*Group:* ${jid}${audience_ ? `\n*Audience:* ${audience_}` : ''}`);
                }

                // Stiker — kirim sebagai gambar di status
                if (mType === 'stickerMessage') {
                        const buf = await src.downloadMedia();
                        await groupStatusV2(hisoka, jid, {
                                image:    buf,
                                caption:  caption,
                                audience: audience_,
                        });
                        return m.reply(`✅ Status stiker berhasil dikirim!\n*Group:* ${jid}${audience_ ? `\n*Audience:* ${audience_}` : ''}`);
                }

                // Teks dengan background warna
                await groupStatusV2(hisoka, jid, {
                        text:       caption,
                        background: bgColor,
                        audience:   audience_,
                });
                return m.reply(
                        `✅ Status teks berhasil dikirim!\n` +
                        `*Group:* ${jid}\n` +
                        `*Warna:* ${bgColor}` +
                        (audience_ ? `\n*Audience:* ${audience_}` : '')
                );

        } catch (err) {
                console.error('[upswgcv2] Error kirim status:', err);
                return m.reply(`❌ Gagal kirim status: ${err?.message || 'Unknown error'}`);
        }
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
        WARNA_MAP,
        AUDIENCE_MAP,
        randomWarna,
        isHex,
        parseArgs,
        resolveJid,
        resolveWarna,
        resolveAudience,
        convertAudioToOpus,
        handleUpswgcV2,
};
