/**
 * ───────────────────────────────
 *  Base Script : Amane
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
 *  yts-akura.cjs — YouTube Search Carousel + Download (.yts / .ytsearch / .ytdlch / .ytqualitych)
 *  Cari video YouTube, tampil carousel interaktif, pilih kualitas & download
 * ───────────────────────────────
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const {
    generateWAMessageFromContent,
    generateWAMessageContent,
    proto,
} = require('@whiskeysockets/baileys');

/* ─── Helper: buat quoted mini supaya carousel bisa terkirim ─── */
function makeQuotedMini(m, pfx) {
    return {
        key: {
            participant: '0@s.whatsapp.net',
            remoteJid:   '0@s.whatsapp.net',
            fromMe:      false,
            id:          'WilyYtsAkura',
        },
        message: {
            conversation: m.text || `${pfx}yts`,
        },
    };
}

/* ─── Handler .yts / .ytsearch — cari YouTube, tampil carousel 5 hasil ─── */
async function handleYtsSearch(hisoka, m, query, ctx) {
    const { tolak, logCommand } = ctx;
    const pfx = m.prefix || '.';

    if (!query) {
        await tolak(hisoka, m, `🔍 *Format Salah!*\n\nContoh: *${pfx}yts* shape of you ed sheeran`);
        return;
    }

    await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
    const loadingMsg = await tolak(hisoka, m, '🔍 _Sedang mencari video..._');

    try {
        const yts = (await import('yt-search')).default;
        const result = await yts(query.trim());

        if (!result || !result.videos || result.videos.length === 0) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await m.reply({ edit: loadingMsg.key, text: '❌ Video tidak ditemukan. Coba kata kunci lain.' });
            return;
        }

        const videos = result.videos.slice(0, 5);
        const cards  = [];
        let rank = 1;

        for (const v of videos) {
            try {
                const thumbUrl = v.thumbnail
                    || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`;
                const videoLink = v.url || `https://youtu.be/${v.videoId}`;
                const durStr    = v.duration?.timestamp || '?';
                const viewsFmt  = v.views ? Number(v.views).toLocaleString('id-ID') : '?';
                const channel   = v.author?.name || v.author || '?';

                const imgContent = await generateWAMessageContent(
                    { image: { url: thumbUrl } },
                    { upload: hisoka.waUploadToServer }
                );

                cards.push({
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                        text: `📺 *Channel:* ${channel}\n⏳ *Durasi:* ${durStr}\n👁️ *Views:* ${viewsFmt}`,
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                        text: `Pilihan Ke-${rank++} — WilyBot YTS Akura`,
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                        title:             v.title || 'Tanpa Judul',
                        hasMediaAttachment: true,
                        imageMessage:       imgContent.imageMessage,
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [
                            {
                                name:            'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎵 Audio MP3',
                                    id:           `${pfx}ytdlch mp3|${videoLink}`,
                                }),
                            },
                            {
                                name:            'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎬 Download Video',
                                    id:           `${pfx}ytqualitych ${videoLink}`,
                                }),
                            },
                        ],
                    }),
                });
            } catch (_) {
                rank++;
                continue;
            }
        }

        if (cards.length === 0) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await m.reply({ edit: loadingMsg.key, text: '❌ Gagal memuat thumbnail hasil pencarian. Coba lagi.' });
            return;
        }

        const quotedMini = makeQuotedMini(m, pfx);
        const msg = generateWAMessageFromContent(
            m.from,
            {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                            body: proto.Message.InteractiveMessage.Body.fromObject({
                                text: `✨ *YOUTUBE SEARCH — WILYBOT YTS AKURA* ✨\n\n🔍 Kata kunci: *${query}*\n\n💡 _Geser kartu untuk lihat hasil lain, lalu tap tombol untuk download!_`,
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({
                                text: '🎵 WilyBot YTS Akura — YouTube Carousel Engine',
                            }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({
                                hasMediaAttachment: false,
                            }),
                            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                                cards,
                            }),
                        }),
                    },
                },
            },
            { quoted: quotedMini }
        );

        await hisoka.relayMessage(m.from, msg.message, { messageId: msg.key.id });
        await hisoka.sendMessage(m.from, { react: { text: '⚡', key: m.key } });
        await m.reply({ edit: loadingMsg.key, text: `✅ Ditemukan *${cards.length}* hasil untuk: _${query}_` });

        logCommand(m, hisoka, 'yts');
    } catch (e) {
        console.error('[YTS-AKURA SEARCH]', e);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await m.reply({ edit: loadingMsg.key, text: `❌ *Error:* ${e.message}` });
    }
}

/* ─── Handler .ytqualitych — tampilkan pilihan kualitas video ─── */
async function handleYtQualityCh(hisoka, m, query, ctx) {
    const { tolak } = ctx;
    const pfx = m.prefix || '.';

    if (!query) return;

    const videoUrl   = query.trim();
    const quotedMini = makeQuotedMini(m, pfx);

    const msg = generateWAMessageFromContent(
        m.from,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata:        {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: `🎥 *PILIH KUALITAS VIDEO — WILYBOT YTS AKURA*\n\n_Tap tombol di bawah untuk memilih resolusi yang diinginkan:_`,
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: '🎬 WilyBot — YouTube Quality Picker',
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎞️ 140p',  id: `${pfx}ytdlch 140|${videoUrl}`  }) },
                                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎞️ 360p',  id: `${pfx}ytdlch 360|${videoUrl}`  }) },
                                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎞️ 480p',  id: `${pfx}ytdlch 480|${videoUrl}`  }) },
                                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎞️ 720p',  id: `${pfx}ytdlch 720|${videoUrl}`  }) },
                                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎞️ 1080p', id: `${pfx}ytdlch 1080|${videoUrl}` }) },
                            ],
                        }),
                    }),
                },
            },
        },
        { quoted: quotedMini }
    );

    await hisoka.relayMessage(m.from, msg.message, { messageId: msg.key.id });
}

/* ─── Allowed quality tokens (cegah injection) ─── */
const ALLOWED_QUALITIES = new Set(['mp3', '140', '360', '480', '720', '1080']);

/* ─── Cari file hasil output yt-dlp berdasarkan prefix timestamp ─── */
function findOutputFile(dir, prefix) {
    try {
        const files = fs.readdirSync(dir);
        const match = files.find(f => f.startsWith(prefix));
        return match ? path.join(dir, match) : null;
    } catch (_) {
        return null;
    }
}

/* ─── Handler .ytdlch — download audio/video dengan kualitas terpilih ─── */
async function handleYtDlCh(hisoka, m, query, ctx) {
    const { tolak, logCommand, ensureYtdlp, parseYtdlpError } = ctx;

    if (!query) return;

    /* Format: "mp3|URL" atau "360|URL" */
    const sepIdx = query.indexOf('|');
    if (sepIdx === -1) {
        await tolak(hisoka, m, '❌ Format tidak valid. Gunakan tombol dari hasil pencarian.');
        return;
    }

    const type     = query.slice(0, sepIdx).trim().toLowerCase();
    const videoUrl = query.slice(sepIdx + 1).trim();

    /* ── Validasi ketat: type harus dari set yang diizinkan ── */
    if (!ALLOWED_QUALITIES.has(type)) {
        await tolak(hisoka, m, '❌ Kualitas tidak diizinkan. Gunakan tombol resmi dari hasil pencarian.');
        return;
    }

    /* ── Validasi URL: harus youtube/youtu.be ── */
    const isYtUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(videoUrl);
    if (!isYtUrl) {
        await tolak(hisoka, m, '❌ Link tidak valid. Hanya link YouTube yang diterima.');
        return;
    }

    await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });

    const tmpDir   = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const timestamp = Date.now();
    const isAudio   = type === 'mp3';
    const prefix    = `ytakura_${timestamp}`;
    const fixedFile = path.join(tmpDir, `${prefix}_fix.mp4`);
    let   rawFile   = null;

    try {
        const ytdlpBin = await ensureYtdlp(hisoka, m, tolak);
        const { execFile } = require('child_process');

        if (isAudio) {
            /* ── Download Audio MP3 — pakai execFile (aman dari injection) ── */
            const loadingMsg = await tolak(hisoka, m, '⏳ _Mengunduh audio MP3..._');
            const outTemplate = path.join(tmpDir, `${prefix}.%(ext)s`);

            await new Promise((resolve, reject) => {
                execFile(
                    ytdlpBin,
                    ['--js-runtimes', 'node', '--no-playlist', '-x',
                     '--audio-format', 'mp3', '--audio-quality', '5',
                     '-o', outTemplate, videoUrl],
                    { timeout: 120000 },
                    (err, _stdout, stderr) => {
                        if (err) return reject(new Error(parseYtdlpError(stderr, err.message)));
                        resolve();
                    }
                );
            });

            /* Temukan file output yang sebenarnya, apapun ekstensinya */
            rawFile = findOutputFile(tmpDir, prefix);
            if (!rawFile || !fs.existsSync(rawFile)) throw new Error('File audio tidak ditemukan setelah download.');

            const audioBuffer = fs.readFileSync(rawFile);
            await hisoka.sendMessage(m.from, {
                audio:    audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `audio_${timestamp}.mp3`,
                ptt:      false,
            }, { quoted: m });

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            await m.reply({ edit: loadingMsg.key, text: '✅ *Audio MP3 berhasil dikirim!*' });
            logCommand(m, hisoka, 'ytdlch-mp3');

        } else {
            /* ── Download Video — pakai execFile (aman dari injection) ── */
            const height     = parseInt(type, 10);
            const loadingMsg = await tolak(hisoka, m, `⏳ _Mengunduh video ${height}p..._`);
            const outTemplate = path.join(tmpDir, `${prefix}.%(ext)s`);

            await new Promise((resolve, reject) => {
                execFile(
                    ytdlpBin,
                    ['--js-runtimes', 'node', '--no-playlist',
                     '-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`,
                     '--merge-output-format', 'mp4',
                     '-o', outTemplate, videoUrl],
                    { timeout: 240000 },
                    (err, _stdout, stderr) => {
                        if (err) return reject(new Error(parseYtdlpError(stderr, err.message)));
                        resolve();
                    }
                );
            });

            /* Temukan file output yang sebenarnya */
            rawFile = findOutputFile(tmpDir, prefix);
            if (!rawFile || !fs.existsSync(rawFile)) throw new Error('File video tidak ditemukan setelah download.');

            /* FFmpeg re-mux supaya bisa langsung diputar di WhatsApp */
            await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');
                const ff = spawn('ffmpeg', [
                    '-y', '-i', rawFile,
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-movflags', '+faststart',
                    fixedFile,
                ]);
                ff.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error('FFmpeg gagal menstabilkan container video.'));
                });
            });

            const videoBuffer = fs.readFileSync(fixedFile);
            await hisoka.sendMessage(m.from, {
                video:   videoBuffer,
                caption: `🎬 *${height}p* — WilyBot YTS Akura`,
                mimetype:'video/mp4',
            }, { quoted: m });

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            await m.reply({ edit: loadingMsg.key, text: `✅ *Video ${height}p berhasil dikirim!*` });
            logCommand(m, hisoka, `ytdlch-${height}p`);
        }
    } catch (err) {
        console.error('[YTS-AKURA DL]', err);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        m.reply(`❌ *Download Gagal:* ${err.message}`);
    } finally {
        try { if (rawFile   && fs.existsSync(rawFile))   fs.unlinkSync(rawFile);   } catch (_) {}
        try { if (fixedFile && fs.existsSync(fixedFile)) fs.unlinkSync(fixedFile); } catch (_) {}
    }
}

module.exports = { handleYtsSearch, handleYtQualityCh, handleYtDlCh };
