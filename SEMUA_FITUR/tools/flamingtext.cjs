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
const https  = require('https');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const ctAgent = new https.Agent({ rejectUnauthorized: false });

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
const CT_BASE = 'https://cooltext.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Daftar style ───────────────────────────────────────────────────────────────
// isAnim: true  → hasil GIF animasi bergerak (dikonversi MP4 sebelum kirim WA)
// isAnim: false → hasil PNG static (gambar diam)
const STYLE_LIST = [

  // ════════════════════════════════
  // 🎞️  ANIMASI GIF (bergerak di WA)
  // ════════════════════════════════
  { name: 'flaming',   script: 'flaming-logo',         ref: 'logo/Design-Flaming-Text-Animation', isAnim: true },
  { name: 'innerfire', script: 'inner-fire-anim-logo', ref: 'logo/Design-Inner-Fire-Animation',   isAnim: true },
  { name: 'burning',   script: 'burning-logo',         ref: 'logo/Design-Burning',                isAnim: true },
  { name: 'alienglow', script: 'alien-glow-anim-logo', ref: 'logo/Design-Alien-Glow-Animation',   isAnim: true,
    params: { backgroundColor: '#000000', textBorder: '15' } },
  { name: 'glitter',   script: 'glitter-anim-logo',    ref: 'logo/Design-Glitter-Animation',      isAnim: true,
    params: { textBorder: '15' } },
  { name: 'memories',  script: 'memories-anim-logo',   ref: 'logo/Design-Memories-Animation',     isAnim: true,
    params: { textColor: '#BD0000', backgroundColor: '#FFFFFF', fontsize: '80', textBorder: '15' } },
  { name: 'burnin',    script: 'burn-in-anim-logo',    ref: 'logo/Design-Burn-In-Animation',      isAnim: true,
    params: { textColor: '#FFFF66', backgroundColor: '#000000', fontsize: '50', textBorder: '15' } },
  { name: 'whirl',     script: 'whirl-anim-logo',      ref: 'logo/Design-Whirl-Animation',        isAnim: true,
    params: { textColor: '#0000FF', fontsize: '50', textBorder: '20' } },
  { name: 'highlight', script: 'highlight-anim-logo',  ref: 'logo/Design-Highlight-Animation',    isAnim: true,
    params: { textColor: '#126CB4', backgroundColor: '#000000', fontsize: '50', textBorder: '12' } },
  { name: 'jump',      script: 'jump-anim-logo',       ref: 'logo/Design-Jump-Animation',         isAnim: true,
    params: { textColor: '#CD0000', backgroundColor: '#FFFFFF', fontsize: '70', textBorder: '15' } },
  { name: 'bluefire',  script: 'blue-fire',            ref: 'logo/Design-Blue-Flames-Animation',  isAnim: true,
    params: { textColor: '#0000CC', textBorder: '15' } },
  { name: 'shake',     script: 'shake-anim-logo',      ref: 'logo/Design-Shake-Animation',        isAnim: true,
    params: { textColor: '#CD0000', backgroundColor: '#FFFFFF', fontsize: '70', textBorder: '15' } },
  { name: 'flash',     script: 'flash-anim-logo',      ref: 'logo/Design-Flash-Animation',        isAnim: true,
    params: { textColor: '#BDBD00', backgroundColor: '#000000', fontsize: '100', textBorder: '15' } },

  // ════════════════════════════════
  // 🖼️  STATIC PNG (gambar diam)
  // ════════════════════════════════
  { name: 'fire',       script: 'fire-logo',             ref: 'logo/Design-Fire',            isAnim: false },
  { name: 'alien',      script: 'alien-glow-logo',       ref: 'logo/Design-Alien-Glow',      isAnim: false },
  { name: 'alienneon',  script: 'alien-neon-logo',       ref: 'logo/Design-Alien-Neon',      isAnim: false },
  { name: 'chrome',     script: 'chrome-logo',           ref: 'logo/Design-Chrome',          isAnim: false },
  { name: 'chrominium', script: 'chrominium-logo',       ref: 'logo/Design-Chrominium',      isAnim: false },
  { name: 'neon',       script: 'neon-logo',             ref: 'logo/Design-Neon',            isAnim: false },
  { name: 'electric',   script: 'electric',              ref: 'logo/Design-Electric',        isAnim: false },
  { name: 'ice',        script: 'ice-logo',              ref: 'logo/Design-Ice',             isAnim: false },
  { name: 'icefire',    script: 'ice-fire-logo',         ref: 'logo/Design-Ice-Fire',        isAnim: false },
  { name: 'gold',       script: 'gold-logo',             ref: 'logo/Design-Gold',            isAnim: false },
  { name: 'gold3d',     script: 'gold-3d-logo',          ref: 'logo/Design-GOLD-3D',         isAnim: false },
  { name: 'glow',       script: 'glow-logo',             ref: 'logo/Design-Glow',            isAnim: false },
  { name: '3d',         script: '3d-logo',               ref: 'logo/Design-3D-Text',         isAnim: false },
  { name: 'shadow',     script: 'shadowplay-logo',       ref: 'logo/Design-Shadowplay',      isAnim: false },
  { name: 'retro',      script: 'retro-logo',            ref: 'logo/Design-Retro',           isAnim: false },
  { name: 'cool',       script: 'cool-logo',             ref: 'logo/Design-Cool',            isAnim: false },
  { name: 'dracula',    script: 'dracula-logo',          ref: 'logo/Design-Dracula',         isAnim: false },
  { name: 'clan',       script: 'clan-logo',             ref: 'logo/Design-Clan',            isAnim: false },
  { name: 'elegant',    script: 'elegant-logo',          ref: 'logo/Design-Elegant',         isAnim: false },
  { name: 'winner',     script: 'winner-logo',           ref: 'logo/Design-Winner',          isAnim: false },
  { name: 'splat',      script: 'splat-logo',            ref: 'logo/Design-Splat',           isAnim: false },
  { name: 'marbles',    script: 'marbles-logo',          ref: 'logo/Design-Marbles',         isAnim: false },
  { name: 'blood',      script: 'blood-3d-logo',         ref: 'logo/Design-Blood-3D',        isAnim: false },
  { name: 'plasma',     script: 'plasma-logo',           ref: 'logo/Design-Plasma',          isAnim: false },
  { name: 'graffiti',   script: 'graffiti-logo',         ref: 'logo/Design-Graffiti',        isAnim: false },
  { name: 'matrix',     script: 'matrix-logo',           ref: 'logo/Design-Matrix',          isAnim: false },
  { name: 'groovy',     script: 'groovy-logo',           ref: 'logo/Design-Groovy',          isAnim: false },
  { name: 'comic',      script: 'comic-logo',            ref: 'logo/Design-Comic',           isAnim: false },
  { name: 'super',      script: 'super-hero-logo',       ref: 'logo/Design-Super-Hero',      isAnim: false },
  { name: 'stencil',    script: 'stencil-logo',          ref: 'logo/Design-Stencil',         isAnim: false },
  { name: 'silver',     script: 'silver-logo',           ref: 'logo/Design-Silver',          isAnim: false },
  { name: 'copper',     script: 'copper-logo',           ref: 'logo/Design-Copper',          isAnim: false },
  { name: 'steel',      script: 'steel-logo',            ref: 'logo/Design-Steel',           isAnim: false },
  { name: 'glass',      script: 'glass-logo',            ref: 'logo/Design-Glass',           isAnim: false },
  { name: 'candy',      script: 'candy-logo',            ref: 'logo/Design-Candy',           isAnim: false },
  { name: 'sports',     script: 'sports-logo',           ref: 'logo/Design-Sports',          isAnim: false },
  { name: 'plastic',    script: 'plastic-logo',          ref: 'logo/Design-Plastic',         isAnim: false },
  { name: 'chalk',      script: 'chalk-logo',            ref: 'logo/Design-Chalk',           isAnim: false },
  { name: 'starwars',   script: 'star-wars-logo',        ref: 'logo/Design-Star-Wars',       isAnim: false },
  { name: 'christmas',  script: 'christmas-logo',        ref: 'logo/Design-Christmas',       isAnim: false },
  { name: 'halloween',  script: 'halloween-logo',        ref: 'logo/Design-Halloween',       isAnim: false },
  { name: 'army',       script: 'army-logo',             ref: 'logo/Design-Army',            isAnim: false },
  { name: 'tattoo',     script: 'tattoo-logo',           ref: 'logo/Design-Tattoo',          isAnim: false },
  { name: 'planet',     script: 'planet-logo',           ref: 'logo/Design-Planet',          isAnim: false },
  { name: 'glowing',    script: 'glowing-logo',          ref: 'logo/Design-Glowing',         isAnim: false },
  { name: 'ninja',      script: 'ninja-logo',            ref: 'logo/Design-Ninja',           isAnim: false },
  { name: 'country',    script: 'country-logo',          ref: 'logo/Design-Country',         isAnim: false },

  // ════════════════════════════════
  // ✨ ANIMASI GIF — CoolText.com
  //    (source:'cooltext', tidak duplikat dengan FlamingText)
  // ════════════════════════════════
  { name: 'ctburning',  source: 'cooltext', logoId: 4,          ref: 'Logo-Design-Burning',      isAnim: true,
    params: { Color1_color: 'FF0000', Integer1: '15', Boolean1: 'on', Integer13: 'on', Integer12: 'on' } },
  { name: 'animglow',   source: 'cooltext', logoId: 26,         ref: 'Logo-Design-Animated-Glow', isAnim: true,
    params: { BackgroundColor_color: '000000', Integer13: 'on', Integer12: 'on' } },
  { name: 'molten',     source: 'cooltext', logoId: 43,         ref: 'Logo-Design-Molten-Core',  isAnim: true,
    params: { Boolean1: 'on', Integer13: 'on', Integer12: 'on' } },
  { name: 'ctglitter',  source: 'cooltext', logoId: 44,         ref: 'Logo-Design-Glitter',      isAnim: true,
    params: { Integer13: 'on', Integer12: 'on' } },
  { name: 'blinkie',    source: 'cooltext', logoId: 819515844,  ref: 'Logo-Design-Blinkie',      isAnim: true,
    params: { Integer13: 'on', Integer12: 'on' } },
  { name: 'love',       source: 'cooltext', logoId: 819721038,  ref: 'Logo-Design-Love',         isAnim: true,
    params: { Integer13: 'on', Integer12: 'on' } },
  { name: 'ctflaming',  source: 'cooltext', logoId: 1169711118, ref: 'Logo-Design-Flaming',      isAnim: true,
    params: { Integer13: 'on', Integer12: 'on' } },

  // ════════════════════════════════
  // ✨ ANIMASI GIF — GlowTxt.com
  //    (source:'glowtxt', anim_type: pulse/sweep)
  //    Tidak duplikat dengan FT/CT
  // ════════════════════════════════
  { name: 'glowpulse',    source: 'glowtxt', gtStyle: 'glowtxt',         animType: 'pulse', isAnim: true },
  { name: 'neonsweep',    source: 'glowtxt', gtStyle: 'neonlights',      animType: 'sweep', isAnim: true },
  { name: 'electricblue', source: 'glowtxt', gtStyle: 'electricblue',    animType: 'pulse', isAnim: true },
  { name: 'volcano',      source: 'glowtxt', gtStyle: 'volcano',         animType: 'sweep', isAnim: true },
  { name: 'starlight',    source: 'glowtxt', gtStyle: 'starlight',       animType: 'pulse', isAnim: true },
  { name: 'magicdust',    source: 'glowtxt', gtStyle: 'magicdust',       animType: 'sweep', isAnim: true },
  { name: 'disco',        source: 'glowtxt', gtStyle: 'discodiva',       animType: 'pulse', isAnim: true },
  { name: 'sparkle',      source: 'glowtxt', gtStyle: 'sprinklesparkle', animType: 'sweep', isAnim: true },
  { name: 'flutter',      source: 'glowtxt', gtStyle: 'flutter',         animType: 'pulse', isAnim: true },
  { name: 'bubbles',      source: 'glowtxt', gtStyle: 'bubbles',         animType: 'sweep', isAnim: true },

  // ── GlowTxt batch-2 (semua ditest live, 100% GIF) ──────────────────────────
  { name: 'heartbeat',   source: 'glowtxt', gtStyle: 'heartbeat',   animType: 'pulse', isAnim: true },
  { name: 'lollipop',    source: 'glowtxt', gtStyle: 'lollipop',    animType: 'sweep', isAnim: true },
  { name: 'jukebox',     source: 'glowtxt', gtStyle: 'jukebox',     animType: 'pulse', isAnim: true },
  { name: 'pinkglow',    source: 'glowtxt', gtStyle: 'pinkglow',    animType: 'sweep', isAnim: true },
  { name: 'piratescove', source: 'glowtxt', gtStyle: 'piratescove', animType: 'pulse', isAnim: true },
  { name: 'dragonscale', source: 'glowtxt', gtStyle: 'dragonscale', animType: 'sweep', isAnim: true },
  { name: 'ghostship',   source: 'glowtxt', gtStyle: 'ghostship',   animType: 'pulse', isAnim: true },
  { name: 'glowstick',   source: 'glowtxt', gtStyle: 'glowstick',   animType: 'sweep', isAnim: true },
  { name: 'fairygarden', source: 'glowtxt', gtStyle: 'fairygarden', animType: 'pulse', isAnim: true },
  { name: 'gobstopper',  source: 'glowtxt', gtStyle: 'gobstopper',  animType: 'sweep', isAnim: true },
  { name: 'funkyzeit',   source: 'glowtxt', gtStyle: 'funkyzeit',   animType: 'pulse', isAnim: true },
  { name: 'lavender',    source: 'glowtxt', gtStyle: 'lavender',    animType: 'sweep', isAnim: true },
  { name: 'oldenglish',  source: 'glowtxt', gtStyle: 'oldenglish',  animType: 'pulse', isAnim: true },
  { name: 'metropol',    source: 'glowtxt', gtStyle: 'metropol',    animType: 'sweep', isAnim: true },
  { name: 'airman',      source: 'glowtxt', gtStyle: 'airman',      animType: 'pulse', isAnim: true },

  // ── GlowTxt batch-3 (semua ditest live, 100% GIF) ──────────────────────────
  { name: 'fruityfresh',   source: 'glowtxt', gtStyle: 'fruityfresh',   animType: 'pulse', isAnim: true },
  { name: 'cottoncandy',   source: 'glowtxt', gtStyle: 'cottoncandy',   animType: 'sweep', isAnim: true },
  { name: 'sapphireheart', source: 'glowtxt', gtStyle: 'sapphireheart', animType: 'pulse', isAnim: true },
  { name: 'sweetheart',    source: 'glowtxt', gtStyle: 'sweetheart',    animType: 'sweep', isAnim: true },
  { name: 'cupcake',       source: 'glowtxt', gtStyle: 'cupcake',       animType: 'pulse', isAnim: true },
  { name: 'firstedition',  source: 'glowtxt', gtStyle: 'firstedition',  animType: 'sweep', isAnim: true },
  { name: 'flowerpower',   source: 'glowtxt', gtStyle: 'flowerpower',   animType: 'pulse', isAnim: true },
  { name: 'dearest',       source: 'glowtxt', gtStyle: 'dearest',       animType: 'sweep', isAnim: true },
  { name: 'broadway',      source: 'glowtxt', gtStyle: 'broadway',      animType: 'pulse', isAnim: true },
  { name: 'frontier',      source: 'glowtxt', gtStyle: 'frontier',      animType: 'sweep', isAnim: true },
  { name: 'bronze',        source: 'glowtxt', gtStyle: 'bronco',        animType: 'pulse', isAnim: true },
  { name: 'funhouse',      source: 'glowtxt', gtStyle: 'jumble',        animType: 'sweep', isAnim: true },
  { name: 'medieval',      source: 'glowtxt', gtStyle: 'medieval',      animType: 'pulse', isAnim: true },
  { name: 'starshine',     source: 'glowtxt', gtStyle: 'starshine',     animType: 'sweep', isAnim: true },
];

// ── Cari style ─────────────────────────────────────────────────────────────────
function findStyle(keyword) {
  if (!keyword || keyword === 'random' || keyword === 'acak') {
    return STYLE_LIST[Math.floor(Math.random() * STYLE_LIST.length)];
  }
  const kw = keyword.toLowerCase().replace(/\s+/g, '');
  // Prioritas: exact match dulu, baru partial match — return null kalau tidak ketemu
  return STYLE_LIST.find(s => s.name === kw)
    || STYLE_LIST.find(s => s.name.startsWith(kw))
    || STYLE_LIST.find(s => s.name.includes(kw))
    || null;
}

// ── Generate logo via cooltext.com ────────────────────────────────────────────
async function generateCooltext(style, text) {
  const baseParams = {
    LogoID: String(style.logoId),
    Text:   text,
    FontSize: '70',
    ...(style.params || {})
  };
  const params = new URLSearchParams(baseParams);

  // Step 1: POST → dapat RenderID
  const renderResp = await axios.post(
    CT_BASE + '/Render',
    params.toString(),
    {
      headers: {
        'User-Agent':   UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer':      CT_BASE + '/' + style.ref,
        'Origin':       CT_BASE
      },
      timeout: 20000
    }
  );

  const redirectLoc = renderResp.data?.redirectLocation;
  if (!redirectLoc) throw new Error('CoolText: Server tidak mengembalikan redirectLocation');

  // Step 2: GET halaman render → parse URL gambar
  const renderPageUrl = CT_BASE + '/' + redirectLoc;
  const { data: html } = await axios.get(renderPageUrl, {
    headers: { 'User-Agent': UA, 'Referer': CT_BASE + '/' + style.ref },
    timeout: 20000
  });

  // Pattern: <img src="https://r77.cooltext.com/rendered/cooltext493287.gif">
  const imgMatch = html.match(
    /https:\/\/r\d+\.cooltext\.com\/rendered\/cooltext[\d]+\.(gif|png)/i
  );
  if (!imgMatch) throw new Error('CoolText: Gagal menemukan URL gambar hasil');

  const imgUrl = imgMatch[0];

  // Step 3: Download gambar
  const { data: imgData } = await axios.get(imgUrl, {
    responseType:  'arraybuffer',
    headers: { 'User-Agent': UA, 'Referer': renderPageUrl },
    httpsAgent:    ctAgent,
    timeout:       20000
  });

  const buffer = Buffer.from(imgData);
  const isGif  = buffer.slice(0, 3).toString() === 'GIF';
  const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50;

  if (!isGif && !isPng) throw new Error('CoolText: File bukan gambar valid');

  return { buffer, isGif };
}

// ── Generate logo via glowtxt.com ─────────────────────────────────────────────
async function generateGlowtxt(style, text) {
  const GT_BASE = 'https://glowtxt.com';
  const GT_CDN  = 'https://static1.glowtxt.com';

  const reqstring = GT_BASE + '/gentext2.php' +
    '?text='         + encodeURIComponent(text) +
    '&text2=&text3=' +
    '&font_style='   + encodeURIComponent(style.gtStyle) +
    '&font_size=x'   +
    '&font_colour=0' +
    '&bgcolour='     +
    '&glow_halo=0'   +
    '&non_trans='    +
    '&glitter_border=' +
    '&anim_type='    + style.animType +
    '&submit_type=text';

  // Step 1: GET XML → dapat datadir + fullfilename
  const { data: xml } = await axios.get(reqstring, {
    headers: { 'User-Agent': UA, 'Referer': GT_BASE + '/' },
    timeout: 20000
  });

  const datadir  = xml.match(/<datadir>([^<]+)/)?.[1];
  const fullname = xml.match(/<fullfilename>([^<]+)/)?.[1];

  if (!datadir || !fullname) throw new Error('GlowTxt: Gagal parse XML response');

  // Step 2: Download gambar
  const imgUrl = `${GT_CDN}/${datadir}/${fullname}`;
  const { data: imgData } = await axios.get(imgUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': UA, 'Referer': GT_BASE + '/' },
    timeout: 25000
  });

  const buffer = Buffer.from(imgData);
  const isGif  = buffer.slice(0, 3).toString() === 'GIF';
  const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50;

  if (!isGif && !isPng) throw new Error('GlowTxt: File bukan gambar valid');

  return { buffer, isGif };
}

// ── Generate logo via flamingtext.com ─────────────────────────────────────────
async function generateLogo(style, text) {
  // Routing berdasarkan source
  if (style.source === 'cooltext') return generateCooltext(style, text);
  if (style.source === 'glowtxt')  return generateGlowtxt(style, text);
  // Base params global — di-override oleh style.params jika ada
  const baseParams = {
    '_comBuyRedirect':          'false',
    'script':                   style.script,
    'fontsize':                 '70',
    'textBorder':               '20',
    'growSize':                 '0',
    'antialias':                'on',
    'hinting':                  'on',
    'justify':                  '1',
    'letterSpacing':            '0',
    'lineSpacing':              '0',
    'textSlant':                '0',
    'textVerticalSlant':        '0',
    'textAngle':                '0',
    'textOutline':              'false',
    'textOutlineSize':          '2',
    'textColor':                '#000000',
    'fireSize':                 '70',
    'backgroundResizeToLayers': 'on',
    'backgroundRadio':          '0',
    'backgroundColor':          '#000000',
    'watermark':                'none',
    'jpgQuality':               '85',
    'doScale':                  'off',
    'text':                     text,
    // Override dengan params spesifik style (textColor, backgroundColor, fontsize, dll)
    ...(style.params || {})
  };
  const params = new URLSearchParams(baseParams);

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

  // Helper: parse URL gambar dari HTML job page
  function parseImgUrl(html) {
    // 1) Tag <img class='logoImage'> atau <img class='ft-result-img'>
    const logoTag = html.match(
      /<img[^>]+class=[^>]*(?:logoImage|ft-result-img)[^>]*src=[\"']([^\"']+)[\"']/i
    ) || html.match(
      /<img[^>]+src=[\"']([^\"']+)[\"'][^>]+class=[^>]*(?:logoImage|ft-result-img)[^>]*/i
    );
    if (logoTag) return logoTag[1].split('&')[0]; // potong &_loc=... jika ada

    // 2) URL engine flamingtext (de29-engine, ov12-engine, dll)
    const engineMatch = html.match(
      /https:\/\/[a-z0-9-]+-engine\.flamingtext\.com\/netfu\/[^"'&\s<>]+\.(png|gif)/i
    ) || html.match(
      /https:\/\/[a-z0-9-]+\.flamingtext\.com\/netfu\/[^"'&\s<>]+\.(png|gif)/i
    );
    if (engineMatch) return engineMatch[0];

    return null;
  }

  // Step 2: Fetch job page → cari URL gambar (retry 2x jika belum siap)
  let imgUrl = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data: jobHtml } = await axios.get(jobUrl, {
      headers: { 'User-Agent': UA, 'Referer': FT_BASE + '/' + style.ref },
      timeout: 20000
    });
    imgUrl = parseImgUrl(jobHtml);
    if (imgUrl) break;
    if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
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

  // ── Validasi: style tidak ditemukan ────────────────────────────────────────
  if (!style) {
    const animList  = STYLE_LIST.filter(s => s.isAnim).map(s => `\`${s.name}\``).join(', ');
    const statList  = STYLE_LIST.filter(s => !s.isAnim).map(s => `\`${s.name}\``).join(', ');
    return await tolak(hisoka, m,
      `❌ *Style "${styleKey}" tidak ditemukan!*\n\n` +
      `✨ *Style Animasi GIF:*\n${animList}\n\n` +
      `🖼️ *Style Static PNG:*\n${statList}\n\n` +
      `💡 Pakai: *.logo [style]|[teks]*\n` +
      `Contoh: _.logo volcano|WilyBot_\n` +
      `Atau: _.logo random|WilyBot_ untuk style acak`
    );
  }

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
