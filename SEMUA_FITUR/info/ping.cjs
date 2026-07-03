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
 *  ping.cjs — Ping + SpeedTest.net handler
 *  .ping = cek latensi & status bot
 *  .speedtestnet = ukur speed realtime via speedtest.net
 * ───────────────────────────────
 */
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  HANDLER: .ping
// ─────────────────────────────────────────────────────────────────────────────

async function handlePing({ hisoka, m, tolak, logCommand, getBotStats, os }) {
        try {
                const msg = await tolak(hisoka, m, '⏳ _Checking..._');
                const latency = Math.abs(Date.now() - m.messageTimestamp * 1000);
                const stats = getBotStats();
                const sessionUptime = process.uptime();

                const memUsage = process.memoryUsage();
                const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
                const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

                const now = new Date();
                const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

                const jakartaHour = parseInt(now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }));
                let greetingTime, greetingEmoji;
                if (jakartaHour >= 4 && jakartaHour < 11) {
                        greetingTime = 'Pagi';
                        greetingEmoji = '🌅';
                } else if (jakartaHour >= 11 && jakartaHour < 15) {
                        greetingTime = 'Siang';
                        greetingEmoji = '☀️';
                } else if (jakartaHour >= 15 && jakartaHour < 18) {
                        greetingTime = 'Sore';
                        greetingEmoji = '🌇';
                } else {
                        greetingTime = 'Malam';
                        greetingEmoji = '🌙';
                }

                const speedText = latency < 100 ? 'Cepat' : latency < 500 ? 'Normal' : 'Lambat';
                const speedEmoji = latency < 100 ? '🚀' : latency < 500 ? '⚡' : '🐢';

                const sessSeconds = Math.floor(sessionUptime);
                const sessMinutes = Math.floor(sessSeconds / 60);
                const sessHours = Math.floor(sessMinutes / 60);
                const sessDays = Math.floor(sessHours / 24);
                const sessFormatted = `${sessDays}d ${sessHours % 24}h ${sessMinutes % 60}m`;

                const cpuCores = os.cpus().length;
                const cpuModel = os.cpus()[0]?.model?.split(' ')[0] || 'Unknown';
                const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
                const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
                const usedMemGB = (totalMemGB - freeMemGB).toFixed(1);
                const memPercent = ((usedMemGB / totalMemGB) * 100).toFixed(0);
                const nodeVersion = process.version;
                const platform = process.platform;

                const pingText = `
╭═════════════════════╮
║        🏓 *PONG!* 🏓        
├═════════════════════┤
│ 👋 Selamat  » ${greetingTime} ${greetingEmoji}
│ ${speedEmoji} Speed  » ${speedText}
│ ⚡ Latency  » ${latency}ms
│ 🕐 Waktu  » ${timeStr}
│ 📅 Tanggal  » ${dateStr}
├═════════════════════┤
║        📊 *BOT STATUS*        
├═════════════════════┤
│ ⏱️ Uptime  » ${stats.uptime.days}d ${stats.uptime.hours}h ${stats.uptime.minutes}m
│ 🔄 Session  » ${sessFormatted}
│ 🔁 Restart  » ${stats.totalRestarts}x
│ 🟢 Status  » Online
├═════════════════════┤
║        💻 *SYSTEM INFO*        
├═════════════════════┤
│ 🧠 CPU  » ${cpuCores} Core
│ 📟 RAM  » ${usedMemGB}/${totalMemGB}GB (${memPercent}%)
│ 💾 Bot Mem  » ${memUsedMB}MB
│ 🖥️ Platform  » ${platform}
│ 📦 NodeJS  » ${nodeVersion}
╰═════════════════════╯`;

                let ppUrl;
                try {
                        ppUrl = await hisoka.profilePictureUrl(hisoka.user.id, 'image');
                } catch {
                        ppUrl = null;
                }

                if (ppUrl) {
                        await hisoka.sendMessage(m.from, {
                                image: { url: ppUrl },
                                caption: pingText
                        }, { quoted: m });
                } else {
                        await m.reply({ edit: msg.key, text: pingText });
                }

                logCommand(m, hisoka, 'ping');
        } catch (err) {
                console.error('\x1b[31mPing error:\x1b[39m', err.message);
        }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SPEEDTEST.NET ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

const _ST_SERVERS = 'https://www.speedtest.net/api/js/servers?engine=js&https_functional=true&limit=5';

const _ST_HDR = {
        'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept'         : 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer'        : 'https://www.speedtest.net/',
        'Origin'         : 'https://www.speedtest.net',
};

/** Ambil daftar server speedtest.net terdekat */
async function _stGetServers() {
        const { data } = await axios.get(_ST_SERVERS, {
                headers: _ST_HDR,
                timeout: 10000,
        });
        if (!Array.isArray(data) || !data.length) throw new Error('Daftar server kosong');
        return data;
}

/** Dapatkan URL base dari URL server (buang "/upload.php") */
function _stBase(serverUrl) {
        return serverUrl.replace(/\/upload\.php$/i, '/');
}

/** Ukur ping ke satu server (average dari N percobaan) */
async function _stPingServer(baseUrl, tries = 3) {
        const latencies = [];
        for (let i = 0; i < tries; i++) {
                const t0 = Date.now();
                try {
                        await axios.get(`${baseUrl}latency.txt`, {
                                headers       : _ST_HDR,
                                timeout       : 5000,
                                validateStatus: () => true,
                        });
                        latencies.push(Date.now() - t0);
                } catch (_) {}
                if (i < tries - 1) await new Promise(r => setTimeout(r, 150));
        }
        if (!latencies.length) return null;
        latencies.sort((a, b) => a - b);
        return {
                avg   : Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length),
                min   : latencies[0],
                max   : latencies[latencies.length - 1],
                jitter: latencies[latencies.length - 1] - latencies[0],
        };
}

/** Pilih server terbaik berdasarkan rata-rata ping */
async function _stPickBestServer(servers) {
        let best = null, bestPing = Infinity;
        for (const srv of servers) {
                const base = _stBase(srv.url);
                const pg   = await _stPingServer(base, 3);
                if (pg && pg.avg < bestPing) {
                        bestPing = pg.avg;
                        best     = { ...srv, _base: base, _ping: pg };
                }
        }
        return best;
}

/**
 * Ukur kecepatan download dari speedtest.net server.
 * Download gambar random berbagai ukuran secara berurutan,
 * hitung total bit / total waktu.
 */
async function _stDownload(baseUrl) {
        // Ukuran file JPEG acak dari speedtest.net (byte approx)
        const sizes  = [1500, 2000, 2500]; // NxN pixel random JPEG
        let totalBit = 0, totalMs = 0;

        for (const sz of sizes) {
                try {
                        const t0   = Date.now();
                        const resp = await axios.get(
                                `${baseUrl}random${sz}x${sz}.jpg?x=${Date.now()}-0`,
                                {
                                        headers     : _ST_HDR,
                                        timeout     : 20000,
                                        responseType: 'arraybuffer',
                                }
                        );
                        const ms    = Date.now() - t0;
                        const bytes = resp.data.byteLength || 0;
                        if (bytes > 0 && ms > 0) {
                                totalBit += bytes * 8;
                                totalMs  += ms;
                        }
                } catch (_) {
                        break; // server tidak support ukuran ini, hentikan
                }
        }

        if (totalMs === 0) return null;
        return (totalBit / (totalMs / 1000)) / 1_000_000; // Mbps
}

/**
 * Ukur kecepatan upload ke speedtest.net server.
 * POST data acak, hitung throughput.
 */
async function _stUpload(uploadUrl) {
        const uploadSizes = [1_000_000, 2_000_000]; // 1MB + 2MB
        let totalBit = 0, totalMs = 0;

        for (const bytes of uploadSizes) {
                try {
                        const data = Buffer.alloc(bytes, 0x41);
                        const t0   = Date.now();
                        await axios.post(uploadUrl, data, {
                                headers: {
                                        ..._ST_HDR,
                                        'Content-Type'  : 'application/octet-stream',
                                        'Content-Length': bytes,
                                },
                                timeout      : 25000,
                                maxBodyLength: Infinity,
                                validateStatus: () => true,
                        });
                        const ms = Date.now() - t0;
                        if (ms > 0) {
                                totalBit += bytes * 8;
                                totalMs  += ms;
                        }
                } catch (_) {
                        break;
                }
        }

        if (totalMs === 0) return null;
        return (totalBit / (totalMs / 1000)) / 1_000_000;
}

/** Ambil info ISP / IP dari ipinfo.io */
async function _stGetIsp() {
        try {
                const { data } = await axios.get('https://ipinfo.io/json', {
                        headers: { ..._ST_HDR, Accept: 'application/json' },
                        timeout: 5000,
                });
                return {
                        ip  : data?.ip      || '-',
                        isp : data?.org     || '-',
                        kota: data?.city    || '-',
                        neg : data?.country || '-',
                };
        } catch (_) {
                return { ip: '-', isp: '-', kota: '-', neg: '-' };
        }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORMAT OUTPUT (mirip tampilan speedtest.net)
// ─────────────────────────────────────────────────────────────────────────────

function _stFmtMbps(v) {
        if (v === null || v === undefined) return 'Gagal';
        return v >= 1000 ? `${(v / 1000).toFixed(2)} Gbps` : `${v.toFixed(2)} Mbps`;
}
function _stLabelSpeed(v) {
        if (!v) return { e: '❌', t: 'Gagal' };
        if (v >= 100) return { e: '🚀', t: 'Sangat Cepat' };
        if (v >= 50)  return { e: '⚡', t: 'Cepat' };
        if (v >= 20)  return { e: '✅', t: 'Normal' };
        if (v >= 5)   return { e: '🟡', t: 'Lumayan' };
        return              { e: '🐢', t: 'Lambat' };
}
function _stLabelPing(ms) {
        if (!ms && ms !== 0) return { e: '❌', t: 'Gagal' };
        if (ms < 20)  return { e: '🟢', t: 'Excellent' };
        if (ms < 50)  return { e: '🟡', t: 'Bagus' };
        if (ms < 100) return { e: '🟠', t: 'Normal' };
        return              { e: '🔴', t: 'Tinggi' };
}

function _stCaption({ dl, ul, ping, srv, isp, durasi }) {
        const SEP  = '━━━━━━━━━━━━━━━━━━━━';
        const SEP2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

        const dlL   = _stLabelSpeed(dl);
        const ulL   = _stLabelSpeed(ul);
        const pgL   = _stLabelPing(ping?.avg ?? null);
        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        const dlTxt = dl ? `*${_stFmtMbps(dl)}*  ${dlL.e} _${dlL.t}_` : '❌ Gagal';
        const ulTxt = ul ? `*${_stFmtMbps(ul)}*  ${ulL.e} _${ulL.t}_` : '❌ Gagal';

        const pgBaris = ping
                ? `*${ping.avg} ms*  ${pgL.e} _${pgL.t}_\n` +
                  `├ ↘ *Idle*     : ${ping.min} ms\n` +
                  `├ ↓ *Download* : ${ping.avg} ms\n` +
                  `╰ ↑ *Upload*   : ${ping.max} ms`
                : '❌ Gagal';

        const srvName = srv ? `${srv.sponsor} — ${srv.name}, ${srv.country}` : '-';
        const ispName = (isp.isp || '-').replace(/^AS\d+\s*/i, '').slice(0, 32);

        return (
                `🌐 *SPEEDTEST.NET — REALTIME*\n` +
                `${SEP}\n\n` +
                `📥 *Download*\n` +
                `╰ ${dlTxt}\n\n` +
                `📤 *Upload*\n` +
                `╰ ${ulTxt}\n\n` +
                `🏓 *Ping*\n` +
                `╰ ${pgBaris}\n\n` +
                `${SEP}\n` +
                `📋 *Info Koneksi*\n` +
                `${SEP2}\n` +
                `├ 🔗 *Koneksi* : Multi\n` +
                `├ 🌍 *Server*  : ${srvName}\n` +
                `├ 🏢 *ISP*     : ${ispName}\n` +
                `├ 📍 *Kota*    : ${isp.kota}, ${isp.neg}\n` +
                `╰ 🔌 *IP*      : ${isp.ip}\n` +
                `${SEP}\n` +
                `⏱️ _Selesai dalam ${durasi}s · ${waktu} WIB_`
        );
}

/** Buat gambar SVG (mirip layout speedtest.net) */
function _stSvg({ dl, ul, ping, srv, isp, durasi }) {
        const dlV  = dl  ? _stFmtMbps(dl)  : 'N/A';
        const ulV  = ul  ? _stFmtMbps(ul)  : 'N/A';
        const pgV  = ping ? `${ping.avg}` : 'N/A';

        const clr  = (v, isPing = false) => {
                if (v === null) return '#ef4444';
                if (isPing) {
                        if (v < 20)  return '#22c55e';
                        if (v < 50)  return '#84cc16';
                        if (v < 100) return '#eab308';
                        return '#ef4444';
                }
                if (v >= 100) return '#22c55e';
                if (v >= 50)  return '#84cc16';
                if (v >= 20)  return '#eab308';
                if (v >= 5)   return '#f97316';
                return '#ef4444';
        };

        const dlC  = clr(dl);
        const ulC  = clr(ul);
        const pgC  = clr(ping?.avg ?? null, true);

        const dlNum = dl  ? (dl >= 1000  ? `${(dl / 1000).toFixed(2)}`  : `${dl.toFixed(2)}`)  : 'N/A';
        const ulNum = ul  ? (ul >= 1000  ? `${(ul / 1000).toFixed(2)}`  : `${ul.toFixed(2)}`)  : 'N/A';
        const dlUnit = dl  ? (dl >= 1000  ? 'Gbps' : 'Mbps') : '';
        const ulUnit = ul  ? (ul >= 1000  ? 'Gbps' : 'Mbps') : '';

        const barW   = (v, max) => v ? Math.min(144, Math.round((Math.min(v, max) / max) * 144)) : 0;

        const ispName  = (isp.isp || '-').replace(/^AS\d+\s*/i, '').slice(0, 28);
        const srvShort = srv ? `${srv.sponsor}`.slice(0, 26) : 'speedtest.net';
        const lokasi   = [isp.kota, isp.neg].filter(v => v && v !== '-').join(', ') || '-';
        const waktu    = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        return `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg" font-family="Arial,sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0a0a1a"/>
      <stop offset="50%"  stop-color="#141430"/>
      <stop offset="100%" stop-color="#1c1c3a"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)"/>

  <!-- header -->
  <rect x="0" y="0" width="640" height="52" fill="#0d0d22" opacity="0.9"/>
  <circle cx="28" cy="26" r="14" fill="#0d0d22" stroke="#00c8ff" stroke-width="2"/>
  <text x="28" y="31" text-anchor="middle" font-size="14" fill="#00c8ff" font-weight="bold">ST</text>
  <text x="50" y="33" font-size="18" fill="white" font-weight="bold">SPEEDTEST.NET</text>
  <text x="620" y="33" text-anchor="end" font-size="10" fill="#475569">Realtime Speed Test</text>

  <!-- DOWNLOAD card -->
  <rect x="24" y="68" width="184" height="155" rx="14" fill="url(#card)" stroke="${dlC}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="116" y="96" text-anchor="middle" font-size="11" fill="#94a3b8" letter-spacing="2">↓ DOWNLOAD</text>
  <text x="116" y="146" text-anchor="middle" font-size="36" fill="${dlC}" font-weight="bold">${dlNum}</text>
  <text x="116" y="166" text-anchor="middle" font-size="12" fill="${dlC}" opacity="0.8">${dlUnit}</text>
  <rect x="44" y="178" width="${barW(dl, 500)}" height="5" rx="3" fill="${dlC}" opacity="0.7"/>
  <rect x="44" y="178" width="144" height="5" rx="3" fill="none" stroke="${dlC}" stroke-width="1" opacity="0.2"/>
  <text x="116" y="207" text-anchor="middle" font-size="11" fill="${dlC}">${_stLabelSpeed(dl).t}</text>

  <!-- UPLOAD card -->
  <rect x="228" y="68" width="184" height="155" rx="14" fill="url(#card)" stroke="${ulC}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="320" y="96" text-anchor="middle" font-size="11" fill="#94a3b8" letter-spacing="2">↑ UPLOAD</text>
  <text x="320" y="146" text-anchor="middle" font-size="36" fill="${ulC}" font-weight="bold">${ulNum}</text>
  <text x="320" y="166" text-anchor="middle" font-size="12" fill="${ulC}" opacity="0.8">${ulUnit}</text>
  <rect x="248" y="178" width="${barW(ul, 500)}" height="5" rx="3" fill="${ulC}" opacity="0.7"/>
  <rect x="248" y="178" width="144" height="5" rx="3" fill="none" stroke="${ulC}" stroke-width="1" opacity="0.2"/>
  <text x="320" y="207" text-anchor="middle" font-size="11" fill="${ulC}">${_stLabelSpeed(ul).t}</text>

  <!-- PING card -->
  <rect x="432" y="68" width="184" height="155" rx="14" fill="url(#card)" stroke="${pgC}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="524" y="96" text-anchor="middle" font-size="11" fill="#94a3b8" letter-spacing="2">PING</text>
  <text x="524" y="146" text-anchor="middle" font-size="36" fill="${pgC}" font-weight="bold">${pgV}</text>
  <text x="524" y="166" text-anchor="middle" font-size="12" fill="${pgC}" opacity="0.8">ms</text>
  <text x="481" y="191" text-anchor="middle" font-size="9"  fill="#64748b">IDLE</text>
  <text x="481" y="204" text-anchor="middle" font-size="11" fill="${pgC}">${ping ? ping.min+'ms' : '-'}</text>
  <text x="524" y="191" text-anchor="middle" font-size="9"  fill="#64748b">DL</text>
  <text x="524" y="204" text-anchor="middle" font-size="11" fill="${pgC}">${ping ? ping.avg+'ms' : '-'}</text>
  <text x="567" y="191" text-anchor="middle" font-size="9"  fill="#64748b">UL</text>
  <text x="567" y="204" text-anchor="middle" font-size="11" fill="${pgC}">${ping ? ping.max+'ms' : '-'}</text>
  <text x="524" y="215" text-anchor="middle" font-size="10" fill="${pgC}">${_stLabelPing(ping?.avg ?? null).t}</text>

  <!-- info bar bawah -->
  <rect x="0" y="242" width="640" height="118" fill="#070715" opacity="0.7"/>
  <line x1="0" y1="242" x2="640" y2="242" stroke="#00c8ff" stroke-width="1" opacity="0.25"/>

  <!-- row 1: Connections + ISP + IP -->
  <text x="32"  y="266" font-size="9"  fill="#64748b">CONNECTIONS</text>
  <text x="32"  y="281" font-size="12" fill="#e2e8f0" font-weight="bold">Multi</text>

  <text x="170" y="266" font-size="9"  fill="#64748b">ISP</text>
  <text x="170" y="281" font-size="12" fill="#e2e8f0" font-weight="bold">${ispName}</text>

  <text x="450" y="266" font-size="9"  fill="#64748b">IP ADDRESS</text>
  <text x="450" y="281" font-size="12" fill="#e2e8f0">${isp.ip}</text>

  <line x1="24" y1="295" x2="616" y2="295" stroke="#1e293b" stroke-width="1"/>

  <!-- row 2: Server + Kota + Durasi -->
  <text x="32"  y="314" font-size="9"  fill="#64748b">SERVER</text>
  <text x="32"  y="328" font-size="11" fill="#94a3b8">${srvShort}</text>

  <text x="310" y="314" font-size="9"  fill="#64748b">KOTA</text>
  <text x="310" y="328" font-size="11" fill="#94a3b8">${lokasi}</text>

  <text x="530" y="314" font-size="9"  fill="#64748b">DURASI</text>
  <text x="530" y="328" font-size="11" fill="#94a3b8">${durasi}s</text>

  <text x="320" y="352" text-anchor="middle" font-size="10" fill="#334155">${waktu} WIB · WILY BOT</text>
</svg>`;
}

async function _stBuatGambar(data) {
        const sharp = require('sharp');
        return sharp(Buffer.from(_stSvg(data))).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
//  HANDLER: .speedtestnet
// ─────────────────────────────────────────────────────────────────────────────

async function handleSpeedtestnet({ hisoka, m, tolak, logCommand }) {
        let msg;
        try {
                // ── Pesan status awal ─────────────────────────────────────
                msg = await m.reply('🌐 _Menghubungi speedtest.net..._');

                const t0 = Date.now();

                // ── 1. Ambil info ISP (paralel dengan cari server) ─────────
                const [ispInfo, servers] = await Promise.all([
                        _stGetIsp(),
                        _stGetServers(),
                ]);

                await hisoka.sendMessage(m.from, {
                        edit: msg.key,
                        text: '🔍 _Memilih server terbaik... (mohon tunggu)_',
                });

                // ── 2. Pilih server terbaik berdasarkan ping ───────────────
                const srv = await _stPickBestServer(servers);
                if (!srv) throw new Error('Tidak ada server yang bisa dihubungi');

                await hisoka.sendMessage(m.from, {
                        edit: msg.key,
                        text: `⚡ _Server: ${srv.sponsor} (${srv.name})_\n📥 _Mengukur download..._`,
                });

                // ── 3. Download test ───────────────────────────────────────
                const dlMbps = await _stDownload(srv._base);

                await hisoka.sendMessage(m.from, {
                        edit: msg.key,
                        text: `📥 _Download: ${dlMbps ? _stFmtMbps(dlMbps) : 'Gagal'}_\n📤 _Mengukur upload..._`,
                });

                // ── 4. Upload test ─────────────────────────────────────────
                const ulMbps = await _stUpload(srv.url);

                // ── 5. Hitung durasi total ─────────────────────────────────
                const durasi = ((Date.now() - t0) / 1000).toFixed(1);

                // ── 6. Build data hasil ────────────────────────────────────
                const hasil = {
                        dl    : dlMbps,
                        ul    : ulMbps,
                        ping  : srv._ping,
                        srv,
                        isp   : ispInfo,
                        durasi,
                };

                // ── 7. Buat gambar SVG + caption ───────────────────────────
                const [imgBuf, caption] = await Promise.all([
                        _stBuatGambar(hasil),
                        Promise.resolve(_stCaption(hasil)),
                ]);

                // ── 8. Hapus pesan status, kirim hasil ────────────────────
                await hisoka.sendMessage(m.from, { delete: msg.key });
                await hisoka.sendMessage(m.from, {
                        image  : imgBuf,
                        mimetype: 'image/png',
                        caption,
                }, { quoted: m });

                logCommand(m, hisoka, 'speedtestnet');

        } catch (err) {
                console.error('\x1b[31m[speedtestnet] Error:\x1b[39m', err.message);
                const errMsg = `❌ *Speedtest gagal*\n\`${err.message}\``;
                if (msg?.key) {
                        await hisoka.sendMessage(m.from, { edit: msg.key, text: errMsg });
                } else {
                        await m.reply(errMsg);
                }
        }
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
        handlePing,
        handleSpeedtestnet,
};
