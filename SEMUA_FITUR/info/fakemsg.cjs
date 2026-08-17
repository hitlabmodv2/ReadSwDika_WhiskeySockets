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
const RELAY_TIMEOUT_MS = 15000;

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
        const targetKey = {
                ...m.quoted.key,
                remoteJid: m.quoted.key.remoteJid || chatJid,
                id: m.quoted.key.id,
        };

        try {
                // Key harus memakai pesan asli yang direply. Jika dibuat
                // `fromMe: true` dengan ID pesan sementara, WA menganggap
                // targetnya adalah pesan milik bot sendiri.
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
                        '✅ Fake edit sudah dikirim ke pesan target.\n' +
                        'Jika tampilan pesan belum berubah, kemungkinan server WhatsApp menolak edit pesan milik orang lain.'
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