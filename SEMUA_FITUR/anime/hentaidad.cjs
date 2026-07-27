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
 *
 *  Alur 1 pesan (no spam):
 *  .hentaidad → [loading] → [edit: list] → reply nomor
 *             → [edit: dipilih] → [edit: download progress]
 *             → kirim album → [edit: kartu hasil]
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

// ── Helpers fetch & scrape ──────────────────────────────────────────────────────

async function fetchHtml(url) {
    const res = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    return res.data;
}

function cleanTitle(raw) {
    return raw
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\s+Hentai\s*$/i, '')
        .trim();
}

async function _scrapeCards(url, fallbackLabel) {
    const html  = await fetchHtml(url);
    const $     = cheerio.load(html);
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

async function scrapeLatestReleases() {
    return _scrapeCards(BASE + '/', 'Gallery');
}

async function scrapeSearch(query) {
    return _scrapeCards(`${BASE}/search?q=${encodeURIComponent(query)}`, 'Result');
}

async function scrapeGallery(href) {
    const url  = href.startsWith('http') ? href : BASE + href;
    const html = await fetchHtml(url);
    const $    = cheerio.load(html);

    const title  = $('h1').first().text().trim() || 'Untitled Gallery';
    const images = [];
    const seen   = new Set();
    const addSrc = (src) => { if (src && !seen.has(src)) { seen.add(src); images.push(src); } };

    $('.gallery-item img').each((_, el) => {
        addSrc($(el).attr('src') || $(el).attr('data-src') || '');
    });
    if (!images.length) {
        $('img[src*="/content/images/"], img[data-src*="/content/images/"]').each((_, el) => {
            addSrc($(el).attr('src') || $(el).attr('data-src') || '');
        });
    }
    if (!images.length) {
        $('img[src*="/uploads/galleries/"], img[data-src*="/uploads/galleries/"]').each((_, el) => {
            addSrc($(el).attr('src') || $(el).attr('data-src') || '');
        });
    }
    return { title, images };
}

async function downloadImage(url, referer) {
    const res = await axios.get(url, {
        responseType : 'arraybuffer',
        timeout      : 25000,
        headers      : { ...HEADERS, Referer: referer || BASE + '/', Accept: 'image/webp,image/avif,image/*,*/*' },
    });
    const raw = Buffer.from(res.data);
    try { return await sharp(raw).jpeg({ quality: 88 }).toBuffer(); } catch { return raw; }
}

// ── Format helpers ──────────────────────────────────────────────────────────────

function fmtBytes(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
}

function fmtDur(ms) {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s} detik`;
    const m = Math.floor(s / 60), r = s % 60;
    return r > 0 ? `${m} mnt ${r} dtk` : `${m} menit`;
}

// ── Teks-teks UI (semua format WA kontekstual) ──────────────────────────────────

/** State: loading awal setelah command dikirim */
function txtLoading(isSearch, query) {
    return isSearch
        ? `🔞 *HENTAIDAD*\n\n🔎 *Mencari:* _${query}_\n> _Harap tunggu sebentar..._`
        : `🔞 *HENTAIDAD*\n\n🔄 _Mengambil latest releases..._\n> _Harap tunggu sebentar..._`;
}

/** State: list pilihan (daftar bernomor WA) */
function txtList(items, query) {
    const isSearch   = query && query.length > 0;
    const qShort     = isSearch && query.length > 30 ? query.slice(0, 30) + '…' : query;
    const headerLine = isSearch
        ? `🔎 *Hasil untuk:* _"${qShort}"_\n_${items.length} galeri ditemukan_`
        : `📋 *Latest Releases* — _${items.length} galeri_`;

    let text = `🔞 *HENTAIDAD*\n\n${headerLine}\n\n`;
    for (const it of items) {
        const judul = it.title.length > 50 ? it.title.slice(0, 50) + '…' : it.title;
        text += `${it.no}. _${judul}_\n`;
    }
    text += `\n> 💬 *Reply* pesan ini dengan *nomor* pilihan\n`;
    text += isSearch
        ? `> _Cari lagi:_ \`.hentaidad [judul]\``
        : `> _Cari judul:_ \`.hentaidad [judul]\``;
    return text;
}

/** State: tidak ditemukan */
function txtNotFound(query) {
    return (
        `🔞 *HENTAIDAD*\n\n` +
        `🚫 *Tidak Ditemukan*\n` +
        `_Tidak ada galeri yang cocok untuk:_\n` +
        `> _"${query}"_\n\n` +
        `💡 *Saran pencarian:*\n` +
        `- Coba kata kunci _lebih pendek_\n` +
        `- Gunakan _nama karakter_ / _judul asli_\n` +
        `- Coba _bahasa Inggris_ (misal: \`re zero\`)\n\n` +
        `> Ketik \`.hentaidad\` untuk melihat _latest_`
    );
}

/** State: pilihan diterima, scraping galeri */
function txtDipilih(chosen, headerPilih) {
    const judul = chosen.title.length > 48 ? chosen.title.slice(0, 48) + '…' : chosen.title;
    return (
        `🔞 *HENTAIDAD*\n\n` +
        `${headerPilih}\n\n` +
        `✅ *Dipilih #${chosen.no}:*\n` +
        `_${judul}_\n\n` +
        `⏳ _Mengambil data galeri..._\n` +
        `> _Harap tunggu sebentar_`
    );
}

/** State: download progress */
function txtDownload(chosen, headerPilih, doneNow, totalImg, batchIdx, totalBatch) {
    const judul = chosen.title.length > 48 ? chosen.title.slice(0, 48) + '…' : chosen.title;
    const batchInfo = totalBatch > 1
        ? `\n> _Batch_ \`${batchIdx}/${totalBatch}\` _— sabar ya_`
        : `\n> _Sabar ya, lagi diproses_`;
    return (
        `🔞 *HENTAIDAD*\n\n` +
        `${headerPilih}\n\n` +
        `✅ *Dipilih #${chosen.no}:*\n` +
        `_${judul}_\n\n` +
        `⬇️ *Mendownload* \`${doneNow}/${totalImg} gambar\`...` +
        batchInfo
    );
}

/** State: mengirim album */
function txtSending(chosen, headerPilih, total) {
    const judul = chosen.title.length > 48 ? chosen.title.slice(0, 48) + '…' : chosen.title;
    return (
        `🔞 *HENTAIDAD*\n\n` +
        `${headerPilih}\n\n` +
        `✅ *Dipilih #${chosen.no}:*\n` +
        `_${judul}_\n\n` +
        `📤 *Mengirim* \`${total} gambar\` _dalam 1 album..._\n` +
        `> _Sebentar lagi_`
    );
}

/** State: kartu hasil akhir */
function txtFinalCard({ title, berhasil, total, totalBytes, elapsedMs, failed, isSearch, query }) {
    const judul     = title.length > 52 ? title.slice(0, 52) + '…' : title;
    const gagalLine = failed > 0 ? `- ⚠️ *Gagal:* ~${failed} gambar~\n` : '';
    const qShort    = query && query.length > 24 ? query.slice(0, 24) + '…' : query;
    const hintLine  = isSearch
        ? `\n> 🔎 _Cari lagi:_ \`.hentaidad ${qShort}\`\n> 📋 _Atau_ \`.hentaidad\` _untuk latest_`
        : `\n> 🔎 _Cari judul:_ \`.hentaidad [judul]\`\n> 📋 _Atau_ \`.hentaidad\` _untuk latest terbaru_`;

    return (
        `🔞 *HENTAIDAD*\n\n` +
        `📌 *${judul}*\n\n` +
        `- 📸 *Gambar:* ${berhasil}${failed > 0 ? `/${total}` : ''} foto\n` +
        `- 📦 *Ukuran:* \`${fmtBytes(totalBytes)}\`\n` +
        `- ⏱️ *Waktu:* \`${fmtDur(elapsedMs)}\`\n` +
        gagalLine +
        `\n✅ *Selesai — album terkirim*` +
        hintLine
    );
}

/** State: error */
function txtError(msg) {
    return `🔞 *HENTAIDAD*\n\n❌ *Gagal memproses*\n💬 _${msg || 'Coba lagi nanti.'}_`;
}

// ── COMMAND HANDLER UTAMA ──────────────────────────────────────────────────────
// Alur 1 pesan:
//   1. Kirim pesan loading → simpan key-nya (sentKey)
//   2. Fetch data
//   3. Edit sentKey → jadi list pilihan
//   4. Simpan sentKey ke pending map

async function handleHentaidad({ hisoka, m, tolak, logCommand, logError, pendingHentaidadChoices }) {
    try {
        logCommand(m, hisoka, m.command || 'hentaidad');

        const query    = (Array.isArray(m.args) && m.args.length > 0)
            ? m.args.join(' ').trim()
            : (m.text || '').replace(/^[.!/]?hentaidad\s*/i, '').trim();
        const isSearch = query.length > 0;

        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

        // ── Kirim 1 pesan loading ─────────────────────────────────────────────
        let sentMsg = null;
        try {
            sentMsg = await hisoka.sendMessage(m.from, { text: txtLoading(isSearch, query) }, { quoted: m });
        } catch (_) {}

        // ── Fetch data ────────────────────────────────────────────────────────
        const items = isSearch
            ? await scrapeSearch(query)
            : await scrapeLatestReleases();

        // ── Helper: edit sentMsg atau kirim pesan baru kalau sentMsg null ─────
        const editMain = async (text) => {
            try {
                if (sentMsg?.key) {
                    await hisoka.sendMessage(m.from, { text, edit: sentMsg.key });
                } else {
                    sentMsg = await hisoka.sendMessage(m.from, { text }, { quoted: m });
                }
            } catch (_) {}
        };

        if (!items.length) {
            if (isSearch) {
                await editMain(txtNotFound(query));
            } else {
                await editMain(`🔞 *HENTAIDAD*\n\n❌ _Gagal mengambil data. Coba lagi nanti._`);
            }
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return;
        }

        // ── Edit jadi list pilihan ────────────────────────────────────────────
        await editMain(txtList(items, isSearch ? query : null));

        const TTL     = 3 * 60 * 1000;
        const timeout = setTimeout(() => pendingHentaidadChoices.delete(m.sender), TTL);

        pendingHentaidadChoices.set(m.sender, {
            results   : items,
            botMsgId  : sentMsg?.key?.id || null,
            sentKey   : sentMsg?.key     || null,
            isSearch,
            query     : isSearch ? query : null,
            expiresAt : Date.now() + TTL,
            loading   : false,
            timeout,
        });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('[HENTAIDAD] Error:', err?.message);
        if (typeof logError === 'function')
            logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad');
        try { await tolak(hisoka, m, txtError(err?.message)); } catch (_) {}
    }
}

// ── CHOICE HANDLER ─────────────────────────────────────────────────────────────
// Semua update dilakukan via EDIT sentKey (pesan list) — tidak ada pesan baru selain album.

async function handleHentaidadChoice({ hisoka, m, pendingHentaidadChoices, getQuotedStanzaId, tolak, logCommand, logError }) {
    if (!pendingHentaidadChoices.has(m.sender)) return false;

    const pending   = pendingHentaidadChoices.get(m.sender);
    const rawChoice = String(m.text || '').trim();
    const isReply   = m.isQuoted && pending.botMsgId && getQuotedStanzaId(m) === pending.botMsgId;
    const isNumber  = /^\d+$/.test(rawChoice);

    if (!isReply || !isNumber) return false;

    // ── Expired ───────────────────────────────────────────────────────────────
    if (pending.expiresAt <= Date.now()) {
        pendingHentaidadChoices.delete(m.sender);
        await _editKey(hisoka, m, pending.sentKey,
            `🔞 *HENTAIDAD*\n\n⏳ *Menu sudah kedaluwarsa*\n> _Ketik_ \`.hentaidad\` _lagi untuk mulai_`
        );
        return true;
    }

    // ── Sedang loading ────────────────────────────────────────────────────────
    if (pending.loading) {
        // Balas diam — jangan spam, cukup react
        try { await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } }); } catch (_) {}
        return true;
    }

    const idx = parseInt(rawChoice) - 1;
    if (idx < 0 || idx >= pending.results.length) {
        await _editKey(hisoka, m, pending.sentKey,
            txtList(pending.results, pending.isSearch ? pending.query : null) +
            `\n\n❌ _Nomor tidak valid. Pilih angka_ *1*–*${pending.results.length}*`
        );
        return true;
    }

    // ── Kunci loading ─────────────────────────────────────────────────────────
    pending.loading = true;
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingHentaidadChoices.delete(m.sender);

    const chosen      = pending.results[idx];
    const headerPilih = pending.isSearch
        ? `🔎 *Hasil:* _"${(pending.query || '').length > 28 ? pending.query.slice(0, 28) + '…' : pending.query}"_`
        : `📋 *Latest Releases*`;

    // Shorthand edit sentKey — semua progress pakai ini
    const editMain = (text) => _editKey(hisoka, m, pending.sentKey, text);

    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        await editMain(txtDipilih(chosen, headerPilih));

        // ── Scrape halaman galeri ─────────────────────────────────────────────
        const { title, images } = await scrapeGallery(chosen.href);

        if (!images.length) {
            await editMain(
                `🔞 *HENTAIDAD*\n\n${headerPilih}\n\n` +
                `✅ *Dipilih #${chosen.no}:* _${chosen.title.slice(0, 48)}_\n\n` +
                `❌ *Tidak ada gambar ditemukan*\n` +
                `> _Galeri ini mungkin kosong atau belum tersedia_`
            );
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return true;
        }

        // ── Download semua gambar ─────────────────────────────────────────────
        const totalImg   = images.length;
        const CONCUR     = 8;
        const totalBatch = Math.ceil(totalImg / CONCUR);
        const startTime  = Date.now();
        const allItems   = [];
        let   failed     = 0;

        await editMain(txtDownload(chosen, headerPilih, 0, totalImg, 0, totalBatch));

        for (let i = 0; i < images.length; i += CONCUR) {
            const batchIdx = Math.floor(i / CONCUR) + 1;
            const chunk    = images.slice(i, i + CONCUR);
            const results  = await Promise.allSettled(
                chunk.map(url => downloadImage(url, chosen.href))
            );
            for (const r of results) {
                if (r.status === 'fulfilled') allItems.push(r.value);
                else { failed++; console.error('[HENTAIDAD] Gagal download:', r.reason?.message); }
            }
            const doneNow = Math.min(i + CONCUR, totalImg);
            await editMain(txtDownload(chosen, headerPilih, doneNow, totalImg, batchIdx, totalBatch));
        }

        if (!allItems.length) {
            await editMain(
                `🔞 *HENTAIDAD*\n\n${headerPilih}\n\n` +
                `✅ *Dipilih #${chosen.no}:* _${chosen.title.slice(0, 48)}_\n\n` +
                `❌ *Semua gambar gagal didownload*\n` +
                `> _Coba lagi nanti_`
            );
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return true;
        }

        // ── Kirim album ───────────────────────────────────────────────────────
        const total      = allItems.length;
        const totalBytes = allItems.reduce((acc, buf) => acc + buf.length, 0);
        await editMain(txtSending(chosen, headerPilih, total));

        try {
            const parentMsg = await hisoka.sendMessage(
                m.from,
                { album: { expectedImageCount: total, expectedVideoCount: 0 } },
                { quoted: m }
            );
            await Promise.allSettled(
                allItems.map(buf =>
                    hisoka.sendMessage(m.from, { image: buf, albumParentKey: parentMsg.key })
                )
            );
        } catch (albumErr) {
            console.error('[HENTAIDAD] Album API error:', albumErr?.message);
            // Fallback: kirim satu per satu
            for (let i = 0; i < allItems.length; i++) {
                try {
                    await hisoka.sendMessage(m.from, { image: allItems[i] },
                        { quoted: i === 0 ? m : undefined });
                } catch (_) {}
            }
        }

        const elapsedMs = Date.now() - startTime;

        // ── Edit → kartu hasil ────────────────────────────────────────────────
        await editMain(txtFinalCard({
            title, berhasil: total, total: totalImg,
            totalBytes, elapsedMs, failed,
            isSearch: pending.isSearch, query: pending.query,
        }));
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('[HENTAIDAD] Choice error:', err?.message);
        if (typeof logError === 'function')
            logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad-choice');
        await editMain(txtError(err?.message));
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }

    return true;
}

// ── Internal: edit pesan by key, silent fail ────────────────────────────────────
async function _editKey(hisoka, m, sentKey, text) {
    try {
        if (sentKey) {
            await hisoka.sendMessage(m.from, { text, edit: sentKey });
        } else {
            await hisoka.sendMessage(m.from, { text }, { quoted: m });
        }
    } catch (_) {}
}

module.exports = { handleHentaidad, handleHentaidadChoice };
