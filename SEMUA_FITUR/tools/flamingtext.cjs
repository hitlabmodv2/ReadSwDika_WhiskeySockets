/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  flamingtext.cjs — FlamingText Style Logo (.flamingtext / .ft)
 *  Scraper gaya teks keren dari flamingtext.com
 *  - Search style via /Ajax/search API (live)
 *  - Download preview image (GIF animasi / PNG) dari cdn1.ftimg.com
 *  - Kirim ke user lengkap dengan link ke flamingtext.com
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');
const path  = require('path');

const CDN_BASE    = 'https://cdn1.ftimg.com';
const SEARCH_URL  = 'https://www.flamingtext.com/Ajax/search?q=';
const FT_BASE     = 'https://www.flamingtext.com';
const CACHE_TTL   = 10 * 60 * 1000; // 10 menit

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Cache in-memory ──────────────────────────────────────────────────────────
const _searchCache = new Map();

// ── Daftar style bawaan (verified working) ───────────────────────────────────
const DEFAULT_STYLES = [
  { title: 'Fire',             img: '/images/logos/s300x100/en_US/fire-logo.png',              url: '/logo/Design-Fire',                  isAnim: false },
  { title: 'Flaming Text',     img: '/images/logos/s300x100/en_US/flaming-logo.gif',           url: '/logo/Design-Flaming-Text-Animation', isAnim: true  },
  { title: 'Inner Fire',       img: '/images/logos/s300x100/en_US/inner-fire-anim-logo.gif',   url: '/logo/Design-Inner-Fire-Animation',   isAnim: true  },
  { title: 'Burning',          img: '/images/logos/s300x100/en_US/burning-logo.gif',           url: '/logo/Design-Burning',               isAnim: true  },
  { title: 'Alien Glow Anim',  img: '/images/logos/s300x100/en_US/alien-glow-anim-logo.gif',  url: '/logo/Design-Alien-Glow-Animation',   isAnim: true  },
  { title: 'Alien Glow',       img: '/images/logos/s300x100/en_US/alien-glow-logo.png',       url: '/logo/Design-Alien-Glow',            isAnim: false },
  { title: 'Alien Neon',       img: '/images/logos/s300x100/en_US/alien-neon-logo.png',       url: '/logo/Design-Alien-Neon',            isAnim: false },
  { title: 'Alien Invasion',   img: '/images/logos/s300x100/en_US/alien-invasion-logo.png',   url: '/logo/Design-Alien-Invasion',        isAnim: false },
  { title: 'Chrome',           img: '/images/logos/s300x100/en_US/chrome-logo.png',           url: '/logo/Design-Chrome',                isAnim: false },
  { title: 'Sota Chrome',      img: '/images/logos/s300x100/en_US/sota-chrome-logo.png',      url: '/logo/Design-Sota-Chrome',           isAnim: false },
  { title: 'Chrominium',       img: '/images/logos/s300x100/en_US/chrominium-logo.png',       url: '/logo/Design-Chrominium',            isAnim: false },
  { title: 'Neon',             img: '/images/logos/s300x100/en_US/neon-logo.png',             url: '/logo/Design-Neon',                  isAnim: false },
  { title: 'Electric',         img: '/images/logos/s300x100/en_US/electric.png',              url: '/logo/Design-Electric',              isAnim: false },
  { title: 'Electricity',      img: '/images/logos/s300x100/en_US/electricity-logo.png',      url: '/logo/Design-Electricity',           isAnim: false },
  { title: 'Ice',              img: '/images/logos/s300x100/en_US/ice-logo.png',              url: '/logo/Design-Ice',                   isAnim: false },
  { title: 'Ice Age',          img: '/images/logos/s300x100/en_US/ice-age-logo.png',          url: '/logo/Design-Ice-Age',               isAnim: false },
  { title: 'Ice Fire',         img: '/images/logos/s300x100/en_US/ice-fire-logo.png',         url: '/logo/Design-Ice-Fire',              isAnim: false },
  { title: 'Ice Block 3D',     img: '/images/logos/s300x100/en_US/ice-block-3d-logo.png',     url: '/logo/Design-Ice-Block-3D',          isAnim: false },
  { title: 'Gold',             img: '/images/logos/s300x100/en_US/gold-logo.png',             url: '/logo/Design-Gold',                  isAnim: false },
  { title: 'GOLD 3D',          img: '/images/logos/s300x100/en_US/gold-3d-logo.png',          url: '/logo/Design-GOLD-3D',               isAnim: false },
  { title: 'Golden',           img: '/images/logos/s300x100/en_US/golden-logo.png',           url: '/logo/Design-Golden',                isAnim: false },
  { title: 'Goldsmith',        img: '/images/logos/s300x100/en_US/goldsmith-logo.png',        url: '/logo/Design-Goldsmith',             isAnim: false },
  { title: 'Glow',             img: '/images/logos/s300x100/en_US/glow-logo.png',             url: '/logo/Design-Glow',                  isAnim: false },
  { title: 'Glowing',          img: '/images/logos/s300x100/en_US/glowing-logo.png',          url: '/logo/Design-Glowing',               isAnim: false },
  { title: '3D Text',          img: '/images/logos/s300x100/en_US/3d-logo.png',               url: '/logo/Design-3D-Text',               isAnim: false },
  { title: '3D Inset',         img: '/images/logos/s300x100/en_US/3d-inset-logo.png',         url: '/logo/Design-3D-Inset',              isAnim: false },
  { title: '3D Outline',       img: '/images/logos/s300x100/en_US/3d-outline-logo.png',       url: '/logo/Design-3D-Outline',            isAnim: false },
  { title: 'Blood 3D',         img: '/images/logos/s300x100/en_US/blood-3d-logo.png',         url: '/logo/Design-Blood-3D',              isAnim: false },
  { title: 'Shadow',           img: '/images/logos/s300x100/en_US/shadowplay-logo.png',       url: '/logo/Design-Shadowplay',            isAnim: false },
  { title: 'Drop Shadow',      img: '/images/logos/s300x100/en_US/drop-shadow-logo.png',      url: '/logo/Design-Drop-Shadow',           isAnim: false },
  { title: 'Gradient Shadow',  img: '/images/logos/s300x100/en_US/gradient-shadow-logo.png',  url: '/logo/Design-Gradient-Shadow',       isAnim: false },
  { title: 'Retro',            img: '/images/logos/s300x100/en_US/retro-logo.png',            url: '/logo/Design-Retro',                 isAnim: false },
  { title: 'Cool',             img: '/images/logos/s300x100/en_US/cool-logo.png',             url: '/logo/Design-Cool',                  isAnim: false },
  { title: 'Cool Metal',       img: '/images/logos/s300x100/en_US/cool-metal-logo.png',       url: '/logo/Design-Cool-Metal',            isAnim: false },
  { title: 'Dracula',          img: '/images/logos/s300x100/en_US/dracula-logo.png',          url: '/logo/Design-Dracula',               isAnim: false },
  { title: 'Dark Alliance',    img: '/images/logos/s300x100/en_US/dark-alliance-logo.png',    url: '/logo/Design-Dark-Alliance',         isAnim: false },
  { title: 'Clan',             img: '/images/logos/s300x100/en_US/clan-logo.png',             url: '/logo/Design-Clan',                  isAnim: false },
  { title: 'Elegant',          img: '/images/logos/s300x100/en_US/elegant-logo.png',          url: '/logo/Design-Elegant',               isAnim: false },
  { title: 'Marbles',          img: '/images/logos/s300x100/en_US/marbles-logo.png',          url: '/logo/Design-Marbles',               isAnim: false },
  { title: 'Splat',            img: '/images/logos/s300x100/en_US/splat-logo.png',            url: '/logo/Design-Splat',                 isAnim: false },
  { title: 'Winner',           img: '/images/logos/s300x100/en_US/winner-logo.png',           url: '/logo/Design-Winner',                isAnim: false },
  { title: 'Galaxy',           img: '/images/logos/s300x100/en_US/kingdom-svg.png',           url: '/logo/Design-Kingdom',               isAnim: false },
];

// ── Fetch style list dari flamingtext search API ──────────────────────────────
async function searchStyles(keyword) {
  const key = keyword.toLowerCase().trim();
  const now = Date.now();

  if (_searchCache.has(key)) {
    const { data, ts } = _searchCache.get(key);
    if (now - ts < CACHE_TTL) return data;
  }

  try {
    const { data } = await axios.get(SEARCH_URL + encodeURIComponent(keyword), {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': FT_BASE + '/'
      },
      timeout: 8000
    });

    let results = [];
    if (Array.isArray(data)) {
      results = data.filter(x => x && x.type === 'logo' && x.image && x.url).map(x => ({
        title: x.title || '',
        img:   x.image,
        url:   x.url,
        isAnim: (x.image || '').endsWith('.gif')
      }));
    }

    _searchCache.set(key, { data: results, ts: now });
    return results;
  } catch {
    return [];
  }
}

// ── Download buffer gambar dari CDN flamingtext ───────────────────────────────
async function downloadImage(imgPath) {
  const url = CDN_BASE + imgPath;
  const { data } = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': UA,
      'Referer': FT_BASE + '/'
    },
    timeout: 15000
  });
  return { buffer: Buffer.from(data), isGif: imgPath.endsWith('.gif'), url };
}

// ── Pilih style berdasarkan query ─────────────────────────────────────────────
function pickStyle(styles, keyword) {
  if (!keyword) return styles[Math.floor(Math.random() * styles.length)];
  const kw = keyword.toLowerCase();
  const found = styles.find(s => s.title.toLowerCase().includes(kw));
  return found || styles[Math.floor(Math.random() * styles.length)];
}

// ── Handler utama ─────────────────────────────────────────────────────────────
async function handleFlamingtext({ hisoka, m, query, tolak, logCommand, logError }) {
  const args = (query || '').trim();

  // ── .flamingtext list ──────────────────────────────────────────────────────
  if (args.toLowerCase() === 'list' || args.toLowerCase() === 'daftar') {
    const animStyles = DEFAULT_STYLES.filter(s => s.isAnim);
    const staticStyles = DEFAULT_STYLES.filter(s => !s.isAnim);

    const lines = [
      `🔥 *FlamingText — Daftar Style*`,
      ``,
      `✨ *Animasi GIF (${animStyles.length} style):*`,
      animStyles.map(s => `  • ${s.title}`).join('\n'),
      ``,
      `🖼️ *Static PNG (${staticStyles.length} style):*`,
      staticStyles.slice(0, 20).map(s => `  • ${s.title}`).join('\n'),
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `💡 *Cara pakai:*`,
      `_.flamingtext [nama style]_`,
      `_.flamingtext fire_`,
      `_.flamingtext alien_`,
      `_.flamingtext random_ → gaya acak`,
      ``,
      `🌐 Generate teks kustom di:`,
      `https://www.flamingtext.com`
    ];

    await hisoka.sendMessage(m.from, { text: lines.join('\n') }, { quoted: m });
    logCommand(m, hisoka, 'flamingtext');
    return;
  }

  await hisoka.sendMessage(m.from, { react: { text: '🔥', key: m.key } });

  try {
    // ── Tentukan style yang dicari ─────────────────────────────────────────
    let styleList = DEFAULT_STYLES;
    let keyword   = args.toLowerCase() === 'random' ? '' : args;

    // Coba search live dari flamingtext.com jika ada keyword
    if (keyword && keyword !== '') {
      const liveResults = await searchStyles(keyword);
      if (liveResults.length > 0) {
        styleList = liveResults;
      }
    }

    const style = pickStyle(styleList, keyword);
    if (!style) {
      return await tolak(hisoka, m, `❌ Style tidak ditemukan.\nKetik *.flamingtext list* untuk lihat semua style.`);
    }

    // ── Download gambar preview dari CDN flamingtext ───────────────────────
    const { buffer, isGif } = await downloadImage(style.img);

    if (!buffer || buffer.length < 100) {
      return await tolak(hisoka, m, `❌ Gagal mengambil gambar style *${style.title}*.\nCoba style lain dengan *.flamingtext list*.`);
    }

    // ── Buat caption ───────────────────────────────────────────────────────
    const caption = [
      `🔥 *FlamingText — ${style.title}*`,
      ``,
      isGif ? `✨ Style ini animasi GIF!` : `🖼️ Style static PNG`,
      ``,
      `📝 *Generate teks kamu sendiri:*`,
      `${FT_BASE}${style.url}`,
      ``,
      `💡 Buka link di atas → ketik teksmu → download gambarnya`,
      ``,
      `_Ketik .flamingtext list untuk semua style_`,
    ].join('\n');

    // ── Kirim gambar ───────────────────────────────────────────────────────
    if (isGif) {
      await hisoka.sendMessage(m.from, {
        video: buffer,
        gifPlayback: true,
        caption
      }, { quoted: m });
    } else {
      await hisoka.sendMessage(m.from, {
        image: buffer,
        caption
      }, { quoted: m });
    }

    await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
    logCommand(m, hisoka, 'flamingtext');

  } catch (err) {
    console.error('\x1b[31m[FlamingText] Error:\x1b[39m', err.message);
    if (logError) logError(err, 'command:flamingtext');
    await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
    await tolak(hisoka, m,
      `❌ *FlamingText Error*\n\n` +
      `_${err.message}_\n\n` +
      `Coba lagi atau ketik *.flamingtext list* untuk lihat style yang tersedia.`
    );
  }
}

module.exports = { handleFlamingtext, searchStyles, DEFAULT_STYLES };
