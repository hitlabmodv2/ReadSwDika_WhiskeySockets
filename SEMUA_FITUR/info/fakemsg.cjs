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

function getMentionedUsers(m) {
        const mentioned = [
                ...(Array.isArray(m.mentions) ? m.mentions : []),
                ...(Array.isArray(m.content?.contextInfo?.mentionedJid) ? m.content.contextInfo.mentionedJid : []),
        ];

        return Array.from(new Set(
                mentioned
                        .filter(jid => typeof jid === 'string' && !jid.endsWith('@g.us'))
                        .map(jidNormalizedUser)
                        .filter(Boolean)
        ));
}

function findLatestMessageKeyFromUser(hisoka, chatJid, targetJid) {
        if (!(hisoka.cacheMsg instanceof Map)) return null;

        const cachedMessages = Array.from(hisoka.cacheMsg.values()).reverse();
        for (const message of cachedMessages) {
                const key = message?.key;
                if (!key?.id || key.remoteJid !== chatJid || key.fromMe) continue;

                const participant = key.participant || message.participant;
                if (participant && areJidsSameUser(participant, targetJid)) {
                        return {
                                ...key,
                                remoteJid: chatJid,
                                participant,
                                fromMe: false,
                        };
                }
        }

        return null;
}

async function handleFakemsg({ hisoka, m, query, tolak, logCommand }) {
        const rawQuery = String(query || '').trim();
        const mentionedUsers = getMentionedUsers(m);
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
        const targetJid = mentionedUsers[0];
        const targetKey = findLatestMessageKeyFromUser(hisoka, chatJid, targetJid);

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