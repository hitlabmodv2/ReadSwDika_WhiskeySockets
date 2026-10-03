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
 *  tempmail.cjs — Temporary email command
 *  Perintah .tempmail untuk buat email sementara dan cek inbox secara real-time
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Temporary Email Command (.tempmail)
 *  Buat email sementara sekali pakai dan pantau inbox secara
 *  real-time langsung dari WhatsApp — berguna untuk registrasi
 *  website tanpa pakai email pribadi.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const AUTO_VERIFY_ALLOWED_DOMAINS = new Set(['replit.com']);
const VERIFICATION_URL_PATTERN = /(?:action-code|verify(?:email|account)?|verification|confirm(?:ation)?|activate|activation|oobcode)/i;
const BLOCKED_ACTION_PATTERN = /(?:authModal=signup|\b(?:signup|register|reset|password|unsubscribe|optout|login|signin)\b)/i;

const inspectAutoVerifyUrl = (rawUrl, context = '') => {
        let url;
        try {
                url = new URL(String(rawUrl || '').trim());
        } catch (_) {
                return { ok: false, reason: 'URL tidak valid.' };
        }
        if (url.protocol !== 'https:') {
                return { ok: false, reason: 'hanya HTTPS yang diizinkan.' };
        }
        const hostname = url.hostname.toLowerCase();
        const allowed = [...AUTO_VERIFY_ALLOWED_DOMAINS]
                .some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
        if (!allowed) {
                return { ok: false, reason: `domain ${hostname} tidak ada di allowlist.` };
        }
        const urlText = `${url.pathname} ${url.search} ${url.hash}`;
        if (BLOCKED_ACTION_PATTERN.test(urlText)) {
                return { ok: false, reason: 'URL signup/reset/login atau aksi berisiko ditolak.' };
        }
        if (!VERIFICATION_URL_PATTERN.test(urlText)) {
                return { ok: false, reason: 'URL bukan pola verifikasi.' };
        }
        return { ok: true, url };
};

const safeAutoVerifyUrl = (url) => {
        if (!url) return '-';
        const keys = [...new Set([...url.searchParams.keys()])];
        return `${url.origin}${url.pathname}` +
                (keys.length ? `?keys=${keys.join(',')}` : '');
};

const decodeAutoLink = (value) => String(value || '')
        // Jangan decode semua pola =HH; query normal seperti =ABC123
        // bukan quoted-printable dan akan rusak jika dipaksa decode.
        .replace(/=3D/gi, '=')
        .replace(/=3F/gi, '?')
        .replace(/=26/gi, '&')
        .replace(/=2F/gi, '/')
        .replace(/=22/gi, '"')
        .replace(/=20/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");

const collectAutoLinks = (msg = {}) => {
        const raw = [];
        if (Array.isArray(msg.links)) raw.push(...msg.links);
        const source = `${msg.bodyHtml || ''}\n${msg.bodyText || ''}`;
        const urlPattern = /https?:\/\/[^\s<>"')]+/gi;
        let match;
        while ((match = urlPattern.exec(source)) !== null) raw.push({ url: match[0], text: '' });
        const out = [];
        const seen = new Set();
        for (const entry of raw) {
                const value = typeof entry === 'string' ? entry : entry && (entry.url || entry.href || entry.link);
                if (!value) continue;
                const url = decodeAutoLink(value).replace(/[.,;:!?)]+$/, '');
                if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
                seen.add(url);
                out.push({
                        url,
                        text: typeof entry === 'string' ? '' : String(entry.text || entry.label || entry.title || ''),
                });
        }
        return out;
};

const autoVerifyUrl = async (rawUrl, opts = {}) => {
        const inspect = inspectAutoVerifyUrl(rawUrl, opts.context || '');
        if (!inspect.ok) return { status: 'skipped', reason: inspect.reason };

        const fetchImpl = opts.fetchImpl || globalThis.fetch;
        if (typeof fetchImpl !== 'function') {
                return { status: 'failed', reason: 'HTTP client tidak tersedia.' };
        }

        let current = inspect.url;
        const maxRedirects = Math.max(0, Math.min(3, Number(opts.maxRedirects || 3)));
        for (let hop = 0; hop <= maxRedirects; hop++) {
                let response;
                try {
                        response = await fetchImpl(current.href, {
                                method: 'GET',
                                redirect: 'manual',
                                headers: {
                                        'user-agent': 'WilyBot-TempMail-AutoVerify/1.0',
                                        accept: 'text/html,application/xhtml+xml',
                                },
                                signal: AbortSignal.timeout(15000),
                        });
                } catch (err) {
                        return {
                                status: 'failed',
                                reason: err.message,
                                url: safeAutoVerifyUrl(current),
                        };
                }

                if (response.status >= 300 && response.status < 400) {
                        const location = response.headers && typeof response.headers.get === 'function'
                                ? response.headers.get('location')
                                : null;
                        if (!location) {
                                return {
                                        status: 'failed',
                                        reason: `redirect ${response.status} tanpa lokasi tujuan.`,
                                        url: safeAutoVerifyUrl(current),
                                };
                        }
                        const next = inspectAutoVerifyUrl(new URL(location, current).href, opts.context || '');
                        if (!next.ok) return { status: 'skipped', reason: `redirect ditolak: ${next.reason}` };
                        current = next.url;
                        continue;
                }

                return {
                        status: response.ok ? 'verified' : 'failed',
                        statusCode: response.status,
                        reason: response.ok ? 'HTTP berhasil.' : `HTTP ${response.status}.`,
                        url: safeAutoVerifyUrl(current),
                };
        }
        return { status: 'failed', reason: 'redirect terlalu banyak.', url: safeAutoVerifyUrl(current) };
};

/**
 * handleTempmail
 * Handler untuk command: tempmail, tmail, tminbox, tmread, tmwait, tmdel
 */
async function handleTempmail({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
        const Tmail = _require(path.resolve('./SEMUA_FITUR/tools/tmail.cjs'));
        const fs = _require('fs');
        const TMAIL_DB = path.resolve('./data/tmail/db.json');
        if (!global.__tmailSessions) global.__tmailSessions = new Map();
        const sessions = global.__tmailSessions;
        if (!global.__tmailWatchers) global.__tmailWatchers = new Map();
        const watchers = global.__tmailWatchers;
        const userId = m.sender || m.from;
        const pfx = m.prefix || '.';
        const input = (query || '').trim();

        const loadDB = () => {
                try {
                        if (!fs.existsSync(path.dirname(TMAIL_DB))) fs.mkdirSync(path.dirname(TMAIL_DB), { recursive: true });
                        if (!fs.existsSync(TMAIL_DB)) return {};
                        return JSON.parse(fs.readFileSync(TMAIL_DB, 'utf8') || '{}');
                } catch (_) { return {}; }
        };
        const saveDB = (db) => {
                try {
                        if (!fs.existsSync(path.dirname(TMAIL_DB))) fs.mkdirSync(path.dirname(TMAIL_DB), { recursive: true });
                        fs.writeFileSync(TMAIL_DB, JSON.stringify(db, null, 2));
                } catch (_) {}
        };
        const persistSess = (s) => {
                if (!s || !s.mailbox || typeof s.serialize !== 'function') return;
                const db = loadDB();
                db[userId] = s.serialize();
                saveDB(db);
        };
        const stopWatcher = () => {
                const watcher = watchers.get(userId);
                if (!watcher) return;
                watcher.stopped = true;
                if (watcher.timer) clearTimeout(watcher.timer);
                watchers.delete(userId);
        };
        const removeSess = () => {
                stopWatcher();
                const db = loadDB();
                if (db[userId]) { delete db[userId]; saveDB(db); }
                sessions.delete(userId);
        };

        const TMAIL_ARCHIVE = path.resolve('./data/tmail/archive.json');
        const ARCHIVE_MAX_PER_USER = 50;
        const loadArchive = () => {
                try {
                        if (!fs.existsSync(path.dirname(TMAIL_ARCHIVE))) fs.mkdirSync(path.dirname(TMAIL_ARCHIVE), { recursive: true });
                        if (!fs.existsSync(TMAIL_ARCHIVE)) return {};
                        return JSON.parse(fs.readFileSync(TMAIL_ARCHIVE, 'utf8') || '{}');
                } catch (_) { return {}; }
        };
        const saveArchive = (db) => {
                try {
                        if (!fs.existsSync(path.dirname(TMAIL_ARCHIVE))) fs.mkdirSync(path.dirname(TMAIL_ARCHIVE), { recursive: true });
                        fs.writeFileSync(TMAIL_ARCHIVE, JSON.stringify(db, null, 2));
                } catch (_) {}
        };
        const archiveEmail = (mailbox, msg) => {
                if (!msg || (!msg.id && !msg.subject)) return;
                const db = loadArchive();
                if (!Array.isArray(db[userId])) db[userId] = [];
                const arr = db[userId];
                const key = `${mailbox || ''}::${msg.id || msg.subject}`;
                if (arr.some((e) => `${e.mailbox || ''}::${e.id || e.subject}` === key)) return;
                arr.unshift({
                        id: msg.id || null,
                        mailbox: mailbox || null,
                        from: msg.from || null,
                        to: msg.to || null,
                        subject: msg.subject || null,
                        date: msg.date || null,
                        bodyText: msg.bodyText || null,
                        bodyHtml: msg.bodyHtml || null,
                        links: Array.isArray(msg.links) ? msg.links : [],
                        ai: msg.ai || null,
                        archivedAt: Date.now(),
                });
                if (arr.length > ARCHIVE_MAX_PER_USER) arr.length = ARCHIVE_MAX_PER_USER;
                db[userId] = arr;
                saveArchive(db);
        };
        const getArchive = () => {
                const db = loadArchive();
                return Array.isArray(db[userId]) ? db[userId] : [];
        };

        const getSess = () => {
                let s = sessions.get(userId);
                if (!s || typeof s.serialize !== 'function' || typeof s.restore !== 'function') {
                        s = new Tmail();
                        const db = loadDB();
                        if (db[userId]) s.restore(db[userId]);
                        sessions.set(userId, s);
                }
                return s;
        };

        const ensureBound = async (s) => {
                if (!s || !s.mailbox || typeof s.inbox !== 'function') return null;
                try {
                        // NovaMail mengikat mailbox lewat cookie session. Jangan
                        // memanggil /api/change setiap cek karena itu membuat email baru.
                        s.lastError = null;
                        return await s.inbox();
                } catch (err) {
                        s.lastError = err;
                        return null;
                }
        };

        const rawSub = String(m.command || '').toLowerCase();
        const sub = rawSub === 'tmailbox' ? 'tminbox' : rawSub;
        const maskId = (value) => {
                const text = String(value || '');
                if (text.length <= 10) return text || '-';
                return `${text.slice(0, 5)}…${text.slice(-5)}`;
        };
        const maskMailbox = (value) => {
                const text = String(value || '');
                const at = text.indexOf('@');
                if (at <= 0) return maskId(text);
                return `${text.slice(0, Math.min(3, at))}***${text.slice(at)}`;
        };
        const watcherLog = (level, text) => {
                const fn = console[level] || console.log;
                fn(`[TMailAuto] ${text}`);
        };
        const AUTO_WATCHER_VERSION = 3;

        const buildTmailButtons = (mailbox) => ([
                {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                                display_text: '📋 Salin Email',
                                copy_code: mailbox,
                        }),
                },
                {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                                display_text: '⏳ Tunggu Realtime',
                                id: `${pfx}tmwait`,
                        }),
                },
                {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                                display_text: '📥 Cek Inbox',
                                id: `${pfx}tminbox`,
                        }),
                },
                {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                                display_text: '🗑️ Hapus & Ganti',
                                id: `${pfx}tmdel`,
                        }),
                },
        ]);

        const sendTmailPanel = async (title, mailbox) => {
                const buttons = buildTmailButtons(mailbox);
                let sent = false;
                try {
                        await m.reply({
                                interactiveMessage: {
                                        contextInfo: {
                                                stanzaId: m.key.id,
                                                participant: m.sender,
                                                quotedMessage: m.message,
                                        },
                                        title,
                                        footer: `📨 Tempmail · ${mailbox}`,
                                        buttons,
                                },
                        });
                        sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, title);
        };

        const detectCode = (text) => {
                if (!text) return null;
                const KEYWORDS = /(?:code|kode|otp|pin|verification|verifikasi|verif|password|sandi|token)/gi;
                let match;
                while ((match = KEYWORDS.exec(text)) !== null) {
                        const after = text.slice(match.index + match[0].length, match.index + match[0].length + 60);
                        const c = after.match(/^[\s:#-]*([A-Z0-9]{4,10})/i);
                        if (c && /\d/.test(c[1])) return c[1].trim();
                }
                const digits = text.match(/(?<![A-Za-z0-9])(\d{4,8})(?![A-Za-z0-9])/);
                return digits ? digits[1] : null;
        };

        const normalizeInlineStyle = (line) => String(line || '')
                // Email/Markdown memakai pasangan ganda, WhatsApp memakai satu.
                .replace(/\*\*(?!\s)(.+?)(?<!\s)\*\*/g, '*$1*')
                .replace(/__(?!\s)(.+?)(?<!\s)__/g, '_$1_')
                .replace(/~~(?!\s)(.+?)(?<!\s)~~/g, '~$1~');

        const formatContextualBody = (body, code = null) => {
                const lines = String(body || '').replace(/\r/g, '').split('\n');
                const output = [];
                let inCodeBlock = false;
                const escapedCode = code
                        ? String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        : null;
                const codePattern = escapedCode
                        ? new RegExp(`(?<![\`A-Za-z0-9])(${escapedCode})(?![\`A-Za-z0-9])`, 'g')
                        : null;
                const styleText = (value) => {
                        const styled = normalizeInlineStyle(value);
                        return codePattern ? styled.replace(codePattern, '`$1`') : styled;
                };

                for (const rawLine of lines) {
                        const line = rawLine.trimEnd();
                        const trimmed = line.trim();
                        if (/^```/.test(trimmed)) {
                                inCodeBlock = !inCodeBlock;
                                output.push('```');
                                continue;
                        }
                        if (inCodeBlock) {
                                output.push(line);
                                continue;
                        }
                        if (!trimmed) {
                                output.push('');
                                continue;
                        }

                        const quote = trimmed.match(/^>\s?(.*)$/);
                        if (quote) {
                                output.push(`> ${styleText(quote[1])}`);
                                continue;
                        }
                        const numbered = trimmed.match(/^(?:[-•]\s*)?(\d+)[.)]\s+(.+)$/);
                        if (numbered) {
                                output.push(`${numbered[1]}. ${styleText(numbered[2])}`);
                                continue;
                        }
                        const bullet = trimmed.match(/^[-*•▪◦]\s+(.+)$/);
                        if (bullet) {
                                output.push(`• ${styleText(bullet[1])}`);
                                continue;
                        }
                        const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
                        if (heading) {
                                output.push(`*${styleText(heading[1])}*`);
                                continue;
                        }
                        if (/^(?:important|warning|peringatan|catatan penting)\s*:/i.test(trimmed)) {
                                output.push(`*${styleText(trimmed)}*`);
                                continue;
                        }
                        if (/^(?:--|regards[,!:]?|best regards[,!:]?|sincerely[,!:]?)/i.test(trimmed)) {
                                output.push(`_${styleText(trimmed)}_`);
                                continue;
                        }

                        // Baris teknis pendek dibuat monospace; URL tetap dibiarkan clickable.
                        const looksLikeCode = /^(?:const|let|var|function|class|import|export|curl|npm|node|GET\s|POST\s)/i.test(trimmed)
                                || /=>|\\n|\\r\\n/.test(trimmed);
                        output.push(looksLikeCode && trimmed.length <= 180
                                ? `\`${styleText(trimmed)}\``
                                : styleText(line));
                }

                return output.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
        };

        const formatMail = (msg, mailbox, header = '📩 *PESAN*', code = null) => {
                const body = formatContextualBody(msg.bodyText || '', code);
                const trimmed = body.length > 3500 ? body.slice(0, 3500) + '\n\n_...(dipotong)_': body;
                const links = Array.isArray(msg.links) ? msg.links.slice(0, 10) : [];
                const linkBlock = links.length
                        ? `\n\n🔗 *Link di pesan:*\n` + links.map((l, i) =>
                                `${i + 1}. ${l.url}` + (l.text ? `\n   _${normalizeInlineStyle(l.text)}_` : '')
                        ).join('\n')
                        : '';
                const otpBlock = code && !new RegExp(`\\b${String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(trimmed)
                        ? `\n\n🔑 *Kode OTP:* \`${code}\``
                        : '';
                return (
                        `${header}\n\n` +
                        `📌 *Subjek:* ${normalizeInlineStyle(msg.subject || '-')}\n` +
                        `👤 *Dari:* ${normalizeInlineStyle(msg.from || msg.from_email || '-')}\n` +
                        `📧 *Ke:* ${normalizeInlineStyle(msg.to || mailbox || '-')}\n` +
                        `🕒 *Tanggal:* ${normalizeInlineStyle(msg.date || msg.receivedAt || '-')}\n` +
                        `🆔 *ID:* \`${msg.id || '-'}\`\n` +
                        `🌐 *URL:* ${msg.url || ''}\n` +
                        `${'─'.repeat(20)}\n\n` +
                        (trimmed || '_(isi pesan kosong)_') +
                        otpBlock +
                        linkBlock
                );
        };

        const sendMailWithButtons = async (msg, mailbox, header = '📩 *PESAN*', target = m.from) => {
                const ai = msg.ai || null;
                const code = (ai && ai.code) || detectCode(msg.bodyText || msg.subject || '');
                const links = collectAutoLinks(msg);
                const primaryUrl = ai && ai.primaryUrl;
                const primaryLabel = (ai && ai.primaryLabel) || 'Verifikasi';
                const aiSummary = (ai && ai.summary) || '';

                let teks = formatMail(msg, mailbox, header, code);
                if (aiSummary) teks += `\n\n🤖 *Ringkasan AI:* ${aiSummary}`;
                if (msg.autoVerification) {
                        if (msg.autoVerification.status === 'verified') {
                                teks += '\n\n✅ *Auto-verifikasi:* link verifikasi berhasil dibuka.';
                        } else if (msg.autoVerification.status === 'failed') {
                                teks += `\n\n⚠️ *Auto-verifikasi gagal:* ${msg.autoVerification.reason || 'provider menolak permintaan.'}`;
                        } else if (msg.autoVerification.status === 'code_detected') {
                                teks += `\n\n🔑 *Kode terdeteksi:* \`${msg.autoVerification.code}\`` +
                                        '\n⚠️ *Status:* kode sudah dikirim ke private, tetapi belum dimasukkan otomatis ke form situs.';
                        } else if (msg.autoVerification.status === 'skipped' && msg.autoVerification.candidate) {
                                teks += `\n\n⏭️ *Auto-verifikasi dilewati:* ${msg.autoVerification.reason}`;
                        }
                }

                const buttons = [];

                const isJunk = (u, t) => /unsubscribe|opt-?out|preferences|notification-settings|manage|update.?profile/i.test(u + ' ' + (t || ''));
                const isVerifyLike = (u, t) => {
                        const value = `${u || ''} ${t || ''}`;
                        return VERIFICATION_URL_PATTERN.test(value) && !BLOCKED_ACTION_PATTERN.test(String(u || ''));
                };

                let verifyUrl = null;
                let verifyLabel = 'Verifikasi';
                if (primaryUrl && isVerifyLike(primaryUrl, primaryLabel)) {
                        verifyUrl = primaryUrl;
                        verifyLabel = String(primaryLabel || 'Verifikasi').trim() || 'Verifikasi';
                } else {
                        const candidate = links.find((l) => l.url && !isJunk(l.url, l.text) && isVerifyLike(l.url, l.text))
                                || links.find((l) => l.url && !isJunk(l.url, l.text)
                                        && !BLOCKED_ACTION_PATTERN.test(String(l.url)));
                        if (candidate) {
                                verifyUrl = candidate.url;
                                verifyLabel = 'Verifikasi';
                        }
                }

                if (verifyUrl) {
                        buttons.push({
                                name: 'cta_copy',
                                buttonParamsJson: JSON.stringify({
                                        display_text: '📋 Salin Link',
                                        copy_code: verifyUrl,
                                }),
                        });
                        buttons.push({
                                name: 'cta_url',
                                buttonParamsJson: JSON.stringify({
                                        display_text: `✅ ${verifyLabel.slice(0, 20)}`,
                                        url: verifyUrl,
                                        merchant_url: verifyUrl,
                                }),
                        });
                } else if (code) {
                        buttons.push({
                                name: 'cta_copy',
                                buttonParamsJson: JSON.stringify({
                                        display_text: `🔑 Salin Kode: ${code}`,
                                        copy_code: code,
                                }),
                        });
                }

                try { archiveEmail(mailbox, msg); } catch (_) {}

                if (!buttons.length) {
                        if (target === m.from) await tolak(hisoka, m, teks);
                        else await hisoka.sendMessage(target, { text: teks });
                        return;
                }

                try {
                        const interactiveMessage = {
                                title: teks,
                                footer: `📨 Tempmail · ${mailbox || ''}`,
                                buttons,
                        };
                        if (target === m.from) {
                                interactiveMessage.contextInfo = {
                                        stanzaId: m.key.id,
                                        participant: m.sender,
                                        quotedMessage: m.message,
                                };
                        }
                        await hisoka.sendMessage(target, { interactiveMessage });
                } catch (err) {
                        const fallback = teks + (code ? `\n\n🔑 *Kode:* \`${code}\`` : '');
                        if (target === m.from) await tolak(hisoka, m, fallback);
                        else await hisoka.sendMessage(target, { text: fallback });
                }
        };

        const autoVerifyMessage = async (msg, watcher) => {
                const links = collectAutoLinks(msg);
                const candidates = [];
                if (msg.ai && msg.ai.primaryUrl) {
                        candidates.push({ url: msg.ai.primaryUrl, text: msg.ai.primaryLabel || '' });
                }
                for (const link of links) {
                        if (link && link.url) candidates.push(link);
                }

                const context = String(msg.subject || '');
                for (const candidate of candidates) {
                        const inspected = inspectAutoVerifyUrl(candidate.url, `${context} ${candidate.text || ''}`);
                        const safeUrl = (() => {
                                try { return safeAutoVerifyUrl(new URL(candidate.url)); } catch (_) { return '-'; }
                        })();
                        if (!inspected.ok) {
                                watcherLog('log',
                                        `VERIFY_SKIP user=${maskId(userId)} url=${safeUrl} reason=${inspected.reason}`
                                );
                                continue;
                        }
                        if (watcher.autoVerifiedLinks.has(inspected.url.href)) {
                                return { status: 'skipped', reason: 'link sudah pernah diproses.', candidate: true };
                        }
                        watcher.autoVerifiedLinks.add(inspected.url.href);
                        const result = await autoVerifyUrl(inspected.url.href, {
                                context,
                        });
                        watcherLog(result.status === 'verified' ? 'log' : 'warn',
                                `VERIFY_${result.status.toUpperCase()} user=${maskId(userId)} url=${result.url || safeUrl}` +
                                (result.reason ? ` reason=${result.reason}` : '')
                        );
                        return { ...result, candidate: true };
                }
                const code = detectCode(`${msg.subject || ''}\n${msg.bodyText || ''}`);
                if (code) {
                        watcherLog('log',
                                `CODE_DETECTED user=${maskId(userId)} code=${code}`
                        );
                        return {
                                status: 'code_detected',
                                code,
                                reason: 'kode terdeteksi; belum ada form tujuan untuk pengisian otomatis.',
                                candidate: true,
                        };
                }
                return { status: 'skipped', reason: 'tidak ada link verifikasi replit.com yang diizinkan.', candidate: false };
        };

        const startAutoWatcher = (s) => {
                if (!s || !s.mailbox || typeof s.inbox !== 'function') return;
                const existing = watchers.get(userId);
                if (existing && existing.s === s && !existing.stopped
                        && existing.version === AUTO_WATCHER_VERSION) return;
                stopWatcher();

                const watcher = {
                        s,
                        version: AUTO_WATCHER_VERSION,
                        stopped: false,
                        timer: null,
                        busy: false,
                        initialized: false,
                        pollCount: 0,
                        errorCount: 0,
                        autoVerifiedLinks: new Set(),
                };
                watchers.set(userId, watcher);
                watcherLog('log',
                        `START user=${maskId(userId)} mailbox=${maskMailbox(s.mailbox)} target=PRIVATE`
                );

                const poll = async () => {
                        if (watcher.stopped || watchers.get(userId) !== watcher) return;
                        if (watcher.busy) {
                                watcher.timer = setTimeout(poll, 5000);
                                return;
                        }
                        watcher.busy = true;
                        try {
                                const data = await s.inbox();
                                persistSess(s);
                                watcher.pollCount++;
                                const messages = Array.isArray(data.messages) ? data.messages : [];
                                if (!watcher.initialized) {
                                        for (const item of messages) {
                                                if (item.id) s.lastSeenIds.add(String(item.id));
                                        }
                                        watcher.initialized = true;
                                        watcherLog('log',
                                                `READY user=${maskId(userId)} mailbox=${maskMailbox(s.mailbox)} baseline=${messages.length}`
                                        );
                                } else {
                                        const fresh = messages.filter((item) =>
                                                item.id && !s.lastSeenIds.has(String(item.id))
                                        );
                                        for (const item of messages) {
                                                if (item.id) s.lastSeenIds.add(String(item.id));
                                        }
                                        if (fresh.length) {
                                                watcherLog('log',
                                                        `NEW user=${maskId(userId)} mailbox=${maskMailbox(s.mailbox)} count=${fresh.length} target=PRIVATE`
                                                );
                                        } else if (watcher.pollCount % 12 === 0) {
                                                watcherLog('log',
                                                        `HEARTBEAT user=${maskId(userId)} mailbox=${maskMailbox(s.mailbox)} inbox=${messages.length}`
                                                );
                                        }
                                        for (const item of fresh) {
                                                let detail = {};
                                                try {
                                                        detail = await s.view(item.id, { analyze: false });
                                                } catch (err) {
                                                        watcherLog('warn',
                                                                `VIEW_FAIL user=${maskId(userId)} id=${maskId(item.id)} error=${err.message}`
                                                        );
                                                }
                                                let autoVerification;
                                                try {
                                                        autoVerification = await autoVerifyMessage(
                                                                { ...item, ...detail },
                                                                watcher
                                                        );
                                                } catch (err) {
                                                        autoVerification = {
                                                                status: 'failed',
                                                                reason: err.message,
                                                                candidate: true,
                                                        };
                                                        watcherLog('error',
                                                                `VERIFY_FAILED user=${maskId(userId)} id=${maskId(item.id)} error=${err.message}`
                                                        );
                                                }
                                                try {
                                                        await sendMailWithButtons(
                                                                { ...item, ...detail, autoVerification },
                                                                s.mailbox,
                                                                '🔔 *EMAIL BARU OTOMATIS*',
                                                                userId
                                                        );
                                                        watcherLog('log',
                                                                `DELIVERED user=${maskId(userId)} id=${maskId(item.id)} target=PRIVATE`
                                                        );
                                                } catch (err) {
                                                        watcherLog('error',
                                                                `DELIVERY_FAIL user=${maskId(userId)} id=${maskId(item.id)} error=${err.message}`
                                                        );
                                                }
                                        }
                                }
                        } catch (err) {
                                // Error sementara dicatat agar polling berikutnya tetap jalan.
                                watcher.lastError = err;
                                watcher.errorCount++;
                                if (watcher.errorCount === 1 || watcher.errorCount % 12 === 0) {
                                        watcherLog('warn',
                                                `POLL_FAIL user=${maskId(userId)} mailbox=${maskMailbox(s.mailbox)} error=${err.message}`
                                        );
                                }
                        } finally {
                                watcher.busy = false;
                                if (!watcher.stopped && watchers.get(userId) === watcher) {
                                        watcher.timer = setTimeout(poll, 5000);
                                }
                        }
                };
                poll().catch((err) => { watcher.lastError = err; });
        };

        if (sub === 'tmdel') {
                await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
                const old = (loadDB()[userId] || {}).mailbox || '-';
                removeSess();
                const s = new Tmail();
                sessions.set(userId, s);
                const info = await s.delete();
                persistSess(s);

                const teks =
                        `╭─「 🗑️ *EMAIL DIGANTI* 」\n` +
                        `│\n` +
                        `│ 📤 *Lama:* ${old}\n` +
                        `│ ✉️ *Baru:* ${info.mailbox}\n` +
                        `│ 📥 *Inbox:* ${(info.messages || []).length} pesan\n` +
                        `│ 💾 *Status:* Tersimpan baru\n` +
                        `│\n` +
                        `│ Email baru udah tersimpan, gak bakal\n` +
                        `│ ganti lagi sampai kamu *${pfx}tmdel*.\n` +
                        `│\n` +
                        `│ Perintah:\n` +
                        `│ • ${pfx}tminbox — cek inbox\n` +
                        `│ • ${pfx}tmread <id> — baca pesan\n` +
                        `│ • ${pfx}tmwait — tunggu email baru (realtime)\n` +
                        `│ • ${pfx}tmdel — hapus & ganti email baru\n` +
                        `╰────────────────────`;

                await sendTmailPanel(teks, info.mailbox);
                startAutoWatcher(s);
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'tmdel');
                return;
        }

        if (sub === 'tempmail' || sub === 'tmail') {
                await hisoka.sendMessage(m.from, { react: { text: '📨', key: m.key } });
                const s = getSess();
                let info;
                let reused = false;
                if (input) {
                        const [rawName, rawDomain] = input.split('@');
                        const name = (rawName || '').trim();
                        const domain = (rawDomain || '').trim() || Tmail.DEFAULT_DOMAINS[0];
                        if (!name) {
                                await tolak(hisoka, m, `❌ Nama email kosong.\nContoh: *${pfx}tempmail wilytest@random*`);
                                return;
                        }
                        if (!Tmail.DEFAULT_DOMAINS.includes(domain)) {
                                await tolak(hisoka, m,
                                        `❌ NovaMail hanya menyediakan pemilihan domain acak.\n\n` +
                                        `Domain yang didukung:\n• ` + Tmail.DEFAULT_DOMAINS.join('\n• ')
                                );
                                return;
                        }
                        info = await s.change(name, domain);
                        persistSess(s);
                } else if (s.mailbox) {
                        const savedMailbox = s.mailbox;
                        info = await ensureBound(s);
                        if (!info && s.lastError) {
                                await tolak(hisoka, m,
                                        `❌ *NovaMail sedang bermasalah*\n\n` +
                                        `${s.lastError.message}\n\n` +
                                        `_Coba ulangi beberapa saat lagi._`
                                );
                                return;
                        }
                        if (!info) info = { mailbox: savedMailbox, messages: [] };
                        if (!info.mailbox) info.mailbox = savedMailbox;
                        reused = true;
                        persistSess(s);
                } else {
                        info = await s.create();
                        persistSess(s);
                }
                const teks =
                        `╭─「 📨 *TEMPMAIL NOVAMAIL* 」\n` +
                        `│\n` +
                        `│ ✉️ *Email:* ${info.mailbox}\n` +
                        `│ 📥 *Inbox:* ${(info.messages || []).length} pesan\n` +
                        `│ 💾 *Status:* ${reused ? 'Dipakai ulang (tersimpan)' : 'Tersimpan baru'}\n` +
                        `│\n` +
                        `│ Perintah:\n` +
                        `│ • ${pfx}tminbox — cek inbox\n` +
                        `│ • ${pfx}tmread <id> — baca pesan\n` +
                        `│ • ${pfx}tmwait — tunggu email baru (realtime)\n` +
                        `│ • ${pfx}tmdel — hapus & ganti email baru\n` +
                        `│ • 🔔 Email baru otomatis dikirim ke private kamu\n` +
                        `│ • ${pfx}tempmail nama@random — custom nama (domain acak)\n` +
                        `│\n` +
                        `│ 🌐 Domain tersedia:\n│ • ` + Tmail.DEFAULT_DOMAINS.join('\n│ • ') + `\n` +
                        `╰────────────────────`;

                await sendTmailPanel(teks, info.mailbox);
                startAutoWatcher(s);
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'tempmail');
                return;
        }

        if (sub === 'tminbox') {
                const s = getSess();
                if (!s.mailbox) {
                        await tolak(hisoka, m, `⚠️ Belum punya email.\nKetik *${pfx}tempmail* dulu untuk bikin email.`);
                        return;
                }
                await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });
                const savedMb = s.mailbox;
                let data = await ensureBound(s);
                if (!data && s.lastError) {
                        await tolak(hisoka, m,
                                `❌ *NovaMail sedang bermasalah*\n\n` +
                                `${s.lastError.message}\n\n` +
                                `_Coba ulangi beberapa saat lagi atau gunakan ${pfx}tmwait._`
                        );
                        return;
                }
                if (!data) data = { mailbox: savedMb, messages: [] };
                if (!data.mailbox) data.mailbox = savedMb;
                persistSess(s);
                startAutoWatcher(s);
                const list = data.messages || [];
                const archive = getArchive();

                if (!list.length) {
                        if (archive.length) {
                                await tolak(hisoka, m,
                                        `📭 *Inbox live kosong*, tapi ada *${archive.length}* email arsip.\n` +
                                        `✉️ ${data.mailbox}\n\n` +
                                        `_Menampilkan riwayat dari arsip permanen..._`
                                );
                                for (let i = 0; i < archive.length; i++) {
                                        const it = archive[i];
                                        const header = `🗂️ *ARSIP ${i + 1}/${archive.length}*` +
                                                (it.mailbox && it.mailbox !== data.mailbox ? ` _(dari ${it.mailbox})_` : '');
                                        await sendMailWithButtons(it, it.mailbox || data.mailbox, header);
                                }
                                await hisoka.sendMessage(m.from, { react: { text: '🗂️', key: m.key } });
                                logCommand(m, hisoka, 'tminbox');
                                return;
                        }

                        const teks =
                                `╭─「 📭 *INBOX KOSONG* 」\n` +
                                `│\n` +
                                `│ ✉️ Mailbox: ${data.mailbox}\n` +
                                `│ 📥 Total pesan: *0*\n` +
                                `│ 🗂️ Arsip permanen: *0*\n` +
                                `│\n` +
                                `│ Belum ada email masuk. Coba:\n` +
                                `│ • ${pfx}tmwait — tunggu realtime (default 120s)\n` +
                                `│ • ${pfx}tmwait 300 — kasih waktu lebih (max 600s)\n` +
                                `│ • ${pfx}tmdel — ganti email baru\n` +
                                `╰────────────────────`;
                        await sendTmailPanel(teks, data.mailbox);
                        await hisoka.sendMessage(m.from, { react: { text: '📭', key: m.key } });
                        return;
                }
                await tolak(hisoka, m,
                        `📥 *INBOX (${list.length} pesan live${archive.length ? `, ${archive.length} di arsip` : ''})*\n` +
                        `✉️ ${data.mailbox}\n\n` +
                        `_Mengambil isi lengkap setiap pesan..._`
                );
                const liveIds = new Set();
                for (let i = 0; i < list.length; i++) {
                        const it = list[i];
                        let detail;
                        try { detail = await s.view(it.id); } catch (_) { detail = {}; }
                        const merged = { ...it, ...detail };
                        if (merged.id) liveIds.add(`${data.mailbox}::${merged.id}`);
                        await sendMailWithButtons(merged, data.mailbox, `📩 *PESAN ${i + 1}/${list.length}*`);
                }
                const oldArchive = archive.filter((e) => !liveIds.has(`${e.mailbox || ''}::${e.id || ''}`)
                        && e.mailbox !== data.mailbox);
                if (oldArchive.length) {
                        await tolak(hisoka, m,
                                `🗂️ *Arsip riwayat (${oldArchive.length} pesan dari email sebelumnya)*\n` +
                                `_Email ini tetap tersimpan walau kamu sudah .tmdel._`
                        );
                        for (let i = 0; i < oldArchive.length; i++) {
                                const it = oldArchive[i];
                                await sendMailWithButtons(it, it.mailbox || '-',
                                        `🗂️ *ARSIP ${i + 1}/${oldArchive.length}* _(${it.mailbox || '-'})_`);
                        }
                }
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'tminbox');
                return;
        }

        if (sub === 'tmread') {
                if (!input) {
                        await tolak(hisoka, m, `❌ Sertakan ID pesan.\nContoh: *${pfx}tmread 12345*`);
                        logCommand(m, hisoka, m.command || 'tmread');
                        return;
                }
                const s = getSess();
                if (!s.mailbox) await s.create();
                startAutoWatcher(s);
                await hisoka.sendMessage(m.from, { react: { text: '📖', key: m.key } });
                const msg = await s.view(input);
                await sendMailWithButtons(msg, s.mailbox, '📖 *PESAN LENGKAP*');
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'tmread');
                return;
        }

        if (sub === 'tmwait') {
                const s = getSess();
                if (!s.mailbox) {
                        await tolak(hisoka, m,
                                `⚠️ Kamu belum punya email.\n\n` +
                                `Ketik *${pfx}tempmail* dulu untuk bikin email kamu sendiri, ` +
                                `baru pakai *${pfx}tmwait*.\n\n` +
                                `_Tiap nomor WA punya email tempmail sendiri-sendiri._`
                        );
                        return;
                }
                const data = await ensureBound(s);
                if (!data && s.lastError) {
                        await tolak(hisoka, m,
                                `❌ *NovaMail sedang bermasalah*\n\n` +
                                `${s.lastError.message}\n\n` +
                                `_Pemantauan otomatis akan mencoba lagi setelah provider normal._`
                        );
                        return;
                }
                persistSess(s);
                startAutoWatcher(s);
                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                await tolak(hisoka, m,
                        `🔔 *PEMANTAU EMAIL OTOMATIS AKTIF*\n\n` +
                        `✉️ ${s.mailbox}\n` +
                        `🔄 Polling tiap 5 detik\n\n` +
                        `_Setiap email baru akan dikirim lengkap ke chat private kamu, meskipun command ini diketik dari grup._\n\n` +
                        `_Pemantauan berhenti saat kamu memakai ${pfx}tmdel atau bot dimatikan._`
                );
                logCommand(m, hisoka, 'tmwait');
                return;
        }
}

module.exports = { handleTempmail, inspectAutoVerifyUrl, autoVerifyUrl };
