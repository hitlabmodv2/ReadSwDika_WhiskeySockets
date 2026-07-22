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
const sharp   = require('sharp');

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

/**
 * Bersihkan judul dari alt attribute:
 * - decode HTML entities
 * - hapus suffix " Hentai" yang ditambah situs di hasil search
 */
function cleanTitle(raw) {
    return raw
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+Hentai\s*$/i, '')
        .trim();
}

/**
 * Scraper generik — ambil article.post-card dari URL apapun
 * href dari <a>, judul dari alt <img> (judul asli, bukan tebakan slug)
 */
async function _scrapeCards(url, fallbackLabel) {
    const html = await fetchHtml(url);
    const $    = cheerio.load(html);
    const items = [];

    $('article.post-card').each((i, el) => {
        const link  = $(el).find('a[href]').first();
        const href  = link.attr('href') || '';
        const alt   = $(el).find('img[alt]').first().attr('alt') || '';
        if (!href) return;
        const title = cleanTitle(alt) || `${fallbackLabel} ${i + 1}`;
        items.push({ no: i + 1, title, href: href.startsWith('http') ? href : BASE + href });
    });

    return items;
}

/**
 * Scrape halaman utama → Latest Releases (realtime)
 */
async function scrapeLatestReleases() {
    return _scrapeCards(BASE + '/', 'Gallery');
}

/**
 * Scrape hasil pencarian — endpoint /search?q=
 * (bukan /?s= yang tidak berfungsi di situs ini)
 */
async function scrapeSearch(query) {
    return _scrapeCards(`${BASE}/search?q=${encodeURIComponent(query)}`, 'Result');
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
 * Download buffer satu gambar dengan timeout, lalu convert ke JPEG.
 * Wajib kirim Referer = URL galeri agar server tidak return 500.
 */
async function downloadImage(url, referer) {
    const res = await axios.get(url, {
        responseType : 'arraybuffer',
        timeout      : 25000,
        headers      : {
            ...HEADERS,
            Referer : referer || BASE + '/',
            Accept  : 'image/webp,image/avif,image/*,*/*',
        },
    });
    const raw = Buffer.from(res.data);
    try {
        return await sharp(raw).jpeg({ quality: 88 }).toBuffer();
    } catch {
        return raw;
    }
}

/** Format bytes → "18.4 MB" / "320 KB" */
function fmtBytes(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
}

/** Format durasi ms → "42 detik" / "1 mnt 20 dtk" */
function fmtDur(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s} detik`;
    const m = Math.floor(s / 60), r = s % 60;
    return r > 0 ? `${m} mnt ${r} dtk` : `${m} menit`;
}

/** Bangun kartu hasil setelah album selesai dikirim */
function buildFinalCard({ title, berhasil, total, totalBytes, elapsedMs, failed }) {
    const judul     = title.length > 52 ? title.slice(0, 52) + '…' : title;
    const gagalLine = failed > 0 ? `• ⚠️ Gagal   : ~${failed} gambar~\n` : '';
    return (
        `🔞 *HENTAIDAD*\n\n` +
        `📌 *${judul}*\n\n` +
        `• 📸 Gambar  : *${berhasil}${failed > 0 ? `/${total}` : ''} foto*\n` +
        `• 📦 Ukuran  : \`${fmtBytes(totalBytes)}\`\n` +
        `• ⏱️ Waktu   : \`${fmtDur(elapsedMs)}\`\n` +
        gagalLine +
        `\n✅ *Status: Terkirim*`
    );
}

/**
 * Format teks daftar (latest releases ATAU hasil search)
 * @param {Array}  items
 * @param {string|null} query  — null = latest, string = search
 */
function formatList(items, query) {
    const isSearch   = query && query.length > 0;
    const qShort     = isSearch && query.length > 30 ? query.slice(0, 30) + '…' : query;
    const headerLine = isSearch
        ? `🔎 *Hasil untuk:* _"${qShort}"_\n_${items.length} galeri ditemukan_\n`
        : `📋 *Latest Releases* _— ${items.length} galeri_\n`;
    let text = `🔞 *HENTAIDAD*\n\n${headerLine}\n`;
    for (const it of items) {
        const judul = it.title.length > 52 ? it.title.slice(0, 52) + '…' : it.title;
        text += `${it.no}. _${judul}_\n`;
    }
    text += `\n> 💬 *Reply* pesan ini dengan *nomor* pilihanmu\n> _Contoh: balas dengan_ *1*`;
    return text;
}

// ── COMMAND HANDLER UTAMA ──────────────────────────────────────────────────────

async function handleHentaidad({ hisoka, m, tolak, logCommand, logError, pendingHentaidadChoices }) {
    try {
        logCommand(m, hisoka, m.command || 'hentaidad');

        // Deteksi mode: ada teks setelah command → search, kosong → latest
        // m.args = kata-kata setelah command (sudah strip nama command)
        // fallback: strip nama command dari m.text manual
        const query = (Array.isArray(m.args) && m.args.length > 0)
            ? m.args.join(' ').trim()
            : (m.text || '').replace(/^[.!/]?hentaidad\s*/i, '').trim();
        const isSearch = query.length > 0;

        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
        await tolak(hisoka, m,
            isSearch
                ? `🔎 *Mencari:* _${query}_\n> _Harap tunggu sebentar..._`
                : `🔄 *Mengambil latest releases...*\n> _Harap tunggu sebentar..._`
        );

        const items = isSearch
            ? await scrapeSearch(query)
            : await scrapeLatestReleases();

        if (!items.length) {
            if (isSearch) {
                await hisoka.sendMessage(m.from, {
                    text:
                        `🔞 *HENTAIDAD*\n\n` +
                        `🚫 *No Hentai Found*\n` +
                        `~We couldn't find any hentai~\n` +
                        `~matching "${query}"~\n\n` +
                        `💡 *Saran pencarian:*\n` +
                        `• Coba kata kunci _lebih pendek_\n` +
                        `• Gunakan _nama karakter_ / _judul asli_\n` +
                        `• Coba _bahasa Inggris_ (misal: \`re zero\`)\n\n` +
                        `> Ketik \`.hentaidad\` untuk melihat latest`,
                }, { quoted: m });
            } else {
                await tolak(hisoka, m, `❌ _Gagal mengambil data. Coba lagi nanti._`);
            }
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return;
        }

        const listText = formatList(items, isSearch ? query : null);
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
        await tolak(hisoka, m, `❌ *Gagal mengambil data hentaidad.*\n💬 _${err?.message || 'Coba lagi nanti.'}_`);
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
        await tolak(hisoka, m, `⏳ *Menu sudah kedaluwarsa.*\n> Ketik \`.hentaidad\` _lagi untuk memulai_`);
        return true;
    }

    // Sedang loading
    if (pending.loading) {
        await tolak(hisoka, m, `⏳ *Sedang memproses...*\n> _Tunggu sebentar, jangan kirim ulang_`);
        return true;
    }

    const idx = parseInt(rawChoice) - 1;
    if (idx < 0 || idx >= pending.results.length) {
        await tolak(hisoka, m, `❌ *Pilih angka yang valid.*\n> _Ketik angka *1*–*${pending.results.length}*_`);
        return true;
    }

    // Mark loading
    pending.loading = true;
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingHentaidadChoices.delete(m.sender);

    const chosen = pending.results[idx];

    // ── 1 pesan loading — semua status di-edit di sini, tidak pernah kirim pesan baru ──
    // editLoading: pertama kali kirim pesan baru (lazy), selanjutnya selalu edit pesan itu
    let _loadingMsg = null;
    const editLoading = async (txt) => {
        try {
            if (!_loadingMsg) {
                _loadingMsg = await hisoka.sendMessage(m.from, { text: txt }, { quoted: m });
            } else {
                await hisoka.sendMessage(m.from, { text: txt, edit: _loadingMsg.key });
            }
        } catch (_) {}
    };

    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        await editLoading(`⏳ *Mengambil data galeri...*\n> _Harap tunggu sebentar_`);

        // Scrape halaman galeri
        const { title, images } = await scrapeGallery(chosen.href);

        if (!images.length) {
            await editLoading(`❌ *Tidak ada gambar ditemukan.*\n> _Galeri ini mungkin kosong atau belum tersedia_`);
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return true;
        }

        const totalImg   = images.length;
        const CONCUR     = 8;
        const totalBatch = Math.ceil(totalImg / CONCUR);
        await editLoading(`⬇️ *Mendownload* \`${totalImg} gambar\`...\n> _Sabar ya, lagi diproses_`);

        // Download semua gambar paralel (CONCUR sekaligus) + update progress per batch
        const startTime = Date.now();
        const allItems  = [];
        let   failed    = 0;

        for (let i = 0; i < images.length; i += CONCUR) {
            const batchIdx = Math.floor(i / CONCUR) + 1;
            const chunk    = images.slice(i, i + CONCUR);
            const results  = await Promise.allSettled(
                chunk.map(async (url) => downloadImage(url, chosen.href))
            );
            for (const r of results) {
                if (r.status === 'fulfilled') allItems.push(r.value);
                else { failed++; console.error('[HENTAIDAD] Gagal download gambar:', r.reason?.message); }
            }
            // Update progress realtime per batch (skip kalau batch tunggal — tidak perlu)
            if (totalBatch > 1) {
                const doneNow = Math.min(i + CONCUR, totalImg);
                await editLoading(
                    `⬇️ *Mendownload* \`${doneNow}/${totalImg} gambar\`...\n` +
                    `> _Batch ${batchIdx}/${totalBatch} — sabar ya_`
                );
            }
        }

        if (!allItems.length) {
            await editLoading(`❌ *Semua gambar gagal didownload.*\n> _Coba lagi nanti_`);
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return true;
        }

        const total      = allItems.length;
        const totalBytes = allItems.reduce((acc, buf) => acc + buf.length, 0);
        await editLoading(`📤 *Mengirim* \`${total} gambar\` _dalam 1 album..._\n> _Sebentar lagi_`);

        // ── Kirim album pakai Baileys API ─────────────────────────────────────
        // 1) Kirim container album → dapat parentKey
        // 2) Tiap gambar dikirim dengan albumParentKey → masuk 1 album, NO caption
        try {
            const parentMsg = await hisoka.sendMessage(
                m.from,
                { album: { expectedImageCount: total, expectedVideoCount: 0 } },
                { quoted: m }
            );
            await Promise.allSettled(
                allItems.map(buf =>
                    hisoka.sendMessage(m.from, {
                        image         : buf,
                        albumParentKey: parentMsg.key,
                    })
                )
            );
        } catch (albumErr) {
            console.error('[HENTAIDAD] Album API error:', albumErr?.message);
            // Fallback: kirim satu per satu
            for (let i = 0; i < allItems.length; i++) {
                try {
                    await hisoka.sendMessage(m.from, {
                        image: allItems[i],
                    }, { quoted: i === 0 ? m : undefined });
                } catch (_) {}
            }
        }

        const elapsedMs = Date.now() - startTime;

        // ── Edit pesan loading → kartu hasil rapi ────────────────────────────
        await editLoading(buildFinalCard({ title, berhasil: total, total: totalImg, totalBytes, elapsedMs, failed }));
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('[HENTAIDAD] Choice error:', err?.message);
        if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad-choice');
        // Edit pesan loading yang sudah ada — bukan kirim pesan baru
        await editLoading(`❌ *Gagal kirim gambar.*\n💬 _${err?.message || 'Coba lagi nanti.'}_`);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }

    return true;
}

module.exports = { handleHentaidad, handleHentaidadChoice };
