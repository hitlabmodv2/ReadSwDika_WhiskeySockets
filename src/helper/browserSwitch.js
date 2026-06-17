/**
 * ─────────────────────────────────────
 *  Browser Switch Helper
 *  Ganti browser tanpa hapus session lama dulu.
 *
 *  Logika:
 *  - BOT_NUMBER_PAIR diisi → pairing code dikirim ke chat WA
 *  - BOT_NUMBER_PAIR kosong → QR code (gambar) dikirim ke chat WA
 *
 *  Urutan: buka koneksi baru (bot lama tetap aktif) →
 *          kirim pairing code / QR via bot lama →
 *          setelah terhubung, hapus session lama → restart.
 * ─────────────────────────────────────
 */
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const {
    default: makeWASocket,
    delay,
    fetchLatestBaileysVersion,
} = _require('@whiskeysockets/baileys');

import fs from 'fs';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';
import { useSingleFileAuthState } from './authState.js';
import { loadConfig, saveConfig } from './utils.js';

const silentLogger = pino({ level: 'silent' });

function fmtPairingCode(code) {
    if (!code) return '';
    const clean = String(code).replace(/[-\s]/g, '').toUpperCase();
    return clean.match(/.{1,4}/g)?.join('-') || code;
}

async function generateQRBuffer(qrData) {
    return QRCode.toBuffer(qrData, {
        type: 'png',
        width: 512,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
    });
}

/**
 * Mulai koneksi baru dengan browser baru tanpa hapus session lama.
 *
 * @param {object}   hisoka        - Socket bot utama yang masih aktif
 * @param {string[]} browserVal    - Array browser: ['Ubuntu','Safari','17.6.1']
 * @param {string}   from          - JID chat tujuan notifikasi
 * @param {function} editFn        - Edit pesan status (async txt => void)
 * @param {string}   newBrowserKey - Key browser baru (misal 'v7') untuk disimpan ke config SETELAH sukses
 */
export async function startBrowserSwitch(hisoka, browserVal, from, editFn, newBrowserKey = 'v1') {
    const sessionName = process.env.BOT_SESSION_NAME || 'hisoka';
    const mainFile    = path.join(process.cwd(), 'sessions', sessionName + '.json');
    const mainDir     = global.sessionDir || path.join(process.cwd(), 'sessions', sessionName);
    const tempFile    = path.join(process.cwd(), 'sessions', sessionName + '_switching.json');
    const tempDir     = path.join(process.cwd(), 'sessions', sessionName + '_switching');

    // HANYA ambil dari BOT_NUMBER_PAIR — bukan config.botNumber (itu nomor bot sendiri)
    const botNum = (process.env.BOT_NUMBER_PAIR || '').replace(/[^0-9]/g, '');
    const usePairingCode = botNum.length > 0;

    // Bersihkan temp session sebelumnya jika ada
    try { await fs.promises.rm(tempDir, { recursive: true, force: true }); } catch {}
    try { await fs.promises.unlink(tempFile); } catch {}

    const { state, saveCreds } = await useSingleFileAuthState(tempFile);
    const { version }          = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth:   { creds: state.creds, keys: state.keys },
        logger: silentLogger,
        printQRInTerminal: false,
        browser: browserVal,
        keepAliveIntervalMs:    30000,
        connectTimeoutMs:       60000,
        defaultQueryTimeoutMs:  60000,
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingRequested = false;
    let qrSent           = false;
    let switched         = false;

    const cleanup = async () => {
        try { sock.ev.removeAllListeners(); sock.ws?.close(); } catch {}
        try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
        try { await fs.promises.unlink(tempFile); } catch {}
    };

    // ── Timeout 5 menit ──
    const abortTimer = setTimeout(async () => {
        if (switched) return;
        await cleanup();
        await hisoka.sendMessage(from, {
            text:
                `⏰ *Timeout Ganti Browser!*\n\n` +
                `Proses koneksi tidak selesai dalam 5 menit.\n` +
                `Bot tetap menggunakan browser lama.\n\n` +
                `Coba lagi dengan *.aturbrowser*`
        }).catch(() => {});
    }, 5 * 60 * 1000);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

        // ── QR CODE: BOT_NUMBER_PAIR kosong ──
        if (qr && !usePairingCode && !qrSent && !switched) {
            qrSent = true;
            try {
                const qrBuf = await generateQRBuffer(qr);
                const caption =
                    `╔══════════════════════════╗\n` +
                    `║  📷  *QR CODE BARU*  📷  ║\n` +
                    `╚══════════════════════════╝\n\n` +
                    `🖥️ *Browser:* ${browserVal.join(' | ')}\n\n` +
                    `📋 *Cara scan QR:*\n` +
                    `1️⃣ Buka WhatsApp di HP\n` +
                    `2️⃣ Ketuk ⋮ → *Perangkat Tertaut*\n` +
                    `3️⃣ Ketuk *Tautkan Perangkat*\n` +
                    `4️⃣ Arahkan kamera ke QR di atas\n\n` +
                    `⏳ *QR berlaku ~60 detik* — kalau expired, bot kirim QR baru otomatis.\n` +
                    `🔄 Bot lama tetap aktif sampai QR di-scan.`;

                await hisoka.sendMessage(from, {
                    image: qrBuf,
                    caption,
                });
                await editFn(
                    `📷 *QR Code sudah dikirim ke chat ini!*\n\n` +
                    `🖥️ Browser: *${browserVal.join(' | ')}*\n\n` +
                    `⏳ Scan QR dalam *60 detik*.\n` +
                    `Bot lama tetap berjalan normal.\n\n` +
                    `_Kalau QR expired, bot kirim QR baru otomatis._`
                );
            } catch (e) {
                await hisoka.sendMessage(from, {
                    text: `❌ *Gagal kirim QR Code!*\n\n${e?.message || e}`
                }).catch(() => {});
            }
            return;
        }

        // QR expired & belum terhubung → kirim QR baru
        if (qr && !usePairingCode && qrSent && !switched) {
            qrSent = false; // reset supaya QR baru bisa dikirim
            try {
                const qrBuf = await generateQRBuffer(qr);
                await hisoka.sendMessage(from, {
                    image: qrBuf,
                    caption:
                        `🔄 *QR Code diperbarui!*\n\n` +
                        `🖥️ *Browser:* ${browserVal.join(' | ')}\n` +
                        `⏳ Scan sebelum expired.`
                });
                qrSent = true;
            } catch {}
            return;
        }

        // ── CONNECTING: minta pairing code (hanya jika BOT_NUMBER_PAIR diisi) ──
        if (connection === 'connecting' && !state.creds?.registered && usePairingCode && !pairingRequested) {
            pairingRequested = true;
            await delay(3000);
            try {
                const _cfg = loadConfig();
                const _customCode = _cfg.pairingCode
                    ? String(_cfg.pairingCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8).padEnd(8, '0')
                    : undefined;
                const code = await sock.requestPairingCode(botNum, _customCode);
                const fmt  = fmtPairingCode(code);

                await hisoka.sendMessage(from, {
                    text:
                        `╔══════════════════════════╗\n` +
                        `║  🔑  *PAIRING CODE BARU*  🔑  ║\n` +
                        `╚══════════════════════════╝\n\n` +
                        `🖥️ *Browser:* ${browserVal.join(' | ')}\n\n` +
                        `┌──────────────────────┐\n` +
                        `│      *${fmt}*      │\n` +
                        `└──────────────────────┘\n\n` +
                        `📋 *Cara masukkan kode:*\n` +
                        `1️⃣ Buka WhatsApp di HP\n` +
                        `2️⃣ Ketuk ⋮ → *Perangkat Tertaut*\n` +
                        `3️⃣ Ketuk *Tautkan Perangkat*\n` +
                        `4️⃣ Pilih *Tautkan dengan nomor telepon*\n` +
                        `5️⃣ Masukkan kode:\n\n` +
                        `\`\`\`${fmt}\`\`\`\n\n` +
                        `⏳ *Kode berlaku 3 menit*\n` +
                        `🔄 Bot lama tetap aktif sampai kode dimasukkan.`
                });
                await editFn(
                    `📲 *Pairing code sudah dikirim ke chat ini!*\n\n` +
                    `🖥️ Browser: *${browserVal.join(' | ')}*\n\n` +
                    `⏳ Masukkan kode dalam *3 menit*.\n` +
                    `Bot lama tetap berjalan normal.`
                );
            } catch (e) {
                clearTimeout(abortTimer);
                await cleanup();
                await hisoka.sendMessage(from, {
                    text: `❌ *Gagal mendapat pairing code!*\n\n${e?.message || e}`
                }).catch(() => {});
                await editFn(`❌ *Gagal mendapat pairing code!*\n\n${e?.message || e}`);
            }
        }

        // ── OPEN: koneksi baru berhasil → ganti session → restart ──
        if (connection === 'open' && !switched) {
            switched = true;
            clearTimeout(abortTimer);
            try { sock.ev.removeAllListeners(); } catch {}

            try {
                // Simpan config browser BARU setelah koneksi benar-benar berhasil
                // (bukan sebelumnya agar __activeBrowserKey & config tetap akurat sampai switch selesai)
                try {
                    const _cfgNow = loadConfig();
                    _cfgNow.browserDevice = { selected: newBrowserKey };
                    // pairedBrowserKey = apa yang WA simpan sebagai "browser perangkat tertaut" ini
                    // Disimpan setelah pairing sukses — inilah yang tampil di menu bot dan di WA Perangkat Tertaut
                    _cfgNow.pairedBrowserKey = newBrowserKey.toLowerCase();
                    saveConfig(_cfgNow);
                    global.__activeBrowserKey = newBrowserKey.toLowerCase();
                    global.__activeBrowserArr = browserVal; // update array mentah ke browser baru
                } catch {}

                await fs.promises.rm(mainDir,  { recursive: true, force: true }).catch(() => {});
                await fs.promises.unlink(mainFile).catch(() => {});
                try { await fs.promises.rename(tempFile, mainFile); } catch {}
                try { await fs.promises.rename(tempDir,  mainDir);  } catch {}

                await hisoka.sendMessage(from, {
                    text:
                        `╔══════════════════════╗\n` +
                        `║  ✅  *TERHUBUNG!*  ✅  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `🟢 *Koneksi baru berhasil!*\n` +
                        `🖥️ Browser: *${browserVal.join(' | ')}*\n\n` +
                        `🗑️ Session lama sudah dihapus.\n` +
                        `🔄 *Bot restart dalam 3 detik...*`
                }).catch(() => {});

                await delay(3000);
            } catch (e) {
                await hisoka.sendMessage(from, {
                    text: `❌ *Gagal switch session:* ${e?.message}`
                }).catch(() => {});
            } finally {
                try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
                try { await fs.promises.unlink(tempFile); } catch {}
                const { restartBot } = _require(path.resolve('./src/scrape/system/shutdown.cjs'));
                restartBot(500);
            }
        }

        // ── CLOSE: koneksi baru terputus ──
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (connection === 'close' && !switched) {
            if (!pairingRequested && !qrSent) return; // belum mulai, biarkan reconnect
            clearTimeout(abortTimer);
            await cleanup();
            await hisoka.sendMessage(from, {
                text:
                    `❌ *Koneksi baru terputus!*\n\n` +
                    `Bot tetap menggunakan session lama.\n` +
                    `Alasan: \`${reason || 'unknown'}\`\n\n` +
                    `Coba lagi dengan *.aturbrowser*`
            }).catch(() => {});
        }
    });
}
