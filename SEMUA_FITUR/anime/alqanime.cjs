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
 *  alqanime.cjs — Scraper AlqAnime
 *  Cari & info anime dari alqanime.org, mendukung pencarian
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  AlqAnime Scraper
 *  Cari & ambil info anime terbaru dari alqanime.net —
 *  mendukung pencarian judul, daftar episode, dan link download
 *  Sub Indo. Dipakai oleh alqanime-cmd.cjs & alqanime-dl.cjs.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const axios = require('axios');

const BASE    = 'https://alqanime.net';
const JINA    = 'https://r.jina.ai';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
};

async function fetchMarkdown(url) {
    const res = await axios.get(`${JINA}/${url}`, {
        headers: HEADERS,
        timeout: 30000,
    });
    return res.data;
}

function parseAnimeCards(md) {
    const results = [];
    const seen = new Set();
    const regex = /!\[Image \d+: ([^\]]+)\]\((https:\/\/alqanime\.net\/wp-content[^)]+)\)[^\[\n]*## ([^\]]+)\]\((https:\/\/alqanime\.net\/[^/"]+\/)[^\)\n]*\)/g;
    let m;
    while ((m = regex.exec(md)) !== null) {
        const url  = m[4];
        if (url.includes('wp-content') || url.includes('?') || seen.has(url)) continue;
        seen.add(url);
        const title     = m[3].trim();
        const thumbnail = m[2];
        const altText   = m[1];
        const scoreM    = altText.match(/([\d.]+)$/);
        const score     = scoreM ? scoreM[1] : '';
        const typeM     = altText.match(/^(Completed|Ongoing)/i);
        const status    = typeM ? typeM[1] : '';
        results.push({ title, thumbnail, url, score, status });
    }
    return results;
}

function parseDownloadLinks(md) {
    const episodes = [];
    const dlSection = md.match(/## Download [^\n]+\n([\s\S]*?)(?:### Series Terkait|### Komentar|### Rekomendasi|$)/);
    if (!dlSection) return episodes;

    const dlContent = dlSection[1];
    const epBlocks  = dlContent.split(/(?=### Episode )/);

    for (const block of epBlocks) {
        const epMatch = block.match(/### Episode\s+([^\n]+)/);
        if (!epMatch) continue;

        const epLabel = epMatch[1].trim();
        const links   = {};

        // Parse per-resolution links: 360p[Host](url)[Host2](url2)
        const resRegex = /(360p|480p|720p|1080p)/gi;
        const lines    = block.split('\n').filter(l => /360p|480p|720p|1080p/i.test(l));

        for (const line of lines) {
            const resM = line.match(/^(360p|480p|720p|1080p)/i);
            if (!resM) continue;
            const res   = resM[1].toLowerCase();
            const hosts = [];
            const lRe   = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
            let lm;
            while ((lm = lRe.exec(line)) !== null) {
                hosts.push({ host: lm[1], url: lm[2] });
            }
            if (hosts.length) links[res] = hosts;
        }

        // Batch link (episode sebelumnya)
        const batchM = block.match(/360p.*1080p\[([^\]]+)\]\((https?:\/\/[^)]+)\)/);
        if (batchM) links['batch'] = [{ host: batchM[1], url: batchM[2] }];

        if (Object.keys(links).length) {
            episodes.push({ episode: epLabel, links });
        }
    }

    return episodes;
}

function parseDetail(md) {
    const titleM  = md.match(/^# ([^\n]+)/m);
    const title   = titleM ? titleM[1].replace(/ - Alqanime$/, '').trim() : '';

    // Poster 200x300 (bukan logo header)
    const thumbM  = md.match(/!\[Image \d+[^\]]*\]\((https:\/\/alqanime\.net\/wp-content\/uploads\/[^)]*-200x300[^)]*)\)/);
    // Fallback ke gambar besar pertama jika tidak ada 200x300
    const thumbFB = md.match(/!\[Image \d+[^\]]*\]\((https:\/\/alqanime\.net\/wp-content\/uploads\/(?!.*Header)[^)]+\.(?:jpg|png|webp))\)/);
    const thumbnail = thumbM ? thumbM[1] : (thumbFB ? thumbFB[1] : '');

    const info = {};
    for (const field of [
        'Status','Studio','Dirilis','Durasi','Musim','Tipe','Episode',
        'Subtitle','Credit','Score',
        'Casts','Diposting oleh','Diposting pada','Diperbarui pada',
    ]) {
        const re  = new RegExp(`\\*\\*${field.replace(/ /g,'\\s+')}:\\*\\*\\s*([^\\*\\n]+)`);
        const hit = md.match(re);
        if (hit) {
            info[field] = hit[1].trim()
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/^_+|_+$/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }
    }
    const scoreM = md.match(/Score\s+([\d.]+)/);
    if (scoreM && !info.Score) info.Score = scoreM[1];

    // Judul alternatif (English / Kanji) — baris kosong sebelum **Status:**
    const altM = md.match(/\n\n([^\n#*!\[<\\]{3,})\n\n\*\*Status:/);
    if (altM) info.judulAlt = altM[1].trim();

    // Ambil sinopsis — hanya paragraf pertama sebelum baris notice/emoji
    const synM    = md.match(/## Sinopsis[^\n]*\n\n([^#]+)/);
    let sinopsis = '';
    if (synM) {
        const raw = synM[1].trim();
        // Potong di baris yang ada icon notice (✴, !, gambar)
        const cutIdx = raw.search(/\n\s*(?:✴|!|#+\s)/);
        sinopsis = (cutIdx > 0 ? raw.slice(0, cutIdx) : raw)
            .replace(/\r\n/g, '\n')           // normalkan CRLF
            .replace(/\n{3,}/g, '\n\n')        // 3+ newline → 2 (satu baris kosong)
            .replace(/([^\n])\n([^\n])/g, '$1 $2') // newline tunggal dalam paragraf → spasi
            .trim();
    }

    // Ambil genre hanya dari konten post, sebelum sidebar genre list
    const postContent = md.split(/### Sukai Kami|### Rekomendasi|### Komentar/)[0];
    const genres = [];
    const genRe  = /\[([^\]]+)\]\(https:\/\/alqanime\.net\/tag\/[^)]+\)/g;
    let gm;
    while ((gm = genRe.exec(postContent)) !== null) {
        if (!genres.includes(gm[1])) genres.push(gm[1]);
    }

    const episodes = parseDownloadLinks(md);

    return { title, thumbnail, info, sinopsis, genres, episodes };
}

async function searchAlqanime(query) {
    const md = await fetchMarkdown(`${BASE}/?s=${encodeURIComponent(query)}`);
    return parseAnimeCards(md);
}

async function getDetailAlqanime(urlOrSlug) {
    const url = urlOrSlug.startsWith('http') ? urlOrSlug : `${BASE}/${urlOrSlug}/`;
    const md  = await fetchMarkdown(url);
    return parseDetail(md);
}

async function getLatestAlqanime() {
    const md = await fetchMarkdown(BASE);
    return parseAnimeCards(md);
}

async function getRilisanTerbaru() {
    const md = await fetchMarkdown(BASE);
    const sectionM = md.match(/###\s*Rilisan Terbaru\s*\n([\s\S]*?)(?=###\s|\n##\s|$)/i);
    if (!sectionM) return parseAnimeCards(md);
    return parseAnimeCards(sectionM[1]);
}

// Fetch homepage 1x, parse semua section sekaligus — tidak ada request ganda
async function getHomepageData() {
    const md = await fetchMarkdown(BASE);

    const _parseSection = (pattern) => {
        const m = md.match(pattern);
        return m ? parseAnimeCards(m[1]) : [];
    };

    const lagiHangat     = _parseSection(/###\s*Lagi\s*Hangat\s*(?:Saat\s*Ini)?\s*\n([\s\S]*?)(?=###\s|\n##\s|$)/i);
    const rilisanTerbaru = _parseSection(/###\s*Rilisan\s*Terbaru\s*\n([\s\S]*?)(?=###\s|\n##\s|$)/i);
    const semua          = parseAnimeCards(md);

    return { lagiHangat, rilisanTerbaru, semua };
}

module.exports = { searchAlqanime, getDetailAlqanime, getLatestAlqanime, getRilisanTerbaru, getHomepageData };

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleAlq({ hisoka, m, query, tolak, logCommand, logError, path, pendingAlqDlChoices, getJadibotChoiceKey }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                /* .alqanime (dengan atau tanpa query) → selalu tampilkan rilisan terbaru realtime */
                /* .alq [judul] → untuk pencarian spesifik */
                const isAlqanimeCmd = (m.command || '').toLowerCase() === 'alqanime';

                if (!input || isAlqanimeCmd) {
                        await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
                        const { getRilisanTerbaru } = module.exports;
                        const latest = await getRilisanTerbaru();
                        if (!latest.length) {
                                await tolak(hisoka, m, `❌ Gagal ambil rilisan terbaru. Coba lagi.`);
                                return;
                        }
                        let latestText = `🎌 *Rilisan Terbaru — Alqanime*\n━━━━━━━━━━━━━━━━━━━\n`;
                        latest.slice(0, 15).forEach((a, i) => { latestText += `${i + 1}. ${a.title}\n`; });
                        latestText += `━━━━━━━━━━━━━━━━━━━\n🌐 alqanime.net\n\n`;
                        latestText += `📌 *Cari anime spesifik:* ${pfx}alq <judul>`;
                        await tolak(hisoka, m, latestText);
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        logCommand(m, hisoka, 'alqanime');
                        return;
                }

                const { searchAlqanime, getDetailAlqanime } = module.exports;

                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

                const results = await searchAlqanime(input);
                if (!results.length) { await tolak(hisoka, m, `❌ Tidak ada hasil untuk *${input}*.\nCoba kata kunci lain.`); return; }

                const detail = await getDetailAlqanime(results[0].url);
                const info   = detail.info || {};
                const eps    = detail.episodes || [];
                const latestEp = eps[0];

                let text = `🎌 *${detail.title}*\n━━━━━━━━━━━━━━━━━━━\n`;
                if (info.Status)  text += `📌 Status   : ${info.Status}\n`;
                if (info.Tipe)    text += `🎬 Tipe     : ${info.Tipe}\n`;
                if (info.Studio)  text += `🏢 Studio   : ${info.Studio}\n`;
                if (info.Dirilis) text += `📅 Dirilis  : ${info.Dirilis}\n`;
                if (info.Durasi)  text += `⏱ Durasi   : ${info.Durasi}\n`;
                if (info.Episode) text += `📺 Episode  : ${info.Episode}\n`;
                if (info.Score)   text += `⭐ Score    : ${info.Score}\n`;
                if (detail.genres?.length) text += `🏷 Genre    : ${detail.genres.join(', ')}\n`;
                if (detail.sinopsis) {
                        text += `━━━━━━━━━━━━━━━━━━━\n📖 *Sinopsis:*\n${detail.sinopsis.slice(0, 300)}${detail.sinopsis.length > 300 ? '...' : ''}\n`;
                }
                if (latestEp) {
                        text += `━━━━━━━━━━━━━━━━━━━\n📥 *Download Episode ${latestEp.episode}:*\n`;
                        for (const [res, hosts] of Object.entries(latestEp.links)) {
                                const hostList = hosts.map(h => `[${h.host}](${h.url})`).join(' | ');
                                text += `• *${res.toUpperCase()}* : ${hostList}\n`;
                        }
                        if (eps.length > 1) text += `\n_...dan ${eps.length - 1} episode lainnya_\n`;
                }
                text += `━━━━━━━━━━━━━━━━━━━\n🌐 ${results[0].url}`;

                if (detail.thumbnail) {
                        /* Download gambar — butuh Referer + UA untuk bypass hotlink alqanime.net */
                        const thumbBuf = await axios.get(detail.thumbnail, {
                                headers: {
                                        ...HEADERS,
                                        'Referer': 'https://alqanime.net/',
                                        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                                },
                                responseType: 'arraybuffer',
                                timeout: 15000,
                        }).then(r => {
                                console.log('[ALQANIME] Thumbnail OK:', detail.thumbnail, 'size:', r.data.byteLength);
                                return Buffer.from(r.data);
                        }).catch(e => {
                                console.warn('[ALQANIME] Thumbnail gagal:', e?.message);
                                return null;
                        });

                        if (thumbBuf) {
                                await hisoka.sendMessage(m.from, { image: thumbBuf, caption: text }, { quoted: m });
                        } else {
                                await tolak(hisoka, m, text);
                        }
                } else {
                        await tolak(hisoka, m, text);
                }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                if (eps.length > 0) {
                        const allRes = new Set();
                        for (const ep of eps) for (const r of Object.keys(ep.links)) if (r !== 'batch') allRes.add(r);
                        const resList = ['360p','480p','720p','1080p'].filter(r => allRes.has(r));
                        let dlMenu = `📥 *PILIH EPISODE & RESOLUSI*\n━━━━━━━━━━━━━━━━━━━\n🎌 *${detail.title}*\n\n*Daftar Episode (${eps.length}):*\n`;
                        const maxShow = Math.min(eps.length, 15);
                        eps.slice(0, maxShow).forEach((ep, i) => {
                                const epRes = Object.keys(ep.links).filter(r => r !== 'batch');
                                dlMenu += `${i + 1}. Ep ${ep.episode}`;
                                if (epRes.length) dlMenu += ` _(${epRes.join('/')})_`;
                                dlMenu += `\n`;
                        });
                        if (eps.length > maxShow) dlMenu += `_...dan ${eps.length - maxShow} episode lainnya_\n`;
                        dlMenu += `\n`;
                        if (resList.length) dlMenu += `📺 Resolusi: *${resList.join(' | ')}*\n`;
                        dlMenu += `\n━━━━━━━━━━━━━━━━━━━\n📌 *Reply pesan ini:*\n• *1 720p* — 1 episode, kirim video\n• *1-3 480p* — batch ep 1-3 (ZIP)\n• *1,3,5 360p* — ep pilihan (ZIP)\n• *all 360p* — semua episode (ZIP)\n• Tanpa resolusi = otomatis terbaik\n\n⏳ Menu berlaku *5 menit*`;

                        const menuMsg = await hisoka.sendMessage(m.from, { text: dlMenu }, { quoted: m });
                        const alqKey  = getJadibotChoiceKey(m);
                        const oldAlq  = pendingAlqDlChoices.get(alqKey);
                        if (oldAlq?.timeout) clearTimeout(oldAlq.timeout);
                        const alqTimeout = setTimeout(() => pendingAlqDlChoices.delete(alqKey), 5 * 60 * 1000);
                        pendingAlqDlChoices.set(alqKey, {
                                animeTitle: detail.title, episodes: eps,
                                botMsgId: menuMsg?.key?.id || '',
                                expiresAt: Date.now() + 5 * 60 * 1000,
                                timeout: alqTimeout,
                        });
                }
        } catch (err) {
                console.error('[ALQANIME] Error:', err?.message);
                if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqanime');
                await tolak(hisoka, m, `❌ Gagal ambil data Alqanime.\n💬 ${err?.message?.slice(0, 120) || 'Coba lagi nanti'}`);
        }
}

module.exports.handleAlq = handleAlq;

async function handleAlqupdate({ hisoka, m, tolak, logCommand, logError, _require, path, getJadibotChoiceKey, pendingAlqUpdateChoices }) {
        try {
                const items = await getLatestAlqanime();

                if (!items.length) {
                        await tolak(hisoka, m, `❌ Gagal ambil data terbaru.`);
                        return;
                }

                await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
                await tolak(hisoka, m, `📺 Mengambil rilisan terbaru Alqanime...`);

                const showItems = items.slice(0, 15);
                let text = `🎌 *Rilisan Terbaru — Alqanime*\n`;
                text += `━━━━━━━━━━━━━━━━━━━\n`;
                showItems.forEach((a, i) => {
                        text += `${i + 1}. ${a.title}\n`;
                });
                text += `━━━━━━━━━━━━━━━━━━━\n`;
                text += `🌐 alqanime.net\n\n`;
                text += `📌 *Reply pesan ini:*\n`;
                text += `• *1* — lihat episode & pilih resolusi\n`;
                text += `• *1 720p* — langsung download ep terbaru 720p\n`;
                text += `• *batal* — batalkan\n`;
                text += `⏳ Menu berlaku *5 menit*`;

                const updMenuMsg = await hisoka.sendMessage(m.from, { text }, { quoted: m });
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                const alqUpdKey2 = getJadibotChoiceKey(m);
                const oldUpd = pendingAlqUpdateChoices.get(alqUpdKey2);
                if (oldUpd?.timeout) clearTimeout(oldUpd.timeout);
                const updTimeout = setTimeout(() => pendingAlqUpdateChoices.delete(alqUpdKey2), 5 * 60 * 1000);
                pendingAlqUpdateChoices.set(alqUpdKey2, {
                        items: showItems,
                        botMsgId: updMenuMsg?.key?.id || '',
                        expiresAt: Date.now() + 5 * 60 * 1000,
                        timeout: updTimeout,
                });

        } catch (err) {
                console.error('[ALQUPDATE] Error:', err?.message);
                logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqanimeupdate');
                await tolak(hisoka, m, `❌ Gagal ambil update Alqanime.\n💬 ${err?.message?.slice(0, 100) || 'Coba lagi nanti'}`);
        }
}

module.exports.handleAlqupdate = handleAlqupdate;
