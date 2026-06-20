'use strict';

/**
 * handleTempmail
 * Handler untuk command: tempmail, tmail, tminbox, tmread, tmwait, tmdel
 */
async function handleTempmail({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
        const Tmail = _require(path.resolve('./src/scrape/tools/tmail.cjs'));
        const fs = _require('fs');
        const TMAIL_DB = path.resolve('./data/tmail/db.json');
        if (!global.__tmailSessions) global.__tmailSessions = new Map();
        const sessions = global.__tmailSessions;
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
        const removeSess = () => {
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
                if (!s || !s.mailbox) return null;
                const at = s.mailbox.indexOf('@');
                if (at <= 0) return null;
                const name = s.mailbox.slice(0, at);
                const domain = s.mailbox.slice(at + 1);
                try {
                        const data = await s.change(name, domain);
                        if (data && data.mailbox && data.mailbox !== `${name}@${domain}`) {
                                data.mailbox = `${name}@${domain}`;
                        }
                        s.mailbox = `${name}@${domain}`;
                        return data;
                } catch (_) {
                        return null;
                }
        };

        const sub = String(m.command || '').toLowerCase();

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

        const formatMail = (msg, mailbox, header = '📩 *PESAN*') => {
                const body = (msg.bodyText || '').trim();
                const trimmed = body.length > 3500 ? body.slice(0, 3500) + '\n\n_..(dipotong)_' : body;
                const links = Array.isArray(msg.links) ? msg.links.slice(0, 10) : [];
                const linkBlock = links.length
                        ? `\n\n🔗 *Link di pesan:*\n` + links.map((l, i) =>
                                `${i + 1}. ${l.url}` + (l.text ? `\n   _${l.text}_` : '')
                        ).join('\n')
                        : '';
                return (
                        `${header}\n\n` +
                        `📌 *Subjek:* ${msg.subject || '-'}\n` +
                        `👤 *Dari:* ${msg.from || msg.from_email || '-'}\n` +
                        `📧 *Ke:* ${msg.to || mailbox || '-'}\n` +
                        `🕒 *Tanggal:* ${msg.date || msg.receivedAt || '-'}\n` +
                        `🆔 *ID:* ${msg.id}\n` +
                        `🌐 *URL:* ${msg.url || ''}\n` +
                        `${'─'.repeat(20)}\n\n` +
                        (trimmed || '_(isi pesan kosong)_') +
                        linkBlock
                );
        };

        const sendMailWithButtons = async (msg, mailbox, header = '📩 *PESAN*') => {
                const ai = msg.ai || null;
                const code = (ai && ai.code) || detectCode(msg.bodyText || msg.subject || '');
                const links = Array.isArray(msg.links) ? msg.links : [];
                const primaryUrl = ai && ai.primaryUrl;
                const primaryLabel = (ai && ai.primaryLabel) || 'Verifikasi';
                const aiSummary = (ai && ai.summary) || '';

                let teks = formatMail(msg, mailbox, header);
                if (aiSummary) teks += `\n\n🤖 *Ringkasan AI:* ${aiSummary}`;

                const buttons = [];

                const isJunk = (u, t) => /unsubscribe|opt-?out|preferences|notification-settings|manage|update.?profile/i.test(u + ' ' + (t || ''));
                const isVerifyLike = (u, t) => /verify|verifikasi|confirm|konfirmasi|activate|aktivasi|action-code|oobcode|reset|password|login|signin|sign-in|magic|auth|token/i.test(u + ' ' + (t || ''));

                let verifyUrl = null;
                let verifyLabel = 'Verifikasi';
                if (primaryUrl) {
                        verifyUrl = primaryUrl;
                        verifyLabel = String(primaryLabel || 'Verifikasi').trim() || 'Verifikasi';
                } else {
                        const candidate = links.find((l) => l.url && !isJunk(l.url, l.text) && isVerifyLike(l.url, l.text))
                                || links.find((l) => l.url && !isJunk(l.url, l.text));
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

                if (verifyUrl && code) teks += `\n\n🔑 *Kode OTP:* \`${code}\``;

                try { archiveEmail(mailbox, msg); } catch (_) {}

                if (!buttons.length) {
                        await tolak(hisoka, m, teks);
                        return;
                }

                try {
                        await m.reply({
                                interactiveMessage: {
                                        contextInfo: {
                                                stanzaId: m.key.id,
                                                participant: m.sender,
                                                quotedMessage: m.message,
                                        },
                                        title: teks,
                                        footer: `📨 Tempmail · ${mailbox || ''}`,
                                        buttons,
                                },
                        });
                } catch (err) {
                        await tolak(hisoka, m, teks + (code ? `\n\n🔑 *Kode:* \`${code}\`` : ''));
                }
        };

        if (sub === 'tmdel') {
                await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
                const old = (loadDB()[userId] || {}).mailbox || '-';
                removeSess();
                const s = new Tmail();
                sessions.set(userId, s);
                const info = await s.create();
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
                                await tolak(hisoka, m, `❌ Nama email kosong.\nContoh: *${pfx}tempmail wilytest@t.etokom.com*`);
                                return;
                        }
                        if (!Tmail.DEFAULT_DOMAINS.includes(domain)) {
                                await tolak(hisoka, m,
                                        `❌ Domain *${domain}* tidak tersedia.\n\n` +
                                        `Domain yang didukung:\n• ` + Tmail.DEFAULT_DOMAINS.join('\n• ')
                                );
                                return;
                        }
                        info = await s.change(name, domain);
                        persistSess(s);
                } else if (s.mailbox) {
                        const savedMailbox = s.mailbox;
                        info = await ensureBound(s);
                        if (!info) info = { mailbox: savedMailbox, messages: [] };
                        if (!info.mailbox) info.mailbox = savedMailbox;
                        reused = true;
                        persistSess(s);
                } else {
                        info = await s.create();
                        persistSess(s);
                }
                const teks =
                        `╭─「 📨 *TEMPMAIL ETOKOM* 」\n` +
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
                        `│ • ${pfx}tempmail nama@${Tmail.DEFAULT_DOMAINS[0]} — custom\n` +
                        `│\n` +
                        `│ 🌐 Domain tersedia:\n│ • ` + Tmail.DEFAULT_DOMAINS.join('\n│ • ') + `\n` +
                        `╰────────────────────`;

                await sendTmailPanel(teks, info.mailbox);
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
                if (!data) data = { mailbox: savedMb, messages: [] };
                if (!data.mailbox) data.mailbox = savedMb;
                persistSess(s);
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
                        return;
                }
                const s = getSess();
                if (!s.token) await s.create();
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
                await ensureBound(s);
                persistSess(s);
                const waitMs = (() => {
                        const n = parseInt(input);
                        if (!isNaN(n) && n >= 10 && n <= 600) return n * 1000;
                        return 2 * 60 * 1000;
                })();
                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                await tolak(hisoka, m,
                        `⏳ *Menunggu email masuk (REALTIME)*\n\n` +
                        `✉️ ${s.mailbox}\n` +
                        `⏱️ Durasi: ${Math.round(waitMs / 1000)} detik\n` +
                        `🔄 Polling tiap 5 detik\n\n` +
                        `_Setiap email yang masuk akan dikirim lengkap (subjek, isi, link). Bot terus mendengarkan sampai durasi habis._`
                );
                let received = 0;
                await s.streamMessages({
                        timeout: waitMs,
                        interval: 5000,
                        onMessage: async (msg) => {
                                received++;
                                await sendMailWithButtons(msg, s.mailbox, `🔔 *EMAIL BARU #${received}*`);
                                await hisoka.sendMessage(m.from, { react: { text: '🔔', key: m.key } }).catch(() => {});
                        },
                });
                if (received === 0) {
                        const mb = (loadDB()[userId] || {}).mailbox || '-';
                        const teks =
                                `╭─「 ⌛ *TIDAK ADA EMAIL BARU* 」\n` +
                                `│\n` +
                                `│ ⏱️ Durasi tunggu: *${Math.round(waitMs / 1000)} detik*\n` +
                                `│ ✉️ Mailbox: ${mb}\n` +
                                `│ 📭 Email masuk: *0*\n` +
                                `│\n` +
                                `│ Coba lagi:\n` +
                                `│ • ${pfx}tmwait — tunggu lagi (default 120s)\n` +
                                `│ • ${pfx}tmwait 300 — kasih waktu lebih (max 600s)\n` +
                                `│ • ${pfx}tminbox — cek inbox manual\n` +
                                `╰────────────────────`;
                        await sendTmailPanel(teks, mb);
                        await hisoka.sendMessage(m.from, { react: { text: '⌛', key: m.key } });
                } else {
                        const mb = (loadDB()[userId] || {}).mailbox || '-';
                        const teks =
                                `╭─「 ✅ *SELESAI MENDENGARKAN* 」\n` +
                                `│\n` +
                                `│ 📬 Total email diterima: *${received}*\n` +
                                `│ ✉️ Mailbox: ${mb}\n` +
                                `│\n` +
                                `│ Mau lanjut?\n` +
                                `│ • ${pfx}tmwait — dengerin lagi\n` +
                                `│ • ${pfx}tminbox — cek inbox\n` +
                                `│ • ${pfx}tmdel — ganti email baru\n` +
                                `╰────────────────────`;
                        await sendTmailPanel(teks, mb);
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                }
                logCommand(m, hisoka, 'tmwait');
        }
}

module.exports = { handleTempmail };
