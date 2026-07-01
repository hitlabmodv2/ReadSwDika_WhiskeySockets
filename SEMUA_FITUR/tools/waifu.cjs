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
 *  waifu.cjs — Waifu.im Scraper (.waifu)
 *  Ambil gambar anime safe/NSFW18 dari waifu.im
 *  via tombol interaktif single_select bertahap.
 *  Preferensi mode (safe/nsfw) tersimpan di config.json.
 * ───────────────────────────────
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

const _TTL        = 5 * 60 * 1000;   // sesi kedaluwarsa 5 menit
const _PFX_MODE   = 'waifu_mode_';   // id prefix pilihan mode
const _PFX_CHAR   = 'waifu_char_';   // id prefix pilihan karakter
const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const API_BASE    = 'https://api.waifu.im/search';

// ── Daftar tag/karakter ───────────────────────────────────────────────────────

const SAFE_TAGS = [
  { label: '🧕 Waifu',           tag: 'waifu'           },
  { label: '👩 Maid',             tag: 'maid'            },
  { label: '🌸 Marin Kitagawa',   tag: 'marin-kitagawa'  },
  { label: '💀 Mori Calliope',    tag: 'mori-calliope'   },
  { label: '⚡ Raiden Shogun',    tag: 'raiden-shogun'   },
  { label: '🌸 Kamisato Ayaka',   tag: 'kamisato-ayaka'  },
  { label: '🐱 Neko',             tag: 'neko'            },
  { label: '🧝 Elf',              tag: 'elf'             },
  { label: '🦊 Fox Girl',         tag: 'fox-girl'        },
  { label: '🐺 Wolf Girl',        tag: 'wolf-girl'       },
  { label: '🎽 Uniform',          tag: 'uniform'         },
  { label: '👙 Swim Suit',        tag: 'swim-suit'       },
  { label: '🏊 School Swimsuit',  tag: 'school-swimsuit' },
  { label: '👓 Glasses',          tag: 'glasses'         },
  { label: '🖼️ Portrait',         tag: 'portrait'        },
  { label: '🤳 Selfies',          tag: 'selfies'         },
  { label: '🎀 Oppai',            tag: 'oppai'           },
  { label: '🛏️ Dakimakura',       tag: 'dakimakura'      },
];

const NSFW_TAGS = [
  { label: '🔥 Ecchi',    tag: 'ecchi'   },
  { label: '🍑 Ass',      tag: 'ass'     },
  { label: '🌶️ Ero',      tag: 'ero'     },
  { label: '💋 Oral',     tag: 'oral'    },
  { label: '🍈 Paizuri',  tag: 'paizuri' },
  { label: '👩 Milf',     tag: 'milf'    },
  { label: '📖 Hentai',   tag: 'hentai'  },
];

// ── Config helpers ────────────────────────────────────────────────────────────

function bacaConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch (_) {}
  return {};
}

function simpanConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8'); } catch (_) {}
}

/** Ambil mode tersimpan user (safe|nsfw), default 'safe' */
function getUserMode(sender) {
  const cfg = bacaConfig();
  return cfg?.waifu?.userModes?.[sender] || null;
}

/** Simpan mode user ke config.json */
function setUserMode(sender, mode) {
  const cfg = bacaConfig();
  if (!cfg.waifu) cfg.waifu = {};
  if (!cfg.waifu.userModes) cfg.waifu.userModes = {};
  cfg.waifu.userModes[sender] = mode;
  simpanConfig(cfg);
}

// ── Fetch waifu.im ────────────────────────────────────────────────────────────

/** Ambil gambar dari waifu.im, return Buffer */
function fetchWaifuImage(tag, isNsfw) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ included_tags: tag, is_nsfw: isNsfw ? 'true' : 'false' });
    const url = `${API_BASE}?${params.toString()}`;
    https.get(url, { headers: { 'User-Agent': 'WilyBot/1.0', 'Accept': 'application/json' } }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          const images = json?.images;
          if (!images || !images.length) return reject(new Error('Tidak ada gambar ditemukan'));
          const img = images[Math.floor(Math.random() * images.length)];
          // Download gambar
          const imgUrl = img.url;
          https.get(imgUrl, { headers: { 'User-Agent': 'WilyBot/1.0' } }, (res2) => {
            const chunks = [];
            res2.on('data', d => chunks.push(d));
            res2.on('end', () => resolve({ buffer: Buffer.concat(chunks), data: img }));
            res2.on('error', reject);
          }).on('error', reject);
        } catch (e) { reject(e); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Builder button ────────────────────────────────────────────────────────────

/**
 * Kirim button pilih mode (safe / nsfw18)
 */
async function _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode) {
  const modeLabel = savedMode === 'nsfw' ? '🔞 NSFW 18+' : savedMode === 'safe' ? '✅ Safe' : null;
  const modeInfo  = modeLabel ? `\n│ 💾 Mode tersimpan: *${modeLabel}*` : '';

  const btn = new Button()
    .setBody(
      `╭─「 🖼️ *WAIFU* 」\n` +
      `│\n` +
      `│ 📌 Pilih mode gambar yang kamu inginkan:\n` +
      `│\n` +
      `│ ✅ *Safe* — gambar aman untuk umum\n` +
      `│ 🔞 *NSFW 18+* — konten dewasa\n` +
      `│${modeInfo}\n` +
      `│\n` +
      `╰──────────────────────`
    )
    .setFooter('🖼️ Waifu.im • WilyBot')
    .addSelection('🖼️ Pilih Mode');

  btn.makeSections('🔒 Pilih Mode Gambar');
  btn.makeRow('', '✅ Safe Mode', 'Gambar anime aman, tidak ada konten dewasa', `${_PFX_MODE}safe`);
  btn.makeRow('', '🔞 NSFW 18+', 'Konten dewasa, 18 tahun ke atas', `${_PFX_MODE}nsfw`);

  let sentMsg;
  try { sentMsg = await btn.run(m.from, hisoka, m); } catch (_) {}

  const choiceKey = getJadibotChoiceKey(m);
  const old = pendingWaifuChoices.get(choiceKey);
  if (old?.timeout) clearTimeout(old.timeout);

  const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
  pendingWaifuChoices.set(choiceKey, {
    stage:      'mode',
    botMsgKey:  sentMsg?.key || null,
    expiresAt:  Date.now() + _TTL,
    timeout,
  });
}

/**
 * Kirim button pilih karakter/tag berdasarkan mode
 */
async function _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, mode) {
  const isNsfw = mode === 'nsfw';
  const tags   = isNsfw ? NSFW_TAGS : SAFE_TAGS;
  const modeLabel = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';

  const btn = new Button()
    .setBody(
      `╭─「 🖼️ *WAIFU* 」\n` +
      `│\n` +
      `│ Mode: *${modeLabel}*\n` +
      `│\n` +
      `│ 👇 Pilih karakter/kategori anime\n` +
      `│    yang ingin kamu lihat!\n` +
      `│\n` +
      `╰──────────────────────`
    )
    .setFooter('🖼️ Waifu.im • WilyBot')
    .addSelection('🎌 Pilih Karakter');

  btn.makeSections(isNsfw ? '🔞 Kategori NSFW 18+' : '✅ Karakter/Kategori Safe');
  tags.forEach((t, i) => {
    btn.makeRow('', t.label, `Tag: ${t.tag}`, `${_PFX_CHAR}${i}`);
  });

  let sentMsg;
  try { sentMsg = await btn.run(m.from, hisoka, m); } catch (_) {}

  const choiceKey = getJadibotChoiceKey(m);
  const old = pendingWaifuChoices.get(choiceKey);
  if (old?.timeout) clearTimeout(old.timeout);

  const timeout = setTimeout(() => pendingWaifuChoices.delete(choiceKey), _TTL);
  pendingWaifuChoices.set(choiceKey, {
    stage:      'char',
    mode,
    botMsgKey:  sentMsg?.key || null,
    expiresAt:  Date.now() + _TTL,
    timeout,
  });
}

// ── Handler utama ─────────────────────────────────────────────────────────────

/**
 * Handler command .waifu
 */
async function handleWaifu(m, hisoka, { Button, logCommand, tolak, pendingWaifuChoices, getJadibotChoiceKey }) {
  const savedMode = getUserMode(m.sender);
  await _sendModeButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, savedMode);
  logCommand(m, hisoka, 'waifu');
}

/**
 * Intercept reply pilihan waifu (dipanggil dari message.js sebelum switch-case)
 * @returns {boolean} true jika pesan sudah ditangani
 */
async function handleWaifuChoice({
  hisoka, m,
  pendingWaifuChoices,
  getJadibotChoiceKey, getQuotedStanzaId,
  Button, tolak, logCommand,
}) {
  const rawText = (m.text || '').trim();

  const isMode = rawText.startsWith(_PFX_MODE);
  const isChar = rawText.startsWith(_PFX_CHAR);
  if (!isMode && !isChar) return false;

  // Cari sesi
  const choiceKey = getJadibotChoiceKey(m);
  let entry = pendingWaifuChoices.has(choiceKey)
    ? { key: choiceKey, session: pendingWaifuChoices.get(choiceKey) }
    : null;

  if (!entry) {
    const quotedId = getQuotedStanzaId(m);
    if (quotedId) {
      for (const [k, s] of pendingWaifuChoices.entries()) {
        if (k.startsWith(m.from + ':') && s.botMsgKey?.id === quotedId) {
          entry = { key: k, session: s };
          break;
        }
      }
    }
  }

  if (!entry) return false;

  const { key: matchedKey, session: pending } = entry;

  if (pending.expiresAt <= Date.now()) {
    pendingWaifuChoices.delete(matchedKey);
    return false;
  }

  // ── STAGE: pilih mode ──────────────────────────────────────────────────────
  if (isMode && pending.stage === 'mode') {
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingWaifuChoices.delete(matchedKey);

    const modeRaw = rawText.slice(_PFX_MODE.length); // 'safe' atau 'nsfw'
    const mode    = modeRaw === 'nsfw' ? 'nsfw' : 'safe';

    // Hapus button pilih mode sebelumnya
    if (pending.botMsgKey) {
      try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
    }

    // Simpan preferensi user ke config.json
    setUserMode(m.sender, mode);

    // Kirim button pilih karakter
    await _sendCharButton(m, hisoka, Button, pendingWaifuChoices, getJadibotChoiceKey, mode);
    logCommand(m, hisoka, 'waifu');
    return true;
  }

  // ── STAGE: pilih karakter ──────────────────────────────────────────────────
  if (isChar && pending.stage === 'char') {
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingWaifuChoices.delete(matchedKey);

    const idxStr = rawText.slice(_PFX_CHAR.length);
    const idx    = parseInt(idxStr, 10);
    const isNsfw = pending.mode === 'nsfw';
    const tags   = isNsfw ? NSFW_TAGS : SAFE_TAGS;

    if (isNaN(idx) || idx < 0 || idx >= tags.length) return false;

    const chosen = tags[idx];

    // Hapus button pilih karakter sebelumnya
    if (pending.botMsgKey) {
      try { await hisoka.sendMessage(m.from, { delete: pending.botMsgKey }); } catch (_) {}
    }

    // Kirim pesan loading
    const loadMsg = await hisoka.sendMessage(m.from, { text: `⏳ Mengambil gambar *${chosen.label}* dari waifu.im...` }, { quoted: m });

    let result;
    try {
      result = await fetchWaifuImage(chosen.tag, isNsfw);
    } catch (err) {
      if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
      await tolak(hisoka, m, `❌ Gagal mengambil gambar *${chosen.label}*.\nCoba lagi beberapa saat.`);
      return true;
    }

    // Hapus loading
    if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }

    const { buffer, data } = result;
    const modeLabel = isNsfw ? '🔞 NSFW 18+' : '✅ Safe';
    const ext       = (data.extension || 'jpg').toLowerCase();
    const caption   =
      `╭─「 🖼️ *WAIFU* 」\n` +
      `│\n` +
      `│ 🎌 Karakter : *${chosen.label}*\n` +
      `│ 🔖 Tag      : ${chosen.tag}\n` +
      `│ 🔒 Mode     : ${modeLabel}\n` +
      `│ 🌐 Source   : waifu.im\n` +
      `│\n` +
      `│ 💡 Ketik *.waifu* untuk pilih lagi\n` +
      `│\n` +
      `╰──────────────────────`;

    try {
      if (ext === 'gif') {
        await hisoka.sendMessage(m.from, {
          video: buffer, gifPlayback: true, caption,
        }, { quoted: m });
      } else {
        await hisoka.sendMessage(m.from, {
          image: buffer, caption,
        }, { quoted: m });
      }
    } catch (_) {
      await tolak(hisoka, m, `❌ Gagal mengirim gambar. Coba lagi.`);
    }

    logCommand(m, hisoka, 'waifu');
    return true;
  }

  return false;
}

module.exports = { handleWaifu, handleWaifuChoice };
