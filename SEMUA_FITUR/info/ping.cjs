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
 *  ping.cjs — .ping via speedtest.net realtime
 *  Jalankan speed test nyata ke server speedtest.net,
 *  hasilkan gambar mirip tampilan speedtest.net/result.
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

// ─────────────────────────────────────────────────────────────────────────────
//  KONSTANTA
// ─────────────────────────────────────────────────────────────────────────────

const ST_SERVERS_URL = 'https://www.speedtest.net/api/js/servers?engine=js&https_functional=true&limit=5';

const ST_HDR = {
        'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept'         : 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer'        : 'https://www.speedtest.net/',
        'Origin'         : 'https://www.speedtest.net',
};

// ─────────────────────────────────────────────────────────────────────────────
//  ENGINE SPEEDTEST.NET
// ─────────────────────────────────────────────────────────────────────────────

/** Ambil URL base dari URL server (buang trailing "/upload.php") */
function stBase(url) {
        return url.replace(/\/upload\.php$/i, '/');
}

/** Ambil daftar server terdekat dari speedtest.net */
async function stGetServers() {
        const { data } = await axios.get(ST_SERVERS_URL, { headers: ST_HDR, timeout: 10000 });
        if (!Array.isArray(data) || !data.length) throw new Error('Daftar server speedtest.net kosong');
        return data;
}

/** Ukur ping ke satu server — return { avg, min, max, jitter } */
async function stPingServer(baseUrl, tries = 3) {
        const times = [];
        for (let i = 0; i < tries; i++) {
                const t0 = Date.now();
                try {
                        await axios.get(`${baseUrl}latency.txt`, {
                                headers       : ST_HDR,
                                timeout       : 5000,
                                validateStatus: () => true,
                        });
                        times.push(Date.now() - t0);
                } catch (_) {}
                if (i < tries - 1) await new Promise(r => setTimeout(r, 150));
        }
        if (!times.length) return null;
        times.sort((a, b) => a - b);
        const avg    = Math.round(times.reduce((s, v) => s + v, 0) / times.length);
        const min    = times[0];
        const max    = times[times.length - 1];
        const jitter = max - min;
        return { avg, min, max, jitter };
}

/** Pilih server terbaik (ping rata-rata terkecil) dari daftar */
async function stPickBest(servers) {
        let best = null, bestAvg = Infinity;
        for (const srv of servers) {
                const base = stBase(srv.url);
                const pg   = await stPingServer(base, 3);
                if (pg && pg.avg < bestAvg) {
                        bestAvg = pg.avg;
                        best    = { ...srv, _base: base, _ping: pg };
                }
        }
        return best;
}

/** Ukur download dari speedtest.net server (random JPEG, multi-ukuran) */
async function stDownload(baseUrl) {
        const sizes = [1500, 2000, 2500]; // pixel NxN random JPEG
        let totalBit = 0, totalMs = 0;
        for (const sz of sizes) {
                try {
                        const t0   = Date.now();
                        const resp = await axios.get(
                                `${baseUrl}random${sz}x${sz}.jpg?x=${Date.now()}-0`,
                                { headers: ST_HDR, timeout: 20000, responseType: 'arraybuffer' }
                        );
                        const ms    = Date.now() - t0;
                        const bytes = resp.data.byteLength || 0;
                        if (bytes > 0 && ms > 0) { totalBit += bytes * 8; totalMs += ms; }
                } catch (_) { break; }
        }
        if (!totalMs) return null;
        return (totalBit / (totalMs / 1000)) / 1_000_000;
}

/** Ukur upload ke speedtest.net server */
async function stUpload(uploadUrl) {
        const uploadSizes = [1_000_000, 2_000_000];
        let totalBit = 0, totalMs = 0;
        for (const bytes of uploadSizes) {
                try {
                        const data = Buffer.alloc(bytes, 0x41);
                        const t0   = Date.now();
                        await axios.post(uploadUrl, data, {
                                headers: {
                                        ...ST_HDR,
                                        'Content-Type'  : 'application/octet-stream',
                                        'Content-Length': bytes,
                                },
                                timeout      : 25000,
                                maxBodyLength: Infinity,
                                validateStatus: () => true,
                        });
                        const ms = Date.now() - t0;
                        if (ms > 0) { totalBit += bytes * 8; totalMs += ms; }
                } catch (_) { break; }
        }
        if (!totalMs) return null;
        return (totalBit / (totalMs / 1000)) / 1_000_000;
}

/** Ambil info ISP / IP dari ipinfo.io */
async function stGetIsp() {
        try {
                const { data } = await axios.get('https://ipinfo.io/json', {
                        headers: { ...ST_HDR, Accept: 'application/json' },
                        timeout: 6000,
                });
                return {
                        ip      : data?.ip       || '-',
                        ispRaw  : data?.org      || '-',
                        isp     : (data?.org     || '-').replace(/^AS\d+\s*/i, '').trim().slice(0, 32),
                        kota    : data?.city     || '-',
                        negara  : data?.country  || '-',
                        hostname: data?.hostname || '-',
                };
        } catch (_) {
                return { ip: '-', ispRaw: '-', isp: '-', kota: '-', negara: '-', hostname: '-' };
        }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORMAT ANGKA
// ─────────────────────────────────────────────────────────────────────────────

function fmtMbps(v) {
        if (v === null || v === undefined) return null;
        return v >= 1000
                ? { num: (v / 1000).toFixed(2), unit: 'Gbps', raw: v }
                : { num: v.toFixed(2),           unit: 'Mbps', raw: v };
}

function pingColor(ms) {
        if (!ms && ms !== 0) return '#94a3b8';
        if (ms < 20)  return '#fbbf24'; // yellow  (excellent → kuning di speedtest.net)
        if (ms < 50)  return '#22d3ee'; // cyan
        if (ms < 100) return '#f97316'; // orange
        return '#ef4444';               // red
}

function speedColor(mbps) {
        if (!mbps) return '#64748b';
        if (mbps >= 100) return '#22c55e';
        if (mbps >= 50)  return '#84cc16';
        if (mbps >= 20)  return '#38bdf8';
        if (mbps >= 5)   return '#f59e0b';
        return '#ef4444';
}

// ─────────────────────────────────────────────────────────────────────────────
//  SVG GENERATOR — mirip tampilan speedtest.net/result
// ─────────────────────────────────────────────────────────────────────────────

function buildSvg({ dl, ul, pingIdle, pingDl, pingUl, srv, isp, durasi }) {
        const dlF = fmtMbps(dl);
        const ulF = fmtMbps(ul);

        const dlNum  = dlF ? dlF.num  : 'N/A';
        const ulNum  = ulF ? ulF.num  : 'N/A';
        const dlUnit = dlF ? dlF.unit : '';
        const ulUnit = ulF ? ulF.unit : '';

        const dlC = speedColor(dl);
        const ulC = speedColor(ul);

        const pgIdleC = pingColor(pingIdle);
        const pgDlC   = pingColor(pingDl);
        const pgUlC   = pingColor(pingUl);

        const ispName   = (isp.isp || '-').slice(0, 28);
        const kotaName  = isp.kota || '-';
        const srvSponsor = (srv?.sponsor || 'speedtest.net').slice(0, 28);
        const srvCity    = (srv?.name    || '-').slice(0, 20);
        const ipAddr     = isp.ip || '-';

        const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        // Warna background persis seperti speedtest.net (dark navy-gray)
        return `<svg width="700" height="480" xmlns="http://www.w3.org/2000/svg" font-family="'Helvetica Neue',Arial,sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#16213e"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#1e2a45" stop-opacity="1"/>
      <stop offset="100%" stop-color="#172035" stop-opacity="1"/>
    </linearGradient>
    <!-- circle clip for ping bubbles -->
    <clipPath id="circ1"><circle cx="195" cy="235" r="26"/></clipPath>
    <clipPath id="circ2"><circle cx="280" cy="235" r="26"/></clipPath>
    <clipPath id="circ3"><circle cx="365" cy="235" r="26"/></clipPath>
  </defs>

  <!-- background -->
  <rect width="700" height="480" fill="url(#bg)"/>

  <!-- top logo bar -->
  <rect x="0" y="0" width="700" height="52" fill="#111827" opacity="0.9"/>
  <!-- Speedtest logo text -->
  <circle cx="32" cy="26" r="14" fill="#141d2e" stroke="#00c8ff" stroke-width="2"/>
  <text x="32" y="31" text-anchor="middle" font-size="12" fill="#00c8ff" font-weight="bold">ST</text>
  <text x="54" y="19" font-size="10" fill="#94a3b8">SPEEDTEST</text>
  <text x="54" y="34" font-size="17" fill="white" font-weight="bold">by Ookla</text>
  <!-- result id label -->
  <text x="668" y="22" text-anchor="end" font-size="9" fill="#64748b">Result</text>
  <text x="668" y="36" text-anchor="end" font-size="10" fill="#38bdf8">${waktu} WIB</text>

  <!-- main card -->
  <rect x="24" y="68" width="652" height="330" rx="16" fill="url(#panel)" stroke="#2d3f60" stroke-width="1.2"/>

  <!-- ── DOWNLOAD / UPLOAD headers ─────────────────────── -->
  <!-- DL arrow icon area -->
  <text x="185" y="106" text-anchor="middle" font-size="11" fill="#38bdf8" letter-spacing="1">↓ DOWNLOAD</text>
  <text x="185" y="120" text-anchor="middle" font-size="9"  fill="#94a3b8">Mbps</text>

  <!-- UL arrow icon area -->
  <text x="515" y="106" text-anchor="middle" font-size="11" fill="#a78bfa" letter-spacing="1">↑ UPLOAD</text>
  <text x="515" y="120" text-anchor="middle" font-size="9"  fill="#94a3b8">Mbps</text>

  <!-- vertical divider between DL and UL -->
  <line x1="350" y1="88" x2="350" y2="220" stroke="#2d3f60" stroke-width="1.2"/>

  <!-- ── BIG NUMBERS ──────────────────────────────────── -->
  <text x="185" y="186" text-anchor="middle" font-size="60" fill="${dlC}" font-weight="bold">${dlNum}</text>
  <text x="515" y="186" text-anchor="middle" font-size="60" fill="${ulC}" font-weight="bold">${ulNum}</text>

  <!-- unit below numbers -->
  <text x="185" y="208" text-anchor="middle" font-size="13" fill="${dlC}" opacity="0.75">${dlUnit}</text>
  <text x="515" y="208" text-anchor="middle" font-size="13" fill="${ulC}" opacity="0.75">${ulUnit}</text>

  <!-- ── PING ROW ───────────────────────────────────────── -->
  <text x="48" y="247" font-size="11" fill="#94a3b8">Ping ms</text>

  <!-- ping bubble idle -->
  <circle cx="195" cy="235" r="26" fill="#1e2a45" stroke="${pgIdleC}" stroke-width="2"/>
  <text x="195" y="231" text-anchor="middle" font-size="8" fill="${pgIdleC}">●</text>
  <text x="195" y="244" text-anchor="middle" font-size="14" fill="${pgIdleC}" font-weight="bold">${pingIdle ?? '-'}</text>

  <!-- ping bubble download -->
  <circle cx="280" cy="235" r="26" fill="#1e2a45" stroke="${pgDlC}" stroke-width="2"/>
  <text x="280" y="231" text-anchor="middle" font-size="8" fill="${pgDlC}">▼</text>
  <text x="280" y="244" text-anchor="middle" font-size="14" fill="${pgDlC}" font-weight="bold">${pingDl ?? '-'}</text>

  <!-- ping bubble upload -->
  <circle cx="365" cy="235" r="26" fill="#1e2a45" stroke="${pgUlC}" stroke-width="2"/>
  <text x="365" y="231" text-anchor="middle" font-size="8" fill="${pgUlC}">▲</text>
  <text x="365" y="244" text-anchor="middle" font-size="14" fill="${pgUlC}" font-weight="bold">${pingUl ?? '-'}</text>

  <!-- ── DIVIDER ─────────────────────────────────────────── -->
  <line x1="48" y1="278" x2="652" y2="278" stroke="#2d3f60" stroke-width="1"/>

  <!-- ── INFO SECTION ─────────────────────────────────────── -->
  <!-- Connections -->
  <text x="64"  y="304" font-size="11" fill="#94a3b8">Connections</text>
  <text x="64"  y="322" font-size="13" fill="#e2e8f0">Multi</text>

  <!-- ISP + kota -->
  <text x="64"  y="350" font-size="9"  fill="#64748b">ISP</text>
  <text x="64"  y="365" font-size="14" fill="#e2e8f0" font-weight="600">${ispName}</text>
  <text x="64"  y="381" font-size="11" fill="#94a3b8">${kotaName}</text>

  <!-- server sponsor (like "Prima Home" on right) -->
  <text x="520" y="350" text-anchor="end" font-size="9"  fill="#64748b">Server</text>
  <text x="520" y="365" text-anchor="end" font-size="14" fill="#e2e8f0" font-weight="600">${srvSponsor}</text>
  <text x="520" y="381" text-anchor="end" font-size="11" fill="#94a3b8">${srvCity}</text>

  <!-- IP address -->
  <text x="290" y="350" font-size="9"  fill="#64748b">IP Address</text>
  <text x="290" y="367" font-size="13" fill="#38bdf8">${ipAddr}</text>

  <!-- ── FOOTER ─────────────────────────────────────────── -->
  <rect x="0" y="415" width="700" height="65" fill="#0d1117" opacity="0.8"/>
  <line x1="0" y1="415" x2="700" y2="415" stroke="#2d3f60" stroke-width="1"/>
  <text x="36"  y="437" font-size="9"  fill="#475569">DURASI TEST</text>
  <text x="36"  y="453" font-size="12" fill="#94a3b8">${durasi}s</text>
  <text x="350" y="445" text-anchor="middle" font-size="11" fill="#475569">speedtest.net · WILY BOT</text>
  <text x="664" y="437" text-anchor="end" font-size="9"  fill="#475569">POWERED BY</text>
  <text x="664" y="453" text-anchor="end" font-size="12" fill="#38bdf8">Ookla</text>
</svg>`;
}

async function buatGambar(data) {
        const sharp = require('sharp');
        return sharp(Buffer.from(buildSvg(data))).png().toBuffer();
}

// ─────────────────────────────────────────────────────────────────────────────
//  CAPTION WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

function buildCaption({ dl, ul, pingIdle, pingDl, pingUl, srv, isp, durasi }) {
        const SEP  = '━━━━━━━━━━━━━━━━━━━━';
        const dlF  = fmtMbps(dl);
        const ulF  = fmtMbps(ul);

        const dlTxt = dlF ? `*${dlF.num} ${dlF.unit}*` : '❌ Gagal';
        const ulTxt = ulF ? `*${ulF.num} ${ulF.unit}*` : '❌ Gagal';

        const pgRow = (v, c) => v != null ? `*${v} ms*` : '-';

        const ispName   = (isp.isp   || '-').slice(0, 36);
        const srvLine   = srv ? `${srv.sponsor} — ${srv.name}, ${srv.country}` : '-';
        const waktu     = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        return (
                `🌐 *SPEEDTEST.NET — REALTIME*\n` +
                `${SEP}\n\n` +
                `📥 *Download* : ${dlTxt}\n` +
                `📤 *Upload*   : ${ulTxt}\n\n` +
                `🏓 *Ping*\n` +
                `├ ⚫ *Idle*     : ${pgRow(pingIdle)}\n` +
                `├ ↓ *Download* : ${pgRow(pingDl)}\n` +
                `╰ ↑ *Upload*   : ${pgRow(pingUl)}\n\n` +
                `${SEP}\n` +
                `🔗 *Connections* : Multi\n` +
                `🏢 *ISP*         : ${ispName}\n` +
                `📍 *Kota*        : ${isp.kota || '-'}\n` +
                `🌍 *Server*      : ${srvLine}\n` +
                `🔌 *IP*          : ${isp.ip || '-'}\n` +
                `${SEP}\n` +
                `⏱️ _Selesai ${durasi}s · ${waktu} WIB_`
        );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HANDLER: .ping  (speedtest.net realtime)
// ─────────────────────────────────────────────────────────────────────────────

async function handlePing({ hisoka, m, tolak, logCommand }) {
        let statusMsg;
        try {
                // ── Status awal ─────────────────────────────────────────────
                statusMsg = await m.reply('🌐 _Menghubungi speedtest.net..._');

                const t0 = Date.now();

                // ── 1. ISP info + server list (paralel) ─────────────────────
                const [ispInfo, servers] = await Promise.all([
                        stGetIsp(),
                        stGetServers(),
                ]);

                await hisoka.sendMessage(m.from, {
                        edit: statusMsg.key,
                        text: '🔍 _Memilih server terbaik..._',
                });

                // ── 2. Pilih server terbaik ──────────────────────────────────
                const srv = await stPickBest(servers);
                if (!srv) throw new Error('Tidak ada server speedtest.net yang bisa dihubungi');

                const pingIdle = srv._ping?.min ?? null;  // ping idle = min ping ke server
                const pingDl   = srv._ping?.avg ?? null;  // ping saat download ≈ avg
                const pingUl   = srv._ping?.max ?? null;  // ping saat upload   ≈ max

                await hisoka.sendMessage(m.from, {
                        edit: statusMsg.key,
                        text: `⚡ _Server: ${srv.sponsor} (${srv.name})_\n📥 _Mengukur download..._`,
                });

                // ── 3. Download ──────────────────────────────────────────────
                const dlMbps = await stDownload(srv._base);

                await hisoka.sendMessage(m.from, {
                        edit: statusMsg.key,
                        text: `📥 ${dlMbps ? (dlMbps.toFixed(2) + ' Mbps') : 'Gagal'}\n📤 _Mengukur upload..._`,
                });

                // ── 4. Upload ────────────────────────────────────────────────
                const ulMbps = await stUpload(srv.url);

                // ── 5. Durasi & build hasil ──────────────────────────────────
                const durasi = ((Date.now() - t0) / 1000).toFixed(1);

                const hasil = {
                        dl      : dlMbps,
                        ul      : ulMbps,
                        pingIdle,
                        pingDl,
                        pingUl,
                        srv,
                        isp     : ispInfo,
                        durasi,
                };

                // ── 6. Render gambar + caption (paralel) ────────────────────
                const [imgBuf, caption] = await Promise.all([
                        buatGambar(hasil),
                        Promise.resolve(buildCaption(hasil)),
                ]);

                // ── 7. Hapus status, kirim hasil ─────────────────────────────
                await hisoka.sendMessage(m.from, { delete: statusMsg.key });
                await hisoka.sendMessage(m.from, {
                        image   : imgBuf,
                        mimetype: 'image/png',
                        caption,
                }, { quoted: m });

                logCommand(m, hisoka, 'ping');

        } catch (err) {
                console.error('\x1b[31m[ping/speedtest] Error:\x1b[39m', err.message);
                const errMsg = `❌ *Ping/Speedtest gagal*\n\`${err.message}\``;
                if (statusMsg?.key) {
                        await hisoka.sendMessage(m.from, { edit: statusMsg.key, text: errMsg });
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
};
