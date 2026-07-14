/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  hentaidad.cjs — Scraper HentaiDad (18+)
 *  Tampilkan Latest Releases dari hentaidad.com,
 *  user reply nomor → bot kirim semua gambar 1 album
 * ───────────────────────────────
 */
'use strict';

const axios   = require('axios');
const cheerio = require('cheerio');

const BASE    = 'https://hentaidad.com';
const HEADERS = {
    'User-Agent'      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language' : 'en-US,en;q=0.9',
    'Referer'         : 'https://hentaidad.com/',
};

/** Ambil HTML dari URL */
async function fetchHtml(url) {
    const res = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    return res.data;
}

/** Ubah slug URL jadi judul yang bersih */
function slugToTitle(slug) {
    return slug
        .replace(/-full(-\d+)?$/, '')        // hapus -full / -full-2 di akhir
        .replace(/^request-/, '')            // hapus prefix "request-"
        .replace(/-/g, ' ')                  // dash → spasi
        .replace(/\b\w/g, c => c.toUpperCase()) // Title Case
        .trim();
}

/**
 * Scrape halaman utama → ambil Latest Releases
 * @returns {Array<{no, title, href, thumb}>}
 */
async function scrapeLatestReleases() {
    const html = await fetchHtml(BASE + '/');
    const $    = cheerio.load(html);
    const items = [];

    $('img[src*="thumbnails"]').each((i, imgEl) => {
        if (items.length >= 15) return false; // ambil max 15
        const card  = $(imgEl).closest('a');
        const href  = card.attr('href') || '';
        const thumb = $(imgEl).attr('src') || '';
        if (!href || !thumb) return;

        const slug  = href.split('/').filter(Boolean).pop() || '';
        const title = slugToTitle(slug) || `Gallery ${i + 1}`;
        items.push({ no: i + 1, title, href: href.startsWith('http') ? href : BASE + href, thumb, slug });
    });

    return items;
}

/**
 * Scrape halaman galeri → ambil judul asli + semua URL gambar
 * @returns {{ title: string, images: string[] }}
 */
async function scrapeGallery(href) {
    const url  = href.startsWith('http') ? href : BASE + href;
    const html = await fetchHtml(url);
    const $    = cheerio.load(html);

    // Judul dari h1
    const title = $('h1').first().text().trim() || 'Untitled Gallery';

    // Semua gambar dari /uploads/galleries/ (bukan thumbnail)
    const images = [];
    $('img[src*="/uploads/galleries/"]').each((i, el) => {
        const src = $(el).attr('src') || '';
        if (src && !images.includes(src)) images.push(src);
    });

    return { title, images };
}

/**
 * Download buffer satu gambar dengan timeout
 */
async function downloadImage(url) {
    const res = await axios.get(url, {
        responseType : 'arraybuffer',
        timeout      : 25000,
        headers      : { ...HEADERS, Accept: 'image/webp,image/*, */*' },
    });
    return Buffer.from(res.data);
}

/**
 * Format teks daftar latest releases
 */
function formatList(items) {
    let text = `╭─「 🔞 *HENTAIDAD* 」\n│\n│ 🌐 hentaidad.com\n│ 📋 *Latest Releases:*\n│\n`;
    for (const it of items) {
        text += `│ *${it.no}.* ${it.title.slice(0, 55)}${it.title.length > 55 ? '…' : ''}\n`;
    }
    text += `│\n│ 💬 *Reply pesan ini* dengan nomor pilihanmu\n│ Contoh: balas dengan *1*\n╰──────────────────────`;
    return text;
}

// ── COMMAND HANDLER UTAMA ──────────────────────────────────────────────────────

async function handleHentaidad({ hisoka, m, tolak, logCommand, logError, pendingHentaidadChoices }) {
    try {
        logCommand(m, hisoka, m.command || 'hentaidad');

        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
        await tolak(hisoka, m, `🔄 Mengambil data terbaru dari hentaidad.com...`);

        const items = await scrapeLatestReleases();
        if (!items.length) {
            await tolak(hisoka, m, `❌ Gagal mengambil data. Coba lagi nanti.`);
            return;
        }

        const listText = formatList(items);
        const sent     = await hisoka.sendMessage(m.from, { text: listText }, { quoted: m });

        // Simpan ke pending map — tunggu reply dari user selama 3 menit
        const TTL = 3 * 60 * 1000;
        const key = m.sender;
        const timeout = setTimeout(() => pendingHentaidadChoices.delete(key), TTL);

        pendingHentaidadChoices.set(key, {
            results   : items,
            botMsgId  : sent?.key?.id || null,
            expiresAt : Date.now() + TTL,
            loading   : false,
            timeout,
        });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
    } catch (err) {
        console.error('[HENTAIDAD] Error:', err?.message);
        if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad');
        await tolak(hisoka, m, `❌ Gagal mengambil data hentaidad.\n💬 ${err?.message || 'Coba lagi nanti.'}`);
    }
}

// ── CHOICE HANDLER — dipanggil dari message.js sebelum switch-case ────────────

async function handleHentaidadChoice({ hisoka, m, pendingHentaidadChoices, getQuotedStanzaId, tolak, logCommand, logError }) {
    if (!pendingHentaidadChoices.has(m.sender)) return false;

    const pending    = pendingHentaidadChoices.get(m.sender);
    const rawChoice  = String(m.text || '').trim();
    const isReply    = m.isQuoted && pending.botMsgId && getQuotedStanzaId(m) === pending.botMsgId;
    const isNumber   = /^\d+$/.test(rawChoice);

    if (!isReply || !isNumber) return false;

    // Expired
    if (pending.expiresAt <= Date.now()) {
        pendingHentaidadChoices.delete(m.sender);
        await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.hentaidad` lagi.');
        return true;
    }

    // Sedang loading
    if (pending.loading) {
        await tolak(hisoka, m, '⏳ Sedang memproses, tunggu sebentar...');
        return true;
    }

    const idx = parseInt(rawChoice) - 1;
    if (idx < 0 || idx >= pending.results.length) {
        await tolak(hisoka, m, `❌ Pilih angka 1–${pending.results.length}.`);
        return true;
    }

    // Mark loading
    pending.loading = true;
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingHentaidadChoices.delete(m.sender);

    const chosen = pending.results[idx];

    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        await tolak(hisoka, m, `🔄 Mengambil gambar: *${chosen.title}*\nSabar ya, lagi download...`);

        // Scrape halaman galeri
        const { title, images } = await scrapeGallery(chosen.href);

        if (!images.length) {
            await tolak(hisoka, m, `❌ Tidak ada gambar ditemukan di galeri ini.`);
            return true;
        }

        const totalImg = images.length;
        await tolak(hisoka, m, `📦 Ditemukan *${totalImg} gambar* — sedang download & kirim album...`);

        // Download semua gambar secara paralel (batch 5)
        const CONCUR = 5;
        const allItems = [];
        for (let i = 0; i < images.length; i += CONCUR) {
            const chunk = images.slice(i, i + CONCUR);
            const results = await Promise.allSettled(
                chunk.map(async (url, ci) => {
                    const buf = await downloadImage(url);
                    const isFirst = i === 0 && ci === 0;
                    return {
                        image  : buf,
                        caption: isFirst
                            ? `🔞 *${title}*\n📸 ${totalImg} gambar | hentaidad.com`
                            : '',
                    };
                })
            );
            for (const r of results) {
                if (r.status === 'fulfilled') allItems.push(r.value);
                else console.error('[HENTAIDAD] Gagal download gambar:', r.reason?.message);
            }
        }

        if (!allItems.length) {
            await tolak(hisoka, m, `❌ Semua gambar gagal didownload.`);
            return true;
        }

        // Kirim sebagai 1 album — fallback batch 10 kalau gagal
        const BATCH = 10;
        try {
            await hisoka.sendMessage(m.from, { albumMessage: allItems }, { quoted: m });
        } catch (_) {
            for (let b = 0; b < allItems.length; b += BATCH) {
                const batch = allItems.slice(b, b + BATCH);
                try {
                    await hisoka.sendMessage(
                        m.from,
                        { albumMessage: batch },
                        { quoted: b === 0 ? m : undefined }
                    );
                } catch (_2) {
                    // Fallback kirim satu-satu
                    for (const item of batch) {
                        try {
                            await hisoka.sendMessage(m.from, { image: item.image, caption: item.caption }, { quoted: m });
                        } catch (_3) {}
                    }
                }
            }
        }

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
    } catch (err) {
        console.error('[HENTAIDAD] Choice error:', err?.message);
        if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad-choice');
        await tolak(hisoka, m, `❌ Gagal kirim gambar.\n💬 ${err?.message || 'Coba lagi nanti.'}`);
    }

    return true;
}

module.exports = { handleHentaidad, handleHentaidadChoice };
