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

const { delay } = require('@whiskeysockets/baileys');

const MAX_FAKE_MESSAGE_LENGTH = 4096;

const FAKEMSG_USAGE = [
        '╭─「 FAKEMSG 」',
        '│ Mencoba mengubah tampilan teks pesan menjadi pesan edit.',
        '│',
        '│ Cara menggunakan:',
        '│ 1. Reply pesan teks target di dalam grup.',
        '│ 2. Ketik: *.fakemsg teks pengganti*',
        '│',
        '│ Contoh:',
        '│ Reply "Halo", lalu ketik *.fakemsg Hai semuanya*',
        '│',
        '│ Catatan: hasil edit bergantung pada versi WhatsApp.',
        '╰────────────────────',
].join('\n');

async function deleteTemporaryMessage(hisoka, chatJid, messageId) {
        if (!hisoka || !chatJid || !messageId) return;

        try {
                await hisoka.sendMessage(chatJid, {
                        delete: {
                                remoteJid: chatJid,
                                fromMe: true,
                                id: messageId,
                        },
                });
        } catch (_) {
                // Pesan sementara boleh sudah hilang atau ditolak server WA.
        }
}

async function handleFakemsg({ hisoka, m, query, tolak, logCommand }) {
        const replacementText = String(query || '').trim();

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

        if (!m.isQuoted || !m.quoted?.key?.id) {
                await tolak(
                        hisoka,
                        m,
                        '❌ Reply pesan target terlebih dahulu, lalu ketik *.fakemsg teks pengganti*.'
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
        const targetStanzaId = m.quoted.key.id;
        let temporaryMessageId = null;
        let protocolMessageId = null;

        try {
                // Kirim pesan kosong sebagai pesan sementara agar mendapat ID valid
                // dari relayMessage Baileys.
                temporaryMessageId = await hisoka.relayMessage(
                        chatJid,
                        {
                                extendedTextMessage: {
                                        text: '',
                                        contextInfo: {
                                                isGroupStatus: true,
                                        },
                                },
                        },
                        {}
                );

                if (!temporaryMessageId) {
                        throw new Error('WhatsApp tidak mengembalikan ID pesan sementara.');
                }

                // Kirim protocol edit dengan ID pesan target seperti metode asli.
                // `remoteJid` dipakai karena itu field key yang benar di Baileys.
                protocolMessageId = await hisoka.relayMessage(
                        chatJid,
                        {
                                protocolMessage: {
                                        key: {
                                                remoteJid: chatJid,
                                                fromMe: true,
                                                id: temporaryMessageId,
                                        },
                                        type: 14,
                                        editedMessage: {
                                                extendedTextMessage: {
                                                        text: replacementText,
                                                        contextInfo: {
                                                                isGroupStatus: false,
                                                        },
                                                },
                                        },
                                },
                        },
                        {
                                // Pada Baileys versi ini nilai yang dikembalikan
                                // menjadi targetStanzaId. Jangan menghapusnya.
                                messageId: targetStanzaId,
                        }
                );

                await delay(100);
                logCommand(m, hisoka, 'fakemsg');
        } catch (error) {
                console.error('[fakemsg]', error);
                await tolak(
                        hisoka,
                        m,
                        `❌ Fake message gagal diproses: ${error?.message || error}`
                );
        } finally {
                // Hapus hanya pesan sementara. Jangan menghapus targetStanzaId
                // karena itu adalah pesan yang sedang di-reply oleh owner.
                const temporaryIds = new Set(
                        [temporaryMessageId, protocolMessageId]
                                .filter(Boolean)
                                .filter(id => id !== targetStanzaId)
                );

                for (const messageId of temporaryIds) {
                        await deleteTemporaryMessage(hisoka, chatJid, messageId);
                }
        }
}

module.exports = { handleFakemsg };