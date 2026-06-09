'use strict';

/**
 * Handler untuk command .allunduh
 * Universal downloader — auto-detect platform dari URL
 * Supported: Instagram, TikTok, YouTube, Facebook, Twitter/X
 *
 * @param {object} hisoka - bot socket
 * @param {object} m       - pesan
 * @param {string} query   - URL apapun
 * @param {object} ctx     - semua ctx dari message.js
 */

const path = require('path');

function detectPlatform(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        if (host === 'instagram.com' || host === 'instagr.am') return 'instagram';
        if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return 'tiktok';
        if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'youtube';
        if (host === 'facebook.com' || host === 'fb.watch' || host === 'm.facebook.com' || host === 'fb.com') return 'facebook';
        if (host === 'twitter.com' || host === 'x.com' || host === 't.co') return 'twitter';
        if (host === 'pinterest.com' || host === 'pin.it') return 'pinterest';
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

async function fetchInstagram(url) {
    const vdrawRes = await fetch('https://vdraw.ai/api/v1/instagram/ins-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: 'video' }),
        signal: AbortSignal.timeout(18000),
    }).then(r => r.json()).catch(() => null);

    if (vdrawRes?.code === 100000 && vdrawRes?.data?.info?.length) {
        return vdrawRes.data;
    }

    const archiveRes = await fetch(
        `https://archive.lick.eu.org/api/download/instagram?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(15000) }
    ).then(r => r.json()).catch(() => null);

    if (archiveRes?.status && archiveRes?.result) {
        const r = archiveRes.result;
        return {
            media_type: r.isVideo ? 'reel' : 'photo',
            info: (r.url || []).map(u => ({
                url: typeof u === 'object' ? (u.url || u.src) : u,
                media_format: r.isVideo ? 'video' : 'image',
            })),
        };
    }

    return null;
}

async function fetchTwitter(url) {
    const archiveRes = await fetch(
        `https://archive.lick.eu.org/api/download/twitter?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(15000) }
    ).then(r => r.json()).catch(() => null);

    if (archiveRes?.status && archiveRes?.result) {
        return archiveRes.result;
    }
    return null;
}

async function fetchPinterest(url) {
    const archiveRes = await fetch(
        `https://archive.lick.eu.org/api/download/pinterest?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(15000) }
    ).then(r => r.json()).catch(() => null);

    if (archiveRes?.status && archiveRes?.result) {
        return archiveRes.result;
    }
    return null;
}

async function handleAllUnduh(hisoka, m, query, ctx) {
    const {
        tolak, logCommand, gemini,
        buildVideoDownloadCaptionPrompt,
        buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption, parseIgMetaHtml, formatIgCount,
        buildFbVisionPrompt, buildFbCaptionPrompt, buildFbFallbackCaption, parseFbMetaHtml, formatFbCount,
        exec, util,
    } = ctx;

    const pfx = m.prefix || '.';

    if (!query || !query.trim()) {
        await tolak(hisoka, m,
            `╭═══『 🌐 *ALL DOWNLOADER* 』═══╮\n│\n` +
            `│ Download video/foto dari berbagai\n` +
            `│ platform secara otomatis.\n│\n` +
            `│ *Cara Pakai:*\n` +
            `│ ${pfx}allunduh [link]\n│\n` +
            `│ *Platform Supported:*\n` +
            `│ ▸ Instagram (Reel, Feed, Story)\n` +
            `│ ▸ TikTok (Video, Slide)\n` +
            `│ ▸ YouTube (Video)\n` +
            `│ ▸ Facebook (Video, Reel)\n` +
            `│ ▸ Twitter / X (Video)\n` +
            `│ ▸ Pinterest (Foto/Video)\n│\n` +
            `│ *Contoh:*\n` +
            `│ ${pfx}allunduh https://www.instagram.com/reel/xxx\n` +
            `│ ${pfx}allunduh https://vt.tiktok.com/xxx\n` +
            `│ ${pfx}allunduh https://youtu.be/xxx\n` +
            `│ ${pfx}allunduh https://twitter.com/xxx\n` +
            `╰══════════════════════╯`
        );
        return;
    }

    const rawUrl = query.trim().split(/\s+/)[0];
    let normalUrl = rawUrl;
    try {
        const parsed = new URL(rawUrl);
        normalUrl = parsed.origin + parsed.pathname.replace(/\/$/, '') + '/';
    } catch {
        await tolak(hisoka, m, '❌ URL tidak valid. Pastikan link benar dan lengkap.');
        return;
    }

    const platform = detectPlatform(rawUrl);

    if (platform === 'unknown') {
        await tolak(hisoka, m,
            `❌ Platform tidak dikenali.\n\n` +
            `Platform yang didukung:\n` +
            `• Instagram, TikTok, YouTube\n` +
            `• Facebook, Twitter/X, Pinterest`
        );
        return;
    }

    const platformEmoji = {
        instagram: '📸 Instagram',
        tiktok: '🎵 TikTok',
        youtube: '▶️ YouTube',
        facebook: '📘 Facebook',
        twitter: '🐦 Twitter/X',
        pinterest: '📌 Pinterest',
    };

    const loadingMsg = await tolak(hisoka, m, `⏳ Mengunduh dari ${platformEmoji[platform] || platform}...`);

    try {
        if (platform === 'instagram') {
            const { handleInstagramDl } = require(path.resolve('./src/scrape/instagram-dl.cjs'));
            await handleInstagramDl(hisoka, m, rawUrl, {
                gemini, tolak: async (s, msg, text) => {
                    await m.reply({ edit: loadingMsg.key, text }).catch(() => {});
                    return { key: loadingMsg.key };
                },
                logCommand, exec, util,
                buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption,
                parseIgMetaHtml, formatIgCount,
            });
            return;
        }

        if (platform === 'tiktok') {
            const { handleTiktokDl } = require(path.resolve('./src/scrape/tiktok-dl.cjs'));
            await handleTiktokDl(hisoka, m, rawUrl, {
                gemini, tolak: async (s, msg, text) => {
                    await m.reply({ edit: loadingMsg.key, text }).catch(() => {});
                    return { key: loadingMsg.key };
                },
                logCommand, buildVideoDownloadCaptionPrompt,
            });
            return;
        }

        if (platform === 'youtube') {
            const { handleYtmp4 } = require(path.resolve('./src/scrape/youtube-dl.cjs'));
            await handleYtmp4(hisoka, m, rawUrl, {
                gemini, tolak: async (s, msg, text) => {
                    await m.reply({ edit: loadingMsg.key, text }).catch(() => {});
                    return { key: loadingMsg.key };
                },
                logCommand,
            });
            return;
        }

        if (platform === 'facebook') {
            const { handleFacebookDl } = require(path.resolve('./src/scrape/facebook-dl.cjs'));
            await handleFacebookDl(hisoka, m, rawUrl, {
                gemini, tolak: async (s, msg, text) => {
                    await m.reply({ edit: loadingMsg.key, text }).catch(() => {});
                    return { key: loadingMsg.key };
                },
                logCommand,
                buildFbVisionPrompt, buildFbCaptionPrompt, buildFbFallbackCaption,
                parseFbMetaHtml, formatFbCount,
            });
            return;
        }

        if (platform === 'twitter') {
            await m.reply({ edit: loadingMsg.key, text: '⏳ Mengambil video Twitter/X...' }).catch(() => {});

            const twData = await fetchTwitter(rawUrl);
            if (!twData) {
                await m.reply({ edit: loadingMsg.key, text: '❌ Gagal mengunduh dari Twitter/X. Video mungkin privat atau tidak tersedia.' }).catch(() => {});
                return;
            }

            const videoUrl = twData.url || twData.video_url || twData.hd || twData.sd;
            if (!videoUrl) {
                await m.reply({ edit: loadingMsg.key, text: '❌ Tidak ada video ditemukan di link Twitter/X ini.' }).catch(() => {});
                return;
            }

            await m.reply({ edit: loadingMsg.key, text: '📥 Mengirim video Twitter/X...' }).catch(() => {});
            await hisoka.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `🐦 *Twitter/X Download*\n\n🔗 ${rawUrl}`,
                mimetype: 'video/mp4',
            }, { quoted: m });

            logCommand && logCommand(m, hisoka, 'allunduh-twitter');
            return;
        }

        if (platform === 'pinterest') {
            await m.reply({ edit: loadingMsg.key, text: '⏳ Mengambil konten Pinterest...' }).catch(() => {});

            const pinData = await fetchPinterest(rawUrl);
            if (!pinData) {
                await m.reply({ edit: loadingMsg.key, text: '❌ Gagal mengunduh dari Pinterest.' }).catch(() => {});
                return;
            }

            const mediaUrl = pinData.url || pinData.video_url || pinData.image_url;
            const isVideo = !!(pinData.url?.includes('.mp4') || pinData.video_url);

            await m.reply({ edit: loadingMsg.key, text: '📥 Mengirim konten Pinterest...' }).catch(() => {});

            if (isVideo) {
                await hisoka.sendMessage(m.chat, {
                    video: { url: mediaUrl },
                    caption: `📌 *Pinterest Download*\n\n🔗 ${rawUrl}`,
                    mimetype: 'video/mp4',
                }, { quoted: m });
            } else {
                await hisoka.sendMessage(m.chat, {
                    image: { url: mediaUrl },
                    caption: `📌 *Pinterest Download*\n\n🔗 ${rawUrl}`,
                }, { quoted: m });
            }

            logCommand && logCommand(m, hisoka, 'allunduh-pinterest');
            return;
        }

    } catch (err) {
        console.error('[AllUnduh] Error:', err.message);
        await m.reply({
            edit: loadingMsg.key,
            text: `❌ Gagal mengunduh.\n\n• Coba link spesifik: ${m.prefix || '.'}ig / ${m.prefix || '.'}tt / ${m.prefix || '.'}fb\n• Pastikan link benar dan konten tidak privat`,
        }).catch(() => {});
    }
}

module.exports = { handleAllUnduh, detectPlatform };
