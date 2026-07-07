import express from 'express';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const app = express();
const PORT = process.env.PORT || 5000;

function safeRead(filePath) {
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

function getBotData() {
  const pkg    = safeRead('./package.json')    || {};
  const cfg    = safeRead('./config.json')      || {};
  const auth   = safeRead('./data/system/auth-timer.json') || {};
  const hb     = safeRead('./data/heartbeat.json') || {};
  const stats  = safeRead('./data/bot_stats.json') || {};

  // Hitung users dari folder data/users/
  let userCount = 0;
  try {
    userCount = readdirSync('./data/users').filter(f => f.endsWith('.json') && f !== 'history.json').length;
  } catch {}

  // Hitung sesi jadibot aktif
  let jadibotCount = 0;
  try {
    const jd = safeRead('./data_jadibot/realtime.json') || { bots: {} };
    jadibotCount = Object.keys(jd.bots || {}).length;
  } catch {}

  // Session status
  let sessionStatus = 'Belum Login';
  let sessionLabel  = 'warning';
  try {
    const sess = readdirSync('./sessions').filter(f => f.endsWith('.json'));
    if (sess.length > 0) { sessionStatus = 'Session Tersimpan'; sessionLabel = 'ok'; }
  } catch {}

  // Cek QR terakhir
  const lastQR = auth?.events?.find(e => e.type === 'qr_session_start');
  const lastQRTime = lastQR ? new Date(lastQR.startAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '-';

  // Fitur aktif dari config
  const features = [
    { name: 'Auto Online',       on: cfg.autoOnline?.enabled },
    { name: 'Auto Read Story',   on: cfg.autoReadStory?.enabled },
    { name: 'Auto Typing',       on: cfg.autoTyping?.enabled },
    { name: 'Anti Delete',       on: cfg.antiDelete?.enabled },
    { name: 'Anti Call',         on: cfg.antiCall?.enabled },
    { name: 'Anti Link',         on: cfg.antiLink?.enabled },
    { name: 'Wily AI',           on: cfg.wilyAI?.enabled },
    { name: 'Auto Simi',         on: cfg.autoSimi?.enabled },
    { name: 'Welcome/Goodbye',   on: cfg.welcomeGoodbye?.enabled },
    { name: 'Telegram Notif',    on: cfg.telegram?.enabled },
    { name: 'Read Chat',         on: cfg.readChat?.enabled },
    { name: 'Log SW',            on: cfg.logsw?.enabled },
  ];

  return {
    name:          pkg.name        || 'wily-bot',
    version:       pkg.version     || '?',
    author:        pkg.author      || 'Bang Wily',
    description:   pkg.description || '',
    botVersion:    cfg.botVersion  || 'V25',
    botNumber:     cfg.botNumber   || '-',
    owners:        cfg.owners      || [],
    userCount,
    jadibotCount,
    sessionStatus,
    sessionLabel,
    lastQRTime,
    features,
    totalCmd:      stats.totalCommands || stats.total || 0,
    uptime:        hb.uptime || '-',
    now: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
  };
}

app.get('/', (req, res) => {
  const d = getBotData();
  const featureHtml = d.features.map(f => `
    <div class="feat-item ${f.on ? 'on' : 'off'}">
      <span class="feat-dot"></span>
      <span>${f.name}</span>
    </div>`).join('');

  const ownerHtml = d.owners.map((o, i) =>
    `<span class="owner-tag">👑 Owner ${i + 1}: +${o}</span>`
  ).join('');

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${d.name} ${d.botVersion}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 50%,#16213e 100%);min-height:100vh;color:#fff;padding:24px 16px}
    .wrap{max-width:560px;margin:0 auto}
    /* HEADER */
    .header{text-align:center;margin-bottom:28px}
    .bot-icon{font-size:56px;margin-bottom:10px;display:block;animation:float 3s ease-in-out infinite}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    h1{font-size:1.9rem;font-weight:800;background:linear-gradient(135deg,#00d4aa,#00b4d8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .sub{color:rgba(255,255,255,.35);font-size:.8rem;margin-top:4px}
    /* BADGE */
    .badge-row{display:flex;justify-content:center;gap:10px;margin-bottom:24px;flex-wrap:wrap}
    .badge{display:inline-flex;align-items:center;gap:6px;border-radius:50px;padding:6px 16px;font-size:.8rem;font-weight:600}
    .badge-green{background:rgba(0,212,128,.15);border:1px solid rgba(0,212,128,.4);color:#00d480}
    .badge-blue{background:rgba(0,180,216,.15);border:1px solid rgba(0,180,216,.4);color:#00b4d8}
    .badge-orange{background:rgba(255,165,0,.15);border:1px solid rgba(255,165,0,.4);color:#ffa500}
    .dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:blink 1.2s infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
    /* STAT GRID */
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
    .grid-3{grid-template-columns:1fr 1fr 1fr}
    .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 14px;text-align:center}
    .card-label{font-size:.65rem;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
    .card-value{font-size:1.15rem;font-weight:700;color:#e2e8f0}
    .card-value.big{font-size:1.6rem;color:#00d4aa}
    /* FEATURES */
    .section-title{font-size:.75rem;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.3);margin-bottom:10px}
    .feat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
    .feat-item{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:10px 12px;font-size:.8rem}
    .feat-item.on .feat-dot{background:#00d480;box-shadow:0 0 6px #00d48066}
    .feat-item.off .feat-dot{background:#ff4d4d55}
    .feat-item.on{border-color:rgba(0,212,128,.2)}
    .feat-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    /* OWNERS */
    .owners-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:8px}
    .owner-tag{background:rgba(0,180,216,.12);border:1px solid rgba(0,180,216,.25);color:#00b4d8;border-radius:8px;padding:5px 12px;font-size:.78rem;font-weight:600}
    /* INFO BOX */
    .info-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-bottom:20px}
    .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.82rem}
    .info-row:last-child{border-bottom:none}
    .info-row .k{color:rgba(255,255,255,.4)}
    .info-row .v{color:#e2e8f0;font-weight:600;text-align:right;max-width:65%;word-break:break-all}
    /* FOOTER */
    footer{text-align:center;color:rgba(255,255,255,.2);font-size:.72rem;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)}
    .wa-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#25d366,#128c7e);color:#fff;text-decoration:none;border-radius:50px;padding:10px 24px;font-weight:600;font-size:.85rem;margin-bottom:20px;transition:opacity .2s}
    .wa-btn:hover{opacity:.85}
    @media(max-width:400px){.grid-3{grid-template-columns:1fr 1fr}.feat-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <span class="bot-icon">🤖</span>
    <h1>${d.name} ${d.botVersion}</h1>
    <div class="sub">${d.description.split('—')[0].trim()}</div>
  </div>

  <div class="badge-row">
    <span class="badge badge-green"><span class="dot"></span> Server Online</span>
    <span class="badge badge-blue">📦 v${d.version}</span>
    <span class="badge badge-orange">📱 +${d.botNumber}</span>
  </div>

  <div class="grid grid-3" style="margin-bottom:20px">
    <div class="card">
      <div class="card-label">👥 Users</div>
      <div class="card-value big">${d.userCount.toLocaleString('id-ID')}</div>
    </div>
    <div class="card">
      <div class="card-label">🤖 JadiBot</div>
      <div class="card-value big">${d.jadibotCount}</div>
    </div>
    <div class="card">
      <div class="card-label">💬 Total CMD</div>
      <div class="card-value big">${d.totalCmd.toLocaleString('id-ID') || '—'}</div>
    </div>
  </div>

  <div class="info-box">
    <div class="info-row"><span class="k">📟 Nomor Bot</span><span class="v">+${d.botNumber}</span></div>
    <div class="info-row"><span class="k">🔐 Session</span><span class="v" style="color:${d.sessionLabel === 'ok' ? '#00d480' : '#ffa500'}">${d.sessionStatus}</span></div>
    <div class="info-row"><span class="k">📲 QR Terakhir</span><span class="v">${d.lastQRTime}</span></div>
    <div class="info-row"><span class="k">🕐 Waktu Server</span><span class="v">${d.now}</span></div>
    <div class="info-row"><span class="k">⚙️ Session Name</span><span class="v">${process.env.BOT_SESSION_NAME || 'hisoka'}</span></div>
    <div class="info-row"><span class="k">🌐 Platform</span><span class="v">Replit (Autoscale)</span></div>
  </div>

  <div class="section-title">👑 Owner Bot</div>
  <div class="owners-box">${ownerHtml}</div>

  <div class="section-title">⚡ Status Fitur</div>
  <div class="feat-grid">${featureHtml}</div>

  <div style="text-align:center">
    <a class="wa-btn" href="https://wa.me/${d.owners[d.owners.length - 1] || d.botNumber}" target="_blank">
      💬 Chat Owner
    </a>
  </div>

  <footer>© ${new Date().getFullYear()} ${d.name} ${d.botVersion} — Powered by Baileys &amp; Replit</footer>
</div>
</body>
</html>`);
});

app.get('/health', (req, res) => {
  const d = getBotData();
  res.json({ status: 'ok', bot: d.name, version: d.version, users: d.userCount, time: new Date().toISOString() });
});

app.get('/api/stats', (req, res) => {
  res.json(getBotData());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ WilyBot Web Server jalan di port ${PORT}`);
});
