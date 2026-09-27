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
    const createdMatch = html.match(
        /<strong>\s*Akun dibuat pada\s*<\/strong>\s*<span>([^<]+)<\/span>/i
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
        createdAt: htmlText(createdMatch?.[1]) || null,
        stats,
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

function findChromium() {
    const candidates = [
        process.env.CHROMIUM_PATH,
        '/repl/tools/bin/chromium',
        'chromium',
        'chromium-browser',
        'google-chrome'
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (candidate.startsWith('/') && fs.existsSync(candidate)) return candidate;
        if (!candidate.startsWith('/')) {
            try {
                const resolved = require('child_process').execFileSync(
                    'which',
                    [candidate],
                    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
                ).trim();
                if (resolved) return resolved;
            } catch {}
        }
    }

    const error = new Error('Chromium tidak tersedia untuk mengunduh kartu resmi.');
    error.code = 'CARD_BROWSER_UNAVAILABLE';
    throw error;
}

function waitForDevToolsUrl(browser, timeoutMs) {
    return new Promise((resolve, reject) => {
        let output = '';
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('Chromium tidak membuka DevTools tepat waktu.'));
        }, timeoutMs);

        const onData = chunk => {
            output += chunk.toString();
            const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (!match || settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(match[1]);
        };

        browser.stdout?.on('data', onData);
        browser.stderr?.on('data', onData);
        browser.once('error', error => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(error);
        });
        browser.once('exit', (code, signal) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(new Error(`Chromium berhenti sebelum siap (${code ?? signal}).`));
        });
    });
}

async function getDevToolsTarget(browserWsUrl) {
    const endpoint = new URL(browserWsUrl);
    endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
    endpoint.pathname = '/json/list';
    endpoint.search = '';

    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        try {
            const response = await axios.get(endpoint.href, { timeout: 1000 });
            const target = response.data.find(item => item.type === 'page');
            if (target?.webSocketDebuggerUrl) return target.webSocketDebuggerUrl;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Target halaman Chromium tidak ditemukan.');
}

function createCdpClient(webSocketUrl) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(webSocketUrl);
        const pending = new Map();
        let sequence = 0;
        let closed = false;

        const failPending = error => {
            for (const { reject: rejectPending } of pending.values()) {
                rejectPending(error);
            }
            pending.clear();
        };

        socket.once('open', () => resolve({
            send(method, params = {}) {
                if (closed) return Promise.reject(new Error('Koneksi Chromium sudah ditutup.'));
                const id = ++sequence;
                return new Promise((resolveCommand, rejectCommand) => {
                    pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
                    socket.send(JSON.stringify({ id, method, params }));
                });
            },
            close() {
                closed = true;
                failPending(new Error('Koneksi Chromium ditutup.'));
                socket.close();
            }
        }));
        socket.on('message', raw => {
            const message = JSON.parse(raw.toString());
            if (!message.id || !pending.has(message.id)) return;
            const command = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) {
                command.reject(new Error(`${message.error.message} (${message.error.code})`));
            } else {
                command.resolve(message.result);
            }
        });
        socket.on('close', () => {
            closed = true;
            failPending(new Error('Koneksi Chromium tertutup.'));
        });
        socket.on('error', error => {
            if (!socket.readyState) reject(error);
            failPending(error);
        });
    });
}

async function evaluateCdp(cdp, expression) {
    const result = await cdp.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
    });
    if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text || 'Evaluasi halaman gagal.');
    }
    return result.result?.value;
}

async function waitForOfficialCardPage(cdp, uid) {
    const url = `https://www.freefiremania.com.br/profile/${encodeURIComponent(uid)}.html`;
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    await cdp.send('Network.setUserAgentOverride', {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: 'Object.defineProperty(navigator, "webdriver", { get: () => undefined });'
    });
    await cdp.send('Page.navigate', { url });

    const deadline = Date.now() + FREEFIREMANIA_CARD_TIMEOUT_MS;
    while (Date.now() < deadline) {
        const state = await evaluateCdp(
            cdp,
            `JSON.stringify({
                title: document.title,
                hasCard: !!document.getElementById('ffShareCard'),
                hasButton: !!document.getElementById('ffCardBtn'),
                nickname: document.getElementById('perfil-jogador-title')?.textContent?.trim() || '',
                uidText: document.querySelector('.perfil-api-id')?.textContent?.trim() || '',
                chips: [...document.querySelectorAll('.perfil-chip')].map(node => node.textContent.trim())
            })`
        );
        const parsed = JSON.parse(state || '{}');
        if (parsed.hasCard && parsed.hasButton) {
            const returnedUid = (parsed.uidText.match(/\d{6,15}/) || [])[0] || '';
            const region = parsed.chips
                .map(chip => chip.match(/^Region:\s*(.+)$/i)?.[1]?.trim())
                .find(Boolean) || null;
            const levelText = parsed.chips
                .map(chip => chip.match(/^Level\s+(\d+)$/i)?.[1])
                .find(Boolean);
            const profile = {
                uid: returnedUid,
                nickname: cleanText(parsed.nickname),
                region: cleanText(region),
                level: levelText ? Number(levelText) : null,
                isBanned: null,
                source: 'freefiremania'
            };

            if (profile.uid !== uid || !profile.nickname) {
                const error = new Error('Profil resmi tidak cocok dengan UID yang diminta.');
                error.code = 'PLAYER_NOT_FOUND';
                throw error;
            }
            return profile;
        }
        if (/Attention Required|Cloudflare/i.test(parsed.title || '')) {
            const error = new Error('Website resmi menampilkan verifikasi Cloudflare.');
            error.code = 'CARD_PAGE_BLOCKED';
            throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Kartu resmi tidak selesai dimuat tepat waktu.');
}

async function captureOfficialFreeFireCard(uid) {
    const chromium = findChromium();
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wily-ff-card-'));
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wily-ff-browser-'));
    const browser = spawn(chromium, [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-features=Translate,BackForwardCache',
        '--disable-blink-features=AutomationControlled',
        '--remote-allow-origins=*',
        '--remote-debugging-port=0',
        `--user-data-dir=${userDataDir}`,
        '--window-size=1200,2200',
        'about:blank'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let cdp;
    try {
        const browserWsUrl = await waitForDevToolsUrl(browser, 8000);
        const pageWsUrl = await getDevToolsTarget(browserWsUrl);
        cdp = await createCdpClient(pageWsUrl);
        await cdp.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadDir
        });
        const profile = await waitForOfficialCardPage(cdp, uid);
        await evaluateCdp(cdp, `document.getElementById('ffCardBtn').click()`);

        const deadline = Date.now() + FREEFIREMANIA_CARD_TIMEOUT_MS;
        while (Date.now() < deadline) {
            const files = fs.readdirSync(downloadDir)
                .filter(file => file.endsWith('.png'))
                .map(file => path.join(downloadDir, file));
            if (files.length) {
                return {
                    buffer: fs.readFileSync(files[0]),
                    profile
                };
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        throw new Error('Website resmi tidak menghasilkan file kartu.');
    } finally {
        cdp?.close();
        if (browser.exitCode === null && !browser.killed) {
            browser.kill('SIGTERM');
            await Promise.race([
                new Promise(resolve => browser.once('exit', resolve)),
                new Promise(resolve => setTimeout(resolve, 1500))
            ]);
        }
        if (browser.exitCode === null) {
            browser.kill('SIGKILL');
            await new Promise(resolve => browser.once('exit', resolve));
        }

        for (const temporaryDir of [downloadDir, userDataDir]) {
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    fs.rmSync(temporaryDir, { recursive: true, force: true });
                    break;
                } catch (error) {
                    if (error.code !== 'ENOTEMPTY' || attempt === 4) throw error;
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
    }
}

async function downloadOfficialFreeFireCard(uid) {
    const result = await captureOfficialFreeFireCard(uid);
    return result.buffer;
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
2. *Buka website resmi* ${step >= 2 ? '✅' : '⏳'}
3. *Ambil kartu realtime* ${step >= 3 ? '✅' : '⏳'}

• Gambar diambil dari tombol kartu resmi
• Hasil data dikirim sebagai caption

> _Mohon tunggu, bot sedang memproses._`;
}

function buildCekidffCaption(profile) {
    const lines = [
        '*FF PLAYER INFO*',
        '_Profil berhasil diverifikasi dari halaman resmi._',
        '',
        '*Identitas pemain*',
        `1. *Nick:* \`${escapeWhatsApp(profile.nickname)}\``,
        `2. *UID:* \`${profile.uid}\``,
        '3. *Game:* `Garena Free Fire`',
        `4. *Region:* \`${escapeWhatsApp(profile.region || 'Tidak tersedia')}\``,
        '',
        '*Data tambahan*',
        profile.level != null ? `• *Level:* \`${profile.level}\`` : '• *Level:* _Tidak tersedia_',
        profile.isBanned != null
            ? `• *Status:* ${profile.isBanned ? '`Banned`' : '`Aktif`'}`
            : '• *Status:* _Tidak dikembalikan halaman_',
        '• *Sumber:* `FreeFireMania`',
        '',
        '*Metode gambar:* ~Dibuat oleh bot~ → *Diambil dari website resmi*',
        '',
        '> _Kartu diambil saat perintah dijalankan dan data ditaruh di caption._'
    ];

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
            { text: buildCekidffProgress(uid, 'Menyiapkan proses realtime...', 1) },
            { quoted: m }
        ).catch(() => null);

        let frame = 0;
        const progressSteps = [
            ['Membuka halaman profil resmi...', 2],
            ['Membaca data pemain dari website...', 2],
            ['Mengambil kartu resmi dengan tombol Download card...', 3]
        ];
        progressTimer = setInterval(() => {
            const [status, step] = progressSteps[frame++ % progressSteps.length];
            editProgress(buildCekidffProgress(uid, status, step)).catch(() => {});
        }, 2200);

        const { profile, buffer: cardBuffer } = await captureOfficialFreeFireCard(uid);
        clearInterval(progressTimer);
        progressTimer = null;
        await editProgress(buildCekidffProgress(uid, 'Kartu resmi siap dikirim.', 3));

        await hisoka.sendMessage(
            m.from,
            { image: cardBuffer, caption: buildCekidffCaption(profile) },
            { quoted: m }
        );
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        if (progressTimer) clearInterval(progressTimer);
        console.error('[CEKIDFF] Error:', e.code || e.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        const message = e.code === 'PLAYER_NOT_FOUND'
            ? '❌ *UID tidak ditemukan.*\n> _Profil resmi tidak cocok dengan UID yang diminta._'
            : e.code === 'CARD_PAGE_BLOCKED'
                ? '❌ *Website resmi meminta verifikasi.*\n> _Kartu belum bisa diambil, coba lagi nanti._'
                : e.code === 'CARD_BROWSER_UNAVAILABLE'
                    ? '❌ *Browser kartu resmi tidak tersedia di server.*'
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
    downloadOfficialFreeFireCard
};
