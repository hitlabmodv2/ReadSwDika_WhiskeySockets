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
 *  fontuntik.cjs — Font Untik command handler
 *  Pilih gaya font via tombol interaktif single_select,
 *  lalu salin hasilnya dengan sekali tap.
 * ───────────────────────────────
 */
'use strict';

const path = require('path');

const _FONT_TTL   = 5 * 60 * 1000;  // 5 menit
const _ROW_PREFIX = 'fu_';
const _PER_SECT   = 10;

const _SECTION_LABELS = [
  'Script & Fraktur',
  'Simbolik & Kuno',
  'Dekoratif & Magis',
  'Efek Teks Kreatif',
  'Gaya Font 5',
];

function _getFonts() {
  try {
    const { FONTS } = require(path.resolve('./SEMUA_FITUR/tools/fontgenerator.cjs'));
    return FONTS;
  } catch (_) {
    return [];
  }
}

/**
 * Handler utama: .fontuntik <teks>
 * Kirim single_select list semua gaya font sebagai tombol interaktif.
 * @returns {Promise<void>}
 */
async function handleFontuntik(m, hisoka, {
  Button, logCommand, tolak, pendingFontuntikChoices, getJadibotChoiceKey,
}) {
  const prefix = m.prefix || '.';
  const teks   = (m.query || '').trim();

  const FONTS = _getFonts();
  if (!FONTS.length) {
    return tolak(hisoka, m, '❌ Daftar font tidak tersedia saat ini.');
  }

  if (!teks) {
    const demoTeks = 'Wily Bot';
    const demoFonts = FONTS.length >= 15
      ? [FONTS[0], FONTS[2], FONTS[3], FONTS[5], FONTS[11], FONTS[14]]
      : FONTS.slice(0, 6);
    const demoLines = demoFonts.map(f => {
      let out = demoTeks;
      try { out = f.fn(demoTeks); } catch (_) {}
      return `│ *${f.name}*\n│ ${out}`;
    }).join('\n│\n');

    return tolak(hisoka, m,
      `╭─「 🔤 *FONT UNTIK* 」\n` +
      `│\n` +
      `│ 📌 *Cara pakai:*\n` +
      `│ ${prefix}fontuntik <teks>\n` +
      `│\n` +
      `│ 📝 *Contoh ketik:*\n` +
      `│ ${prefix}fontuntik ${demoTeks}\n` +
      `│\n` +
      `│ 🎨 *Simulasi hasil (${FONTS.length} font tersedia):*\n` +
      `│\n` +
      `${demoLines}\n` +
      `│\n` +
      `╰──────────────────────`
    );
  }

  const preview = teks.length > 18 ? teks.slice(0, 18) + '…' : teks;

  const btn = new Button()
    .setBody(
      `╭─「 🔤 *FONT UNTIK* 」\n` +
      `│\n` +
      `│ ✏️ Teks: *${teks}*\n` +
      `│ 🎨 ${FONTS.length} gaya font tersedia\n` +
      `│\n` +
      `│ 👇 Pilih gaya font dari tombol\n` +
      `│    di bawah ini!\n` +
      `│\n` +
      `╰──────────────────────`
    )
    .setFooter('🔤 Font Untik • WilyBot')
    .addSelection('🔤 Pilih Gaya Font');

  const totalSects = Math.ceil(FONTS.length / _PER_SECT);
  for (let s = 0; s < totalSects; s++) {
    const label = _SECTION_LABELS[s] || `Gaya Font ${s + 1}`;
    btn.makeSections(label);
    const slice = FONTS.slice(s * _PER_SECT, (s + 1) * _PER_SECT);
    slice.forEach((f, i) => {
      let fontPreview = '';
      try { fontPreview = f.fn(preview); } catch (_) { fontPreview = preview; }
      btn.makeRow('', f.name, fontPreview, `${_ROW_PREFIX}${s * _PER_SECT + i}`);
    });
  }

  let sentMsg;
  try {
    sentMsg = await btn.run(m.from, hisoka, m);
  } catch (e) {
    return tolak(hisoka, m, '❌ Gagal mengirim daftar font. Coba lagi.');
  }

  const botMsgId  = sentMsg?.key?.id || null;
  const botMsgKey = sentMsg?.key || null;
  const expiresAt = Date.now() + _FONT_TTL;
  const choiceKey = getJadibotChoiceKey(m);

  if (pendingFontuntikChoices.has(choiceKey)) {
    const old = pendingFontuntikChoices.get(choiceKey);
    if (old?.timeout) clearTimeout(old.timeout);
  }

  const timeout = setTimeout(() => {
    pendingFontuntikChoices.delete(choiceKey);
  }, _FONT_TTL);

  pendingFontuntikChoices.set(choiceKey, {
    text:      teks,
    botMsgId,
    botMsgKey,
    expiresAt,
    timeout,
  });

  logCommand(m, hisoka, 'fontuntik');
}

/**
 * Intercept reply pilihan font (single_select response).
 * Dipanggil dari message.js SEBELUM switch-case.
 * @returns {boolean} true jika pesan sudah ditangani
 */
async function handleFontuntikChoice({
  hisoka, m,
  pendingFontuntikChoices,
  getJadibotChoiceKey, getQuotedStanzaId,
  Button, tolak, logCommand,
}) {
  const rawText   = (m.text || '').trim();
  if (!rawText.startsWith(_ROW_PREFIX)) return false;

  const choiceKey = getJadibotChoiceKey(m);
  let entry = pendingFontuntikChoices.has(choiceKey)
    ? { key: choiceKey, session: pendingFontuntikChoices.get(choiceKey) }
    : null;

  if (!entry) {
    const quotedId = getQuotedStanzaId(m);
    if (quotedId) {
      for (const [k, s] of pendingFontuntikChoices.entries()) {
        if (k.startsWith(m.from + ':') && s.botMsgId && s.botMsgId === quotedId) {
          entry = { key: k, session: s };
          break;
        }
      }
    }
  }

  if (!entry) return false;

  const { key: matchedKey, session: pending } = entry;

  if (pending.expiresAt <= Date.now()) {
    pendingFontuntikChoices.delete(matchedKey);
    return false;
  }

  const idxStr = rawText.slice(_ROW_PREFIX.length);
  const idx    = parseInt(idxStr, 10);
  if (isNaN(idx) || idx < 0) return false;

  const FONTS = _getFonts();
  if (idx >= FONTS.length) return false;

  if (pending.timeout) clearTimeout(pending.timeout);
  pendingFontuntikChoices.delete(matchedKey);

  const font = FONTS[idx];
  let converted = pending.text;
  try { converted = font.fn(pending.text); } catch (_) {}

  // Body HANYA teks hasil konversi — supaya yang ter-copy bersih tanpa nama font
  const bodyText = converted;

  // Quoted ke pesan bot (font list), bukan ke pesan pilihan user
  const botQuoted = pending.botMsgKey
    ? { key: pending.botMsgKey, message: {} }
    : m;

  const btn = new Button()
    .setBody(bodyText)
    .setFooter(`🔤 ${font.name} • Font Untik • WilyBot`)
    .addCopy('📋 Salin Teks', converted, `fontcopy_${idx}`);

  try {
    await btn.run(m.from, hisoka, botQuoted);
  } catch (_) {
    await tolak(hisoka, m, `🔤 *${font.name}*\n\n${converted}`);
  }

  logCommand(m, hisoka, 'fontuntik');
  return true;
}

module.exports = { handleFontuntik, handleFontuntikChoice };
