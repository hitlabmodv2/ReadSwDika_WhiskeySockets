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

const JADIBOT_SETTINGS_PATH = path.join(process.cwd(), 'data', 'jadibot', 'settings.json')

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

export function getJadibotEmojis(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const settings = getJadibotUserSettings(number)
  if (Array.isArray(settings.emojis) && settings.emojis.length > 0) {
    return settings.emojis
  }
  return null
}

export function getJadibotRandomEmoji(number) {
  const emojis = getJadibotEmojis(number)
  if (!emojis || emojis.length === 0) return null
  return emojis[Math.floor(Math.random() * emojis.length)]
}

export function addJadibotEmojis(number, emojisToAdd) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const all = loadAllJadibotSettings()
  if (!all[number]) all[number] = {}
  const current = Array.isArray(all[number].emojis) ? all[number].emojis : []
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
    all[number].emojis = current
    all[number].updatedAt = Date.now()
    saveAllJadibotSettings(all)
  }
  return results
}

export function deleteJadibotEmojis(number, emojisToDelete) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const all = loadAllJadibotSettings()
  if (!all[number]) all[number] = {}
  let current = Array.isArray(all[number].emojis) ? all[number].emojis : []
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
    all[number].emojis = current
    all[number].updatedAt = Date.now()
    saveAllJadibotSettings(all)
  }
  return results
}

export function listJadibotEmojis(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const settings = getJadibotUserSettings(number)
  const emojis = Array.isArray(settings.emojis) ? settings.emojis : []
  return { emojis, count: emojis.length }
}
