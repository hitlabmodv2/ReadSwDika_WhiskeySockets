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
 *  wily-helpers.cjs — WilyAI helper utilities
 *  Fungsi pembantu parsing & format respons modul AI WilyBot
 * ───────────────────────────────
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ── Pure helper functions (no external deps) ──

function detectImageSearchQuery(text) {
    if (!text) return null;
    const t = text.trim();

    const questionIndicators = /\?|apakah|kenapa|mengapa|bagaimana|gimana|apa itu|siapa|kapan|berapa|benarkah|iya ga|iya gak|beneran|emang|bisa gak|bisa ga|itu apa|apa yang|gimana cara/i;
    if (questionIndicators.test(t)) return null;

    const patterns = [
        /^(?:boleh\s+|bisa\s+|tolong\s+|dong\s+|coba\s+|mau\s+)?cari(?:kan|in|i)?\s+(?:gambar|foto|image|pic|picture)\s+(?:dari\s+|tentang\s+)?(.+)/i,
        /^(?:boleh\s+|bisa\s+|tolong\s+)?kirim(?:in|kan)?\s+(?:aku\s+|saya\s+)?(?:gambar|foto|image)\s+(?:dari\s+|tentang\s+)?(.+)/i,
        /^(?:boleh\s+|bisa\s+)?(?:minta|pengen|pengin|ingin|mau|request|order)\s+(?:\d+\s+)?(?:gambar|foto|image)\s+(?:anime\s+|manga\s+)?(.+)/i,
        /^(?:boleh\s+|bisa\s+)?(?:minta|pengen|pengin)\s+(.+?)\s+(?:\d+\s+)?(?:gambar|foto|image)(?:\s+dong|\s+ya|\s+yuk)?$/i,
        /^(?:gambar|foto)\s+(.{2,50})(?:\s+dong|\s+ya|\s+yuk|\s+aja|\s+saja)?$/i,
        /^kirim\s+(?:gambar|foto)\s+(.+)/i,
        /^(?:find|search|get|send)\s+(?:\d+\s+)?(?:image|picture|photo)s?\s+(?:of\s+)?(.+)/i,
        /^show\s+me\s+(?:\d+\s+)?(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
    ];

    for (const pat of patterns) {
        const match = t.match(pat);
        if (match && match[1]) {
            let q = match[1].trim()
                .replace(/\s+\d+\s+(?:saja|aja|doang|dulu|deh|aja)$/i, '')
                .replace(/\s+(?:saja|aja|doang|dulu|deh|dong|ya|yuk)$/i, '')
                .replace(/[?.!,]+$/, '')
                .trim();
            if (q.length >= 2 && q.length <= 80 && !questionIndicators.test(q)) return q;
        }
    }
    return null;
}

function extractImageCount(text) {
    if (!text) return 1;
    const t = text.toLowerCase();
    const numMatch = t.match(/\b(\d+)\s*(?:gambar|foto|image|saja|aja|buah|lembar)?\b/);
    if (numMatch) {
        const n = parseInt(numMatch[1]);
        if (n >= 1 && n <= 5) return n;
    }
    if (/\b(beberapa|beberapa|few|some|multiple)\b/.test(t)) return 3;
    return 1;
}

function cleanImageTitle(title, fallback) {
    const raw = String(title || fallback || 'Gambar').replace(/\s+/g, ' ').trim();
    return raw.length > 70 ? raw.slice(0, 67) + '...' : raw;
}

// ── Factory: returns helpers that need ES module deps ──

function makeWilyHelpers({
    gemini,
    buildSmartImageWaitPrompt, buildSmartAlbumCaptionPrompt, buildSmartImageHistoryPrompt,
    rememberAIMedia, sendAIReply, tolak,
    extractImagesFromText, hasStickerMarker, extractStickersFromText, extractReplyStickersFromText,
    extractVoiceNotesFromText, extractSongsFromText, extractVideosFromText, extractYouTubeAudioFromText,
    extractTikTokFromText, extractInstagramFromText, extractFacebookFromText, hasMediaDownloadMarker, hasSocialDLMarker,
    wilyLog = () => {}, wilyError = () => {},
}) {
    async function buildSmartImageWaitText({ userName, userQuestion, query, count }) {
        const fallback = count > 1
            ? `Oke ${userName}, aku seleksi ${count} gambar *${query}* yang paling nyambung dulu ya, nanti kukirim jadi satu album.`
            : `Oke ${userName}, aku pilihkan gambar *${query}* yang paling pas dulu ya.`;
        try {
            const prompt = buildSmartImageWaitPrompt({ userName, userQuestion, query, count });
            const result = await gemini.ask(prompt);
            const clean = result.trim().replace(/\n+/g, ' ').replace(/^["']|["']$/g, '').trim();
            if (clean.length >= 10 && clean.length <= 220) return clean;
        } catch (_) {}
        return fallback;
    }

    async function buildSmartAlbumCaptions({ userQuestion, query, images }) {
        const total = images.length;
        const captions = [];
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const fallbackTitle = cleanImageTitle(image.title, query);
            const fallback = `🖼️ *${i + 1} dari ${total}*\n${fallbackTitle}\nSesuai permintaan: ${query}`;
            try {
                const prompt = buildSmartAlbumCaptionPrompt({ userQuestion, query, index: i, total });
                const result = await gemini.askWithImage(prompt, image.buffer, 'image/jpeg');
                const clean = result.trim().replace(/\n{3,}/g, '\n\n').slice(0, 700);
                captions.push(clean.startsWith('🖼️') ? clean : fallback);
            } catch (_) {
                captions.push(fallback);
            }
        }
        return captions;
    }

    async function sendImageAlbum(hisoka, m, images, captions) {
        const albumItems = images.map((img, i) => ({
            image: img.buffer,
            caption: captions[i] || `🖼️ *${i + 1} dari ${images.length}*`,
        }));
        try {
            const sent = await hisoka.sendMessage(m.from, { albumMessage: albumItems }, { quoted: m });
            rememberAIMedia(hisoka, sent, images.map((img, i) => ({
                buffer: img.buffer,
                mime: 'image/jpeg',
                label: 'gambar',
                caption: captions[i] || '',
            })));
        } catch (_) {
            for (let i = 0; i < images.length; i++) {
                const sent = await hisoka.sendMessage(m.from, {
                    image: images[i].buffer,
                    caption: captions[i] || `🖼️ *${i + 1} dari ${images.length}*`,
                }, { quoted: i === 0 ? m : undefined });
                rememberAIMedia(hisoka, sent, [{
                    buffer: images[i].buffer,
                    mime: 'image/jpeg',
                    label: 'gambar',
                    caption: captions[i] || '',
                }]);
            }
        }
    }

    async function buildSmartImageHistoryReply({ userQuestion, query, images = [], captions = [] }) {
        const count = images.length || captions.length || 1;
        const captionContext = captions
            .filter(Boolean)
            .map((caption, index) => `${index + 1}. ${caption.replace(/\s+/g, ' ').trim()}`)
            .join('\n')
            .slice(0, 1500);
        try {
            const prompt = buildSmartImageHistoryPrompt({ userQuestion, query, count, captionContext });
            const result = await gemini.ask(prompt);
            const clean = result.trim().replace(/\n+/g, ' ').replace(/^["']|["']$/g, '').trim();
            if (clean.length >= 8 && clean.length <= 300) return clean;
        } catch (_) {}
        return count > 1
            ? `Sudah aku kirim ${count} pilihan gambar yang paling cocok buat "${query}".`
            : `Sudah aku kirim gambar yang paling cocok buat "${query}".`;
    }

    async function ensureYtdlp(hisoka, m) {
        const binDir = path.join(process.cwd(), 'bin');
        const ytdlpBin = path.join(binDir, 'yt-dlp');

        if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
        }

        if (fs.existsSync(ytdlpBin)) return ytdlpBin;

        console.log('\x1b[33m[YT-DLP] Binary tidak ditemukan, mengunduh otomatis...\x1b[39m');

        if (hisoka && m) {
            await hisoka.sendMessage(m.from, { react: { text: '⬇️', key: m.key } });
            await tolak(hisoka, m, '⬇️ *Mohon tunggu sebentar...*\n\nSistem sedang mempersiapkan downloader YouTube. Proses ini hanya terjadi sekali dan tidak akan terulang lagi. Permintaanmu akan otomatis dilanjutkan setelah siap. ⏳');
        }

        const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

        await new Promise((resolve, reject) => {
            exec(`curl -L "${downloadUrl}" -o "${ytdlpBin}"`, { timeout: 120000 }, (err) => {
                if (err) return reject(new Error('Gagal mengunduh yt-dlp: ' + err.message));
                resolve();
            });
        });

        fs.chmodSync(ytdlpBin, 0o755);
        console.log('\x1b[32m[YT-DLP] ✓ Binary berhasil diunduh dan siap digunakan.\x1b[39m');

        if (hisoka && m) {
            await tolak(hisoka, m, '✅ *Downloader siap!* Sedang memproses permintaanmu...');
        }

        return ytdlpBin;
    }

    async function processAIMediaAndSend(hisoka, m, response, opts = {}) {
        let working = String(response || '').trim();
        if (!working) return { cleanText: '', sentText: null, counts: { images: 0, stickers: 0, voiceNotes: 0, songs: 0, videos: 0 } };
        const _sessionKey = opts.sessionKey || '';

        const imgRes = await extractImagesFromText(working);
        working = imgRes.cleanText;
        const images = imgRes.images || [];

        let stickers = [];
        if (hasStickerMarker(working)) {
            try {
                const stickerRes = await extractStickersFromText(working);
                working = stickerRes.cleanText;
                stickers = stickerRes.stickers || [];
            } catch (e) {
                wilyError(`[AIMedia] ❌ extractStickers gagal: ${e.message}`);
            }
            try {
                const replyStkRes = await extractReplyStickersFromText(working, { sessionKey: _sessionKey, contextText: String(response || '').substring(0, 300) });
                working = replyStkRes.cleanText;
                if (replyStkRes.stickers?.length) {
                    stickers.push(...replyStkRes.stickers);
                }
            } catch (e) {
                wilyError(`[AIMedia] ❌ extractReplyStickers gagal: ${e.message}`);
            }
        }

        const vnRes = await extractVoiceNotesFromText(working);
        working = vnRes.cleanText;
        const voiceNotes = vnRes.voiceNotes || [];

        let songs = [];
        let videos = [];
        let ytAudios = [];
        if (hasMediaDownloadMarker(working)) {
            try {
                const ytdlpBin = await ensureYtdlp(hisoka, m);
                const songRes = await extractSongsFromText(working, { ytdlpBin });
                working = songRes.cleanText;
                songs = songRes.songs || [];
                const videoRes = await extractVideosFromText(working, { ytdlpBin });
                working = videoRes.cleanText;
                videos = videoRes.videos || [];
                const ytAudioRes = await extractYouTubeAudioFromText(working, { ytdlpBin });
                working = ytAudioRes.cleanText;
                ytAudios = ytAudioRes.ytAudios || [];
            } catch (e) {
                wilyError(`[AIMedia] ❌ ensureYtdlp gagal: ${e.message}`);
            }
        }

        let tikToks = [];
        let instagrams = [];
        let facebooks = [];
        if (hasSocialDLMarker(working)) {
            try {
                const ttRes = await extractTikTokFromText(working);
                working = ttRes.cleanText;
                tikToks = ttRes.tikToks || [];
            } catch (e) {
                wilyError(`[AIMedia] ❌ extractTikTok gagal: ${e.message}`);
            }
            try {
                const igRes = await extractInstagramFromText(working);
                working = igRes.cleanText;
                instagrams = igRes.instagrams || [];
            } catch (e) {
                wilyError(`[AIMedia] ❌ extractInstagram gagal: ${e.message}`);
            }
            try {
                const fbRes = await extractFacebookFromText(working);
                working = fbRes.cleanText;
                facebooks = fbRes.facebooks || [];
            } catch (e) {
                wilyError(`[AIMedia] ❌ extractFacebook gagal: ${e.message}`);
            }
        }

        for (const img of images) {
            try {
                await hisoka.sendMessage(m.from, { image: img.buffer, caption: '🖼️' }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim gambar gagal: ${e.message}`); }
        }
        for (const stk of stickers) {
            try {
                await hisoka.sendMessage(m.from, { sticker: stk.buffer }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim sticker gagal: ${e.message}`); }
        }
        for (const vn of voiceNotes) {
            try {
                await hisoka.sendMessage(m.from, {
                    audio: vn.buffer,
                    mimetype: 'audio/mp4',
                    ptt: true,
                }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim VN gagal: ${e.message}`); }
        }
        for (const song of songs) {
            try {
                const safeName = (song.title || 'lagu').replace(/[^\w\s-]/g, '').slice(0, 80) || 'lagu';
                await hisoka.sendMessage(m.from, {
                    audio: song.buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeName}.mp3`,
                    ptt: false,
                }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim lagu gagal: ${e.message}`); }
        }
        for (const video of videos) {
            try {
                const cap = `🎬 *${video.title}*\n👤 ${video.channel}`;
                await hisoka.sendMessage(m.from, {
                    video: video.buffer,
                    caption: cap,
                    mimetype: 'video/mp4',
                }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim video gagal: ${e.message}`); }
        }
        for (const yta of ytAudios) {
            try {
                const safeName = (yta.title || 'audio').replace(/[^\w\s-]/g, '').slice(0, 80) || 'audio';
                await hisoka.sendMessage(m.from, {
                    audio: yta.buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeName}.mp3`,
                    ptt: false,
                }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim ytmp3 gagal: ${e.message}`); }
        }
        for (const tt of tikToks) {
            try {
                const shortDesc = (tt.desc || '').length > 200 ? tt.desc.slice(0, 200) + '...' : (tt.desc || '');
                const cap = `╭═══ *TIKTOK* ═══╮\n│ 👤 @${tt.author}\n${shortDesc ? '│\n│ 📝 ' + shortDesc + '\n' : ''}╰════════════════╯`;
                if (tt.videoUrl) {
                    await hisoka.sendMessage(m.from, { video: { url: tt.videoUrl }, caption: cap }, { quoted: m });
                } else if (tt.images?.length > 0) {
                    await hisoka.sendMessage(m.from, { text: cap }, { quoted: m });
                    for (let i = 0; i < Math.min(tt.images.length, 10); i++) {
                        await hisoka.sendMessage(m.from, {
                            image: { url: tt.images[i] },
                            caption: `📷 ${i + 1}/${tt.images.length}`,
                        }, { quoted: m });
                    }
                }
            } catch (e) { wilyError(`[AIMedia] kirim tiktok gagal: ${e.message}`); }
        }
        for (const ig of instagrams) {
            try {
                const shortCap = (ig.caption || '').length > 200 ? ig.caption.slice(0, 200) + '...' : (ig.caption || '');
                const infoText = `╭═══ *INSTAGRAM* ═══╮\n│ 👤 @${ig.username}\n${shortCap ? '│\n│ 📝 ' + shortCap + '\n' : ''}╰═════════════════╯`;
                for (let i = 0; i < ig.mediaItems.length; i++) {
                    const item = ig.mediaItems[i];
                    const isFirst = i === 0;
                    try {
                        if (item.isVideo) {
                            await hisoka.sendMessage(m.from, { video: { url: item.url }, caption: isFirst ? infoText : '' }, { quoted: m });
                        } else {
                            await hisoka.sendMessage(m.from, { image: { url: item.url }, caption: isFirst ? infoText : '' }, { quoted: m });
                        }
                    } catch (sendErr) { wilyError(`[AIMedia] kirim ig item ${i + 1} gagal: ${sendErr.message}`); }
                }
            } catch (e) { wilyError(`[AIMedia] kirim instagram gagal: ${e.message}`); }
        }
        for (const fb of facebooks) {
            try {
                const shortTitle = (fb.title || '').length > 100 ? fb.title.slice(0, 100) + '...' : (fb.title || '');
                const cap = `╭═══ *FACEBOOK* ═══╮\n│ 🎬 ${shortTitle || 'Video Facebook'}\n│ 📊 Kualitas: ${fb.quality || 'SD'}\n╰══════════════════╯`;
                await hisoka.sendMessage(m.from, { video: { url: fb.videoUrl }, caption: cap }, { quoted: m });
            } catch (e) { wilyError(`[AIMedia] kirim facebook gagal: ${e.message}`); }
        }

        const finalText = working.replace(/\n{3,}/g, '\n\n').trim();
        let sentText = null;
        if (finalText) {
            sentText = await sendAIReply(hisoka, m, finalText);
        }

        const totalMedia = images.length + stickers.length + voiceNotes.length + songs.length + videos.length + ytAudios.length + tikToks.length + instagrams.length + facebooks.length;
        if (totalMedia > 0) {
            wilyLog(`\x1b[36m[AIMedia]\x1b[39m sent → ${images.length} img + ${stickers.length} stk + ${voiceNotes.length} vn + ${songs.length} lagu + ${videos.length} video + ${ytAudios.length} ytmp3 + ${tikToks.length} tt + ${instagrams.length} ig + ${facebooks.length} fb`);
        }

        return {
            cleanText: finalText,
            sentText,
            counts: { images: images.length, stickers: stickers.length, voiceNotes: voiceNotes.length, songs: songs.length, videos: videos.length, ytAudios: ytAudios.length, tikToks: tikToks.length, instagrams: instagrams.length, facebooks: facebooks.length },
        };
    }

    return {
        buildSmartImageWaitText,
        buildSmartAlbumCaptions,
        sendImageAlbum,
        buildSmartImageHistoryReply,
        ensureYtdlp,
        processAIMediaAndSend,
    };
}

module.exports = {
    detectImageSearchQuery,
    extractImageCount,
    cleanImageTitle,
    makeWilyHelpers,
};
