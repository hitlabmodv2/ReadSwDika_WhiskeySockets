/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  twitter-dl.cjs — Downloader Twitter/X (.twdl)
 *  Download video tweet via x-downloader API
 * ───────────────────────────────
 */
'use strict';

/**
 * Twitter/X Downloader
 * Primary  : api.x-downloader.com  (web scrape dari x-downloader.com/en/)
 * Fallback : api.fxtwitter.com
 *
 * Tested ✅:
 *   - https://x.com/tilay_mc/status/2064220380433469469/video/1
 *   - https://x.com/xdownloadercom/status/1903302115721629989
 */

const XDL_REQUEST  = 'https://api.x-downloader.com/request';
const XDL_DOWNLOAD = 'https://api.x-downloader.com/download';
const FX_API       = 'https://api.fxtwitter.com';

const XDL_HEADERS = {
    'Content-Type': 'application/json',
    'Origin': 'https://x-downloader.com',
    'Referer': 'https://x-downloader.com/en/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

/* ─────────────────────── helpers ─────────────────────── */

function parseTwitterUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        if (!['x.com', 'twitter.com', 't.co', 'vxtwitter.com', 'fxtwitter.com'].includes(host)) return null;
        const parts = u.pathname.split('/').filter(Boolean);
        const statusIdx = parts.findIndex(p => p === 'status');
        if (statusIdx < 0 || !parts[statusIdx + 1]) return null;
        return { user: parts[0] || 'i', statusId: parts[statusIdx + 1] };
    } catch { return null; }
}

function fmtNum(n) {
    if (!n && n !== 0) return '-';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
    if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'rb';
    return String(n);
}

function fmtDur(sec) {
    if (!sec) return null;
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ──────────────── x-downloader.com API ──────────────── */

async function fetchXDownloader(url) {
    const res = await fetch(XDL_REQUEST, {
        method: 'POST',
        headers: XDL_HEADERS,
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;

    const text = await res.text();
    // Response kadang 2 JSON sekaligus: {...}{...}  — ambil yang pertama
    const firstJson = text.match(/^\{.*?\}(?=\{|$)/s)?.[0] || text;
    let data;
    try { data = JSON.parse(firstJson); } catch { return null; }

    if (!data || data.status === 'error') return null;

    // Susun format: pilih resolusi tertinggi (label terbesar)
    const formats = (data.formats || []).map(f => ({
        label: f.label || '',
        url: `${XDL_DOWNLOAD}/${f.filename}`,
        width:  parseInt((f.label || '0x0').split('x')[0]) || 0,
        height: parseInt((f.label || '0x0').split('x')[1]) || 0,
    })).sort((a, b) => (b.width * b.height) - (a.width * a.height));

    const bestUrl = formats[0]?.url
        || (data.filename ? `${XDL_DOWNLOAD}/${data.filename}` : null);

    if (!bestUrl) return null;

    return {
        source: 'xdownloader',
        videoUrl: bestUrl,
        formats,
        title: data.title || '',
        author: data.author || '',
        resolution: data.resolution || formats[0]?.label || '',
        thumbnail: data.thumbnail ? `https://i.x-downloader.com/${data.thumbnail}` : null,
        filesize: data.filesize_approx_mb ? `${data.filesize_approx_mb} MB` : null,
        isGif: false,
    };
}

/* ──────────────── fxtwitter fallback ──────────────── */

async function fetchFxTwitter(user, statusId) {
    const res = await fetch(`${FX_API}/${user}/status/${statusId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WilyBot/1.0)', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 200 || !data?.tweet) return null;
    const tweet = data.tweet;
    const mediaAll = tweet.media?.all || [];

    const videos = mediaAll.filter(item => item.type === 'video' || item.type === 'gif');
    const photos = mediaAll.filter(item => item.type === 'photo');

    if (videos.length === 0 && photos.length === 0) return null;

    if (videos.length > 0) {
        const vid = videos[0];
        const mp4s = (vid.formats || [])
            .filter(f => f.container === 'mp4' && f.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const bestUrl = mp4s[0]?.url || vid.url;
        if (!bestUrl) return null;

        return {
            source: 'fxtwitter',
            videoUrl: bestUrl,
            formats: mp4s.map(f => ({ url: f.url, label: `${f.bitrate || 0}bps` })),
            title: tweet.text || '',
            author: tweet.author?.name || '',
            authorHandle: tweet.author?.screen_name || '',
            resolution: vid.width && vid.height ? `${vid.width}x${vid.height}` : '',
            duration: fmtDur(vid.duration),
            thumbnail: vid.thumbnail_url || null,
            isGif: vid.type === 'gif',
            photos: photos.map(p => p.url),
            likes: tweet.likes || 0,
            retweets: tweet.retweets || 0,
            replies: tweet.replies || 0,
            views: tweet.views || 0,
            createdAt: tweet.created_at,
        };
    }

    // Foto saja
    return {
        source: 'fxtwitter',
        videoUrl: null,
        photos: photos.map(p => p.url),
        title: tweet.text || '',
        author: tweet.author?.name || '',
        authorHandle: tweet.author?.screen_name || '',
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
        views: tweet.views || 0,
        createdAt: tweet.created_at,
    };
}

/* ──────────────── main handler ──────────────── */

async function handleTwitterDl(hisoka, m, query, ctx = {}) {
    const { tolak, logCommand } = ctx;
    const pfx = m.prefix || '.';

    if (!query || !query.trim()) {
        return tolak(hisoka, m,
            `╭═══『 🐦 *TWITTER / X DL* 』═══╮\n│\n` +
            `│ Download video/foto dari Twitter (X)\n│\n` +
            `│ *Cara Pakai:*\n` +
            `│ ${pfx}twdl [link tweet]\n│\n` +
            `│ *Contoh:*\n` +
            `│ ${pfx}twdl https://x.com/user/status/123\n│\n` +
            `│ *Support:*\n` +
            `│ ▸ Video & GIF\n` +
            `│ ▸ Foto (single & multi)\n` +
            `╰══════════════════════╯`
        );
    }

    const rawUrl = query.trim().split(/\s+/)[0];
    const parsed = parseTwitterUrl(rawUrl);

    if (!parsed) {
        return tolak(hisoka, m,
            `❌ URL Twitter/X tidak valid.\n\nContoh link:\nhttps://x.com/username/status/ID`
        );
    }

    // Loading message — pakai hisoka.sendMessage langsung, aman dari jidDecode issue
    let loadKey = null;
    try {
        const sent = await hisoka.sendMessage(m.from, { text: '⏳ Mengunduh dari Twitter/X...' }, { quoted: m });
        loadKey = sent?.key || null;
    } catch { /* lanjut meski gagal */ }

    const editLoad = async (text) => {
        if (loadKey) {
            try {
                await hisoka.sendMessage(m.from, { text, edit: loadKey });
            } catch {
                await hisoka.sendMessage(m.from, { text }, { quoted: m }).catch(() => {});
            }
        } else {
            await hisoka.sendMessage(m.from, { text }, { quoted: m }).catch(() => {});
        }
    };

    try {
        // ── fxtwitter primary (direct video.twimg.com URL, streaming-friendly) ──
        await editLoad('🔍 Mengambil info tweet...');
        let result = await fetchFxTwitter(parsed.user, parsed.statusId).catch(() => null);

        // ── Fallback x-downloader (metadata only, coba jika fxtwitter gagal) ──
        if (!result) {
            await editLoad('🔄 Mencoba x-downloader.com...');
            result = await fetchXDownloader(rawUrl).catch(() => null);
        }

        if (!result) {
            return editLoad(
                `❌ Gagal mengambil video Twitter/X.\n\n` +
                `• Tweet dihapus atau akun privat\n` +
                `• Coba lagi beberapa saat`
            );
        }

        const captionBase =
            `🐦 *Twitter/X Download*\n\n` +
            (result.author ? `👤 *${result.author}*${result.authorHandle ? ` @${result.authorHandle}` : ''}\n` : '') +
            (result.title  ? `📝 ${result.title.slice(0, 200)}${result.title.length > 200 ? '...' : ''}\n` : '') +
            (result.createdAt ? `📅 ${new Date(result.createdAt * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}\n` : '') +
            (result.likes != null ? `❤️ ${fmtNum(result.likes)}  🔁 ${fmtNum(result.retweets)}  💬 ${fmtNum(result.replies)}  👁️ ${fmtNum(result.views)}\n` : '') +
            (result.resolution  ? `📐 ${result.resolution}` : '') +
            (result.filesize    ? `  📦 ${result.filesize}` : '') +
            (result.duration    ? `  ⏱️ ${result.duration}` : '');

        // ── Video / GIF ──
        if (result.videoUrl) {
            await editLoad('📥 Mengirim video...');
            await hisoka.sendMessage(m.from, {
                video: { url: result.videoUrl },
                caption: captionBase.trim(),
                mimetype: 'video/mp4',
                ...(result.isGif ? { gifPlayback: true } : {}),
            }, { quoted: m });

            // Foto tambahan (kalau ada bareng video)
            if (result.photos?.length) {
                for (const pUrl of result.photos.slice(0, 9)) {
                    await hisoka.sendMessage(m.from, {
                        image: { url: pUrl },
                        caption: '📸 Foto dari tweet yang sama',
                    }, { quoted: m }).catch(() => {});
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            logCommand && logCommand(m, hisoka, 'twdl');
            return;
        }

        // ── Foto saja ──
        if (result.photos?.length) {
            await editLoad(`📥 Mengirim ${result.photos.length} foto...`);
            for (let i = 0; i < result.photos.length; i++) {
                await hisoka.sendMessage(m.from, {
                    image: { url: result.photos[i] },
                    caption: i === 0
                        ? captionBase.trim() + `\n📸 *${result.photos.length} Foto* [${i + 1}/${result.photos.length}]`
                        : `📸 [${i + 1}/${result.photos.length}]`,
                }, { quoted: m }).catch(() => {});
                await new Promise(r => setTimeout(r, 600));
            }
            logCommand && logCommand(m, hisoka, 'twdl');
            return;
        }

        await editLoad('ℹ️ Tweet ini tidak memiliki media video/foto.');

    } catch (err) {
        console.error('[TwitterDl] Error:', err.message);
        await editLoad(`❌ Error: ${err.message?.slice(0, 100)}`).catch(() => {});
    }
}

module.exports = { handleTwitterDl, parseTwitterUrl };
