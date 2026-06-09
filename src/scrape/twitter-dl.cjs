'use strict';

/**
 * Twitter/X Downloader — menggunakan fxtwitter API
 * Endpoint: https://api.fxtwitter.com/{user}/status/{id}
 *
 * Tested ✅:
 *   - https://x.com/tilay_mc/status/2064220380433469469/video/1
 *   - https://x.com/xdownloadercom/status/1903302115721629989
 */

const FXTWITTER_API = 'https://api.fxtwitter.com';

/**
 * Normalisasi URL x.com / twitter.com → ambil user + statusId
 * @param {string} url
 * @returns {{ user: string, statusId: string } | null}
 */
function parseTwitterUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        if (!['x.com', 'twitter.com', 't.co', 'vxtwitter.com', 'fxtwitter.com'].includes(host)) return null;
        const parts = u.pathname.split('/').filter(Boolean);
        const statusIdx = parts.findIndex(p => p === 'status');
        if (statusIdx < 0 || !parts[statusIdx + 1]) return null;
        return {
            user: parts[0] || 'i',
            statusId: parts[statusIdx + 1],
        };
    } catch {
        return null;
    }
}

/**
 * Ambil data tweet dari fxtwitter API
 * @param {string} user
 * @param {string} statusId
 * @returns {Promise<object|null>}
 */
async function fetchTweetData(user, statusId) {
    const url = `${FXTWITTER_API}/${user}/status/${statusId}`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WilyBot/1.0)',
            'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 200 || !data?.tweet) return null;
    return data.tweet;
}

/**
 * Pilih format MP4 terbaik (bitrate tertinggi)
 * @param {Array} formats
 * @returns {string|null}
 */
function pickBestMp4(formats = []) {
    const mp4s = formats
        .filter(f => f.container === 'mp4' && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return mp4s[0]?.url || null;
}

/**
 * Format angka: 1234567 → 1.2jt
 */
function fmtNum(n) {
    if (!n && n !== 0) return '-';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'rb';
    return String(n);
}

/**
 * Format durasi detik → mm:ss
 */
function fmtDur(sec) {
    if (!sec) return null;
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Handler utama .twdl / .twitter / .xdl
 * @param {object} hisoka
 * @param {object} m
 * @param {string} query  — URL tweet
 * @param {object} ctx    — { tolak, logCommand }
 */
async function handleTwitterDl(hisoka, m, query, ctx = {}) {
    const { tolak, logCommand } = ctx;
    const pfx = m.prefix || '.';

    if (!query || !query.trim()) {
        await tolak(hisoka, m,
            `╭═══『 🐦 *TWITTER / X DL* 』═══╮\n│\n` +
            `│ Download video/foto dari Twitter (X)\n│\n` +
            `│ *Cara Pakai:*\n` +
            `│ ${pfx}twdl [link tweet]\n│\n` +
            `│ *Contoh:*\n` +
            `│ ${pfx}twdl https://x.com/user/status/123\n│\n` +
            `│ *Support:*\n` +
            `│ ▸ Video (HD)\n` +
            `│ ▸ GIF\n` +
            `│ ▸ Foto (single & multi)\n` +
            `╰══════════════════════╯`
        );
        return;
    }

    const rawUrl = query.trim().split(/\s+/)[0];
    const parsed = parseTwitterUrl(rawUrl);

    if (!parsed) {
        await tolak(hisoka, m,
            `❌ URL Twitter/X tidak valid.\n\n` +
            `Pastikan link berbentuk:\n` +
            `https://x.com/username/status/ID\n` +
            `atau https://twitter.com/username/status/ID`
        );
        return;
    }

    const loadMsg = await tolak(hisoka, m, `⏳ Mengambil data dari Twitter/X...`);

    const editLoad = async (text) => {
        await m.reply({ edit: loadMsg.key, text }).catch(() => {});
    };

    try {
        await editLoad('🔍 Fetching tweet info...');
        const tweet = await fetchTweetData(parsed.user, parsed.statusId);

        if (!tweet) {
            await editLoad(
                `❌ Gagal mengambil data tweet.\n\n` +
                `Kemungkinan penyebab:\n` +
                `• Tweet dihapus atau akun privat\n` +
                `• Link tidak valid\n` +
                `• Coba lagi beberapa saat`
            );
            return;
        }

        const author    = tweet.author || {};
        const mediaList = tweet.media?.all || [];
        const text      = tweet.text || '';
        const likes     = tweet.likes || 0;
        const retweets  = tweet.retweets || 0;
        const replies   = tweet.replies || 0;
        const views     = tweet.views || 0;
        const createdAt = tweet.created_at ? new Date(tweet.created_at * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

        if (!mediaList.length) {
            await editLoad(
                `ℹ️ Tweet ini tidak mengandung video/foto.\n\n` +
                `👤 *${author.name || 'Unknown'}* @${author.screen_name || ''}\n` +
                `📝 ${text.slice(0, 200)}`
            );
            return;
        }

        const videos = mediaList.filter(m => m.type === 'video' || m.type === 'gif');
        const photos = mediaList.filter(m => m.type === 'photo');

        const captionBase =
            `🐦 *Twitter/X Download*\n\n` +
            `👤 *${author.name || 'Unknown'}* @${author.screen_name || ''}\n` +
            (text ? `📝 ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}\n` : '') +
            `📅 ${createdAt}\n` +
            `❤️ ${fmtNum(likes)}  🔁 ${fmtNum(retweets)}  💬 ${fmtNum(replies)}  👁️ ${fmtNum(views)}`;

        if (videos.length > 0) {
            const vid = videos[0];
            const bestUrl = pickBestMp4(vid.formats || []) || vid.url;

            if (!bestUrl) {
                await editLoad('❌ URL video tidak ditemukan.');
                return;
            }

            const dur = fmtDur(vid.duration);
            const dim = (vid.width && vid.height) ? `${vid.width}x${vid.height}` : null;
            const caption = captionBase +
                (vid.type === 'gif' ? '\n🎞️ *GIF*' : '\n🎥 *Video*') +
                (dur ? ` • ⏱️ ${dur}` : '') +
                (dim ? ` • 📐 ${dim}` : '');

            await editLoad('📥 Mengirim video...');
            await hisoka.sendMessage(m.chat, {
                video: { url: bestUrl },
                caption,
                mimetype: 'video/mp4',
                ...(vid.type === 'gif' ? { gifPlayback: true } : {}),
            }, { quoted: m });

            logCommand && logCommand(m, hisoka, 'twdl');

            // Kirim foto tambahan kalau ada
            if (photos.length > 0) {
                for (const photo of photos.slice(0, 9)) {
                    await hisoka.sendMessage(m.chat, {
                        image: { url: photo.url },
                        caption: `📸 Foto dari tweet yang sama`,
                    }, { quoted: m }).catch(() => {});
                    await new Promise(r => setTimeout(r, 500));
                }
            }
            return;
        }

        // Hanya foto
        if (photos.length === 1) {
            await editLoad('📥 Mengirim foto...');
            await hisoka.sendMessage(m.chat, {
                image: { url: photos[0].url },
                caption: captionBase + '\n📸 *Foto*',
            }, { quoted: m });
            logCommand && logCommand(m, hisoka, 'twdl');
            return;
        }

        // Multi-foto
        await editLoad(`📥 Mengirim ${photos.length} foto...`);
        for (let i = 0; i < photos.length; i++) {
            await hisoka.sendMessage(m.chat, {
                image: { url: photos[i].url },
                caption: i === 0
                    ? captionBase + `\n📸 *${photos.length} Foto* [${i + 1}/${photos.length}]`
                    : `📸 [${i + 1}/${photos.length}]`,
            }, { quoted: m }).catch(() => {});
            await new Promise(r => setTimeout(r, 600));
        }
        logCommand && logCommand(m, hisoka, 'twdl');

    } catch (err) {
        console.error('[TwitterDl] Error:', err.message);
        await editLoad(
            `❌ Error saat download Twitter/X.\n\n` +
            `• Cek apakah tweet masih ada\n` +
            `• Pastikan akun tidak privat\n` +
            `• Error: ${err.message?.slice(0, 100)}`
        );
    }
}

module.exports = { handleTwitterDl, parseTwitterUrl, fetchTweetData };
