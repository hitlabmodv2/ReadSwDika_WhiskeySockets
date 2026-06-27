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
 *  antilink.js — Anti-Link di Grup
 *  Blokir link apapun di grup, sistem warn+kick otomatis
 * ───────────────────────────────
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { isJidGroup, jidNormalizedUser, areJidsSameUser, jidDecode, getContentType } = _require('@whiskeysockets/baileys');

import { kvGet, kvSet } from '../../src/db/datadb.js';

// Set global untuk menandai pesan yang dihapus oleh antilink
// agar anti-delete tidak mengirim notifikasi "PESAN DIHAPUS"
if (!global.__antiLinkDeletedIds) global.__antiLinkDeletedIds = new Set();

// ─── Regex deteksi link ───────────────────────────────────────────────────────
// Mendeteksi URL http/https, www, wa.me, dan domain umum
const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|id|co|io|me|info|biz|tv|online|site|web|app|shop|store|link|cc|to|ly|gg|lol|wtf|xyz|top|pro|live|news|tech|digital|media|click|page|space|chat|group|chat|my|asia|be|in|us|uk|de|fr|ru|jp|au|ca|it|es|br|nl|pl|se|no|fi|dk|sg|ph|vn|th|my|hk|tw|nz|za|ae|tr|mx|ar|cl|pe|eg|ng|ke|gh|tz|ug|rw|et|ci|sn|ml|mg|mz|zm|zw|bw|na|ls|sz|mw|sc|mu|cv|gq|km|mr|td|ly|tn|dz|ma|eh|sd|er|dj|so|ss|cf|cm|cg|cd|ao|ga|gn|gw|sl|lr|bf|ne|ni|ml|sn|tz|bi|rw|ug|ke|et|mz|zm|zw|bw|na|mg|mu|sc|km|cv|mr|td|ly|tn|dz|ma|so|ci|gh|ng|cm|cd|cg|ao|sl|lr|bf|ne|gn|gw|gq|er|dj|ss|cf|sd|eg|za|ls|sz|mw|sc)\b(?:[\/\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/gi;

// ─── Tipe pesan yang bisa mengandung link ─────────────────────────────────────
const TEXT_MSG_TYPES = [
    'conversation',
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'documentMessage',
    'documentWithCaptionMessage',
    'audioMessage',
    'stickerMessage',
    'buttonsMessage',
    'listMessage',
    'templateMessage',
];

function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        }
    } catch (_) {}
    return {};
}

function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
        console.error('\x1b[31m[AntiLink] Gagal simpan config:\x1b[39m', err.message);
    }
}

function loadData() {
    return kvGet('security/antilink', { groups: [], warnings: {} });
}

function saveData(data) {
    try {
        kvSet('security/antilink', data);
    } catch (err) {
        console.error('\x1b[31m[AntiLink] Gagal simpan data:\x1b[39m', err.message);
    }
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function isAntiLinkEnabled(groupId) {
    const data = loadData();
    return Array.isArray(data.groups) && data.groups.includes(groupId);
}

export function toggleAntiLink(groupId, enable) {
    const data = loadData();
    if (!Array.isArray(data.groups)) data.groups = [];
    if (!data.warnings) data.warnings = {};
    if (enable) {
        if (!data.groups.includes(groupId)) data.groups.push(groupId);
    } else {
        data.groups = data.groups.filter(g => g !== groupId);
        // Reset warning untuk grup ini
        if (data.warnings[groupId]) delete data.warnings[groupId];
    }
    saveData(data);
}

export function getAntiLinkWarnings(groupId) {
    const data = loadData();
    return (data.warnings || {})[groupId] || {};
}

export function resetAntiLinkWarnings(groupId) {
    const data = loadData();
    if (!data.warnings) data.warnings = {};
    if (groupId) {
        delete data.warnings[groupId];
    } else {
        data.warnings = {};
    }
    saveData(data);
}

export function getAllAntiLinkGroups() {
    const data = loadData();
    return Array.isArray(data.groups) ? data.groups : [];
}

// ─── Log ──────────────────────────────────────────────────────────────────────

const _LOG_KEY = 'security/antilink_log';
const _LOG_MAX = 500;

function appendLog(entry) {
    try {
        const logs = kvGet(_LOG_KEY, []);
        logs.push(entry);
        if (logs.length > _LOG_MAX) logs.splice(0, logs.length - _LOG_MAX);
        kvSet(_LOG_KEY, logs);
    } catch (_) {}
}

export function getAntiLinkLog(groupId) {
    try {
        const logs = kvGet(_LOG_KEY, []);
        return groupId ? logs.filter(l => l.gid === groupId) : logs;
    } catch (_) { return []; }
}

export function clearAntiLinkLog(groupId) {
    try {
        if (!groupId) { kvSet(_LOG_KEY, []); return; }
        const logs = kvGet(_LOG_KEY, []);
        kvSet(_LOG_KEY, logs.filter(l => l.gid !== groupId));
    } catch (_) {}
}

// ─── Ambil teks dari berbagai tipe pesan ──────────────────────────────────────
function extractText(message) {
    if (!message?.message) return '';
    const msg = message.message;
    const msgType = getContentType(msg);
    if (!msgType) return '';

    const inner = msg[msgType] || {};

    if (msgType === 'conversation') return inner || '';
    if (msgType === 'extendedTextMessage') return inner.text || '';
    if (['imageMessage', 'videoMessage', 'documentMessage', 'documentWithCaptionMessage', 'audioMessage'].includes(msgType)) {
        return inner.caption || '';
    }
    if (msgType === 'buttonsMessage') return inner.contentText || inner.footerText || '';
    if (msgType === 'listMessage') return inner.description || inner.title || '';
    if (msgType === 'templateMessage') {
        return inner.hydratedTemplate?.hydratedContentText || inner.hydratedFourRowTemplate?.hydratedContentText || '';
    }
    return '';
}

function detectLink(text) {
    if (!text || typeof text !== 'string') return false;
    LINK_REGEX.lastIndex = 0;
    return LINK_REGEX.test(text);
}

function extractLinks(text) {
    if (!text || typeof text !== 'string') return [];
    LINK_REGEX.lastIndex = 0;
    return text.match(LINK_REGEX) || [];
}

// ─── Helper admin ─────────────────────────────────────────────────────────────
function findParticipant(participants, targetNumber) {
    return participants?.find(p => {
        const rawJid = p.jid || p.phoneNumber || p.id || '';
        const pNum = rawJid.split('@')[0].split(':')[0];
        return pNum === targetNumber;
    });
}

function loadBotAdminFile() {
    return kvGet('botadmin/botadmin', {});
}

function saveBotAdminFile(data) {
    try { kvSet('botadmin/botadmin', data); } catch (_) {}
}

function isOwnerJid(senderJid, senderNumber, config) {
    const owners = (config.owners || []);
    const ownerJids = owners.map(o => o + '@s.whatsapp.net');
    return ownerJids.some(o => areJidsSameUser(o, senderJid)) ||
        owners.some(o => senderNumber === o);
}

// ─── Statistik grup ───────────────────────────────────────────────────────────
function buildGroupStats(groupMeta, newWarn, maxWarnings) {
    const participants = groupMeta?.participants || [];
    const totalMembers = participants.length;
    const totalAdmins = participants.filter(p => p.admin).length;
    const totalMembers_ = totalMembers - totalAdmins;

    const filled = '◆'.repeat(Math.min(newWarn, maxWarnings));
    const empty = '◇'.repeat(Math.max(maxWarnings - newWarn, 0));
    const warnBar = filled + empty;

    const adminPct = totalMembers > 0 ? Math.round((totalAdmins / totalMembers) * 10) : 0;
    const memberPct = 10 - adminPct;
    const adminBar = '█'.repeat(adminPct) + '░'.repeat(memberPct);

    return { totalMembers, totalAdmins, totalMembers_, warnBar, adminBar, adminPct: totalMembers > 0 ? Math.round((totalAdmins / totalMembers) * 100) : 0 };
}

// ─── Format waktu ─────────────────────────────────────────────────────────────
function getWaktuStr() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
    return { timeStr, dateStr };
}

// ═══════════════════════════════════════════════════════════════
//  Handler Utama — Auto-deteksi link di setiap pesan grup
// ═══════════════════════════════════════════════════════════════
export default async function handleAntiLink(message, hisoka) {
    try {
        if (!message?.key?.remoteJid) return;
        if (!message.message) return;

        const remoteJid = message.key.remoteJid;
        if (!isJidGroup(remoteJid)) return;
        if (message.key?.fromMe) return;

        // Cek tipe pesan
        const msgType = getContentType(message.message);
        if (!msgType) return;
        if (!TEXT_MSG_TYPES.includes(msgType)) return;

        // Ambil teks
        const text = extractText(message);
        if (!text) return;

        // Cek apakah ada link
        if (!detectLink(text)) return;

        // Cek config global
        const config = loadConfig();
        const antiLinkConfig = config.antiLink || {};
        if (!antiLinkConfig.enabled) return;

        // Cek apakah grup ini mengaktifkan antilink
        const data = loadData();
        if (!Array.isArray(data.groups) || !data.groups.includes(remoteJid)) return;

        const senderJid = jidNormalizedUser(
            message.key.participant || message.participant || message.key.remoteJid
        );
        if (!senderJid) return;

        const isLid = senderJid.includes('@lid');
        const senderNumber = isLid ? '[LID]' : (jidDecode(senderJid)?.user || senderJid.split('@')[0] || '');

        // Skip owner
        if (isOwnerJid(senderJid, senderNumber, config)) return;

        // Skip bot sendiri
        const botJid = jidNormalizedUser(hisoka.user?.id || '');
        if (areJidsSameUser(senderJid, botJid)) return;

        const botNumber = botJid.split('@')[0];
        const senderNumberClean = senderJid.split('@')[0];

        // Cek apakah bot admin — realtime dari groupMetadata, fallback ke cache file
        let groupMeta = null;
        let isAdmin = false;
        try {
            groupMeta = await hisoka.groupMetadata(remoteJid);
            if (groupMeta) hisoka.groups?.write(remoteJid, groupMeta);
            const botP = findParticipant(groupMeta?.participants, botNumber);
            isAdmin = !!botP?.admin;
            // Update cache botadmin
            const botAdminData = loadBotAdminFile();
            botAdminData[remoteJid] = isAdmin;
            saveBotAdminFile(botAdminData);
        } catch (_) {
            const botAdminData = loadBotAdminFile();
            if (remoteJid in botAdminData) isAdmin = botAdminData[remoteJid] === true;
            groupMeta = hisoka.groups?.read(remoteJid) || null;
            if (groupMeta) {
                const botP = findParticipant(groupMeta?.participants, botNumber);
                isAdmin = !!botP?.admin;
            }
        }

        // Cek apakah pengirim admin grup — admin diizinkan kirim link
        if (groupMeta?.participants) {
            const senderParticipant = findParticipant(groupMeta.participants, senderNumberClean);
            if (senderParticipant?.admin) {
                // Admin boleh kirim link — skip
                return;
            }
        }

        const links = extractLinks(text);
        const linkPreview = links.length > 0 ? links[0].slice(0, 60) + (links[0].length > 60 ? '…' : '') : '-';

        console.log(`\x1b[33m[AntiLink] Terdeteksi! Sender: ${senderNumber} | BotAdmin: ${isAdmin} | Link: ${linkPreview}\x1b[39m`);

        if (!isAdmin) {
            console.log('\x1b[33m[AntiLink] Bot bukan admin, hanya kirim peringatan (tanpa hapus/kick).\x1b[39m');
        }

        // Update warning
        const freshData = loadData();
        if (!freshData.warnings) freshData.warnings = {};
        if (!freshData.warnings[remoteJid]) freshData.warnings[remoteJid] = {};
        if (!freshData.warnings[remoteJid][senderJid]) freshData.warnings[remoteJid][senderJid] = 0;
        freshData.warnings[remoteJid][senderJid] += 1;

        const newWarn = freshData.warnings[remoteJid][senderJid];
        const maxWarnings = antiLinkConfig.maxWarnings ?? 3;
        saveData(freshData);

        // Catat log
        appendLog({
            gid: remoteJid,
            senderJid,
            senderNum: senderNumber,
            action: newWarn >= maxWarnings ? 'kick' : 'warn',
            warnCount: newWarn,
            maxWarn: maxWarnings,
            link: linkPreview,
            ts: Date.now(),
        });

        const { timeStr, dateStr } = getWaktuStr();
        const stats = buildGroupStats(groupMeta, newWarn, maxWarnings);

        const _pelanggarLabel = isLid
            ? `👤 *Pelanggar* ﹕_(ID tidak dikenal / akun privat)_\n`
            : `👤 *Pelanggar* ﹕@${senderNumber}\n`;
        const _mentionList = isLid ? [] : [senderJid];

        if (newWarn >= maxWarnings) {
            // Reset warning setelah max tercapai
            delete freshData.warnings[remoteJid][senderJid];
            saveData(freshData);

            const kickStatusLine = isAdmin
                ? `💥 *Status*    ﹕ Telah di-*KICK* dari grup!`
                : `⚠️ *Bot bukan admin* — tidak bisa kick!\n💡 Jadikan bot admin agar bisa kick otomatis.`;

            const kickMsg =
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
                `✦ 🔗 *ANTI-LINK* 🔗 ✦\n` +
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
                `\n` +
                _pelanggarLabel +
                `🕐 *Waktu*     ﹕${timeStr} • ${dateStr}\n` +
                `🔗 *Link*      ﹕\`${linkPreview}\`\n` +
                `\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  📊 *STATISTIK GRUP*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `👥 *Total Member*  ﹕ ${stats.totalMembers} orang\n` +
                `🛡️ *Total Admin*   ﹕ ${stats.totalAdmins} orang\n` +
                `🙋 *Member Biasa* ﹕ ${stats.totalMembers_} orang\n` +
                `📈 *Rasio Admin*   ﹕ ${stats.adminPct}%\n` +
                `     [${stats.adminBar}]\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  ⚠️ *PELANGGARAN*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `🚫 Mengirim *link* di grup!\n` +
                `\n` +
                `🔴 *Peringatan* ﹕ ◆◆◆ ${maxWarnings}/${maxWarnings}\n` +
                `${kickStatusLine}\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `\n` +
                `_Dilarang menyebarkan link sembarangan di grup ini!_ 😤`;

            await hisoka.sendMessage(remoteJid, {
                text: kickMsg,
                contextInfo: { mentionedJid: _mentionList }
            }, { quoted: message });

            if (isAdmin) {
                // Tandai ID agar anti-delete tidak notif "PESAN DIHAPUS"
                global.__antiLinkDeletedIds.add(message.key.id);
                setTimeout(() => global.__antiLinkDeletedIds.delete(message.key.id), 10000);

                // Hapus pesan link
                try {
                    await hisoka.sendMessage(remoteJid, {
                        delete: {
                            remoteJid,
                            fromMe: false,
                            id: message.key.id,
                            participant: message.key.participant
                        }
                    });
                } catch (delErr) {
                    console.error('\x1b[31m[AntiLink] Gagal hapus pesan:\x1b[39m', delErr.message);
                }

                // Kick member
                try {
                    await hisoka.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
                    console.log(`\x1b[31m[AntiLink] ✓ Kicked ${senderNumber} dari ${remoteJid}\x1b[39m`);
                } catch (kickErr) {
                    console.error('\x1b[31m[AntiLink] Gagal kick:\x1b[39m', kickErr.message);
                    await hisoka.sendMessage(remoteJid, {
                        text: `❌ Gagal kick ${isLid ? '_(ID tidak dikenal / LID)_' : '@' + senderNumber}. Pastikan bot adalah admin grup.`,
                        contextInfo: { mentionedJid: _mentionList }
                    });
                }
            }
        } else {
            const deleteInfo = isAdmin
                ? `🗑️ *Pesan*     ﹕ Telah dihapus otomatis.\n`
                : `⚠️ *Pesan*     ﹕ Bot bukan admin, tidak bisa hapus.\n`;

            const nextWarnInfo = (newWarn >= maxWarnings - 1)
                ? `⚡ *Peringatan berikutnya = KICK otomatis!*`
                : `💡 Sisa *${maxWarnings - newWarn}x* lagi sebelum di-kick!`;

            const warnMsg =
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
                `✦ ⚠️ *ANTI-LINK* ⚠️ ✦\n` +
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
                `\n` +
                _pelanggarLabel +
                `🕐 *Waktu*     ﹕${timeStr} • ${dateStr}\n` +
                `🔗 *Link*      ﹕\`${linkPreview}\`\n` +
                `${deleteInfo}` +
                `\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  📊 *STATISTIK GRUP*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `👥 *Total Member*  ﹕ ${stats.totalMembers} orang\n` +
                `🛡️ *Total Admin*   ﹕ ${stats.totalAdmins} orang\n` +
                `🙋 *Member Biasa* ﹕ ${stats.totalMembers_} orang\n` +
                `📈 *Rasio Admin*   ﹕ ${stats.adminPct}%\n` +
                `     [${stats.adminBar}]\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  ⚠️ *PERINGATAN ke-${newWarn}/${maxWarnings}*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `🚫 Mengirim *link* di grup!\n` +
                `\n` +
                `🟡 *Warn* ﹕ [${stats.warnBar}] ${newWarn}/${maxWarnings}\n` +
                `${nextWarnInfo}\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `\n` +
                `_Dilarang mengirim link sembarangan di grup ini!_ 🚫`;

            await hisoka.sendMessage(remoteJid, {
                text: warnMsg,
                contextInfo: { mentionedJid: _mentionList }
            }, { quoted: message });

            if (isAdmin) {
                // Tandai ID agar anti-delete tidak notif
                global.__antiLinkDeletedIds.add(message.key.id);
                setTimeout(() => global.__antiLinkDeletedIds.delete(message.key.id), 10000);

                // Hapus pesan link
                try {
                    await hisoka.sendMessage(remoteJid, {
                        delete: {
                            remoteJid,
                            fromMe: false,
                            id: message.key.id,
                            participant: message.key.participant
                        }
                    });
                } catch (delErr) {
                    console.error('\x1b[31m[AntiLink] Gagal hapus pesan:\x1b[39m', delErr.message);
                }
            }
        }
    } catch (err) {
        console.error('\x1b[31m[AntiLink] Error:\x1b[39m', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
//  Command Handler — .antilink on/off/status/reset/list/warn/log
// ═══════════════════════════════════════════════════════════════
export async function handleAntilink({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig: _lc, saveConfig: _sc }) {
    const lc = _lc || loadConfig;
    const sc = _sc || saveConfig;

    if (!m.isGroup) return tolak(hisoka, m, '❌ Perintah ini hanya bisa digunakan di dalam *grup*!');

    const isAdminOrOwner = m.isAdmin || m.isOwner;
    const sub = (query || '').trim().toLowerCase();
    const subParts = sub.split(/\s+/);
    const subCmd = subParts[0] || '';

    // ── .antilink global on/off — khusus owner ────────────────────────────────
    if (subCmd === 'global') {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah global hanya untuk *Owner bot*!');
        const act = subParts[1] || '';
        const config = lc();
        if (!config.antiLink) config.antiLink = {};

        if (act === 'on') {
            config.antiLink.enabled = true;
            sc(config);
            logCommand(m, hisoka, 'antilink global on');
            return tolak(hisoka, m,
                `╭───〔 *✅ ANTI-LINK GLOBAL* 〕───╮\n` +
                `│\n` +
                `│ 🟢 Anti-Link *diaktifkan* secara global!\n` +
                `│\n` +
                `│ ℹ️ Setiap grup yang terdaftar akan\n` +
                `│    otomatis aktif mendeteksi link.\n` +
                `│\n` +
                `│ 💡 Aktifkan per grup: *.antilink on*\n` +
                `│\n` +
                `╰────────────────────────────────────╯`
            );
        } else if (act === 'off') {
            config.antiLink.enabled = false;
            sc(config);
            logCommand(m, hisoka, 'antilink global off');
            return tolak(hisoka, m,
                `╭───〔 *🔴 ANTI-LINK GLOBAL* 〕───╮\n` +
                `│\n` +
                `│ 🔴 Anti-Link *dinonaktifkan* secara global!\n` +
                `│\n` +
                `│ ⚠️ Semua grup tidak akan mendeteksi\n` +
                `│    link sampai global aktif kembali.\n` +
                `│\n` +
                `╰────────────────────────────────────╯`
            );
        } else {
            return tolak(hisoka, m, `❌ Format salah!\nGunakan: *.antilink global on* atau *.antilink global off*`);
        }
    }

    // ── .antilink warn <n> — khusus owner ────────────────────────────────────
    if (subCmd === 'warn' && subParts[1]) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk *Owner bot*!');
        const n = parseInt(subParts[1], 10);
        if (isNaN(n) || n < 1 || n > 20) return tolak(hisoka, m, `❌ Angka warning tidak valid!\nGunakan antara *1-20*. Contoh: *.antilink warn 3*`);
        const config = lc();
        if (!config.antiLink) config.antiLink = {};
        config.antiLink.maxWarnings = n;
        sc(config);
        logCommand(m, hisoka, `antilink warn ${n}`);
        return tolak(hisoka, m,
            `╭───〔 *⚙️ ANTI-LINK WARN* 〕───╮\n` +
            `│\n` +
            `│ ✅ Maks. warning diset ke *${n}x*!\n` +
            `│\n` +
            `│ ℹ️ Member akan di-kick setelah\n` +
            `│    mengirim link sebanyak ${n}x.\n` +
            `│\n` +
            `╰────────────────────────────────────╯`
        );
    }

    // ── Perintah yang butuh admin/owner ──────────────────────────────────────
    if (!isAdminOrOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk *Admin grup* atau *Owner bot*!');

    // Cek status bot admin secara realtime
    const botJid = jidNormalizedUser(hisoka.user?.id || '');
    const botNumber = botJid.split('@')[0];
    let botIsAdmin = false;
    try {
        const meta = await hisoka.groupMetadata(m.from);
        const botP = findParticipant(meta?.participants, botNumber);
        botIsAdmin = !!botP?.admin;
        // Update cache
        const bad = loadBotAdminFile();
        bad[m.from] = botIsAdmin;
        saveBotAdminFile(bad);
    } catch (_) {
        const bad = loadBotAdminFile();
        botIsAdmin = bad[m.from] === true;
    }

    const config = lc();
    const antiLinkConfig = config.antiLink || {};
    const globalEnabled = antiLinkConfig.enabled ?? false;
    const maxWarnings = antiLinkConfig.maxWarnings ?? 3;

    // ── .antilink on ─────────────────────────────────────────────────────────
    if (subCmd === 'on' || subCmd === '') {
        if (!globalEnabled) {
            return tolak(hisoka, m,
                `╭───〔 *⚠️ ANTI-LINK* 〕───╮\n` +
                `│\n` +
                `│ ❌ Anti-Link *belum aktif secara global*!\n` +
                `│\n` +
                `│ 💡 Minta owner aktifkan dulu:\n` +
                `│    *.antilink global on*\n` +
                `│\n` +
                `╰────────────────────────────────────╯`
            );
        }
        if (!botIsAdmin) {
            return tolak(hisoka, m,
                `╭───〔 *⚠️ ANTI-LINK* 〕───╮\n` +
                `│\n` +
                `│ ⚠️ Bot *bukan admin* di grup ini!\n` +
                `│\n` +
                `│ 💡 Jadikan bot *admin* terlebih dahulu\n` +
                `│    agar bisa hapus pesan & kick member.\n` +
                `│\n` +
                `│ ℹ️ Anti-Link tetap bisa diaktifkan,\n` +
                `│    tapi hanya kirim peringatan saja.\n` +
                `│\n` +
                `╰────────────────────────────────────╯`
            );
        }
        toggleAntiLink(m.from, true);
        logCommand(m, hisoka, 'antilink on');
        return tolak(hisoka, m,
            `╭───〔 *✅ ANTI-LINK ON* 〕───╮\n` +
            `│\n` +
            `│ 🟢 Anti-Link *diaktifkan* di grup ini!\n` +
            `│\n` +
            `│ ⚙️ Konfigurasi:\n` +
            `│ • Maks. warning : *${maxWarnings}x*\n` +
            `│ • Setelah ${maxWarnings}x warn → *KICK otomatis*\n` +
            `│\n` +
            `│ ℹ️ Link yang dikirim member akan:\n` +
            `│    🗑️ Dihapus otomatis\n` +
            `│    ⚠️ Dapat peringatan (warn)\n` +
            `│    💥 Di-kick setelah ${maxWarnings}x pelanggaran\n` +
            `│\n` +
            `│ 👑 Admin grup bebas kirim link.\n` +
            `│\n` +
            `╰────────────────────────────────────╯`
        );
    }

    // ── .antilink off ────────────────────────────────────────────────────────
    if (subCmd === 'off') {
        toggleAntiLink(m.from, false);
        logCommand(m, hisoka, 'antilink off');
        return tolak(hisoka, m,
            `╭───〔 *🔴 ANTI-LINK OFF* 〕───╮\n` +
            `│\n` +
            `│ 🔴 Anti-Link *dinonaktifkan* di grup ini!\n` +
            `│\n` +
            `│ ℹ️ Member bebas mengirim link.\n` +
            `│ ⚠️ Semua warning di grup ini direset.\n` +
            `│\n` +
            `╰────────────────────────────────────╯`
        );
    }

    // ── .antilink reset ──────────────────────────────────────────────────────
    if (subCmd === 'reset') {
        const target = m.isOwner && subParts[1] === 'all' ? null : m.from;
        if (!m.isOwner && subParts[1] === 'all') return tolak(hisoka, m, '❌ Reset all hanya untuk *Owner bot*!');
        resetAntiLinkWarnings(target);
        logCommand(m, hisoka, `antilink reset${target ? '' : ' all'}`);
        return tolak(hisoka, m,
            `╭───〔 *🔄 ANTI-LINK RESET* 〕───╮\n` +
            `│\n` +
            `│ ✅ Warning berhasil direset!\n` +
            `│ ${target ? '📌 Grup ini saja.' : '🌐 Semua grup.'}\n` +
            `│\n` +
            `╰────────────────────────────────────╯`
        );
    }

    // ── .antilink list — khusus owner ─────────────────────────────────────────
    if (subCmd === 'list') {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk *Owner bot*!');
        const allGroups = getAllAntiLinkGroups();
        if (!allGroups.length) {
            return tolak(hisoka, m,
                `╭───〔 *📋 DAFTAR ANTI-LINK* 〕───╮\n` +
                `│\n` +
                `│ ℹ️ Belum ada grup yang terdaftar.\n` +
                `│\n` +
                `│ 💡 Ketik *.antilink on* di dalam\n` +
                `│    grup untuk mengaktifkan.\n` +
                `│\n` +
                `╰────────────────────────────────────╯`
            );
        }
        let listTxt = `╭───〔 *📋 DAFTAR ANTI-LINK* 〕───╮\n│\n│ 📊 Total: *${allGroups.length} grup*\n│\n`;
        for (let i = 0; i < allGroups.length; i++) {
            const gid = allGroups[i];
            let namaGrup = gid;
            try { const mt = await hisoka.groupMetadata(gid); namaGrup = mt?.subject || gid; } catch { try { namaGrup = hisoka.groups?.read(gid)?.subject || gid; } catch {} }
            const warns = getAntiLinkWarnings(gid);
            const totalWarn = Object.keys(warns).length;
            listTxt += `│ *${i + 1}.* ${namaGrup}\n│    🆔 \`${gid}\`\n│    ⚠️ Member warned: ${totalWarn} orang\n│\n`;
        }
        listTxt += `╰────────────────────────────────────╯`;
        return tolak(hisoka, m, listTxt);
    }

    // ── .antilink log ─────────────────────────────────────────────────────────
    if (subCmd === 'log') {
        const subLog = subParts[1] || '';
        const rawLogs = getAntiLinkLog(subLog === 'all' && m.isOwner ? null : m.from);
        const totalWarn = rawLogs.filter(l => l.action === 'warn').length;
        const totalKick = rawLogs.filter(l => l.action === 'kick').length;

        if (!rawLogs.length) {
            return tolak(hisoka, m,
                `╭───〔 *📜 LOG ANTI-LINK* 〕───╮\n│\n│ ℹ️ Belum ada riwayat pelanggaran.\n│\n╰────────────────────────────────────╯`
            );
        }
        if (subLog === 'clear') {
            clearAntiLinkLog(m.from);
            logCommand(m, hisoka, 'antilink log clear');
            return tolak(hisoka, m,
                `╭───〔 *🗑️ LOG ANTI-LINK* 〕───╮\n│\n│ ✅ Log grup ini berhasil dihapus!\n│\n╰────────────────────────────────────╯`
            );
        }
        if (subLog === 'clear' && subParts[2] === 'all' && m.isOwner) {
            clearAntiLinkLog(null);
            return tolak(hisoka, m, `╭───〔 *🗑️ LOG ANTI-LINK* 〕───╮\n│\n│ ✅ Semua log berhasil dihapus!\n│\n╰────────────────────────────────────╯`);
        }

        const _fmtWaktu = (ts) => {
            if (!ts) return '-';
            const d = new Date(ts);
            return d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        };
        const _fmtAction = (l) => l.action === 'kick' ? `🔴 KICK [${l.warnCount}/${l.maxWarn}]` : `🟡 WARN [${l.warnCount}/${l.maxWarn}]`;

        const recent = rawLogs.slice(-25).reverse();
        let logBaris = '';
        for (let i = 0; i < recent.length; i++) {
            const l = recent[i];
            logBaris +=
                `│ *${i + 1}.* ${_fmtAction(l)}\n` +
                `│    👤 @${l.senderNum || l.senderJid?.split('@')[0]}\n` +
                `│    🔗 ${l.link || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n` +
                `│\n`;
        }
        return tolak(hisoka, m,
            `╭───〔 *📜 LOG ANTI-LINK* 〕───╮\n│\n` +
            `│ 📊 Total: *${rawLogs.length}* | 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n│\n` +
            logBaris +
            `│ 📋 Sub-perintah:\n` +
            `│ • *.antilink log*       → Log grup ini\n` +
            `│ • *.antilink log clear* → Hapus log grup ini\n` +
            `│\n` +
            `╰────────────────────────────────────╯`
        );
    }

    // ── .antilink status (default / tanpa sub-perintah valid) ────────────────
    const isEnabled = isAntiLinkEnabled(m.from);

    let grupStatus;
    if (isEnabled) {
        grupStatus = '🟢 Aktif';
    } else if (globalEnabled) {
        grupStatus = '🔴 Nonaktif *(belum diaktifkan)*';
    } else {
        grupStatus = '🔴 Nonaktif';
    }

    const warns = getAntiLinkWarnings(m.from);
    const totalWarned = Object.keys(warns).length;

    const botAdminStatus = botIsAdmin ? '🟢 Ya (bisa hapus & kick)' : '🔴 Tidak (hanya peringatan)';

    const statusText =
        `╭───〔 *ℹ️ ANTI-LINK* 〕───╮\n` +
        `│\n` +
        `│ 🌐 Global   : ${globalEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
        `│ 📌 Grup ini : ${grupStatus}\n` +
        `│ 🤖 Bot Admin: ${botAdminStatus}\n` +
        `│\n` +
        `│ ⚙️ Konfigurasi:\n` +
        `│ • Maks. warning: *${maxWarnings}x*\n` +
        `│ • Member warned: *${totalWarned} orang*\n` +
        `│\n` +
        `│ ℹ️ Mendeteksi semua jenis link\n` +
        `│    (http, www, wa.me, dll)\n` +
        `│ 👑 Admin grup bebas kirim link\n` +
        `│\n` +
        `│ 📋 Cara penggunaan:\n` +
        `│ • *.antilink on*        → Aktifkan\n` +
        `│ • *.antilink off*       → Nonaktifkan\n` +
        `│ • *.antilink reset*     → Reset warning\n` +
        `│ • *.antilink status*    → Cek status\n` +
        `│ • *.antilink log*       → Riwayat\n` +
        (m.isOwner ?
        `│ • *.antilink list*      → Daftar grup\n` +
        `│ • *.antilink warn <n>*  → Set maks warn\n` +
        `│ • *.antilink global on*  → Aktifkan global\n` +
        `│ • *.antilink global off* → Nonaktifkan\n` : '') +
        `│\n` +
        `╰────────────────────────────────────╯`;

    return tolak(hisoka, m, statusText);
}
