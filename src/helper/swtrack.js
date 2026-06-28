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
 *  swtrack.js — Tracker status WhatsApp yang diterima
 *  Statistik, filter duplikat, prune otomatis
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Status WhatsApp Tracker (SwTrack)
 *  Lacak & catat semua status WA yang masuk — filter duplikat,
 *  statistik per kontak, dan prune otomatis data lama —
 *  dipakai oleh fitur auto-read status & anti-miss retry.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { jidDecode } = _require('@whiskeysockets/baileys');

function loadConfig() {
        try {
                const configPath = path.join(process.cwd(), 'config.json');
                if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {}
        return {};
}

// ─── SwStats: data/ceksw/swstats.json ────────────────────────────────────────
export const SW_STATS_PATH = path.join(process.cwd(), 'data', 'ceksw', 'swstats.json');

const SW_TTL = 24 * 60 * 60 * 1000;

// Helper: migrate activeSW lama (array timestamps) → object {msgId: timestamp}
// Lama: [ts1, ts2, ...]  →  Baru: { "msgid-ts1": ts1, "msgid-ts2": ts2 }
// Jika sudah object, langsung kembalikan
function migrateActiveSW(activeSW) {
        if (!activeSW) return {};
        if (Array.isArray(activeSW)) {
                // Migrasi: buat synthetic key dari index agar tidak hilang data lama
                const obj = {};
                for (let i = 0; i < activeSW.length; i++) {
                        if (typeof activeSW[i] === 'number') {
                                obj[`_legacy_${i}_${activeSW[i]}`] = activeSW[i];
                        }
                }
                return obj;
        }
        if (typeof activeSW === 'object') return activeSW;
        return {};
}

// Helper: hitung jumlah activeSW yang masih dalam TTL (realtime, tanpa modifikasi)
export function countActiveSW(activeSW) {
        if (!activeSW) return 0;
        const tsNow = Date.now();
        if (Array.isArray(activeSW)) {
                return activeSW.filter(t => tsNow - t < SW_TTL).length;
        }
        if (typeof activeSW === 'object') {
                return Object.values(activeSW).filter(t => tsNow - t < SW_TTL).length;
        }
        return 0;
}

// Core writer — bisa pakai path custom (untuk jadibot) atau default (bot utama)
// msgId opsional — dipakai untuk deduplikasi (story yang sama tidak dihitung 2x)
export function updateSwStatsAt(statsPath, number, name, reacted, emoji, msgId) {
        if (!number || !statsPath) return;
        if (loadConfig().cekswTracking === false) return;
        try {
                let stats = {};
                if (fs.existsSync(statsPath)) {
                        try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8')); } catch {}
                }
                if (!stats[number]) {
                        stats[number] = { name: name || number, number, reads: 0, reactions: 0, lastSeen: null, activeSW: {} };
                }

                const entry = stats[number];
                const tsNow = Date.now();

                // Migrasi format lama (array) → format baru (object {msgId: timestamp})
                entry.activeSW = migrateActiveSW(entry.activeSW);

                // Deduplikasi: jika msgId sudah ada di activeSW (story sama diproses lagi),
                // jangan tambah reads/reactions lagi — hanya perbarui nama & lastSeen
                const swKey = msgId || `_ts_${tsNow}`;
                const alreadyCounted = msgId && (swKey in entry.activeSW);

                if (!alreadyCounted) {
                        entry.reads = (entry.reads || 0) + 1;
                        if (reacted) entry.reactions = (entry.reactions || 0) + 1;
                }

                if (name) entry.name = name;
                entry.lastSeen = new Date().toISOString();

                // Bersihkan entri expired, lalu tambahkan/update msgId ini
                for (const k of Object.keys(entry.activeSW)) {
                        if (tsNow - entry.activeSW[k] >= SW_TTL) delete entry.activeSW[k];
                }
                entry.activeSW[swKey] = tsNow;

                if (!alreadyCounted && reacted && emoji && !['❌ Gagal', '⏭️ Skip (LID belum resolve)', '❌', 'Off ❌'].includes(emoji)) {
                        if (!stats._emojiStats) stats._emojiStats = {};
                        stats._emojiStats[emoji] = (stats._emojiStats[emoji] || 0) + 1;
                }

                const dir = path.dirname(statsPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const { _emojiStats, ...users } = stats;
                const sorted = Object.fromEntries(
                        Object.entries(users).sort((a, b) => (b[1].reactions || 0) - (a[1].reactions || 0))
                );
                if (_emojiStats) sorted._emojiStats = _emojiStats;
                fs.writeFileSync(statsPath, JSON.stringify(sorted, null, 2), 'utf-8');
        } catch {}
}

// Shortcut untuk bot utama (path default)
export function updateSwStats(number, name, reacted, emoji, msgId) {
        updateSwStatsAt(SW_STATS_PATH, number, name, reacted, emoji, msgId);
}

// ─── SwStats: pruning activeSW yang expired — generik, bisa dipakai bot utama & jadibot ──
export function pruneSwStatsAt(statsPath, label) {
        if (!statsPath) return;
        try {
                if (!fs.existsSync(statsPath)) return;
                let stats = {};
                try { stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8')); } catch { return; }

                const tsNow = Date.now();
                let pruned = 0;

                const { _emojiStats, ...users } = stats;
                for (const [, entry] of Object.entries(users)) {
                        if (!entry || typeof entry !== 'object') continue;
                        // Migrasi format lama sekalian
                        entry.activeSW = migrateActiveSW(entry.activeSW);
                        const before = Object.keys(entry.activeSW).length;
                        for (const k of Object.keys(entry.activeSW)) {
                                if (tsNow - entry.activeSW[k] >= SW_TTL) delete entry.activeSW[k];
                        }
                        pruned += before - Object.keys(entry.activeSW).length;
                }

                const sorted = Object.fromEntries(
                        Object.entries(users).sort((a, b) => (b[1].reactions || 0) - (a[1].reactions || 0))
                );
                if (_emojiStats) sorted._emojiStats = _emojiStats;
                fs.writeFileSync(statsPath, JSON.stringify(sorted, null, 2), 'utf-8');

                if (pruned > 0) {
                        const _tag = label ? ` \x1b[36m[${label}]\x1b[39m` : '';
                        console.log(`\x1b[32m[SwStats]\x1b[39m${_tag} Pruned ${pruned} activeSW expired → data sekarang akurat realtime`);
                }
        } catch {}
}

// Shortcut untuk bot utama (path default)
export function pruneSwStats() {
        pruneSwStatsAt(SW_STATS_PATH, 'Bot Utama');
}

// ─── SwTrack: per-user tracking di data/swtrack/users/ ───────────────────────
export const SW_TRACK_USER_DIR = path.join(process.cwd(), 'data', 'swtrack', 'users');
export const SW_ENTRY_TTL_MS = 26 * 60 * 60 * 1000; // 26 jam

export function getSwUserPath(number) {
        if (!number) return null;
        const num = String(number).replace(/[^0-9]/g, '');
        if (!num) return null;
        if (!fs.existsSync(SW_TRACK_USER_DIR)) fs.mkdirSync(SW_TRACK_USER_DIR, { recursive: true });
        return path.join(SW_TRACK_USER_DIR, `${num}.json`);
}

export function loadSwUser(number) {
        try {
                const p = getSwUserPath(number);
                if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
        } catch {}
        return {};
}

export function saveSwUser(number, data) {
        try {
                const p = getSwUserPath(number);
                if (!p) return;
                const cutoff = Date.now() - SW_ENTRY_TTL_MS;
                const pruned = {};
                for (const [id, entry] of Object.entries(data)) {
                        if (new Date(entry.arrivedAt || 0).getTime() >= cutoff) pruned[id] = entry;
                }
                fs.writeFileSync(p, JSON.stringify(pruned, null, 2), 'utf-8');
        } catch {}
}

export function isSwUserTracked(number, msgId) {
        if (!number || !msgId) return false;
        return !!loadSwUser(number)[msgId];
}

export function isSwUserDeleted(number, msgId) {
        if (!number || !msgId) return false;
        try { return !!loadSwUser(number)[msgId]?.deleted; } catch { return false; }
}

export function markSwUserEntry(number, msgId, entry) {
        if (!number || !msgId) return;
        try {
                const data = loadSwUser(number);
                data[msgId] = { ...entry, updatedAt: new Date().toISOString() };
                saveSwUser(number, data);
        } catch {}
}

export function updateSwUserEntry(number, msgId, patch) {
        if (!number || !msgId) return;
        try {
                const data = loadSwUser(number);
                data[msgId] = { ...(data[msgId] || {}), ...patch, updatedAt: new Date().toISOString() };
                saveSwUser(number, data);
        } catch {}
}

export function getMissedSwEntries(number, excludeId) {
        try {
                const data = loadSwUser(number);
                const cutoff = Date.now() - SW_ENTRY_TTL_MS;
                return Object.values(data).filter(e => {
                        if (!e || e.id === excludeId || e.deleted) return false;
                        if (new Date(e.arrivedAt || 0).getTime() < cutoff) return false;
                        return !e.read || !e.reacted;
                });
        } catch {}
        return [];
}

export function extractSwNumber(jid) {
        if (!jid) return null;
        try { return jidDecode(jid)?.user || null; } catch { return null; }
}

// Hitung berapa story dari kontak ini yang sudah dibaca hari ini (WIB)
// userDir default = bot utama, bisa di-override untuk jadibot
export function getStoryCountToday(number, userDir = SW_TRACK_USER_DIR) {
        try {
                const num = String(number).replace(/[^0-9]/g, '');
                if (!num) return 0;
                const filePath = path.join(userDir, `${num}.json`);
                if (!fs.existsSync(filePath)) return 0;
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                // Ambil tanggal hari ini di zona WIB (UTC+7)
                const nowWib = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const todayStr = `${nowWib.getFullYear()}-${String(nowWib.getMonth()+1).padStart(2,'0')}-${String(nowWib.getDate()).padStart(2,'0')}`;
                let count = 0;
                for (const entry of Object.values(data)) {
                        if (!entry.arrivedAt) continue;
                        const entryWib = new Date(new Date(entry.arrivedAt).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                        const entryStr = `${entryWib.getFullYear()}-${String(entryWib.getMonth()+1).padStart(2,'0')}-${String(entryWib.getDate()).padStart(2,'0')}`;
                        if (entryStr === todayStr) count++;
                }
                return count;
        } catch { return 0; }
}

// ─── Factory: buat SwTracker dengan folder custom (untuk jadibot) ─────────────
// Kembalikan { isSwUserTracked, markSwUserEntry, updateSwUserEntry, getMissedSwEntries }
// yang semuanya terisolasi ke `userDir` — tidak campur dengan bot utama.
export function createSwTracker(userDir) {
        const TTL = SW_ENTRY_TTL_MS;

        function _getPath(number) {
                if (!number) return null;
                const num = String(number).replace(/[^0-9]/g, '');
                if (!num) return null;
                if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
                return path.join(userDir, `${num}.json`);
        }

        function _load(number) {
                try {
                        const p = _getPath(number);
                        if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
                } catch {}
                return {};
        }

        function _save(number, data) {
                try {
                        const p = _getPath(number);
                        if (!p) return;
                        const cutoff = Date.now() - TTL;
                        const pruned = {};
                        for (const [id, entry] of Object.entries(data)) {
                                if (new Date(entry.arrivedAt || 0).getTime() >= cutoff) pruned[id] = entry;
                        }
                        fs.writeFileSync(p, JSON.stringify(pruned, null, 2), 'utf-8');
                } catch {}
        }

        return {
                isSwUserTracked(number, msgId) {
                        if (!number || !msgId) return false;
                        return !!_load(number)[msgId];
                },
                isSwUserDeleted(number, msgId) {
                        if (!number || !msgId) return false;
                        try { return !!_load(number)[msgId]?.deleted; } catch { return false; }
                },
                markSwUserEntry(number, msgId, entry) {
                        if (!number || !msgId) return;
                        try {
                                const data = _load(number);
                                data[msgId] = { ...entry, updatedAt: new Date().toISOString() };
                                _save(number, data);
                        } catch {}
                },
                updateSwUserEntry(number, msgId, patch) {
                        if (!number || !msgId) return;
                        try {
                                const data = _load(number);
                                data[msgId] = { ...(data[msgId] || {}), ...patch, updatedAt: new Date().toISOString() };
                                _save(number, data);
                        } catch {}
                },
                getMissedSwEntries(number, excludeId) {
                        try {
                                const data = _load(number);
                                const cutoff = Date.now() - TTL;
                                return Object.values(data).filter(e => {
                                        if (!e || e.id === excludeId || e.deleted) return false;
                                        if (new Date(e.arrivedAt || 0).getTime() < cutoff) return false;
                                        return !e.read || !e.reacted;
                                });
                        } catch {}
                        return [];
                },
        };
}

// ─── Console log helper ───────────────────────────────────────────────────────
export const storyDebounce = new Map();

export function maskNumber(number) {
        if (!number) return '***';
        const clean = number.replace(/[^0-9]/g, '');
        if (clean.length <= 6) return clean;
        return clean.slice(0, 4) + '****' + clean.slice(-3);
}

function getDisplayWidth(str) {
        let width = 0;
        for (const char of str) {
                const code = char.codePointAt(0);
                if (code > 0x1F600 && code < 0x1F9FF) width += 2;
                else if (code > 0x2600 && code < 0x27BF) width += 2;
                else if (code > 0x1F300 && code < 0x1F5FF) width += 2;
                else if (code > 0x1F900 && code < 0x1F9FF) width += 2;
                else if (code > 0x2700 && code < 0x27BF) width += 2;
                else if (code > 0xFE00 && code < 0xFE0F) width += 0;
                else if (code > 0x3000 && code < 0x9FFF) width += 2;
                else if (code > 0xFF00 && code < 0xFFEF) width += 2;
                else width += 1;
        }
        return width;
}

function padEnd(str, targetWidth) {
        const currentWidth = getDisplayWidth(str);
        const padding = Math.max(0, targetWidth - currentWidth);
        return str + ' '.repeat(padding);
}

// ─── Warna tema logsw — diambil dari src/config/logsw-colors.cjs ─────────────
const { LOGSW_ANSI, LOGSW_FG, LOGSW_RANDOM_KEYS } = _require(path.join(process.cwd(), 'src', 'config', 'logsw-colors.cjs'));

// Ambil PASANGAN warna (border + nilai field) dari config.json (logsw.theme)
// Untuk theme 'random', tema dipilih sekali dan keduanya memakai tema yang sama.
function getLogswColors() {
        try {
                const cfg = loadConfig();
                let theme = (cfg?.logsw?.theme || 'default').toLowerCase().trim();
                if (theme === 'random') {
                        theme = LOGSW_RANDOM_KEYS[Math.floor(Math.random() * LOGSW_RANDOM_KEYS.length)];
                }
                return {
                        box: LOGSW_ANSI[theme] || LOGSW_ANSI.default,
                        fg:  LOGSW_FG[theme]   || LOGSW_FG.default,
                };
        } catch {
                return { box: LOGSW_ANSI.default, fg: LOGSW_FG.default };
        }
}

export function logStoryView(data) {
        const { botId, mediaType, greeting, dayName, date, time, name, number, success, reaction, delaySeconds, mode, resolve, storyCount, idStory, emojiMode } = data;
        const { box: cyan, fg } = getLogswColors(); // border & nilai field ikut tema
        const white = '\x1b[97m';                   // nama, nomor, idStory — netral
        const red   = '\x1b[31m';                   // state error (❌) saja
        const reset = '\x1b[0m';

        const boxWidth = 35;
        const labelWidth = 14;
        const contentWidth = boxWidth - labelWidth - 5;
        const title = 'AutoReadStoryWhatsApp';
        const titlePadding = Math.floor((boxWidth - title.length) / 2);

        const mediaStr = `${mediaType[0]} ${mediaType[1]}`;
        const delayStr = delaySeconds !== null ? `${delaySeconds} detik` : '-';
        const modeStr = mode === 'Off ❌' ? 'Read Only' : (mode.startsWith('Read') ? mode : 'Read+Reaction ✓');

        console.log(`${cyan}┌${'═'.repeat(boxWidth)}┐${reset}`);
        console.log(`${cyan}║${' '.repeat(titlePadding)}${fg}${title}${reset}${cyan}${' '.repeat(boxWidth - titlePadding - title.length)}║${reset}`);
        console.log(`${cyan}├${'═'.repeat(boxWidth)}┤${reset}`);
        if (botId) {
                console.log(`${cyan}│${reset} ${white}⭔ Jadibot     : ${fg}${padEnd(botId, contentWidth)}${reset}${cyan}${reset}`);
        }
        console.log(`${cyan}│${reset} ${white}⭔ Mode        : ${fg}${padEnd(modeStr, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ TipeStory   : ${fg}${padEnd(mediaStr, contentWidth)}${reset}${cyan}${reset}`);
        if (idStory) {
                const _id = String(idStory);
                const idStr = _id.length > 16 ? _id.slice(0, 8) + '···' + _id.slice(-4) : _id;
                console.log(`${cyan}│${reset} ${white}⭔ IdStory     : ${white}${padEnd(idStr, contentWidth)}${reset}${cyan}${reset}`);
        }
        console.log(`${cyan}│${reset} ${white}⭔ Selamat     : ${fg}${padEnd(greeting, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ Hari        : ${fg}${padEnd(dayName, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ Tanggal     : ${fg}${padEnd(date, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ Waktu       : ${fg}${padEnd(time, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ Nama        : ${white}${padEnd(String(name || '').slice(0, contentWidth - 2), contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ Nomor       : ${white}${padEnd(number, contentWidth)}${reset}${cyan}${reset}`);
        if (storyCount != null) {
                console.log(`${cyan}│${reset} ${white}⭔ TotalStory  : ${fg}${padEnd(String(storyCount), contentWidth)}${reset}${cyan}${reset}`);
        }
        if (emojiMode != null) {
                const _modeStr = String(emojiMode).toLowerCase() === 'custom' ? 'Custom 🟢' : 'Default 🔵';
                console.log(`${cyan}│${reset} ${white}⭔ EmojiMode   : ${fg}${padEnd(_modeStr, contentWidth)}${reset}${cyan}${reset}`);
        }
        const successColor = String(success).includes('❌') ? red : fg;
        console.log(`${cyan}│${reset} ${white}⭔ Berhasil    : ${successColor}${padEnd(success, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}│${reset} ${white}⭔ Reaksi      : ${padEnd(reaction, contentWidth)}${reset}${cyan}${reset}`);
        if (resolve) {
                const resolveColor = resolve.includes('❌') ? red : fg;
                console.log(`${cyan}│${reset} ${white}⭔ Resolve     : ${resolveColor}${padEnd(resolve, contentWidth)}${reset}${cyan}${reset}`);
        }
        console.log(`${cyan}│${reset} ${white}⭔ Delay       : ${fg}${padEnd(delayStr, contentWidth)}${reset}${cyan}${reset}`);
        console.log(`${cyan}└${'─'.repeat(13)}···${reset}`);
}

export function getMediaTypeEmoji(type) {
        const mediaTypes = {
                imageMessage: ['Foto', '📷'],
                videoMessage: ['Video', '🎥'],
                audioMessage: ['Audio', '🎵'],
                stickerMessage: ['Sticker', '🎨'],
                documentMessage: ['Dokumen', '📄'],
                extendedTextMessage: ['Teks', '📝'],
                conversation: ['Teks', '📝'],
                protocolMessage: ['Protocol', '⚙️'],
                viewOnceMessageV2: ['View Once', '👁️'],
                viewOnceMessage: ['View Once', '👁️'],
                viewOnceMessageV2Extension: ['View Once', '👁️'],
                interactiveMessage: ['Interactive', '🎯'],
                listMessage: ['List', '📋'],
                buttonsMessage: ['Buttons', '🔘'],
                templateMessage: ['Template', '📃'],
                pollCreationMessage: ['Poll', '📊'],
                reactionMessage: ['Reaction', '💬'],
                liveLocationMessage: ['Live Location', '📍'],
                locationMessage: ['Location', '📍'],
                contactMessage: ['Contact', '👤'],
                contactsArrayMessage: ['Contacts', '👥'],
        };
        return mediaTypes[type] || ['Media', '📨'];
}
