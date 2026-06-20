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
 *  credsjson.cjs — Export creds.json sesi (.credsjson)
 *  Kirim file creds ke chat WA untuk backup session manual
 * ───────────────────────────────
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const pino = require('pino');

const CREDS_BASE_DIR     = path.join(process.cwd(), 'credsjson');
const PAIRING_TIMEOUT_MS = 3 * 60 * 1000;
const PREKEY_POLL_MS     = 1_500;
const PREKEY_MAX_WAIT_MS = 40_000;
const MAX_RECONNECT      = 10;

/**
 * Format pairing code → XXXX-XXXX
 */
function formatPairingCode(code) {
    const clean = String(code).replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length === 8) return clean.slice(0, 4) + '-' + clean.slice(4);
    return clean.match(/.{1,4}/g)?.join('-') || clean;
}

/**
 * Polling sampai pre-key-*.json >= 5 file muncul di sessionDir.
 */
async function waitUntilPrekeys(sessionDir) {
    const deadline = Date.now() + PREKEY_MAX_WAIT_MS;
    while (Date.now() < deadline) {
        try {
            const all     = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
            const prekeys = all.filter(f => f.startsWith('pre-key-'));
            if (prekeys.length >= 5) return all.length;
        } catch {}
        await new Promise(r => setTimeout(r, PREKEY_POLL_MS));
    }
    try {
        return fs.readdirSync(sessionDir).filter(f => f.endsWith('.json')).length;
    } catch { return 0; }
}

/**
 * Baca creds.json dari sessionDir → Buffer
 */
function readCredsJson(sessionDir) {
    const credsPath = path.join(sessionDir, 'creds.json');
    if (!fs.existsSync(credsPath)) throw new Error('creds.json tidak ditemukan di folder sesi');
    return fs.readFileSync(credsPath);
}

/**
 * Tutup socket dengan bersih (tanpa hapus folder)
 */
function closeSocket(sock) {
    try { sock.ev.removeAllListeners(); } catch {}
    try { if (sock.ws) sock.ws.close(); } catch {}
}

/**
 * Buat & jalankan sesi WhatsApp untuk credsjson.
 * Reconnect otomatis seperti jadibot saat disconnect selama proses pairing.
 * Folder credsjson/[nomor]/ TIDAK dihapus otomatis — user bisa cek sendiri.
 */
async function startCredsJsonSession(number, opts = {}) {
    const {
        onPairingCode    = () => {},
        onConnected      = () => {},
        onTimeout        = () => {},
        onError          = () => {},
        customPairingCode,
    } = opts;

    number = String(number).replace(/[^0-9]/g, '');

    const sessionDir = path.join(CREDS_BASE_DIR, number);
    // Bersihkan folder lama agar tidak pakai creds sisa sesi sebelumnya
    try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    fs.mkdirSync(sessionDir, { recursive: true });

    const {
        default: makeWASocket,
        fetchLatestBaileysVersion,
        useMultiFileAuthState,
        DisconnectReason,
    } = require('@whiskeysockets/baileys');

    // State bersama antar reconnect
    let connected        = false;
    let aborted          = false;
    let pairingDone      = false;   // pairing code sudah dikirim ke nomor tujuan
    let reconnectCount   = 0;
    let currentSock      = null;

    // Timeout global 3 menit
    const timeoutHandle = setTimeout(async () => {
        if (connected || aborted) return;
        aborted = true;
        if (currentSock) closeSocket(currentSock);
        try { await onTimeout(); } catch {}
    }, PAIRING_TIMEOUT_MS);

    async function spawnSocket() {
        if (aborted) return;

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version }          = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth             : { creds: state.creds, keys: state.keys },
            logger           : pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser          : ['Ubuntu', 'Chrome', '136.0.7103.93'],
            keepAliveIntervalMs: 30_000,
            syncFullHistory  : false,
            getMessage       : async () => undefined,
        });

        currentSock = sock;

        sock.ev.on('creds.update', async (...args) => {
            try { await saveCreds(...args); } catch {}
        });

        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            if (aborted) return;

            const reason = lastDisconnect?.error?.output?.statusCode;

            // ── Request pairing code saat pertama connecting ──
            if (connection === 'connecting' && !state.creds?.registered && !pairingDone) {
                pairingDone = true;
                setTimeout(async () => {
                    if (aborted) return;
                    let retries = 3;
                    while (retries-- > 0) {
                        try {
                            const code = await sock.requestPairingCode(
                                number,
                                customPairingCode ? String(customPairingCode).toUpperCase() : undefined
                            );
                            if (aborted) return;
                            await onPairingCode(code, formatPairingCode(code));
                            return;
                        } catch (e) {
                            if (retries === 0) {
                                try { await onError(e); } catch {}
                            } else {
                                await new Promise(r => setTimeout(r, 1500));
                            }
                        }
                    }
                }, 1500);
            }

            // ── Berhasil terhubung ──
            if (connection === 'open' && !connected) {
                connected = true;
                clearTimeout(timeoutHandle);
                console.log(`[CREDSJSON] ✅ ${number} connected — tunggu pre-keys...`);

                (async () => {
                    try {
                        // Tunggu pre-keys muncul → sinyal pairing benar-benar selesai
                        await waitUntilPrekeys(sessionDir);
                        const buf = readCredsJson(sessionDir);
                        console.log(`[CREDSJSON] 📄 ${number} — creds.json siap, mengirim...`);
                        await onConnected(buf, number);
                        // Hapus folder sesi setelah creds.json berhasil terkirim
                        try {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                            console.log(`[CREDSJSON] 🗑️ ${number} — folder sesi dihapus.`);
                        } catch {}
                    } catch (e) {
                        try { await onError(e); } catch {}
                    } finally {
                        closeSocket(sock);
                    }
                })();

                return;
            }

            // ── Koneksi putus ──
            if (connection === 'close' && !connected && !aborted) {

                // Fatal: logout paksa atau forbidden
                if (reason === DisconnectReason.loggedOut || reason === 401 || reason === 403) {
                    clearTimeout(timeoutHandle);
                    aborted = true;
                    closeSocket(sock);
                    try { await onError(new Error(`Sesi ditolak WhatsApp (${reason})`)); } catch {}
                    return;
                }

                // Non-fatal (515 restart required, 428, dsb) → reconnect seperti jadibot
                if (reconnectCount >= MAX_RECONNECT) {
                    clearTimeout(timeoutHandle);
                    aborted = true;
                    closeSocket(sock);
                    try { await onError(new Error(`Gagal terhubung setelah ${MAX_RECONNECT}x reconnect`)); } catch {}
                    return;
                }

                reconnectCount++;
                console.log(`[CREDSJSON] 🔄 ${number} reconnect ${reconnectCount}/${MAX_RECONNECT} (code ${reason})...`);
                closeSocket(sock);
                setTimeout(() => spawnSocket(), 2000);
            }
        });
    }

    await spawnSocket();

    return {
        abort() {
            aborted = true;
            clearTimeout(timeoutHandle);
            if (currentSock) closeSocket(currentSock);
        },
    };
}

/**
 * Bersihkan format nomor → 62xxx
 */
function cleanNomor(nomor) {
    let n = String(nomor).replace(/\D/g, '');
    n = n.replace(/^0+/, '');
    if (n.startsWith('6262')) n = n.slice(2);
    if (!n.startsWith('62')) n = '62' + n;
    return n;
}

/**
 * Hapus folder sesi credsjson/[nomor]/ secara manual
 */
function deleteCredsFolder(number) {
    const dir = path.join(CREDS_BASE_DIR, cleanNomor(number));
    try { fs.rmSync(dir, { recursive: true, force: true }); return true; } catch { return false; }
}

module.exports = {
    startCredsJsonSession,
    cleanNomor,
    formatPairingCode,
    deleteCredsFolder,
};

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleCredsJson({ hisoka, m, query, tolak, logCommand, isMainBot, path }) {
	if (!m.isOwner) return;
	if (!isMainBot(hisoka)) { await tolak(hisoka, m, `❌ Perintah ini hanya bisa digunakan di bot utama.`); return; }
	try {
		const { cleanNomor, startCredsJsonSession } = require(path.resolve('./src/scrape/jadibot/credsjson.cjs'));

		const nomor = (query || '').replace(/[^\d]/g, '');
		if (!nomor) {
			await tolak(hisoka, m,
				`╭══『 📂 *CREDS JSON* 』══╮\n│\n` +
				`│ Buat sesi & kirim creds.json\n│ ke nomor tujuan.\n│\n` +
				`│ *Format:*\n│ *.credsjson [nomor]*\n│\n` +
				`│ *Contoh:*\n│ *.credsjson 628xxx*\n│\n` +
				`│ Bot generate pairing code\n│ → nomor input di WA\n│ → creds.json terkirim otomatis\n│\n` +
				`╰═══════════════════════╯`
			);
			return;
		}

		const cleanedNomor  = cleanNomor(nomor);
		const _cjTargetJid  = cleanedNomor + '@s.whatsapp.net';

		await hisoka.sendMessage(m.sender, { react: { text: '🔍', key: m.key } });

		const waResult     = await hisoka.onWhatsApp(_cjTargetJid);
		const isRegistered = Array.isArray(waResult) && waResult.length > 0 && waResult[0]?.exists;
		if (!isRegistered) {
			await hisoka.sendMessage(m.sender, { react: { text: '❌', key: m.key } });
			await hisoka.sendMessage(m.sender, {
				text: `❌ *Nomor tidak terdaftar di WhatsApp!*\n\n📱 *Nomor:* +${cleanedNomor}\n\nPastikan nomor benar dan aktif di WhatsApp.`
			});
			return;
		}

		await hisoka.sendMessage(m.sender, { react: { text: '⏳', key: m.key } });
		await hisoka.sendMessage(m.sender, {
			text:
				`╭══『 🔄 *MEMULAI SESI* 』══╮\n│\n` +
				`│ 📱 Nomor: *+${cleanedNomor}*\n│\n` +
				`│ Membuat sesi di folder:\n│ 📁 credsjson/${cleanedNomor}/\n│\n` +
				`│ ⏳ Generating pairing code...\n│\n│ Mohon tunggu sebentar.\n│\n╰═══════════════════════╯`
		});

		const _cjCfg = require(path.resolve('./config.json'));
		const _cjCustomCode = (_cjCfg.pairingCode && String(_cjCfg.pairingCode).trim()) || undefined;

		await startCredsJsonSession(cleanedNomor, {
			customPairingCode: _cjCustomCode,
			onPairingCode: async (code, fmt) => {
				try {
					await hisoka.sendMessage(_cjTargetJid, {
						text:
							`╔══════════════════════╗\n║  🤖  *C R E D S J S O N*  ║\n╚══════════════════════╝\n\n` +
							`🔑 *Pairing Code untuk nomormu:*\n\n┌─────────────────┐\n│   *${fmt}*   │\n└─────────────────┘\n\n` +
							`📋 *Tutorial memasukkan kode:*\n\n1️⃣ Buka *WhatsApp* di HP kamu\n2️⃣ Ketuk ⋮ → *Perangkat Tertaut*\n` +
							`3️⃣ Ketuk *Tautkan Perangkat*\n4️⃣ Pilih *Tautkan dengan nomor telepon*\n5️⃣ Masukkan kode di atas:\n   \`${fmt}\`\n\n` +
							`⏳ *Kode berlaku 3 menit*\n\n✅ Setelah berhasil, file *creds.json*\n   otomatis dikirim ke sini.`
					});
				} catch {}
				await hisoka.sendMessage(m.sender, { react: { text: '🔑', key: m.key } });
				await hisoka.sendMessage(m.sender, {
					text:
						`╭══『 🔑 *PAIRING CODE TERKIRIM* 』══╮\n│\n` +
						`│ ✅ Kode dikirim ke: *+${cleanedNomor}*\n│\n│ ━━━━━━━━━━━━━━━━━━━━━━━\n│\n` +
						`│ 📋 *Instruksi ke nomor tersebut:*\n│\n│ 1️⃣ Cek WA → ada pesan kode\n│ 2️⃣ Buka WA → ⋮ → Perangkat\n` +
						`│    Tertaut → Tautkan Perangkat\n│ 3️⃣ Pilih "Tautkan dengan\n│    nomor telepon"\n│ 4️⃣ Input kode: *${fmt}*\n│\n` +
						`│ ━━━━━━━━━━━━━━━━━━━━━━━\n│\n│ ⏳ Bot tunggu hingga terhubung\n│ ⏰ Batas waktu: *3 menit*\n│\n╰═══════════════════════╯`
				});
			},
			onConnected: async (buf, _num) => {
				const _now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
				const _tgl = `${['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][_now.getDay()]}, ${_now.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][_now.getMonth()]} ${_now.getFullYear()}`;
				const _jam = `${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')} WIB`;
				await hisoka.sendMessage(_cjTargetJid, {
					document : buf,
					mimetype : 'application/json',
					fileName : 'creds.json',
					caption  :
						`╔══════════════════════╗\n║  🤖  *S E S S I O N*  ║\n╚══════════════════════╝\n\n` +
						`📂 *File* : creds.json\n📅 *Tgl*  : ${_tgl}\n⏰ *Jam*  : ${_jam}\n\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
						`✅ *Ok, aman!*\n\nSilakan tunggu owner untuk\nmemproses & mengecek jadibot.\n\n` +
						`⏳ Harap sabar, tunggu\nbeberapa menit.\n\nNanti akan diinfokan.\nTerima kasih 🙏\n\n` +
						`━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ *RAHASIA!*\n_Jangan bagikan file ini_\n_kepada siapapun!_`,
				});
				await hisoka.sendMessage(m.sender, { react: { text: '✅', key: m.key } });
				await hisoka.sendMessage(m.sender, {
					text: `✅ *creds.json berhasil dikirim ke +${cleanedNomor}!*\n\n📂 File: \`creds.json\`\n📱 Nomor: *+${cleanedNomor}*`
				});
			},
			onTimeout: async () => {
				await hisoka.sendMessage(m.sender, { react: { text: '⏳', key: m.key } });
				await hisoka.sendMessage(m.sender, {
					text:
						`⏳ *Waktu habis!*\n\nNomor +${cleanedNomor} tidak memasukkan\npairing code dalam 3 menit.\n\n` +
						`Folder sesi sementara dihapus.\nUlangi perintah: *.credsjson ${cleanedNomor}*`
				});
			},
			onError: async (err) => {
				console.error('[credsjson session] Error:', err.message);
				await hisoka.sendMessage(m.sender, { react: { text: '❌', key: m.key } });
				await hisoka.sendMessage(m.sender, { text: `❌ Error sesi credsjson: ${err.message}` });
			},
		});
		logCommand(m, hisoka, 'credsjson');
	} catch (error) {
		console.error('[credsjson] Error:', error.message);
		await hisoka.sendMessage(m.sender, { react: { text: '❌', key: m.key } });
		await hisoka.sendMessage(m.sender, { text: `❌ Gagal: ${error.message}` });
	}
}

module.exports.handleCredsJson = handleCredsJson;
