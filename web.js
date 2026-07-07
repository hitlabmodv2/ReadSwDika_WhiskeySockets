import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const app = express();
const PORT = process.env.PORT || 5000;

function getBotInfo() {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
    return { name: pkg.name || 'WilyBot', version: pkg.version || '?' };
  } catch { return { name: 'WilyBot', version: '?' }; }
}

function getConfig() {
  try {
    return JSON.parse(readFileSync('./config.json', 'utf8'));
  } catch { return {}; }
}

app.get('/', (req, res) => {
  const { name, version } = getBotInfo();
  const cfg = getConfig();
  const ownerName = cfg.ownerName || 'Bang Wily';
  const ownerNumber = cfg.ownerNumber || '6289688206739';
  const sessionName = process.env.BOT_SESSION_NAME || 'hisoka';
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${name} v${version}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .icon { font-size: 64px; margin-bottom: 16px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    h1 { font-size: 2rem; font-weight: 800; background: linear-gradient(135deg, #00d4aa, #00b4d8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px; }
    .version { color: rgba(255,255,255,0.4); font-size: 0.85rem; margin-bottom: 32px; }
    .badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(0,212,128,0.15); border: 1px solid rgba(0,212,128,0.4);
      color: #00d480; border-radius: 50px; padding: 8px 20px;
      font-weight: 600; font-size: 0.9rem; margin-bottom: 32px;
    }
    .dot { width: 8px; height: 8px; background: #00d480; border-radius: 50%; animation: blink 1s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
    .info-item {
      background: rgba(255,255,255,0.05); border-radius: 14px; padding: 16px 12px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .info-label { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .info-value { font-size: 0.95rem; font-weight: 600; color: #e2e8f0; }
    .footer { color: rgba(255,255,255,0.25); font-size: 0.75rem; border-top: 1px solid rgba(255,255,255,0.07); padding-top: 20px; }
    .wa-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #25d366, #128c7e);
      color: white; text-decoration: none; border-radius: 50px;
      padding: 10px 24px; font-weight: 600; font-size: 0.88rem;
      margin-bottom: 24px; transition: opacity .2s;
    }
    .wa-btn:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🤖</div>
    <h1>${name}</h1>
    <div class="version">Versi ${version}</div>
    <div class="badge"><div class="dot"></div> Server Online</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Owner</div>
        <div class="info-value">${ownerName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Session</div>
        <div class="info-value">${sessionName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Platform</div>
        <div class="info-value">Replit</div>
      </div>
      <div class="info-item">
        <div class="info-label">Waktu</div>
        <div class="info-value" style="font-size:0.78rem">${now}</div>
      </div>
    </div>
    <a class="wa-btn" href="https://wa.me/${ownerNumber}" target="_blank">
      💬 Chat Owner
    </a>
    <div class="footer">© ${new Date().getFullYear()} ${name} — Powered by Baileys &amp; Replit</div>
  </div>
</body>
</html>`);
});

app.get('/health', (req, res) => res.json({ status: 'ok', bot: getBotInfo().name, time: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Web server jalan di port ${PORT}`);
});
