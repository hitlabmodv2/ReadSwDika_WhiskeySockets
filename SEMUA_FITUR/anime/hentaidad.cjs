/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  hentaidad.cjs — Scraper HentaiDad (18+)
 *  Tampilkan Latest Releases / Search dari hentaidad.com,
 *  user reply nomor → bot kirim konfirmasi (thumbnail + info + 2 tombol)
 *  → user tap Lanjutkan → bot kirim semua gambar 1 album
 *
 *  Alur:
 *  .hentaidad [q] → [loading] → [edit: list] → reply nomor
 *                → [edit: mengambil data] → kirim 1 pesan konfirmasi
 *                  (thumbnail + jumlah gambar akurat + tombol Lanjutkan/Tidak)
 *                → tap Lanjutkan → [edit: download progress] → album
 *                                → [edit: kartu hasil]
 *                → tap Tidak    → [edit: dibatalkan]
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

/** Scrape kartu dari halaman listing — ambil juga thumbnail src */
async function _scrapeCards(url, fallbackLabel) {
    const html  = await fetchHtml(url);
    const $     = cheerio.load(html);
    const items = [];
    $('article.post-card').each((i, el) => {
        const link   = $(el).find('a[href]').first();
        const href   = link.attr('href') || '';
        const imgEl  = $(el).find('img').first();
        const alt    = imgEl.attr('alt') || '';
        const thumb  = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy-src') || '';
        if (!href) return;
        const title = cleanTitle(alt) || `${fallbackLabel} ${i + 1}`;
        items.push({
            no    : i + 1,
            title,
            href  : href.startsWith('http') ? href : BASE + href,
            thumb : thumb.startsWith('http') ? thumb : (thumb ? BASE + thumb : ''),
        });
    });
    return items;
}

async function scrapeLatestReleases() {
    return _scrapeCards(BASE + '/', 'Gallery');
}

async function scrapeSearch(query) {
    return _scrapeCards(`${BASE}/search?q=${encodeURIComponent(query)}`, 'Result');
}

/** Scrape halaman galeri — return title + daftar URL gambar */
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

/** Download thumbnail untuk dikirim sebagai gambar konfirmasi */
async function downloadThumb(url) {
    if (!url) return null;
    try {
        const res = await axios.get(url, {
            responseType : 'arraybuffer',
            timeout      : 12000,
            headers      : { ...HEADERS, Accept: 'image/webp,image/avif,image/*,*/*' },
        });
        const raw = Buffer.from(res.data);
        // Resize jadi thumbnail 480px wide agar ringan
        try {
            return await sharp(raw).resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        } catch { return raw; }
    } catch { return null; }
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

// ── Teks-teks UI ────────────────────────────────────────────────────────────────

function txtLoading(isSearch, query) {
    return isSearch
        ? `🔞 *HENTAIDAD*\n\n🔎 *Mencari:* _${query}_\n> _Harap tunggu sebentar..._`
        : `🔞 *HENTAIDAD*\n\n🔄 _Mengambil latest releases..._\n> _Harap tunggu sebentar..._`;
}

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

/** Teks caption untuk pesan konfirmasi (thumbnail + tombol) */
function txtConfirmCaption(chosen, galleryTitle, imageCount, headerPilih) {
    const judul = galleryTitle.length > 52 ? galleryTitle.slice(0, 52) + '…' : galleryTitle;
    return (
        `🔞 *HENTAIDAD — Konfirmasi*\n\n` +
        `${headerPilih}\n\n` +
        `📌 *${judul}*\n\n` +
        `- 📸 *Jumlah gambar:* \`${imageCount}\`\n\n` +
        `❓ _Lanjutkan download & kirim semua ${imageCount} gambar?_\n` +
        `> ⚠️ _Proses ini membutuhkan waktu beberapa menit_`
    );
}

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

function txtError(msg) {
    return `🔞 *HENTAIDAD*\n\n❌ *Gagal memproses*\n💬 _${msg || 'Coba lagi nanti.'}_`;
}

function txtBatalkan(chosen, headerPilih) {
    const judul = chosen.title.length > 48 ? chosen.title.slice(0, 48) + '…' : chosen.title;
    return (
        `🔞 *HENTAIDAD*\n\n` +
        `${headerPilih}\n\n` +
        `🚫 *Dibatalkan*\n` +
        `_#${chosen.no}: ${judul}_\n\n` +
        `> _Ketik_ \`.hentaidad\` _untuk memulai lagi_`
    );
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

// ── Kirim pesan konfirmasi: 1 pesan (thumbnail + info + 2 tombol) ───────────────
async function _sendConfirmMsg(hisoka, m, captionText, thumbBuf) {
    const { sendListMessage } = require('../helper/interactive-msg.cjs');

    // ── Coba 1: image + old buttons API (1 pesan, thumbnail terlihat) ──────────
    if (thumbBuf) {
        try {
            const sent = await hisoka.sendMessage(m.from, {
                image    : thumbBuf,
                caption  : captionText,
                buttons  : [
                    { buttonId: 'hentaidad_yes', buttonText: { displayText: '✅ Lanjutkan' }, type: 1 },
                    { buttonId: 'hentaidad_no',  buttonText: { displayText: '❌ Tidak' },    type: 1 },
                ],
                headerType : 4,
                footer     : '⚡ Tap tombol untuk memilih',
            }, { quoted: m });
            if (sent?.key) return { sent, mode: 'buttons' };
        } catch (_) {}
    }

    // ── Coba 2: image (tanpa buttons) + nativeFlow list terpisah ─────────────
    // Kirim gambar dulu, lalu list message sebagai konfirmasi
    if (thumbBuf) {
        try {
            await hisoka.sendMessage(m.from, {
                image   : thumbBuf,
                caption : captionText,
            }, { quoted: m }).catch(() => {});
        } catch (_) {}
    }

    // ── nativeFlow list message (paling kompatibel) ───────────────────────────
    try {
        await sendListMessage(hisoka, m.from, m, {
            body       : thumbBuf ? '👆 _Lihat gambar di atas untuk detail_\n\n❓ Lanjutkan?' : captionText,
            buttonText : '📋 Pilih',
            footer     : '⚡ Pilih salah satu',
            sections   : [{
                title : 'Konfirmasi Download',
                rows  : [
                    { rowId: 'hentaidad_yes', title: '✅ Lanjutkan', description: 'Download & kirim semua gambar' },
                    { rowId: 'hentaidad_no',  title: '❌ Tidak',     description: 'Batalkan, kembali ke menu' },
                ],
            }],
        });
        return { sent: null, mode: 'list' };
    } catch (_) {}

    // ── Fallback terakhir: plain text ─────────────────────────────────────────
    try {
        const fallbackText = captionText + '\n\n> Balas *lanjutkan* atau *tidak*';
        const sent = await hisoka.sendMessage(m.from, { text: fallbackText }, { quoted: m });
        return { sent, mode: 'text' };
    } catch (_) {}

    return { sent: null, mode: 'failed' };
}

// ── Download + kirim album (reusable dari confirm handler) ──────────────────────
async function _doDownloadAndSend({
    hisoka, m,
    chosen, galleryData, headerPilih,
    sentKey, isSearch, query,
    logError,
}) {
    const editMain = (text) => _editKey(hisoka, m, sentKey, text);
    const { title, images } = galleryData;

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
        return;
    }

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
        for (let i = 0; i < allItems.length; i++) {
            try {
                await hisoka.sendMessage(m.from, { image: allItems[i] },
                    { quoted: i === 0 ? m : undefined });
            } catch (_) {}
        }
    }

    const elapsedMs = Date.now() - startTime;
    await editMain(txtFinalCard({
        title, berhasil: total, total: totalImg,
        totalBytes, elapsedMs, failed,
        isSearch, query,
    }));
    await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
}

// ── COMMAND HANDLER UTAMA ──────────────────────────────────────────────────────

async function handleHentaidad({ hisoka, m, tolak, logCommand, logError, pendingHentaidadChoices }) {
    try {
        logCommand(m, hisoka, m.command || 'hentaidad');

        const query    = (Array.isArray(m.args) && m.args.length > 0)
            ? m.args.join(' ').trim()
            : (m.text || '').replace(/^[.!/]?hentaidad\s*/i, '').trim();
        const isSearch = query.length > 0;

        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

        let sentMsg = null;
        try {
            sentMsg = await hisoka.sendMessage(m.from, { text: txtLoading(isSearch, query) }, { quoted: m });
        } catch (_) {}

        const items = isSearch
            ? await scrapeSearch(query)
            : await scrapeLatestReleases();

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

// ── CHOICE HANDLER — user reply nomor → tampilkan konfirmasi ───────────────────

async function handleHentaidadChoice({
    hisoka, m,
    pendingHentaidadChoices,
    pendingHentaidadConfirm,
    getQuotedStanzaId,
    tolak, logCommand, logError,
}) {
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

    const editMain = (text) => _editKey(hisoka, m, pending.sentKey, text);

    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

        // ── Edit list → "mengambil data galeri" ──────────────────────────────
        await editMain(txtDipilih(chosen, headerPilih));

        // ── Scrape galeri untuk jumlah gambar yang AKURAT + download thumb ──
        const [galleryData, thumbBuf] = await Promise.allSettled([
            scrapeGallery(chosen.href),
            downloadThumb(chosen.thumb),
        ]).then(results => [
            results[0].status === 'fulfilled' ? results[0].value : { title: chosen.title, images: [] },
            results[1].status === 'fulfilled' ? results[1].value : null,
        ]);

        const imageCount  = galleryData.images.length;
        const galleryTitle = galleryData.title || chosen.title;

        if (imageCount === 0) {
            await editMain(
                `🔞 *HENTAIDAD*\n\n${headerPilih}\n\n` +
                `✅ *Dipilih #${chosen.no}:* _${chosen.title.slice(0, 48)}_\n\n` +
                `❌ *Tidak ada gambar ditemukan*\n` +
                `> _Galeri ini mungkin kosong atau belum tersedia_`
            );
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return true;
        }

        // ── Edit list → "menunggu konfirmasi" ─────────────────────────────────
        await editMain(
            `🔞 *HENTAIDAD*\n\n${headerPilih}\n\n` +
            `✅ *Dipilih #${chosen.no}:*\n` +
            `_${galleryTitle.length > 48 ? galleryTitle.slice(0, 48) + '…' : galleryTitle}_\n\n` +
            `❓ _Menunggu konfirmasi..._`
        );

        // ── Kirim pesan konfirmasi: thumbnail + info + 2 tombol ───────────────
        const captionText = txtConfirmCaption(chosen, galleryTitle, imageCount, headerPilih);
        const { sent: confirmSent } = await _sendConfirmMsg(hisoka, m, captionText, thumbBuf);

        // ── Simpan ke pendingHentaidadConfirm ─────────────────────────────────
        const CONFIRM_TTL     = 5 * 60 * 1000; // 5 menit untuk konfirmasi
        const confirmTimeout  = setTimeout(() => {
            if (pendingHentaidadConfirm.has(m.sender)) {
                pendingHentaidadConfirm.delete(m.sender);
                editMain(
                    `🔞 *HENTAIDAD*\n\n${headerPilih}\n\n` +
                    `⏳ *Konfirmasi kedaluwarsa*\n` +
                    `> _Ketik_ \`.hentaidad\` _lagi untuk mulai_`
                ).catch(() => {});
            }
        }, CONFIRM_TTL);

        pendingHentaidadConfirm.set(m.sender, {
            chosen,
            galleryData,
            headerPilih,
            sentKey       : pending.sentKey,       // key pesan list (untuk edit progress)
            confirmMsgId  : confirmSent?.key?.id || null,
            isSearch      : pending.isSearch,
            query         : pending.query,
            expiresAt     : Date.now() + CONFIRM_TTL,
            loading       : false,
            timeout       : confirmTimeout,
        });

        await hisoka.sendMessage(m.from, { react: { text: '❓', key: m.key } });

    } catch (err) {
        console.error('[HENTAIDAD] Choice error:', err?.message);
        if (typeof logError === 'function')
            logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad-choice');
        await editMain(txtError(err?.message));
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }

    return true;
}

// ── CONFIRM HANDLER — user tap Lanjutkan / Tidak ────────────────────────────────

/**
 * Panggil di message handler sebelum handleHentaidadChoice.
 * Deteksi: m.text adalah salah satu ID konfirmasi atau teks "lanjutkan"/"tidak"
 * DAN m.sender ada di pendingHentaidadConfirm.
 *
 * Nilai yang diterima dari:
 *   - old buttons API : m.text = 'hentaidad_yes' / 'hentaidad_no'
 *   - nativeFlow list : m.text = 'hentaidad_yes' / 'hentaidad_no'
 *   - fallback text   : m.text = 'lanjutkan' / 'tidak' / 'ya' / 'batal'
 */
async function handleHentaidadConfirm({
    hisoka, m,
    pendingHentaidadConfirm,
    getQuotedStanzaId,
    logError,
}) {
    if (!pendingHentaidadConfirm.has(m.sender)) return false;

    const raw  = String(m.text || '').trim().toLowerCase();

    // Nilai konfirmasi yang dikenali
    const YES_VALUES = ['hentaidad_yes', 'lanjutkan', 'ya', 'yes', 'lanjut', 'oke', 'ok'];
    const NO_VALUES  = ['hentaidad_no',  'tidak', 'no', 'batal', 'cancel', 'gak', 'ga'];

    const isYes = YES_VALUES.includes(raw);
    const isNo  = NO_VALUES.includes(raw);

    if (!isYes && !isNo) return false;

    const confirm = pendingHentaidadConfirm.get(m.sender);

    // ── Expired ───────────────────────────────────────────────────────────────
    if (confirm.expiresAt <= Date.now()) {
        pendingHentaidadConfirm.delete(m.sender);
        await _editKey(hisoka, m, confirm.sentKey,
            `🔞 *HENTAIDAD*\n\n⏳ *Konfirmasi kedaluwarsa*\n> _Ketik_ \`.hentaidad\` _lagi untuk mulai_`
        );
        return true;
    }

    // ── Sedang diproses ───────────────────────────────────────────────────────
    if (confirm.loading) {
        try { await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } }); } catch (_) {}
        return true;
    }

    // ── Kunci — hapus dari pending ────────────────────────────────────────────
    confirm.loading = true;
    if (confirm.timeout) clearTimeout(confirm.timeout);
    pendingHentaidadConfirm.delete(m.sender);

    const { chosen, galleryData, headerPilih, sentKey, isSearch, query } = confirm;
    const editMain = (text) => _editKey(hisoka, m, sentKey, text);

    // ── TIDAK: batalkan ───────────────────────────────────────────────────────
    if (isNo) {
        try { await hisoka.sendMessage(m.from, { react: { text: '🚫', key: m.key } }); } catch (_) {}
        await editMain(txtBatalkan(chosen, headerPilih));
        return true;
    }

    // ── YA: download + kirim album ────────────────────────────────────────────
    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

        await _doDownloadAndSend({
            hisoka, m,
            chosen, galleryData, headerPilih,
            sentKey, isSearch, query,
            logError,
        });

    } catch (err) {
        console.error('[HENTAIDAD] Confirm error:', err?.message);
        if (typeof logError === 'function')
            logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'hentaidad-confirm');
        await editMain(txtError(err?.message));
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }

    return true;
}

module.exports = { handleHentaidad, handleHentaidadChoice, handleHentaidadConfirm };
