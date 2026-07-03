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
 *  jadibot.js — Manajemen sesi jadibot
 *  Spawn/stop bot sekunder per user, routing command
 * ───────────────────────────────
 */
'use strict'

import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  jidNormalizedUser,
  jidDecode,
  isJidGroup,
  getContentType,
  downloadMediaMessage,
  delay,
  Browsers
} = _require('@whiskeysockets/baileys');

import fs from 'fs'
import path from 'path'
import pino from 'pino'
import QRCode from 'qrcode'
import { execFile } from 'child_process'
import { getRandomEmoji, getStatusEmojis } from '../helper/emoji.js' // masih dipakai di bot utama via hotReload, jangan hapus
import {
  updateSwStatsAt,
  pruneSwStatsAt,
  extractSwNumber,
  storyDebounce,
  maskNumber,
  logStoryView,
  getMediaTypeEmoji,
  getStoryCountToday,
  createSwTracker,
  initJadibotCekswConfig,
} from './swtrack.js'
import { injectClient } from '../helper/inject.js'
import { useSingleFileAuthState } from './authState.js'
import JSONDB from '../db/json.js'
import { cleanStaleSessionFiles } from './cleaner.js'
import { logError } from '../db/errorLog.js'
import { getJadibotAnticall, getJadibotAnticallvid, getJadibotNumber, getJadibotReadsw, getJadibotAutoOnline, getJadibotEmojis, getJadibotRandomEmoji, getJadibotAutoTyping, getJadibotAutoRecording, getJadibotReadchat, getJadibotEmojiMode } from './jadibotSettings.js'
import { getHandler } from './hotReload.js'
import { kvGet, kvSet } from '../db/datadb.js'

/* ================= LOGGER ================= */
const silentLogger = pino({ level: 'silent' })

/* ─── HELPER: dapatkan socket bot utama yang aktif/terbaru ─── */
// mainBotSock bisa stale (socket lama) setelah bot utama reconnect.
// global.hisokaClient selalu diupdate ke socket terbaru di index.js.
// Fungsi ini memastikan kita selalu pakai socket bot utama yang masih hidup.
function getActiveMainSock(fallback = null) {
  return global.hisokaClient || fallback || null
}

/* ================= ANTIDEL MEDIA PRE-CACHE ================= */
const _ANTIDEL_MEDIA_TYPES = new Set(['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'])
const _ANTIDEL_MAX_BYTES   = 15 * 1024 * 1024 // 15 MB — skip video besar
const _ANTIDEL_TTL_MS      = 90 * 1000        // 90 detik (lebih lama dari cacheMsg 60s)

async function preDownloadMediaForAntidel(msg, sock) {
  try {
    if (!msg?.key?.id || !sock?.mediaCacheAntidel) return
    if (sock.mediaCacheAntidel.has(msg.key.id)) return

    let targetMsg = msg.message
    if (!targetMsg) return
    if (targetMsg.ephemeralMessage?.message) targetMsg = targetMsg.ephemeralMessage.message

    const type = getContentType(targetMsg)
    if (!_ANTIDEL_MEDIA_TYPES.has(type)) return

    const content = targetMsg[type]
    if (!content?.mimetype) return

    const buffer = await downloadMediaMessage(
      { ...msg, message: targetMsg },
      'buffer',
      {},
      { reuploadRequest: sock.updateMediaMessage }
    )
    if (!buffer || buffer.length === 0 || buffer.length > _ANTIDEL_MAX_BYTES) return

    const msgId = msg.key.id
    sock.mediaCacheAntidel.set(msgId, buffer)
    setTimeout(() => sock.mediaCacheAntidel?.delete(msgId), _ANTIDEL_TTL_MS)
  } catch (_) {}
}

/* ================= KONSTANTA ================= */
const PAIRING_TIMEOUT_MS = 3 * 60 * 1000 // 3 menit
const DEFAULT_JADIBOT_DURATION_MS = 24 * 60 * 60 * 1000
const MAX_TIMER_MS = 2147483647
const JADIBOT_DATA_PATH = path.join(process.cwd(), 'data_jadibot', 'realtime.json')
fs.mkdirSync(path.join(process.cwd(), 'data_jadibot'), { recursive: true })
const JADIBOT_EXPIRY_WARNING_THRESHOLDS = [
  { ms: 10 * 60 * 1000, label: '10 menit' },
  { ms: 5 * 60 * 1000, label: '5 menit' },
  { ms: 60 * 1000, label: '1 menit' },
  { ms: 30 * 1000, label: '30 detik' }
]

/* ================= STATE ================= */
const jadibotMap = new Map()
const jadibotClearSesiMap = new Map()    // number → clearCacheInPlace fn
const jadibotSesiReportMap = new Map()   // number → getSizeReport fn
const jadibotConnectedAt = new Map()
const startingSocketMap = new Map()
const pairingRequested = new Set()
const stoppingJadibot = new Set()
const expiringJadibot = new Set()
const reconnectingJadibot = new Set()
const activeOrStartingJadibot = new Set()
const pairingTimeout = new Map()
const pendingJadibotChoices = new Map()
const expiryTimers = new Map()
const expiryWarningTimers = new Map()
// Per-jadibot in-memory dedup Set — setiap nomor punya Set sendiri
const jadibotSwSets = new Map()
// Per-jadibot SwTracker — data tersimpan di folder khusus per-nomor jadibot
const jadibotTrackers = new Map()
// Per-jadibot periodic SessionCleaner interval — bersihkan session/sender-key lama saat session jalan lama
const jadibotCleanerTimers = new Map()
// Per-jadibot autoonline interval — isolated per jadibot, tidak mempengaruhi bot utama/jadibot lain
const autoOnlineIntervalMap = new Map()
const swPruneIntervalMap = new Map()

/* ─── PER-JADIBOT AUTOONLINE ─── */
export function startJadibotAutoOnline(sock, jadibotNum) {
  // Bersihkan interval lama dulu (reconnect / setting berubah)
  if (autoOnlineIntervalMap.has(jadibotNum)) {
    clearInterval(autoOnlineIntervalMap.get(jadibotNum))
    autoOnlineIntervalMap.delete(jadibotNum)
  }
  const aoSettings = getJadibotAutoOnline(jadibotNum)
  const presence = aoSettings.enabled ? 'available' : 'unavailable'
  const intervalMs = Math.max(10000, (aoSettings.intervalSeconds || 30) * 1000)
  // Kirim presence langsung saat dipanggil
  try { if (sock?.user) sock.sendPresenceUpdate(presence) } catch {}
  // Jadwalkan secara periodik
  const iv = setInterval(() => {
    try { if (sock?.user) sock.sendPresenceUpdate(presence) } catch {}
  }, intervalMs)
  autoOnlineIntervalMap.set(jadibotNum, iv)
}

export function stopJadibotAutoOnline(jadibotNum) {
  if (autoOnlineIntervalMap.has(jadibotNum)) {
    clearInterval(autoOnlineIntervalMap.get(jadibotNum))
    autoOnlineIntervalMap.delete(jadibotNum)
  }
}

/* ─── PER-JADIBOT SW PRUNE (auto tiap 6 jam) ─── */
const _SW_PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 jam

function startJadibotSwPrune(jadibotNum) {
  // Bersihkan interval lama dulu (reconnect)
  if (swPruneIntervalMap.has(jadibotNum)) {
    clearInterval(swPruneIntervalMap.get(jadibotNum))
    swPruneIntervalMap.delete(jadibotNum)
  }
  const statsPath = path.join(process.cwd(), 'data_jadibot', jadibotNum, 'ceksw', 'swstats.json')
  const iv = setInterval(() => {
    try { pruneSwStatsAt(statsPath, jadibotNum) } catch {}
  }, _SW_PRUNE_INTERVAL_MS)
  swPruneIntervalMap.set(jadibotNum, iv)
}

function stopJadibotSwPrune(jadibotNum) {
  if (swPruneIntervalMap.has(jadibotNum)) {
    clearInterval(swPruneIntervalMap.get(jadibotNum))
    swPruneIntervalMap.delete(jadibotNum)
  }
}

/* ================= UTILS ================= */
function loadConfig() {
  try {
    const p = path.join(process.cwd(), 'config.json')
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
  } catch {}
  return {}
}

function isSessionValid(sessionDir) {
  const sessionFile = sessionDir + '.json'
  return fs.existsSync(sessionFile) || fs.existsSync(path.join(sessionDir, 'creds.json'))
}

function ensureJadibotDataDir() {
  fs.mkdirSync(path.dirname(JADIBOT_DATA_PATH), { recursive: true })
}

function loadJadibotRealtimeData() {
  try {
    ensureJadibotDataDir()
    if (!fs.existsSync(JADIBOT_DATA_PATH)) return { bots: {} }
    const parsed = JSON.parse(fs.readFileSync(JADIBOT_DATA_PATH, 'utf-8'))
    if (!parsed || typeof parsed !== 'object') return { bots: {} }
    if (!parsed.bots || typeof parsed.bots !== 'object') parsed.bots = {}
    return parsed
  } catch {
    return { bots: {} }
  }
}


function saveJadibotRealtimeData(data) {
  ensureJadibotDataDir()
  const tmpPath = `${JADIBOT_DATA_PATH}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmpPath, JADIBOT_DATA_PATH)
}

function formatDurationMs(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 60000))
  if (totalMinutes % 1440 === 0) return `${totalMinutes / 1440} hari`
  if (totalMinutes % 60 === 0) return `${totalMinutes / 60} jam`
  return `${totalMinutes} menit`
}

function formatRemainingTime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'kedaluwarsa'
  const totalSeconds = Math.ceil(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (days) parts.push(`${days} hari`)
  if (hours) parts.push(`${hours} jam`)
  if (minutes) parts.push(`${minutes} menit`)
  if (seconds && !days) parts.push(`${seconds} detik`)
  if (!parts.length) parts.push(`${seconds} detik`)
  return parts.slice(0, 4).join(' ')
}

function formatJadibotExpiryTime(timestamp) {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return 'belum tercatat'
  return new Date(value).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\./g, ':') + ' WIB'
}

function clearJadibotExpiryWarningTimers(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const timers = expiryWarningTimers.get(number) || []
  for (const timer of timers) clearTimeout(timer)
  expiryWarningTimers.delete(number)
}

function msgJadibotExpiryWarning(number, remainingText, expiresAtText, durationLabel = '1 hari') {
  return (
    `╔══════════════════════╗\n` +
    `║  ⚠️  *JADIBOT HAMPIR HABIS* ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor:* +${maskNumber(number)}\n` +
    `⏳ *Sisa waktu:* ${remainingText}\n` +
    `📅 *Habis pada:* ${expiresAtText}\n\n` +
    `⚠️ Masa aktif jadibot hampir habis.\n` +
    `Bot akan otomatis berhenti dan sesi dihapus saat waktunya habis.\n\n` +
    `💡 Perpanjang dengan:\n` +
    `*.jadibot ${number} ${durationLabel}*`
  )
}

async function sendDirectJadibotNotice(sock, number, text) {
  if (!sock || !number || !text) return
  try {
    await sock.sendMessage(`${number}@s.whatsapp.net`, { text })
  } catch {}
}

function getJadibotExpirySummary(number) {
  const meta = getJadibotExpiry(number)
  if (!meta) {
    return {
      remaining: 'Tidak diketahui',
      expiresAtText: 'Tidak diketahui',
      durationText: 'Tidak diketahui',
      status: 'unknown'
    }
  }
  if (meta.permanent === true) {
    return {
      remaining: 'Permanent',
      expiresAtText: 'Permanent',
      durationText: 'Permanent',
      status: 'permanent'
    }
  }
  const remainingMs = Number(meta.expiresAt) - Date.now()
  return {
    remaining: formatRemainingTime(remainingMs),
    expiresAtText: formatJadibotExpiryTime(meta.expiresAt),
    durationText: meta.durationText || formatDurationMs(Number(meta.durationMs) || DEFAULT_JADIBOT_DURATION_MS),
    status: remainingMs <= 0 ? 'expired' : (meta.status || 'active')
  }
}

function parseJadibotDuration(input = '') {
  const clean = String(input || '').trim().toLowerCase()
  if (!clean) {
    return {
      ms: DEFAULT_JADIBOT_DURATION_MS,
      label: formatDurationMs(DEFAULT_JADIBOT_DURATION_MS),
      isDefault: true
    }
  }
  // p = singkatan permanent
  if (['permanent', 'permanen', 'perm', 'perma', 'selamanya', 'p'].includes(clean)) {
    return {
      ms: 'permanent',
      label: 'Permanent',
      permanent: true,
      isDefault: false
    }
  }
  // m=menit, j=jam, h=hari, d=hari
  const match = clean.match(/^(\d+)\s*(menit|mnt|min|minute|minutes|m|jam|hour|hours|j|hari|day|days|h|d)$/i)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isSafeInteger(value) || value <= 0) return null
  const unit = match[2].toLowerCase()
  let multiplier = 60000 // default: menit
  if (['jam', 'hour', 'hours', 'j'].includes(unit)) multiplier = 60 * 60000
  if (['hari', 'day', 'days', 'h', 'd'].includes(unit)) multiplier = 24 * 60 * 60000
  const ms = value * multiplier
  if (!Number.isSafeInteger(ms) || ms <= 0) return null
  return { ms, label: formatDurationMs(ms), isDefault: false }
}

function getJadibotExpiry(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const data = loadJadibotRealtimeData()
  return data.bots[number] || null
}

function setPermanentJadibot(number, status = 'active') {
  number = String(number || '').replace(/[^0-9]/g, '')
  if (expiryTimers.has(number)) {
    clearTimeout(expiryTimers.get(number))
    expiryTimers.delete(number)
  }
  clearJadibotExpiryWarningTimers(number)
  const now = Date.now()
  const data = loadJadibotRealtimeData()
  const existing = data.bots[number] || {}
  data.bots[number] = {
    ...existing,
    number,
    permanent: true,
    status,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    expiresAt: undefined,
    durationMs: undefined,
    durationText: 'Permanent',
    isPaused: undefined,
    pausedAt: undefined,
    pausedRemainingMs: undefined,
  }
  saveJadibotRealtimeData(data)
  return data.bots[number]
}

function ensureJadibotExpiry(number, durationMs = null, status = 'starting') {
  number = String(number || '').replace(/[^0-9]/g, '')
  const now = Date.now()
  const data = loadJadibotRealtimeData()
  const existing = data.bots[number]
  if (existing?.permanent === true) {
    existing.status = status
    existing.updatedAt = now
    data.bots[number] = existing
    saveJadibotRealtimeData(data)
    return existing
  }
  if (existing && Number(existing.expiresAt) > now) {
    existing.status = status
    existing.updatedAt = now
    data.bots[number] = existing
    saveJadibotRealtimeData(data)
    return existing
  }
  const ms = Number(durationMs) > 0 ? Number(durationMs) : DEFAULT_JADIBOT_DURATION_MS
  const meta = {
    number,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + ms,
    durationMs: ms,
    durationText: formatDurationMs(ms),
    status
  }
  data.bots[number] = meta
  saveJadibotRealtimeData(data)
  return meta
}

function extendJadibotExpiry(number, addedDurationMs, status = 'active') {
  number = String(number || '').replace(/[^0-9]/g, '')
  const addMs = Number(addedDurationMs)
  if (!number || !Number.isSafeInteger(addMs) || addMs <= 0) return null
  const now = Date.now()
  const data = loadJadibotRealtimeData()
  const existing = data.bots[number] || null
  const oldExpiresAt = existing?.permanent === true ? now : (Number(existing?.expiresAt) || 0)
  const baseExpiresAt = oldExpiresAt > now ? oldExpiresAt : now
  const oldRemainingMs = Math.max(0, baseExpiresAt - now)
  const newExpiresAt = baseExpiresAt + addMs
  const totalRemainingMs = Math.max(0, newExpiresAt - now)
  const meta = {
    ...(existing || {}),
    number,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    expiresAt: newExpiresAt,
    durationMs: totalRemainingMs,
    durationText: formatDurationMs(totalRemainingMs),
    addedDurationMs: addMs,
    addedDurationText: formatDurationMs(addMs),
    previousRemainingMs: oldRemainingMs,
    previousRemainingText: formatRemainingTime(oldRemainingMs),
    status
  }
  data.bots[number] = meta
  saveJadibotRealtimeData(data)
  return meta
}

function updateJadibotExpiryStatus(number, status) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const data = loadJadibotRealtimeData()
  if (!data.bots[number]) return null
  data.bots[number].status = status
  data.bots[number].updatedAt = Date.now()
  saveJadibotRealtimeData(data)
  return data.bots[number]
}

function persistConnectedAt(number, ts) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const data = loadJadibotRealtimeData()
  if (!data.bots[number]) return
  data.bots[number].connectedAt = ts
  saveJadibotRealtimeData(data)
}

function restoreConnectedAtMap() {
  const data = loadJadibotRealtimeData()
  for (const [number, meta] of Object.entries(data.bots || {})) {
    if (meta?.connectedAt && !jadibotConnectedAt.has(number)) {
      jadibotConnectedAt.set(number, Number(meta.connectedAt))
    }
  }
}

function removeJadibotExpiry(number) {
  number = String(number || '').replace(/[^0-9]/g, '')
  if (expiryTimers.has(number)) {
    clearTimeout(expiryTimers.get(number))
    expiryTimers.delete(number)
  }
  clearJadibotExpiryWarningTimers(number)
  const data = loadJadibotRealtimeData()
  if (data.bots[number]) {
    delete data.bots[number]
    saveJadibotRealtimeData(data)
  }
}

function isJadibotExpired(number) {
  const meta = getJadibotExpiry(number)
  if (!meta) return false
  if (meta.permanent === true) return false
  return Number(meta.expiresAt) <= Date.now()
}

function msgJadibotExpired(number) {
  return (
    `╔══════════════════════╗\n` +
    `║  ⏰  *JADIBOT EXPIRED* ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor:* +${maskNumber(number)}\n\n` +
    `❌ Masa berlaku jadibot sudah habis.\n` +
    `🗑️ Sesi dan data jadibot otomatis dihapus realtime.\n\n` +
    `💡 Ketik *.jadibot ${number} 1 hari* untuk aktifkan lagi.`
  )
}

async function expireJadibot(number, sendReply = null) {
  number = String(number || '').replace(/[^0-9]/g, '')

  // Guard: cegah double-expiry untuk nomor yang sama (race condition)
  if (expiringJadibot.has(number)) return
  expiringJadibot.add(number)
  stoppingJadibot.add(number)

  const sessionDir = path.join(process.cwd(), 'jadibot', number)
  const sock = jadibotMap.get(number)
  const expiredMsg = msgJadibotExpired(number)

  // Cek mode pairing untuk tentukan kemana notif expired dikirim
  const expiryCfg = loadConfig()
  const expiryMode = (expiryCfg.jadibotPairingMode || 'v2').toLowerCase()

  if (expiryMode === 'v2') {
    // V2: kirim notif expired ke nomor tujuan SEBELUM socket ditutup
    if (sock) {
      try {
        await sock.sendMessage(`${number}@s.whatsapp.net`, { text: expiredMsg })
      } catch {}
    }
  } else {
    // V1: kirim notif expired ke GC/owner
    if (sendReply) {
      try {
        await sendReply(expiredMsg)
      } catch {}
    }
  }

  // Langkah 3: tutup socket
  try {
    if (sock) {
      sock.ev.removeAllListeners()
      if (sock.ws) sock.ws.close()
    }
  } catch {}

  // Langkah 4: bersihkan semua Map/Set
  jadibotMap.delete(number)
  stopJadibotAutoOnline(number)
  stopJadibotSwPrune(number)
  pairingRequested.delete(number)
  reconnectingJadibot.delete(number)
  activeOrStartingJadibot.delete(number)
  if (pairingTimeout.has(number)) {
    clearTimeout(pairingTimeout.get(number))
    pairingTimeout.delete(number)
  }
  if (typeof global.autoStartedJadibot !== 'undefined') {
    global.autoStartedJadibot.delete(number)
  }

  // Langkah 5: hapus data expiry dari JSON
  removeJadibotExpiry(number)

  // Langkah 6: hapus folder sesi + file json (delay 500ms beri waktu socket close)
  setTimeout(() => {
    try {
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
    } catch {}
    try {
      const _sf = sessionDir + '.json'
      if (fs.existsSync(_sf)) fs.unlinkSync(_sf)
    } catch {}
  }, 500)

  // Langkah 7: lepas guard setelah selesai
  setTimeout(() => {
    stoppingJadibot.delete(number)
    expiringJadibot.delete(number)
  }, 2000)

  console.log(`[JADIBOT] ⏰ ${number} expired → notif terkirim → sesi dihapus realtime`)
}

async function cleanupExpiredJadibots(sendReply = null) {
  const expired = []
  const data = loadJadibotRealtimeData()
  const now = Date.now()
  const numbers = new Set([
    ...jadibotMap.keys(),
    ...Object.keys(data.bots || {})
  ])
  for (const number of numbers) {
    const meta = data.bots?.[number]
    if (meta && Number(meta.expiresAt) <= now) {
      expired.push(number)
      await expireJadibot(number, sendReply)
    }
  }
  return expired
}

function scheduleJadibotExpiry(number, sendReply = null) {
  number = String(number || '').replace(/[^0-9]/g, '')
  const meta = getJadibotExpiry(number)
  if (!meta) return
  if (meta.permanent === true) return
  if (expiryTimers.has(number)) {
    clearTimeout(expiryTimers.get(number))
    expiryTimers.delete(number)
  }
  clearJadibotExpiryWarningTimers(number)
  const remaining = Number(meta.expiresAt) - Date.now()
  if (remaining <= 0) {
    expireJadibot(number, sendReply)
    return
  }
  const warningTimers = []
  for (const threshold of JADIBOT_EXPIRY_WARNING_THRESHOLDS) {
    const delayMs = remaining - threshold.ms
    if (delayMs <= 0 || delayMs > MAX_TIMER_MS) continue
    const warningTimer = setTimeout(async () => {
      const latest = getJadibotExpiry(number)
      if (!latest) return
      const latestRemaining = Number(latest.expiresAt) - Date.now()
      if (latestRemaining <= 0 || latestRemaining > threshold.ms + 15000) return
      const durationLabel = latest.durationText || formatDurationMs(Number(latest.durationMs) || DEFAULT_JADIBOT_DURATION_MS)
      const warningText = msgJadibotExpiryWarning(
        number,
        formatRemainingTime(latestRemaining),
        formatJadibotExpiryTime(latest.expiresAt),
        durationLabel
      )
      const warningCfg = loadConfig()
      const warningMode = (warningCfg.jadibotPairingMode || 'v2').toLowerCase()
      if (warningMode === 'v2') {
        // V2: kirim warning ke nomor tujuan (via sock jadibot itu sendiri)
        await sendDirectJadibotNotice(jadibotMap.get(number), number, warningText)
      } else {
        // V1: kirim warning ke GC/owner
        if (sendReply) {
          try { await sendReply(warningText) } catch {}
        }
      }
    }, delayMs)
    warningTimers.push(warningTimer)
  }
  if (warningTimers.length) expiryWarningTimers.set(number, warningTimers)
  const timer = setTimeout(() => {
    if (isJadibotExpired(number)) {
      expireJadibot(number, sendReply)
    } else {
      scheduleJadibotExpiry(number, sendReply)
    }
  }, Math.min(remaining, MAX_TIMER_MS))
  expiryTimers.set(number, timer)
}

function purgeExpiredJadibotSessions() {
  const data = loadJadibotRealtimeData()
  const now = Date.now()
  const expired = []
  for (const [number, meta] of Object.entries(data.bots)) {
    if (meta?.permanent === true) continue
    if (Number(meta?.expiresAt) <= now) expired.push(number)
  }
  for (const number of expired) {
    const sessionDir = path.join(process.cwd(), 'jadibot', number)
    try {
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
    } catch {}
    try {
      const _sf = sessionDir + '.json'
      if (fs.existsSync(_sf)) fs.unlinkSync(_sf)
    } catch {}
    delete data.bots[number]
    if (typeof global.autoStartedJadibot !== 'undefined') {
      global.autoStartedJadibot.delete(number)
    }
  }
  saveJadibotRealtimeData(data)
  return expired
}

function formatPairingCode(code) {
  // Format: XXXX-XXXX supaya lebih mudah dibaca
  const clean = String(code).replace(/[^A-Z0-9]/gi, '').toUpperCase()
  if (clean.length === 8) return clean.slice(0, 4) + '-' + clean.slice(4)
  return code
}

/* ================= SW HANDLER JADIBOT ================= */
function getJadibotSwSet(number) {
  if (!jadibotSwSets.has(number)) jadibotSwSets.set(number, new Set())
  return jadibotSwSets.get(number)
}

function getJadibotTracker(number) {
  if (!jadibotTrackers.has(number)) {
    const userDir = path.join(process.cwd(), 'data_jadibot', number, 'swtrack', 'users')
    jadibotTrackers.set(number, createSwTracker(userDir))
  }
  return jadibotTrackers.get(number)
}

const _JADIBOT_LOG_COLORS = [
  '\x1b[36m',                   // cyan
  '\x1b[35m',                   // magenta
  '\x1b[33m',                   // yellow
  '\x1b[32m',                   // green
  '\x1b[34m',                   // blue
  '\x1b[31m',                   // red
  '\x1b[38;2;255;165;0m',       // orange
  '\x1b[38;2;180;120;255m',     // purple
  '\x1b[38;2;0;200;200m',       // teal
  '\x1b[38;2;255;105;180m',     // pink
  '\x1b[38;2;100;200;100m',     // lime
  '\x1b[38;2;255;200;0m',       // gold
]

function getJadibotLogColor(number) {
  const digits = String(number).replace(/[^0-9]/g, '')
  const idx = digits ? (parseInt(digits.slice(-3), 10) % _JADIBOT_LOG_COLORS.length) : 0
  return _JADIBOT_LOG_COLORS[idx]
}

function getSwGreeting() {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }))
  if (h >= 5 && h < 11) return 'Pagi 🌆'
  if (h >= 11 && h < 15) return 'Siang 🏙️'
  if (h >= 15 && h < 18) return 'Sore 🌇'
  return 'Malam 🌃'
}

async function handleJadibotSW(msg, sock, swSet, number) {
  try {
    if (!msg.message) return
    // fromMe=true diblokir untuk status@broadcast, tapi diizinkan untuk group status
    // agar jadibot bisa react ke story gc yang dipost oleh jadibot itu sendiri

    const remoteJid = msg.key?.remoteJid
    const isStatusBroadcast = remoteJid === 'status@broadcast'
    const _gsPayload = msg.message?.groupStatusMessageV2 || msg.message?.groupStatusMentionMessage || msg.message?.groupMentionedMessage
        || (msg.message && (() => { try { const vals = Object.values(msg.message); for (const v of vals) { if (v?.contextInfo?.isGroupStatus) return v; } } catch {} return null; })())
    const isGroupStatus = !isStatusBroadcast && isJidGroup(remoteJid) && !!_gsPayload

    // Blokir fromMe untuk status@broadcast saja, bukan group status
    if (msg.key?.fromMe && !isGroupStatus) return
    if (!isStatusBroadcast && !isGroupStatus) return

    // Skip reactionMessage & protocolMessage DULU — bukan story asli, hanya reaksi/sistem
    const msgType = getContentType(msg.message)
    if (!msgType || msgType === 'reactionMessage' || msgType === 'protocolMessage') return

    const storyConfig = getJadibotReadsw(number)
    if (storyConfig.enabled === false) return

    const msgId = msg.key?.id
    if (!msgId || swSet.has(msgId)) return
    swSet.add(msgId)

    // Tracker terisolasi per-jadibot → data/swtrack/jadibot/<number>/users/
    const tracker = getJadibotTracker(number)

    const _perUserEmojis = getJadibotEmojis(number)
    const reactStatus = _perUserEmojis || []
    let usedReaction = reactStatus.length ? (getJadibotRandomEmoji(number) || '❌') : '❌'

    const useRandomDelay = storyConfig.randomDelay !== false
    const delayMinMs = storyConfig.delayMinMs || 1000
    const delayMaxMs = storyConfig.delayMaxMs || 20000
    const fixedDelayMs = storyConfig.fixedDelayMs || 3000
    const delayMs = useRandomDelay
      ? Math.floor(Math.random() * (delayMaxMs - delayMinMs)) + delayMinMs
      : fixedDelayMs

    // ── Resolusi sender ──
    const rawParticipant = msg.key?.participant || msg.participant || msg.sender
    const senderPn = rawParticipant && !String(rawParticipant).endsWith('@lid') ? rawParticipant : null
    let senderLid = rawParticipant && String(rawParticipant).endsWith('@lid') ? rawParticipant : null
    if (!senderLid && msg.key?.participantAlt && String(msg.key.participantAlt).endsWith('@lid')) {
      senderLid = msg.key.participantAlt
    }

    let resolveMethod = null
    let resolvedPn = senderPn
    if (resolvedPn) resolveMethod = 'PN langsung ✓'

    // Coba resolve LID via Signal Lib
    if (!resolvedPn && senderLid && sock?.signalRepository?.lidMapping?.getPNForLID) {
      try {
        const r = await sock.signalRepository.lidMapping.getPNForLID(senderLid)
        if (r && !String(r).endsWith('@lid')) {
          resolvedPn = jidNormalizedUser(r)
          resolveMethod = 'Signal Lib ✓'
        }
      } catch (_) {}
    }

    // Fallback: cache LID->PN dari group metadata (shared dengan bot utama)
    if (!resolvedPn && senderLid && typeof global.__lookupLidPn === 'function') {
      try {
        const r = global.__lookupLidPn(senderLid)
        if (r && !String(r).endsWith('@lid')) {
          resolvedPn = jidNormalizedUser(r)
          resolveMethod = 'Cache Grup ✓'
        }
      } catch (_) {}
    }

    if (!resolvedPn && senderLid) resolveMethod = 'LID belum ke-resolve ❌'
    if (!resolvedPn && !senderLid && rawParticipant) resolveMethod = 'Tanpa LID ⚠️'

    // Fallback: kalau fromMe=true (jadibot sendiri yang post story gc), gunakan ID jadibot sebagai sender
    if (!resolvedPn && !senderLid && !rawParticipant && msg.key?.fromMe && isGroupStatus) {
      resolvedPn = jidNormalizedUser(sock.user?.id || `${number}@s.whatsapp.net`)
      resolveMethod = 'Self Story ✓'
    }

    const senderJid = resolvedPn || senderLid || rawParticipant
    const hasSender = !!senderJid
    const senderJidNorm = resolvedPn || (senderPn ? jidNormalizedUser(senderPn) : null)

    // Skip story milik jadibot sendiri di status@broadcast — group status boleh dilanjut
    const botNum = String(number).replace(/[^0-9]/g, '')
    const senderNum = (resolvedPn || senderPn || '')
      .split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
    if (!isGroupStatus && botNum && senderNum && botNum === senderNum) {
      swSet.delete(msgId)
      return
    }

    const shouldReact = storyConfig.autoReaction !== false && reactStatus.length && hasSender

    // ── SwTrack: tulis entry awal ke folder jadibot ──
    const trackNumber = resolvedPn
      ? extractSwNumber(resolvedPn)
      : (senderPn ? extractSwNumber(senderPn) : null)

    if (trackNumber) {
      if (tracker.isSwUserTracked(trackNumber, msgId)) {
        swSet.delete(msgId)
        return
      }
      tracker.markSwUserEntry(trackNumber, msgId, {
        id: msgId,
        sender: resolvedPn || senderPn || rawParticipant || '',
        name: msg.pushName || '',
        type: getContentType(msg.message) || 'unknown',
        arrivedAt: new Date().toISOString(),
        read: false,
        reacted: false,
        emoji: null,
        resolve: resolveMethod,
        source: isGroupStatus ? 'group' : 'status',
        number: trackNumber,
        resolvedPn: resolvedPn || null,
        messageKey: msg.key || null,
      })
    }

    await new Promise(r => setTimeout(r, delayMs))

    // Cek apakah story dihapus pengirim selama delay berlangsung
    if (trackNumber && tracker.isSwUserDeleted(trackNumber, msgId)) {
      swSet.delete(msgId)
      return
    }

    const isConnClosed = (err) => {
      const s = err?.message || String(err)
      return s.includes('Connection Closed') || s.includes('Connection closed') || s.includes('EPIPE') || s.includes('Socket closed')
    }

    // ── Read receipt ──
    let readOk = false
    if (isStatusBroadcast) {
      const buildKey = (participant) => ({
        ...msg.key,
        remoteJid: 'status@broadcast',
        ...(participant && { participant }),
        fromMe: false,
      })
      const receiptKeys = []
      const seenParts = new Set()
      const pushKey = (p) => {
        if (!p) return
        const norm = jidNormalizedUser(p)
        if (seenParts.has(norm)) return
        seenParts.add(norm)
        receiptKeys.push(buildKey(norm))
      }
      pushKey(rawParticipant)
      pushKey(senderLid)
      pushKey(resolvedPn)

      if (trackNumber) {
        tracker.updateSwUserEntry(trackNumber, msgId, { receiptKeys, resolvedPn: resolvedPn || null, messageKey: msg.key })

        // ── Auto-retry SW sebelumnya yang terlewat (belum dibaca/direact) ──
        const missed = tracker.getMissedSwEntries(trackNumber, msgId)
          .filter(e => !swSet.has(e.id)) // skip yang masih on-progress
        if (missed.length > 0) {
          const _rDays = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
          const _rMons = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
          for (const miss of missed) {
            try {
              const mk = miss.receiptKeys || []
              if (mk.length > 0 && !miss.read) {
                await Promise.all(mk.map(k => sock.sendReceipts([k], 'read').catch(() => {})))
              }
              const mp = miss.resolvedPn
              let retryEmoji = null
              if (!miss.reacted && mp && miss.messageKey) {
                retryEmoji = getJadibotRandomEmoji(number) || '❤️'
                await sock.sendMessage(
                  'status@broadcast',
                  { react: { key: miss.messageKey, text: retryEmoji } },
                  { statusJidList: [jidNormalizedUser(sock.user.id), jidNormalizedUser(mp)] }
                ).catch(() => { retryEmoji = null })
                tracker.updateSwUserEntry(trackNumber, miss.id, { read: true, reacted: true, emoji: retryEmoji, retriedAt: new Date().toISOString() })
              } else if (mk.length > 0) {
                tracker.updateSwUserEntry(trackNumber, miss.id, { read: true, retriedAt: new Date().toISOString() })
              }
              // ── Log retry per-entry (sama format bot utama, tapi ada nama jadibot) ──
              const missJkt = new Date(new Date(miss.arrivedAt || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
              logStoryView({
                botId: maskNumber(number),
                mediaType: getMediaTypeEmoji(miss.type || 'extendedTextMessage'),
                greeting: getSwGreeting(),
                dayName: _rDays[missJkt.getDay()] + ' 🔁',
                date: `${missJkt.getDate()} ${_rMons[missJkt.getMonth()]} ${missJkt.getFullYear()}`,
                time: missJkt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.'),
                name: miss.name || trackNumber,
                number: maskNumber(miss.number || trackNumber),
                storyCount: getStoryCountToday(miss.number || trackNumber, path.join(process.cwd(), 'data_jadibot', number, 'swtrack', 'users')),
                success: 'Retry ♻️',
                reaction: retryEmoji || (miss.reacted ? miss.emoji || '✓' : 'Off ❌'),
                resolve: (miss.resolve || 'PN ✓') + ' ♻️',
                delaySeconds: null,
                mode: 'Read+Reaction ✓',
                emojiMode: getJadibotEmojiMode(number),
              })
            } catch {}
          }
        }
      }

      await Promise.all(
        receiptKeys.map(k =>
          sock.sendReceipts([k], 'read').catch(err => {
            if (!isConnClosed(err)) console.error('\x1b[31m[Jadibot AutoRead] read failed:\x1b[39m', err?.message || String(err))
          })
        )
      )
      readOk = true
    } else {
      // Group status — read + view receipt agar counter "dilihat" naik
      await Promise.all([
        sock.readMessages([msg.key]).catch(err => {
          if (!isConnClosed(err)) console.error('\x1b[31m[Jadibot GS Read]\x1b[39m', err?.message || String(err))
        }),
        sock.sendReceipts([msg.key], 'read').catch(() => {}),
      ])
      readOk = true
    }

    // ── Reaction ──
    if (isStatusBroadcast && shouldReact && resolvedPn) {
      await sock.sendMessage(
        'status@broadcast',
        { react: { key: msg.key, text: usedReaction } },
        { statusJidList: [jidNormalizedUser(sock.user.id), jidNormalizedUser(resolvedPn)] }
      ).catch(err => {
        if (!isConnClosed(err)) console.error('\x1b[31m[Jadibot Reaction]\x1b[39m', err?.message || String(err))
        usedReaction = '❌ Gagal'
      })
    } else if (isGroupStatus && shouldReact) {
      // Dua jalur reaksi:
      // fromMe=true  → react ke group JID (story sendiri = group message, WA izinkan react ke pesan sendiri)
      // fromMe=false → react ke status@broadcast + statusJidList (linked status dari orang lain)
      if (msg.key?.fromMe) {
        // Story gc milik jadibot sendiri — react ke group JID
        const gsSelfKey = { ...msg.key }
        await sock.sendMessage(
          remoteJid,
          { react: { key: gsSelfKey, text: usedReaction } }
        ).catch(err => {
          if (!isConnClosed(err)) console.error('\x1b[31m[Jadibot GS Self-Reaction]\x1b[39m', err?.message || String(err))
          usedReaction = '❌ Gagal'
        })
      } else {
        // Story gc orang lain — react via status@broadcast + statusJidList
        const gsStatusKey = {
          remoteJid: 'status@broadcast',
          fromMe: false,
          id: msg.key?.id,
          participant: senderJidNorm || undefined,
        }
        const gsStatusJidList = [jidNormalizedUser(sock.user.id), ...(senderJidNorm ? [senderJidNorm] : [])]
        await sock.sendMessage(
          'status@broadcast',
          { react: { key: gsStatusKey, text: usedReaction } },
          { statusJidList: gsStatusJidList }
        ).catch(err => {
          if (!isConnClosed(err)) console.error('\x1b[31m[Jadibot GS Reaction]\x1b[39m', err?.message || String(err))
          usedReaction = '❌ Gagal'
        })
      }
    } else if (shouldReact && !resolvedPn && isStatusBroadcast) {
      usedReaction = '⏭️ Skip (LID belum resolve)'
    }

    const reactionSuccess = shouldReact && usedReaction !== '❌ Gagal' && usedReaction !== '⏭️ Skip (LID belum resolve)'

    // ── SwStats + SwTrack update ──
    const from = jidNormalizedUser(senderJid || remoteJid)
    const storyNumber = jidDecode(from)?.user || ''
    // Untuk fromMe=true (story jadibot sendiri di GC), pakai nama jadibot dari sock.user.name
    const storyName = msg.pushName || (msg.key?.fromMe ? (sock.user?.name || '') : '') || storyNumber

    // Tulis ke path jadibot sendiri: data_jadibot/<number>/ceksw/swstats.json
    const jadibotStatsPath = path.join(process.cwd(), 'data_jadibot', number, 'ceksw', 'swstats.json')
    updateSwStatsAt(jadibotStatsPath, storyNumber, storyName, reactionSuccess, reactionSuccess ? usedReaction : null, msgId)

    if (trackNumber) {
      tracker.updateSwUserEntry(trackNumber, msgId, {
        name: storyName,
        number: storyNumber,
        resolve: resolveMethod,
        read: readOk,
        reacted: reactionSuccess,
        emoji: reactionSuccess ? usedReaction : null,
        processedAt: new Date().toISOString(),
      })
    }

    // msgId TIDAK dihapus dari swSet — cegah spam kalau WA re-deliver story yang sama

    // ── Console log ──
    const botId = sock.user?.id?.split(':')[0] || ''
    const debounceKey = `jb:${botId}:${from}`
    if (!storyDebounce.has(debounceKey)) {
      storyDebounce.set(debounceKey, { time: Date.now(), count: 1 })

      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const jakartaDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))

      const innerType = isGroupStatus
        ? (() => { const inner = _gsPayload?.message; return inner ? Object.keys(inner).find(k => k !== 'messageContextInfo') : null })()
        : getContentType(msg.message)

      const _jbBaseType = getMediaTypeEmoji(innerType);
      const _jbMediaType = isGroupStatus ? [_jbBaseType[0] + ' GC', _jbBaseType[1]] : _jbBaseType;
      logStoryView({
        botId: sock.user?.name || maskNumber(botId),
        mediaType: _jbMediaType,
        idStory: msg.key?.id || null,
        greeting: getSwGreeting(),
        dayName: dayNames[jakartaDate.getDay()],
        date: `${jakartaDate.getDate()} ${monthNames[jakartaDate.getMonth()]} ${jakartaDate.getFullYear()}`,
        time: jakartaDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.'),
        name: storyName,
        number: maskNumber(storyNumber),
        storyCount: getStoryCountToday(storyNumber, path.join(process.cwd(), 'data_jadibot', number, 'swtrack', 'users')),
        success: reactionSuccess ? 'Iya ✓' : (readOk ? 'Baca ✓' : 'Gagal ❌'),
        reaction: shouldReact ? usedReaction : 'Off ❌',
        resolve: resolveMethod,
        delaySeconds: (delayMs / 1000).toFixed(1),
        mode: shouldReact ? `Read+Reaction ✓${isGroupStatus ? ' [Grup]' : ''}` : 'Read Only 👁️',
        emojiMode: getJadibotEmojiMode(number),
      })

      setTimeout(() => {
        const d = storyDebounce.get(debounceKey)
        if (d && d.count > 1) console.log(`\x1b[33m   └─ +${d.count - 1} story lainnya dari ${storyName}\x1b[39m`)
        storyDebounce.delete(debounceKey)
      }, 3000)
    } else {
      const d = storyDebounce.get(debounceKey)
      if (d) { d.count++; storyDebounce.set(debounceKey, d) }
    }

  } catch (err) {
    console.error('\x1b[31m[Jadibot SW Error]\x1b[39m', err?.message || String(err))
  }
}

/* ================= PESAN RAPIH ================= */
function msgPairingCode(code, number) {
  const formatted = formatPairingCode(code)
  const masked = maskNumber(number)
  return (
    `╔══════════════════════╗\n` +
    `║   🤖  *J A D I B O T*   ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor:* ${masked}\n\n` +
    `🔑 *Kode Pairing:*\n` +
    `┌─────────────────┐\n` +
    `│   *${formatted}*   │\n` +
    `└─────────────────┘\n\n` +
    `📋 *Cara Memasukkan Kode:*\n` +
    `1️⃣ Buka WhatsApp di HP kamu\n` +
    `2️⃣ Ketuk ⋮ (titik tiga) → *Perangkat Tertaut*\n` +
    `3️⃣ Ketuk *Tautkan Perangkat*\n` +
    `4️⃣ Pilih *Tautkan dengan nomor telepon*\n` +
    `5️⃣ Masukkan kode di atas\n\n` +
    `⏳ *Batas waktu: 3 menit*\n` +
    `⚠️ Jika gagal, ketik *.jadibot* ulang`
  )
}

function msgCopyCode(code, number) {
  const formatted = formatPairingCode(code)
  const masked = maskNumber(number)
  return {
    interactiveMessage: {
      title:
        `╔══════════════════════╗\n` +
        `║   🤖  *J A D I B O T*   ║\n` +
        `╚══════════════════════╝\n\n` +
        `📱 *Nomor:* ${masked}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Cara Memasukkan Kode:*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `1️⃣ Buka *WhatsApp* di HP kamu\n` +
        `2️⃣ Ketuk ⋮ → *Perangkat Tertaut*\n` +
        `3️⃣ Ketuk *Tautkan Perangkat*\n` +
        `4️⃣ Pilih *Tautkan dengan nomor telepon*\n` +
        `5️⃣ Masukkan kode pairing di atas\n\n` +
        `⏳ Kode berlaku *3 menit*\n` +
        `⚠️ Gagal? Ketik *.jadibot* lagi`,
      footer: `📲 Tap tombol untuk salin kode · +${number}`,
      buttons: [
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: '📋 Salin Kode Pairing',
            copy_code: formatted
          })
        }
      ]
    }
  }
}

function msgPairingExpired(number) {
  const masked = maskNumber(number)
  return (
    `╔══════════════════════╗\n` +
    `║   ⏰  *WAKTU HABIS*   ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor:* ${masked}\n\n` +
    `❌ Kode pairing sudah *kedaluwarsa*\n` +
    `karena tidak digunakan dalam *3 menit*.\n\n` +
    `🔄 Sesi otomatis dihapus.\n` +
    `💡 Ketik *.jadibot ${number}* untuk coba lagi.`
  )
}

function msgConnected(number) {
  const masked = maskNumber(number)
  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const config = loadConfig()
  const story = config.autoReadStory || {}
  const storyOn = story.enabled !== false
  const reactOn = storyOn && story.autoReaction !== false
  const expiry = getJadibotExpiry(number)
  const expiryLine = expiry
    ? `⏳ *Masa Berlaku:* ${formatRemainingTime(Number(expiry.expiresAt) - Date.now())}\n`
    : ''

  let swStatus
  if (!storyOn) {
    swStatus = `❌ *AutoRead SW:* Nonaktif`
  } else if (reactOn) {
    swStatus = `✅ *AutoRead SW:* Aktif — Mode *Read + Reaction* 🎉`
  } else {
    swStatus = `✅ *AutoRead SW:* Aktif — Mode *Read Only* 👁️`
  }

  return (
    `╔══════════════════════╗\n` +
    `║  ✅  *JADIBOT AKTIF*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor:* ${masked}\n` +
    `🕐 *Waktu:* ${now} WIB\n\n` +
    expiryLine +
    `🎉 Jadibot berhasil terhubung!\n` +
    `Bot sudah siap menerima perintah.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Status Fitur Otomatis:*\n` +
    `${swStatus}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🛠️ *Fitur Jadibot:*\n` +
    `• 👁️ Auto baca & reaction story/SW kontak\n` +
    `• 🔕 Anti-delete pesan (jika aktif)\n` +
    `• 🤖 Semua command bot bisa diakses\n` +
    `   _(hanya oleh owner via bot utama)_\n\n` +
    `📌 *Kontrol Jadibot (dari bot utama):*\n` +
    `• *.menu* — Lihat semua fitur\n` +
    `• *.readsw* — Kelola AutoRead SW\n` +
    `• *.stopbot ${number}* — Matikan jadibot\n` +
    `• *.listbot* — Daftar jadibot aktif\n\n` +
    `_Powered by Wily Bot V25_ 🤖`
  )
}

function msgDirectWelcome(number) {
  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  const expiry = getJadibotExpiry(number)
  let expiryLine = ''
  if (expiry?.permanent === true) {
    expiryLine = `♾️ *Masa berlaku:* Permanent\n`
  } else if (expiry?.expiresAt) {
    const remaining = Number(expiry.expiresAt) - Date.now()
    if (remaining > 0) {
      expiryLine = `⏳ *Aktif selama:* ${formatRemainingTime(remaining)}\n`
    }
  }
  return (
    `╔══════════════════════╗\n` +
    `║  🤖  *J A D I B O T*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `🎉 *Nomor kamu sudah aktif sebagai Jadibot!*\n\n` +
    `📱 *Nomor:* +${number}\n` +
    `🕐 *Aktif:* ${now} WIB\n` +
    expiryLine +
    `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🛠️ *Fitur yang aktif di nomormu:*\n` +
    `• 👁️ Auto baca & reaction status/SW\n` +
    `• 🔕 Anti-delete pesan\n` +
    `• 🤖 Semua fitur bot tersedia\n\n` +
    `📌 *Command tersedia (kirim ke bot utama):*\n` +
    `• *.p* / *.ping* — Cek bot aktif\n` +
    `• *.menu* — Daftar semua fitur\n` +
    `• *.readsw* — Kelola auto baca status\n` +
    `• *.antidel* — Anti hapus pesan\n` +
    `• *.sticker* — Buat stiker\n` +
    `• *.stopbot ${number}* — Matikan jadibot\n\n` +
    `⚠️ _Jangan logout dari Perangkat Tertaut_\n` +
    `_agar jadibot tetap aktif._\n\n` +
    `_Powered by Wily Bot V25_ 🤖`
  )
}

function msgLoggedOut(number, remainingList) {
  const masked = maskNumber(number)
  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  let listPart
  if (remainingList.length === 0) {
    listPart = `❌ Tidak ada jadibot aktif saat ini.`
  } else {
    const items = remainingList.map((v, i) => `│ ${i + 1}. +${v}`).join('\n')
    listPart = (
      `📊 *Jadibot Masih Aktif (${remainingList.length}):*\n` +
      `┌─────────────────────\n` +
      `${items}\n` +
      `└─────────────────────`
    )
  }

  return (
    `╔══════════════════════╗\n` +
    `║  ⚠️  *JADIBOT LOGOUT*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor:* ${masked}\n` +
    `🕐 *Waktu:* ${now} WIB\n\n` +
    `🚨 Jadibot ini telah *di-logout* dari\n` +
    `WhatsApp (Perangkat Tertaut dihapus).\n\n` +
    `🗑️ Sesi otomatis dihapus.\n\n` +
    `${listPart}\n\n` +
    `💡 Ketik *.jadibot ${number}* untuk\n` +
    `menghubungkan kembali.`
  )
}

function msgLoggedOutDirect(number) {
  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  return (
    `╔══════════════════════╗\n` +
    `║  ⚠️  *JADIBOT LOGOUT*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `📱 *Nomor kamu:* +${number}\n` +
    `🕐 *Waktu:* ${now} WIB\n\n` +
    `🚨 *Jadibot kamu telah logout!*\n` +
    `Nomor kamu dihapus dari Perangkat Tertaut\n` +
    `atau melakukan logout dari sisi WhatsApp.\n\n` +
    `🗑️ Sesi jadibot otomatis dihapus.\n\n` +
    `💡 Hubungi owner untuk aktifkan kembali.`
  )
}

/* ================= START JADIBOT ================= */
async function startJadibot(number, sendReply, mainBotNumber, editMsg = null, sendPairingMsg = null, durationMs = undefined, mainBotSock = null, reactFn = null, requesterNumber = null) {
  number = number.replace(/[^0-9]/g, '')
  const hasRequestedDuration = durationMs !== undefined && durationMs !== null

  if (hasRequestedDuration) {
    removeJadibotExpiry(number)
  } else if (isJadibotExpired(number)) {
    await expireJadibot(number, sendReply)
    return
  }

  if (activeOrStartingJadibot.has(number)) {
    if (jadibotMap.has(number)) {
      console.log(`\x1b[33m[JADIBOT]\x1b[0m ⚠️ ${number} sudah aktif/dalam proses start, skip duplikat`)
      return
    }
    // Nomor sedang dalam proses pairing tapi belum terhubung → tutup socket lama & reset state
    console.log(`\x1b[33m[JADIBOT]\x1b[0m 🔁 ${number} pairing stuck → tutup socket lama & coba ulang`)
    const oldSock = startingSocketMap.get(number)
    if (oldSock) {
      try {
        oldSock.ev.removeAllListeners()
        if (oldSock.ws) oldSock.ws.close()
      } catch {}
      startingSocketMap.delete(number)
    }
    activeOrStartingJadibot.delete(number)
    pairingRequested.delete(number)
    if (pairingTimeout.has(number)) {
      clearTimeout(pairingTimeout.get(number))
      pairingTimeout.delete(number)
    }
    // Tunggu sebentar agar socket lama selesai sebelum buat yang baru
    await delay(800)
  }
  activeOrStartingJadibot.add(number)
  if (!hasRequestedDuration && getJadibotExpiry(number)) {
    updateJadibotExpiryStatus(number, 'starting')
    scheduleJadibotExpiry(number, sendReply)
  }

  if (typeof global.autoStartedJadibot !== 'undefined') {
    global.autoStartedJadibot.add(number)
  }

  const sessionDir = path.join(process.cwd(), 'jadibot', number)
  const sessionFile = sessionDir + '.json'

  const { state, saveCreds, contacts: jbContacts, groups: jbGroups, settings: jbSettings, clearCacheInPlace: jbClearCache, getSizeReport: jbSizeReport } = await useSingleFileAuthState(sessionFile)
  if (jbClearCache)   jadibotClearSesiMap.set(number, jbClearCache)
  if (jbSizeReport)   jadibotSesiReportMap.set(number, jbSizeReport)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: state.keys,
    },
    logger: silentLogger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '136.0.7103.93'],
    keepAliveIntervalMs: 30000,
    syncFullHistory: true,
  })

  sock.isMainBot = false
  sock.mainBotNumber = global.__mainBotNumber || mainBotNumber || ''
  sock.jadibotUserNumber = requesterNumber || null

  injectClient(
    sock,
    new Map(),
    jbContacts,
    jbGroups,
    jbSettings
  )

  sock.loadedCommands = [
    'p', 'ping', 'menu',
    'rvo', 'viewonce', 'vo',
    'antidel', 'ad',
    'readsw',
    'anticall', 'ac',
    'anticallvid', 'acv',
    'autocallaudio', 'aca',
    'online',
    'typing', 'typ',
    'recording', 'record',
    'tt', 'ig', 'fb', 'ytmp3', 'ytmp4', 'play',
    'allunduh', 'twdl',
    'sticker', 's',
    'wm', 'swm',
    'toimg', 'hd',
    'upswgc', 'swgc', 'swgrup', 'swgroup', 'statusgrup', 'statusgroup',
    'upswgcv2', 'swgcv2', 'swgrupv2', 'swgroupv2', 'statusgrupv2', 'statusgroupv2',
    'readchat',
    'ceksw',
    'ceksetting',
    'emoji', 'emojiadd', 'emojidel', 'emojilist',
    'emojidefault', 'emojicustom', 'emojiclear',
    'ceksesi', 'clearsesi', 'cs',
    'del', 'd',
    'font', 'fontgen', 'fontuntik',
    'logo'
  ]

  sock.ev.on('creds.update', async (...args) => {
    try { await saveCreds(...args) } catch {}
  })

  // Daftarkan socket ke startingSocketMap selama belum connected
  startingSocketMap.set(number, sock)

  /* ================= CONNECTION ================= */
  let pairingMsgKey = null
  let aborted = false
  let hasConnectedOnce = false

  function cleanupSocket() {
    aborted = true
    try {
      sock.ev.removeAllListeners()
      if (sock.ws) sock.ws.close()
    } catch {}
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    const reason = lastDisconnect?.error?.output?.statusCode

    /* ===== PAIRING CODE — TIMEOUT 3 MENIT ===== */
    if (
      connection === 'connecting' &&
      !state.creds?.registered &&
      !pairingRequested.has(number)
    ) {
      pairingRequested.add(number)

      // Kirim kode pairing setelah koneksi stabil (dengan retry)
      setTimeout(async () => {
        await delay(1000) // tunggu socket stabil
        let retries = 3
        while (retries > 0) {
          if (aborted) break
          try {
            const cfg = loadConfig()
            const customCode = cfg.pairingCode && String(cfg.pairingCode).trim() ? String(cfg.pairingCode).trim().toUpperCase() : undefined
            const code = await sock.requestPairingCode(number, customCode)
            if (aborted) break

            // Cek mode pairing dari config
            const pairingMode = (cfg.jadibotPairingMode || 'v2').toLowerCase()
            // v1 = kirim pairing code ke GC/owner chat
            // v2 = kirim pairing code langsung ke nomor tujuan (private)

            let directPairingSent = false

            const _pairSock = getActiveMainSock(mainBotSock)
            if (pairingMode === 'v2' && _pairSock) {
              // ── V2: Kirim kode langsung ke nomor tujuan ──
              try {
                const fmt = formatPairingCode(code)

                // Resolve JID yang benar dulu (support LID/linked device)
                let targetJid = `${number}@s.whatsapp.net`
                try {
                  const [waResult] = await _pairSock.onWhatsApp(`${number}@s.whatsapp.net`)
                  if (waResult?.exists && waResult?.jid) {
                    targetJid = waResult.jid
                  }
                } catch (_) {}

                const pairingText =
                  `╔══════════════════════╗\n` +
                  `║   🤖  *J A D I B O T*  ║\n` +
                  `╚══════════════════════╝\n\n` +
                  `🔑 *Kode Pairing untuk nomormu:*\n\n` +
                  `┌─────────────────┐\n` +
                  `│   *${fmt}*   │\n` +
                  `└─────────────────┘\n\n` +
                  `📋 *Cara memasukkan kode:*\n` +
                  `1️⃣ Buka WhatsApp di HP kamu\n` +
                  `2️⃣ Ketuk ⋮ → *Perangkat Tertaut*\n` +
                  `3️⃣ Ketuk *Tautkan Perangkat*\n` +
                  `4️⃣ Pilih *Tautkan dengan nomor telepon*\n` +
                  `5️⃣ Masukkan kode di atas\n\n` +
                  `⏳ *Kode berlaku 3 menit*\n\n` +
                  `\`\`\`${fmt}\`\`\``

                await _pairSock.sendMessage(targetJid, { text: pairingText })
                directPairingSent = true
                console.log(`[JADIBOT][V2] ✅ Pairing code terkirim realtime ke +${number} (jid: ${targetJid})`)

                // Notif singkat ke owner bahwa kode sudah dikirim ke nomor tujuan
                try {
                  const sentInfo = await sendReply(
                    `╔══════════════════════╗\n` +
                    `║   🤖  *J A D I B O T*  ║\n` +
                    `╚══════════════════════╝\n\n` +
                    `✅ *Kode pairing berhasil dikirim!*\n\n` +
                    `📱 Kode langsung dikirim ke nomor:\n` +
                    `*+${number}*\n\n` +
                    `⏳ Suruh mereka segera buka kode tersebut\n` +
                    `dan masukkan di WhatsApp → Perangkat Tertaut.\n\n` +
                    `_Berlaku 3 menit_`
                  )
                  if (sentInfo?.key) pairingMsgKey = sentInfo.key
                } catch {}
              } catch (e) {
                console.log(`[JADIBOT][V2] ⚠️ Gagal kirim pairing code ke +${number}: ${e?.message}`)
                // Fallback: kirim ke GC/owner jika pengiriman langsung gagal
                if (!directPairingSent) {
                  try {
                    const sentInfo = await sendReply(msgPairingCode(code, number))
                    if (sentInfo?.key) pairingMsgKey = sentInfo.key
                    directPairingSent = true
                    console.log(`[JADIBOT][V2→V1] ✅ Fallback: pairing code dikirim ke GC/owner`)
                  } catch (e2) {
                    console.log(`[JADIBOT][V2→V1] ⚠️ Fallback gagal juga: ${e2?.message}`)
                  }
                }
              }
            }

            // ── V1 atau fallback jika V2 gagal: kirim kode ke GC/owner chat ──
            if (!directPairingSent) {
              if (sendPairingMsg) {
                const sentInfo = await sendPairingMsg(code, number)
                if (sentInfo?.key) pairingMsgKey = sentInfo.key
              } else {
                // V1: pakai plain text langsung (interactiveMessage/tombol tidak bekerja di GC)
                try {
                  const sentInfo = await sendReply(msgPairingCode(code, number))
                  if (sentInfo?.key) pairingMsgKey = sentInfo.key
                } catch (e) {
                  console.log(`[JADIBOT][V1] ⚠️ Gagal kirim pairing code ke GC: ${e?.message}`)
                }
              }
              if (pairingMode === 'v1') console.log(`[JADIBOT][V1] ✅ Pairing code terkirim ke GC/owner`)
            }
            break
          } catch (err) {
            if (aborted) break
            retries--
            console.error(`[JADIBOT] Gagal request pairing code ${number} (sisa retry: ${retries}):`, err?.message)
            if (retries > 0) await delay(2000)
          }
        }
        if (!aborted && retries === 0) {
          try {
            await sendReply(
              `╔══════════════════════╗\n` +
              `║   ❌  *GAGAL PAIRING*   ║\n` +
              `╚══════════════════════╝\n\n` +
              `⚠️ Gagal mendapatkan kode pairing untuk *${maskNumber(number)}*.\n` +
              `Koneksi terputus sebelum kode berhasil dibuat.\n\n` +
              `💡 Ketik *.jadibot ${number}* untuk coba lagi.`
            )
          } catch {}
        }
      }, 2000)

      // ⏱️ AUTO STOP setelah 3 MENIT jika belum terhubung
      const timeout = setTimeout(async () => {
        if (state.creds?.registered || jadibotMap.has(number)) return

        console.log(`[JADIBOT] ⏰ Pairing timeout 3 menit → ${number} → sesi dihapus`)

        pairingRequested.delete(number)
        pairingTimeout.delete(number)
        activeOrStartingJadibot.delete(number)
        startingSocketMap.delete(number)

        // Tutup socket
        cleanupSocket()

        // Hapus sesi
        setTimeout(() => {
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true })
          }
          try { const _sf = sessionDir + '.json'; if (fs.existsSync(_sf)) fs.unlinkSync(_sf) } catch {}
          removeJadibotExpiry(number)
        }, 500)

        // Kirim notif ke pengirim
        try {
          await sendReply(msgPairingExpired(number))
        } catch {}
      }, PAIRING_TIMEOUT_MS)

      pairingTimeout.set(number, timeout)
    }

    /* ===== CONNECTED ===== */
    if (connection === 'open') {
      hasConnectedOnce = true
      const isFreshPairing = pairingRequested.has(number)
      const _connectTs = Date.now()

      // Connection box ditampilkan SETELAH expiry diset (lihat di bawah)

      jadibotMap.set(number, sock)
      jadibotConnectedAt.set(number, _connectTs)
      persistConnectedAt(number, _connectTs)
      startingSocketMap.delete(number)
      pairingRequested.delete(number)

      // Start per-jadibot autoonline (isolated dari bot utama & jadibot lain)
      try { startJadibotAutoOnline(sock, number) } catch {}

      // Start auto-prune SwStats tiap 6 jam (isolated per jadibot)
      try { startJadibotSwPrune(number) } catch {}

      // Auto-init emoji.json per jadibot — copy dari bot utama jika belum ada
      try { getJadibotEmojis(number) } catch {}

      // Init ceksw config per-jadibot — default OFF jika belum pernah ada
      try { initJadibotCekswConfig(number) } catch {}

      // SwStats: prune activeSW expired supaya data jadibot realtime & akurat
      try { pruneSwStatsAt(path.join(process.cwd(), 'data_jadibot', number, 'ceksw', 'swstats.json'), number) } catch {}

      // Pastikan registered = true tersimpan agar reconnect tidak trigger pairing ulang
      if (!state.creds.registered) {
        state.creds.registered = true
        saveCreds()
      }

      if (durationMs === 'permanent') {
        setPermanentJadibot(number, 'active')
      } else if (hasRequestedDuration) {
        ensureJadibotExpiry(number, durationMs, 'active')
        scheduleJadibotExpiry(number, sendReply)
      } else if (getJadibotExpiry(number)) {
        updateJadibotExpiryStatus(number, 'active')
        scheduleJadibotExpiry(number, sendReply)
      } else {
        setPermanentJadibot(number, 'active')
        console.log(`[JADIBOT] ⚠️ ${number} tidak ada data expiry → dijadikan permanent (auto-start/reconnect)`)
      }

      if (pairingTimeout.has(number)) {
        clearTimeout(pairingTimeout.get(number))
        pairingTimeout.delete(number)
      }

      // ── Combined connection + expiry box ──
      {
        const _LC2 = '\x1b[36m', _LR2 = '\x1b[0m', _LB2 = '\x1b[1m'
        const _meta2 = getJadibotExpiry(number)
        let _exIcon = '♾️ ', _exLabel = 'Permanent'
        if (_meta2 && _meta2.permanent !== true && _meta2.expiresAt) {
          const _ms2 = Number(_meta2.expiresAt) - Date.now()
          if (_ms2 <= 0) { _exIcon = '💀'; _exLabel = 'kedaluwarsa' }
          else { _exIcon = '🕐'; _exLabel = formatRemainingTime(_ms2) }
        }
        const _line2 = '─'.repeat(34)
        console.log(`${_LC2}╭${_line2}╮${_LR2}`)
        console.log(`${_LC2}│${_LR2} ✅ ${_LB2}+${number}${_LR2} ${isFreshPairing ? 'CONNECTED ✔' : 'RECONNECTED ✔'}`)
        console.log(`${_LC2}│${_LR2} ${_exIcon} ${_exLabel}`)
        console.log(`${_LC2}╰${_line2}╯${_LR2}`)
      }

      // Edit pesan pairing secara realtime → tandai sudah terhubung
      if (pairingMsgKey && editMsg) {
        try {
          await editMsg(
            pairingMsgKey,
            `╔══════════════════════╗\n` +
            `║   ✅  *J A D I B O T*  ║\n` +
            `╚══════════════════════╝\n\n` +
            `📱 *Nomor:* ${maskNumber(number)}\n\n` +
            `🎉 *Kode berhasil digunakan!*\n` +
            `Jadibot sudah terhubung dan aktif.\n\n` +
            `✅ Pesan ini diperbarui otomatis saat terhubung.`
          )
        } catch {}
      }

      // Kirim pesan sambutan hanya saat fresh pairing (bukan reconnect otomatis)
      if (isFreshPairing) {
        try { if (reactFn) await reactFn('✅') } catch {}

        // Cek mode pairing — v2 = kirim welcome ke nomor tujuan, v1 = tidak
        const connCfg = loadConfig()
        const connPairingMode = (connCfg.jadibotPairingMode || 'v2').toLowerCase()

        if (connPairingMode === 'v2') {
          // Kirim notifikasi langsung ke nomor jadibot via main bot
          let directNotifSent = false
          const _welcomeSock = getActiveMainSock(mainBotSock)
          if (_welcomeSock) {
            try {
              await delay(800)

              // Resolve JID yang benar dulu (support LID/linked device)
              let welcomeTargetJid = `${number}@s.whatsapp.net`
              try {
                const [waRes] = await _welcomeSock.onWhatsApp(`${number}@s.whatsapp.net`)
                if (waRes?.exists && waRes?.jid) welcomeTargetJid = waRes.jid
              } catch (_) {}

              await _welcomeSock.sendMessage(welcomeTargetJid, {
                text: msgDirectWelcome(number)
              })
              directNotifSent = true
              console.log(`[JADIBOT][V2] ✅ Notif realtime terkirim ke +${number} via main bot (jid: ${welcomeTargetJid})`)
            } catch (e) {
              console.log(`[JADIBOT][V2] ⚠️ Gagal kirim notif ke +${number} via main bot: ${e?.message}`)
            }
          }

          // Self-notif hanya jika main bot gagal kirim (fallback, cegah duplikat)
          if (!directNotifSent) {
            try {
              await delay(300)
              await sendDirectJadibotNotice(sock, number,
                `🤖 *Jadibot aktif!*\n\n` +
                `Nomor ini (+${number}) kini berjalan sebagai bot.\n` +
                `Semua fitur bot tersedia via bot utama.\n\n` +
                `_Pesan ini dikirim otomatis saat jadibot terhubung._`
              )
            } catch {}
          }
        } else {
          // V1: kirim notif terhubung ke GC/owner
          try {
            await sendReply(msgConnected(number))
            console.log(`[JADIBOT][V1] ✅ Notif terhubung terkirim ke GC/owner`)
          } catch (e) {
            console.log(`[JADIBOT][V1] ⚠️ Gagal kirim notif terhubung ke GC: ${e?.message}`)
          }
        }
      }
    }

    /* ===== DISCONNECTED ===== */
    if (connection === 'close') {
      startingSocketMap.delete(number)
      if (pairingTimeout.has(number)) {
        clearTimeout(pairingTimeout.get(number))
        pairingTimeout.delete(number)
      }

      pairingRequested.delete(number)

      /* STOP MANUAL DARI BOT UTAMA */
      if (stoppingJadibot.has(number)) {
        stoppingJadibot.delete(number)
        jadibotMap.delete(number)
        stopJadibotAutoOnline(number)
        stopJadibotSwPrune(number)
        activeOrStartingJadibot.delete(number)
        const _C = '\x1b[36m', _R = '\x1b[0m', _B = '\x1b[1m';
        console.log(`${_C}╠══════════════════════════════════╣${_R}`);
        console.log(`${_C}║${_R} ⏹️  ${_B}+${number}${_R} STOPPED`);
        console.log(`${_C}╚══════════════════════════════════╝${_R}`);
        return
      }

      /* ===== LOGOUT PAKSA DARI WHATSAPP ===== */
      if (reason === DisconnectReason.loggedOut) {
        // Hapus dari map DULU baru ambil sisa list (agar nomor ini tidak muncul di list)
        jadibotMap.delete(number)
        stopJadibotAutoOnline(number)
        stopJadibotSwPrune(number)
        activeOrStartingJadibot.delete(number)

        const _C = '\x1b[36m', _R2 = '\x1b[0m', _B2 = '\x1b[1m';
        console.log(`${_C}╠══════════════════════════════════╣${_R2}`);
        console.log(`${_C}║${_R2} 🚫 ${_B2}+${number}${_R2} LOGOUT PAKSA → sesi dihapus`);
        console.log(`${_C}╚══════════════════════════════════╝${_R2}`);

        // Beri tahu owner via react ❌ (realtime)
        try { if (reactFn) await reactFn('❌') } catch {}

        // Cek mode pairing untuk tentukan kemana notif logout dikirim
        const logoutCfg = loadConfig()
        const logoutMode = (logoutCfg.jadibotPairingMode || 'v2').toLowerCase()

        if (logoutMode === 'v2') {
          // V2: kirim notif langsung ke nomor tujuan via main bot
          const _logoutSock = getActiveMainSock(mainBotSock)
          if (_logoutSock) {
            try {
              await _logoutSock.sendMessage(`${number}@s.whatsapp.net`, {
                text: msgLoggedOutDirect(number)
              })
              console.log(`[JADIBOT][V2] ✅ Notif logout terkirim ke +${number}`)
            } catch (e) {
              console.log(`[JADIBOT][V2] ⚠️ Gagal kirim notif logout ke +${number}: ${e?.message}`)
            }
          }
        } else {
          // V1: kirim notif ke GC/owner
          const remainingList = [...jadibotMap.keys()]
          try {
            await sendReply(msgLoggedOut(number, remainingList))
            console.log(`[JADIBOT][V1] ✅ Notif logout terkirim ke GC/owner`)
          } catch (e) {
            console.log(`[JADIBOT][V1] ⚠️ Gagal kirim notif logout ke GC: ${e?.message}`)
          }
        }

        // BARU setelah notif terkirim: tutup socket & hapus sesi
        cleanupSocket()
        setTimeout(() => {
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true })
          }
          try { if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile) } catch {}
          removeJadibotExpiry(number)
        }, 300)
        return
      }

      if (isJadibotExpired(number)) {
        await expireJadibot(number, sendReply)
        return
      }

      /* ===== SESSION SUDAH TIDAK ADA ===== */
      if (!isSessionValid(sessionDir)) {
        jadibotMap.delete(number)
        stopJadibotAutoOnline(number)
        stopJadibotSwPrune(number)
        activeOrStartingJadibot.delete(number)
        const _C = '\x1b[36m', _R = '\x1b[0m', _B = '\x1b[1m';
        console.log(`${_C}╠══════════════════════════════════╣${_R}`);
        console.log(`${_C}║${_R} ❌ ${_B}+${number}${_R} SESSION INVALID → tidak restart`);
        console.log(`${_C}╚══════════════════════════════════╝${_R}`);
        return
      }

      /* ===== RECONNECT NORMAL ===== */
      // Guard: cegah duplicate reconnect jika close event terpicu lebih dari sekali
      if (reconnectingJadibot.has(number)) {
        console.log(`\x1b[33m[JADIBOT]\x1b[0m ⚠️ ${number} sudah dalam proses reconnect, skip duplikat`)
        return
      }
      reconnectingJadibot.add(number)

      // Hapus referensi socket lama dari map agar tidak stale
      jadibotMap.delete(number)

      const _C = '\x1b[36m', _R = '\x1b[0m', _B = '\x1b[1m';
      console.log(`${_C}╠══════════════════════════════════╣${_R}`);
      console.log(`${_C}║${_R} 🔄 ${_B}+${number}${_R} DISCONNECTED → reconnecting...`);
      console.log(`${_C}╚══════════════════════════════════╝${_R}`);
      // Tutup socket lama DULU sebelum buat yang baru
      cleanupSocket()
      setTimeout(() => {
        reconnectingJadibot.delete(number)
        activeOrStartingJadibot.delete(number)
        startJadibot(number, sendReply, mainBotNumber, editMsg, sendPairingMsg, hasConnectedOnce ? undefined : durationMs, getActiveMainSock(mainBotSock), null, requesterNumber)
      }, 3000)
    }
  })

  /* ================= ANTI CALL ================= */
  sock.ev.on('call', async calls => {
    for (const call of calls) {
      try {
        if (call.status !== 'offer') continue
        const jadibotNum = getJadibotNumber(sock)
        const isVideo = call.isVideo === true
        const setting = isVideo ? getJadibotAnticallvid(jadibotNum) : getJadibotAnticall(jadibotNum)
        if (!setting.enabled) continue
        const callerNumber = (call.from || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
        const whitelist = setting.whitelist || []
        const isWhitelisted = whitelist.some(n => {
          const c = n.replace(/[^0-9]/g, '')
          return callerNumber.includes(c) || c.includes(callerNumber)
        })
        if (isWhitelisted) {
          console.log(`[JADIBOT][${isVideo ? 'AntiCallVid' : 'AntiCall'}] +${jadibotNum} → ${callerNumber} WHITELISTED, skip`)
          continue
        }
        await sock.rejectCall(call.id, call.from)
        console.log(`[JADIBOT][${isVideo ? 'AntiCallVid' : 'AntiCall'}] +${jadibotNum} → Rejected ${isVideo ? 'video' : 'voice'} call from ${callerNumber}`)
        if (setting.message) {
          await new Promise(r => setTimeout(r, 1000))
          await sock.sendMessage(call.from, { text: setting.message })
        }
      } catch (err) {
        console.error(`[JADIBOT][AntiCall] Error:`, err.message)
      }
    }
  })

  /* ================= GROUPS CACHE ================= */
  sock.ev.on('groups.upsert', async groupsData => {
    try {
      for (const group of groupsData) {
        try {
          const existing = sock.groups.read(group.id) || {}
          sock.groups.write(group.id, { ...existing, ...group })
        } catch (_) {}
      }
    } catch (_) {}
  })
  sock.ev.on('groups.update', async groupsData => {
    try {
      for (const group of groupsData) {
        try {
          const existing = sock.groups.read(group.id) || {}
          sock.groups.write(group.id, { ...existing, ...group })
        } catch (_) {}
      }
    } catch (_) {}
  })

  /* ================= MESSAGE ================= */
  const swSet = getJadibotSwSet(number)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') {
      // type='append' = echo pesan yang dikirim jadibot sendiri
      // Tangkap khusus group story (fromMe=true) agar jadibot bisa react ke story GC miliknya sendiri
      if (type === 'append') {
        for (const msg of messages) {
          if (!msg.message || !msg.key?.fromMe) continue
          if (!isJidGroup(msg.key?.remoteJid)) continue
          const _chkGs = msg.message?.groupStatusMessageV2 || msg.message?.groupStatusMentionMessage || msg.message?.groupMentionedMessage
            || (msg.message && (() => { try { const vals = Object.values(msg.message); for (const v of vals) { if (v?.contextInfo?.isGroupStatus) return v; } } catch {} return null; })())
          if (!_chkGs) continue
          handleJadibotSW(msg, sock, swSet, number).catch(err =>
            console.error('[JADIBOT APPEND SW ERROR]', err?.message || String(err))
          )
        }
      }
      return
    }

    for (const msg of messages) {
      if (!msg.message) continue
      // Blokir pesan yang dikirim oleh kode bot sendiri (ada di _botSentIds)
      // fromMe=true bisa juga dari WA user asli (multi-device) — jangan skip itu
      if (msg.key?.fromMe && sock._botSentIds?.has(msg.key?.id)) continue

      // Cache pesan + pre-download media untuk antidel
      if (msg.key?.id && !sock.cacheMsg.has(msg.key.id)) {
        sock.cacheMsg.set(msg.key.id, msg)
        setTimeout(() => sock.cacheMsg.delete(msg.key.id), 60000)
        preDownloadMediaForAntidel(msg, sock).catch(() => {})


      }

      // ── Deteksi SW dihapus realtime (terisolasi per-jadibot) ──
      const _protoMsg = msg.message?.protocolMessage
      if (_protoMsg && _protoMsg.type === 0) { // 0 = REVOKE
        const _isStatusRevoke =
          msg.key?.remoteJid === 'status@broadcast' ||
          _protoMsg.key?.remoteJid === 'status@broadcast'
        const _deletedId = _protoMsg.key?.id
        if (_isStatusRevoke && _deletedId) {
          try {
            const _jadibotUserDir = path.join(process.cwd(), 'data_jadibot', number, 'swtrack', 'users')
            if (fs.existsSync(_jadibotUserDir)) {
              const _files = fs.readdirSync(_jadibotUserDir).filter(f => f.endsWith('.json'))
              for (const _file of _files) {
                const _fp = path.join(_jadibotUserDir, _file)
                try {
                  const _d = JSON.parse(fs.readFileSync(_fp, 'utf-8'))
                  if (_d[_deletedId]) {
                    _d[_deletedId] = { ..._d[_deletedId], deleted: true, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                    fs.writeFileSync(_fp, JSON.stringify(_d, null, 2), 'utf-8')
                    const _contactNum = _file.replace('.json', '')
                    const _color = getJadibotLogColor(number)
                    console.log(`${_color}[SwTrack][JB:${number}] SW dihapus: ${_contactNum} → ${_deletedId}\x1b[39m`)
                    break
                  }
                } catch {}
              }
            }
          } catch {}
        }
      }

      // AutoRead SW — pakai Set terisolasi per-jadibot agar tidak bentrok dengan main bot / jadibot lain
      handleJadibotSW(msg, sock, swSet, number).catch(err =>
        console.error('[JADIBOT SW ERROR]', err?.message || String(err))
      )

      // Auto Typing / Auto Recording per pesan — terisolasi per-jadibot, data di data_jadibot
      try {
        const _atJid = msg.key?.remoteJid
        const _atIsGroup = _atJid?.endsWith('@g.us')
        const _atIsStatus = _atJid === 'status@broadcast'
        if (!_atIsStatus && _atJid && !msg.key?.fromMe) {
          const _atCfg = getJadibotAutoTyping(number)
          const _arCfg = getJadibotAutoRecording(number)
          const _doType = _atCfg.enabled && (_atIsGroup ? _atCfg.groupChat !== false : _atCfg.privateChat !== false)
          const _doRecord = !_doType && _arCfg.enabled && (_atIsGroup ? _arCfg.groupChat !== false : _arCfg.privateChat !== false)
          if (_doType || _doRecord) {
            const _presence = _doType ? 'composing' : 'recording'
            const _delaySec = _doType ? (_atCfg.delaySeconds || 5) : (_arCfg.delaySeconds || 5)
            try { sock.sendPresenceUpdate(_presence, _atJid) } catch {}
            setTimeout(() => { try { sock.sendPresenceUpdate('paused', _atJid) } catch {} }, Math.min(_delaySec * 1000, 30000))
          }
        }
      } catch {}

      // Auto Read Chat — private only, terisolasi per-jadibot
      try {
        const _rcJid = msg.key?.remoteJid
        const _rcIsPrivate = _rcJid && !_rcJid.endsWith('@g.us') && _rcJid !== 'status@broadcast'
        if (_rcIsPrivate && !msg.key?.fromMe) {
          if (getJadibotReadchat(number)?.enabled) {
            sock.readMessages([msg.key]).catch(() => {})
          }
        }
      } catch {}

      try {
        await getHandler('message')(
          { message: msg, type: 'notify' },
          sock
        )
      } catch (err) {
        console.error('[JADIBOT MESSAGE ERROR]', err)
        logError(err instanceof Error ? err : new Error(String(err)), `jadibot-message:${number}`)
      }
    }
  })

  sock.ev.on('messages.update', updates => {
    for (const update of updates) {
      Promise.resolve(
        getHandler('antidelete')(update, sock)
      ).catch(err => console.error(`[JADIBOT][AntiDelete] ${number}:`, err.message))
    }
  })
}

/* ================= START JADIBOT QR ================= */
async function startJadibotQR(number, sendReply, sendImage, mainBotNumber, durationMs = undefined, mainBotSock = null, reactFn = null, requesterNumber = null) {
  number = number.replace(/[^0-9]/g, '')
  const hasRequestedDuration = durationMs !== undefined && durationMs !== null

  if (hasRequestedDuration) {
    removeJadibotExpiry(number)
  } else if (isJadibotExpired(number)) {
    await expireJadibot(number, sendReply)
    return
  }

  if (activeOrStartingJadibot.has(number)) {
    console.log(`\x1b[33m[JADIBOT QR]\x1b[0m ⚠️ ${number} sudah aktif/dalam proses start, skip duplikat`)
    return
  }
  activeOrStartingJadibot.add(number)
  if (!hasRequestedDuration && getJadibotExpiry(number)) {
    updateJadibotExpiryStatus(number, 'starting')
    scheduleJadibotExpiry(number, sendReply)
  }

  if (typeof global.autoStartedJadibot !== 'undefined') {
    global.autoStartedJadibot.add(number)
  }

  const sessionDir = path.join(process.cwd(), 'jadibot', number)
  const sessionFile = sessionDir + '.json'

  const { state, saveCreds, contacts: jbContacts, groups: jbGroups, settings: jbSettings, clearCacheInPlace: jbClearCache, getSizeReport: jbSizeReport } = await useSingleFileAuthState(sessionFile)
  if (jbClearCache)   jadibotClearSesiMap.set(number, jbClearCache)
  if (jbSizeReport)   jadibotSesiReportMap.set(number, jbSizeReport)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: state.keys,
    },
    logger: silentLogger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '136.0.7103.93'],
    keepAliveIntervalMs: 30000,
    syncFullHistory: true,
  })

  sock.isMainBot = false
  sock.mainBotNumber = global.__mainBotNumber || mainBotNumber || ''
  sock.jadibotUserNumber = requesterNumber || null

  injectClient(
    sock,
    new Map(),
    jbContacts,
    jbGroups,
    jbSettings
  )

  sock.loadedCommands = [
    'p', 'ping', 'menu',
    'rvo', 'viewonce', 'vo',
    'antidel', 'ad',
    'readsw',
    'anticall', 'ac',
    'anticallvid', 'acv',
    'autocallaudio', 'aca',
    'online',
    'typing', 'typ',
    'recording', 'record',
    'tt', 'ig', 'fb', 'ytmp3', 'ytmp4', 'play',
    'allunduh', 'twdl',
    'sticker', 's',
    'wm', 'swm',
    'toimg', 'hd',
    'upswgc', 'swgc', 'swgrup', 'swgroup', 'statusgrup', 'statusgroup',
    'upswgcv2', 'swgcv2', 'swgrupv2', 'swgroupv2', 'statusgrupv2', 'statusgroupv2',
    'readchat',
    'ceksw',
    'ceksetting',
    'emoji', 'emojiadd', 'emojidel', 'emojilist',
    'emojidefault', 'emojicustom', 'emojiclear',
    'ceksesi', 'clearsesi', 'cs',
    'del', 'd',
    'font', 'fontgen', 'fontuntik',
    'logo'
  ]

  sock.ev.on('creds.update', async (...args) => {
    try { await saveCreds(...args) } catch {}
  })

  let qrSentCount = 0
  let hasConnected = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    const reason = lastDisconnect?.error?.output?.statusCode

    /* ===== KIRIM QR CODE ===== */
    if (qr) {
      qrSentCount++
      try {
        const qrBuffer = await QRCode.toBuffer(qr, { type: 'png', width: 512, margin: 2 })
        const caption =
          `╔══════════════════════╗\n` +
          `║   🤖  *J A D I B O T*  ║\n` +
          `╚══════════════════════╝\n\n` +
          `📱 *Nomor:* ${maskNumber(number)}\n` +
          `🔄 *QR ke-${qrSentCount}*\n\n` +
          `📋 *Cara Scan:*\n` +
          `1️⃣ Buka WhatsApp di HP kamu\n` +
          `2️⃣ Ketuk ⋮ (titik tiga) → *Perangkat Tertaut*\n` +
          `3️⃣ Ketuk *Tautkan Perangkat*\n` +
          `4️⃣ Scan QR di atas\n\n` +
          `⏳ QR berlaku ±60 detik\n` +
          `⚠️ Jika QR expired, QR baru akan dikirim otomatis`
        await sendImage(qrBuffer, caption)
        console.log(`[JADIBOT QR] QR ke-${qrSentCount} dikirim untuk ${number}`)
      } catch (err) {
        console.error(`[JADIBOT QR] Gagal kirim QR ${number}:`, err?.message)
      }
    }

    /* ===== CONNECTED ===== */
    if (connection === 'open') {
      hasConnected = true
      const _connectTs = Date.now()
      jadibotMap.set(number, sock)
      jadibotConnectedAt.set(number, _connectTs)
      persistConnectedAt(number, _connectTs)

      // Start per-jadibot autoonline (isolated dari bot utama & jadibot lain)
      try { startJadibotAutoOnline(sock, number) } catch {}

      // Start auto-prune SwStats tiap 6 jam (isolated per jadibot)
      try { startJadibotSwPrune(number) } catch {}

      // Auto-init emoji.json per jadibot — copy dari bot utama jika belum ada
      try { getJadibotEmojis(number) } catch {}

      // Init ceksw config per-jadibot — default OFF jika belum pernah ada
      try { initJadibotCekswConfig(number) } catch {}

      // SwStats: prune activeSW expired supaya data jadibot realtime & akurat
      try { pruneSwStatsAt(path.join(process.cwd(), 'data_jadibot', number, 'ceksw', 'swstats.json'), number) } catch {}

      // Pastikan registered = true tersimpan agar reconnect tidak trigger QR ulang
      if (!state.creds.registered) {
        state.creds.registered = true
        saveCreds()
      }

      if (durationMs === 'permanent') {
        setPermanentJadibot(number, 'active')
      } else if (hasRequestedDuration) {
        ensureJadibotExpiry(number, durationMs, 'active')
        scheduleJadibotExpiry(number, sendReply)
      } else if (getJadibotExpiry(number)) {
        updateJadibotExpiryStatus(number, 'active')
        scheduleJadibotExpiry(number, sendReply)
      } else {
        setPermanentJadibot(number, 'active')
        console.log(`[JADIBOT QR] ⚠️ ${number} tidak ada data expiry → dijadikan permanent (auto-start/reconnect)`)
      }
      // ── Combined connection + expiry box (QR mode) ──
      {
        const _LC2 = '\x1b[36m', _LR2 = '\x1b[0m', _LB2 = '\x1b[1m'
        const _meta2 = getJadibotExpiry(number)
        let _exIcon = '♾️ ', _exLabel = 'Permanent'
        if (_meta2 && _meta2.permanent !== true && _meta2.expiresAt) {
          const _ms2 = Number(_meta2.expiresAt) - Date.now()
          if (_ms2 <= 0) { _exIcon = '💀'; _exLabel = 'kedaluwarsa' }
          else { _exIcon = '🕐'; _exLabel = formatRemainingTime(_ms2) }
        }
        const _line2 = '─'.repeat(34)
        console.log(`${_LC2}╭${_line2}╮${_LR2}`)
        console.log(`${_LC2}│${_LR2} ✅ ${_LB2}+${number}${_LR2} CONNECTED ✔`)
        console.log(`${_LC2}│${_LR2} ${_exIcon} ${_exLabel}`)
        console.log(`${_LC2}╰${_line2}╯${_LR2}`)
      }
      try { if (reactFn) await reactFn('✅') } catch {}

      // Cek mode pairing — v2 = kirim welcome ke nomor tujuan, v1 = tidak
      const connCfgQR = loadConfig()
      const connPairingModeQR = (connCfgQR.jadibotPairingMode || 'v2').toLowerCase()

      if (connPairingModeQR === 'v2') {
        // Kirim notifikasi langsung ke nomor jadibot via main bot
        let directNotifSentQR = false
        const _welcomeSockQR = getActiveMainSock(mainBotSock)
        if (_welcomeSockQR) {
          try {
            await delay(800)
            await _welcomeSockQR.sendMessage(`${number}@s.whatsapp.net`, {
              text: msgDirectWelcome(number)
            })
            directNotifSentQR = true
            console.log(`[JADIBOT QR][V2] ✅ Notif realtime terkirim ke +${number} via main bot`)
          } catch (e) {
            console.log(`[JADIBOT QR][V2] ⚠️ Gagal kirim notif ke +${number} via main bot: ${e?.message}`)
          }
        }

        // Self-notif hanya jika main bot gagal kirim (fallback, cegah duplikat)
        if (!directNotifSentQR) {
          try {
            await delay(300)
            await sendDirectJadibotNotice(sock, number,
              `🤖 *Jadibot aktif!*\n\n` +
              `Nomor ini (+${number}) kini berjalan sebagai bot.\n` +
              `Semua fitur bot tersedia via bot utama.\n\n` +
              `_Pesan ini dikirim otomatis saat jadibot terhubung._`
            )
          } catch {}
        }
      } else {
        // V1: kirim notif terhubung ke GC/owner
        try {
          await sendReply(msgConnected(number))
          console.log(`[JADIBOT QR][V1] ✅ Notif terhubung terkirim ke GC/owner`)
        } catch (e) {
          console.log(`[JADIBOT QR][V1] ⚠️ Gagal kirim notif terhubung ke GC: ${e?.message}`)
        }
      }
    }

    /* ===== DISCONNECTED ===== */
    if (connection === 'close') {
      if (stoppingJadibot.has(number)) {
        stoppingJadibot.delete(number)
        jadibotMap.delete(number)
        stopJadibotAutoOnline(number)
        stopJadibotSwPrune(number)
        activeOrStartingJadibot.delete(number)
        const _C = '\x1b[36m', _R = '\x1b[0m', _B = '\x1b[1m';
        console.log(`${_C}╠══════════════════════════════════╣${_R}`);
        console.log(`${_C}║${_R} ⏹️  ${_B}+${number}${_R} STOPPED`);
        console.log(`${_C}╚══════════════════════════════════╝${_R}`);
        return
      }

      if (reason === DisconnectReason.loggedOut) {
        jadibotMap.delete(number)
        stopJadibotAutoOnline(number)
        stopJadibotSwPrune(number)
        activeOrStartingJadibot.delete(number)
        const _C = '\x1b[36m', _R2 = '\x1b[0m', _B2 = '\x1b[1m';
        console.log(`${_C}╠══════════════════════════════════╣${_R2}`);
        console.log(`${_C}║${_R2} 🚫 ${_B2}+${number}${_R2} LOGOUT PAKSA → sesi dihapus`);
        console.log(`${_C}╚══════════════════════════════════╝${_R2}`);

        // Beri tahu owner via react ❌ (realtime)
        try { if (reactFn) await reactFn('❌') } catch {}

        // Cek mode pairing untuk tentukan kemana notif logout dikirim
        const logoutCfgQR = loadConfig()
        const logoutModeQR = (logoutCfgQR.jadibotPairingMode || 'v2').toLowerCase()

        if (logoutModeQR === 'v2') {
          // V2: kirim notif langsung ke nomor tujuan via main bot
          const _logoutSockQR = getActiveMainSock(mainBotSock)
          if (_logoutSockQR) {
            try {
              await _logoutSockQR.sendMessage(`${number}@s.whatsapp.net`, {
                text: msgLoggedOutDirect(number)
              })
              console.log(`[JADIBOT QR][V2] ✅ Notif logout terkirim ke +${number}`)
            } catch (e) {
              console.log(`[JADIBOT QR][V2] ⚠️ Gagal kirim notif logout ke +${number}: ${e?.message}`)
            }
          }
        } else {
          // V1: kirim notif ke GC/owner
          const remainingListQR = [...jadibotMap.keys()]
          try {
            await sendReply(msgLoggedOut(number, remainingListQR))
            console.log(`[JADIBOT QR][V1] ✅ Notif logout terkirim ke GC/owner`)
          } catch (e) {
            console.log(`[JADIBOT QR][V1] ⚠️ Gagal kirim notif logout ke GC: ${e?.message}`)
          }
        }

        // BARU hapus sesi setelah notif terkirim
        setTimeout(() => {
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true })
          }
          try { if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile) } catch {}
          removeJadibotExpiry(number)
        }, 300)
        return
      }

      if (isJadibotExpired(number)) {
        await expireJadibot(number, sendReply)
        return
      }

      // Jika sudah pernah connect via QR, selalu coba reconnect
      // (creds.json mungkin belum tersimpan tepat waktu sebelum disconnect sesaat)
      if (hasConnected || isSessionValid(sessionDir)) {
        // Guard: cegah duplicate reconnect
        if (reconnectingJadibot.has(number)) {
          console.log(`[JADIBOT QR] ⚠️ ${number} sudah dalam proses reconnect, skip duplikat`)
          return
        }
        reconnectingJadibot.add(number)
        jadibotMap.delete(number)
        const _C = '\x1b[36m', _R = '\x1b[0m', _B = '\x1b[1m';
        console.log(`${_C}╠══════════════════════════════════╣${_R}`);
        console.log(`${_C}║${_R} 🔄 ${_B}+${number}${_R} DISCONNECTED → reconnecting...`);
        console.log(`${_C}╚══════════════════════════════════╝${_R}`);
        // Tutup socket lama DULU sebelum buat yang baru
        // agar WA tidak kick socket lama dengan alasan loggedOut
        // yang akan memicu penghapusan sesi secara salah
        try {
          sock.ev.removeAllListeners()
          if (sock.ws) sock.ws.close()
        } catch {}
        setTimeout(() => {
          reconnectingJadibot.delete(number)
          activeOrStartingJadibot.delete(number)
          startJadibotQR(number, sendReply, sendImage, mainBotNumber, hasConnected ? undefined : durationMs, getActiveMainSock(mainBotSock), null, requesterNumber)
        }, 3000)
        return
      }

      jadibotMap.delete(number)
      stopJadibotAutoOnline(number)
      stopJadibotSwPrune(number)
      activeOrStartingJadibot.delete(number)
      const _C = '\x1b[36m', _R = '\x1b[0m', _B = '\x1b[1m';
      console.log(`${_C}╠══════════════════════════════════╣${_R}`);
      console.log(`${_C}║${_R} ❌ ${_B}+${number}${_R} SESSION INVALID → tidak restart`);
      console.log(`${_C}╚══════════════════════════════════╝${_R}`);
    }
  })

  /* ================= ANTI CALL (QR) ================= */
  sock.ev.on('call', async calls => {
    for (const call of calls) {
      try {
        if (call.status !== 'offer') continue
        const jadibotNum = getJadibotNumber(sock)
        const isVideo = call.isVideo === true
        const setting = isVideo ? getJadibotAnticallvid(jadibotNum) : getJadibotAnticall(jadibotNum)
        if (!setting.enabled) continue
        const callerNumber = (call.from || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '')
        const whitelist = setting.whitelist || []
        const isWhitelisted = whitelist.some(n => {
          const c = n.replace(/[^0-9]/g, '')
          return callerNumber.includes(c) || c.includes(callerNumber)
        })
        if (isWhitelisted) {
          console.log(`[JADIBOT QR][${isVideo ? 'AntiCallVid' : 'AntiCall'}] +${jadibotNum} → ${callerNumber} WHITELISTED, skip`)
          continue
        }
        await sock.rejectCall(call.id, call.from)
        console.log(`[JADIBOT QR][${isVideo ? 'AntiCallVid' : 'AntiCall'}] +${jadibotNum} → Rejected ${isVideo ? 'video' : 'voice'} call from ${callerNumber}`)
        if (setting.message) {
          await new Promise(r => setTimeout(r, 1000))
          await sock.sendMessage(call.from, { text: setting.message })
        }
      } catch (err) {
        console.error(`[JADIBOT QR][AntiCall] Error:`, err.message)
      }
    }
  })

  /* ================= GROUPS CACHE (QR) ================= */
  sock.ev.on('groups.upsert', async groupsData => {
    try {
      for (const group of groupsData) {
        try {
          const existing = sock.groups.read(group.id) || {}
          sock.groups.write(group.id, { ...existing, ...group })
        } catch (_) {}
      }
    } catch (_) {}
  })
  sock.ev.on('groups.update', async groupsData => {
    try {
      for (const group of groupsData) {
        try {
          const existing = sock.groups.read(group.id) || {}
          sock.groups.write(group.id, { ...existing, ...group })
        } catch (_) {}
      }
    } catch (_) {}
  })

  const swSet = getJadibotSwSet(number)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') {
      // type='append' = echo pesan yang dikirim jadibot sendiri
      // Tangkap khusus group story (fromMe=true) agar jadibot bisa react ke story GC miliknya sendiri
      if (type === 'append') {
        for (const msg of messages) {
          if (!msg.message || !msg.key?.fromMe) continue
          if (!isJidGroup(msg.key?.remoteJid)) continue
          const _chkGs = msg.message?.groupStatusMessageV2 || msg.message?.groupStatusMentionMessage || msg.message?.groupMentionedMessage
            || (msg.message && (() => { try { const vals = Object.values(msg.message); for (const v of vals) { if (v?.contextInfo?.isGroupStatus) return v; } } catch {} return null; })())
          if (!_chkGs) continue
          handleJadibotSW(msg, sock, swSet, number).catch(err =>
            console.error('[JADIBOT QR APPEND SW ERROR]', err?.message || String(err))
          )
        }
      }
      return
    }
    for (const msg of messages) {
      if (!msg.message) continue
      // Blokir pesan yang dikirim oleh kode bot sendiri (ada di _botSentIds)
      // fromMe=true bisa juga dari WA user asli (multi-device) — jangan skip itu
      if (msg.key?.fromMe && sock._botSentIds?.has(msg.key?.id)) continue

      // Cache pesan + pre-download media untuk antidel
      if (msg.key?.id && !sock.cacheMsg.has(msg.key.id)) {
        sock.cacheMsg.set(msg.key.id, msg)
        setTimeout(() => sock.cacheMsg.delete(msg.key.id), 60000)
        preDownloadMediaForAntidel(msg, sock).catch(() => {})


      }

      // AutoRead SW — pakai Set terisolasi per-jadibot agar tidak bentrok dengan main bot / jadibot lain
      handleJadibotSW(msg, sock, swSet, number).catch(err =>
        console.error('[JADIBOT QR SW ERROR]', err?.message || String(err))
      )

      // Auto Typing / Auto Recording per pesan — terisolasi per-jadibot, data di data_jadibot
      try {
        const _atJid = msg.key?.remoteJid
        const _atIsGroup = _atJid?.endsWith('@g.us')
        const _atIsStatus = _atJid === 'status@broadcast'
        if (!_atIsStatus && _atJid && !msg.key?.fromMe) {
          const _atCfg = getJadibotAutoTyping(number)
          const _arCfg = getJadibotAutoRecording(number)
          const _doType = _atCfg.enabled && (_atIsGroup ? _atCfg.groupChat !== false : _atCfg.privateChat !== false)
          const _doRecord = !_doType && _arCfg.enabled && (_atIsGroup ? _arCfg.groupChat !== false : _arCfg.privateChat !== false)
          if (_doType || _doRecord) {
            const _presence = _doType ? 'composing' : 'recording'
            const _delaySec = _doType ? (_atCfg.delaySeconds || 5) : (_arCfg.delaySeconds || 5)
            try { sock.sendPresenceUpdate(_presence, _atJid) } catch {}
            setTimeout(() => { try { sock.sendPresenceUpdate('paused', _atJid) } catch {} }, Math.min(_delaySec * 1000, 30000))
          }
        }
      } catch {}

      // Auto Read Chat — private only, terisolasi per-jadibot
      try {
        const _rcJid = msg.key?.remoteJid
        const _rcIsPrivate = _rcJid && !_rcJid.endsWith('@g.us') && _rcJid !== 'status@broadcast'
        if (_rcIsPrivate && !msg.key?.fromMe) {
          if (getJadibotReadchat(number)?.enabled) {
            sock.readMessages([msg.key]).catch(() => {})
          }
        }
      } catch {}

      try {
        await getHandler('message')({ message: msg, type: 'notify' }, sock)
      } catch (err) {
        console.error('[JADIBOT QR MESSAGE ERROR]', err)
      }
    }
  })

  sock.ev.on('messages.update', updates => {
    for (const update of updates) {
      Promise.resolve(
        getHandler('antidelete')(update, sock)
      ).catch(err => console.error(`[JADIBOT QR][AntiDelete] ${number}:`, err.message))
    }
  })
}

/* ================= STOP JADIBOT ================= */
async function stopJadibot(number, sendReply) {
  number = number.replace(/[^0-9]/g, '')
  const sock = jadibotMap.get(number)
  const sessionDir = path.join(process.cwd(), 'jadibot', number)
  const sessionFile = sessionDir + '.json'

  if (!sock) {
    const hadData = fs.existsSync(sessionDir) || fs.existsSync(sessionFile) || !!getJadibotExpiry(number)
    jadibotMap.delete(number)
    pairingRequested.delete(number)
    reconnectingJadibot.delete(number)
    activeOrStartingJadibot.delete(number)
    if (pairingTimeout.has(number)) {
      clearTimeout(pairingTimeout.get(number))
      pairingTimeout.delete(number)
    }
    // Tutup socket yang mungkin masih dalam proses pairing di background
    const stuckSock = startingSocketMap.get(number)
    if (stuckSock) {
      try {
        stuckSock.ev.removeAllListeners()
        if (stuckSock.ws) stuckSock.ws.close()
      } catch {}
      startingSocketMap.delete(number)
    }
    removeJadibotExpiry(number)
    try {
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
    } catch {}
    try { if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile) } catch {}
    return await sendReply(
      hadData
        ? (
          `╔══════════════════════╗\n` +
          `║  🛑  *JADIBOT STOP*  ║\n` +
          `╚══════════════════════╝\n\n` +
          `✅ Data jadibot *${maskNumber(number)}* berhasil dibersihkan.\n` +
          `📴 Status sebelumnya tidak aktif/terputus.\n` +
          `🗑️ Sesi lama sudah dihapus.`
        )
        : (
          `╔══════════════════════╗\n` +
          `║   ❌  *GAGAL STOP*   ║\n` +
          `╚══════════════════════╝\n\n` +
          `Jadibot *${maskNumber(number)}* tidak aktif atau sudah dihentikan.`
        )
    )
  }

  stoppingJadibot.add(number)

  try {
    sock.ev.removeAllListeners()
    if (sock.ws) sock.ws.close()
  } catch {}

  jadibotMap.delete(number)
  stoppingJadibot.delete(number)
  activeOrStartingJadibot.delete(number)
  pairingRequested.delete(number)
  jadibotSwSets.delete(number)
  jadibotTrackers.delete(number)
  if (jadibotCleanerTimers.has(number)) {
    clearInterval(jadibotCleanerTimers.get(number))
    jadibotCleanerTimers.delete(number)
  }
  stopJadibotAutoOnline(number)
  stopJadibotSwPrune(number)
  if (pairingTimeout.has(number)) {
    clearTimeout(pairingTimeout.get(number))
    pairingTimeout.delete(number)
  }
  startingSocketMap.delete(number)

  setTimeout(() => {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true })
    }
    try { if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile) } catch {}
    removeJadibotExpiry(number)
  }, 500)

  await sendReply(
    `╔══════════════════════╗\n` +
    `║  🛑  *JADIBOT STOP*  ║\n` +
    `╚══════════════════════╝\n\n` +
    `✅ Jadibot *${maskNumber(number)}* berhasil dihentikan.\n` +
    `🗑️ Sesi telah dihapus.\n\n` +
    `💡 Ketik *.jadibot ${number}* untuk aktifkan kembali.`
  )
}

/* ================= PAUSE / RESUME TIMER ================= */

function pauseAllJadibotTimers() {
  const data = loadJadibotRealtimeData()
  const now = Date.now()
  let changed = false
  for (const [number, meta] of Object.entries(data.bots)) {
    if (meta.isPaused) continue
    if (meta.permanent === true) continue
    const remaining = Number(meta.expiresAt) - now
    if (remaining <= 0) continue
    data.bots[number] = {
      ...meta,
      isPaused: true,
      pausedAt: now,
      pausedRemainingMs: remaining,
    }
    changed = true
  }
  if (changed) saveJadibotRealtimeData(data)
  return changed
}

function resumeAllJadibotTimers() {
  const data = loadJadibotRealtimeData()
  const now = Date.now()
  let changed = false
  for (const [number, meta] of Object.entries(data.bots)) {
    if (meta.permanent === true) continue
    if (!meta.isPaused) continue
    const remaining = Number(meta.pausedRemainingMs) || 0
    if (remaining <= 0) {
      delete data.bots[number]
      changed = true
      continue
    }
    data.bots[number] = {
      ...meta,
      expiresAt: now + remaining,
      isPaused: false,
      pausedAt: undefined,
      pausedRemainingMs: undefined,
      updatedAt: now,
    }
    changed = true
  }
  if (changed) saveJadibotRealtimeData(data)
  return changed
}

/* ================= EXPORT ================= */
export {
  startJadibot,
  startJadibotQR,
  stopJadibot,
  jadibotMap,
  jadibotClearSesiMap,
  jadibotSesiReportMap,
  jadibotConnectedAt,
  activeOrStartingJadibot,
  pendingJadibotChoices,
  formatPairingCode,
  maskNumber,
  parseJadibotDuration,
  getJadibotExpiry,
  formatRemainingTime,
  formatJadibotExpiryTime,
  getJadibotExpirySummary,
  cleanupExpiredJadibots,
  purgeExpiredJadibotSessions,
  removeJadibotExpiry,
  setPermanentJadibot,
  ensureJadibotExpiry,
  extendJadibotExpiry,
  updateJadibotExpiryStatus,
  scheduleJadibotExpiry,
  pauseAllJadibotTimers,
  resumeAllJadibotTimers,
  restoreConnectedAtMap
}
