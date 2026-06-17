/**
 * ─────────────────────────────────────
 *  Browser Switch Helper
 *  Ganti browser tanpa hapus session lama dulu.
 *  Urutan: koneksi baru dulu → kirim pairing code via bot lama →
 *          setelah terhubung baru hapus session lama → restart.
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
import { useSingleFileAuthState } from './authState.js';
import { loadConfig } from './utils.js';

const silentLogger = pino({ level: 'silent' });

function fmtPairingCode(code) {
    if (!code) return '';
    const clean = String(code).replace(/[-\s]/g, '').toUpperCase();
    return clean.match(/.{1,4}/g)?.join('-') || code;
}

/**
 * Mulai koneksi baru dengan browser baru tanpa hapus session lama.
 * Pairing code dikirim via hisoka (bot lama yang masih aktif) ke chat `from`.
 * Setelah koneksi baru berhasil (open), session lama baru dihapus → restart.
 *
 * @param {object} hisoka       - Socket bot utama yang sedang aktif
 * @param {string[]} browserVal - Array browser: ['Ubuntu','Firefox','128.0.3']
 * @param {string} from         - JID chat tujuan kirim pairing code
 * @param {function} editFn     - Fungsi edit pesan status (async txt => void)
 */
export async function startBrowserSwitch(hisoka, browserVal, from, editFn) {
    const sessionName = process.env.BOT_SESSION_NAME || 'hisoka';
    const mainFile    = path.join(process.cwd(), 'sessions', sessionName + '.json');
    const mainDir     = global.sessionDir || path.join(process.cwd(), 'sessions', sessionName);
    const tempFile    = path.join(process.cwd(), 'sessions', sessionName + '_switching.json');
    const tempDir     = path.join(process.cwd(), 'sessions', sessionName + '_switching');

    const botNum = (loadConfig().botNumber || process.env.BOT_NUMBER_PAIR || '').replace(/[^0-9]/g, '');

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
        keepAliveIntervalMs: 30000,
        connectTimeoutMs:    60000,
        defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingRequested = false;
    let switched         = false;

    // ── Timeout 5 menit: batalkan jika tidak ada respons ──
    const abortTimer = setTimeout(async () => {
        if (switched) return;
        try { sock.ev.removeAllListeners(); sock.ws?.close(); } catch {}
        try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
        try { await fs.promises.unlink(tempFile); } catch {}
        await hisoka.sendMessage(from, {
            text:
                `⏰ *Timeout Ganti Browser!*\n\n` +
                `Proses pairing tidak selesai dalam 5 menit.\n` +
                `Bot tetap menggunakan browser lama.\n\n` +
                `Coba lagi dengan *.aturbrowser*`
        }).catch(() => {});
    }, 5 * 60 * 1000);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

        // ── CONNECTING: minta pairing code ──
        if (connection === 'connecting' && !state.creds?.registered && !pairingRequested) {
            pairingRequested = true;
            await delay(3000);
            try {
                if (!botNum) {
                    await editFn(
                        `⚠️ *BOT_NUMBER_PAIR belum diset!*\n\n` +
                        `Tidak bisa kirim pairing code ke WA.\n` +
                        `Isi BOT_NUMBER_PAIR di file .env, lalu coba *.aturbrowser* lagi.`
                    );
                    clearTimeout(abortTimer);
                    try { sock.ev.removeAllListeners(); sock.ws?.close(); } catch {}
                    try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
                    try { await fs.promises.unlink(tempFile); } catch {}
                    return;
                }

                const _cfg = loadConfig();
                const _customCode = _cfg.pairingCode
                    ? String(_cfg.pairingCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8).padEnd(8, '0')
                    : undefined;
                const code = await sock.requestPairingCode(botNum, _customCode);
                const fmt  = fmtPairingCode(code);

                // Kirim via hisoka (bot lama masih hidup) → langsung ke chat
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
                try { sock.ev.removeAllListeners(); sock.ws?.close(); } catch {}
                try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
                try { await fs.promises.unlink(tempFile); } catch {}
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
                // Hapus session lama SEKARANG (setelah koneksi baru berhasil)
                await fs.promises.rm(mainDir,   { recursive: true, force: true }).catch(() => {});
                await fs.promises.unlink(mainFile).catch(() => {});

                // Pindahkan session sementara → session utama
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
                // Cleanup temp jika rename gagal
                try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
                try { await fs.promises.unlink(tempFile); } catch {}

                const { restartBot } = _require(path.resolve('./src/scrape/system/shutdown.cjs'));
                restartBot(500);
            }
        }

        // ── CLOSE: koneksi baru terputus ──
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (connection === 'close' && !switched) {
            // Jika pairing belum dimulai, jangan batalkan dulu (bisa reconnect)
            if (!pairingRequested) return;

            clearTimeout(abortTimer);
            try { sock.ev.removeAllListeners(); sock.ws?.close(); } catch {}
            try { await fs.promises.rm(tempDir,  { recursive: true, force: true }); } catch {}
            try { await fs.promises.unlink(tempFile); } catch {}

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
