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
 *  screenshot.cjs — Screenshot website (.ss)
 *  Ambil tangkapan layar URL via API, kirim sebagai gambar
 * ───────────────────────────────
 */
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Normalize URL - auto tambah https:// kalau tidak ada
 * @param {string} url
 * @returns {string}
 */
function normalizeUrl(url) {
    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    return url;
}

/**
 * Ambil screenshot website menggunakan layanan gratis microlink.io
 * @param {string} url - URL yang akan di-screenshot
 * @returns {Promise<Buffer>} - Buffer gambar screenshot
 */
async function screenshotWeb(url) {
    url = normalizeUrl(url);

    const encodedUrl = encodeURIComponent(url);
    const apiUrl = `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false`;

    const metaRes = await axios.get(apiUrl, {
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const ssUrl = metaRes.data?.data?.screenshot?.url;
    if (!ssUrl) throw new Error('Tidak dapat mengambil screenshot, coba lagi');

    const imgRes = await axios.get(ssUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    if (!imgRes.data || imgRes.data.byteLength < 500) {
        throw new Error('Gambar screenshot kosong, coba URL lain');
    }

    return Buffer.from(imgRes.data);
}

/**
 * Cek status website (ping) - ambil status code & response time
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function checkWebStatus(url) {
    url = normalizeUrl(url);
    const startTime = Date.now();
    try {
        const res = await axios.get(url, {
            timeout: 15000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            validateStatus: () => true
        });
        const responseTime = Date.now() - startTime;
        const html = typeof res.data === 'string' ? res.data : '';
        let title = '';
        let description = '';
        if (html) {
            const $ = cheerio.load(html);
            title = $('title').text().trim() || $('h1').first().text().trim() || '';
            description =
                $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content') ||
                '';
        }
        return {
            url,
            statusCode: res.status,
            statusText: getStatusText(res.status),
            responseTime,
            title: title.substring(0, 100),
            description: description.substring(0, 200),
            online: res.status >= 200 && res.status < 400
        };
    } catch (err) {
        const responseTime = Date.now() - startTime;
        return {
            url,
            statusCode: 0,
            statusText: 'Tidak dapat dijangkau',
            responseTime,
            title: '',
            description: '',
            online: false,
            error: err.message
        };
    }
}

/**
 * Ambil teks deskripsi status HTTP
 */
function getStatusText(code) {
    const map = {
        200: '200 OK ✅',
        201: '201 Created ✅',
        204: '204 No Content ✅',
        301: '301 Moved Permanently ↪️',
        302: '302 Found ↪️',
        304: '304 Not Modified ↪️',
        400: '400 Bad Request ⚠️',
        401: '401 Unauthorized 🔒',
        403: '403 Forbidden 🚫',
        404: '404 Not Found ❌',
        429: '429 Too Many Requests ⏳',
        500: '500 Internal Server Error 💥',
        502: '502 Bad Gateway 💥',
        503: '503 Service Unavailable 💥',
        504: '504 Gateway Timeout ⏱️'
    };
    return map[code] || `${code}`;
}

/**
 * Screenshot + cek status website sekaligus (untuk .ssweb)
 * @param {string} url
 * @returns {Promise<{imgBuffer: Buffer, status: Object}>}
 */
async function ssWebFull(url) {
    url = normalizeUrl(url);

    const [statusResult, imgBuffer] = await Promise.allSettled([
        checkWebStatus(url),
        screenshotWeb(url)
    ]);

    const status = statusResult.status === 'fulfilled'
        ? statusResult.value
        : { url, statusCode: 0, statusText: 'Tidak dapat dijangkau', responseTime: 0, title: '', description: '', online: false };

    if (imgBuffer.status === 'rejected') {
        throw new Error(imgBuffer.reason?.message || 'Gagal mengambil screenshot');
    }

    return {
        imgBuffer: imgBuffer.value,
        status
    };
}

/**
 * Scrape konten teks dari sebuah website
 * @param {string} url - URL yang akan di-scrape
 * @returns {Promise<Object>} - Objek berisi info scraped
 */
async function scrapeWeb(url) {
    url = normalizeUrl(url);

    const response = await axios.get(url, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8'
        },
        maxRedirects: 5
    });

    const html = response.data;
    const $ = cheerio.load(html);

    $('script, style, nav, footer, iframe, noscript, .ads, #ads, .advertisement').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Tidak ada judul';

    const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        '';

    const ogImage =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '';

    const links = [];
    $('a[href]').each((i, el) => {
        if (i >= 10) return false;
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (text && href && !href.startsWith('#') && !href.startsWith('javascript')) {
            links.push({ text: text.substring(0, 60), href });
        }
    });

    const headings = [];
    $('h1, h2, h3').each((i, el) => {
        if (i >= 8) return false;
        const text = $(el).text().trim();
        if (text) headings.push(text.substring(0, 80));
    });

    const paragraphs = [];
    $('p').each((i, el) => {
        if (i >= 5) return false;
        const text = $(el).text().trim();
        if (text && text.length > 30) paragraphs.push(text.substring(0, 150));
    });

    const statusCode = response.status;

    return {
        url,
        title,
        description: description.substring(0, 200),
        ogImage,
        headings,
        paragraphs,
        links,
        statusCode
    };
}

module.exports = { screenshotWeb, scrapeWeb, ssWebFull, checkWebStatus };

// ── COMMAND HANDLER: SS ────────────────────────────────────────────────────────

async function handleScreenshot({ hisoka, m, query, tolak, logCommand }) {
        try {
                const targetUrl = query || '';
                if (!targetUrl) {
                        await tolak(hisoka, m,
                                `╭═══『 📸 *Screenshot Web* 』═══╮\n│\n` +
                                `│ Ambil screenshot tampilan website!\n│\n` +
                                `│ *Cara Pakai:*\n│ *.ss* https://example.com\n│\n` +
                                `│ *Contoh:*\n│ *.ss* https://kusonime.com\n│\n` +
                                `╰══════════════════════════╯`
                        );
                        return;
                }
                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                await tolak(hisoka, m, `⏳ Sedang mengambil screenshot *${targetUrl}*...\nMohon tunggu sebentar.`);
                const imgBuffer = await screenshotWeb(targetUrl);
                await hisoka.sendMessage(m.from, {
                        image: imgBuffer,
                        caption: `╭═══『 📸 *Screenshot Web* 』═══╮\n│\n│ 🌐 *URL:* ${targetUrl}\n│ ✅ Screenshot berhasil diambil!\n│\n╰══════════════════════════╯`
                }, { quoted: m });
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'ss');
        } catch (error) {
                console.error('\x1b[31m[SS] Error:\x1b[39m', error.message);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, `❌ Gagal screenshot: ${error.message}`);
        }
}

// ── COMMAND HANDLER: SSWEB ────────────────────────────────────────────────────

async function handleWebinfo({ hisoka, m, query, tolak, logCommand }) {
        try {
                const targetUrl = (query || '').trim();
                if (!targetUrl) {
                        await tolak(hisoka, m,
                                `╭═══『 📸 *SS Web* 』═══╮\n│\n│ Screenshot + cek status website realtime!\n│\n│ *Cara Pakai:*\n│ *.ssweb* example.com\n│\n│ *Contoh:*\n│ *.ssweb* kusonime.com\n│ *.ssweb* https://kusonime.com\n│\n│ ℹ️ Dengan atau tanpa https:// bisa!\n│\n╰══════════════════════════╯`
                        );
                        return;
                }

                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                const loadMsg = await hisoka.sendMessage(m.from, {
                        text:
                                `╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *Target:* ${targetUrl}\n│\n│ 🔍 *Step 1/2:* Mengecek status website...\n│ ⏳ Mohon tunggu sebentar\n│\n╰══════════════════════════╯`
                }, { quoted: m }).catch(() => null);

                const _edit = async (txt) => {
                        if (!loadMsg?.key) return;
                        try { await hisoka.sendMessage(m.from, { text: txt, edit: loadMsg.key }); } catch (_) {}
                };

                const status    = await checkWebStatus(targetUrl);
                const pingEmoji = !status.online ? '🔴' : status.responseTime < 500 ? '🟢' : status.responseTime < 1500 ? '🟡' : '🔴';
                const statusLine = status.online ? status.statusText : `Offline / ${status.error || 'Tidak dapat dijangkau'}`;

                await _edit(
                        `╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *Target:* ${status.url}\n│\n│ ✅ *Step 1/2:* Status OK\n│ 📊 *Status:* ${statusLine}\n│ ${pingEmoji} *Ping:* ${status.responseTime}ms\n` +
                        (status.title ? `│ 📌 *Judul:* ${status.title}\n` : '') +
                        `│\n│ 📸 *Step 2/2:* Mengambil screenshot...\n│ ⏳ Proses ~10-20 detik\n│\n╰══════════════════════════╯`
                );

                await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });
                const imgBuffer = await screenshotWeb(targetUrl);

                await _edit(
                        `╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *Target:* ${status.url}\n│\n│ ✅ *Step 1/2:* Status OK\n│ 📊 *Status:* ${statusLine}\n│ ${pingEmoji} *Ping:* ${status.responseTime}ms\n` +
                        (status.title ? `│ 📌 *Judul:* ${status.title}\n` : '') +
                        `│\n│ ✅ *Step 2/2:* Screenshot selesai!\n│ 📤 Mengirim hasil...\n│\n╰══════════════════════════╯`
                );

                let caption = `╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *URL:* ${status.url}\n│ 📊 *Status:* ${statusLine}\n│ ${pingEmoji} *Ping:* ${status.responseTime}ms\n│\n`;
                if (status.title)       caption += `│ 📌 *Judul:* ${status.title}\n`;
                if (status.description) caption += `│ 📝 *Desc:* ${status.description.substring(0, 120)}\n`;
                caption += `│\n╰══════════════════════════╯`;

                await hisoka.sendMessage(m.from, { image: imgBuffer, caption }, { quoted: m });
                if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'ssweb');
        } catch (error) {
                console.error('\x1b[31m[SSWEB] Error:\x1b[39m', error.message);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, `❌ Gagal SS Web: ${error.message}`);
        }
}

module.exports.handleScreenshot = handleScreenshot;
module.exports.handleWebinfo = handleWebinfo;
