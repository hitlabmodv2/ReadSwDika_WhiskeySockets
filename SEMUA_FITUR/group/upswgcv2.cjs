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
 *  upswgcv2 — Pakai castleys-community (v2)
 *  Mendukung: teks, gambar, video, audio,
 *  hex background, close_friends, custom audience
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Upload Status ke Grup WhatsApp (v2)
 *  Kirim status WA (teks/gambar/video/audio) ke semua grup
 *  menggunakan castleys-community — mendukung hex background,
 *  custom audience, dan close_friends audience.
 * ═══════════════════════════════════════════════════════════════
 */
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

// ── Patch proto.ContextInfo.StatusAudienceMetadata ──────────────────────────
// Baileys hanya encode audienceType — tidak encode listName & listEmoji.
// Patch ini menambahkan dukungan penuh (field 2=listName, field 3=listEmoji)
// supaya hisoka.sendMessage bisa mengirim custom audience dengan emoji yang benar.
let _protoPatchApplied = false;
function applyStatusAudiencePatch() {
        if (_protoPatchApplied) return;
        _protoPatchApplied = true;
        try {
                const baileys = require('@whiskeysockets/baileys');
                const proto   = baileys.proto;
                const sam     = proto?.ContextInfo?.StatusAudienceMetadata;
                if (!sam) return;

                // Tambah CUSTOM_LIST ke enum AudienceType (Baileys tidak punya ini)
                const at = sam.AudienceType || {};
                at[0] = 'UNKNOWN';      at['UNKNOWN']      = 0;
                at[1] = 'CLOSE_FRIENDS'; at['CLOSE_FRIENDS'] = 1;
                at[2] = 'CUSTOM_LIST';  at['CUSTOM_LIST']  = 2;
                sam.AudienceType = at;

                // Patch encode — tambah listName (field 2) dan listEmoji (field 3)
                sam.encode = function encode(m, w) {
                        const { Writer } = require('protobufjs/minimal');
                        if (!w) w = Writer.create();
                        if (m.audienceType != null && Object.hasOwnProperty.call(m, 'audienceType'))
                                w.uint32(8).int32(m.audienceType);
                        if (m.listName != null && Object.hasOwnProperty.call(m, 'listName'))
                                w.uint32(18).string(m.listName);
                        if (m.listEmoji != null && Object.hasOwnProperty.call(m, 'listEmoji'))
                                w.uint32(26).string(m.listEmoji);
                        return w;
                };

                // Patch fromObject — parse audienceType + listName + listEmoji
                sam.fromObject = function fromObject(d) {
                        if (d instanceof sam) return d;
                        const m = sam.create ? sam.create() : Object.create(sam.prototype || {});
                        // audienceType
                        switch (d.audienceType) {
                                case 'UNKNOWN':      case 0: m.audienceType = 0; break;
                                case 'CLOSE_FRIENDS': case 1: m.audienceType = 1; break;
                                case 'CUSTOM_LIST':  case 2: m.audienceType = 2; break;
                                default:
                                        if (typeof d.audienceType === 'number') m.audienceType = d.audienceType;
                        }
                        if (d.listName  != null) m.listName  = String(d.listName);
                        if (d.listEmoji != null) m.listEmoji = String(d.listEmoji);
                        return m;
                };

                // Baileys membuat instance protobuf lewat create(). Versi
                // bawaannya hanya mengenal audienceType, sehingga field
                // tambahan listName/listEmoji bisa hilang sebelum encode.
                // Selalu buat object dari prototype dan salin semua property.
                sam.create = function create(p) {
                        const m = Object.create(sam.prototype || {});
                        if (p) Object.assign(m, p);
                        return m;
                };
        } catch (_) {}
}

// ── Peta warna background status ────────────────────────────────────────────
const WARNA_MAP = {
        // ── Merah & turunannya ──────────────────────────────
        merah:          '#FF3B30',
        merahtua:       '#C0392B',
        merahmuda:      '#FF6B6B',
        merahmarun:     '#800000',
        krimson:        '#DC143C',
        scarlet:        '#FF2400',
        coral:          '#FF6F61',
        salmon:         '#FA8072',
        tomat:          '#FF4500',
        rose:           '#FF007F',

        // ── Jingga & turunannya ─────────────────────────────
        jingga:         '#FF8C00',
        orange:         '#FF8C00',
        jinggamuda:     '#FFA500',
        jinggaterang:   '#FF6200',
        amber:          '#FFBF00',
        oranye:         '#FF7043',

        // ── Kuning & turunannya ─────────────────────────────
        kuning:         '#FFD700',
        kuningmuda:     '#FFEE58',
        kuningtua:      '#F9A825',
        emas:           '#FFD700',
        gold:           '#FFD700',
        lemon:          '#FFF44F',
        krem:           '#FFFDD0',

        // ── Hijau & turunannya ──────────────────────────────
        hijau:          '#25D366',
        hijauwatsapp:   '#25D366',
        hijaumuda:      '#66BB6A',
        hijautua:       '#1B5E20',
        limau:          '#32CD32',
        lime:           '#CDDC39',
        hijauneon:      '#39FF14',
        mint:           '#98FF98',
        olive:          '#808000',
        zaitun:         '#808000',
        sage:           '#BCB88A',
        toska:          '#009688',
        teal:           '#009688',

        // ── Biru & turunannya ───────────────────────────────
        biru:           '#34B7F1',
        birumuda:       '#64B5F6',
        birutua:        '#1565C0',
        navy:           '#1A237E',
        navyblue:       '#000080',
        besi:           '#4682B4',
        cobalt:         '#0047AB',
        biru2:          '#2196F3',
        birulangit:     '#87CEEB',
        birulaut:       '#006994',
        biruneon:       '#00B4FF',
        dodger:         '#1E90FF',
        royal:          '#4169E1',
        steel:          '#4682B4',

        // ── Cyan & turunannya ───────────────────────────────
        cyan:           '#00BCD4',
        cyantua:        '#00838F',
        aqua:           '#00FFFF',
        turquoise:      '#40E0D0',
        turqoise:       '#40E0D0',

        // ── Ungu & turunannya ───────────────────────────────
        ungu:           '#9C27B0',
        ungumuda:       '#CE93D8',
        ungutua:        '#4A148C',
        violet:         '#EE82EE',
        lavender:       '#E6E6FA',
        lilac:          '#C8A2C8',
        indigo:         '#3F51B5',
        nila:           '#3F51B5',
        magenta:        '#FF00FF',
        fuchsia:        '#FF00FF',
        plum:           '#DDA0DD',

        // ── Pink & turunannya ───────────────────────────────
        pink:           '#E91E8C',
        pinkMuda:       '#F48FB1',
        pinkTua:        '#880E4F',
        hotpink:        '#FF69B4',
        deeppink:       '#FF1493',
        babyblue:       '#89CFF0',

        // ── Coklat & turunannya ─────────────────────────────
        coklat:         '#795548',
        coklatmuda:     '#A1887F',
        coklattua:      '#4E342E',
        tan:            '#D2B48C',
        khaki:          '#C3B091',
        mocha:          '#6F4E37',
        kayu:           '#8B4513',
        siena:          '#A0522D',

        // ── Abu & turunannya ────────────────────────────────
        abu:            '#9E9E9E',
        abumuda:        '#BDBDBD',
        abutua:         '#616161',
        silver:         '#C0C0C0',
        perak:          '#C0C0C0',
        slate:          '#708090',
        charcoal:       '#36454F',
        asap:           '#848884',

        // ── Hitam & Putih ───────────────────────────────────
        hitam:          '#000000',
        black:          '#000000',
        putih:          '#FFFFFF',
        white:          '#FFFFFF',
        ivory:          '#FFFFF0',
        gading:         '#FFFFF0',

        // ── Warna Neon / Terang ─────────────────────────────
        neon:           '#39FF14',
        neonhijau:      '#39FF14',
        neonbiru:       '#00B4FF',
        neonmerah:      '#FF3131',
        neonkuning:     '#FFFF33',
        neonpink:       '#FF10F0',
        neonungu:       '#BC13FE',

        // ── Warna Khusus ────────────────────────────────────
        whatsapp:       '#25D366',
        wa:             '#25D366',
        telegram:       '#2CA5E0',
        youtube:        '#FF0000',
        instagram:      '#C13584',
        twitter:        '#1DA1F2',
        tiktok:         '#010101',
        facebook:       '#1877F2',
        spotify:        '#1DB954',
        snapchat:       '#FFFC00',
        discord:        '#5865F2',

        // ── Warna Alam ──────────────────────────────────────
        langit:         '#87CEEB',
        laut:           '#006994',
        daun:           '#228B22',
        pasir:          '#C2B280',
        tanah:          '#8B4513',
        salju:          '#FFFAFA',
        api:            '#FF4500',
        es:             '#99C5C4',
};

// Alias pendek yang mengarah ke nama utama (biar fleksibel input user)
const WARNA_ALIAS = {
        r:    'merah',
        g:    'hijau',
        b:    'biru',
        y:    'kuning',
        p:    'pink',
        o:    'jingga',
        u:    'ungu',
        h:    'hitam',
        w:    'putih',
        c:    'cyan',
        t:    'toska',
        n:    'navy',
        m:    'merah',
        k:    'kuning',
};

// ── Peta audience ────────────────────────────────────────────────────────────
// close_friends → kirim ke close friends list
// all           → semua kontak (default, tanpa audience)
// custom:Nama:emoji → custom list dengan nama & emoji sendiri
const AUDIENCE_MAP = {
        all:           undefined,
        semua:         undefined,
        closefriends:  'close_friends',
        cf:            'close_friends',
        dekat:         'close_friends',
        close_friends: 'close_friends',
};

/**
 * Parse custom audience dari string format "custom:NamaList:emoji"
 * Contoh: "custom:VIP Members:👑" → { type:'custom', name:'VIP Members', emoji:'👑' }
 *
 * @param {string} v
 * @returns {{ type:'custom', name:string, emoji:string }|null}
 */
function parseCustomAudience(v) {
        const lower = v.toLowerCase();
        if (!lower.startsWith('custom:') && !lower.startsWith('cus:')) return null;
        const sep   = lower.startsWith('custom:') ? 'custom:' : 'cus:';
        const rest  = v.slice(sep.length).trim();
        if (!rest) return null;

        // Pisah nama dan emoji — cari emoji di akhir setelah ':'
        // Format: "NamaList:🔥" atau "NamaList" (emoji opsional)
        const colonIdx = rest.lastIndexOf(':');
        let name = rest, emoji = '';
        if (colonIdx > 0) {
                const maybeEmoji = rest.slice(colonIdx + 1).trim();
                // Cek apakah bagian setelah ':' terakhir adalah emoji atau bukan teks biasa
                const isEmoji = /\p{Emoji}/u.test(maybeEmoji) && maybeEmoji.length <= 8;
                if (isEmoji) {
                        name  = rest.slice(0, colonIdx).trim();
                        emoji = maybeEmoji;
                }
        }

        return { type: 'custom', name, emoji };
}

/**
 * Format label audience untuk tampilan di reply sukses
 *
 * @param {string|object|undefined} audience_
 * @returns {string}
 */
function audienceLabel(audience_) {
        if (!audience_) return 'Semua';
        if (audience_ === 'close_friends') return 'Close Friends';
        if (typeof audience_ === 'object') {
                const parts = [];
                if (audience_.emoji) parts.push(audience_.emoji);
                if (audience_.name)  parts.push(audience_.name);
                return parts.length ? `Custom — ${parts.join(' ')}` : 'Custom';
        }
        return String(audience_);
}

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
                // Deteksi custom audience: "custom:NamaList:emoji" atau "cus:NamaList:emoji"
                else if (/^(custom|cus):/i.test(v)) {
                        audience = parseCustomAudience(v);
                }
                // Deteksi audience preset (cf, closefriends, dll)
                else if (v.toLowerCase() in AUDIENCE_MAP) {
                        audience = v.toLowerCase();
                }
                // Deteksi warna — nama, alias pendek, atau hex
                else if (WARNA_MAP[v.toLowerCase()] || WARNA_ALIAS[v.toLowerCase()]) {
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
        const key = warna.toLowerCase();
        // Cek alias dulu, lalu nama langsung
        const resolved = WARNA_ALIAS[key] ? WARNA_MAP[WARNA_ALIAS[key]] : WARNA_MAP[key];
        return resolved || randomWarna();
}

/**
 * Resolve audience untuk castleys-community
 * Kembalikan:
 *   - undefined             → kirim ke semua
 *   - 'close_friends'       → close friends
 *   - { type, name, emoji } → custom list
 *
 * @param {string|object|undefined} audienceKey
 * @returns {string|object|undefined}
 */
function resolveAudience(audienceKey) {
        if (!audienceKey) return undefined;
        // Sudah diparse sebagai object (dari parseCustomAudience)
        if (typeof audienceKey === 'object') return audienceKey;
        // Preset string (cf, closefriends, dll)
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

        // ── Deteksi sumber media ──────────────────────────────────────────────
        // Prioritas: current message dulu, lalu quoted (reply)
        const srcIsMedia    = !!(m.isMedia && m.type);
        const quotedIsMedia = !!(m.isQuoted && m.quoted?.isMedia && m.quoted?.type);

        const src   = srcIsMedia    ? m
                    : quotedIsMedia ? m.quoted
                    : null;
        const mType = src?.type || '';
        const mMime = src?.content?.mimetype || '';

        // Caption: kalau kirim langsung (bukan reply), ambil dari teks query
        // Kalau reply, ambil dari query atau teks asli quoted
        const caption = src === m
                ? teks.trim()
                : (teks || src?.text || src?.content?.caption || '').trim();

        const bgColor   = resolveWarna(warna);
        const audience_ = resolveAudience(audience);

        // ── Fungsi download media yang robust ────────────────────────────────
        // Untuk current message: pakai m.downloadMedia()
        // Untuk quoted: coba downloadMedia() dulu, fallback ke hisoka.downloadMediaMessage()
        const downloadSrc = async () => {
                if (!src) throw new Error('Tidak ada media');
                // Current message — langsung
                if (src === m) return await m.downloadMedia();
                // Quoted message — coba downloadMedia, fallback robust
                try {
                        const buf = typeof src.downloadMedia === 'function'
                                ? await src.downloadMedia()
                                : null;
                        if (buf?.length > 0) return buf;
                } catch (_) {}
                // Fallback: pakai hisoka.downloadMediaMessage langsung
                return await hisoka.downloadMediaMessage(src);
        };

        // Tampilkan panduan kalau tidak ada konten sama sekali
        if (!caption && !src) {
                const aliasStr = Object.entries(WARNA_ALIAS).map(([k, v]) => `${k}=${v}`).join(', ');
                return m.reply(
                        `╭─────────────────────────╮\n` +
                        `│   📋 *PANDUAN swgcv2*   │\n` +
                        `╰─────────────────────────╯\n\n` +

                        `*Format:*\n` +
                        `${prefix}swgcv2 [teks]|[warna]|[grup]|[audience]\n\n` +

                        `*━━━ CONTOH TEKS ━━━*\n` +
                        `${prefix}swgcv2 Halo semua!\n` +
                        `${prefix}swgcv2 Halo|hijau\n` +
                        `${prefix}swgcv2 Halo|merahtua\n` +
                        `${prefix}swgcv2 Halo|#FF5722\n` +
                        `${prefix}swgcv2 Halo|discord\n\n` +

                        `*━━━ CONTOH DENGAN GRUP ━━━*\n` +
                        `${prefix}swgcv2 Halo|biru|https://chat.whatsapp.com/xxx\n` +
                        `${prefix}swgcv2 Halo|merah|628xxx@g.us\n\n` +

                        `*━━━ AUDIENCE ━━━*\n` +
                        `*1. Semua (default):*\n` +
                        `${prefix}swgcv2 Halo semua!\n\n` +
                        `*2. Close Friends:*\n` +
                        `${prefix}swgcv2 Halo|hijau|cf\n` +
                        `${prefix}swgcv2 Halo|biru|linkgrup|closefriends\n\n` +
                        `*3. Custom List (nama & emoji sendiri):*\n` +
                        `${prefix}swgcv2 Halo VIP!|emas|custom:VIP Members:👑\n` +
                        `${prefix}swgcv2 Info tim|biru|custom:Tim Kerja:💼\n` +
                        `${prefix}swgcv2 Update bot|ungu|linkgrup|custom:Dev Squad:🤖\n` +
                        `${prefix}swgcv2 Promo!|merah|cus:Pelanggan:🛒\n\n` +
                        `> Format custom: custom:[NamaList]:[emoji]\n` +
                        `> Emoji opsional, nama bebas\n\n` +

                        `*━━━ MEDIA (reply foto/video/audio) ━━━*\n` +
                        `${prefix}swgcv2\n` +
                        `${prefix}swgcv2 Caption gambar!\n` +
                        `${prefix}swgcv2 Caption|linkgrup|cf\n` +
                        `${prefix}swgcv2 Caption|linkgrup|custom:VIP:👑\n\n` +

                        `*━━━ WARNA (${Object.keys(WARNA_MAP).length} tersedia) ━━━*\n` +
                        `🔴 merah, merahtua, merahmuda, krimson, coral, salmon, rose\n` +
                        `🟠 jingga, orange, amber, oranye\n` +
                        `🟡 kuning, emas, gold, lemon\n` +
                        `🟢 hijau, hijaumuda, hijautua, limau, mint, toska, teal, neon\n` +
                        `🔵 biru, birumuda, birutua, navy, cobalt, dodger, royal\n` +
                        `🟣 ungu, ungumuda, violet, lavender, indigo, magenta, fuchsia\n` +
                        `🩷 pink, hotpink, deeppink\n` +
                        `🟤 coklat, mocha, kayu, siena, tan\n` +
                        `⬛ hitam • ⬜ putih • 🩶 abu, silver\n` +
                        `⚡ neonhijau, neonbiru, neonmerah, neonpink, neonungu\n` +
                        `📱 wa, telegram, youtube, instagram, discord, spotify\n` +
                        `🌿 langit, laut, daun, pasir, api, es\n` +
                        `*Alias cepat:* ${aliasStr}\n` +
                        `*Hex:* #RRGGBB atau #RGB`
                );
        }

        // Load castleys-community (diperlukan untuk: text status + proto patch audience)
        let groupStatusV2;
        try {
                groupStatusV2 = await getGroupStatusV2();
        } catch (e) {
                return m.reply(`❌ Gagal load castleys-community: ${e.message}\nPastikan package sudah terinstall.`);
        }

        // Patch proto agar listName & listEmoji ter-encode di hisoka.sendMessage
        applyStatusAudiencePatch();

        // ── Helper: build contextInfo untuk hisoka.sendMessage ───────────────
        // Media dikirim via hisoka.sendMessage (proven work, sama dgn V1)
        // agar tidak kena bug messageSecret dari relayMessage castleys-community
        const buildCtx = (aud) => {
                const base = { isGroupStatus: true };
                if (!aud) return base;
                // Close friends
                if (aud === 'close_friends' ||
                    (typeof aud === 'object' && (aud.type === 'close_friends' || aud.type === 1))) {
                        return { ...base, statusAudienceMetadata: { audienceType: 1 } };
                }
                // Custom list
                if (typeof aud === 'object' && (aud.type === 'custom' || aud.type === 2 || aud.name)) {
                        return {
                                ...base,
                                statusAudienceMetadata: {
                                        audienceType: 2,
                                        ...(aud.name  ? { listName:  String(aud.name)  } : {}),
                                        ...(aud.emoji ? { listEmoji: String(aud.emoji) } : {}),
                                },
                        };
                }
                return base;
        };

        // ── Kirim berdasarkan tipe media ────────────────────────────────────

        try {
                const isImg    = mType === 'imageMessage'  || /image/i.test(mMime);
                const isVid    = mType === 'videoMessage'  || /video/i.test(mMime);
                const isAud    = mType === 'audioMessage'  || mType === 'pttMessage' || /audio/i.test(mMime);
                const isStk    = mType === 'stickerMessage';
                const hasMedia = isImg || isVid || isAud || isStk;

                console.log('[swgcv2][debug] src:', src ? `${src === m ? 'current' : 'quoted'}` : 'null',
                        '| mType:', mType || '(none)',
                        '| mMime:', mMime || '(none)',
                        '| hasMedia:', hasMedia,
                        '| caption:', caption || '(kosong)',
                        '| audience_:', JSON.stringify(audience_) || 'undefined');

                // ── Auto-delete pesan sumber setelah status terkirim ─────────────
                // Hapus foto/video/audio yang jadi sumber agar tidak spam di grup
                const autoDeleteSrc = async () => {
                        try {
                                if (src === m) {
                                        // Kirim media langsung: hapus pesan command itu sendiri
                                        await hisoka.sendMessage(m.from, { delete: m.key });
                                } else if (src === m.quoted && m.quoted?.key?.id) {
                                        // Reply ke foto: hapus pesan quoted (foto sumber)
                                        const qKey = {
                                                ...m.quoted.key,
                                                remoteJid: m.from,
                                        };
                                        await hisoka.sendMessage(m.from, { delete: qKey });
                                        // Hapus juga pesan command reply-nya
                                        await hisoka.sendMessage(m.from, { delete: m.key });
                                }
                        } catch (_) {}
                };

                // Gambar
                if (isImg) {
                        console.log('[swgcv2][debug] → download image...');
                        const buf = await downloadSrc();
                        console.log('[swgcv2][debug] → buf size:', buf?.length, '| kirim via groupStatusV2...');
                        await groupStatusV2(hisoka, jid, {
                                image:    buf,
                                caption,
                                audience: audience_,
                        });
                        console.log('[swgcv2][debug] → image sent OK');
                        await m.reply(
                                `✅ *Status gambar dikirim!*\n` +
                                `*Group:* ${jid}\n` +
                                `*Audience:* ${audienceLabel(audience_)}`
                        );
                        await autoDeleteSrc();
                        return;
                }

                // Video
                if (isVid) {
                        console.log('[swgcv2][debug] → download video...');
                        const buf = await downloadSrc();
                        console.log('[swgcv2][debug] → buf size:', buf?.length, '| kirim via groupStatusV2...');
                        await groupStatusV2(hisoka, jid, {
                                video:    buf,
                                caption,
                                audience: audience_,
                        });
                        console.log('[swgcv2][debug] → video sent OK');
                        await m.reply(
                                `✅ *Status video dikirim!*\n` +
                                `*Group:* ${jid}\n` +
                                `*Audience:* ${audienceLabel(audience_)}`
                        );
                        await autoDeleteSrc();
                        return;
                }

                // Audio / PTT
                if (isAud) {
                        console.log('[swgcv2][debug] → download audio...');
                        const rawBuf  = await downloadSrc();
                        const opusBuf = await convertAudioToOpus(rawBuf);
                        console.log('[swgcv2][debug] → opusBuf size:', opusBuf?.length, '| kirim via groupStatusV2...');
                        await groupStatusV2(hisoka, jid, {
                                audio:    opusBuf,
                                ptt:      true,
                                audience: audience_,
                        });
                        console.log('[swgcv2][debug] → audio sent OK');
                        await m.reply(
                                `✅ *Status audio dikirim!*\n` +
                                `*Group:* ${jid}\n` +
                                `*Audience:* ${audienceLabel(audience_)}`
                        );
                        await autoDeleteSrc();
                        return;
                }

                // Stiker — download lalu kirim sebagai gambar di status
                if (isStk) {
                        console.log('[swgcv2][debug] → download sticker...');
                        const buf = await downloadSrc();
                        console.log('[swgcv2][debug] → buf size:', buf?.length, '| kirim via groupStatusV2 (as image)...');
                        await groupStatusV2(hisoka, jid, {
                                image:    buf,
                                caption,
                                audience: audience_,
                        });
                        console.log('[swgcv2][debug] → sticker (as image) sent OK');
                        await m.reply(
                                `✅ *Status stiker dikirim!*\n` +
                                `*Group:* ${jid}\n` +
                                `*Audience:* ${audienceLabel(audience_)}`
                        );
                        await autoDeleteSrc();
                        return;
                }

                // Teks dengan background warna (tetap pakai castleys-community)
                console.log('[swgcv2][debug] → kirim teks via groupStatusV2 | warna:', bgColor);
                await groupStatusV2(hisoka, jid, {
                        text:       caption,
                        background: bgColor,
                        audience:   audience_,
                });
                return m.reply(
                        `✅ *Status teks dikirim!*\n` +
                        `*Group:* ${jid}\n` +
                        `*Warna:* ${bgColor}\n` +
                        `*Audience:* ${audienceLabel(audience_)}`
                );

        } catch (err) {
                console.error('[upswgcv2] Error kirim status:', err);
                return m.reply(`❌ Gagal kirim status: ${err?.message || 'Unknown error'}`);
        }
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
        WARNA_MAP,
        WARNA_ALIAS,
        AUDIENCE_MAP,
        randomWarna,
        isHex,
        parseArgs,
        parseCustomAudience,
        audienceLabel,
        resolveJid,
        resolveWarna,
        resolveAudience,
        convertAudioToOpus,
        handleUpswgcV2,
};
