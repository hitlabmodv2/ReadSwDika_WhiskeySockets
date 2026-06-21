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
 *  jadibotSettings.js — Setting per sesi jadibot
 *  Antidel, typing, recording, online, emoji per jadibot user
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  JadiBot Per-Session Settings
 *  Kelola pengaturan individu tiap sesi JadiBot: antidel,
 *  auto typing/recording, status online, emoji set kustom —
 *  setiap JadiBot user punya konfigurasi yang independen.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict'

import fs from 'fs'
import path from 'path'

const JADIBOT_SETTINGS_PATH = path.join(process.cwd(), 'data_jadibot', 'settings.json')

function ensureDir() {
  fs.mkdirSync(path.dirname(JADIBOT_SETTINGS_PATH), { recursive: true })
}

export function loadAllJadibotSettings() {
  try {
    ensureDir()
    if (!fs.existsSync(JADIBOT_SETTINGS_PATH)) return {}
    const parsed = JSON.parse(fs.readFileSync(JADIBOT_SETTINGS_PATH, 'utf-8'))
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch {
    return {}
  }
}

export function saveAllJadibotSettings(data) {
  ensureDir()
  const tmp = `${JADIBOT_SETTINGS_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, JADIBOT_SETTINGS_PATH)
}

export function getJadibotUserSettings(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const all = loadAllJadibotSettings()
  return all[number] || {}
}

export function setJadibotUserSetting(number, key, value) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const all = loadAllJadibotSettings()
  if (!all[number]) all[number] = {}
  all[number][key] = value
  all[number].updatedAt = Date.now()
  saveAllJadibotSettings(all)
}

export function removeJadibotUserSettings(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const all = loadAllJadibotSettings()
  if (all[number]) {
    delete all[number]
    saveAllJadibotSettings(all)
  }
}

export function getJadibotAntidel(number) {
  const settings = getJadibotUserSettings(number)
  return settings.antidel || { enabled: false, privateChat: true, groupChat: true, sendTo: 'self' }
}

export function getJadibotReadsw(number) {
  const settings = getJadibotUserSettings(number)
  return settings.readsw || {
    enabled: true,
    autoReaction: true,
    randomDelay: true,
    delayMinMs: 1000,
    delayMaxMs: 20000,
    fixedDelayMs: 3000
  }
}

export function getJadibotAnticall(number) {
  const settings = getJadibotUserSettings(number)
  return settings.anticall || { enabled: false, message: '', whitelist: [] }
}

export function getJadibotAnticallvid(number) {
  const settings = getJadibotUserSettings(number)
  return settings.anticallvid || { enabled: false, message: '', whitelist: [] }
}

export function getJadibotAutoOnline(number) {
  const settings = getJadibotUserSettings(number)
  return settings.autoOnline || { enabled: false, intervalSeconds: 30 }
}

export function getJadibotReadchat(number) {
  const settings = getJadibotUserSettings(number)
  return settings.readchat || { enabled: false }
}

export function getJadibotAutoTyping(number) {
  const settings = getJadibotUserSettings(number)
  return settings.autoTyping || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true }
}

export function getJadibotAutoRecording(number) {
  const settings = getJadibotUserSettings(number)
  return settings.autoRecording || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true }
}

export function getJadibotNumber(hisoka) {
  return String(hisoka?.user?.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
}

/* ================= EMOJI PER-USER JADIBOT ================= */
// emoji.json        → setting user { mode, emojis } (custom emojis disimpan di sini)
// defaultemoji.json → copy realtime dari bot utama, otomatis dibuat pertama kali & di-sync tiap akses default

function _emojiFilePath(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  return path.join(process.cwd(), 'data_jadibot', number, 'emoji.json')
}

function _defaultEmojiFilePath(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  return path.join(process.cwd(), 'data_jadibot', number, 'defaultemoji.json')
}

function _getMainBotEmojis() {
  try {
    const mainEmojiPath = path.join(process.cwd(), 'src', 'helper', 'emoji.json')
    if (!fs.existsSync(mainEmojiPath)) return []
    const data = JSON.parse(fs.readFileSync(mainEmojiPath, 'utf-8'))
    return Array.isArray(data.emojis) ? data.emojis : []
  } catch {
    return []
  }
}

// Sync defaultemoji.json dari bot utama — realtime copy, selalu fresh
function _syncDefaultEmojiFile(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const emojis = _getMainBotEmojis()
  if (!emojis.length) {
    // Kalau main bot kosong, baca dari file lama jika ada
    try {
      const p = _defaultEmojiFilePath(number)
      if (fs.existsSync(p)) {
        const d = JSON.parse(fs.readFileSync(p, 'utf-8'))
        return Array.isArray(d.emojis) ? d.emojis : []
      }
    } catch {}
    return []
  }
  try {
    const p = _defaultEmojiFilePath(number)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    const obj = { source: 'main-bot', syncedAt: Date.now(), emojis }
    const tmp = p + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
    fs.renameSync(tmp, p)
  } catch {}
  return emojis
}

function _readDefaultEmojiFile(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  // Selalu sync dari bot utama dulu (realtime)
  return _syncDefaultEmojiFile(number)
}

function _readEmojiFile(number) {
  // Return full object { mode, emojis }
  // Pertama kali user → auto-init mode=default + buat defaultemoji.json
  try {
    const p = _emojiFilePath(number)
    if (!fs.existsSync(p)) {
      // Pertama kali: sync defaultemoji.json dari bot utama
      // emojis[] sengaja kosong — pool kustom user BELUM diisi
      // defaultemoji.json yang dipakai untuk mode=default
      _syncDefaultEmojiFile(number)
      const obj = { mode: 'default', emojis: [] }
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true })
        const tmp = p + '.tmp'
        fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
        fs.renameSync(tmp, p)
      } catch {}
      return obj
    }
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    return {
      mode: data.mode || 'default',
      emojis: Array.isArray(data.emojis) ? data.emojis : []
    }
  } catch {
    return { mode: 'default', emojis: [] }
  }
}

function _writeEmojiFile(number, obj) {
  const p = _emojiFilePath(number)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  fs.renameSync(tmp, p)
}

export function getJadibotEmojiMode(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  return _readEmojiFile(number).mode || 'default'
}

export function getJadibotEmojis(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const { mode, emojis } = _readEmojiFile(number)
  if (mode === 'default') {
    // Realtime sync dari bot utama via defaultemoji.json
    const defaultEmojis = _readDefaultEmojiFile(number)
    return defaultEmojis.length > 0 ? defaultEmojis : (emojis.length > 0 ? emojis : null)
  }
  return emojis.length > 0 ? emojis : null
}

export function getJadibotRandomEmoji(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const { mode, emojis } = _readEmojiFile(number)
  let pool
  if (mode === 'default') {
    // Realtime sync dari bot utama via defaultemoji.json
    pool = _readDefaultEmojiFile(number)
    if (!pool.length) pool = emojis
  } else {
    pool = emojis
  }
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

export function addJadibotEmojis(number, emojisToAdd) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const obj = _readEmojiFile(number)
  const current = obj.emojis
  const results = { added: [], alreadyExists: [] }
  for (const emoji of emojisToAdd) {
    const trimmed = emoji.trim()
    if (!trimmed) continue
    if (current.includes(trimmed)) {
      results.alreadyExists.push(trimmed)
    } else {
      current.push(trimmed)
      results.added.push(trimmed)
    }
  }
  if (results.added.length > 0) {
    obj.emojis = current
    _writeEmojiFile(number, obj)
  }
  return results
}

export function deleteJadibotEmojis(number, emojisToDelete) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const obj = _readEmojiFile(number)
  let current = obj.emojis
  const results = { deleted: [], notFound: [] }
  for (const emoji of emojisToDelete) {
    const trimmed = emoji.trim()
    if (!trimmed) continue
    const idx = current.indexOf(trimmed)
    if (idx > -1) {
      current.splice(idx, 1)
      results.deleted.push(trimmed)
    } else {
      results.notFound.push(trimmed)
    }
  }
  if (results.deleted.length > 0) {
    obj.emojis = current
    _writeEmojiFile(number, obj)
  }
  return results
}

export function listJadibotEmojis(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const { mode, emojis } = _readEmojiFile(number)
  if (mode === 'default') {
    // Tampilkan emoji dari defaultemoji.json (copy bot utama)
    const defaultEmojis = _readDefaultEmojiFile(number)
    return { emojis: defaultEmojis, count: defaultEmojis.length, mode }
  }
  return { emojis, count: emojis.length, mode }
}

export function setDefaultEmojiMode(number) {
  // Mode default: pakai emoji dari bot utama, sync defaultemoji.json sekaligus
  number = String(number || '').replace(/[^0-9]/g, '')
  const obj = _readEmojiFile(number)
  obj.mode = 'default'
  _writeEmojiFile(number, obj)
  // Sync defaultemoji.json realtime dari bot utama
  _syncDefaultEmojiFile(number)
}

export function setCustomEmojiMode(number) {
  // Mode custom: pakai emoji dari emoji.json milik jadibot sendiri
  // Jika sebelumnya default, bersihkan emojis[] agar tidak bercampur dengan copy defaults lama
  number = String(number || '').replace(/[^0-9]/g, '')
  const obj = _readEmojiFile(number)
  if (obj.mode === 'default') {
    // Reset custom pool ke kosong — user mulai dari 0 di mode custom
    obj.emojis = []
  }
  obj.mode = 'custom'
  _writeEmojiFile(number, obj)
}

export function resetToDefaultEmojis(number) {
  // Reset ke default bot utama + set mode=default + sync defaultemoji.json
  number = String(number || '').replace(/[^0-9]/g, '')
  const defaults = _syncDefaultEmojiFile(number)
  // emojis[] kosong — defaults ada di defaultemoji.json, bukan di emojis[]
  _writeEmojiFile(number, { mode: 'default', emojis: [] })
  return defaults.length
}

// Emoji seed setelah .emojiclear — hanya love ijo 💚 (standar WA)
const WA_SEED_EMOJIS = ['💚']

export function clearJadibotEmojis(number) {
  // Clear semua emoji → isi seed WA + mode custom (tidak pernah benar-benar kosong)
  number = String(number || '').replace(/[^0-9]/g, '')
  _writeEmojiFile(number, { mode: 'custom', emojis: [...WA_SEED_EMOJIS] })
  return [...WA_SEED_EMOJIS]
}
