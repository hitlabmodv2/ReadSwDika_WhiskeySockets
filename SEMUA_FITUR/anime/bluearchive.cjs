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
 *  bluearchive.cjs — Info karakter Blue Archive
 *  Scrape data karakter & tier list game gacha Blue Archive
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Blue Archive Character Info
 *  Scrape data karakter, skill, statistik, dan tier list dari
 *  game gacha Blue Archive — sajikan info lengkap ke WhatsApp.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const axios = require('axios');

const BASE = 'https://api.dotgg.gg/bluearchive';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };

function cleanText(str = '') {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

function findUrl(input, urls) {
  const clean = input.toLowerCase().replace(/\s+/g, '_');
  if (urls.includes(clean)) return clean;

  const words = clean.split('_').filter(Boolean);
  const matches = urls.filter(url =>
    words.every(word => url.toLowerCase().includes(word))
  );
  return matches.length > 0 ? matches[0] : null;
}

async function baList() {
  try {
    const { data } = await axios.get(`${BASE}/characters`, { headers: HEADERS, timeout: 10000 });
    if (!Array.isArray(data)) throw new Error('Format data tidak valid.');
    return data;
  } catch (err) {
    throw new Error(`Gagal ambil daftar karakter: ${err.message}`);
  }
}

async function baChar(charName) {
  if (!charName || !charName.trim()) throw new Error('Nama karakter tidak boleh kosong.');

  const list = await baList();
  const urls = list.map(c => c.url).filter(Boolean);
  const foundUrl = findUrl(charName.trim(), urls);

  if (!foundUrl) {
    const available = urls.slice(0, 10).join(', ');
    throw new Error(`Karakter "${charName}" tidak ditemukan. Contoh: ${available}...`);
  }

  try {
    const { data } = await axios.get(`${BASE}/characters/${foundUrl}`, { headers: HEADERS, timeout: 10000 });
    return data;
  } catch (err) {
    throw new Error(`Gagal ambil data karakter: ${err.message}`);
  }
}

function formatBaChar(data) {
  if (!data) return 'Data karakter kosong.';

  const prof = data.profile || {};
  const name = cleanText(data.name || data.fullName || '-');
  const school = cleanText(prof.school || data.school || '-');
  const role = cleanText(data.role || data.combatRole || '-');
  const type = cleanText(data.type || data.attackType || '-');
  const position = cleanText(data.position || '-');
  const rarity = data.rarity ? '⭐'.repeat(Number(data.rarity)) : null;

  let body = `🎮 *BLUE ARCHIVE CHARACTER INFO*\n\n`;
  body += `👤 *${name}*`;
  if (rarity) body += ` ${rarity}`;
  body += `\n`;
  if (school && school !== '-') body += `🏫 *Sekolah:* ${school}\n`;
  if (role && role !== '-') body += `⚔️ *Role:* ${role}\n`;
  if (type && type !== '-') body += `🔰 *Tipe:* ${type}\n`;
  if (position && position !== '-') body += `📍 *Posisi:* ${position}\n`;

  const age = cleanText(prof.age || '');
  const height = cleanText(prof.height || '');
  const hobby = cleanText(prof.hobby || '');
  const club = cleanText(prof.club || '');
  const cv = cleanText(prof.CV || '');
  const weaponType = cleanText(prof.weaponType || '');

  if (age || height || hobby || club || cv || weaponType) {
    body += `\n📋 *Profil*\n`;
    if (age) body += `▸ *Usia:* ${age}\n`;
    if (height) body += `▸ *Tinggi:* ${height}\n`;
    if (hobby) body += `▸ *Hobi:* ${hobby}\n`;
    if (club) body += `▸ *Klub:* ${club}\n`;
    if (weaponType) body += `▸ *Tipe Senjata:* ${weaponType}\n`;
    if (cv) body += `▸ *CV:* ${cv}\n`;
  }

  if (data.weapon) {
    const wp = data.weapon;
    body += `\n🔫 *Senjata*\n`;
    body += `▸ *Nama:* ${cleanText(wp.name || '-')}\n`;
    if (wp.type) body += `▸ *Tipe:* ${wp.type}\n`;
    if (wp.attack) body += `▸ *ATK:* \`${wp.attack}\`\n`;
    if (wp.hp) body += `▸ *HP:* \`${wp.hp}\`\n`;
    if (wp.desc) body += `▸ *Deskripsi:* _${cleanText(wp.desc).slice(0, 100)}_\n`;
  }

  if (data.skills && Array.isArray(data.skills)) {
    body += `\n🔥 *Skills*\n`;
    for (const skill of data.skills.slice(0, 5)) {
      const sName = cleanText(skill.name || '-');
      const sDesc = cleanText(skill.description || skill.desc || '');
      body += `▸ *${sName}*`;
      if (sDesc) body += `: ${sDesc.slice(0, 100)}`;
      body += `\n`;
    }
  }

  if (data.skillprio) {
    const sp = data.skillprio;
    body += `\n🎯 *Skill Priority*\n`;
    if (sp['General Skill Priority']) body += `▸ ~Umum:~ \`${sp['General Skill Priority'].trim()}\`\n`;
    if (sp['Early to Mid Game investments']) body += `▸ *Early-Mid:* \`${sp['Early to Mid Game investments']}\`\n`;
    if (sp['Recommended Investment pre UE40']) body += `▸ *Pre UE40:* \`${sp['Recommended Investment pre UE40']}\`\n`;
    if (sp['Recommended Investment UE40']) body += `▸ *UE40:* \`${sp['Recommended Investment UE40']}\`\n`;
    if (sp['Notes']) body += `▸ *Catatan:*\n> ${cleanText(sp['Notes']).slice(0, 150)}\n`;
  }

  if (typeof data.bio === 'string' && data.bio.trim()) {
    body += `\n📖 *Bio:*\n> ${cleanText(data.bio).slice(0, 250)}\n`;
  }

  body += `\n🔗 *Source:* ${BASE}/characters/${data.url || ''}`;
  return body.trimEnd();
}

module.exports = { baList, baChar, formatBaChar };

// ── COMMAND HANDLER ────────────────────────────────────────────────────────────

async function handleBa({ hisoka, m, query, tolak, logCommand, logError }) {
        try {
                const input = (query || '').trim();
                const pfx = m.prefix || '.';

                if (!input) {
                        await tolak(hisoka, m,
                                `╭─「 🎮 *BLUE ARCHIVE* 」\n│\n│ Cek info karakter _secara realtime_,\n│ ~tanpa login~ atau API key.\n│ Total: *227 karakter* tersedia.\n│\n├─「 📌 *Cara Pakai* 」\n│ \`${pfx}ba <nama karakter>\`\n│\n├─「 🎯 *Contoh Karakter* 」\n│ • \`${pfx}ba shiroko\`\n│ • \`${pfx}ba hina\`\n│ • \`${pfx}ba aru\`\n│ • \`${pfx}ba hoshino\`\n│ • \`${pfx}ba iori\`\n│ • \`${pfx}ba yuuka\`\n│\n├─「 👙 *Versi Alternatif* 」\n│ > Tambah kata di belakang nama:\n│ • \`${pfx}ba hina swimsuit\`\n│ • \`${pfx}ba neru bunnygirl\`\n│ • \`${pfx}ba aru newyear\`\n│ • \`${pfx}ba serika swimsuit\`\n│ • \`${pfx}ba chinatsu onsen\`\n│\n├─「 📊 *Info yang Ditampilkan* 」\n│ 1. 💬 Quote suara _(random)_\n│ 2. 🏫 Sekolah, Role, Tipe, Posisi\n│ 3. 📋 Profil (usia, hobi, CV, dll)\n│ 4. 🔫 Senjata + _stats_\n│ 5. 🔥 *Skills* lengkap\n│ 6. 🎯 *Skill priority* & investasi\n│ 7. 📖 Bio karakter\n│\n├─「 🔰 *Tipe Karakter* 」\n│ \`Striker\` (155) • \`Special\` (72)\n│\n├─「 ⚔️ *Role* 」\n│ \`DPS\` (122) • \`Supporter\` (61)\n│ \`Tank\` (20) • \`Healer\` (18) • \`T.S.\`\n╰────────────────────`
                        );
                        logCommand(m, hisoka, m.command || 'bluearchive');
                        return;
                }

                await hisoka.sendMessage(m.from, { react: { text: '🎮', key: m.key } });
                const loadingMsg = await tolak(hisoka, m, `🔎 Mencari data karakter *${input}* di Blue Archive...`);

                const result = await baChar(input);
                const report = formatBaChar(result);

                if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }

                const imgFile = result.img || result.imgSmall || null;
                const imgUrl  = imgFile ? `https://cdn.jsdelivr.net/gh/SchaleDB/SchaleDB@main/images/student/${imgFile}` : null;

                let imgSent = false;
                if (imgUrl) {
                        try { await hisoka.sendMessage(m.from, { image: { url: imgUrl }, caption: report }, { quoted: m }); imgSent = true; } catch (_) {}
                }
                if (!imgSent) await tolak(hisoka, m, report);

                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, m.command || 'bluearchive');
        } catch (error) {
                console.error('\x1b[31m[BlueArchive] Error:\x1b[39m', error.message);
                logError(error, 'command:ba');
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                await tolak(hisoka, m, `❌ Karakter tidak ditemukan.\n\n_${error.message}_\n\nContoh: *.ba shiroko*`);
        }
}

module.exports.handleBa = handleBa;
