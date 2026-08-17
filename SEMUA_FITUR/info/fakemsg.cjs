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
 *  fakemsg.cjs — Percobaan fake edited message untuk owner
 *  Reply pesan di grup lalu kirim teks pengganti melalui
 *  protocolMessage Baileys; hasil bergantung pada versi WhatsApp.
 * ───────────────────────────────
 */
'use strict';

const { areJidsSameUser, delay, jidNormalizedUser } = require('@whiskeysockets/baileys');

const MAX_FAKE_MESSAGE_LENGTH = 4096;
const RELAY_TIMEOUT_MS = 15000;

const FAKEMSG_USAGE = [
        '╭─「 FAKEMSG 」',
        '│ Mengubah teks pesan terbaru milik user yang ditag.',
        '│',
        '│ Cara menggunakan:',
        '│ 1. Tag user target di dalam grup.',
        '│ 2. Ketik: *.fakemsg @user teks pengganti*',
        '│',
        '│ Contoh:',
        '│ *.fakemsg @628123456789 Hai semuanya*',
        '│',
        '│ Catatan: target harus punya pesan terbaru yang masih',
        '│ tersimpan di cache bot dan hasil edit bergantung WA.',
        '╰────────────────────',
].join('\n');

function withTimeout(promise, timeoutMs) {
        let timer;
        const timeout = new Promise((_, reject) => {
                timer = setTimeout(
                        () => reject(new Error('Relay WhatsApp timeout setelah 15 detik.')),
                        timeoutMs
                );
        });

        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sameJid(a, b) {
        if (!a || !b) return false;

        try {
                if (areJidsSameUser(a, b)) return true;
        } catch (_) {}

        return jidNormalizedUser(a) === jidNormalizedUser(b);
}

async function getMentionedUsers(hisoka, m) {
        const mentioned = [
                ...(Array.isArray(m.mentions) ? m.mentions : []),
                ...(Array.isArray(m.content?.contextInfo?.mentionedJid) ? m.content.contextInfo.mentionedJid : []),
        ];

        const users = [];

        for (const rawJid of mentioned) {
                if (typeof rawJid !== 'string' || rawJid.endsWith('@g.us')) continue;

                const normalized = jidNormalizedUser(rawJid);
                if (normalized) users.push(normalized);

                // Pada grup yang memakai LID, mention bisa masih berupa @lid
                // walaupun pesan target di cache memakai nomor @s.whatsapp.net.
                // Simpan kedua bentuknya agar lookup tidak gagal hanya karena
                // Baileys menerima format JID yang berbeda.
                if (normalized?.endsWith('@lid') && typeof hisoka.resolveLidToPN === 'function') {
                        const resolved = await hisoka.resolveLidToPN({
                                remoteJid: m.from,
                                participant: normalized,
                        }).catch(() => null);
                        const resolvedNormalized = jidNormalizedUser(resolved);
                        if (resolvedNormalized) users.push(resolvedNormalized);
                }
        }

        return Array.from(new Set(users));
}

function getMessageTimestamp(message) {
        const timestamp = message?.messageTimestamp || message?.key?.messageTimestamp;
        const numericTimestamp = Number(timestamp);
        return Number.isFinite(numericTimestamp) ? numericTimestamp : 0;
}

function isMessageInChat(message, chatJid) {
        const key = message?.key;
        const chatCandidates = [
                key?.remoteJid,
                key?.remoteJidAlt,
                message?.remoteJid,
                message?.from,
        ].filter(Boolean);

        return chatCandidates.some(candidate => sameJid(candidate, chatJid));
}

async function findLatestMessageKeyFromUser(hisoka, chatJid, targetJids) {
        if (!(hisoka.cacheMsg instanceof Map)) return null;

        const cachedMessages = Array.from(hisoka.cacheMsg.values())
                .map((message, index) => ({ message, index }))
                .sort((a, b) => {
                        const timestampDiff = getMessageTimestamp(b.message) - getMessageTimestamp(a.message);
                        return timestampDiff || b.index - a.index;
                })
                .map(({ message }) => message);

        for (const message of cachedMessages) {
                const key = message?.key;
                if (!key?.id || key.fromMe || !isMessageInChat(message, chatJid)) continue;

                const participants = [
                        key.participant,
                        key.participantAlt,
                        message.participant,
                        message.sender,
                ].filter(Boolean);

                for (const participant of participants) {
                        const rawParticipant = jidNormalizedUser(participant);
                        const rawMatches = targetJids.some(targetJid => sameJid(rawParticipant, targetJid));

                        let resolvedParticipant = rawParticipant;
                        if (!rawMatches && rawParticipant?.endsWith('@lid') && typeof hisoka.resolveLidToPN === 'function') {
                                resolvedParticipant = jidNormalizedUser(
                                        await hisoka.resolveLidToPN({
                                                remoteJid: key.remoteJid || chatJid,
                                                participant: rawParticipant,
                                                participantAlt: key.participantAlt,
                                        }).catch(() => rawParticipant)
                                );
                        }

                        if (rawMatches || targetJids.some(targetJid => sameJid(resolvedParticipant, targetJid))) {
                                // Jangan mengganti remoteJid/fromMe/participant dengan
                                // versi hasil normalisasi. Protocol edit harus menunjuk
                                // key persis yang diterima dari WhatsApp.
                                const originalKey = { ...key };
                                if (!originalKey.participant && message.participant) {
                                        originalKey.participant = message.participant;
                                }
                                return originalKey;
                        }
                }
        }

        return null;
}

async function handleFakemsg({ hisoka, m, query, tolak, logCommand }) {
        const rawQuery = String(query || '').trim();
        const mentionedUsers = await getMentionedUsers(hisoka, m);
        const replacementText = rawQuery.replace(/^@\S+\s*/, '').trim();

        // `.fakemsg` tanpa argumen harus menjadi help yang bisa dipakai,
        // bukan berhenti di guard grup/reply tanpa menjelaskan formatnya.
        if (!replacementText) {
                await tolak(hisoka, m, FAKEMSG_USAGE);
                return;
        }

        if (!m.isGroup) {
                await tolak(hisoka, m, '❌ Perintah ini hanya bisa digunakan di dalam grup.');
                return;
        }

        if (!mentionedUsers.length) {
                await tolak(
                        hisoka,
                        m,
                        '❌ Tag user target terlebih dahulu.\n\nContoh: *.fakemsg @user teks pengganti*'
                );
                return;
        }

        if (replacementText.length > MAX_FAKE_MESSAGE_LENGTH) {
                await tolak(
                        hisoka,
                        m,
                        `❌ Teks terlalu panjang. Maksimal ${MAX_FAKE_MESSAGE_LENGTH} karakter.`
                );
                return;
        }

        const chatJid = m.from;
        const targetKey = await findLatestMessageKeyFromUser(hisoka, chatJid, mentionedUsers);

        if (!targetKey) {
                await tolak(
                        hisoka,
                        m,
                        '❌ Pesan terbaru dari user yang ditag tidak ditemukan di cache bot.\n' +
                        'Minta user tersebut kirim pesan baru di grup, lalu jalankan command ini lagi.'
                );
                return;
        }

        try {
                // Gunakan key pesan asli milik user yang ditag. Bot tidak
                // dapat mengirim pesan baru sebagai akun WhatsApp orang lain.
                await withTimeout(hisoka.relayMessage(
                        chatJid,
                        {
                                protocolMessage: {
                                        key: targetKey,
                                        type: 14,
                                        editedMessage: {
                                                extendedTextMessage: {
                                                        text: replacementText,
                                                },
                                        },
                                },
                        },
                        {}
                ), RELAY_TIMEOUT_MS);

                await delay(100);
                logCommand(m, hisoka, 'fakemsg');
                await m.reply(
                        '✅ Protocol fake edit sudah dikirim ke pesan terbaru user yang ditag.\n' +
                        'Jika tampilan belum berubah, server WhatsApp kemungkinan menolak edit pesan milik orang lain.'
                );
        } catch (error) {
                console.error('[fakemsg]', error);
                await tolak(
                        hisoka,
                        m,
                        `❌ Fake message gagal diproses: ${error?.message || error}`
                );
        }
}

module.exports = { handleFakemsg };