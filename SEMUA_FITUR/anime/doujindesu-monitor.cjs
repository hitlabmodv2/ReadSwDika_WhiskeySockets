const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const {
    DOUJIN_BASE_URL,
    DOUJIN_CATEGORIES,
    scrapeLatest,
    scrapeChapterImages,
} = require('./doujindesu.cjs');
const DOUJIN_STATE_SOURCE = 'doujin.desu.xxx-v1';
const LEGACY_CATEGORY_KEYS = {
    doujinshi: 'doujinshi18',
    manhwa: 'manhwa18',
};

const DIR_DATA = path.join(process.cwd(), 'data', 'doujindesunotif');
const FILE_DATA = path.join(DIR_DATA, 'state.json');
fs.mkdirSync(DIR_DATA, { recursive: true });

function loadConfig() {
    const p = path.join(process.cwd(), 'config.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    return {};
}

function saveConfig(cfg) {
    const p = path.join(process.cwd(), 'config.json');
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf-8');
}

function normalizeDoujinData(data = {}) {
    const deliveries = data?.deliveries && typeof data.deliveries === 'object'
        && !Array.isArray(data.deliveries)
        ? data.deliveries
        : {};

    return {
        source: data?.source === DOUJIN_STATE_SOURCE ? DOUJIN_STATE_SOURCE : '',
        history: Array.isArray(data?.history)
            ? data.history.filter(link => typeof link === 'string' && link)
            : [],
        deliveries: Object.fromEntries(
            Object.entries(deliveries)
                .filter(([link, groups]) => link && Array.isArray(groups))
                .map(([link, groups]) => [link, groups.filter(jid => typeof jid === 'string' && jid)])
        ),
    };
}

function saveDoujinData(data) {
    try {
        fs.writeFileSync(FILE_DATA, JSON.stringify(normalizeDoujinData(data), null, 2), 'utf-8');
    } catch (e) {
        console.error('[DoujinMonitor] Gagal menyimpan state:', e.message);
    }
}

function loadDoujinData() {
    let data = {};
    try {
        if (fs.existsSync(FILE_DATA)) {
            data = JSON.parse(fs.readFileSync(FILE_DATA, 'utf-8'));
        }
    } catch (e) {
        console.warn('[DoujinMonitor] State rusak, memakai state kosong:', e.message);
    }

    const cfg = loadConfig();
    const legacy = cfg?.doujinnotif || {};
    const hasLegacyHistory = Object.prototype.hasOwnProperty.call(legacy, 'history');
    const hasLegacyDeliveries = Object.prototype.hasOwnProperty.call(legacy, 'deliveries');

    // Migrasi sekali dari format lama yang masih menaruh state di config.json.
    // Riwayat digabung, bukan ditimpa, agar chapter yang sudah dikirim tetap aman.
    if (hasLegacyHistory || hasLegacyDeliveries) {
        const current = normalizeDoujinData(data);
        const migrated = normalizeDoujinData({
            history: [...current.history, ...(Array.isArray(legacy.history) ? legacy.history : [])],
            deliveries: {
                ...legacy.deliveries,
                ...current.deliveries,
            },
        });
        migrated.history = [...new Set(migrated.history)].slice(-500);
        saveDoujinData(migrated);

        if (cfg.doujinnotif) {
            delete cfg.doujinnotif.history;
            delete cfg.doujinnotif.deliveries;
            saveConfig(cfg);
        }
        console.log('[DoujinMonitor] State lama berhasil dipindahkan ke data/doujindesunotif/state.json');
        return migrated;
    }

    return normalizeDoujinData(data);
}

// Jalankan migrasi saat fitur dimuat agar state lama segera keluar dari
// config.json, termasuk ketika belum ada grup yang sedang aktif.
loadDoujinData();

function getEnabledGroups() {
    const cfg = loadConfig();
    const grps = cfg?.doujinnotif?.groups || {};
    return Object.keys(grps).filter(jid => grps[jid].enabled);
}

const DOUJIN_CATEGORY_KEYS = DOUJIN_CATEGORIES.map(category => category.key);
const DOUJIN_CATEGORY_META = Object.fromEntries(
    DOUJIN_CATEGORIES.map((category, index) => [
        category.key,
        {
            id: `__doujinnotif_kat_${category.key}__`,
            emoji: ['📕', '📗', '📘'][index],
            label: category.label,
        },
    ])
);

function getDoujinGroupCategories(entry) {
    const configured = Array.isArray(entry?.categories)
        ? entry.categories
        : DOUJIN_CATEGORY_KEYS;
    const normalized = configured.map(key => LEGACY_CATEGORY_KEYS[key] || key);
    return DOUJIN_CATEGORY_KEYS.filter(key => normalized.includes(key));
}

function formatDoujinCategories(categories) {
    const labels = getDoujinGroupCategories({ categories })
        .map(key => `${DOUJIN_CATEGORY_META[key].emoji} ${DOUJIN_CATEGORY_META[key].label}`);
    return labels.length ? labels.join(', ') : 'tidak ada';
}


// Buat thumbnail ringan untuk preview dokumen PDF di WhatsApp.
async function buatThumbnail(jpgBuffer) {
    try {
        return await sharp(jpgBuffer)
            .resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 78, progressive: true })
            .toBuffer();
    } catch (e) {
        console.warn('[DoujinMonitor] Gagal membuat thumbnail:', e?.message);
        return null;
    }
}

function bersihkanNamaFile(value) {
    return String(value || '')
        .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, ' - ')
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, ' - ')
        .trim()
        .replace(/[. ]+$/, '');
}

function buatNamaFilePdf(item = {}, prefix = '') {
    const judul = bersihkanNamaFile(item.title || item.judul || 'Doujindesu');
    const chapter = bersihkanNamaFile(item.chapter || '');
    const judulLower = judul.toLowerCase();
    const chapterLower = chapter.toLowerCase();
    const sudahAdaChapter = chapterLower && (
        judulLower === chapterLower ||
        judulLower.endsWith(` ${chapterLower}`) ||
        judulLower.endsWith(`-${chapterLower}`)
    );
    const namaDasar = sudahAdaChapter || !chapter ? judul : `${judul} - ${chapter}`;
    const namaAman = bersihkanNamaFile(namaDasar).slice(0, 150) || 'Doujindesu';
    return `${prefix}${namaAman}.pdf`;
}

function bersihkanTeksCaption(value) {
    return String(value || '')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function buatCaptionDoujin(item = {}, { isTest = false, pageCount = 0, thumbnailReady = false } = {}) {
    const judul = bersihkanTeksCaption(item.title || item.judul || 'Doujindesu');
    const kategori = bersihkanTeksCaption(item.categoryLabel || item.type || 'Lainnya');
    const tipe = bersihkanTeksCaption(item.type || 'Lainnya');
    const chapter = bersihkanTeksCaption(item.chapter || 'Tidak tersedia');
    const link = String(item.link || DOUJIN_BASE_URL);
    const header = isTest
        ? '🧪 *DOUJINDESU — TEST SCRAPER*'
        : '🔞 *DOUJINDESU — CHAPTER BARU*';
    const intro = isTest
        ? '> Scraper berhasil menemukan dan memvalidasi chapter ini.'
        : '> Rilisan baru terdeteksi dari situs resmi Doujindesu.';
    const thumbnailLine = thumbnailReady
        ? '• Thumbnail kecil: ✅ tersedia'
        : '• Thumbnail kecil: ~tidak tersedia~';

    return `${header}\n\n` +
        `${intro}\n\n` +
        `1. *Judul*\n` +
        `   _${judul}_\n` +
        `2. *Kategori*\n` +
        `   \`${kategori}\`\n` +
        `3. *Chapter*\n` +
        `   \`${chapter}\`\n\n` +
        `*Detail file*\n` +
        `• Format: \`PDF\`\n` +
        `• Halaman lengkap: \`${pageCount}\`\n` +
        `${thumbnailLine}\n\n` +
        `> *Sumber:* ${link}`;
}

const MAX_IMAGE_ATTEMPTS = 3;
const MAX_PDF_PAGE_SIZE = 14000;

async function downloadDoujinPage(imgUrl, index, label) {
    let lastError = new Error('Gambar tidak tersedia');
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
        try {
            const resp = await axios.get(imgUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'Referer': DOUJIN_BASE_URL,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                timeout: 15000,
            });
            const byteLength = resp.data?.byteLength ?? resp.data?.length ?? 0;
            if (!byteLength) throw new Error('Response gambar kosong');

            // Terapkan EXIF orientation sebelum membaca ukuran agar halaman tidak miring/crop.
            const jpgBuffer = await sharp(resp.data).rotate().jpeg().toBuffer();
            const metadata = await sharp(jpgBuffer).metadata();
            if (!metadata.width || !metadata.height) throw new Error('Ukuran gambar tidak valid');

            return { jpgBuffer, width: metadata.width, height: metadata.height };
        } catch (e) {
            lastError = e;
            if (attempt < MAX_IMAGE_ATTEMPTS) {
                console.warn(`[DoujinMonitor] ${label} halaman ${index + 1}: retry ${attempt}/${MAX_IMAGE_ATTEMPTS - 1} (${e.message})`);
            }
        }
    }

    throw new Error(`halaman ${index + 1} gagal setelah ${MAX_IMAGE_ATTEMPTS} percobaan: ${lastError.message}`);
}

async function downloadDoujinPages(imageUrls, label) {
    const pages = [];
    for (let i = 0; i < imageUrls.length; i++) {
        try {
            pages.push(await downloadDoujinPage(imageUrls[i], i, label));
        } catch (e) {
            return { pages, failedIndex: i, error: e };
        }
    }
    return { pages, failedIndex: -1, error: null };
}

async function buatPdfDariHalaman(pages, pdfPath) {
    if (!pages.length) throw new Error('Tidak ada halaman valid untuk PDF');

    const doc = new PDFDocument({ autoFirstPage: false });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    const pdfReady = new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    let pdfThumbnail = null;
    for (const page of pages) {
        const scale = Math.min(1, MAX_PDF_PAGE_SIZE / page.width, MAX_PDF_PAGE_SIZE / page.height);
        const pageWidth = Math.max(1, Math.round(page.width * scale));
        const pageHeight = Math.max(1, Math.round(page.height * scale));

        doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });
        // fit mempertahankan rasio dan mencegah sisi gambar terpotong.
        doc.image(page.jpgBuffer, 0, 0, {
            fit: [pageWidth, pageHeight],
            align: 'center',
            valign: 'center',
        });
        if (!pdfThumbnail) pdfThumbnail = await buatThumbnail(page.jpgBuffer);
    }

    doc.end();
    await pdfReady;
    return pdfThumbnail;
}

// Check and process new chapters
async function processNewChapters(hisoka) {
    const groups = getEnabledGroups();
    if (groups.length === 0) return;

    const latest = await scrapeLatest();
    if (!latest.length) return;

    let cfg = loadConfig();
    const data = loadDoujinData();

    // Seperti AlqanimeNotif, scan pertama hanya membuat baseline. Ini
    // mencegah seluruh rilisan lama dari tiga kategori dikirim sekaligus saat
    // fitur baru pertama kali diaktifkan.
    // Ganti sumber harus membuat baseline baru. Kalau history lama langsung
    // dipakai, semua chapter hasil API baru akan dianggap rilisan baru dan
    // dikirim sekaligus ke grup.
    if (data.source !== DOUJIN_STATE_SOURCE || data.history.length === 0) {
        data.source = DOUJIN_STATE_SOURCE;
        data.history = latest.map(item => item.link).slice(-500);
        data.deliveries = {};
        saveDoujinData(data);
        console.log(`[DoujinMonitor] Baseline ${latest.length} chapter dari tiga kategori disimpan`);
        return;
    }

    // Hanya chapter dengan link baru yang diproses. Delivery state dipisah
    // dari history agar grup yang gagal kirim masih mendapat retry berikutnya.
    const newItems = latest
        .slice()
        .reverse()
        .filter(item => !data.history.includes(item.link));
    
    for (const item of newItems) {
        const targetGroups = groups.filter(jid =>
            getDoujinGroupCategories(cfg.doujinnotif.groups?.[jid]).includes(item.category)
        );
        const delivered = new Set(
            Array.isArray(data.deliveries[item.link])
                ? data.deliveries[item.link]
                : []
        );
        const pendingGroups = targetGroups.filter(jid => !delivered.has(jid));

        // Tidak ada grup aktif yang memilih kategori item ini. Tandai sebagai
        // sudah terlihat agar kategori yang dimatikan tidak diproses berulang.
        if (targetGroups.length === 0) {
            console.log(
                `[DoujinMonitor] ⏭️ "${item.title}" [${item.categoryLabel}] dilewati — ` +
                'tidak ada grup aktif untuk kategori ini'
            );
            if (!data.history.includes(item.link)) {
                data.history.push(item.link);
                if (data.history.length > 500) {
                    data.history = data.history.slice(-500);
                }
                saveDoujinData(data);
            }
            continue;
        }

        // Recovery setelah proses sempat menyimpan delivery state lengkap
        // tetapi belum sempat menambahkan link ke history.
        if (pendingGroups.length === 0) {
            data.history.push(item.link);
            delete data.deliveries[item.link];
            if (data.history.length > 500) {
                data.history = data.history.slice(-500);
            }
            saveDoujinData(data);
            continue;
        }
        
        // 1. Fetch images
        const imageUrls = await scrapeChapterImages(item.link);
        if (!imageUrls || imageUrls.length === 0) {
            console.log(`[DoujinMonitor] No images found for ${item.title}, skipping.`);
            continue;
        }

        // 2. Download semua halaman secara berurutan sebelum membuat PDF.
        // Jika satu halaman gagal setelah retry, jangan kirim PDF parsial.
        const hasilDownload = await downloadDoujinPages(imageUrls, item.title);
        if (hasilDownload.failedIndex >= 0) {
            console.warn(
                `[DoujinMonitor] PDF ${item.title} dibatalkan: halaman ` +
                `${hasilDownload.failedIndex + 1}/${imageUrls.length} tidak lengkap (${hasilDownload.error.message}).`
            );
            continue;
        }

        // 3. Generate PDF
        const tmpDir = path.join(process.cwd(), 'tmp');
        fs.mkdirSync(tmpDir, { recursive: true });
        const pdfPath = path.join(tmpDir, `doujin_${Date.now()}.pdf`);
        let pdfThumbnail;
        try {
            pdfThumbnail = await buatPdfDariHalaman(hasilDownload.pages, pdfPath);
        } catch (e) {
            try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (_) {}
            console.error(`[DoujinMonitor] Gagal membuat PDF ${item.title}:`, e.message);
            continue;
        }
        
        const caption = buatCaptionDoujin(item, {
            pageCount: imageUrls.length,
            thumbnailReady: Boolean(pdfThumbnail),
        });

        // 3. Send PDF to groups. Tandai per grup hanya setelah sendMessage
        // sukses; kegagalan transient akan dicoba lagi pada polling berikutnya.
        let allGroupsDelivered = true;
        for (const jid of pendingGroups) {
            try {
                const documentPayload = {
                    document: { url: pdfPath },
                    mimetype: 'application/pdf',
                    fileName: buatNamaFilePdf(item),
                    caption,
                    ...(pdfThumbnail ? { jpegThumbnail: pdfThumbnail } : {}),
                };
                await hisoka.sendMessage(jid, documentPayload);
                delivered.add(jid);
            } catch (e) {
                console.error(`[DoujinMonitor] Gagal kirim ke ${jid}:`, e.message);
                allGroupsDelivered = false;
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        // 4. Persist delivery state/history sebelum cleanup file. Jika ada
        // grup gagal, item tidak dianggap selesai dan akan diretry.
        const currentCfg = loadConfig();
        const currentGroups = getEnabledGroups().filter(jid =>
            getDoujinGroupCategories(currentCfg.doujinnotif?.groups?.[jid]).includes(item.category)
        );
        const isComplete = allGroupsDelivered &&
            currentGroups.every(jid => delivered.has(jid));
        if (isComplete) {
            if (!data.history.includes(item.link)) {
                data.history.push(item.link);
            }
            delete data.deliveries[item.link];
            if (data.history.length > 500) {
                data.history = data.history.slice(-500);
            }
        } else {
            data.deliveries[item.link] = Array.from(delivered);
        }
        saveDoujinData(data);

        if (isComplete) {
            console.log(
                `[DoujinMonitor] ✅ "${item.title}" [${item.categoryLabel}] ` +
                `terkirim ke ${delivered.size} grup`
            );
        } else {
            console.warn(
                `[DoujinMonitor] ⚠️ "${item.title}" [${item.categoryLabel}] ` +
                `terkirim ke ${delivered.size}/${currentGroups.length} grup — akan retry`
            );
        }
        
        // Cleanup PDF
        try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (_) {}
    }
}

async function runDoujinTest({ hisoka, m, tolak }) {
    await tolak(hisoka, m, '⏳ Sedang menguji scraper Doujindesu...');
    try {
        const latest = await scrapeLatest();
        if (!latest.length) {
            await tolak(hisoka, m, '❌ Tidak ada manga terbaru yang ditemukan saat tes.');
            return;
        }

        const item = latest[0];
        await tolak(
            hisoka,
            m,
            `✅ Ditemukan chapter terbaru:\n\nJudul: ${item.title}\nLink: ${item.link}\n\n⏳ Sedang mengunduh dan membuat PDF...`
        );

        const imageUrls = await scrapeChapterImages(item.link);
        if (!imageUrls.length) {
            await tolak(hisoka, m, '❌ Gagal mendapatkan gambar dari chapter tersebut.');
            return;
        }

        const tmpDir = path.join(process.cwd(), 'tmp');
        fs.mkdirSync(tmpDir, { recursive: true });
        const imageUrlsTest = imageUrls;
        const hasilDownload = await downloadDoujinPages(imageUrlsTest, 'Test Doujindesu');
        if (hasilDownload.failedIndex >= 0) {
            try {
                await tolak(
                    hisoka,
                    m,
                    `❌ Test dibatalkan: halaman ${hasilDownload.failedIndex + 1}/${imageUrlsTest.length} ` +
                    `gagal dimuat setelah ${MAX_IMAGE_ATTEMPTS} percobaan. PDF parsial tidak dikirim.`
                );
            } catch (_) {}
            return;
        }

        const pdfPath = path.join(tmpDir, `test_doujin_${Date.now()}.pdf`);
        let pdfThumbnail;
        try {
            pdfThumbnail = await buatPdfDariHalaman(hasilDownload.pages, pdfPath);
        } catch (e) {
            try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (_) {}
            await tolak(hisoka, m, `❌ PDF test gagal dibuat: ${e.message}`);
            return;
        }

        const caption = buatCaptionDoujin(item, {
            isTest: true,
            pageCount: imageUrls.length,
            thumbnailReady: Boolean(pdfThumbnail),
        });

        try {
            const documentPayload = {
                document: { url: pdfPath },
                mimetype: 'application/pdf',
                fileName: buatNamaFilePdf(item, 'TEST_'),
                caption,
                ...(pdfThumbnail ? { jpegThumbnail: pdfThumbnail } : {}),
            };
            await hisoka.sendMessage(m.from, documentPayload);
        } finally {
            try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch (_) {}
        }
    } catch (e) {
        await tolak(hisoka, m, `❌ Terjadi kesalahan saat tes: ${e.message}`);
    }
}

// ── BUTTON HELPERS ────────────────────────────────────────────────────────────
// Simpan tombol terakhir per chat agar tombol lama dan pesan tap bisa dibersihkan.
const _doujinPrevBtnKey = new Map();

async function _doujinAutoClean(hisoka, m) {
    const prev = _doujinPrevBtnKey.get(m.from);
    if (prev) {
        try { await hisoka.sendMessage(m.from, { delete: prev }); } catch (_) {}
        _doujinPrevBtnKey.delete(m.from);
    }
    if (m.key) {
        try { await hisoka.sendMessage(m.from, { delete: m.key }); } catch (_) {}
    }
}

async function _doujinRunBtn(hisoka, m, btn, fallbackBody, tolakFn) {
    if (!btn || typeof btn.run !== 'function') {
        await tolakFn(hisoka, m, fallbackBody);
        return;
    }
    try {
        const sent = await btn.run(m.from, hisoka, m);
        if (sent?.key) _doujinPrevBtnKey.set(m.from, sent.key);
    } catch (e) {
        console.warn('[DoujinMonitor] Button gagal, pakai fallback teks:', e?.message);
        await tolakFn(hisoka, m, fallbackBody);
    }
}

function _doujinAddMainButtons(btn, active) {
    if (active) {
        btn.addReply('❌ Nonaktifkan GC Ini', '__doujinnotif_off__');
    } else {
        btn.addReply('✅ Aktifkan GC Ini', '__doujinnotif_on__');
    }
    btn.addReply('✏️ Edit Kategori', '__doujinnotif_kat_menu__');
    btn.addReply('🧪 Test Scraper', '__doujinnotif_test__');
}

function _doujinAddCategoryButtons(btn, categories) {
    for (const key of DOUJIN_CATEGORY_KEYS) {
        const meta = DOUJIN_CATEGORY_META[key];
        const active = categories.includes(key);
        btn.addReply(`${active ? '✅' : '❌'} ${meta.emoji} ${meta.label}`, meta.id);
    }
    btn.addReply('🔙 Kembali', '__doujinnotif_back__');
}

function makeDoujinMenuBody({ active, registered, pfx, categories }) {
    const categoryLine = `│ Kategori : ${formatDoujinCategories(categories)}\n│\n`;
    if (active) {
        return `╭─「 🔞 *DOUJINDESU NOTIF* 」\n│\n` +
               `│ Status grup ini : ✅ *AKTIF*\n│\n` +
               `│ Notif chapter baru dari doujin.desu.xxx\n` +
               `│ otomatis masuk sebagai file PDF.\n│\n` +
               categoryLine +
               `│ Ketik *${pfx}doujindesu off* untuk matikan.\n│\n` +
               `╰──────────────────────`;
    }
    if (registered) {
        return `╭─「 🔞 *DOUJINDESU NOTIF* 」\n│\n` +
               `│ Status grup ini : ❌ *BELUM AKTIF*\n│\n` +
               `│ ID grup ini sudah terdaftar, tapi notif\n` +
               `│ belum diaktifkan.\n│\n` +
               categoryLine +
               `│ Aktifkan notif Doujindesu di grup ini?\n│\n` +
               `╰──────────────────────`;
    }
    return `╭─「 🔞 *DOUJINDESU NOTIF* 」\n│\n` +
           `│ Status grup ini : ➕ *BELUM TERDAFTAR*\n│\n` +
           `│ Fitur notif belum aktif di grup ini.\n│\n` +
            categoryLine +
           `│ Aktifkan notif Doujindesu di grup ini?\n│\n` +
           `╰──────────────────────`;
}

async function handleDoujinNotif(args) {
    const { hisoka, m, txt, Button, logCommand } = args;
    const tolak = args.tolak || (async (h, mm, teks) => h.sendMessage(mm.from, { text: teks }, { quoted: mm }));
    const loadCfg = args.loadConfig || loadConfig;
    const saveCfg = args.saveConfig || saveConfig;
    const pfx = m.prefix || '.';
    const mode = String(txt || '').toLowerCase().trim();

    if (!m.isGroup) {
        await tolak(hisoka, m, '❌ Hanya bisa digunakan di dalam grup.');
        return true;
    }
    if (!m.isOwner && !m.isAdmin) {
        await tolak(hisoka, m, '❌ Hanya admin grup atau owner yang dapat menggunakan fitur ini.');
        return true;
    }

    const cfg = loadCfg();
    if (!cfg.doujinnotif) cfg.doujinnotif = { groups: {} };
    if (!cfg.doujinnotif.groups) cfg.doujinnotif.groups = {};

    // Tanpa subcommand → quick-reply menu kontekstual seperti Alqanime.
    if (!mode || mode === 'help') {
        const entry = cfg.doujinnotif.groups[m.from];
        const body = makeDoujinMenuBody({
            active: entry?.enabled === true,
            registered: entry !== undefined,
            pfx,
            categories: getDoujinGroupCategories(entry),
        });
        const btn = typeof Button === 'function'
            ? new Button().setBody(body).setFooter('🔞 Doujindesu Notif')
            : null;
        if (btn) {
            _doujinAddMainButtons(btn, entry?.enabled === true);
        }
        await _doujinRunBtn(hisoka, m, btn, body + `\n\n✅ Ketik *${pfx}doujindesu on* untuk aktifkan.`, tolak);
        if (typeof logCommand === 'function') logCommand(m, hisoka, 'doujinnotif-menu');
        return true;
    }

    if (mode === 'test') {
        await runDoujinTest({ hisoka, m, tolak });
        return true;
    }

    if (!['on', 'off'].includes(mode)) {
        await tolak(hisoka, m, `❌ Format salah.\nKetik *${pfx}doujindesu* untuk menu, atau *${pfx}doujindesu on/off*.`);
        return true;
    }

    const enabled = mode === 'on';
    try {
        const sebelumnya = cfg.doujinnotif.groups[m.from]?.enabled === true;
        const categories = getDoujinGroupCategories(cfg.doujinnotif.groups[m.from]);
        cfg.doujinnotif.groups[m.from] = { enabled, categories, updatedAt: Date.now() };
        saveCfg(cfg);

        await hisoka.sendMessage(m.from, { react: { text: enabled ? '✅' : '❌', key: m.key } });
        const body =
            `╭─「 🔞 *DOUJINDESU NOTIF* 」\n│\n` +
            `│ Status sebelumnya : ${sebelumnya ? '✅ ON' : '❌ OFF'}\n` +
            `│ Status sekarang   : ${enabled ? '✅ *ON*' : '❌ *OFF*'}\n│\n` +
            (enabled
                ? `│ Notif chapter baru akan masuk\n│ sebagai file PDF ke grup ini.\n`
                : `│ Notif Doujindesu tidak akan masuk\n│ ke grup ini lagi.\n`) +
            `│ Kategori : ${formatDoujinCategories(categories)}\n` +
            `│\n╰──────────────────────`;
        const btn = typeof Button === 'function'
            ? new Button().setBody(body).setFooter('🔞 Doujindesu Notif')
            : null;
        if (btn) {
            _doujinAddMainButtons(btn, enabled);
        }
        await _doujinRunBtn(hisoka, m, btn, body, tolak);
        if (typeof logCommand === 'function') logCommand(m, hisoka, `doujinnotif-${mode}`);
    } catch (e) {
        await tolak(hisoka, m, `❌ Gagal: ${e.message}`);
    }
    return true;
}

async function handleDoujinNotifCallbacks({ hisoka, m, tolak, logCommand, Button, loadConfig: loadCfg = loadConfig, saveConfig: saveCfg = saveConfig }) {
    if (!m.isOwner && !m.isAdmin) return false;
    const txt = typeof m.text === 'string' ? m.text.trim() : '';
    const categoryCallbackMap = Object.fromEntries(
        DOUJIN_CATEGORY_KEYS.map(key => [DOUJIN_CATEGORY_META[key].id, key])
    );
    const valid = [
        '__doujinnotif_on__',
        '__doujinnotif_off__',
        '__doujinnotif_cancel__',
        '__doujinnotif_test__',
        '__doujinnotif_kat_menu__',
        '__doujinnotif_back__',
        ...Object.keys(categoryCallbackMap),
    ];
    if (!valid.includes(txt)) return false;

    await _doujinAutoClean(hisoka, m);

    if (!m.isGroup && (
        txt === '__doujinnotif_kat_menu__' ||
        txt === '__doujinnotif_back__' ||
        txt in categoryCallbackMap
    )) {
        await tolak(hisoka, m, '❌ Edit kategori hanya bisa digunakan di dalam grup.');
        return true;
    }

    if (txt === '__doujinnotif_kat_menu__') {
        try {
            const cfg = loadCfg();
            const entry = cfg?.doujinnotif?.groups?.[m.from];
            const categories = getDoujinGroupCategories(entry);
            const body =
                `╭─「 🔞 *DOUJINDESU NOTIF — KATEGORI* 」\n│\n` +
                `│ Kategori aktif :\n│ ${formatDoujinCategories(categories)}\n│\n` +
                `│ Tap tombol untuk aktifkan / matikan\n` +
                `│ masing-masing kategori.\n│\n` +
                `╰──────────────────────`;
            const btn = typeof Button === 'function'
                ? new Button().setBody(body).setFooter('🔞 Doujindesu Notif')
                : null;
            if (btn) _doujinAddCategoryButtons(btn, categories);
            await _doujinRunBtn(hisoka, m, btn, body, tolak);
            if (typeof logCommand === 'function') logCommand(m, hisoka, 'doujinnotif-kat-menu');
        } catch (e) {
            await tolak(hisoka, m, `❌ Gagal membuka kategori: ${e.message}`);
        }
        return true;
    }

    if (txt === '__doujinnotif_back__') {
        try {
            const cfg = loadCfg();
            const entry = cfg?.doujinnotif?.groups?.[m.from];
            const body = makeDoujinMenuBody({
                active: entry?.enabled === true,
                registered: entry !== undefined,
                pfx: m.prefix || '.',
                categories: getDoujinGroupCategories(entry),
            });
            const btn = typeof Button === 'function'
                ? new Button().setBody(body).setFooter('🔞 Doujindesu Notif')
                : null;
            if (btn) _doujinAddMainButtons(btn, entry?.enabled === true);
            await _doujinRunBtn(hisoka, m, btn, body, tolak);
            if (typeof logCommand === 'function') logCommand(m, hisoka, 'doujinnotif-back');
        } catch (e) {
            await tolak(hisoka, m, `❌ Gagal kembali ke menu: ${e.message}`);
        }
        return true;
    }

    if (txt in categoryCallbackMap) {
        const key = categoryCallbackMap[txt];
        try {
            const cfg = loadCfg();
            if (!cfg.doujinnotif) cfg.doujinnotif = { groups: {} };
            if (!cfg.doujinnotif.groups) cfg.doujinnotif.groups = {};
            const previous = cfg.doujinnotif.groups[m.from] || { enabled: false };
            const categories = getDoujinGroupCategories(previous);
            const index = categories.indexOf(key);
            const enabled = index === -1;
            if (enabled) categories.push(key);
            else categories.splice(index, 1);
            const orderedCategories = DOUJIN_CATEGORY_KEYS.filter(category => categories.includes(category));
            cfg.doujinnotif.groups[m.from] = {
                ...previous,
                enabled: previous.enabled === true,
                categories: orderedCategories,
                updatedAt: Date.now(),
            };
            saveCfg(cfg);

            const meta = DOUJIN_CATEGORY_META[key];
            const body =
                `╭─「 🔞 *DOUJINDESU NOTIF — KATEGORI* 」\n│\n` +
                `│ ${meta.emoji} *${meta.label}* : ${enabled ? '✅ Diaktifkan' : '❌ Dinonaktifkan'}\n│\n` +
                `│ Kategori aktif :\n│ ${formatDoujinCategories(orderedCategories)}\n│\n` +
                `│ Tap tombol untuk toggle kategori lainnya.\n│\n` +
                `╰──────────────────────`;
            await hisoka.sendMessage(m.from, { react: { text: enabled ? '✅' : '❌', key: m.key } });
            const btn = typeof Button === 'function'
                ? new Button().setBody(body).setFooter('🔞 Doujindesu Notif')
                : null;
            if (btn) _doujinAddCategoryButtons(btn, orderedCategories);
            await _doujinRunBtn(hisoka, m, btn, body, tolak);
            if (typeof logCommand === 'function') logCommand(m, hisoka, `doujinnotif-kat-${key}-${enabled ? 'on' : 'off'}`);
        } catch (e) {
            await tolak(hisoka, m, `❌ Gagal toggle kategori: ${e.message}`);
        }
        return true;
    }

    if (txt === '__doujinnotif_cancel__') {
        await hisoka.sendMessage(m.from, { react: { text: '👋', key: m.key } });
        await tolak(hisoka, m, 'ℹ️ Dibatalkan. Fitur Doujindesu notif tidak diubah.');
        return true;
    }

    if (txt === '__doujinnotif_test__') {
        await runDoujinTest({ hisoka, m, tolak });
        return true;
    }

    if (!m.isGroup) {
        await tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di dalam grup.');
        return true;
    }

    const enabled = txt === '__doujinnotif_on__';
    try {
        const cfg = loadCfg();
        if (!cfg.doujinnotif) cfg.doujinnotif = { groups: {} };
        if (!cfg.doujinnotif.groups) cfg.doujinnotif.groups = {};
        const sebelumnya = cfg.doujinnotif.groups[m.from]?.enabled === true;
        const categories = getDoujinGroupCategories(cfg.doujinnotif.groups[m.from]);
        cfg.doujinnotif.groups[m.from] = { enabled, categories, updatedAt: Date.now() };
        saveCfg(cfg);

        await hisoka.sendMessage(m.from, { react: { text: enabled ? '✅' : '❌', key: m.key } });
        const body =
            `╭─「 🔞 *DOUJINDESU NOTIF* 」\n│\n` +
            `│ Status sebelumnya : ${sebelumnya ? '✅ ON' : '❌ OFF'}\n` +
            `│ Status sekarang   : ${enabled ? '✅ *ON*' : '❌ *OFF*'}\n│\n` +
            (enabled
                ? `│ Berhasil diaktifkan di grup ini.\n│ Notif akan dikirim sebagai PDF.\n`
                : `│ Berhasil dinonaktifkan di grup ini.\n`) +
            `│ Kategori : ${formatDoujinCategories(categories)}\n` +
            `│\n╰──────────────────────`;
        const btn = typeof Button === 'function'
            ? new Button().setBody(body).setFooter('🔞 Doujindesu Notif')
            : null;
        if (btn) {
            _doujinAddMainButtons(btn, enabled);
        }
        await _doujinRunBtn(hisoka, m, btn, body, tolak);
        if (typeof logCommand === 'function') logCommand(m, hisoka, `doujinnotif-${enabled ? 'on' : 'off'}-btn`);
    } catch (e) {
        await tolak(hisoka, m, `❌ Gagal: ${e.message}`);
    }
    return true;
}

module.exports = {
    handleDoujinNotif,
    handleDoujinNotifCallbacks,
    processNewChapters
};
