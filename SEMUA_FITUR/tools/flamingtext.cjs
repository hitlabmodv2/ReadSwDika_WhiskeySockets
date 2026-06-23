/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  flamingtext.cjs — FlamingText Logo Generator (.flamingtext / .ft)
 *  Generate logo teks keren dari flamingtext.com (supports GIF animasi!)
 *
 *  Flow: POST form → 302 → job URL → parse img URL → download → kirim
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

const FT_BASE  = 'https://www.flamingtext.com';
const ENG_BASE = 'https://de7-engine.flamingtext.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Daftar style (script name harus sesuai dengan flamingtext.com) ─────────────
const STYLE_LIST = [
  { name: 'fire',         script: 'fire-logo',             ref: 'logo/Design-Fire',                  isAnim: false },
  { name: 'flaming',      script: 'flaming-logo',           ref: 'logo/Design-Flaming-Text-Animation', isAnim: true  },
  { name: 'innerfire',    script: 'inner-fire-anim-logo',   ref: 'logo/Design-Inner-Fire-Animation',   isAnim: true  },
  { name: 'burning',      script: 'burning-logo',           ref: 'logo/Design-Burning',               isAnim: true  },
  { name: 'alienglow',    script: 'alien-glow-anim-logo',   ref: 'logo/Design-Alien-Glow-Animation',   isAnim: true  },
  { name: 'alien',        script: 'alien-glow-logo',        ref: 'logo/Design-Alien-Glow',            isAnim: false },
  { name: 'alienneon',    script: 'alien-neon-logo',        ref: 'logo/Design-Alien-Neon',            isAnim: false },
  { name: 'chrome',       script: 'chrome-logo',            ref: 'logo/Design-Chrome',                isAnim: false },
  { name: 'chrominium',   script: 'chrominium-logo',        ref: 'logo/Design-Chrominium',            isAnim: false },
  { name: 'neon',         script: 'neon-logo',              ref: 'logo/Design-Neon',                  isAnim: false },
  { name: 'electric',     script: 'electric',               ref: 'logo/Design-Electric',              isAnim: false },
  { name: 'ice',          script: 'ice-logo',               ref: 'logo/Design-Ice',                   isAnim: false },
  { name: 'icefire',      script: 'ice-fire-logo',          ref: 'logo/Design-Ice-Fire',              isAnim: false },
  { name: 'gold',         script: 'gold-logo',              ref: 'logo/Design-Gold',                  isAnim: false },
  { name: 'gold3d',       script: 'gold-3d-logo',           ref: 'logo/Design-GOLD-3D',               isAnim: false },
  { name: 'glow',         script: 'glow-logo',              ref: 'logo/Design-Glow',                  isAnim: false },
  { name: '3d',           script: '3d-logo',                ref: 'logo/Design-3D-Text',               isAnim: false },
  { name: 'shadow',       script: 'shadowplay-logo',        ref: 'logo/Design-Shadowplay',            isAnim: false },
  { name: 'retro',        script: 'retro-logo',             ref: 'logo/Design-Retro',                 isAnim: false },
  { name: 'cool',         script: 'cool-logo',              ref: 'logo/Design-Cool',                  isAnim: false },
  { name: 'dracula',      script: 'dracula-logo',           ref: 'logo/Design-Dracula',               isAnim: false },
  { name: 'clan',         script: 'clan-logo',              ref: 'logo/Design-Clan',                  isAnim: false },
  { name: 'elegant',      script: 'elegant-logo',           ref: 'logo/Design-Elegant',               isAnim: false },
  { name: 'winner',       script: 'winner-logo',            ref: 'logo/Design-Winner',                isAnim: false },
  { name: 'splat',        script: 'splat-logo',             ref: 'logo/Design-Splat',                 isAnim: false },
  { name: 'marbles',      script: 'marbles-logo',           ref: 'logo/Design-Marbles',               isAnim: false },
  { name: 'blood',        script: 'blood-3d-logo',          ref: 'logo/Design-Blood-3D',              isAnim: false },
];

// ── Cari style berdasarkan nama ───────────────────────────────────────────────
function findStyle(keyword) {
  if (!keyword || keyword === 'random') {
    return STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)];
  }
  const kw = keyword.toLowerCase().replace(/\s+/g, '');
  return STYLE_LIST.find(s => s.name === kw || s.script.startsWith(kw) || s.name.includes(kw))
    || STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)];
}

// ── Generate logo: POST form → job URL → parse image URL ─────────────────────
async function generateLogo(style, text) {
  const params = new URLSearchParams({
    '_comBuyRedirect': 'false',
    'script':          style.script,
    'fontsize':        '70',
    'textBorder':      '20',
    'growSize':        '0',
    'antialias':       'on',
    'hinting':         'on',
    'justify':         '1',
    'letterSpacing':   '0',
    'lineSpacing':     '0',
    'textSlant':       '0',
    'textVerticalSlant': '0',
    'textAngle':       '0',
    'textOutline':     'false',
    'textOutlineSize': '2',
    'textColor':       '#000000',
    'fireSize':        '70',
    'backgroundResizeToLayers': 'on',
    'backgroundRadio': '0',
    'backgroundColor': '#000000',
    'watermark':       'none',
    'jpgQuality':      '85',
    'doScale':         'off',
    'text':            text
  });

  // Step 1: POST form → dapatkan job URL (302 redirect)
  const postResp = await axios.post(
    FT_BASE + '/net-fu/proxy_form.cgi',
    params.toString(),
    {
      headers: {
        'User-Agent':   UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer':      FT_BASE + '/' + style.ref,
        'Origin':       FT_BASE
      },
      responseType:   'arraybuffer',
      maxRedirects:   0,
      validateStatus: s => s < 500,
      timeout:        20000
    }
  );

  const jobUrl = postResp.headers['location'];
  if (!jobUrl) throw new Error('Flamingtext tidak mengembalikan job URL');

  // Step 2: Fetch job page → cari URL gambar hasil generate
  const { data: jobHtml } = await axios.get(jobUrl, {
    headers: { 'User-Agent': UA, 'Referer': FT_BASE + '/' + style.ref },
    timeout: 20000
  });

  // Cari URL gambar dari de7-engine (atau engine lain)
  const patterns = [
    /https:\/\/de\d+-engine\.flamingtext\.com\/netfu\/[^\s"'<>]+\.(png|gif)/i,
    /https:\/\/[a-z0-9-]+\.flamingtext\.com\/netfu\/[^\s"'<>]+\.(png|gif)/i
  ];

  let imgUrl = null;
  for (const p of patterns) {
    const m = jobHtml.match(p);
    if (m) { imgUrl = m[0]; break; }
  }

  if (!imgUrl) {
    // Fallback: cari tag <img class='logoImage'>
    const logoMatch = jobHtml.match(
      /<img[^>]+class=[\"'][^\"']*logoImage[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i
    ) || jobHtml.match(
      /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+class=[\"'][^\"']*logoImage[^\"']*[\"']/i
    );
    if (logoMatch) imgUrl = logoMatch[1];
  }

  if (!imgUrl) throw new Error('Gagal menemukan URL gambar di halaman hasil');

  // Step 3: Download gambar hasil generate
  const { data: imgData } = await axios.get(imgUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': UA, 'Referer': jobUrl },
    timeout: 20000
  });

  const buffer = Buffer.from(imgData);
  const isGif  = buffer.slice(0, 3).toString() === 'GIF';
  const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50;

  if (!isGif && !isPng) throw new Error('File hasil bukan gambar valid');

  return { buffer, isGif, imgUrl, jobUrl };
}

// ── Handler utama ─────────────────────────────────────────────────────────────
async function handleFlamingtext({ hisoka, m, query, tolak, logCommand, logError }) {
  const args = (query || '').trim();

  // ── .flamingtext list ──────────────────────────────────────────────────────
  if (args.toLowerCase() === 'list' || args.toLowerCase() === 'daftar') {
    const animStyles   = STYLE_LIST.filter(s => s.isAnim);
    const staticStyles = STYLE_LIST.filter(s => !s.isAnim);
    const lines = [
      `🔥 *FlamingText — Daftar Style (${STYLE_LIST.length} style)*`,
      ``,
      `✨ *Animasi GIF (${animStyles.length} style):*`,
      animStyles.map(s => `  • \`${s.name}\``).join('\n'),
      ``,
      `🖼️ *Static PNG (${staticStyles.length} style):*`,
      staticStyles.map(s => `  • \`${s.name}\``).join('\n'),
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `💡 *Cara pakai:*`,
      `_.flamingtext [style] [teks kamu]_`,
      ``,
      `📌 *Contoh:*`,
      `_.flamingtext fire BangWily_`,
      `_.flamingtext alienglow NamaKamu_`,
      `_.flamingtext burning Juara_`,
      `_.flamingtext random HaloBot_`,
    ];
    await hisoka.sendMessage(m.from, { text: lines.join('\n') }, { quoted: m });
    logCommand(m, hisoka, 'flamingtext');
    return;
  }

  // ── Parse: .flamingtext [style] [teks] ────────────────────────────────────
  const parts = args.split(/\s+/);
  let styleKey, text;

  if (parts.length >= 2) {
    // Coba: kata pertama = style, sisanya = teks
    const maybeStyle = findStyle(parts[0]);
    const isKnownStyle = STYLE_LIST.some(s =>
      s.name === parts[0].toLowerCase() || s.script.startsWith(parts[0].toLowerCase())
    );
    if (isKnownStyle) {
      styleKey = parts[0];
      text     = parts.slice(1).join(' ');
    } else {
      // Seluruh args = teks, style random
      styleKey = 'random';
      text     = args;
    }
  } else {
    // Hanya 1 kata: bisa style (tanpa teks) atau teks (tanpa style)
    const isKnownStyle = STYLE_LIST.some(s => s.name === parts[0].toLowerCase());
    if (isKnownStyle) {
      styleKey = parts[0];
      text     = '';
    } else {
      styleKey = 'random';
      text     = args;
    }
  }

  // Wajib ada teks
  if (!text || text.trim() === '') {
    return await tolak(hisoka, m,
      `❌ *Teks wajib diisi!*\n\n` +
      `Contoh:\n` +
      `_.flamingtext fire BangWily_\n` +
      `_.flamingtext alienglow NamaKamu_\n` +
      `_.flamingtext random HaloBot_\n\n` +
      `Ketik *.flamingtext list* untuk semua style.`
    );
  }

  if (text.length > 25) {
    return await tolak(hisoka, m, `❌ Teks maksimal *25 karakter*. Teksmu: ${text.length} karakter.`);
  }

  const style = findStyle(styleKey);

  await hisoka.sendMessage(m.from, { react: { text: '🔥', key: m.key } });

  try {
    const { buffer, isGif } = await generateLogo(style, text);

    const caption = [
      `🔥 *FlamingText — ${style.name.toUpperCase()}*`,
      ``,
      `📝 Teks : *${text}*`,
      `🎨 Style : *${style.name}*`,
      isGif ? `✨ Animasi GIF` : `🖼️ Static PNG`,
      ``,
      `_Ketik .flamingtext list untuk semua style_`,
    ].join('\n');

    if (isGif) {
      await hisoka.sendMessage(m.from, { video: buffer, gifPlayback: true, caption }, { quoted: m });
    } else {
      await hisoka.sendMessage(m.from, { image: buffer, caption }, { quoted: m });
    }

    await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
    logCommand(m, hisoka, 'flamingtext');

  } catch (err) {
    console.error('\x1b[31m[FlamingText] Error:\x1b[39m', err.message);
    if (logError) logError(err, 'command:flamingtext');
    await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
    await tolak(hisoka, m,
      `❌ *FlamingText Gagal*\n\n` +
      `_${err.message}_\n\n` +
      `Coba lagi atau ganti style.\nKetik *.flamingtext list* untuk semua style.`
    );
  }
}

module.exports = { handleFlamingtext, STYLE_LIST, generateLogo };
