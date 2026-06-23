/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  flamingtext.cjs — Logo Generator (.logo)
 *  Format: .logo [style]|[teks kamu]
 *  Contoh: .logo neon|BangWily
 *
 *  Flow: POST form → 302 job URL → parse img URL → download → kirim
 * ───────────────────────────────
 */
'use strict';

const axios  = require('axios');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// ── Konversi GIF buffer → MP4 buffer (agar animasi jalan di WhatsApp) ─────────
async function gifToMp4(gifBuffer) {
  const tmpGif = path.join(os.tmpdir(), `ftlogo_${Date.now()}.gif`);
  const tmpMp4 = path.join(os.tmpdir(), `ftlogo_${Date.now()}.mp4`);
  try {
    fs.writeFileSync(tmpGif, gifBuffer);
    await execFileAsync('ffmpeg', [
      '-y', '-i', tmpGif,
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-preset', 'fast',
      '-crf', '28',
      tmpMp4
    ], { timeout: 30000 });
    const mp4Buf = fs.readFileSync(tmpMp4);
    return mp4Buf;
  } finally {
    try { fs.unlinkSync(tmpGif); } catch {}
    try { fs.unlinkSync(tmpMp4); } catch {}
  }
}

const FT_BASE = 'https://www.flamingtext.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Daftar style ───────────────────────────────────────────────────────────────
const STYLE_LIST = [
  { name: 'fire',       script: 'fire-logo',            ref: 'logo/Design-Fire',                  isAnim: false },
  { name: 'flaming',    script: 'flaming-logo',          ref: 'logo/Design-Flaming-Text-Animation', isAnim: true  },
  { name: 'innerfire',  script: 'inner-fire-anim-logo',  ref: 'logo/Design-Inner-Fire-Animation',   isAnim: true  },
  { name: 'burning',    script: 'burning-logo',          ref: 'logo/Design-Burning',               isAnim: true  },
  { name: 'alienglow',  script: 'alien-glow-anim-logo',  ref: 'logo/Design-Alien-Glow-Animation',   isAnim: true  },
  { name: 'alien',      script: 'alien-glow-logo',       ref: 'logo/Design-Alien-Glow',            isAnim: false },
  { name: 'alienneon',  script: 'alien-neon-logo',       ref: 'logo/Design-Alien-Neon',            isAnim: false },
  { name: 'chrome',     script: 'chrome-logo',           ref: 'logo/Design-Chrome',                isAnim: false },
  { name: 'chrominium', script: 'chrominium-logo',       ref: 'logo/Design-Chrominium',            isAnim: false },
  { name: 'neon',       script: 'neon-logo',             ref: 'logo/Design-Neon',                  isAnim: false },
  { name: 'electric',   script: 'electric',              ref: 'logo/Design-Electric',              isAnim: false },
  { name: 'ice',        script: 'ice-logo',              ref: 'logo/Design-Ice',                   isAnim: false },
  { name: 'icefire',    script: 'ice-fire-logo',         ref: 'logo/Design-Ice-Fire',              isAnim: false },
  { name: 'gold',       script: 'gold-logo',             ref: 'logo/Design-Gold',                  isAnim: false },
  { name: 'gold3d',     script: 'gold-3d-logo',          ref: 'logo/Design-GOLD-3D',               isAnim: false },
  { name: 'glow',       script: 'glow-logo',             ref: 'logo/Design-Glow',                  isAnim: false },
  { name: '3d',         script: '3d-logo',               ref: 'logo/Design-3D-Text',               isAnim: false },
  { name: 'shadow',     script: 'shadowplay-logo',       ref: 'logo/Design-Shadowplay',            isAnim: false },
  { name: 'retro',      script: 'retro-logo',            ref: 'logo/Design-Retro',                 isAnim: false },
  { name: 'cool',       script: 'cool-logo',             ref: 'logo/Design-Cool',                  isAnim: false },
  { name: 'dracula',    script: 'dracula-logo',          ref: 'logo/Design-Dracula',               isAnim: false },
  { name: 'clan',       script: 'clan-logo',             ref: 'logo/Design-Clan',                  isAnim: false },
  { name: 'elegant',    script: 'elegant-logo',          ref: 'logo/Design-Elegant',               isAnim: false },
  { name: 'winner',     script: 'winner-logo',           ref: 'logo/Design-Winner',                isAnim: false },
  { name: 'splat',      script: 'splat-logo',            ref: 'logo/Design-Splat',                 isAnim: false },
  { name: 'marbles',    script: 'marbles-logo',          ref: 'logo/Design-Marbles',               isAnim: false },
  { name: 'blood',      script: 'blood-3d-logo',         ref: 'logo/Design-Blood-3D',              isAnim: false },
];

// ── Cari style ─────────────────────────────────────────────────────────────────
function findStyle(keyword) {
  if (!keyword || keyword === 'random' || keyword === 'acak') {
    return STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)];
  }
  const kw = keyword.toLowerCase().replace(/\s+/g, '');
  // Prioritas: exact match dulu, baru partial match
  return STYLE_LIST.find(s => s.name === kw)
    || STYLE_LIST.find(s => s.name.startsWith(kw))
    || STYLE_LIST.find(s => s.name.includes(kw))
    || STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)];
}

// ── Generate logo via flamingtext.com ─────────────────────────────────────────
async function generateLogo(style, text) {
  const params = new URLSearchParams({
    '_comBuyRedirect':        'false',
    'script':                 style.script,
    'fontsize':               '70',
    'textBorder':             '20',
    'growSize':               '0',
    'antialias':              'on',
    'hinting':                'on',
    'justify':                '1',
    'letterSpacing':          '0',
    'lineSpacing':            '0',
    'textSlant':              '0',
    'textVerticalSlant':      '0',
    'textAngle':              '0',
    'textOutline':            'false',
    'textOutlineSize':        '2',
    'textColor':              '#000000',
    'fireSize':               '70',
    'backgroundResizeToLayers': 'on',
    'backgroundRadio':        '0',
    'backgroundColor':        '#000000',
    'watermark':              'none',
    'jpgQuality':             '85',
    'doScale':                'off',
    'text':                   text
  });

  // Step 1: POST → 302 → job URL
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
  if (!jobUrl) throw new Error('Server tidak mengembalikan job URL');

  // Step 2: Fetch job page → cari URL gambar hasil
  const { data: jobHtml } = await axios.get(jobUrl, {
    headers: { 'User-Agent': UA, 'Referer': FT_BASE + '/' + style.ref },
    timeout: 20000
  });

  // Cari dari tag <img class='logoImage'> — paling akurat
  let imgUrl = null;
  const logoTag = jobHtml.match(
    /<img[^>]+class=[\"'][^\"']*logoImage[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']/i
  ) || jobHtml.match(
    /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+class=[\"'][^\"']*logoImage[^\"']*[\"']/i
  );
  if (logoTag) imgUrl = logoTag[1];

  // Fallback: cari URL engine dari semua URL di halaman
  if (!imgUrl) {
    const engineMatch = jobHtml.match(
      /https:\/\/de\d+-engine\.flamingtext\.com\/netfu\/[^"'&\s<>]+\.(png|gif)/i
    ) || jobHtml.match(
      /https:\/\/[a-z0-9-]+\.flamingtext\.com\/netfu\/[^"'&\s<>]+\.(png|gif)/i
    );
    if (engineMatch) imgUrl = engineMatch[0];
  }

  if (!imgUrl) throw new Error('Gagal menemukan URL gambar di halaman hasil');

  // Step 3: Download gambar
  const { data: imgData } = await axios.get(imgUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': UA, 'Referer': jobUrl },
    timeout: 20000
  });

  let buffer = Buffer.from(imgData);
  const isGif = buffer.slice(0, 3).toString() === 'GIF';
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;

  if (!isGif && !isPng) throw new Error('File hasil bukan gambar valid');

  // PNG: composite ke background putih agar teks apapun terlihat jelas
  if (isPng) {
    const sharp = require('sharp');
    const { width, height } = await sharp(buffer).metadata();
    buffer = await sharp({
      create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
    .composite([{ input: buffer, blend: 'over' }])
    .png()
    .toBuffer();
  }

  return { buffer, isGif };
}

// ── Handler utama ──────────────────────────────────────────────────────────────
async function handleFlamingtext({ hisoka, m, query, tolak, logCommand, logError }) {
  const q = (query || '').trim();

  // ── .logo list ─────────────────────────────────────────────────────────────
  if (!q || q === 'list' || q === 'daftar') {
    const anim   = STYLE_LIST.filter(s => s.isAnim);
    const statis = STYLE_LIST.filter(s => !s.isAnim);
    const txt = [
      `╔══════════════════════════╗`,
      `║   🎨  *LOGO GENERATOR*       ║`,
      `╚══════════════════════════╝`,
      ``,
      `📦 *Total Style: ${STYLE_LIST.length}* (${anim.length} animasi + ${statis.length} PNG)`,
      ``,
      `✨ *Animasi GIF (${anim.length} style):*`,
      anim.map((s, i) => `  ${i + 1}. \`${s.name}\``).join('\n'),
      ``,
      `🖼️ *Static PNG (${statis.length} style):*`,
      statis.map((s, i) => `  ${i + 1}. \`${s.name}\``).join('\n'),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💡 *Format pakai:*`,
      `  *.logo [style]|[teks kamu]*`,
      ``,
      `📌 *Contoh:*`,
      `  _.logo neon|BangWily_`,
      `  _.logo fire|Nama Bebas_`,
      `  _.logo alienglow|Juara_`,
      `  _.logo burning|WilyBot_`,
      `  _.logo random|HaloBot_`,
      ``,
      `🎲 *random* = style acak otomatis`,
    ].join('\n');

    await hisoka.sendMessage(m.from, { text: txt }, { quoted: m });
    logCommand(m, hisoka, 'logo');
    return;
  }

  // ── Parse format: [style]|[teks] ──────────────────────────────────────────
  let styleKey, text;

  if (q.includes('|')) {
    const idx    = q.indexOf('|');
    styleKey     = q.slice(0, idx).trim().toLowerCase();
    text         = q.slice(idx + 1).trim();
  } else {
    // Tanpa pipe: semua = style, teks pakai nama pengirim
    styleKey = q.toLowerCase();
    text     = m.pushName || 'WilyBot';
  }

  if (!text) {
    return await tolak(hisoka, m,
      `❌ Teks tidak boleh kosong!\n\n` +
      `Format: *.logo [style]|[teks]*\n` +
      `Contoh: _.logo neon|BangWily_\n\n` +
      `Ketik *.logo list* untuk semua style.`
    );
  }

  if (text.length > 25) {
    return await tolak(hisoka, m,
      `❌ Teks maksimal *25 karakter*.\n` +
      `Teksmu sekarang: *${text.length}* karakter.`
    );
  }

  const style = findStyle(styleKey);

  await hisoka.sendMessage(m.from, { react: { text: '🎨', key: m.key } });

  try {
    const { buffer, isGif } = await generateLogo(style, text);

    const caption = [
      `🎨 *Logo Generator*`,
      ``,
      `📝 Teks  : *${text}*`,
      `🎨 Style : *${style.name}*`,
      isGif ? `✨ Tipe   : GIF Animasi` : `🖼️ Tipe   : PNG Static`,
      ``,
      `_Ketik .logo list untuk semua style_`,
    ].join('\n');

    if (isGif) {
      let videoBuffer = buffer;
      try {
        videoBuffer = await gifToMp4(buffer);
      } catch (convErr) {
        console.error('\x1b[33m[Logo] GIF→MP4 gagal, kirim GIF langsung:\x1b[39m', convErr.message);
      }
      await hisoka.sendMessage(m.from, { video: videoBuffer, gifPlayback: true, caption }, { quoted: m });
    } else {
      await hisoka.sendMessage(m.from, { image: buffer, caption }, { quoted: m });
    }

    await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
    logCommand(m, hisoka, 'logo');

  } catch (err) {
    console.error('\x1b[31m[Logo] Error:\x1b[39m', err.message);
    if (logError) logError(err, 'command:logo');
    await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
    await tolak(hisoka, m,
      `❌ *Logo Gagal Dibuat*\n\n` +
      `_${err.message}_\n\n` +
      `Coba lagi atau ganti style.\n` +
      `Ketik *.logo list* untuk semua style.`
    );
  }
}

module.exports = { handleFlamingtext, STYLE_LIST, generateLogo };
