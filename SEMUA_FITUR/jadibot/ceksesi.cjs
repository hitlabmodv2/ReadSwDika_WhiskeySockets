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
 *  ceksesi.cjs — Cek status sesi Baileys (.ceksesi)
 *  Info file sesi, ukuran, jumlah key, aktif atau tidak
 * ───────────────────────────────
 */
'use strict';

/**
 * cekSesi — tampilkan info detail sessions/hisoka.json
 * Bekerja dengan format SINGLE FILE JSON (bukan multi-file folder).
 *
 * Output: breakdown per kategori key, ukuran, dan saran pruning
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const SESSION_FILE = path.resolve('./sessions/hisoka.json');

function byteSize(obj) {
        return Buffer.byteLength(JSON.stringify(obj));
}

function fmtKB(bytes) {
        return (bytes / 1024).toFixed(1) + ' KB';
}

function fmtMB(bytes) {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

const EMOJI_MAP = {
        'creds':                   '🛡️',
        'contacts':                '👥',
        'groups':                  '🫂',
        'settings':                '⚙️',
        'pre-key':                 '🗝️',
        'session':                 '🔑',
        'sender-key':              '📨',
        'identity-key':            '🪪',
        'device-list':             '📱',
        'lid-mapping':             '🗺️',
        'app-state-sync-key':      '🔄',
        'app-state-sync-version':  '📋',
        'tctoken':                 '🎫',
};

const DESC_MAP = {
        'creds':                   'Kredensial utama bot — JANGAN hapus',
        'contacts':                'Cache kontak — aman dihapus (auto re-populate)',
        'groups':                  'Cache data grup — aman dihapus (auto re-fetch)',
        'settings':                'Pengaturan sesi lokal',
        'pre-key':                 'Kunci E2E — aman trim (sisakan 100 terbaru)',
        'session':                 'Sesi aktif per kontak — jangan hapus sembarangan',
        'sender-key':              'Kunci enkripsi grup — aman dihapus (auto re-gen)',
        'identity-key':            'Identitas kontak (Signal) — jangan hapus',
        'device-list':             'Daftar perangkat kontak — aman dihapus',
        'lid-mapping':             'Cache LID→PN — aman dihapus (auto re-fetch)',
        'app-state-sync-key':      'Sync state WA — jangan hapus',
        'app-state-sync-version':  'Versi sync state — aman dihapus (auto re-sync)',
        'tctoken':                 'Token cache — aman dihapus',
};

const SAFE_DELETE = new Set([
        'contacts', 'groups', 'lid-mapping', 'sender-key',
        'app-state-sync-version', 'tctoken',
]);

const SAFE_TRIM = new Set(['pre-key']);

function cekSesi() {
        if (!fs.existsSync(SESSION_FILE)) throw new Error('SESSION_NOT_FOUND');

        const raw     = fs.readFileSync(SESSION_FILE, 'utf8');
        const data    = JSON.parse(raw);
        const fileSizeByte = Buffer.byteLength(raw);

        const rows = [];

        // creds (flat object)
        if (data.creds) {
                rows.push({
                        key:   'creds',
                        count: Object.keys(data.creds).length + ' field',
                        bytes: byteSize(data.creds),
                        safe:  'KEEP',
                });
        }

        // keys sub-object
        if (data.keys && typeof data.keys === 'object') {
                for (const subKey of Object.keys(data.keys)) {
                        const obj   = data.keys[subKey] || {};
                        const count = Object.keys(obj).length;
                        const bytes = byteSize(obj);
                        let safe = 'KEEP';
                        if (SAFE_DELETE.has(subKey)) safe = 'HAPUS';
                        if (SAFE_TRIM.has(subKey))   safe = 'TRIM';
                        rows.push({ key: subKey, count: count + ' entri', bytes, safe });
                }
        }

        // contacts top-level
        if (data.contacts) {
                const count = Object.keys(data.contacts).length;
                rows.push({ key: 'contacts', count: count + ' kontak', bytes: byteSize(data.contacts), safe: 'HAPUS' });
        }

        // groups top-level
        if (data.groups) {
                const count = Object.keys(data.groups).length;
                rows.push({ key: 'groups', count: count + ' grup', bytes: byteSize(data.groups), safe: 'HAPUS' });
        }

        // settings top-level
        if (data.settings) {
                rows.push({ key: 'settings', count: '1 obj', bytes: byteSize(data.settings), safe: 'KEEP' });
        }

        // Hitung potensi hemat
        let potentialSave = 0;
        for (const r of rows) {
                if (r.safe === 'HAPUS') potentialSave += r.bytes;
                if (r.safe === 'TRIM')  potentialSave += Math.max(0, r.bytes - Math.round(r.bytes * (100 / Math.max(1, parseInt(r.count)))));
        }

        // Sort: HAPUS & TRIM dulu (terbesar), lalu KEEP
        rows.sort((a, b) => {
                const order = { 'HAPUS': 0, 'TRIM': 1, 'KEEP': 2 };
                if (order[a.safe] !== order[b.safe]) return order[a.safe] - order[b.safe];
                return b.bytes - a.bytes;
        });

        return {
                rows,
                fileSizeByte,
                fmtFileSize: fmtMB(fileSizeByte),
                fmtKB,
                fmtMB,
                SESSION_FILE,
        };
}

module.exports = { cekSesi };

// ── HANDLER: memory ───────────────────────────────────────────────────────────

function msToTime(ms) {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
        if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
        if (m > 0) return `${m}m ${s % 60}s`;
        return `${s}s`;
}

async function handleMemory({ hisoka, m, tolak, logCommand }) {
        try {
                const memMonitor = global.memoryMonitor;
                if (!memMonitor) { await tolak(hisoka, m, 'Memory monitor tidak tersedia.'); return; }
                const status = memMonitor.getStatus();
                const uptime = process.uptime();
                let text = `╭═══『 *💾 MEMORY STATUS* 』═══╮\n`;
                text += `│\n│ *📊 Process Memory*\n│ • Current: ${status.currentFormatted}\n│ • Limit: ${status.limitFormatted}\n│ • Usage: ${status.percentage}%\n│\n`;
                text += `│ *🔧 Heap Memory*\n│ • Total: ${status.heap.totalFormatted}\n│ • Used: ${status.heap.usedFormatted}\n│\n`;
                text += `│ *🖥️ System Memory (Server)*\n│ • Total: ${status.system.totalFormatted}\n│ • Used: ${status.system.usedFormatted}\n│ • Free: ${status.system.freeFormatted}\n│\n`;
                text += `│ *⚙️ Monitor Config*\n│ • Enabled: ${status.enabled ? '✅ Yes' : '❌ No'}\n│ • Auto Detect: ${status.autoDetect ? '✅ ' + status.autoDetectPercentage + '%' : '❌ Manual'}\n│ • Check Interval: ${status.checkInterval / 1000}s\n│ • Log Usage: ${status.logUsage ? '✅ Yes' : '❌ No'}\n│ • Uptime: ${msToTime(uptime * 1000)}\n│\n`;
                text += `╰═════════════════════╯`;
                if (parseFloat(status.percentage) >= 80) text += `\n\n⚠️ *Warning:* Memory usage tinggi! Auto-restart akan terjadi jika mencapai limit.`;
                await tolak(hisoka, m, text);
                logCommand(m, hisoka, 'memory');
        } catch (error) {
                console.error('\x1b[31m[Memory] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports.handleMemory = handleMemory;

// ── HANDLER: ram ──────────────────────────────────────────────────────────────

async function handleRam({ hisoka, m, tolak, logCommand }) {
        try {
                const { formatBytes, getCurrentMemoryUsage, getSystemMemoryInfo, formatUptime } = await import('../../src/helper/memoryMonitor.js');

                const memUsage  = getCurrentMemoryUsage();
                const systemMem = getSystemMemoryInfo();
                const memLimit  = global.memoryMonitor?.memoryLimit || systemMem.total;

                const percentage       = ((memUsage.rss / memLimit) * 100).toFixed(1);
                const systemPercentage = ((systemMem.used / systemMem.total) * 100).toFixed(1);

                let statusIcon = '✅', statusText = 'Normal';
                const pct = parseFloat(percentage);
                if (pct >= 80) { statusIcon = '🔴'; statusText = 'Kritis!'; }
                else if (pct >= 60) { statusIcon = '⚠️'; statusText = 'Waspada'; }

                const heapUsedMB  = (memUsage.heapUsed  / (1024 * 1024)).toFixed(1);
                const heapTotalMB = (memUsage.heapTotal / (1024 * 1024)).toFixed(1);
                const extMB       = (memUsage.external  / (1024 * 1024)).toFixed(1);

                const loadAvg  = os.loadavg().map((n) => n.toFixed(2)).join(', ');
                const cpuCount = os.cpus()?.length || 0;
                const uptime   = formatUptime(process.uptime() * 1000);

                const barLen  = 10;
                const filled  = Math.round((pct / 100) * barLen);
                const bar     = '█'.repeat(Math.min(filled, barLen)) + '░'.repeat(Math.max(barLen - filled, 0));

                let text = `╭═══『 *RAM STATUS* 』═══╮\n`
                        + `│ ${statusIcon} Status: *${statusText}*\n`
                        + `│\n`
                        + `│ *Process Memory (Bot)*\n`
                        + `│ ${formatBytes(memUsage.rss)} / ${formatBytes(memLimit)}\n`
                        + `│ Usage: ${percentage}% [${bar}]\n`
                        + `│\n`
                        + `│ *Heap Memory*\n`
                        + `│ ${heapUsedMB} MB / ${heapTotalMB} MB total\n`
                        + `│ External: ${extMB} MB\n`
                        + `│\n`
                        + `│ *System Memory*\n`
                        + `│ ${formatBytes(systemMem.used)} / ${formatBytes(systemMem.total)}\n`
                        + `│ Free: ${formatBytes(systemMem.free)}\n`
                        + `│ Usage: ${systemPercentage}%\n`
                        + `│\n`
                        + `│ *CPU*\n`
                        + `│ Load: ${loadAvg} (1/5/15m)\n`
                        + `│ Core: ${cpuCount}\n`
                        + `│\n`
                        + `│ *Proses*\n`
                        + `│ PID: ${process.pid}\n`
                        + `│ Node: ${process.version}\n`
                        + `│ Uptime: ${uptime}\n`
                        + `╰═════════════════════╯`;

                if (pct >= 80) text += `\n\n⚠️ *Warning:* Memory usage tinggi! Auto-restart akan terjadi jika mencapai limit.`;

                await tolak(hisoka, m, text);
                logCommand(m, hisoka, 'cekram');
        } catch (error) {
                console.error('\x1b[31m[CekRAM] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports.handleRam = handleRam;

// ── HANDLER: sessionstat ──────────────────────────────────────────────────────

async function handleSessionstat({ hisoka, m, fs, path, logCommand }) {
        if (!m.isOwner) return;
        try {
                const readSessionStats = (sessionDir) => {
                        const credsPath = path.join(sessionDir, 'creds.json');
                        if (!fs.existsSync(credsPath)) return null;
                        const files        = fs.readdirSync(sessionDir);
                        const preKeys      = files.filter(f => f.startsWith('pre-key-')    && f.endsWith('.json')).length;
                        const sessionFiles = files.filter(f => f.startsWith('session-')    && f.endsWith('.json')).length;
                        const senderKeys   = files.filter(f => f.startsWith('sender-key-') && f.endsWith('.json')).length;
                        let totalSize = 0;
                        for (const f of files) { try { totalSize += fs.statSync(path.join(sessionDir, f)).size; } catch {} }
                        return { preKeys, sessionFiles, senderKeys, totalFiles: files.length, totalSize };
                };
                const formatSize = (bytes) => {
                        if (bytes < 1024)            return `${bytes} B`;
                        if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
                        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
                };
                const mainStats = readSessionStats(global.sessionDir);
                const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

                let out = `╭═══════════════════════╮\n║   🗄️ *SESSION STATS*   \n╠═══════════════════════╣\n│ 🕐 _Realtime: ${now} WIB_\n╠═══════════════════════╣\n║   📦 *MAIN SESSION*   \n╠═══════════════════════╣\n`;
                if (!mainStats) {
                        out += `│ ⚠️ creds.json belum ada\n`;
                } else {
                        out += `│ ✅ Creds      » Tersimpan\n│ 🔑 Pre-Keys   » ${mainStats.preKeys} file\n│ 📋 Sessions   » ${mainStats.sessionFiles} file\n│ 🗝️ Sender-Keys » ${mainStats.senderKeys} file\n│ 📁 Total Files» ${mainStats.totalFiles}\n│ 💾 Total Size » ${formatSize(mainStats.totalSize)}\n`;
                }

                const jadibotDir = path.join(process.cwd(), 'jadibot');
                if (fs.existsSync(jadibotDir)) {
                        const jadibotSessions = fs.readdirSync(jadibotDir).filter(n => fs.existsSync(path.join(jadibotDir, n, 'creds.json')));
                        if (jadibotSessions.length > 0) {
                                out += `╠═══════════════════════╣\n║   🤖 *JADIBOT SESSIONS*   \n╠═══════════════════════╣\n│ 📱 Total » ${jadibotSessions.length} sesi\n├───────────────────────┤\n`;
                                let totalSize = 0;
                                for (const num of jadibotSessions) {
                                        const jStats = readSessionStats(path.join(jadibotDir, num));
                                        if (jStats) {
                                                totalSize += jStats.totalSize;
                                                const shortNum = num.replace(/^62/, '0').slice(0, 12) + '..';
                                                out += `│  📞 ${shortNum} » ${jStats.totalFiles} files (${formatSize(jStats.totalSize)})\n`;
                                        }
                                }
                                out += `├───────────────────────┤\n│ 💾 Total Size » ${formatSize(totalSize)}\n`;
                        }
                }
                out += `╰═══════════════════════╯`;
                await m.reply(out);
                logCommand(m, hisoka, 'dbstats');
        } catch (err) {
                await m.reply(`❌ Error baca DB stats:\n${err.message}`);
        }
}

module.exports.handleSessionstat = handleSessionstat;

// ── HANDLER: ceksesi ──────────────────────────────────────────────────────────

async function handleCeksesi({ hisoka, m, tolak, logCommand, getJadibotNumber, jadibotSesiReportMap }) {
        const _csekIsJadibot = hisoka?.isMainBot === false;
        if (!m.isOwner && !_csekIsJadibot) return tolak(hisoka, m, '❌ Perintah ini hanya untuk owner!');

        const _csekJadibotNum = _csekIsJadibot ? getJadibotNumber(hisoka) : null;
        const reportFn = _csekIsJadibot
                ? jadibotSesiReportMap.get(_csekJadibotNum)
                : global.__getSesiReport;

        if (!reportFn) {
                return tolak(hisoka, m, '❌ Fungsi cekSesi tidak tersedia. Coba restart bot terlebih dahulu.');
        }

        const sessionLabel = _csekIsJadibot
                ? `jadibot/${_csekJadibotNum}.json`
                : `sessions/hisoka.json`;

        try {
                const result = reportFn();

                const EMOJI_MAP = {
                        'creds':                  '🛡️',
                        'contacts':               '👥',
                        'groups':                 '🫂',
                        'settings':               '⚙️',
                        'pre-key':                '🗝️',
                        'session':                '🔑',
                        'sender-key':             '📨',
                        'identity-key':           '🪪',
                        'device-list':            '📱',
                        'lid-mapping':            '🗺️',
                        'app-state-sync-key':     '🔄',
                        'app-state-sync-version': '📋',
                        'tctoken':                '🎫',
                };
                const DESC_MAP = {
                        'creds':                  'Kredensial utama bot — JANGAN hapus',
                        'contacts':               'Cache kontak — aman dihapus (auto re-populate)',
                        'groups':                 'Cache data grup — aman dihapus (auto re-fetch)',
                        'settings':               'Pengaturan sesi lokal',
                        'pre-key':                'Kunci E2E — aman trim (sisakan 100 terbaru)',
                        'session':                'Sesi aktif per kontak — jangan hapus sembarangan',
                        'sender-key':             'Kunci enkripsi grup — aman dihapus (auto re-gen)',
                        'identity-key':           'Identitas kontak (Signal) — jangan hapus',
                        'device-list':            'Daftar perangkat kontak — aman dihapus',
                        'lid-mapping':            'Cache LID→PN — aman dihapus (auto re-fetch)',
                        'app-state-sync-key':     'Sync state WA — jangan hapus',
                        'app-state-sync-version': 'Versi sync state — aman dihapus (auto re-sync)',
                        'tctoken':                'Token cache — aman dihapus',
                };
                const SAFE_LABEL = { 'HAPUS': '✂️ HAPUS', 'TRIM': '✂️ TRIM', 'KEEP': '🔒 KEEP' };

                const lines = result.rows.map(r => {
                        const emoji = EMOJI_MAP[r.key] || '📄';
                        const desc  = DESC_MAP[r.key]  || 'Key sesi lainnya';
                        const kb    = result.fmtKB(r.bytes);
                        const tag   = SAFE_LABEL[r.safe] || r.safe;
                        return `${emoji} *${r.key}*  [${tag}]\n` +
                               `│  ├ ${r.count} · ${kb}\n` +
                               `│  └ _${desc}_`;
                });

                const potensial = result.rows
                        .filter(r => r.safe === 'HAPUS')
                        .reduce((a, r) => a + r.bytes, 0);
                const trimSaved = result.rows
                        .filter(r => r.safe === 'TRIM')
                        .reduce((a, r) => {
                                const cnt = parseInt(r.count);
                                if (cnt <= 100) return a;
                                return a + Math.round(r.bytes * (1 - 100 / cnt));
                        }, 0);

                const teks =
                        `╭─「 🗂️ *CEK SESI* 」\n` +
                        `│  📂 ${sessionLabel} · ${result.fmtFileSize}\n` +
                        `│  _💡 Data realtime dari memory (akurat)_\n` +
                        `│\n` +
                        `├─ ` + lines.join('\n├─ ') + `\n` +
                        `│\n` +
                        `├─ 💾 *Ukuran sesi :* ${result.fmtFileSize}\n` +
                        `├─ 🧹 *Potensi hemat :* ~${result.fmtMB(potensial + trimSaved)} (ketik .clearsesi)\n` +
                        `╰─ 🕐 ${new Date().toLocaleString('id-ID')}`;

                await m.reply(teks);
                logCommand(m, hisoka, 'ceksesi');
        } catch (e) {
                return tolak(hisoka, m, `❌ Gagal baca sesi: ${e.message}`);
        }
}

module.exports.handleCeksesi = handleCeksesi;
