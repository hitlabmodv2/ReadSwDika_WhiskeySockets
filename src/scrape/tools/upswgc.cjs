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
 * Cek apakah sebuah string adalah target grup (JID / nomor / link invite)
 */
function isTargetGrup(v) {
        return (
                /chat\.whatsapp\.com\//i.test(v) ||
                /@g\.us$/i.test(v) ||
                /^\d{15,}@g\.us$/i.test(v) ||
                /^\d{10,}$/.test(v)
        );
}

/**
 * Parse argumen command upswgc
 *
 * Format yang didukung (semua kombinasi):
 *   .upswgc halo
 *   .upswgc halo|merah
 *   .upswgc halo|merah|120363xxx@g.us
 *   .upswgc 120363xxx@g.us|halo
 *   .upswgc 120363xxx@g.us | halo
 *   .upswgc 120363xxx@g.us halo          ← JID di depan diikuti spasi
 *   .upswgc https://chat.whatsapp.com/xxx|halo
 *
 * @param {string} query - teks setelah nama command
 * @returns {{ teks: string, warna: string, target: string }}
 */
function parseUpswgcArgs(query) {
        const raw = (query || '').trim();
        if (!raw) return { teks: '', warna: '', target: '' };

        let teks = '', warna = '', target = '';

        // ── Cek apakah token pertama (sebelum spasi pertama) adalah JID / nomor / link ──
        // Contoh: "120363xxx@g.us halo merah" atau "https://chat.whatsapp.com/xxx halo"
        const firstSpaceIdx = raw.indexOf(' ');
        if (firstSpaceIdx !== -1) {
                const firstToken = raw.slice(0, firstSpaceIdx).trim();
                if (isTargetGrup(firstToken)) {
                        target = firstToken;
                        // Sisa setelah JID — parse dengan pipe jika ada
                        const rest = raw.slice(firstSpaceIdx + 1).trim();
                        const restArgs = rest.split('|').map(v => v.trim()).filter(Boolean);
                        for (const v of restArgs) {
                                if (!target && isTargetGrup(v)) {
                                        target = v;
                                } else if (WARNA_MAP[v.toLowerCase()]) {
                                        warna = v.toLowerCase();
                                } else if (!teks) {
                                        teks = v;
                                }
                        }
                        return { teks, warna, target };
                }
        }

        // ── Format pipe biasa: teks|warna|target (urutan bebas) ──
        const args = raw.split('|').map(v => v.trim()).filter(Boolean);
        for (const v of args) {
                if (isTargetGrup(v)) {
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
 * Kembalikan fromJid sebagai fallback jika target kosong.
 *
 * @param {object} hisoka  - Baileys socket
 * @param {string} target  - string target dari parseUpswgcArgs
 * @param {string} fromJid - fallback jid (m.from)
 * @returns {Promise<string>}  group JID
 */
async function resolveSwJid(hisoka, target, fromJid) {
        if (!target) return fromJid;

        // Link invite WhatsApp
        if (/chat\.whatsapp\.com\//i.test(target)) {
                const code = target.split('chat.whatsapp.com/')[1].split(/[?#\s]/)[0].trim();
                const info = await hisoka.groupGetInviteInfo(code);
                return info.id;
        }

        // Nomor tanpa @g.us — tambahkan suffix
        if (/^\d+$/.test(target)) return target + '@g.us';

        // JID lengkap langsung
        return target;
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
 * Bisa dipanggil dari private chat, grup mana saja, maupun jadibot.
 *
 * @param {object}   hisoka  - Baileys socket
 * @param {object}   m       - message object
 * @param {string}   query   - argumen setelah nama command
 * @param {Function} tolak   - fungsi balas/tolak dari message handler
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

        // ── Resolve JID target ──────────────────────────────────────────────
        let swJid;
        try {
                swJid = await resolveSwJid(hisoka, swTarget, m.from);
        } catch (e) {
                return m.reply(`❌ Link grup tidak valid atau bot belum join\n_${e?.message || e}_`);
        }

        // Validasi hasil resolve harus berformat group JID
        if (!swJid || !swJid.endsWith('@g.us')) {
                return m.reply(
                        `❌ Target bukan grup yang valid!\n\n` +
                        `Gunakan salah satu format:\n` +
                        `• GroupID  : \`120363xxx@g.us\`\n` +
                        `• Link     : \`https://chat.whatsapp.com/xxx\`\n` +
                        `• Nomor ID : \`120363192554714254\``
                );
        }

        // ── Sumber media ────────────────────────────────────────────────────
        // Attachment langsung (m.isMedia) atau quoted — jangan keduanya
        const swSrc     = m.isMedia ? m : (m.quoted || null);
        const swType    = swSrc?.type || '';
        const swMime    = swSrc?.content?.mimetype || '';

        // Kalau media langsung (bukan quoted), teks caption diambil dari swTeks
        // bukan dari m.text (isinya command itu sendiri)
        const swCaption = swSrc === m
                ? swTeks.trim()
                : (swTeks || swSrc?.text || swSrc?.content?.caption || '').trim();

        const swBgColor = swWarna ? (WARNA_MAP[swWarna] || randomWarna()) : randomWarna();

        // ── Tampilkan menu jika tidak ada konten ────────────────────────────
        if (!swCaption && !swSrc) {
                return m.reply(
                        `╭─「 *Upload Status Grup* 」\n` +
                        `│\n` +
                        `│ *Format:*\n` +
                        `│ ${swPrefix}swgc [teks]\n` +
                        `│ ${swPrefix}swgc [teks]|[warna]\n` +
                        `│ ${swPrefix}swgc [groupid atau link]|[teks]\n` +
                        `│ ${swPrefix}swgc [groupid] [teks]\n` +
                        `│\n` +
                        `│ *Contoh:*\n` +
                        `│ ${swPrefix}swgc halo semua!\n` +
                        `│ ${swPrefix}swgc halo|merah\n` +
                        `│ ${swPrefix}swgc 120363xxx@g.us|halo\n` +
                        `│ ${swPrefix}swgc 120363xxx@g.us halo\n` +
                        `│\n` +
                        `│ *Warna tersedia:*\n` +
                        `│ biru, hijau, kuning, jingga, merah,\n` +
                        `│ ungu, abu, hitam, putih, cyan\n` +
                        `│\n` +
                        `│ *Reply/kirim media langsung:*\n` +
                        `│ ${swPrefix}swgc\n` +
                        `│ ${swPrefix}swgc [groupid atau link]\n` +
                        `╰──────────────────────`
                );
        }

        // ── Kirim ke grup sebagai Group Status ──────────────────────────────
        try {
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

        } catch (e) {
                const errMsg = e?.message || String(e);
                const hint = errMsg.includes('not-authorized') || errMsg.includes('forbidden')
                        ? '\n\n💡 *Kemungkinan penyebab:* bot bukan member atau admin di grup tersebut.'
                        : errMsg.includes('not-found') || errMsg.includes('not participant')
                        ? '\n\n💡 *Kemungkinan penyebab:* bot tidak bergabung di grup tersebut.'
                        : '';
                return m.reply(`❌ Gagal upload status ke ${swJid}\n_Error: ${errMsg}_${hint}`);
        }
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
