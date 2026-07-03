/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  ping.cjs — .ping via speedtest.net realtime
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

function stBase(url) {
        return url.replace(/\/upload\.php$/i, '/');
}

async function stGetServers() {
        const { data } = await axios.get(ST_SERVERS_URL, { headers: ST_HDR, timeout: 10000 });
        if (!Array.isArray(data) || !data.length) throw new Error('Daftar server speedtest.net kosong');
        return data;
}

async function stPingServer(baseUrl, tries = 3) {
        const times = [];
        for (let i = 0; i < tries; i++) {
                const t0 = Date.now();
                try {
                        await axios.get(`${baseUrl}latency.txt`, {
                                headers: ST_HDR, timeout: 5000, validateStatus: () => true,
                        });
                        times.push(Date.now() - t0);
                } catch (_) {}
                if (i < tries - 1) await new Promise(r => setTimeout(r, 150));
        }
        if (!times.length) return null;
        times.sort((a, b) => a - b);
        return {
                min   : times[0],
                avg   : Math.round(times.reduce((s, v) => s + v, 0) / times.length),
                max   : times[times.length - 1],
                jitter: times[times.length - 1] - times[0],
        };
}

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

async function stDownload(baseUrl) {
        const sizes = [1500, 2000, 2500];
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
                                timeout: 25000, maxBodyLength: Infinity, validateStatus: () => true,
                        });
                        const ms = Date.now() - t0;
                        if (ms > 0) { totalBit += bytes * 8; totalMs += ms; }
                } catch (_) { break; }
        }
        if (!totalMs) return null;
        return (totalBit / (totalMs / 1000)) / 1_000_000;
}

async function stGetIsp() {
        try {
                const { data } = await axios.get('https://ipinfo.io/json', {
                        headers: { ...ST_HDR, Accept: 'application/json' }, timeout: 6000,
                });
                return {
                        ip    : data?.ip     || '-',
                        isp   : (data?.org   || '-').replace(/^AS\d+\s*/i, '').trim().slice(0, 30),
                        kota  : data?.city   || '-',
                        negara: data?.country || '-',
                };
        } catch (_) {
                return { ip: '-', isp: '-', kota: '-', negara: '-' };
        }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER FORMAT
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(v) {
        if (v === null || v === undefined) return { num: 'N/A', unit: '' };
        if (v >= 1000) return { num: (v / 1000).toFixed(2), unit: 'Gbps' };
        return { num: v.toFixed(2), unit: 'Mbps' };
}

// warna lingkaran ping persis speedtest.net: hijau < 20, kuning 20-50, oranye 50-100, merah >= 100
function pingClr(ms) {
        if (ms == null) return '#6b7280';
        if (ms < 20)   return '#4ade80';   // hijau
        if (ms < 50)   return '#facc15';   // kuning
        if (ms < 100)  return '#fb923c';   // oranye
        return '#f87171';                  // merah
}

// ─────────────────────────────────────────────────────────────────────────────
//  SVG — layout akurat seperti speedtest.net/result
// ─────────────────────────────────────────────────────────────────────────────

function buildSvg({ dl, ul, pingIdle, pingDl, pingUl, srv, isp, durasi }) {
        const dlF = fmtNum(dl);
        const ulF = fmtNum(ul);

        // Speedtest.net pakai warna: DL = cyan (#00c8ff), UL = magenta (#be52f2)
        // angka besar = putih/almost-white
        const DL_CLR  = '#00c8ff';
        const UL_CLR  = '#be52f2';
        const NUM_CLR = '#f8fafc';  // hampir putih seperti di web

        const piC  = pingClr(pingIdle);
        const pdC  = pingClr(pingDl);
        const puC  = pingClr(pingUl);

        const ispName    = (isp.isp   || '-').slice(0, 26);
        const kotaName   = (isp.kota  || '-').slice(0, 18);
        const srvSponsor = (srv?.sponsor || 'speedtest.net').slice(0, 26);
        const srvCity    = (srv?.name    || '-').slice(0, 18);
        const ipAddr     = isp.ip || '-';
        const waktu      = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        // Ukuran: 720 x 460 — rasio mendekati hasil di speedtest.net
        return `<svg width="720" height="460" xmlns="http://www.w3.org/2000/svg"
        font-family="'Helvetica Neue',Helvetica,Arial,sans-serif">
  <defs>
    <!-- background gelap ala speedtest.net -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#141414"/>
      <stop offset="100%" stop-color="#1a1a2e"/>
    </linearGradient>
    <!-- panel card -->
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#1f2d45"/>
      <stop offset="100%" stop-color="#18253a"/>
    </linearGradient>
    <!-- glow DL -->
    <radialGradient id="glowDL" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${DL_CLR}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${DL_CLR}" stop-opacity="0"/>
    </radialGradient>
    <!-- glow UL -->
    <radialGradient id="glowUL" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${UL_CLR}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${UL_CLR}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- ── BACKGROUND ── -->
  <rect width="720" height="460" fill="url(#bg)"/>

  <!-- ── TOP BAR ── -->
  <rect x="0" y="0" width="720" height="48" fill="#0f0f1a"/>
  <!-- speedtest logo circle -->
  <circle cx="32" cy="24" r="15" fill="#0f0f1a" stroke="${DL_CLR}" stroke-width="1.5"/>
  <text x="32" y="20" text-anchor="middle" font-size="8"  fill="${DL_CLR}" font-weight="700">⚡</text>
  <text x="32" y="31" text-anchor="middle" font-size="7"  fill="${DL_CLR}">ST</text>
  <!-- speedtest by ookla -->
  <text x="56" y="18" font-size="9"  fill="#94a3b8" font-weight="400" letter-spacing="1">SPEEDTEST</text>
  <text x="56" y="33" font-size="14" fill="#f1f5f9" font-weight="700">by Ookla</text>
  <!-- result timestamp -->
  <text x="700" y="22" text-anchor="end" font-size="9"  fill="#475569">Result</text>
  <text x="700" y="36" text-anchor="end" font-size="9"  fill="${DL_CLR}">${waktu} WIB</text>

  <!-- ── MAIN CARD ── -->
  <rect x="20" y="60" width="680" height="300" rx="12" fill="url(#card)" stroke="#2a3a56" stroke-width="1"/>

  <!-- glow DL kiri -->
  <ellipse cx="195" cy="160" rx="160" ry="100" fill="url(#glowDL)"/>
  <!-- glow UL kanan -->
  <ellipse cx="525" cy="160" rx="160" ry="100" fill="url(#glowUL)"/>

  <!-- divider vertikal -->
  <line x1="360" y1="75" x2="360" y2="295" stroke="#2a3a56" stroke-width="1"/>

  <!-- ── DOWNLOAD KOLOM KIRI ── -->
  <!-- ikon panah download -->
  <circle cx="160" cy="98" r="12" fill="none" stroke="${DL_CLR}" stroke-width="1.5"/>
  <text x="160" y="103" text-anchor="middle" font-size="12" fill="${DL_CLR}">↓</text>
  <!-- label DOWNLOAD -->
  <text x="225" y="95" font-size="11" fill="${DL_CLR}" font-weight="600" letter-spacing="1">DOWNLOAD</text>
  <text x="225" y="110" font-size="9"  fill="#64748b">Mbps</text>

  <!-- angka besar DL -->
  <text x="200" y="190" text-anchor="middle" font-size="70" fill="${NUM_CLR}" font-weight="700"
        style="letter-spacing:-2px">${dlF.num}</text>
  <!-- unit Mbps/Gbps di bawah angka -->
  <text x="200" y="212" text-anchor="middle" font-size="13" fill="#94a3b8">${dlF.unit}</text>

  <!-- ── UPLOAD KOLOM KANAN ── -->
  <!-- ikon panah upload -->
  <circle cx="490" cy="98" r="12" fill="none" stroke="${UL_CLR}" stroke-width="1.5"/>
  <text x="490" y="103" text-anchor="middle" font-size="12" fill="${UL_CLR}">↑</text>
  <!-- label UPLOAD -->
  <text x="555" y="95" font-size="11" fill="${UL_CLR}" font-weight="600" letter-spacing="1">UPLOAD</text>
  <text x="555" y="110" font-size="9"  fill="#64748b">Mbps</text>

  <!-- angka besar UL -->
  <text x="525" y="190" text-anchor="middle" font-size="70" fill="${NUM_CLR}" font-weight="700"
        style="letter-spacing:-2px">${ulF.num}</text>
  <!-- unit -->
  <text x="525" y="212" text-anchor="middle" font-size="13" fill="#94a3b8">${ulF.unit}</text>

  <!-- ── PING ROW ── -->
  <!-- "Ping ms" label -->
  <text x="44" y="258" font-size="11" fill="#64748b">Ping  ms</text>

  <!-- lingkaran ping IDLE -->
  <circle cx="200" cy="252" r="22" fill="#111827" stroke="${piC}" stroke-width="2"/>
  <!-- ikon titik idle -->
  <circle cx="200" cy="244" r="3" fill="${piC}"/>
  <text x="200" y="261" text-anchor="middle" font-size="13" fill="${piC}" font-weight="700">${pingIdle ?? '-'}</text>

  <!-- lingkaran ping DOWNLOAD -->
  <circle cx="360" cy="252" r="22" fill="#111827" stroke="${pdC}" stroke-width="2"/>
  <text x="360" y="248" text-anchor="middle" font-size="10" fill="${pdC}">↓</text>
  <text x="360" y="263" text-anchor="middle" font-size="13" fill="${pdC}" font-weight="700">${pingDl ?? '-'}</text>

  <!-- lingkaran ping UPLOAD -->
  <circle cx="525" cy="252" r="22" fill="#111827" stroke="${puC}" stroke-width="2"/>
  <text x="525" y="248" text-anchor="middle" font-size="10" fill="${puC}">↑</text>
  <text x="525" y="263" text-anchor="middle" font-size="13" fill="${puC}" font-weight="700">${pingUl ?? '-'}</text>

  <!-- divider horizontal -->
  <line x1="20" y1="308" x2="700" y2="308" stroke="#1e2d44" stroke-width="1"/>

  <!-- ── INFO SECTION ── -->
  <!-- Connections -->
  <text x="44"  y="334" font-size="10" fill="#64748b">Connections</text>
  <text x="44"  y="352" font-size="13" fill="#cbd5e1">Multi</text>

  <!-- ISP kiri -->
  <!-- globe icon -->
  <circle cx="208" cy="325" r="10" fill="none" stroke="#334155" stroke-width="1"/>
  <text x="208" y="329" text-anchor="middle" font-size="8" fill="#64748b">🌐</text>
  <text x="225" y="330" font-size="13" fill="#f1f5f9" font-weight="600">${ispName}</text>
  <text x="225" y="346" font-size="10" fill="#64748b">${kotaName}</text>

  <!-- Server / Provider kanan -->
  <!-- person icon -->
  <circle cx="458" cy="325" r="10" fill="none" stroke="#334155" stroke-width="1"/>
  <text x="458" y="329" text-anchor="middle" font-size="8" fill="#64748b">👤</text>
  <text x="475" y="330" font-size="13" fill="#f1f5f9" font-weight="600">${srvSponsor}</text>
  <text x="475" y="346" font-size="10" fill="#64748b">${srvCity}</text>
  <!-- IP -->
  <text x="475" y="360" font-size="10" fill="#38bdf8">${ipAddr}</text>

  <!-- ── FOOTER BAR ── -->
  <rect x="0" y="380" width="720" height="80" fill="#0a0a14"/>
  <line x1="0" y1="380" x2="720" y2="380" stroke="#1e2a3a" stroke-width="1"/>

  <text x="44"  y="404" font-size="9"  fill="#334155">DURASI TEST</text>
  <text x="44"  y="420" font-size="12" fill="#64748b">${durasi}s</text>

  <text x="360" y="408" text-anchor="middle" font-size="10" fill="#334155">speedtest.net · WILY BOT</text>
  <text x="360" y="425" text-anchor="middle" font-size="9"  fill="#1e3a5f">${waktu} WIB</text>

  <text x="676" y="404" text-anchor="end" font-size="9"  fill="#334155">POWERED BY</text>
  <text x="676" y="420" text-anchor="end" font-size="13" fill="${DL_CLR}" font-weight="700">Ookla</text>
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
        const SEP = '━━━━━━━━━━━━━━━━━━━━';
        const dlF = fmtNum(dl);
        const ulF = fmtNum(ul);
        const dlTxt = dl ? `*${dlF.num} ${dlF.unit}*` : '❌ Gagal';
        const ulTxt = ul ? `*${ulF.num} ${ulF.unit}*` : '❌ Gagal';
        const srvLine = srv ? `${srv.sponsor} — ${srv.name}, ${srv.country}` : '-';
        const waktu   = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        return (
                `🌐 *SPEEDTEST.NET — REALTIME*\n${SEP}\n\n` +
                `📥 *Download* : ${dlTxt}\n` +
                `📤 *Upload*   : ${ulTxt}\n\n` +
                `🏓 *Ping*\n` +
                `├ ⚫ *Idle*     : ${pingIdle != null ? `*${pingIdle} ms*` : '-'}\n` +
                `├ ↓ *Download* : ${pingDl   != null ? `*${pingDl} ms*`   : '-'}\n` +
                `╰ ↑ *Upload*   : ${pingUl   != null ? `*${pingUl} ms*`   : '-'}\n\n` +
                `${SEP}\n` +
                `🔗 *Connections* : Multi\n` +
                `🏢 *ISP*         : ${isp.isp || '-'}\n` +
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
                statusMsg = await m.reply('🌐 _Menghubungi speedtest.net..._');
                const t0 = Date.now();

                // 1. ISP info + server list (paralel)
                const [ispInfo, servers] = await Promise.all([stGetIsp(), stGetServers()]);

                await hisoka.sendMessage(m.from, {
                        edit: statusMsg.key, text: '🔍 _Memilih server terbaik..._',
                });

                // 2. Pilih server terbaik
                const srv = await stPickBest(servers);
                if (!srv) throw new Error('Tidak ada server speedtest.net yang bisa dihubungi');

                const pingIdle = srv._ping?.min ?? null;
                const pingDl   = srv._ping?.avg ?? null;
                const pingUl   = srv._ping?.max ?? null;

                await hisoka.sendMessage(m.from, {
                        edit: statusMsg.key,
                        text: `⚡ _Server: ${srv.sponsor} (${srv.name})_\n📥 _Mengukur download..._`,
                });

                // 3. Download
                const dlMbps = await stDownload(srv._base);

                await hisoka.sendMessage(m.from, {
                        edit: statusMsg.key,
                        text: `📥 ${dlMbps ? dlMbps.toFixed(2) + ' Mbps' : 'Gagal'}\n📤 _Mengukur upload..._`,
                });

                // 4. Upload
                const ulMbps = await stUpload(srv.url);

                const durasi = ((Date.now() - t0) / 1000).toFixed(1);

                const hasil = { dl: dlMbps, ul: ulMbps, pingIdle, pingDl, pingUl, srv, isp: ispInfo, durasi };

                // 5. Render gambar + caption paralel
                const [imgBuf, caption] = await Promise.all([
                        buatGambar(hasil),
                        Promise.resolve(buildCaption(hasil)),
                ]);

                // 6. Hapus status, kirim gambar
                await hisoka.sendMessage(m.from, { delete: statusMsg.key });
                await hisoka.sendMessage(m.from, {
                        image: imgBuf, mimetype: 'image/png', caption,
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

module.exports = { handlePing };
