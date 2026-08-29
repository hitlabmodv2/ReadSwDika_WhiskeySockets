const axios = require('axios');

const DOUJIN_BASE_URL = 'https://doujin.desu.xxx';
const DOUJIN_API_URL = `${DOUJIN_BASE_URL}/api`;

// Nilai ini memang dipakai oleh frontend publik DoujinDesu untuk mengakses API.
const DOUJIN_APP_SECRET = 'dfdf72051dbfdc7d76889ebd31324e74';
const DOUJIN_RESPONSE_SALT = 'doujindesu-scrapers-cannot-read-this-super-secret-salt-2026-v2';
const DOUJIN_RESPONSE_KEY_WINDOW = 60 * 60 * 1000;

const DOUJIN_CATEGORIES = [
    { key: 'manga18', type: 'manga', label: 'Manga 18' },
    { key: 'manhwa18', type: 'manhwa', label: 'Manhwa 18' },
    { key: 'doujinshi18', type: 'doujinshi', label: 'Doujinshi 18' },
];

function buatKunciRespons(hour) {
    const seed = `${DOUJIN_RESPONSE_SALT}_${hour}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }

    let key = '';
    let state = Math.abs(hash) || 123456789;
    for (let i = 0; i < 32; i++) {
        state = (state * 1664525 + 1013904223) % 4294967296;
        key += String.fromCharCode(33 + state % 93);
    }
    return key;
}

function dekripsiRespons(hexPayload, key) {
    const bytes = [];
    for (let i = 0; i < hexPayload.length; i += 2) {
        bytes.push(parseInt(hexPayload.slice(i, i + 2), 16));
    }

    const chars = [];
    let rolling = 42;
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        const keyChar = key.charCodeAt(i % key.length);
        const decoded = byte ^ keyChar ^ (i * 13) ^ rolling;
        chars.push(String.fromCharCode(decoded & 255));
        rolling = (rolling + byte) % 256;
    }

    return JSON.parse(decodeURIComponent(chars.join('')));
}

function bacaRespons(data) {
    if (!data || typeof data !== 'object' || !data._enc_resp_) return data;

    const currentHour = Math.floor(Date.now() / DOUJIN_RESPONSE_KEY_WINDOW);
    let lastError;
    for (const hour of [currentHour, currentHour - 1, currentHour + 1]) {
        try {
            return dekripsiRespons(data._enc_resp_, buatKunciRespons(hour));
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`Respons API Doujindesu gagal didekripsi: ${lastError?.message || 'kunci tidak cocok'}`);
}

function buatHeaders() {
    return {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
        'X-App-Secret': DOUJIN_APP_SECRET,
        'x-app-secret': DOUJIN_APP_SECRET,
        'x-device-id': 'wilybot-doujindesu-monitor',
        'x-device-name': 'WilyBot Node',
    };
}

async function apiGet(endpoint, params = {}) {
    const response = await axios.get(`${DOUJIN_API_URL}${endpoint}`, {
        params,
        headers: buatHeaders(),
        timeout: 20000,
        validateStatus: status => status >= 200 && status < 300,
    });
    return bacaRespons(response.data);
}

function buatLinkReader(chapterId) {
    return `${DOUJIN_BASE_URL}/reader/${chapterId}`;
}

function normalisasiChapter(chapter, manga, category) {
    if (!chapter?.id || !manga?.title) return null;

    const chapterNumber = chapter.chapter_number;
    const chapterTitle = String(chapter.title || '').trim();
    const chapterLabel = chapterTitle || (
        chapterNumber === undefined || chapterNumber === null
            ? ''
            : `Chapter ${chapterNumber}`
    );

    return {
        id: String(chapter.id),
        title: String(manga.title).trim(),
        link: buatLinkReader(chapter.id),
        chapter: chapterLabel,
        chapterNumber,
        type: category.label,
        category: category.key,
        categoryLabel: category.label,
        createdAt: chapter.created_at || manga.updated_at || manga.created_at || '',
    };
}

async function scrapeKategori(category) {
    const mangaList = await apiGet('/manga', {
        limit: 24,
        type: category.type,
        sort: 'latest_chapter',
    });
    if (!Array.isArray(mangaList)) return [];

    return mangaList
        .flatMap(manga => (Array.isArray(manga.chapters) ? manga.chapters : [])
            .map(chapter => normalisasiChapter(chapter, manga, category)))
        .filter(Boolean);
}

async function scrapeLatest() {
    const hasil = await Promise.all(
        DOUJIN_CATEGORIES.map(async category => {
            try {
                return await scrapeKategori(category);
            } catch (error) {
                console.error(`[DoujinScraper] Gagal fetch kategori ${category.label}:`, error.message);
                return [];
            }
        })
    );

    const seen = new Set();
    return hasil
        .flat()
        .filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        })
        .sort((a, b) => {
            const timeA = Date.parse(a.createdAt) || 0;
            const timeB = Date.parse(b.createdAt) || 0;
            return timeB - timeA;
        });
}

async function scrapeChapterImages(chapterUrlOrId) {
    const chapterId = String(chapterUrlOrId || '').match(
        /\/reader\/([0-9a-f-]{20,})\/?$/i
    )?.[1] || String(chapterUrlOrId || '').trim();

    if (!chapterId) return [];

    const chapter = await apiGet(`/chapters/${encodeURIComponent(chapterId)}`);
    const urls = Array.isArray(chapter?.content_urls) ? chapter.content_urls : [];
    return [...new Set(
        urls
            .map(url => String(url || '').trim())
            .filter(url => /^https?:\/\//i.test(url))
    )];
}

module.exports = {
    DOUJIN_BASE_URL,
    DOUJIN_CATEGORIES,
    scrapeLatest,
    scrapeChapterImages,
};