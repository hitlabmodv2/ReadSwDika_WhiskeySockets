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
 *  pm2Metrics.js — Reporter metrik custom ke PM2 monit
 *  Kirim data memory, uptime, cmd count via IPC process.send()
 * ───────────────────────────────
 */
'use strict';

import os from 'os';

const INTERVAL_MS = 5000; // update tiap 5 detik
let _timer        = null;
let _getters      = {};

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
    // WebSocket states: 0=CONNECTING 1=OPEN 2=CLOSING 3=CLOSED
    const MAP = { 0: 'CONNECTING', 1: 'ONLINE', 2: 'CLOSING', 3: 'OFFLINE' };
    return MAP[state] ?? 'UNKNOWN';
}

// ── kirim ke PM2 daemon ────────────────────────────────────────────────────────
function sendMetrics(data) {
    if (typeof process.send !== 'function') return; // bukan child PM2
    try {
        process.send({ type: 'axm:monitor', data });
    } catch (_) {}
}

// ── kumpulkan semua data dan kirim ────────────────────────────────────────────
function collect() {
    const mem   = process.memoryUsage();
    const load  = os.loadavg();
    const cpus  = os.cpus().length;
    const free  = os.freemem();
    const total = os.totalmem();

    // ── data dari getter (diisi waktu startPm2Metrics dipanggil) ───────────────
    const botUptime   = typeof _getters.getUptime      === 'function' ? _getters.getUptime()      : 0;
    const restarts    = typeof _getters.getRestarts    === 'function' ? _getters.getRestarts()    : 0;
    const groups      = typeof _getters.getGroups      === 'function' ? _getters.getGroups()      : 0;
    const jadibot     = typeof _getters.getJadibot     === 'function' ? _getters.getJadibot()     : 0;
    const waState     = typeof _getters.getWsState     === 'function' ? _getters.getWsState()     : -1;
    const sessionName = typeof _getters.getSession     === 'function' ? _getters.getSession()     : '-';
    const cmdTotal    = typeof _getters.getCmdTotal    === 'function' ? _getters.getCmdTotal()    : '-';
    const owner       = typeof _getters.getOwner       === 'function' ? _getters.getOwner()       : '-';

    const data = {
        // ── Bot Identity ───────────────────────────────────────────────────────
        'Session'       : { value: sessionName,          unit: '',    type: 'metric' },
        'Owner'         : { value: owner,                unit: '',    type: 'metric' },
        'WA Status'     : { value: wsLabel(waState),     unit: '',    type: 'metric' },

        // ── Bot Activity ───────────────────────────────────────────────────────
        'Bot Uptime'    : { value: fmtUptime(botUptime), unit: '',    type: 'metric' },
        'Bot Restarts'  : { value: restarts,             unit: '',    type: 'metric' },
        'Groups'        : { value: groups,               unit: '',    type: 'metric' },
        'Jadibot Active': { value: jadibot,              unit: '',    type: 'metric' },
        'Cmd Total'     : { value: cmdTotal,             unit: 'cmd', type: 'metric' },

        // ── Process Memory ─────────────────────────────────────────────────────
        'RSS'           : { value: toMB(mem.rss),        unit: 'MB',  type: 'metric' },
        'Ext Memory'    : { value: toMB(mem.external),   unit: 'MB',  type: 'metric' },

        // ── System Resources ───────────────────────────────────────────────────
        'OS Load 1m'    : { value: load[0].toFixed(2),   unit: '',    type: 'metric' },
        'OS Load 5m'    : { value: load[1].toFixed(2),   unit: '',    type: 'metric' },
        'CPU Cores'     : { value: cpus,                 unit: 'core',type: 'metric' },
        'Free RAM'      : { value: toMB(free),           unit: 'MB',  type: 'metric' },
        'Total RAM'     : { value: toMB(total),          unit: 'MB',  type: 'metric' },
    };

    sendMetrics(data);
}

// ── PUBLIC: mulai metrics reporter ────────────────────────────────────────────
/**
 * @param {object} getters
 *   getUptime()    → ms number (bot uptime dari botStats)
 *   getRestarts()  → number
 *   getGroups()    → number (grup aktif)
 *   getJadibot()   → number (jadibot aktif)
 *   getWsState()   → WebSocket readyState (0-3)
 *   getSession()   → string (nama sesi)
 *   getCmdTotal()  → string|number (total perintah dari config)
 *   getOwner()     → string (nomor owner)
 */
export function startPm2Metrics(getters = {}) {
    if (typeof process.send !== 'function') return; // bukan env PM2, skip

    _getters = getters;

    // kirim langsung saat pertama kali
    collect();

    // hentikan timer lama jika ada
    if (_timer) clearInterval(_timer);
    _timer = setInterval(collect, INTERVAL_MS);
    _timer.unref(); // tidak halangi proses exit
}

export function stopPm2Metrics() {
    if (_timer) { clearInterval(_timer); _timer = null; }
}
