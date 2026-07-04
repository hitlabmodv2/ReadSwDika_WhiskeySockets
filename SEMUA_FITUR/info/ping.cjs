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

// Escape karakter XML agar SVG tidak gagal parse saat ISP/server mengandung & < > " '
function xe(str) {
        if (!str) return '-';
        return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
}

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
//  SVG — layout bersih & akurat seperti speedtest.net/result
//  Canvas: 720 × 520
//  ┌─────────────────────────────────┐ y=0
//  │  TOP BAR (logo + timestamp)     │ h=52
//  ├─────────────────────────────────┤ y=60
//  │  MAIN CARD  (DL | UL + Ping)    │ h=282 → y=342
//  ├─────────────────────────────────┤ y=352
//  │  INFO BAR  (ISP | Server | IP)  │ h=82  → y=434
//  ├─────────────────────────────────┤ y=446
//  │  FOOTER                         │ h=74  → y=520
//  └─────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

function buildSvg({ dl, ul, pingIdle, pingDl, pingUl, srv, isp, durasi }) {
        const dlF = fmtNum(dl);
        const ulF = fmtNum(ul);

        const DL_CLR  = '#00c8ff';   // cyan  ala speedtest.net
        const UL_CLR  = '#be52f2';   // ungu  ala speedtest.net
        const NUM_CLR = '#f8fafc';   // putih bersih angka besar

        const piC = pingClr(pingIdle);
        const pdC = pingClr(pingDl);
        const puC = pingClr(pingUl);

        const ispName    = xe((isp.isp    || '-').slice(0, 24));
        const kotaName   = xe((isp.kota   || '-').slice(0, 20));
        const negaraName = xe((isp.negara || '-').slice(0, 10));
        const srvSponsor = xe((srv?.sponsor || 'speedtest.net').slice(0, 24));
        const srvCity    = xe((srv?.name    || '-').slice(0, 20));
        const waktu      = xe(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }));

        return `<svg width="720" height="520" xmlns="http://www.w3.org/2000/svg"
  font-family="'Helvetica Neue',Helvetica,Arial,sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161c26"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#1c2b42"/>
      <stop offset="100%" stop-color="#152035"/>
    </linearGradient>
    <radialGradient id="glowDL" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${DL_CLR}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${DL_CLR}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowUL" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${UL_CLR}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${UL_CLR}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- ══ BACKGROUND ══ -->
  <rect width="720" height="520" fill="url(#bg)"/>

  <!-- ══ TOP BAR (y 0–52) ══ -->
  <rect x="0" y="0" width="720" height="52" fill="#08080f"/>
  <!-- Logo area -->
  <circle cx="28" cy="26" r="17" fill="#08080f" stroke="${DL_CLR}" stroke-width="1.5"/>
  <text x="28" y="22" text-anchor="middle" font-size="9"  fill="${DL_CLR}" font-weight="800">ST</text>
  <text x="28" y="33" text-anchor="middle" font-size="8"  fill="${DL_CLR}">NET</text>
  <!-- Brand text -->
  <text x="54" y="20" font-size="9"  fill="#475569" font-weight="500" letter-spacing="2">SPEEDTEST</text>
  <text x="54" y="37" font-size="15" fill="#f1f5f9" font-weight="700">by Ookla</text>
  <!-- Timestamp kanan -->
  <text x="700" y="20" text-anchor="end" font-size="9"  fill="#334155">HASIL TEST</text>
  <text x="700" y="37" text-anchor="end" font-size="10" fill="${DL_CLR}" font-weight="600">${waktu} WIB</text>

  <!-- ══ MAIN CARD (y 60–342, h=282) ══ -->
  <rect x="18" y="60" width="684" height="282" rx="14" fill="url(#card)" stroke="#243448" stroke-width="1.5"/>

  <!-- Glow efek kiri-kanan -->
  <ellipse cx="185" cy="170" rx="155" ry="95" fill="url(#glowDL)"/>
  <ellipse cx="535" cy="170" rx="155" ry="95" fill="url(#glowUL)"/>

  <!-- Divider vertikal tengah -->
  <line x1="360" y1="76" x2="360" y2="236" stroke="#243448" stroke-width="1"/>

  <!-- ── DOWNLOAD — kolom kiri ── -->
  <!-- Ikon lingkaran + label -->
  <circle cx="110" cy="96" r="15" fill="none" stroke="${DL_CLR}" stroke-width="2"/>
  <text x="110" y="102" text-anchor="middle" font-size="15" fill="${DL_CLR}">↓</text>
  <text x="134" y="91"  font-size="11" fill="${DL_CLR}" font-weight="700" letter-spacing="1.5">DOWNLOAD</text>
  <text x="134" y="107" font-size="9"  fill="#3d5068">Megabits per second</text>
  <!-- Angka besar DL — center kolom kiri (cx≈185) -->
  <text x="185" y="196" text-anchor="middle" font-size="78" fill="${NUM_CLR}" font-weight="700"
        textLength="270" lengthAdjust="spacingAndGlyphs">${dlF.num}</text>
  <text x="185" y="220" text-anchor="middle" font-size="14" fill="#64748b">${dlF.unit}</text>

  <!-- ── UPLOAD — kolom kanan ── -->
  <circle cx="440" cy="96" r="15" fill="none" stroke="${UL_CLR}" stroke-width="2"/>
  <text x="440" y="102" text-anchor="middle" font-size="15" fill="${UL_CLR}">↑</text>
  <text x="464" y="91"  font-size="11" fill="${UL_CLR}" font-weight="700" letter-spacing="1.5">UPLOAD</text>
  <text x="464" y="107" font-size="9"  fill="#3d5068">Megabits per second</text>
  <!-- Angka besar UL — center kolom kanan (cx≈535) -->
  <text x="535" y="196" text-anchor="middle" font-size="78" fill="${NUM_CLR}" font-weight="700"
        textLength="270" lengthAdjust="spacingAndGlyphs">${ulF.num}</text>
  <text x="535" y="220" text-anchor="middle" font-size="14" fill="#64748b">${ulF.unit}</text>

  <!-- ── Divider horizontal dalam card ── -->
  <line x1="34" y1="236" x2="686" y2="236" stroke="#1d2c40" stroke-width="1"/>

  <!-- ── PING ROW (y 236–342) ── -->
  <!-- Label kiri -->
  <text x="38"  y="262" font-size="10" fill="#475569" font-weight="700" letter-spacing="1.5">PING</text>
  <text x="38"  y="277" font-size="9"  fill="#2d4060">ms</text>

  <!-- Lingkaran IDLE — x=185 -->
  <circle cx="185" cy="272" r="26" fill="#09111e" stroke="${piC}" stroke-width="2.5"/>
  <circle cx="185" cy="262" r="4"  fill="${piC}"/>
  <text x="185" y="283" text-anchor="middle" font-size="15" fill="${piC}" font-weight="700">${pingIdle ?? '-'}</text>
  <!-- Sub-label -->
  <text x="185" y="314" text-anchor="middle" font-size="9" fill="#3d5068" letter-spacing="1">IDLE</text>

  <!-- Lingkaran DOWNLOAD — x=360 -->
  <circle cx="360" cy="272" r="26" fill="#09111e" stroke="${pdC}" stroke-width="2.5"/>
  <text x="360" y="267" text-anchor="middle" font-size="12" fill="${pdC}">↓</text>
  <text x="360" y="284" text-anchor="middle" font-size="15" fill="${pdC}" font-weight="700">${pingDl ?? '-'}</text>
  <text x="360" y="314" text-anchor="middle" font-size="9" fill="#3d5068" letter-spacing="1">UNDUH</text>

  <!-- Lingkaran UPLOAD — x=535 -->
  <circle cx="535" cy="272" r="26" fill="#09111e" stroke="${puC}" stroke-width="2.5"/>
  <text x="535" y="267" text-anchor="middle" font-size="12" fill="${puC}">↑</text>
  <text x="535" y="284" text-anchor="middle" font-size="15" fill="${puC}" font-weight="700">${pingUl ?? '-'}</text>
  <text x="535" y="314" text-anchor="middle" font-size="9" fill="#3d5068" letter-spacing="1">UNGGAH</text>

  <!-- ══ INFO BAR (y 352–434, h=82) ══ -->
  <rect x="18" y="352" width="684" height="82" rx="10" fill="#0c1520" stroke="#1c2b3e" stroke-width="1"/>

  <!-- Col 1: Koneksi (x=18 → x=150) -->
  <text x="36"  y="378" font-size="8"  fill="#3d5068" letter-spacing="1.5">KONEKSI</text>
  <text x="36"  y="397" font-size="13" fill="#94a3b8" font-weight="600">Multi</text>
  <text x="36"  y="413" font-size="9"  fill="#2d4060">Threads</text>

  <!-- Sep 1 -->
  <line x1="148" y1="360" x2="148" y2="426" stroke="#1c2b3e" stroke-width="1"/>

  <!-- Col 2: ISP (x=160 → x=338) -->
  <circle cx="172" cy="374" r="9" fill="none" stroke="#243448" stroke-width="1"/>
  <text x="172" y="378" text-anchor="middle" font-size="8" fill="#3d5068">🌐</text>
  <text x="188" y="378" font-size="8"  fill="#3d5068" letter-spacing="1.5">ISP</text>
  <text x="160" y="397" font-size="13" fill="#e2e8f0" font-weight="600">${ispName}</text>
  <text x="160" y="413" font-size="9"  fill="#3d5068">${kotaName}</text>

  <!-- Sep 2 -->
  <line x1="336" y1="360" x2="336" y2="426" stroke="#1c2b3e" stroke-width="1"/>

  <!-- Col 3: Server (x=348 → x=530) -->
  <circle cx="360" cy="374" r="9" fill="none" stroke="#243448" stroke-width="1"/>
  <text x="360" y="378" text-anchor="middle" font-size="8" fill="#3d5068">📡</text>
  <text x="376" y="378" font-size="8"  fill="#3d5068" letter-spacing="1.5">SERVER</text>
  <text x="348" y="397" font-size="13" fill="#e2e8f0" font-weight="600">${srvSponsor}</text>
  <text x="348" y="413" font-size="9"  fill="#3d5068">${srvCity}</text>

  <!-- Sep 3 -->
  <line x1="528" y1="360" x2="528" y2="426" stroke="#1c2b3e" stroke-width="1"/>

  <!-- Col 4: Negara (x=540 → x=702) -->
  <text x="540" y="378" font-size="8"  fill="#3d5068" letter-spacing="1.5">NEGARA</text>
  <text x="540" y="397" font-size="13" fill="#e2e8f0" font-weight="600">${negaraName}</text>

  <!-- ══ FOOTER (y 446–520, h=74) ══ -->
  <rect x="0" y="446" width="720" height="74" fill="#060810"/>
  <line x1="0" y1="446" x2="720" y2="446" stroke="#172030" stroke-width="1"/>

  <!-- Durasi kiri -->
  <text x="36"  y="470" font-size="8"  fill="#243448" letter-spacing="1.5">DURASI TEST</text>
  <text x="36"  y="490" font-size="14" fill="#475569" font-weight="600">${durasi}s</text>

  <!-- Center branding -->
  <text x="360" y="468" text-anchor="middle" font-size="10" fill="#1e3050">speedtest.net · WILY BOT</text>
  <text x="360" y="484" text-anchor="middle" font-size="10" fill="#172540">${waktu} WIB</text>
  <text x="360" y="500" text-anchor="middle" font-size="9"  fill="#0e1a2a">www.speedtest.net</text>

  <!-- Powered by kanan -->
  <text x="684" y="470" text-anchor="end" font-size="8"  fill="#243448" letter-spacing="1.5">POWERED BY</text>
  <text x="684" y="490" text-anchor="end" font-size="15" fill="${DL_CLR}" font-weight="700">Ookla</text>
</svg>`;
}

// PNG penuh (dikirim sebagai gambar utama)
async function buatGambar(data) {
        const sharp = require('sharp');
        return sharp(Buffer.from(buildSvg(data))).png().toBuffer();
}


// ─────────────────────────────────────────────────────────────────────────────
//  CAPTION WhatsApp — format lengkap (bold/italic/coret/mono/list/poin/kutip)
// ─────────────────────────────────────────────────────────────────────────────

function labelKecepatan(mbps) {
        if (!mbps) return { e: '❌', t: 'Gagal' };
        if (mbps >= 1000) return { e: '🚀', t: 'Luar Biasa' };
        if (mbps >= 100)  return { e: '⚡', t: 'Sangat Cepat' };
        if (mbps >= 50)   return { e: '✅', t: 'Cepat' };
        if (mbps >= 20)   return { e: '🟡', t: 'Normal' };
        if (mbps >= 5)    return { e: '🟠', t: 'Lumayan' };
        return                    { e: '🐢', t: 'Lambat' };
}

function labelWaLatency(ms) {
        if (ms == null)  return { e: '❓', t: 'Tidak Diketahui' };
        if (ms < 100)    return { e: '🚀', t: 'Sangat Cepat' };
        if (ms < 500)    return { e: '⚡', t: 'Normal' };
        if (ms < 2000)   return { e: '🟡', t: 'Agak Lambat' };
        return                   { e: '🐢', t: 'Lambat' };
}

function buildCaption({ dl, ul, pingIdle, pingDl, pingUl, srv, isp, durasi, waLatency }) {
        const SEP  = '━━━━━━━━━━━━━━━━━━━━';
        const SEP2 = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

        const dlF   = fmtNum(dl);
        const ulF   = fmtNum(ul);
        const dlLbl = labelKecepatan(dl);
        const ulLbl = labelKecepatan(ul);
        const waLbl = labelWaLatency(waLatency);

        const dlTxt = dl
                ? `*${dlF.num} ${dlF.unit}* — ${dlLbl.e} _${dlLbl.t}_`
                : '~Gagal diukur~';
        const ulTxt = ul
                ? `*${ulF.num} ${ulF.unit}* — ${ulLbl.e} _${ulLbl.t}_`
                : '~Gagal diukur~';

        const pgI = pingIdle != null ? `\`${pingIdle} ms\`` : '`-`';
        const pgD = pingDl   != null ? `\`${pingDl} ms\``   : '`-`';
        const pgU = pingUl   != null ? `\`${pingUl} ms\``   : '`-`';

        const srvLine  = srv ? `_${srv.sponsor} — ${srv.name}, ${srv.country}_` : '_-_';
        const kotaLine = `_${isp.kota || '-'}, ${isp.negara || '-'}_`;
        const ispLine  = `_${isp.isp  || '-'}_`;
        const waMs     = waLatency != null ? `\`${waLatency} ms\`` : '`-`';
        const waktu    = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

        return (
                `🌐 *SPEEDTEST.NET — REALTIME*\n` +
                `${SEP}\n\n` +

                `*📊 Hasil Kecepatan*\n\n` +
                `1. 📥 *Download*\n` +
                `   • Kecepatan : ${dlTxt}\n\n` +
                `2. 📤 *Upload*\n` +
                `   • Kecepatan : ${ulTxt}\n\n` +
                `3. 🏓 *Ping (ms)*\n` +
                `   • ⚫ Idle     : ${pgI}\n` +
                `   • ↓ Unduh   : ${pgD}\n` +
                `   • ↑ Unggah  : ${pgU}\n\n` +

                `${SEP}\n` +

                `*📋 Info Koneksi*\n` +
                `${SEP2}\n` +
                `• 🔗 Koneksi : Multi\n` +
                `• 🏢 ISP     : ${ispLine}\n` +
                `• 📍 Lokasi  : ${kotaLine}\n` +
                `• 🌍 Server  : ${srvLine}\n` +
                `• 🌍 Negara  : _${isp.negara || '-'}_\n\n` +

                `> ℹ️ Ini kecepatan *server bot*, ~bukan koneksi internet kamu~ — wajar berbeda dari speedtest.net di browser\n\n` +

                `${SEP}\n` +

                `*⚡ Respons Bot ke WA*\n` +
                `${SEP2}\n` +
                `• Latensi : ${waMs} — ${waLbl.e} _${waLbl.t}_\n\n` +

                `${SEP}\n` +
                `⏱️ _Selesai dalam ${durasi}s · ${waktu} WIB_`
        );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HANDLER: .ping  (speedtest.net realtime)
// ─────────────────────────────────────────────────────────────────────────────

async function handlePing({ hisoka, m, tolak, logCommand }) {
        let statusMsg;
        try {
                // Ukur WA latency sebelum apapun
                const waLatency = Math.abs(Date.now() - m.messageTimestamp * 1000);

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
                const hasil  = { dl: dlMbps, ul: ulMbps, pingIdle, pingDl, pingUl, srv, isp: ispInfo, durasi, waLatency };

                // 5. Render gambar PNG + caption paralel
                const [imgBuf, caption] = await Promise.all([
                        buatGambar(hasil),
                        Promise.resolve(buildCaption(hasil)),
                ]);

                // 6. Hapus pesan status
                await hisoka.sendMessage(m.from, { delete: statusMsg.key });

                // 7. Kirim gambar PNG + caption
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

module.exports = { handlePing };
