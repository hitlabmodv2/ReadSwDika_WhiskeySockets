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

export function getJadibotNumber(hisoka) {
  return String(hisoka?.user?.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
}

/* ================= EMOJI PER-USER JADIBOT ================= */
// Disimpan di data_jadibot/{nomor}/emoji.json — terpisah total per jadibot

function _emojiFilePath(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  return path.join(process.cwd(), 'data_jadibot', number, 'emoji.json')
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

function _readEmojiFile(number) {
  // Return full object { mode, emojis } — auto-init dari bot utama jika belum ada
  try {
    const p = _emojiFilePath(number)
    if (!fs.existsSync(p)) {
      const defaults = _getMainBotEmojis()
      const obj = { mode: 'default', emojis: defaults }
      if (defaults.length > 0) {
        try {
          fs.mkdirSync(path.dirname(p), { recursive: true })
          const tmp = p + '.tmp'
          fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
          fs.renameSync(tmp, p)
        } catch {}
      }
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
    const main = _getMainBotEmojis()
    return main.length > 0 ? main : (emojis.length > 0 ? emojis : null)
  }
  return emojis.length > 0 ? emojis : null
}

export function getJadibotRandomEmoji(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const { mode, emojis } = _readEmojiFile(number)
  let pool
  if (mode === 'default') {
    pool = _getMainBotEmojis()
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
  return { emojis, count: emojis.length, mode }
}

export function setDefaultEmojiMode(number) {
  // Mode default: pakai emoji dari bot utama saat reaksi SW
  number = String(number || '').replace(/[^0-9]/g, '')
  const obj = _readEmojiFile(number)
  obj.mode = 'default'
  _writeEmojiFile(number, obj)
}

export function setCustomEmojiMode(number) {
  // Mode custom: pakai emoji dari file milik jadibot sendiri
  number = String(number || '').replace(/[^0-9]/g, '')
  const obj = _readEmojiFile(number)
  obj.mode = 'custom'
  _writeEmojiFile(number, obj)
}

export function resetToDefaultEmojis(number) {
  // Reset file emoji ke default bot utama + set mode=default
  number = String(number || '').replace(/[^0-9]/g, '')
  const defaults = _getMainBotEmojis()
  _writeEmojiFile(number, { mode: 'default', emojis: defaults })
  return defaults.length
}

// Emoji seed setelah .clearemoji — hanya love ijo 💚 (standar WA)
const WA_SEED_EMOJIS = ['💚']

export function clearJadibotEmojis(number) {
  // Clear semua emoji → isi seed WA + mode custom (tidak pernah benar-benar kosong)
  number = String(number || '').replace(/[^0-9]/g, '')
  _writeEmojiFile(number, { mode: 'custom', emojis: [...WA_SEED_EMOJIS] })
  return [...WA_SEED_EMOJIS]
}
