/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 * ───────────────────────────────
 *  cekidff.cjs — Cek info player Free Fire real-time
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const sharp = require('sharp');
const QRCode = require('qrcode');

const LOOKUP_TIMEOUT_MS = 9000;
const REGION_TIMEOUT_MS = 3500;
const FREEFIREMANIA_TIMEOUT_MS = 7000;
const FREEFIREMANIA_CARD_TIMEOUT_MS = 30000;
const UID_PATTERN = /^[1-9]\d{5,14}$/;

function normalizeUid(value) {
    const uid = String(value ?? '').trim();
    return UID_PATTERN.test(uid) ? uid : null;
}

function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function escapeWhatsApp(value) {
    return String(value ?? '').replace(/([\\*_~`])/g, '\\$1');
}

function decodeHtmlEntities(value) {
    const named = {
        amp: '&',
        apos: "'",
        gt: '>',
        lt: '<',
        nbsp: ' ',
        quot: '"'
    };

    return String(value ?? '').replace(
        /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (match, entity) => {
            const lower = entity.toLowerCase();
            if (lower.startsWith('#x')) {
                return String.fromCodePoint(parseInt(lower.slice(2), 16));
            }
            if (lower.startsWith('#')) {
                return String.fromCodePoint(parseInt(lower.slice(1), 10));
            }
            return named[lower] ?? match;
        }
    );
}

function htmlText(value) {
    return cleanText(
        decodeHtmlEntities(String(value ?? '').replace(/<[^>]*>/g, ' '))
            .replace(/\s+/g, ' ')
    );
}

const STAT_LABELS_ID = {
    Matches: 'Pertandingan',
    Wins: 'Menang',
    'Win rate': 'Win rate',
    Kills: 'Kill',
    Deaths: 'Kematian',
    'K/D': 'K/D',
    Headshots: 'Headshot',
    Damage: 'Damage',
    'Most kills (match)': 'Kill terbanyak (match)',
    Knockdowns: 'Knockdown',
    Revives: 'Revive',
    'Top finishes': 'Finis teratas',
    'Distance (m)': 'Jarak (m)',
    'Survival time': 'Waktu bertahan',
    MVP: 'MVP',
    Assists: 'Assist',
    'Double kills': 'Double kill',
    'Triple kills': 'Triple kill',
    'Quad kills': 'Quad kill'
};

function formatAccountCreatedAt(value) {
    const text = htmlText(value);
    const match = text.match(
        /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?$/i
    );
    if (!match) return text || null;

    const month = match[1];
    const day = match[2];
    const year = match[3];
    const time = match[4] ? `, ${match[4]}` : '';
    return `${day} ${month} ${year}${time}`;
}

function extractFullStats(html) {
    const stats = [];
    const cardPattern = /<div class=["']perfil-stats-card["'][^>]*>[\s\S]*?<h3[^>]*class=["']perfil-stats-mode["'][^>]*>([^<]+)<\/h3>[\s\S]*?<div class=["']perfil-stats-grid["'][^>]*>([\s\S]*?)(?=<\/div>\s*<\/div>\s*(?:<div class=["']perfil-stats-card["']|<\/div>\s*<div><button))/gi;
    const itemPattern = /<div class=["']perfil-stats-item["'][^>]*>[\s\S]*?<span[^>]*class=["']perfil-stats-label["'][^>]*>([^<]+)<\/span>\s*<span[^>]*class=["']perfil-stats-value["'][^>]*>([^<]+)<\/span>\s*<\/div>/gi;

    for (const cardMatch of html.matchAll(cardPattern)) {
        const mode = htmlText(cardMatch[1]);
        const items = [];
        for (const itemMatch of cardMatch[2].matchAll(itemPattern)) {
            const label = htmlText(itemMatch[1]);
            items.push({
                label,
                labelId: STAT_LABELS_ID[label] || label,
                value: htmlText(itemMatch[2])
            });
        }
        if (mode && items.length) stats.push({ mode, items });
    }

    return stats;
}

function xmlEscape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function extractImageUrl(html, className) {
    const match = html.match(
        new RegExp(`<img[^>]+class=["'][^"']*${className}[^"']*["'][^>]+src=["']([^"']+)`, 'i')
    );
    return decodeHtmlEntities(match?.[1] || '') || null;
}

function extractCardData(html, uid) {
    const avatarUrl = extractImageUrl(html, 'avatar');
    const bannerUrl = extractImageUrl(html, 'banner-fundo');
    const rankMatch = html.match(
        /<div class=["']perfil-patente-card["'][\s\S]*?<img[^>]+class=["']perfil-patente-img["'][^>]+src=["']([^"']+)["'][^>]+alt=["']([^"']*)["'][\s\S]*?<span class=["']perfil-patente-pts["']>([^<]*)</i
    );
    const likesMatch = html.match(
        /class=["'][^"']*perfil-chip-likes[^"']*["'][^>]*>\s*♥\s*([^<]+)/i
    );
    const createdMatch =
        html.match(
            /<strong>\s*Akun dibuat pada\s*<\/strong>\s*<span>([^<]+)<\/span>/i
        ) ||
        html.match(
            /<strong>\s*Account created on\s*<\/strong>\s*<span>([^<]+)<\/span>/i
        );
    const stats = [...html.matchAll(
        /<div class=["']ffc-stat["']>\s*<span class=["']ffc-stat-num["']>([^<]+)<\/span>\s*<span class=["']ffc-stat-lbl["']>([^<]+)<\/span>/gi
    )].slice(0, 3).map(match => ({
        value: htmlText(match[1]),
        label: htmlText(match[2])
    }));
    const equipment = [...html.matchAll(
        /<div class=["']ffc-eq["']>\s*<img[^>]+alt=["']([^"']*)["'][^>]*>\s*<span>([^<]+)<\/span>/gi
    )].slice(0, 2).map(match => ({
        name: htmlText(match[1] || match[2])
    }));

    return {
        profileUrl: `https://www.freefiremania.com.br/profile/${encodeURIComponent(uid)}.html`,
        avatarUrl,
        bannerUrl,
        rankUrl: decodeHtmlEntities(rankMatch?.[1] || '') || null,
        rankName: htmlText(rankMatch?.[2]) || null,
        rankPoints: htmlText(rankMatch?.[3]) || null,
        likes: htmlText(likesMatch?.[1]) || null,
        createdAt: formatAccountCreatedAt(createdMatch?.[1]),
        stats,
        fullStats: extractFullStats(html),
        equipment
    };
}

function normalizeProfile(raw, requestedUid, source) {
    if (!raw || typeof raw !== 'object') return null;

    const account = raw.AccountInfo || raw.accountInfo || raw.account || raw;
    const nickname = cleanText(
        raw.nickname ||
        raw.name ||
        raw.username ||
        account.AccountName ||
        account.nickname ||
        account.name
    );
    const returnedUid = String(
        raw.player_id ||
        raw.playerId ||
        raw.uid ||
        raw.id ||
        account.AccountID ||
        account.accountId ||
        requestedUid
    ).trim();

    // The old endpoint returns success=true and echoes any input, including
    // "abc" and "0". A player is only verified when a real nickname exists.
    if (!nickname || returnedUid !== requestedUid) return null;

    return {
        uid: requestedUid,
        nickname,
        region: cleanText(raw.region || raw.Region || account.AccountRegion) || null,
        level: raw.level ?? account.AccountLevel ?? null,
        isBanned: typeof raw.is_banned === 'boolean' ? raw.is_banned : null,
        source
    };
}

async function requestJson(url, params, timeout = LOOKUP_TIMEOUT_MS) {
    const response = await axios.get(url, {
        params,
        timeout,
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'WilyBot/27 (Free Fire UID lookup)'
        },
        validateStatus: () => true
    });

    if (response.status < 200 || response.status >= 300) {
        const error = new Error(`HTTP ${response.status}`);
        error.code = 'HTTP_ERROR';
        error.status = response.status;
        throw error;
    }

    return response.data;
}

async function requestHtml(url, timeout = LOOKUP_TIMEOUT_MS) {
    const response = await axios.get(url, {
        timeout,
        headers: {
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
            'Referer': 'https://www.freefiremania.com.br/cek-id-ff.html',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
        },
        validateStatus: () => true,
        responseType: 'text'
    });

    if (response.status < 200 || response.status >= 300) {
        const error = new Error(`FreeFireMania HTTP ${response.status}`);
        error.code = 'HTTP_ERROR';
        error.status = response.status;
        throw error;
    }

    return response.data;
}

async function requestImageData(url) {
    if (!url) return null;

    const parsed = new URL(url, 'https://www.freefiremania.com.br');
    const allowedHosts = new Set([
        'www.freefiremania.com.br',
        'dl.dir.freefiremobile.com'
    ]);
    if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
        return null;
    }

    const response = await axios.get(parsed.href, {
        timeout: FREEFIREMANIA_TIMEOUT_MS,
        responseType: 'arraybuffer',
        headers: {
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': 'https://www.freefiremania.com.br/',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
        },
        validateStatus: () => true
    });

    if (response.status < 200 || response.status >= 300) return null;
    return Buffer.from(response.data);
}

async function imageDataUri(url) {
    try {
        const buffer = await requestImageData(url);
        if (!buffer) return null;
        const png = await sharp(buffer).png().toBuffer();
        return `data:image/png;base64,${png.toString('base64')}`;
    } catch {
        return null;
    }
}

function svgImage(uri, x, y, width, height, radius = 0) {
    if (!uri) {
        return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="#17233d"/>`;
    }

    const clipId = `clip-${x}-${y}`;
    return `
        <clipPath id="${clipId}">
            <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>
        </clipPath>
        <image href="${uri}" x="${x}" y="${y}" width="${width}" height="${height}"
            preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
}

async function buildFreeFireCard(profile) {
    if (profile?.source !== 'freefiremania' || !profile.card) return null;

    const card = profile.card;
    const [avatar, banner, rank] = await Promise.all([
        imageDataUri(card.avatarUrl),
        imageDataUri(card.bannerUrl),
        imageDataUri(card.rankUrl)
    ]);
    const qr = await QRCode.toDataURL(card.profileUrl, {
        width: 180,
        margin: 1,
        color: { dark: '#10203b', light: '#ffffff' }
    });

    const nicknameSize = Math.max(
        24,
        Math.min(50, Math.floor(760 / Math.max(profile.nickname.length, 1) * 1.8))
    );
    const stats = card.stats.length
        ? card.stats
        : [{ value: '-', label: 'K/D' }, { value: '-', label: 'Win rate' }, { value: '-', label: 'Kill' }];
    const equipment = card.equipment.length
        ? card.equipment
        : [{ name: 'Profil Free Fire' }, { name: 'Realtime' }];
    const statBlocks = stats.map((stat, index) => {
        const x = 58 + index * 267;
        return `
            <rect x="${x}" y="730" width="240" height="110" rx="18" fill="#172642" stroke="#2c4269"/>
            <text x="${x + 120}" y="778" text-anchor="middle" fill="#f8c85c" font-size="32" font-weight="700">${xmlEscape(stat.value)}</text>
            <text x="${x + 120}" y="813" text-anchor="middle" fill="#b8c6dc" font-size="18">${xmlEscape(stat.label)}</text>`;
    }).join('');
    const equipmentBlocks = equipment.map((item, index) => {
        const x = 58 + index * 400;
        return `
            <rect x="${x}" y="875" width="365" height="66" rx="16" fill="#172642"/>
            <text x="${x + 182}" y="916" text-anchor="middle" fill="#e7eefb" font-size="20">${xmlEscape(item.name)}</text>`;
    }).join('');

    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1160" viewBox="0 0 900 1160">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1224"/>
          <stop offset="55%" stop-color="#132442"/>
          <stop offset="100%" stop-color="#271b3d"/>
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#f8c85c"/>
          <stop offset="100%" stop-color="#f58b55"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1160" rx="38" fill="url(#bg)"/>
      <rect x="26" y="26" width="848" height="1108" rx="28" fill="none" stroke="#385377" stroke-width="2"/>
      <text x="58" y="84" fill="#f8c85c" font-size="22" font-weight="700" letter-spacing="4">FREE FIRE PROFILE</text>
      <text x="842" y="84" text-anchor="end" fill="#a9bad5" font-size="18">REALTIME</text>
      ${svgImage(banner, 58, 124, 190, 190, 28)}
      ${svgImage(avatar, 80, 146, 146, 146, 22)}
      <circle cx="225" cy="292" r="28" fill="url(#accent)" stroke="#0b1224" stroke-width="6"/>
      <text x="225" y="301" text-anchor="middle" fill="#111a2c" font-size="18" font-weight="700">${xmlEscape(profile.level ?? '-')}</text>
      <text x="282" y="178" fill="#f4f7ff" font-size="${nicknameSize}" font-weight="700">${xmlEscape(profile.nickname)}</text>
      <text x="282" y="220" fill="#b8c6dc" font-size="24">UID ${xmlEscape(profile.uid)}</text>
      <rect x="282" y="246" width="116" height="42" rx="21" fill="#203a61"/>
      <text x="340" y="274" text-anchor="middle" fill="#f8c85c" font-size="22" font-weight="700">${xmlEscape(profile.region || '-')}</text>
      <text x="58" y="365" fill="#8398b8" font-size="18">REGION</text>
      <text x="58" y="402" fill="#f4f7ff" font-size="28" font-weight="700">${xmlEscape(profile.region || 'Tidak tersedia')}</text>
      <text x="300" y="365" fill="#8398b8" font-size="18">LEVEL</text>
      <text x="300" y="402" fill="#f4f7ff" font-size="28" font-weight="700">${xmlEscape(profile.level ?? '-')}</text>
      <text x="520" y="365" fill="#8398b8" font-size="18">LIKES</text>
      <text x="520" y="402" fill="#f4f7ff" font-size="28" font-weight="700">${xmlEscape(card.likes || '-')}</text>
      <rect x="58" y="440" width="784" height="2" fill="url(#accent)"/>
      <text x="58" y="490" fill="#8398b8" font-size="18">ACCOUNT CREATED</text>
      <text x="58" y="528" fill="#f4f7ff" font-size="25">${xmlEscape(card.createdAt || 'Tidak tersedia')}</text>
      ${rank ? `${svgImage(rank, 58, 566, 92, 92, 16)}
        <text x="178" y="604" fill="#f4f7ff" font-size="26" font-weight="700">${xmlEscape(card.rankName || 'Rank')}</text>
        <text x="178" y="640" fill="#b8c6dc" font-size="20">${xmlEscape(card.rankPoints || '')}</text>` : ''}
      <text x="58" y="694" fill="#f8c85c" font-size="20" font-weight="700" letter-spacing="2">BATTLE STATS</text>
      ${statBlocks}
      <text x="58" y="860" fill="#f8c85c" font-size="20" font-weight="700" letter-spacing="2">EQUIPMENT</text>
      ${equipmentBlocks}
      <rect x="58" y="984" width="180" height="120" rx="12" fill="#fff"/>
      <image href="${qr}" x="68" y="994" width="100" height="100"/>
      <text x="270" y="1022" fill="#b8c6dc" font-size="18">PROFILE SOURCE</text>
      <text x="270" y="1058" fill="#f4f7ff" font-size="24" font-weight="700">FreeFireMania</text>
      <text x="270" y="1092" fill="#8398b8" font-size="17">Scan QR untuk membuka profil UID</text>
      <text x="842" y="1110" text-anchor="end" fill="#687fa5" font-size="16">freefiremania.com.br</text>
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

function parseFreeFireManiaProfile(html, requestedUid) {
    if (
        typeof html !== 'string' ||
        !html ||
        /<title>\s*Attention Required!/i.test(html) ||
        /You are unable to access freefiremania\.com\.br/i.test(html)
    ) {
        return null;
    }

    const uidMatch = html.match(
        /class=["'][^"']*perfil-api-id[^"']*["'][^>]*>\s*UID:\s*(\d+)/i
    );
    const nicknameMatch = html.match(
        /<h2[^>]*id=["']perfil-jogador-title["'][^>]*>([\s\S]*?)<\/h2>/i
    );
    const regionMatch =
        html.match(
            /<span[^>]*class=["'][^"']*perfil-chip[^"']*["'][^>]*>\s*Region:\s*([^<]+)</i
        ) ||
        html.match(
            /<strong>\s*Region\s*<\/strong>\s*<span[^>]*>\s*([^<]+)\s*<\/span>/i
        ) ||
        html.match(/meta\s+name=["']description["'][^>]*content=["'][^"']*region\s+([a-z]+)/i);
    const levelMatch =
        html.match(/<div[^>]*class=["']level["'][^>]*>\s*(\d+)/i) ||
        html.match(/meta\s+name=["']description["'][^>]*content=["'][^"']*level\s+(\d+)/i);

    const returnedUid = cleanText(uidMatch?.[1]);
    const nickname = htmlText(nicknameMatch?.[1]);
    const region = htmlText(regionMatch?.[1]).toUpperCase() || null;
    const level = levelMatch?.[1] ? Number(levelMatch[1]) : null;

    if (!returnedUid || returnedUid !== requestedUid || !nickname) return null;

    return {
        uid: requestedUid,
        nickname,
        region,
        level: Number.isFinite(level) ? level : null,
        isBanned: null,
        card: extractCardData(html, requestedUid)
    };
}

async function lookupFreeFireMania(uid) {
    // The public checker POST is protected by Cloudflare Turnstile. The
    // resulting public profile page is readable with a browser-like request
    // and includes the UID, nickname, region, and level.
    const html = await requestHtml(
        `https://www.freefiremania.com.br/profile/${encodeURIComponent(uid)}.html`,
        FREEFIREMANIA_TIMEOUT_MS
    );
    return parseFreeFireManiaProfile(html, uid);
}

async function lookupFreeFirePlayer(uid) {
    const errors = [];

    try {
        const freeFireMania = await lookupFreeFireMania(uid);
        if (freeFireMania) {
            return { ...freeFireMania, source: 'freefiremania' };
        }
    } catch (error) {
        errors.push(error);
    }

    try {
        const primary = normalizeProfile(
            await requestJson('https://api.isan.eu.org/nickname/ff', { id: uid }),
            uid,
            'isan'
        );

        if (primary) {
            if (primary.region) return primary;

            // Isan verifies the nickname but omits region. Ask the profile
            // provider only for realtime region enrichment, with a short cap
            // so a slow provider does not delay a valid nickname response.
            try {
                const regionProfile = normalizeProfile(
                    await requestJson(
                        'https://api2.nftoken.info/checkbanned',
                        { id: uid },
                        REGION_TIMEOUT_MS
                    ),
                    uid,
                    'nftoken'
                );

                if (regionProfile?.region) {
                    return {
                        ...primary,
                        region: regionProfile.region,
                        level: regionProfile.level ?? primary.level,
                        isBanned: regionProfile.isBanned ?? primary.isBanned,
                        source: 'isan+nftoken'
                    };
                }
            } catch (error) {
                errors.push(error);
            }

            return primary;
        }
    } catch (error) {
        errors.push(error);
    }

    // If the nickname provider is unavailable, use the profile provider as a
    // full fallback. It must still return both a matching UID and nickname.
    try {
        const fallback = normalizeProfile(
            await requestJson('https://api2.nftoken.info/checkbanned', { id: uid }),
            uid,
            'nftoken'
        );

        if (fallback) return fallback;
    } catch (error) {
        errors.push(error);
    }

    const error = new Error(errors.length
        ? 'Layanan lookup tidak tersedia.'
        : 'UID tidak ditemukan.');
    error.code = errors.length ? 'LOOKUP_UNAVAILABLE' : 'PLAYER_NOT_FOUND';
    throw error;
}

function buildCekidffProgress(uid, status, step) {
    return `*CEK ID FREE FIRE*

*UID:* \`${uid}\`
*Status:* _${status}_

1. *Validasi UID* ✅
2. *Buka profil resmi* ${step >= 2 ? '✅' : '⏳'}
3. *Baca statistik realtime* ${step >= 3 ? '✅' : '⏳'}
4. *Siapkan kartu profil* ${step >= 4 ? '✅' : '⏳'}

• Data diambil langsung dari FreeFireMania
• Semua statistik dikirim di caption gambar

> _Mohon tunggu, bot sedang memproses._`;
}

function buildCekidffCaption(profile) {
    const card = profile.card || {};
    const lines = [
        '*FF PLAYER INFO*',
        '_Profil dan statistik diambil realtime dari halaman resmi._',
        '',
        '*Identitas pemain*',
        `1. *Nick:* \`${escapeWhatsApp(profile.nickname)}\``,
        `2. *UID:* \`${profile.uid}\``,
        '3. *Game:* `Garena Free Fire`',
        `4. *Region:* \`${escapeWhatsApp(profile.region || 'Tidak tersedia')}\``,
        profile.level != null
            ? `5. *Level:* \`${profile.level}\``
            : '5. *Level:* _Tidak tersedia_',
        card.createdAt
            ? `6. *Akun dibuat pada:* \`${escapeWhatsApp(card.createdAt)}\``
            : '6. *Akun dibuat pada:* _Tidak tersedia_',
        card.likes
            ? `7. *Likes:* \`${escapeWhatsApp(card.likes)}\``
            : null,
        '',
        '*Statistik realtime*'
    ].filter(line => line !== null);

    for (const modeStats of card.fullStats || []) {
        lines.push('', `*${escapeWhatsApp(modeStats.mode)}*`);
        for (const item of modeStats.items) {
            lines.push(`• *${escapeWhatsApp(item.labelId)}:* \`${escapeWhatsApp(item.value)}\``);
        }
    }

    lines.push(
        '',
        '*Sumber data:* `FreeFireMania`',
        '> _Angka statistik dibaca saat perintah dijalankan._'
    );

    return lines.join('\n');
}

async function handleCekidff({ hisoka, m, query, tolak }) {
    const rawQuery = String(query ?? '').trim();
    const uid = normalizeUid(rawQuery);

    if (!uid || /\s/.test(rawQuery)) {
        await tolak(
            hisoka,
            m,
            '❌ *Format UID tidak valid.*\n\n' +
            '• UID harus berupa angka 6–15 digit.\n' +
            '• Contoh: `.cekidff 83532152`'
        );
        return;
    }

    let loadingMsg = null;
    let progressTimer = null;
    let editInFlight = false;

    const editProgress = async text => {
        if (!loadingMsg?.key || editInFlight) return;
        editInFlight = true;
        try {
            await hisoka.sendMessage(m.from, { text, edit: loadingMsg.key });
        } catch {}
        finally {
            editInFlight = false;
        }
    };

    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        loadingMsg = await hisoka.sendMessage(
            m.from,
            { text: buildCekidffProgress(uid, 'Membuka profil resmi...', 2) },
            { quoted: m }
        ).catch(() => null);

        let frame = 0;
        const progressSteps = [
            ['Membaca identitas akun realtime...', 3],
            ['Membaca statistik Solo, Duo, Squad, dan Clash Squad...', 3],
            ['Menyiapkan kartu profil...', 4]
        ];
        progressTimer = setInterval(() => {
            const [status, step] = progressSteps[frame++ % progressSteps.length];
            editProgress(buildCekidffProgress(uid, status, step)).catch(() => {});
        }, 2200);

        const profile = await lookupFreeFirePlayer(uid);
        const cardBuffer = profile.source === 'freefiremania'
            ? await buildFreeFireCard(profile)
            : null;
        clearInterval(progressTimer);
        progressTimer = null;
        await editProgress(buildCekidffProgress(uid, 'Data realtime siap dikirim.', 4));

        const caption = buildCekidffCaption(profile);
        if (cardBuffer) {
            await hisoka.sendMessage(
                m.from,
                { image: cardBuffer, caption },
                { quoted: m }
            );
        } else {
            await hisoka.sendMessage(m.from, { text: caption }, { quoted: m });
        }
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        if (progressTimer) clearInterval(progressTimer);
        console.error('[CEKIDFF] Error:', e.code || e.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        const message = e.code === 'PLAYER_NOT_FOUND'
            ? '❌ *UID tidak ditemukan.*\n> _Profil resmi tidak cocok dengan UID yang diminta._'
            : '❌ *Layanan Free Fire sedang tidak tersedia.*\n> _Coba ulangi beberapa saat lagi._';
        if (loadingMsg?.key) {
            await editProgress(message);
        } else {
            await tolak(hisoka, m, message);
        }
    }
}

module.exports = {
    handleCekidff,
    lookupFreeFirePlayer,
    normalizeUid,
    buildFreeFireCard,
    buildCekidffCaption,
    buildCekidffProgress
};
