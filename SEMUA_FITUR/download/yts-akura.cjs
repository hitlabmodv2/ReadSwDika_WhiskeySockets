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
const ALLOWED_QUALITIES = new Set(['mp3', '360', '480', '720', '1080']);

/* ─── Ambil direct URL dari yt-dlp tanpa download (bypass bot detection) ─── */
function getDirectUrls(ytdlpBin, videoUrl, formatStr, parseYtdlpError) {
    const { execFile } = require('child_process');
    return new Promise((resolve, reject) => {
        execFile(
            ytdlpBin,
            ['--no-playlist',
             '--extractor-args', 'youtube:player_client=android_vr',
             '--get-url', '-f', formatStr, videoUrl],
            { timeout: 30000 },
            (err, stdout, stderr) => {
                if (err) return reject(new Error(parseYtdlpError(stderr, err.message)));
                const urls = stdout.trim().split('\n').filter(u => u.startsWith('http'));
                if (!urls.length) return reject(new Error('URL tidak ditemukan dari yt-dlp.'));
                resolve(urls);
            }
        );
    });
}

/* ─── Download file dari direct URL pakai axios (tidak kena bot detection) ─── */
async function downloadToFile(url, destPath) {
    const axios = require('axios');
    const response = await axios({
        method: 'get',
        url,
        responseType: 'arraybuffer',
        timeout: 120000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 9; Pixel 2) AppleWebKit/537.36',
        },
    });
    fs.writeFileSync(destPath, Buffer.from(response.data));
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

    if (!ALLOWED_QUALITIES.has(type)) {
        await tolak(hisoka, m, '❌ Kualitas tidak diizinkan. Gunakan tombol resmi dari hasil pencarian.');
        return;
    }

    const isYtUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(videoUrl);
    if (!isYtUrl) {
        await tolak(hisoka, m, '❌ Link tidak valid. Hanya link YouTube yang diterima.');
        return;
    }

    const isAudio = type === 'mp3';
    const height  = isAudio ? null : parseInt(type, 10);

    await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });

    const loadingMsg = await tolak(hisoka, m,
        isAudio ? '⏳ _Mempersiapkan download audio MP3..._'
                : `⏳ _Mempersiapkan download video ${height}p..._`
    );

    const editStep = async (text) => {
        try { await m.reply({ edit: loadingMsg.key, text }); } catch (_) {}
    };

    /* tolakEdit: ensureYtdlp kirim pesan via edit, bukan kirim baru */
    const tolakEdit = async (_h, _m, text) => editStep(text);

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const timestamp   = Date.now();
    const rawAudio    = path.join(tmpDir, `ytakura_${timestamp}_audio.m4a`);
    const rawVideo    = path.join(tmpDir, `ytakura_${timestamp}_video.mp4`);
    const fixedFile   = path.join(tmpDir, `ytakura_${timestamp}_fixed.mp4`);
    const outMp3      = path.join(tmpDir, `ytakura_${timestamp}.mp3`);
    const toClean     = [];

    try {
        const ytdlpBin = await ensureYtdlp(hisoka, m, tolakEdit);

        if (isAudio) {
            /* ── STEP 1: ambil direct URL audio (m4a) ── */
            await editStep('🔍 _Mengambil link audio..._');
            const [audioUrl] = await getDirectUrls(
                ytdlpBin, videoUrl,
                'bestaudio[ext=m4a]/bestaudio',
                parseYtdlpError
            );

            /* ── STEP 2: download m4a via axios (no bot detection) ── */
            await editStep('⏳ _Mengunduh audio..._');
            toClean.push(rawAudio);
            await downloadToFile(audioUrl, rawAudio);

            /* ── STEP 3: convert m4a → mp3 via ffmpeg ── */
            await editStep('🔧 _Mengkonversi ke MP3..._');
            toClean.push(outMp3);
            await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');
                const ff = spawn('ffmpeg', [
                    '-y', '-i', rawAudio,
                    '-codec:a', 'libmp3lame', '-qscale:a', '4',
                    outMp3,
                ]);
                ff.on('close', code =>
                    code === 0 ? resolve() : reject(new Error('FFmpeg gagal konversi MP3.'))
                );
            });

            /* ── STEP 4: kirim ── */
            await editStep('📤 _Mengirim audio MP3..._');
            await hisoka.sendMessage(m.from, {
                audio:    fs.readFileSync(outMp3),
                mimetype: 'audio/mpeg',
                fileName: `audio_${timestamp}.mp3`,
                ptt:      false,
            }, { quoted: m });

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            await editStep('✅ *Audio MP3 berhasil dikirim!*');
            logCommand(m, hisoka, 'ytdlch-mp3');

        } else {
            /* ── VIDEO ──
               Strategi: coba format combined (satu URL) dulu,
               kalau tidak ada fallback ke video+audio terpisah lalu mux ffmpeg. ── */
            await editStep(`🔍 _Mengambil link video ${height}p..._`);

            let videoFileToSend = null;

            try {
                /* Coba combined mp4 (ada audio bawaan, cocok untuk ≤360p) */
                const [combinedUrl] = await getDirectUrls(
                    ytdlpBin, videoUrl,
                    `best[height<=${height}][ext=mp4]/best[height<=${height}]`,
                    parseYtdlpError
                );
                await editStep(`⏳ _Mengunduh video ${height}p..._`);
                toClean.push(rawVideo);
                await downloadToFile(combinedUrl, rawVideo);
                videoFileToSend = rawVideo;

            } catch (_combinedErr) {
                /* Fallback: download video-only + audio-only, mux dengan ffmpeg */
                await editStep(`⏳ _Mengunduh stream video ${height}p..._`);

                const vidUrl = (await getDirectUrls(
                    ytdlpBin, videoUrl,
                    `bestvideo[height<=${height}][ext=mp4]/bestvideo[height<=${height}]`,
                    parseYtdlpError
                ))[0];

                const audUrl = (await getDirectUrls(
                    ytdlpBin, videoUrl,
                    'bestaudio[ext=m4a]/bestaudio',
                    parseYtdlpError
                ))[0];

                const rawVideoOnly = path.join(tmpDir, `ytakura_${timestamp}_vonly.mp4`);
                toClean.push(rawVideoOnly, rawAudio);
                await Promise.all([
                    downloadToFile(vidUrl, rawVideoOnly),
                    downloadToFile(audUrl, rawAudio),
                ]);

                await editStep('🔧 _Mux video + audio..._');
                toClean.push(fixedFile);
                await new Promise((resolve, reject) => {
                    const { spawn } = require('child_process');
                    const ff = spawn('ffmpeg', [
                        '-y',
                        '-i', rawVideoOnly,
                        '-i', rawAudio,
                        '-c:v', 'copy', '-c:a', 'aac',
                        '-movflags', '+faststart',
                        fixedFile,
                    ]);
                    ff.on('close', code =>
                        code === 0 ? resolve() : reject(new Error('FFmpeg mux gagal.'))
                    );
                });
                videoFileToSend = fixedFile;
            }

            await editStep(`📤 _Mengirim video ${height}p..._`);
            await hisoka.sendMessage(m.from, {
                video:   fs.readFileSync(videoFileToSend),
                caption: `🎬 *${height}p* — WilyBot YTS Akura`,
                mimetype:'video/mp4',
            }, { quoted: m });

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            await editStep(`✅ *Video ${height}p berhasil dikirim!*`);
            logCommand(m, hisoka, `ytdlch-${height}p`);
        }
    } catch (err) {
        console.error('[YTS-AKURA DL]', err);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await editStep(`❌ *Download Gagal:* ${err.message}`);
    } finally {
        for (const f of toClean) {
            try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
        }
    }
}

module.exports = { handleYtsSearch, handleYtQualityCh, handleYtDlCh };
