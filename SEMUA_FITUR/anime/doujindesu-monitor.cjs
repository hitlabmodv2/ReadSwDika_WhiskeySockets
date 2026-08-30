const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
    DOUJIN_BASE_URL,
    DOUJIN_CATEGORIES,
    scrapeLatest,
    scrapeMangaDetails,
} = require('./doujindesu.cjs');
const DOUJIN_STATE_SOURCE = 'doujin.desu.xxx-v1';
const LEGACY_CATEGORY_KEYS = {
    doujinshi: 'doujinshi18',
    manhwa: 'manhwa18',
};

const DIR_DATA = path.join(process.cwd(), 'data', 'doujindesunotif');
const FILE_DATA = path.join(DIR_DATA, 'state.json');
const FILE_LOG = path.join(DIR_DATA, 'log.json');
const FILE_SERIES_CACHE = path.join(DIR_DATA, 'series_cache.json');
const SERIES_CACHE_TTL_MS = 60 * 1000;
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
    const retryQueue = data?.retryQueue && typeof data.retryQueue === 'object'
        && !Array.isArray(data.retryQueue)
        ? data.retryQueue
        : {};
    const history = Array.isArray(data?.history)
        ? [...new Set(data.history
            .filter(link => typeof link === 'string' && link)
            .map(canonicalChapterLink))]
        : [];

    return {
        source: data?.source === DOUJIN_STATE_SOURCE ? DOUJIN_STATE_SOURCE : '',
        history,
        deliveries: Object.fromEntries(
            Object.entries(deliveries)
                .filter(([link, groups]) => link && Array.isArray(groups))
                .map(([link, groups]) => [
                    canonicalChapterLink(link),
                    [...new Set(groups.filter(jid => typeof jid === 'string' && jid))],
                ])
        ),
        retryQueue: Object.fromEntries(
            Object.entries(retryQueue)
                .filter(([link, value]) => link && value && typeof value === 'object')
                .map(([link, value]) => [
                    canonicalChapterLink(link),
                    {
                        item: value.item && typeof value.item === 'object' ? value.item : value,
                        firstFailedAt: Number(value.firstFailedAt) || Date.now(),
                        lastAttemptAt: Number(value.lastAttemptAt) || 0,
                    },
                ])
        ),
    };
}

function saveDoujinData(data) {
    try {
        const normalized = normalizeDoujinData(data);
        const temporary = `${FILE_DATA}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(normalized, null, 2), 'utf-8');
        fs.renameSync(temporary, FILE_DATA);
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
            source: DOUJIN_STATE_SOURCE,
            history: [...current.history, ...(Array.isArray(legacy.history) ? legacy.history : [])],
            deliveries: {
                ...legacy.deliveries,
                ...current.deliveries,
            },
            retryQueue: current.retryQueue,
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

function loadDoujinLog() {
    try {
        if (fs.existsSync(FILE_LOG)) {
            const parsed = JSON.parse(fs.readFileSync(FILE_LOG, 'utf-8'));
            return {
                terkirim: Array.isArray(parsed?.terkirim) ? parsed.terkirim : [],
                gagal: Array.isArray(parsed?.gagal) ? parsed.gagal : [],
            };
        }
    } catch (e) {
        console.warn('[DoujinMonitor] Log rusak, memakai log kosong:', e.message);
    }
    return { terkirim: [], gagal: [] };
}

function saveDoujinLog(log) {
    try {
        const normalized = {
            terkirim: Array.isArray(log?.terkirim) ? log.terkirim.slice(0, 300) : [],
            gagal: Array.isArray(log?.gagal) ? log.gagal.slice(0, 300) : [],
        };
        const temporary = `${FILE_LOG}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(normalized, null, 2), 'utf-8');
        fs.renameSync(temporary, FILE_LOG);
    } catch (e) {
        console.error('[DoujinMonitor] Gagal menyimpan log:', e.message);
    }
}

function loadSeriesCache() {
    try {
        if (fs.existsSync(FILE_SERIES_CACHE)) {
            const parsed = JSON.parse(fs.readFileSync(FILE_SERIES_CACHE, 'utf-8'));
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        }
    } catch (e) {
        console.warn('[DoujinMonitor] Cache seri rusak, memakai cache kosong:', e.message);
    }
    return {};
}

function saveSeriesCache(cache) {
    try {
        const entries = Object.entries(cache || {})
            .filter(([slug, value]) => slug && value?.detail && value?.cachedAt)
            .sort((a, b) => Number(b[1].cachedAt) - Number(a[1].cachedAt))
            .slice(0, 200);
        const temporary = `${FILE_SERIES_CACHE}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(Object.fromEntries(entries), null, 2), 'utf-8');
        fs.renameSync(temporary, FILE_SERIES_CACHE);
    } catch (e) {
        console.error('[DoujinMonitor] Gagal menyimpan cache seri:', e.message);
    }
}

function canonicalChapterLink(value) {
    const link = String(value || '').trim();
    return link.replace(/\/+$/, '').toLowerCase();
}

function getChapterKey(item = {}) {
    return canonicalChapterLink(item.link || item.id);
}

function simulasikanPollingChapter(sequence = []) {
    const seen = new Set();
    return sequence.filter(item => {
        const key = getChapterKey(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function queueDoujinRetry(data, item, key) {
    const current = data.retryQueue[key] || {
        item: {},
        firstFailedAt: Date.now(),
        lastAttemptAt: 0,
    };
    current.item = { ...current.item, ...item };
    current.lastAttemptAt = Date.now();
    data.retryQueue[key] = current;
}

function addUniqueHistory(data, link) {
    const key = canonicalChapterLink(link);
    if (!key) return;
    data.history = [...new Set([...(data.history || []), key])].slice(-500);
}

function logDoujinDelivery(item, groups) {
    const log = loadDoujinLog();
    const key = getChapterKey(item);
    const entry = {
        key,
        id: String(item.id || ''),
        title: item.title || 'Doujindesu',
        chapter: item.chapter || '',
        category: item.category || '',
        categoryLabel: item.categoryLabel || item.type || '',
        link: item.link || '',
        waktuKirim: new Date().toISOString(),
        grupCount: groups.length,
        grupList: [...new Set(groups)],
    };
    log.terkirim = [
        entry,
        ...log.terkirim.filter(existing => existing?.key !== key),
    ].slice(0, 300);
    log.gagal = log.gagal.filter(existing => existing?.key !== key);
    saveDoujinLog(log);
}

function logDoujinFailure(item, error, groups = []) {
    const log = loadDoujinLog();
    const key = getChapterKey(item);
    const previous = log.gagal.find(existing => existing?.key === key);
    const entry = {
        key,
        id: String(item.id || ''),
        title: item.title || 'Doujindesu',
        chapter: item.chapter || '',
        category: item.category || '',
        categoryLabel: item.categoryLabel || item.type || '',
        link: item.link || '',
        waktuGagal: new Date().toISOString(),
        percobaan: Number(previous?.percobaan || 0) + 1,
        grupList: [...new Set(groups)],
        error: String(error?.message || error || 'Gagal diproses').slice(0, 500),
    };
    log.gagal = [
        entry,
        ...log.gagal.filter(existing => existing?.key !== key),
    ].slice(0, 300);
    saveDoujinLog(log);
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

function decodeHtml(value) {
    let text = String(value || '');
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>',
    };
    // API kadang meng-encode HTML dua kali, misalnya &amp;quot;.
    // Ulangi beberapa putaran agar caption tidak menampilkan entity mentah.
    for (let pass = 0; pass < 3; pass++) {
        const before = text;
        for (const [entity, replacement] of Object.entries(entities)) {
            text = text.replaceAll(entity, replacement);
        }
        text = text
            .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
            .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
        if (text === before) break;
    }
    return text;
}

function bersihkanSynopsis(value) {
    const plain = decodeHtml(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, '')
        .replace(/\r/g, '');
    const withoutBatchLinks = plain.replace(/\n?\s*Download Batch\b[\s\S]*$/i, '');
    return withoutBatchLinks
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .trim();
}

function formatList(value, empty = 'N/A') {
    const list = Array.isArray(value)
        ? value.map(item => String(item || '').trim()).filter(Boolean)
        : String(value || '').split(',').map(item => item.trim()).filter(Boolean);
    return list.length ? list.join(', ') : empty;
}

function formatNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') return 'N/A';
    const number = Number(value);
    // Format mengikuti tampilan statistik DoujinDesu di situs sumber.
    return Number.isFinite(number) ? number.toLocaleString('en-US') : 'N/A';
}

function normalisasiMetadata(item = {}) {
    const synopsis = bersihkanSynopsis(item.description || item.synopsis);
    return {
        title: String(item.title || item.judul || 'Doujindesu').trim(),
        type: String(item.seriesType || item.mangaType || '').trim() || 'N/A',
        status: String(item.status || '').trim() || 'N/A',
        alternativeTitles: formatList(item.alternativeTitles || item.altTitles),
        authors: formatList(item.authors || item.author),
        groups: formatList(item.groups),
        series: formatList(item.series),
        characters: formatList(item.characters),
        genres: formatList(item.genres),
        rating: item.rating === null || item.rating === undefined || String(item.rating).trim() === ''
            ? 'N/A'
            : Number.isFinite(Number(item.rating)) ? Number(item.rating).toFixed(1) : 'N/A',
        views: formatNumber(item.views),
        synopsis: synopsis || 'N/A',
    };
}

async function enrichDoujinItem(item) {
    if (!item?.mangaSlug) {
        throw new Error(`Slug seri tidak tersedia untuk "${item?.title || 'chapter'}"`);
    }
    const cache = loadSeriesCache();
    const cached = cache[item.mangaSlug];
    let detail;
    if (cached?.detail && Date.now() - Number(cached.cachedAt) <= SERIES_CACHE_TTL_MS) {
        detail = cached.detail;
    } else {
        // Detail tetap diambil dari endpoint seri yang aktif. Cache hanya
        // menghindari fetch berulang dalam satu menit saat retry/polling,
        // bukan menjadi sumber data lama untuk kiriman baru.
        detail = await scrapeMangaDetails(item.mangaSlug);
        cache[item.mangaSlug] = {
            cachedAt: Date.now(),
            detail,
        };
        saveSeriesCache(cache);
    }
    if (!detail?.title || !detail.coverUrl) {
        throw new Error(`Metadata seri "${item.mangaSlug}" tidak lengkap`);
    }
    return { ...item, ...detail };
}

function bersihkanTeksCaption(value) {
    return String(value || '')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatCaptionList(value, fallback = 'N/A') {
    const values = Array.isArray(value)
        ? value
        : String(value || '').split(',');
    const cleaned = values
        .map(value => bersihkanTeksCaption(decodeHtml(value)))
        .filter(Boolean);
    return (cleaned.length ? cleaned : [fallback])
        .map(value => `   • ${value}`)
        .join('\n');
}

function buatCaptionDoujin(item = {}, {
    isTest = false,
    thumbnailReady = false,
} = {}) {
    const judul = bersihkanTeksCaption(item.title || item.judul || 'Doujindesu');
    const kategori = bersihkanTeksCaption(item.categoryLabel || item.type || 'Lainnya');
    const metadata = normalisasiMetadata(item);
    const tipe = bersihkanTeksCaption(metadata.type || item.seriesType || item.type || 'Lainnya');
    const chapter = bersihkanTeksCaption(item.chapter || 'Tidak tersedia');
    const link = String(item.link || DOUJIN_BASE_URL);
    const tanggal = item.createdAt
        ? new Date(item.createdAt).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Jakarta',
        })
        : 'Tidak tersedia';
    const header = isTest
        ? '🧪 *DOUJINDESU — TEST SCRAPER*'
        : '🔞 *DOUJINDESU — CHAPTER BARU*';
    const intro = isTest
        ? '> Scraper berhasil menemukan dan memvalidasi chapter ini.'
        : '> Rilisan baru terdeteksi dari situs resmi Doujindesu.';
    const thumbnailLine = thumbnailReady
        ? '• Thumbnail kategori: ✅ cover seri tersedia'
        : '• Thumbnail kategori: ~cover seri tidak tersedia~';
    const alternativeTitles = formatCaptionList(
        item.alternativeTitles || item.altTitles || metadata.alternativeTitles
    );
    const authors = formatCaptionList(item.authors || item.author || metadata.authors);
    const groups = formatCaptionList(item.groups || metadata.groups);
    const series = formatCaptionList(item.series || metadata.series);
    const characters = formatCaptionList(item.characters || metadata.characters);
    const genres = formatCaptionList(item.genres || metadata.genres);

    return `${header}\n\n` +
        `${intro}\n\n` +
        `🔗 *Link chapter realtime:*\n${link}\n\n` +
        `1. *Judul*\n` +
        `   _${judul}_\n` +
        `2. *Kategori*\n` +
        `   \`${kategori}\`\n` +
        `3. *Tipe seri*\n` +
        `   \`${tipe}\`\n` +
        `4. *Chapter*\n` +
        `   \`${chapter}\`\n\n` +
        `*Series Information*\n` +
        `⚑ *Type:* \`${tipe}\`\n` +
        `*Status:* \`${bersihkanTeksCaption(metadata.status)}\`\n` +
        `*Alternative Titles*\n${alternativeTitles}\n` +
        `*Authors*\n${authors}\n` +
        `*Groups*\n${groups}\n` +
        `*Series*\n${series}\n` +
        `*Characters*\n${characters}\n` +
        `*Genres*\n${genres}\n` +
        `*Rating:* \`${metadata.rating}\`\n` +
        `*Views:* \`${metadata.views}\`\n` +
        `*Synopsis*\n   ${bersihkanTeksCaption(metadata.synopsis)}\n\n` +
        `*Update web:* \`${tanggal}\`\n` +
        `${thumbnailLine}\n` +
        `• Metadata seri: ✅ realtime`;
}

function buatKonteksLinkChapter(item = {}, thumbnail) {
    const title = bersihkanTeksCaption(item.title || item.judul || 'Doujindesu');
    const category = bersihkanTeksCaption(item.categoryLabel || item.type || 'Lainnya');
    const chapter = bersihkanTeksCaption(item.chapter || 'Chapter terbaru');
    const sourceUrl = String(item.link || DOUJIN_BASE_URL);

    return {
        externalAdReply: {
            showAdAttribution: false,
            title: `${category} — ${title}`,
            body: `${chapter} • Buka chapter terbaru`,
            sourceUrl,
            mediaType: 1,
            renderLargerThumbnail: true,
            ...(thumbnail ? { thumbnail } : {}),
        },
    };
}

const MAX_IMAGE_ATTEMPTS = 3;

async function downloadDoujinImage(imgUrl, label) {
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
                console.warn(`[DoujinMonitor] ${label}: retry ${attempt}/${MAX_IMAGE_ATTEMPTS - 1} (${e.message})`);
            }
        }
    }

    throw new Error(`${label} gagal setelah ${MAX_IMAGE_ATTEMPTS} percobaan: ${lastError.message}`);
}

// Check and process new chapters
async function _processNewChapters(hisoka) {
    const groups = getEnabledGroups();
    if (groups.length === 0) return;

    const latest = await scrapeLatest();
    let cfg = loadConfig();
    const data = loadDoujinData();
    if (!latest.length && Object.keys(data.retryQueue || {}).length === 0) return;

    // Seperti AlqanimeNotif, scan pertama hanya membuat baseline. Ini
    // mencegah seluruh rilisan lama dari tiga kategori dikirim sekaligus saat
    // fitur baru pertama kali diaktifkan.
    // Ganti sumber harus membuat baseline baru. Kalau history lama langsung
    // dipakai, semua chapter hasil API baru akan dianggap rilisan baru dan
    // dikirim sekaligus ke grup.
    if (data.source !== DOUJIN_STATE_SOURCE || data.history.length === 0) {
        data.source = DOUJIN_STATE_SOURCE;
        data.history = [...new Set(latest.map(item => canonicalChapterLink(item.link)).filter(Boolean))].slice(-500);
        data.deliveries = {};
        data.retryQueue = {};
        saveDoujinData(data);
        console.log(`[DoujinMonitor] Baseline ${latest.length} chapter dari tiga kategori disimpan`);
        return;
    }

    // Hanya chapter dengan key baru yang diproses. Item yang pernah gagal
    // tetap masuk dari retryQueue walaupun sudah turun dari daftar terbaru.
    const currentItems = latest
        .slice()
        .reverse()
        .filter(item => !data.history.includes(getChapterKey(item)));
    const retryItems = Object.values(data.retryQueue || {})
        .map(entry => entry?.item)
        .filter(item => item && getChapterKey(item) && !data.history.includes(getChapterKey(item)));
    const itemKeys = new Set();
    const newItems = [...retryItems, ...currentItems].filter(item => {
        const key = getChapterKey(item);
        if (!key || itemKeys.has(key)) return false;
        itemKeys.add(key);
        return true;
    });
    
    for (const item of newItems) {
        const itemKey = getChapterKey(item);
        if (!itemKey) continue;
        if (!data.retryQueue[itemKey]) {
            queueDoujinRetry(data, item, itemKey);
            saveDoujinData(data);
        }
        const targetGroups = groups.filter(jid =>
            getDoujinGroupCategories(cfg.doujinnotif.groups?.[jid]).includes(item.category)
        );
        const delivered = new Set(
            Array.isArray(data.deliveries[itemKey])
                ? data.deliveries[itemKey]
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
            addUniqueHistory(data, itemKey);
            delete data.deliveries[itemKey];
            delete data.retryQueue[itemKey];
            saveDoujinData(data);
            continue;
        }

        // Recovery setelah proses sempat menyimpan delivery state lengkap
        // tetapi belum sempat menambahkan link ke history.
        if (pendingGroups.length === 0) {
            addUniqueHistory(data, itemKey);
            delete data.deliveries[itemKey];
            delete data.retryQueue[itemKey];
            saveDoujinData(data);
            continue;
        }
        
        let enrichedItem;
        try {
            // Detail seri diambil tepat sebelum dikirim agar cover, kategori,
            // rating, views, dan synopsis tetap mengikuti data terbaru.
            enrichedItem = await enrichDoujinItem(item);
        } catch (e) {
            console.warn(`[DoujinMonitor] Metadata "${item.title}" belum tersedia: ${e.message}`);
            queueDoujinRetry(data, item, itemKey);
            saveDoujinData(data);
            logDoujinFailure(item, e, pendingGroups);
            continue;
        }

        // Hanya ambil cover seri sebagai thumbnail gambar. Isi halaman chapter
        // tidak lagi di-fetch dan tidak lagi diproses menjadi dokumen.
        let cover;
        try {
            cover = await downloadDoujinImage(
                enrichedItem.coverUrl,
                `${enrichedItem.title} thumbnail ${enrichedItem.categoryLabel}`
            );
        } catch (e) {
            console.warn(`[DoujinMonitor] Thumbnail "${enrichedItem.title}" belum tersedia: ${e.message}`);
            queueDoujinRetry(data, enrichedItem, itemKey);
            saveDoujinData(data);
            logDoujinFailure(enrichedItem, e, pendingGroups);
            continue;
        }

        const caption = buatCaptionDoujin(enrichedItem, {
            thumbnailReady: Boolean(cover?.jpgBuffer),
        });

        // Kirim satu gambar cover dengan caption informasi chapter. Tandai per
        // grup hanya setelah sendMessage sukses agar kegagalan bisa di-retry.
        let allGroupsDelivered = true;
        for (const jid of pendingGroups) {
            try {
                const imagePayload = {
                    image: cover.jpgBuffer,
                    mimetype: 'image/jpeg',
                    caption,
                    contextInfo: buatKonteksLinkChapter(enrichedItem, cover.jpgBuffer),
                };
                await hisoka.sendMessage(jid, imagePayload);
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
            addUniqueHistory(data, itemKey);
            delete data.deliveries[itemKey];
            delete data.retryQueue[itemKey];
        } else {
            data.deliveries[itemKey] = Array.from(delivered);
            queueDoujinRetry(data, enrichedItem, itemKey);
        }
        saveDoujinData(data);

        if (isComplete) {
            logDoujinDelivery(enrichedItem, currentGroups);
            console.log(
                `[DoujinMonitor] ✅ "${enrichedItem.title}" [${item.categoryLabel}] ` +
                `terkirim ke ${delivered.size} grup`
            );
        } else {
            logDoujinFailure(
                enrichedItem,
                new Error(`Terkirim ke ${delivered.size}/${currentGroups.length} grup`),
                currentGroups.filter(jid => !delivered.has(jid))
            );
            console.warn(
                `[DoujinMonitor] ⚠️ "${enrichedItem.title}" [${item.categoryLabel}] ` +
                `terkirim ke ${delivered.size}/${currentGroups.length} grup — akan retry`
            );
        }
    }
}

let _doujinProcessingPromise = null;

async function processNewChapters(hisoka) {
    // Guard kedua di level modul. Scheduler index.js juga punya guard, tetapi
    // ini mencegah duplikat jika fungsi dipanggil dari test/callback lain.
    if (_doujinProcessingPromise) {
        console.log('[DoujinMonitor] ⏭️ Scan sebelumnya masih berjalan');
        return _doujinProcessingPromise;
    }
    _doujinProcessingPromise = _processNewChapters(hisoka);
    try {
        return await _doujinProcessingPromise;
    } finally {
        _doujinProcessingPromise = null;
    }
}

async function simulasiDoujinNotif({ validasi = false } = {}) {
    const latest = await scrapeLatest();
    const data = loadDoujinData();
    const enabledGroups = getEnabledGroups();
    const currentItems = latest.filter(item => !data.history.includes(getChapterKey(item)));
    const retryItems = Object.values(data.retryQueue || {})
        .map(entry => entry?.item)
        .filter(item => item && getChapterKey(item) && !data.history.includes(getChapterKey(item)));
    const allPending = [...retryItems, ...currentItems];
    const seen = new Set();
    const pending = allPending.filter(item => {
        const key = getChapterKey(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    const categoryCount = Object.fromEntries(DOUJIN_CATEGORIES.map(category => [
        category.key,
        latest.filter(item => item.category === category.key).length,
    ]));
    const pollingInput = [
        { id: 'sim-chapter-20', link: 'https://doujin.desu.xxx/reader/sim-chapter-20', chapter: 'Chapter 20' },
        { id: 'sim-chapter-20', link: 'https://doujin.desu.xxx/reader/sim-chapter-20', chapter: 'Chapter 20' },
        { id: 'sim-chapter-21', link: 'https://doujin.desu.xxx/reader/sim-chapter-21', chapter: 'Chapter 21' },
    ];
    const pollingOutput = simulasikanPollingChapter(pollingInput);
    const report = {
        source: DOUJIN_STATE_SOURCE,
        fetchedAt: new Date().toISOString(),
        latestCount: latest.length,
        uniqueCount: new Set(latest.map(getChapterKey)).size,
        duplicateCount: latest.length - new Set(latest.map(getChapterKey)).size,
        categoryCount,
        enabledGroupCount: enabledGroups.length,
        pendingCount: pending.length,
        payloadRules: {
            sendsDocument: false,
            sendsChapterPages: false,
            sendsCategoryThumbnail: true,
            includesChapterLink: true,
        },
        pollingSimulation: {
            input: pollingInput.map(item => item.chapter),
            output: pollingOutput.map(item => item.chapter),
            duplicateSuppressed: pollingInput.length - pollingOutput.length,
            passed: pollingOutput.map(item => item.chapter).join('|') === 'Chapter 20|Chapter 21',
        },
        pending: pending.slice(0, 20).map(item => ({
            key: getChapterKey(item),
            id: item.id,
            title: item.title,
            chapter: item.chapter,
            category: item.categoryLabel,
            thumbnailUrl: item.coverUrl || null,
            chapterLink: item.link || null,
            targetGroupCount: enabledGroups.filter(jid =>
                getDoujinGroupCategories(loadConfig().doujinnotif?.groups?.[jid]).includes(item.category)
            ).length,
        })),
    };

    // Validasi opsional hanya membaca metadata dan cover thumbnail. Tidak ada
    // sendMessage, tidak mengubah config, history, atau delivery state.
    if (validasi) {
        const sample = pending[0] || latest[0];
        if (sample) {
            const detail = await enrichDoujinItem(sample);
            const cover = await downloadDoujinImage(
                detail.coverUrl,
                `${detail.title} thumbnail ${detail.categoryLabel}`
            );
            const caption = buatCaptionDoujin(detail, {
                isTest: true,
                thumbnailReady: Boolean(cover?.jpgBuffer),
            });
            report.validation = {
                key: getChapterKey(detail),
                title: detail.title,
                category: detail.categoryLabel,
                categoryValid: DOUJIN_CATEGORIES.some(category => category.label === detail.categoryLabel),
                metadataRealtime: Boolean(detail.coverUrl && detail.mangaSlug),
                thumbnailUrl: detail.coverUrl,
                thumbnailBytes: cover.jpgBuffer.length,
                thumbnailReady: Boolean(cover.jpgBuffer.length),
                chapterLink: detail.link,
                thumbnailClickUrl: detail.link,
                clickableThumbnail: true,
                captionHasCategory: caption.includes(detail.categoryLabel),
                captionHasChapter: caption.includes(detail.chapter),
                captionHasChapterLink: caption.includes(detail.link),
                captionLinkVisibleAtTop: caption.indexOf(detail.link) >= 0 &&
                    caption.indexOf(detail.link) < 300,
                sendsWhatsApp: false,
            };
        } else {
            report.validation = { message: 'Tidak ada chapter untuk divalidasi' };
        }
    }
    return report;
}

async function runDoujinTest({ hisoka, m, tolak }) {
    await tolak(hisoka, m, '⏳ Sedang menyiapkan preview Doujindesu lengkap...');
    try {
        const latest = await scrapeLatest();
        if (!latest.length) {
            await tolak(hisoka, m, '❌ Tidak ada manga terbaru yang ditemukan saat tes.');
            return;
        }

        const item = latest[0];
        const enrichedItem = await enrichDoujinItem(item);
        await tolak(
            hisoka,
            m,
            `✅ Ditemukan chapter terbaru:\n\nJudul: ${enrichedItem.title}\nKategori: ${enrichedItem.categoryLabel}\nChapter: ${enrichedItem.chapter}\nLink: ${enrichedItem.link}\n\n⏳ Thumbnail kategori dan informasi lengkap sedang divalidasi...`
        );

        const cover = await downloadDoujinImage(
            enrichedItem.coverUrl,
            `${enrichedItem.title} thumbnail ${enrichedItem.categoryLabel}`
        );
        const caption = buatCaptionDoujin(enrichedItem, {
            isTest: true,
            thumbnailReady: Boolean(cover?.jpgBuffer),
        });
        const checks = [
            ['kategori', caption.includes(enrichedItem.categoryLabel)],
            ['chapter', caption.includes(enrichedItem.chapter)],
            ['link chapter', caption.includes(enrichedItem.link)],
            ['link di bagian atas', caption.indexOf(enrichedItem.link) >= 0 &&
                caption.indexOf(enrichedItem.link) < 300],
            ['thumbnail', Boolean(cover?.jpgBuffer?.length)],
            ['format informasi', caption.includes('Link chapter realtime:')],
        ];
        const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
        if (failed.length) {
            await tolak(
                hisoka,
                m,
                `❌ Test gagal: ${failed.join(', ')}. Preview tidak dikirim.`
            );
            return;
        }

        // Command test memang menampilkan satu preview nyata agar admin bisa
        // melihat thumbnail dan caption final. Ini tidak mengubah history,
        // delivery state, retry queue, dan bukan kiriman scheduler otomatis.
        await hisoka.sendMessage(m.from, {
            image: cover.jpgBuffer,
            mimetype: 'image/jpeg',
            caption,
            contextInfo: buatKonteksLinkChapter(enrichedItem, cover.jpgBuffer),
        });
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
               `│ otomatis masuk sebagai gambar thumbnail.\n│\n` +
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
                ? `│ Notif chapter baru akan masuk\n│ sebagai gambar thumbnail.\n`
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
                ? `│ Berhasil diaktifkan di grup ini.\n│ Notif dikirim sebagai gambar thumbnail.\n`
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
    processNewChapters,
    simulasiDoujinNotif,
    simulasikanPollingChapter,
    normalisasiMetadata,
    buatKonteksLinkChapter,
    buatCaptionDoujin,
};
