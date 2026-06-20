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
 *  bandingkanhp.cjs — Bandingkan dua HP (.bandingkan)
 *  Scrape spesifikasi dari GSMArena, tampilkan tabel perbandingan
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Bandingkan HP (.bandingkan)
 *  Scrape spesifikasi dua HP dari GSMArena dan tampilkan tabel
 *  perbandingan lengkap (layar, kamera, baterai, prosesor) —
 *  membantu user memilih HP terbaik sesuai kebutuhan.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const { cekHP, getHPImage } = require('./cekhp.cjs');
let sharp;
try { sharp = require('sharp'); } catch (_) { sharp = null; }

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSpec(specs, cat, keys) {
  const catData = specs[cat];
  if (!catData) return null;
  for (const k of keys) {
    const v = catData[k];
    if (v && String(v).trim() !== '-') {
      return String(v).split('\n')[0].trim();
    }
  }
  return null;
}

function shortVal(val, max = 45) {
  if (!val) return '—';
  const s = String(val).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function parseMaxGb(str = '') {
  const m = [...String(str).matchAll(/(\d+(?:\.\d+)?)\s*GB/gi)].map(x => parseFloat(x[1]));
  return m.length ? Math.max(...m) : 0;
}

function parseRamGb(str = '') {
  const m = String(str).match(/(\d+(?:\.\d+)?)\s*GB\s+RAM/i)
    || String(str).match(/RAM[:\s]+(\d+(?:\.\d+)?)\s*GB/i);
  return m ? parseFloat(m[1]) : 0;
}

function parseFirstNum(str = '') {
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseMhz(str = '') {
  const m = String(str).match(/(\d+)\s*Hz/i);
  return m ? parseFloat(m[1]) : 0;
}

function parseMaxMp(str = '') {
  const nums = [...String(str).matchAll(/(\d+(?:\.\d+)?)\s*MP/gi)].map(x => parseFloat(x[1]));
  return nums.length ? Math.max(...nums) : 0;
}

function progressBar(pct, width = 10) {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, width - filled));
}

/** Strip varian RAM/storage dari query: "vivo v50 lite 8gb/128gb" → "vivo v50 lite" */
function stripVariant(q = '') {
  return q
    .replace(/\b\d+\s*GB\s*[\/+]\s*\d+\s*GB\b/gi, '')
    .replace(/\b\d+\s*GB\b/gi, '')
    .replace(/\b\d+\s*TB\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractVariant(q = '') {
  const m = q.match(/\b(\d+\s*GB\s*[\/+]\s*\d+\s*(?:GB|TB))\b/i)
    || q.match(/\b(\d+\s*GB)\b/i)
    || q.match(/\b(\d+\s*TB)\b/i);
  return m ? m[1].replace(/\s+/g, '').toUpperCase() : '';
}

/** Pisahkan variant "8GB/128GB" → { ram: 8, storage: 128, storageUnit: 'GB' } */
function parseVariantParts(variant = '') {
  if (!variant) return null;
  const v = variant.toUpperCase().replace(/\s+/g, '');
  // Format RAM/Storage: "8GB/128GB" atau "8GB+128GB"
  let m = v.match(/(\d+(?:\.\d+)?)GB[\/+](\d+(?:\.\d+)?)(GB|TB)/);
  if (m) {
    return {
      ram: parseFloat(m[1]),
      storage: parseFloat(m[2]),
      storageUnit: m[3],
    };
  }
  // Hanya storage: "128GB" / "1TB"
  m = v.match(/^(\d+(?:\.\d+)?)(GB|TB)$/);
  if (m) {
    return {
      ram: 0,
      storage: parseFloat(m[1]),
      storageUnit: m[2],
    };
  }
  return null;
}

// ── Kategori GSMArena (urutan tampilan) ──────────────────────────────────────

const CATEGORY_ORDER = [
  'Network', 'Launch', 'Body', 'Display', 'Platform',
  'Memory', 'Main Camera', 'Selfie camera', 'Sound',
  'Comms', 'Features', 'Battery', 'Misc', 'Our Tests',
];

const CATEGORY_EMOJI = {
  'Network': '📡',
  'Launch': '🚀',
  'Body': '📐',
  'Display': '🖥️',
  'Platform': '⚙️',
  'Memory': '💾',
  'Main Camera': '📷',
  'Selfie camera': '🤳',
  'Sound': '🔊',
  'Comms': '📶',
  'Features': '✨',
  'Battery': '🔋',
  'Misc': '📋',
  'Our Tests': '🧪',
};

// Spec yg bisa diadu numeric → arah pemenang. Key: "Category::Label"
// higher=true berarti angka lebih besar = lebih bagus
const NUMERIC_SCORE = {
  'Display::Size':           { parse: parseFirstNum, higher: true },
  'Display::Type':           { parse: parseMhz,      higher: true },  // refresh rate Hz
  'Memory::Internal':        { parse: parseMaxGb,    higher: true },  // storage GB
  'Main Camera::Single':     { parse: parseMaxMp,    higher: true },
  'Main Camera::Dual':       { parse: parseMaxMp,    higher: true },
  'Main Camera::Triple':     { parse: parseMaxMp,    higher: true },
  'Main Camera::Quad':       { parse: parseMaxMp,    higher: true },
  'Selfie camera::Single':   { parse: parseFirstNum, higher: true },
  'Selfie camera::Dual':     { parse: parseMaxMp,    higher: true },
  'Battery::Type':           { parse: parseFirstNum, higher: true },  // mAh
  'Battery::Charging':       { parse: parseFirstNum, higher: true },  // W
  'Body::Weight':            { parse: parseFirstNum, higher: false }, // gram (lebih ringan = bagus)
};

// ── Legacy SPEC_ROWS (dipakai utk highlight pemenang ringkas) ─────────────────

const SPEC_ROWS = [
  {
    icon: '🤖', label: 'OS',
    getText: s => getSpec(s, 'Platform', ['OS']),
    getNum: null,
  },
  {
    icon: '⚙️', label: 'Chipset',
    getText: s => getSpec(s, 'Platform', ['Chipset']),
    getNum: null,
  },
  {
    icon: '🖥️', label: 'CPU',
    getText: s => getSpec(s, 'Platform', ['CPU']),
    getNum: null,
  },
  {
    icon: '🎮', label: 'GPU',
    getText: s => getSpec(s, 'Platform', ['GPU']),
    getNum: null,
  },
  {
    icon: '🧠', label: 'RAM',
    getText: s => {
      const v = getSpec(s, 'Memory', ['Internal']);
      if (!v) return null;
      const r = parseRamGb(v);
      return r ? r + ' GB' : null;
    },
    getNum: s => {
      const v = getSpec(s, 'Memory', ['Internal']);
      return v ? parseRamGb(v) : 0;
    },
    higher: true,
    unit: 'GB',
  },
  {
    icon: '💾', label: 'Storage',
    getText: s => {
      const v = getSpec(s, 'Memory', ['Internal']);
      if (!v) return null;
      const gb = parseMaxGb(v);
      return gb ? gb + ' GB' : null;
    },
    getNum: s => {
      const v = getSpec(s, 'Memory', ['Internal']);
      return v ? parseMaxGb(v) : 0;
    },
    higher: true,
    unit: 'GB',
  },
  {
    icon: '💽', label: 'RAM & Storage (lengkap)',
    getText: s => getSpec(s, 'Memory', ['Internal']),
    getNum: null,
  },
  {
    icon: '📺', label: 'Layar',
    getText: s => getSpec(s, 'Display', ['Size']),
    getNum: s => {
      const v = getSpec(s, 'Display', ['Size']);
      return v ? parseFirstNum(v) : 0;
    },
    higher: true,
    unit: '"',
  },
  {
    icon: '🎨', label: 'Panel',
    getText: s => getSpec(s, 'Display', ['Type']),
    getNum: s => {
      const v = getSpec(s, 'Display', ['Type']);
      return v ? parseMhz(v) : 0;
    },
    higher: true,
    unit: 'Hz',
  },
  {
    icon: '🔍', label: 'Resolusi',
    getText: s => getSpec(s, 'Display', ['Resolution']),
    getNum: null,
  },
  {
    icon: '📷', label: 'Kamera Utama',
    getText: s => getSpec(s, 'Main Camera', ['Triple', 'Quad', 'Dual', 'Single']),
    getNum: s => {
      const v = getSpec(s, 'Main Camera', ['Triple', 'Quad', 'Dual', 'Single']);
      return v ? parseMaxMp(v) : 0;
    },
    higher: true,
    unit: 'MP',
  },
  {
    icon: '🤳', label: 'Kamera Depan',
    getText: s => getSpec(s, 'Selfie camera', ['Single', 'Dual']),
    getNum: s => {
      const v = getSpec(s, 'Selfie camera', ['Single', 'Dual']);
      return v ? parseFirstNum(v) : 0;
    },
    higher: true,
    unit: 'MP',
  },
  {
    icon: '🔋', label: 'Baterai',
    getText: s => getSpec(s, 'Battery', ['Type']),
    getNum: s => {
      const v = getSpec(s, 'Battery', ['Type']);
      return v ? parseFirstNum(v) : 0;
    },
    higher: true,
    unit: 'mAh',
  },
  {
    icon: '⚡', label: 'Charging',
    getText: s => getSpec(s, 'Battery', ['Charging']),
    getNum: s => {
      const v = getSpec(s, 'Battery', ['Charging']);
      return v ? parseFirstNum(v) : 0;
    },
    higher: true,
    unit: 'W',
  },
  {
    icon: '📡', label: 'NFC',
    getText: s => getSpec(s, 'Comms', ['NFC']),
    getNum: null,
  },
  {
    icon: '📶', label: 'WiFi',
    getText: s => getSpec(s, 'Comms', ['WLAN']),
    getNum: null,
  },
  {
    icon: '🔵', label: 'Bluetooth',
    getText: s => getSpec(s, 'Comms', ['Bluetooth']),
    getNum: null,
  },
  {
    icon: '🛡️', label: 'Tahan Air',
    getText: s => getSpec(s, 'Body', ['Protection']),
    getNum: null,
  },
  {
    icon: '📐', label: 'Dimensi',
    getText: s => getSpec(s, 'Body', ['Dimensions']),
    getNum: null,
  },
  {
    icon: '⚖️', label: 'Berat',
    getText: s => getSpec(s, 'Body', ['Weight']),
    getNum: s => {
      const v = getSpec(s, 'Body', ['Weight']);
      return v ? parseFirstNum(v) : 0;
    },
    higher: false,  // lebih ringan lebih baik
    unit: 'g',
  },
  {
    icon: '🚀', label: 'Rilis',
    getText: s => getSpec(s, 'Launch', ['Announced']),
    getNum: null,
  },
  {
    icon: '💰', label: 'Harga Global',
    getText: s => null,  // ditangani manual
    getNum: null,
  },
];

// ── Scoring + format ──────────────────────────────────────────────────────────

function buildRows(a, b, variantA = '', variantB = '') {
  let winsA = 0, winsB = 0, draws = 0;
  const rows = [];

  const vA = parseVariantParts(variantA);
  const vB = parseVariantParts(variantB);

  for (const row of SPEC_ROWS) {
    if (row.label === 'Harga Global') continue; // ditangani manual

    let txtA = row.getText(a.specs);
    let txtB = row.getText(b.specs);

    let numA = row.getNum ? (row.getNum(a.specs) || 0) : 0;
    let numB = row.getNum ? (row.getNum(b.specs) || 0) : 0;

    // Override RAM/Storage/RAM&Storage berdasarkan variant pilihan user
    if (vA) {
      if (row.label === 'RAM' && vA.ram > 0) {
        txtA = vA.ram + ' GB';
        numA = vA.ram;
      } else if (row.label === 'Storage' && vA.storage > 0) {
        txtA = vA.storage + ' ' + vA.storageUnit;
        numA = vA.storageUnit === 'TB' ? vA.storage * 1024 : vA.storage;
      } else if (row.label === 'RAM & Storage (lengkap)') {
        if (vA.ram > 0 && vA.storage > 0) {
          txtA = `${vA.storage} ${vA.storageUnit} ${vA.ram} GB RAM`;
        } else if (vA.storage > 0) {
          txtA = `${vA.storage} ${vA.storageUnit}`;
        }
      }
    }
    if (vB) {
      if (row.label === 'RAM' && vB.ram > 0) {
        txtB = vB.ram + ' GB';
        numB = vB.ram;
      } else if (row.label === 'Storage' && vB.storage > 0) {
        txtB = vB.storage + ' ' + vB.storageUnit;
        numB = vB.storageUnit === 'TB' ? vB.storage * 1024 : vB.storage;
      } else if (row.label === 'RAM & Storage (lengkap)') {
        if (vB.ram > 0 && vB.storage > 0) {
          txtB = `${vB.storage} ${vB.storageUnit} ${vB.ram} GB RAM`;
        } else if (vB.storage > 0) {
          txtB = `${vB.storage} ${vB.storageUnit}`;
        }
      }
    }

    if (!txtA && !txtB) continue;

    let winnerA = false, winnerB = false;

    if (row.getNum) {
      if (numA > 0 && numB > 0 && numA !== numB) {
        if (row.higher) { winnerA = numA > numB; winnerB = numB > numA; }
        else             { winnerA = numA < numB; winnerB = numB < numA; }
        if (winnerA) winsA++;
        else if (winnerB) winsB++;
      } else if (numA > 0 && numB === 0) { winnerA = true; winsA++; }
      else if (numB > 0 && numA === 0)   { winnerB = true; winsB++; }
      else if (numA === numB && numA > 0) draws++;
    }

    rows.push({
      icon: row.icon,
      label: row.label,
      valA: shortVal(txtA),
      valB: shortVal(txtB),
      winnerA,
      winnerB,
    });
  }

  const scored = winsA + winsB;
  const pctA = scored > 0 ? Math.round((winsA / scored) * 100) : 50;
  const pctB = 100 - pctA;

  return { rows, winsA, winsB, draws, pctA, pctB };
}

/** Bersihkan & ringkas value spec multi-line dari GSMArena */
function cleanValue(val) {
  if (!val) return '';
  return String(val)
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' | ')
    .trim();
}

/**
 * Override value Memory::Internal sesuai variant pilihan user.
 * Mengembalikan { txt, num } baru jika di-override, atau null kalau ga perlu override.
 */
function applyVariantOverride(cat, label, originalText, variant) {
  if (!variant) return null;
  if (cat !== 'Memory' || label !== 'Internal') return null;
  const v = parseVariantParts(variant);
  if (!v) return null;
  let txt;
  if (v.ram > 0 && v.storage > 0) {
    txt = `${v.storage}${v.storageUnit} ${v.ram}GB RAM`;
  } else if (v.storage > 0) {
    txt = `${v.storage}${v.storageUnit}`;
  } else {
    return null;
  }
  return { txt };
}

function formatComparison(a, b, variantA = '', variantB = '') {
  const nameA = a.name || 'HP A';
  const nameB = b.name || 'HP B';
  const labelA = variantA ? `${nameA} (${variantA})` : nameA;
  const labelB = variantB ? `${nameB} (${variantB})` : nameB;

  const priceA = a.priceInfo?.raw ? a.priceInfo.raw.slice(0, 35) : '—';
  const priceB = b.priceInfo?.raw ? b.priceInfo.raw.slice(0, 35) : '—';
  const idrA   = a.priceInfo?.idr ? 'Rp ' + Math.round(a.priceInfo.idr).toLocaleString('id-ID') : null;
  const idrB   = b.priceInfo?.idr ? 'Rp ' + Math.round(b.priceInfo.idr).toLocaleString('id-ID') : null;

  // Skor keseluruhan tetap pakai SPEC_ROWS (yg sudah dilengkapi variant override)
  const { winsA, winsB, draws, pctA, pctB } = buildRows(a, b, variantA, variantB);
  const overallWinner = winsA > winsB ? labelA : winsB > winsA ? labelB : null;

  let out = '';

  // ── Header ──
  out += `╭─「 📱 *BANDINGKAN HP* 」\n`;
  out += `│\n`;
  out += `│ 🅰️ *${labelA}*\n`;
  out += `│ 🅱️ *${labelB}*\n`;
  out += `│\n`;

  // ── Skor keseluruhan ──
  out += `├─「 🏆 *SKOR KESELURUHAN* 」\n`;
  out += `│\n`;
  out += `│ 🅰️ [${progressBar(pctA)}] ${pctA}%\n`;
  out += `│ 🅱️ [${progressBar(pctB)}] ${pctB}%\n`;
  out += `│\n`;
  if (overallWinner) {
    out += `│ 🥇 *Pemenang: ${overallWinner}*\n`;
  } else {
    out += `│ 🤝 *Hasil SERI*\n`;
  }
  out += `│ _(Menang ${winsA} vs ${winsB} kategori`;
  if (draws) out += `, ${draws} seri`;
  out += `)_\n`;
  out += `│\n`;

  // ── Harga ──
  out += `├─「 💰 *Harga* 」\n`;
  out += `│ 🅰️ ${priceA}\n`;
  out += `│ 🅱️ ${priceB}\n`;
  if (idrA || idrB) {
    out += `│ 🅰️ ${idrA || '—'} 🇮🇩\n`;
    out += `│ 🅱️ ${idrB || '—'} 🇮🇩\n`;
  }
  out += `│\n`;

  // ── Semua spesifikasi (loop dinamis dari semua kategori GSMArena) ──
  out += `├─「 📋 *SPESIFIKASI LENGKAP* 」\n`;

  // Gabung urutan: pakai CATEGORY_ORDER dulu, lalu kategori lain yg muncul tapi belum tercakup
  const allCats = new Set([
    ...CATEGORY_ORDER,
    ...Object.keys(a.specs || {}),
    ...Object.keys(b.specs || {}),
  ]);

  for (const cat of allCats) {
    const catA = (a.specs && a.specs[cat]) || null;
    const catB = (b.specs && b.specs[cat]) || null;
    if (!catA && !catB) continue;

    // Kumpulkan semua label di kategori ini (dari A & B)
    const labels = [];
    const seen = new Set();
    if (catA) for (const k of Object.keys(catA)) { if (!seen.has(k)) { seen.add(k); labels.push(k); } }
    if (catB) for (const k of Object.keys(catB)) { if (!seen.has(k)) { seen.add(k); labels.push(k); } }
    if (!labels.length) continue;

    // Cek apakah kategori ini punya minimal 1 nilai
    let hasContent = false;
    for (const lbl of labels) {
      const va = catA?.[lbl];
      const vb = catB?.[lbl];
      if ((va && va !== '-') || (vb && vb !== '-')) { hasContent = true; break; }
    }
    if (!hasContent) continue;

    const emoji = CATEGORY_EMOJI[cat] || '📌';
    out += `│\n`;
    out += `│ ${emoji} *${cat.toUpperCase()}*\n`;

    for (const lbl of labels) {
      let txtA = cleanValue(catA?.[lbl]);
      let txtB = cleanValue(catB?.[lbl]);

      // Variant override (RAM/Storage)
      const ovA = applyVariantOverride(cat, lbl, txtA, variantA);
      const ovB = applyVariantOverride(cat, lbl, txtB, variantB);
      if (ovA) txtA = ovA.txt;
      if (ovB) txtB = ovB.txt;

      if ((!txtA || txtA === '-') && (!txtB || txtB === '-')) continue;

      // Tentukan pemenang utk row numeric
      let mA = '', mB = '';
      const scoreCfg = NUMERIC_SCORE[`${cat}::${lbl}`];
      if (scoreCfg) {
        const numA = txtA ? scoreCfg.parse(txtA) : 0;
        const numB = txtB ? scoreCfg.parse(txtB) : 0;
        if (numA > 0 && numB > 0 && numA !== numB) {
          if (scoreCfg.higher) {
            if (numA > numB) mA = ' 🏆'; else mB = ' 🏆';
          } else {
            if (numA < numB) mA = ' 🏆'; else mB = ' 🏆';
          }
        } else if (numA > 0 && numB === 0) mA = ' 🏆';
        else if (numB > 0 && numA === 0)   mB = ' 🏆';
      }

      out += `│  • *${lbl}*\n`;
      out += `│    🅰️ ${txtA || '—'}${mA}\n`;
      out += `│    🅱️ ${txtB || '—'}${mB}\n`;
    }
  }

  out += `│\n`;
  out += `╰────────────────────\n`;
  out += `_📡 Realtime GSMArena • .cekhp untuk detail per HP_`;

  return out;
}

// ── Image combiner (1 paket) ─────────────────────────────────────────────────

/**
 * Gabungkan 2 foto HP berdampingan dalam 1 gambar (PNG) dengan
 * label 🅰️ / 🅱️ ringan agar mudah dibedakan.
 * Return Buffer PNG, atau null jika gagal/sharp tidak ada.
 */
async function buildCombinedImage(imgA, imgB) {
  if (!sharp) return null;
  if (!imgA && !imgB) return null;

  const SLOT_W = 600;
  const SLOT_H = 600;
  const GAP    = 20;
  const PAD    = 20;
  const BG     = { r: 255, g: 255, b: 255, alpha: 1 };

  async function prepSlot(buf, label) {
    let base;
    if (buf && buf.length > 500) {
      try {
        base = await sharp(buf)
          .resize(SLOT_W, SLOT_H, { fit: 'contain', background: BG })
          .png()
          .toBuffer();
      } catch (_) {
        base = null;
      }
    }
    if (!base) {
      // Slot kosong (placeholder)
      const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" width="${SLOT_W}" height="${SLOT_H}">
        <rect width="100%" height="100%" fill="#f4f4f4"/>
        <text x="50%" y="50%" font-family="Arial" font-size="36" fill="#bbb"
              text-anchor="middle" dominant-baseline="middle">No Image</text>
      </svg>`;
      base = await sharp(Buffer.from(placeholder)).png().toBuffer();
    }

    // Tambah label 🅰️/🅱️ di pojok kiri atas
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60">
      <rect x="0" y="0" width="120" height="60" rx="12" ry="12" fill="rgba(0,0,0,0.6)"/>
      <text x="60" y="40" font-family="Arial" font-size="34" font-weight="bold"
            fill="white" text-anchor="middle">${label}</text>
    </svg>`;
    return sharp(base)
      .composite([{ input: Buffer.from(labelSvg), top: 12, left: 12 }])
      .png()
      .toBuffer();
  }

  const [slotA, slotB] = await Promise.all([
    prepSlot(imgA, 'A'),
    prepSlot(imgB, 'B'),
  ]);

  const totalW = PAD * 2 + SLOT_W * 2 + GAP;
  const totalH = PAD * 2 + SLOT_H;

  return sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      { input: slotA, top: PAD, left: PAD },
      { input: slotB, top: PAD, left: PAD + SLOT_W + GAP },
    ])
    .png()
    .toBuffer();
}

// ── Main export ───────────────────────────────────────────────────────────────

async function bandingkanHP(rawQueryA, rawQueryB) {
  const variantA = extractVariant(rawQueryA);
  const variantB = extractVariant(rawQueryB);
  const cleanA   = stripVariant(rawQueryA) || rawQueryA;
  const cleanB   = stripVariant(rawQueryB) || rawQueryB;

  // Fetch spesifikasi paralel (realtime dari GSMArena)
  const [a, b] = await Promise.all([
    cekHP(cleanA),
    cekHP(cleanB),
  ]);

  // Fetch gambar paralel
  const [imgA, imgB] = await Promise.all([
    getHPImage(a.image, a.bigpicUrl).catch(() => null),
    getHPImage(b.image, b.bigpicUrl).catch(() => null),
  ]);

  // Gabung 2 foto jadi 1 gambar side-by-side (realtime, masing-masing dari URL GSMArena-nya)
  const combined = await buildCombinedImage(imgA, imgB).catch(() => null);

  const text = formatComparison(a, b, variantA, variantB);

  return { a, b, imgA, imgB, combined, text, variantA, variantB };
}

module.exports = { bandingkanHP, formatComparison, buildRows, buildCombinedImage };

// ── PDF GENERATOR (from bandingkanpdf.cjs) ────────────────────────────────────

const PDFDocument = require('pdfkit');

const CATEGORY_EMOJI_TXT = {
  'Network': 'Network',
  'Launch': 'Launch',
  'Body': 'Body',
  'Display': 'Display',
  'Platform': 'Platform',
  'Memory': 'Memory',
  'Main Camera': 'Main Camera',
  'Selfie camera': 'Selfie Camera',
  'Sound': 'Sound',
  'Comms': 'Comms',
  'Features': 'Features',
  'Battery': 'Battery',
  'Misc': 'Misc',
  'Our Tests': 'Our Tests',
};

const CATEGORY_ORDER_PDF = [
  'Platform', 'Memory', 'Display', 'Main Camera', 'Selfie camera',
  'Battery', 'Body', 'Network', 'Comms', 'Sound', 'Features', 'Launch', 'Misc', 'Our Tests',
];

function _pdfClean(v) {
  if (v == null) return '-';
  return String(v).replace(/\s+/g, ' ').trim() || '-';
}

function _applyVariant(specs, variant) {
  if (!variant || !specs) return specs;
  const mv = variant.match(/(\d+(?:\.\d+)?)\s*(GB|TB)\s*(?:\/|,|\s)\s*(\d+(?:\.\d+)?)\s*(GB|TB)/i);
  if (!mv) return specs;
  const out = JSON.parse(JSON.stringify(specs));
  if (out.Memory) {
    out.Memory.Internal = `${mv[3]}${mv[4].toUpperCase()} ${mv[1]}${mv[2].toUpperCase()} RAM`;
  }
  return out;
}

async function buildComparisonPDF(result) {
  const { a, b, imgA, imgB, variantA, variantB } = result;
  const labelA = variantA ? `${a.name} (${variantA})` : a.name;
  const labelB = variantB ? `${b.name} (${variantB})` : b.name;

  const specsA = _applyVariant(a.specs, variantA);
  const specsB = _applyVariant(b.specs, variantB);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    info: {
      Title: `Perbandingan ${a.name} vs ${b.name}`,
      Author: 'Wily Bot',
      Subject: 'Phone Comparison',
    },
  });

  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((res) => doc.on('end', () => res(Buffer.concat(chunks))));

  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  doc.rect(0, 0, PAGE_W, 70).fill('#1f2937');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20)
    .text('PERBANDINGAN HP', MARGIN, 22, { align: 'center', width: CONTENT_W });
  doc.fontSize(10).font('Helvetica').fillColor('#cbd5e1')
    .text('Sumber data: GSMArena (realtime)', MARGIN, 48, { align: 'center', width: CONTENT_W });

  doc.fillColor('#000000');
  let y = 90;

  const colW = (CONTENT_W - 20) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 20;

  doc.roundedRect(leftX, y, colW, 30, 4).fill('#3b82f6');
  doc.roundedRect(rightX, y, colW, 30, 4).fill('#ef4444');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
    .text(labelA, leftX + 8, y + 9, { width: colW - 16, ellipsis: true });
  doc.text(labelB, rightX + 8, y + 9, { width: colW - 16, ellipsis: true });
  doc.fillColor('#000000');
  y += 40;

  const imgH = 200;
  if (imgA && imgA.length > 500) {
    try { doc.image(imgA, leftX, y, { fit: [colW, imgH], align: 'center', valign: 'center' }); } catch (_) {}
  }
  if (imgB && imgB.length > 500) {
    try { doc.image(imgB, rightX, y, { fit: [colW, imgH], align: 'center', valign: 'center' }); } catch (_) {}
  }
  y += imgH + 20;

  const priceA = a.priceInfo?.raw || '-';
  const priceB = b.priceInfo?.raw || '-';
  const idrA = a.priceInfo?.idr ? 'Rp ' + Math.round(a.priceInfo.idr).toLocaleString('id-ID') : null;
  const idrB = b.priceInfo?.idr ? 'Rp ' + Math.round(b.priceInfo.idr).toLocaleString('id-ID') : null;

  doc.roundedRect(MARGIN, y, CONTENT_W, 50, 4).fill('#fef3c7').stroke('#f59e0b');
  doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(11).text('HARGA', MARGIN + 10, y + 8);
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(`A: ${priceA}${idrA ? '  |  ' + idrA : ''}`, MARGIN + 10, y + 24, { width: CONTENT_W - 20 });
  doc.text(`B: ${priceB}${idrB ? '  |  ' + idrB : ''}`, MARGIN + 10, y + 36, { width: CONTENT_W - 20 });
  y += 60;

  const specColW = 130;
  const valColW = (CONTENT_W - specColW) / 2;
  const rowPad = 6;

  function ensureSpace(needed) {
    if (y + needed > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN; }
  }

  const pick = (specs, cat, keys) => {
    const c = specs?.[cat];
    if (!c) return '-';
    for (const k of keys) {
      const v = c[k];
      if (v && String(v).trim() !== '-') return _pdfClean(v);
    }
    return '-';
  };
  const summary = [
    { label: 'Chipset',      a: pick(specsA, 'Platform', ['Chipset']),       b: pick(specsB, 'Platform', ['Chipset']) },
    { label: 'OS',           a: pick(specsA, 'Platform', ['OS']),            b: pick(specsB, 'Platform', ['OS']) },
    { label: 'RAM/Storage',  a: pick(specsA, 'Memory', ['Internal']),        b: pick(specsB, 'Memory', ['Internal']) },
    { label: 'Layar',        a: pick(specsA, 'Display', ['Size','Type']),    b: pick(specsB, 'Display', ['Size','Type']) },
    { label: 'Resolusi',     a: pick(specsA, 'Display', ['Resolution']),     b: pick(specsB, 'Display', ['Resolution']) },
    { label: 'Kamera Utama', a: pick(specsA, 'Main Camera', ['Triple','Quad','Dual','Single']),
                              b: pick(specsB, 'Main Camera', ['Triple','Quad','Dual','Single']) },
    { label: 'Kamera Depan', a: pick(specsA, 'Selfie camera', ['Single','Dual']),
                              b: pick(specsB, 'Selfie camera', ['Single','Dual']) },
    { label: 'Baterai',      a: pick(specsA, 'Battery', ['Type']),           b: pick(specsB, 'Battery', ['Type']) },
    { label: 'Charging',     a: pick(specsA, 'Battery', ['Charging']),       b: pick(specsB, 'Battery', ['Charging']) },
  ];

  ensureSpace(24 + 20 + summary.length * 30);

  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 3).fill('#059669');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
    .text('RINGKASAN SPEK PENTING', MARGIN + 12, y + 6);
  doc.fillColor('#000000');
  y += 24;

  doc.rect(MARGIN, y, specColW, 20).fill('#d1fae5');
  doc.rect(MARGIN + specColW, y, valColW, 20).fill('#dbeafe');
  doc.rect(MARGIN + specColW + valColW, y, valColW, 20).fill('#fee2e2');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9.5);
  doc.text('Spesifikasi', MARGIN + 6, y + 6, { width: specColW - 12 });
  doc.text('A', MARGIN + specColW + 6, y + 6, { width: valColW - 12 });
  doc.text('B', MARGIN + specColW + valColW + 6, y + 6, { width: valColW - 12 });
  y += 20;

  let zebraSum = false;
  for (const r of summary) {
    doc.font('Helvetica').fontSize(9.5);
    const hL = doc.heightOfString(r.label, { width: specColW - 12 });
    const hA = doc.heightOfString(r.a, { width: valColW - 12 });
    const hB = doc.heightOfString(r.b, { width: valColW - 12 });
    const rowH = Math.max(hL, hA, hB) + 14;
    ensureSpace(rowH);
    if (zebraSum) doc.rect(MARGIN, y, CONTENT_W, rowH).fill('#f0fdf4');
    doc.strokeColor('#a7f3d0').lineWidth(0.5)
      .moveTo(MARGIN, y + rowH).lineTo(MARGIN + CONTENT_W, y + rowH).stroke();
    doc.moveTo(MARGIN + specColW, y).lineTo(MARGIN + specColW, y + rowH).stroke();
    doc.moveTo(MARGIN + specColW + valColW, y).lineTo(MARGIN + specColW + valColW, y + rowH).stroke();
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9.5)
      .text(r.label, MARGIN + 6, y + 7, { width: specColW - 12 });
    doc.fillColor('#000000').font('Helvetica').fontSize(9.5)
      .text(r.a, MARGIN + specColW + 6, y + 7, { width: valColW - 12 });
    doc.text(r.b, MARGIN + specColW + valColW + 6, y + 7, { width: valColW - 12 });
    y += rowH;
    zebraSum = !zebraSum;
  }
  y += 14;

  const allCats = new Set([
    ...CATEGORY_ORDER_PDF,
    ...Object.keys(specsA || {}),
    ...Object.keys(specsB || {}),
  ]);

  function drawCategoryHeader(catName) {
    ensureSpace(24 + 20 + 30);
    doc.roundedRect(MARGIN, y, CONTENT_W, 24, 3).fill('#1f2937');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text(CATEGORY_EMOJI_TXT[catName] || catName, MARGIN + 12, y + 6);
    doc.fillColor('#000000');
    y += 24;
    doc.rect(MARGIN, y, specColW, 20).fill('#e5e7eb');
    doc.rect(MARGIN + specColW, y, valColW, 20).fill('#dbeafe');
    doc.rect(MARGIN + specColW + valColW, y, valColW, 20).fill('#fee2e2');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9.5);
    doc.text('Spesifikasi', MARGIN + 6, y + 6, { width: specColW - 12 });
    doc.text('A', MARGIN + specColW + 6, y + 6, { width: valColW - 12 });
    doc.text('B', MARGIN + specColW + valColW + 6, y + 6, { width: valColW - 12 });
    y += 20;
  }

  function drawRow(label, valA, valB, zebra) {
    const cleanA = _pdfClean(valA);
    const cleanB = _pdfClean(valB);
    if (cleanA === '-' && cleanB === '-') return;
    doc.font('Helvetica').fontSize(9.5);
    const hLabel = doc.heightOfString(label, { width: specColW - 12 });
    const hA = doc.heightOfString(cleanA, { width: valColW - 12 });
    const hB = doc.heightOfString(cleanB, { width: valColW - 12 });
    const rowH = Math.max(hLabel, hA, hB) + rowPad * 2;
    ensureSpace(rowH);
    if (zebra) doc.rect(MARGIN, y, CONTENT_W, rowH).fill('#f9fafb');
    doc.strokeColor('#d1d5db').lineWidth(0.5)
      .moveTo(MARGIN, y + rowH).lineTo(MARGIN + CONTENT_W, y + rowH).stroke();
    doc.moveTo(MARGIN + specColW, y).lineTo(MARGIN + specColW, y + rowH).stroke();
    doc.moveTo(MARGIN + specColW + valColW, y).lineTo(MARGIN + specColW + valColW, y + rowH).stroke();
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5)
      .text(label, MARGIN + 6, y + rowPad, { width: specColW - 12 });
    doc.fillColor('#000000').font('Helvetica').fontSize(9.5)
      .text(cleanA, MARGIN + specColW + 6, y + rowPad, { width: valColW - 12 });
    doc.text(cleanB, MARGIN + specColW + valColW + 6, y + rowPad, { width: valColW - 12 });
    y += rowH;
  }

  for (const cat of allCats) {
    const catA = (specsA && specsA[cat]) || null;
    const catB = (specsB && specsB[cat]) || null;
    if (!catA && !catB) continue;
    const labels = [];
    const seen = new Set();
    if (catA) for (const k of Object.keys(catA)) { if (!seen.has(k)) { seen.add(k); labels.push(k); } }
    if (catB) for (const k of Object.keys(catB)) { if (!seen.has(k)) { seen.add(k); labels.push(k); } }
    if (!labels.length) continue;
    let hasContent = false;
    for (const lbl of labels) {
      const va = catA?.[lbl];
      const vb = catB?.[lbl];
      if ((va && va !== '-') || (vb && vb !== '-')) { hasContent = true; break; }
    }
    if (!hasContent) continue;
    drawCategoryHeader(cat);
    let zebra = false;
    for (const lbl of labels) { drawRow(lbl, catA?.[lbl], catB?.[lbl], zebra); zebra = !zebra; }
    y += 8;
  }

  ensureSpace(30);
  y = PAGE_H - MARGIN - 15;
  doc.fontSize(7).fillColor('#6b7280').font('Helvetica-Oblique')
    .text('Dibuat oleh Wily Bot — Data: GSMArena', MARGIN, y, { align: 'center', width: CONTENT_W });

  doc.end();
  return await done;
}

module.exports.buildComparisonPDF = buildComparisonPDF;

// ── COMMAND HANDLER ────────────────────────────────────────────────────────────

async function handleVsbandingkan({ hisoka, m, query, tolak, logCommand, logError }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                if (!input) {
                        await tolak(hisoka, m,
                                `╭─「 📱 *BANDINGKAN HP* 」\n│\n│ Bandingkan spesifikasi 2 HP secara\n│ side-by-side dari database GSMArena.\n│\n│ *Format:*\n│ ${pfx}bandingkan <HP1> vs <HP2>\n│\n│ *Contoh:*\n│ • ${pfx}bandingkan Redmi Note 13 Pro vs Poco X6 Pro\n│ • ${pfx}bandingkan iPhone 15 vs Samsung S24\n│ • ${pfx}bandingkan Xiaomi 14 vs Pixel 8 Pro\n╰────────────────────`
                        );
                        return;
                }

                const sepMatch = input.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
                if (!sepMatch) {
                        await tolak(hisoka, m,
                                `❌ Format salah.\n\nGunakan: *${pfx}bandingkan <HP1> vs <HP2>*\nContoh: *${pfx}bandingkan Redmi Note 13 Pro vs Poco X6 Pro*`
                        );
                        return;
                }

                const queryA = sepMatch[1].trim();
                const queryB = sepMatch[2].trim();

                await hisoka.sendMessage(m.from, { react: { text: '🔎', key: m.key } });
                const loadingMsg = await tolak(hisoka, m, `🔎 Mencari data *${queryA}* dan *${queryB}*...\nMohon tunggu sebentar ⏳`);

                const result = await bandingkanHP(queryA, queryB);

                if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }

                const hasCombined = result.combined && result.combined.length > 500;
                const hasImgA     = result.imgA && result.imgA.length > 500;
                const hasImgB     = result.imgB && result.imgB.length > 500;

                if      (hasCombined) await hisoka.sendMessage(m.from, { image: result.combined, caption: result.text }, { quoted: m });
                else if (hasImgA)     await hisoka.sendMessage(m.from, { image: result.imgA,     caption: result.text }, { quoted: m });
                else if (hasImgB)     await hisoka.sendMessage(m.from, { image: result.imgB,     caption: result.text }, { quoted: m });
                else                  await hisoka.sendMessage(m.from, { text: result.text }, { quoted: m });

                try {
                        const pdfBuf = await buildComparisonPDF(result);
                        if (pdfBuf && pdfBuf.length > 500) {
                                const safeA = (result.a.name || 'A').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30);
                                const safeB = (result.b.name || 'B').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30);
                                await hisoka.sendMessage(m.from, {
                                        document: pdfBuf, mimetype: 'application/pdf',
                                        fileName: `Bandingkan_${safeA}_vs_${safeB}.pdf`,
                                        caption: `📄 *Versi PDF rapih*\n${result.a.name} vs ${result.b.name}`,
                                }, { quoted: m });
                        }
                } catch (pdfErr) {
                        console.error('\x1b[31m[BandingkanHP][PDF] Error:\x1b[39m', pdfErr.message);
                }

                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'bandingkan');
        } catch (error) {
                console.error('\x1b[31m[BandingkanHP] Error:\x1b[39m', error.message);
                logError(error, 'command:bandingkan');
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                await tolak(hisoka, m,
                        `❌ Gagal membandingkan HP.\n\n_${error.message}_\n\nPastikan nama HP ditulis lengkap dan dipisah dengan *vs*.\nContoh: *.bandingkan Redmi Note 13 Pro vs Poco X6 Pro*`
                );
        }
}

module.exports.handleVsbandingkan = handleVsbandingkan;
