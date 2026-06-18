/**
 * ───────────────────────────────
 *  PM2 Custom Metrics Reporter
 *  Kirim data bot ke PM2 monit
 *  via IPC process.send()
 * ───────────────────────────────
 */
'use strict';

import os   from 'os';
import fs   from 'fs';
import path from 'path';

const INTERVAL_MS  = 5000;                // update metrics tiap 5 detik
const SW_TTL       = 24 * 60 * 60 * 1000; // TTL activeSW: 24 jam
const SW_STATS_PATH = path.join(process.cwd(), 'data', 'ceksw', 'swstats.json');

let _timer   = null;
let _getters = {};

// ── cache SW agar tidak baca file tiap 5 detik (refresh max tiap 10 detik) ────
let _swCache     = null;
let _swCacheTime = 0;
const SW_CACHE_TTL = 10_000;

// ── format bytes → MB ─────────────────────────────────────────────────────────
function toMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(1);
}

// ── format uptime dari ms ──────────────────────────────────────────────────────
function fmtUptime(ms) {
    if (!ms || ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0)  return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0)  return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0)  return `${m}m ${s % 60}s`;
    return `${s}s`;
}

// ── WA readyState → label ──────────────────────────────────────────────────────
function wsLabel(state) {
    const MAP = { 0: 'CONNECTING', 1: 'ONLINE', 2: 'CLOSING', 3: 'OFFLINE' };
    return MAP[state] ?? 'UNKNOWN';
}

// ── baca & hitung SW stats dari swstats.json (dengan cache 10 detik) ──────────
function getSwStats() {
    const now = Date.now();
    if (_swCache && now - _swCacheTime < SW_CACHE_TTL) return _swCache;

    const result = {
        totalUsers  : 0,
        totalReads  : 0,
        totalReacts : 0,
        activeNow   : 0,   // lihat story dalam 24 jam terakhir
        topEmoji    : '-',
    };

    try {
        if (!fs.existsSync(SW_STATS_PATH)) return result;
        const raw = fs.readFileSync(SW_STATS_PATH, 'utf-8');
        const data = JSON.parse(raw);
        const { _emojiStats, ...users } = data;

        for (const entry of Object.values(users)) {
            if (!entry || typeof entry !== 'object') continue;
            result.totalUsers++;
            result.totalReads  += (entry.reads     || 0);
            result.totalReacts += (entry.reactions || 0);

            // cek apakah user punya activeSW dalam TTL
            const sw = entry.activeSW;
            if (sw && typeof sw === 'object') {
                const active = Object.values(sw).some(t => now - t < SW_TTL);
                if (active) result.activeNow++;
            }
        }

        // emoji paling banyak dipakai
        if (_emojiStats && typeof _emojiStats === 'object') {
            const top = Object.entries(_emojiStats).sort((a, b) => b[1] - a[1])[0];
            if (top) result.topEmoji = `${top[0]} (${top[1]}x)`;
        }
    } catch (_) {}

    _swCache     = result;
    _swCacheTime = now;
    return result;
}

// ── kirim ke PM2 daemon via IPC ────────────────────────────────────────────────
function sendMetrics(data) {
    if (typeof process.send !== 'function') return;
    try { process.send({ type: 'axm:monitor', data }); } catch (_) {}
}

// ── kumpulkan semua data dan kirim ────────────────────────────────────────────
function collect() {
    const mem  = process.memoryUsage();
    const load = os.loadavg();
    const cpus = os.cpus().length;
    const free = os.freemem();
    const tot  = os.totalmem();
    const sw   = getSwStats();

    // getter helpers
    const g = (fn) => typeof fn === 'function' ? fn() : '-';

    const botUptime   = g(_getters.getUptime);
    const restarts    = g(_getters.getRestarts);
    const groups      = g(_getters.getGroups);
    const jadibot     = g(_getters.getJadibot);
    const waState     = g(_getters.getWsState);
    const sessionName = g(_getters.getSession);
    const cmdTotal    = g(_getters.getCmdTotal);
    const owner       = g(_getters.getOwner);

    const data = {
        // ── Bot Identity ───────────────────────────────────────────────────────
        'Session'         : { value: sessionName,           unit: '',     type: 'metric' },
        'Owner'           : { value: owner,                 unit: '',     type: 'metric' },
        'WA Status'       : { value: wsLabel(waState),      unit: '',     type: 'metric' },

        // ── Bot Activity ───────────────────────────────────────────────────────
        'Bot Uptime'      : { value: fmtUptime(botUptime),  unit: '',     type: 'metric' },
        'Bot Restarts'    : { value: restarts,              unit: '',     type: 'metric' },
        'Groups'          : { value: groups,                unit: 'grup', type: 'metric' },
        'Jadibot Active'  : { value: jadibot,               unit: 'sesi', type: 'metric' },
        'Cmd Total'       : { value: cmdTotal,              unit: 'cmd',  type: 'metric' },

        // ── SW / ReadSW Stats (realtime dari swstats.json) ─────────────────────
        'SW Users'        : { value: sw.totalUsers,         unit: 'user', type: 'metric' },
        'SW Reads'        : { value: sw.totalReads,         unit: 'kali', type: 'metric' },
        'SW Reaksi'       : { value: sw.totalReacts,        unit: 'kali', type: 'metric' },
        'SW Aktif 24j'    : { value: sw.activeNow,          unit: 'user', type: 'metric' },
        'SW Top Emoji'    : { value: sw.topEmoji,           unit: '',     type: 'metric' },

        // ── Process Memory ─────────────────────────────────────────────────────
        'RSS'             : { value: toMB(mem.rss),         unit: 'MB',   type: 'metric' },
        'Ext Memory'      : { value: toMB(mem.external),    unit: 'MB',   type: 'metric' },

        // ── System Resources ───────────────────────────────────────────────────
        'OS Load 1m'      : { value: load[0].toFixed(2),    unit: '',     type: 'metric' },
        'OS Load 5m'      : { value: load[1].toFixed(2),    unit: '',     type: 'metric' },
        'CPU Cores'       : { value: cpus,                  unit: 'core', type: 'metric' },
        'Free RAM'        : { value: toMB(free),            unit: 'MB',   type: 'metric' },
        'Total RAM'       : { value: toMB(tot),             unit: 'MB',   type: 'metric' },
    };

    sendMetrics(data);
}

// ── PUBLIC: mulai metrics reporter ────────────────────────────────────────────
/**
 * @param {object} getters
 *   getUptime()    → ms (bot uptime dari botStats)
 *   getRestarts()  → number
 *   getGroups()    → number (grup aktif)
 *   getJadibot()   → number (jadibot aktif)
 *   getWsState()   → WebSocket readyState (0-3)
 *   getSession()   → string (nama sesi)
 *   getCmdTotal()  → string|number (total perintah)
 *   getOwner()     → string (nomor owner)
 */
export function startPm2Metrics(getters = {}) {
    if (typeof process.send !== 'function') return; // bukan child PM2, skip

    _getters = getters;
    collect(); // kirim langsung saat pertama kali

    if (_timer) clearInterval(_timer);
    _timer = setInterval(collect, INTERVAL_MS);
    _timer.unref(); // tidak halangi proses exit
}

export function stopPm2Metrics() {
    if (_timer) { clearInterval(_timer); _timer = null; }
}
