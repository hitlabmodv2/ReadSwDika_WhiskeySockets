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
 *  facebook-dl.cjs — Downloader Facebook (.fb)
 *  Download video/reels Facebook tanpa login
 * ───────────────────────────────
 */
'use strict';

/**
 * Handler untuk command .fb / .facebook / .fbdl
 * @param {object} hisoka - bot socket
 * @param {object} m       - pesan
 * @param {string} query   - URL Facebook
 * @param {object} ctx     - { gemini, tolak, logCommand,
 *                            buildFbVisionPrompt, buildFbCaptionPrompt,
 *                            buildFbFallbackCaption, parseFbMetaHtml, formatFbCount }
 */

// ── Primary scraper: alwayscodex savefrom API ─────────────────────────────────
async function fetchAlwayscodexFb(url) {
    try {
        const res = await fetch('https://api.alwayscodex.my.id/api/downloader/savefrom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'vidio' }),
            signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (!json?.status || !Array.isArray(json?.data) || json.data.length === 0) return null;

        // Ambil video (bukan audio), urutkan kualitas tertinggi dulu
        const videos = json.data
            .filter(item => item.url && !item.is_audio)
            .sort((a, b) => {
                const qa = parseInt(a.quality) || 0;
                const qb = parseInt(b.quality) || 0;
                return qb - qa; // descending: 720 > 360 > 4
            });

        if (!videos.length) return null;

        const best = videos[0];
        return {
            url      : best.url,
            quality  : best.quality === '720' ? 'HD' : best.quality === '480' ? 'SD' : best.quality || 'SD',
            isHD     : parseInt(best.quality) >= 480,
            isVideo  : true,
            title    : best.title || '',
            thumbnail: best.thumbnail || null,
            _source  : 'alwayscodex',
        };
    } catch (e) {
        console.log('[FB] alwayscodex failed:', e.message);
        return null;
    }
}

// ── Fallback 1: archive.lick.eu.org ──────────────────────────────────────────
async function fetchArchiveFb(url) {
    try {
        const apiUrl = `https://archive.lick.eu.org/api/download/facebook?url=${encodeURIComponent(url)}`;
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.status || !data?.result?.media?.length) return null;

        const mediaList = data.result.media;
        const hdMedia   = mediaList.find(item =>
            item.quality && (item.quality.toLowerCase().includes('hd') || item.quality.toLowerCase().includes('high'))
        );
        const best = hdMedia || mediaList[0];
        if (!best?.url) return null;

        return {
            url      : best.url,
            quality  : hdMedia ? 'HD' : 'SD',
            isHD     : !!hdMedia,
            isVideo  : true,
            title    : data.result.metadata?.title || '',
            thumbnail: data.result.metadata?.thumbnail || data.result.thumbnail || null,
            _source  : 'archive',
        };
    } catch (e) {
        console.log('[FB] archive fallback failed:', e.message);
        return null;
    }
}

// ── Fallback 2: Chrome UA page scraping ──────────────────────────────────────
async function fetchChromeUAFb(url) {
    try {
        const axios = (await import('axios')).default;
        const { data: pageData } = await axios.get(url, {
            maxRedirects: 10,
            headers: {
                'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'sec-fetch-dest' : 'document',
                'sec-fetch-mode' : 'navigate',
                'sec-fetch-site' : 'none',
            },
            timeout: 20000,
        });
        const cleaned = pageData.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        const hdMatch  = cleaned.match(/"browser_native_hd_url":"([^"]+)"/) || cleaned.match(/"playable_url_quality_hd":"([^"]+)"/);
        const sdMatch  = cleaned.match(/"browser_native_sd_url":"([^"]+)"/) || cleaned.match(/"playable_url":"([^"]+)"/);
        const hdUrl    = hdMatch ? hdMatch[1].replace(/\\/g, '') : null;
        const sdUrl    = sdMatch ? sdMatch[1].replace(/\\/g, '') : null;
        const videoUrl = hdUrl || sdUrl;
        if (!videoUrl || !videoUrl.startsWith('https://')) return null;
        return {
            url    : videoUrl,
            quality: hdUrl ? 'HD' : 'SD',
            isHD   : !!hdUrl,
            isVideo: true,
            _source: 'chrome_ua',
        };
    } catch (e) {
        console.log('[FB] chrome UA fallback failed:', e.message);
        return null;
    }
}

async function handleFacebookDl(hisoka, m, query, ctx) {
    const {
        gemini, tolak, logCommand,
        buildFbVisionPrompt, buildFbCaptionPrompt,
        buildFbFallbackCaption, parseFbMetaHtml, formatFbCount,
    } = ctx;

    if (!query) {
        await tolak(hisoka, m,
            '❌ Masukkan link Facebook!\n\nContoh:\n' +
            '.fb https://www.facebook.com/watch?v=xxx\n' +
            '.fb https://fb.watch/xxx\n' +
            '.fb https://www.facebook.com/reel/xxx\n' +
            '.fb https://www.facebook.com/stories/xxx'
        );
        logCommand(m, hisoka, m.command || 'facebook');
        return;
    }

    const fbUrl = query.trim();
    if (!fbUrl.includes('facebook.com') && !fbUrl.includes('fb.watch') && !fbUrl.includes('fb.com')) {
        await tolak(hisoka, m, '❌ Link tidak valid! Pastikan link dari Facebook.');
        return;
    }

    const loadingMsg = await tolak(hisoka, m, '⏳ Sedang mengunduh dari Facebook...');

    const isStory = fbUrl.includes('/stories/') || fbUrl.includes('story.php') || fbUrl.includes('/story/');
    const isReel  = fbUrl.includes('/reel/');

    // ── Fetch semua sumber paralel ────────────────────────────────────────────
    const [acResult, archiveResult, metaHtmlResult] = await Promise.allSettled([
        fetchAlwayscodexFb(fbUrl),
        fetchArchiveFb(fbUrl),
        // Fetch meta HTML untuk og: tags (caption)
        (async () => {
            const axios = (await import('axios')).default;
            const { data } = await axios.get(fbUrl, {
                maxRedirects: 10,
                headers: {
                    'User-Agent'     : 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                },
                timeout: 15000,
            });
            return data;
        })(),
    ]);

    // ── Prioritas: alwayscodex → archive → chrome UA ──────────────────────────
    let mediaData = null;

    const acData = acResult.status === 'fulfilled' ? acResult.value : null;
    if (acData?.url) {
        mediaData = acData;
        console.log('[FB] ✅ Scraper: alwayscodex');
    }

    if (!mediaData) {
        const archiveData = archiveResult.status === 'fulfilled' ? archiveResult.value : null;
        if (archiveData?.url) {
            mediaData = archiveData;
            console.log('[FB] ✅ Scraper: archive (fallback)');
        }
    }

    if (!mediaData) {
        // Chrome UA: jalan sequential (butuh network call baru, tidak bisa di-paralel awal)
        mediaData = await fetchChromeUAFb(fbUrl);
        if (mediaData) console.log('[FB] ✅ Scraper: chrome_ua (fallback)');
    }

    const metaHtml = metaHtmlResult.status === 'fulfilled' ? metaHtmlResult.value || '' : '';

    if (!mediaData?.url) {
        await m.reply({ edit: loadingMsg.key, text: '❌ Gagal mengunduh. Video/story mungkin private, perlu login, atau link tidak valid.' });
        return;
    }

    // ── Parse metadata ─────────────────────────────────────────────────────────
    const parsedMeta  = parseFbMetaHtml(metaHtml);
    const pageTitle   = mediaData.title || parsedMeta.pageTitle || '';
    const mediaType   = isStory ? 'story' : isReel ? 'reel' : parsedMeta.mediaType || 'video';
    const views       = parsedMeta.views || '';
    const quality     = mediaData.quality || '';
    const hashtags    = parsedMeta.hashtags || [];
    const description = parsedMeta.description || '';

    await m.reply({ edit: loadingMsg.key, text: '✅ Berhasil! Menganalisis konten...' });

    // ── Gemini vision: analisis thumbnail ─────────────────────────────────────
    let fbVisualDesc = '';
    const thumbUrl = mediaData.thumbnail || null;
    if (thumbUrl && gemini) {
        try {
            const { default: axiosLib } = await import('axios');
            const thumbRes = await axiosLib.get(thumbUrl, {
                responseType: 'arraybuffer',
                timeout      : 12000,
                headers      : { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36' },
            });
            const thumbBuf = Buffer.from(thumbRes.data);
            if (thumbBuf.length > 500) {
                const mimeThumb = thumbRes.headers['content-type']?.split(';')[0] || 'image/jpeg';
                fbVisualDesc = await gemini.askWithImage(buildFbVisionPrompt(), thumbBuf, mimeThumb);
            }
        } catch (_) {}
    }

    // ── AI caption ─────────────────────────────────────────────────────────────
    let finalCaption = buildFbFallbackCaption({ pageTitle, description, views, quality, mediaType });

    if (gemini) {
        try {
            const captionPrompt = buildFbCaptionPrompt({
                pageTitle, description, views, quality, hashtags, mediaType,
                visualDesc: fbVisualDesc,
            });
            const aiCaption = await gemini.ask(captionPrompt);
            if (aiCaption?.trim()) finalCaption = aiCaption.trim();
        } catch (_) {}
    }

    // ── Kirim video ────────────────────────────────────────────────────────────
    if (mediaData.isVideo !== false) {
        await hisoka.sendMessage(m.from, {
            video  : { url: mediaData.url },
            caption: finalCaption,
        }, { quoted: m });
    } else {
        await hisoka.sendMessage(m.from, {
            image  : { url: mediaData.url },
            caption: finalCaption,
        }, { quoted: m });
    }

    logCommand(m, hisoka, 'facebook');
}

module.exports = { handleFacebookDl };
