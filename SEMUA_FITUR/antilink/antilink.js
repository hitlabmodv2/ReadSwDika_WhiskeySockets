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
 *  Hanya berjalan di bot utama (bukan jadibot)
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
const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|id|co|io|me|info|biz|tv|online|site|web|app|shop|store|link|cc|to|ly|gg|lol|wtf|xyz|top|pro|live|news|tech|digital|media|click|page|space|chat|group|my|asia|be|in|us|uk|de|fr|ru|jp|au|ca|it|es|br|nl|pl|se|no|fi|dk|sg|ph|vn|th|hk|tw|nz|za|ae|tr|mx|ar|cl|pe)\b(?:[\/\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/gi;

// ─── Tipe pesan yang bisa mengandung teks / caption ──────────────────────────
const TEXT_MSG_TYPES = [
    'conversation',
    'extendedTextMessage',
    'imageMessage',
    'videoMessage',
    'documentMessage',
    'documentWithCaptionMessage',
    'audioMessage',
    'buttonsMessage',
    'listMessage',
    'templateMessage',
];

// ─── Config & Data helpers ────────────────────────────────────────────────────

function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
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
    if (groupId) delete data.warnings[groupId];
    else data.warnings = {};
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

// ─── Ambil teks dari berbagai tipe pesan ─────────────────────────────────────
function extractTextFromMsgObj(msgObj) {
    if (!msgObj || typeof msgObj !== 'object') return '';
    const msgType = getContentType(msgObj);
    if (!msgType) return '';
    const inner = msgObj[msgType] || {};
    if (msgType === 'conversation') return inner || '';
    if (msgType === 'extendedTextMessage') return inner.text || '';
    if (['imageMessage', 'videoMessage', 'documentMessage', 'documentWithCaptionMessage', 'audioMessage'].includes(msgType)) {
        return inner.caption || '';
    }
    if (msgType === 'buttonsMessage') return inner.contentText || inner.footerText || '';
    if (msgType === 'listMessage') return inner.description || inner.title || '';
    if (msgType === 'templateMessage') {
        return inner.hydratedTemplate?.hydratedContentText
            || inner.hydratedFourRowTemplate?.hydratedContentText || '';
    }
    return '';
}

function extractText(message) {
    if (!message?.message) return '';
    return extractTextFromMsgObj(message.message);
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

// ─── Ambil contextInfo dari pesan ────────────────────────────────────────────
function getContextInfo(message) {
    if (!message?.message) return null;
    try {
        const msgObj = message.message;
        const msgType = getContentType(msgObj);
        if (!msgType) return null;
        const inner = msgObj[msgType];
        if (typeof inner === 'object' && inner?.contextInfo) return inner.contextInfo;
    } catch (_) {}
    return null;
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

// ─── Fetch bot admin status (realtime + fallback cache) ───────────────────────
async function getBotAdminStatus(remoteJid, botNumber, hisoka) {
    let groupMeta = null;
    let isAdmin = false;
    try {
        groupMeta = await hisoka.groupMetadata(remoteJid);
        if (groupMeta) hisoka.groups?.write(remoteJid, groupMeta);
        const botP = findParticipant(groupMeta?.participants, botNumber);
        isAdmin = !!botP?.admin;
        const bad = loadBotAdminFile();
        bad[remoteJid] = isAdmin;
        saveBotAdminFile(bad);
    } catch (_) {
        const bad = loadBotAdminFile();
        if (remoteJid in bad) isAdmin = bad[remoteJid] === true;
        groupMeta = hisoka.groups?.read(remoteJid) || null;
        if (groupMeta) {
            const botP = findParticipant(groupMeta?.participants, botNumber);
            isAdmin = !!botP?.admin;
        }
    }
    return { groupMeta, isAdmin };
}

// ─── Hapus pesan dengan mark __antiLinkDeletedIds ────────────────────────────
async function deleteMsg(remoteJid, msgId, participant, hisoka) {
    global.__antiLinkDeletedIds.add(msgId);
    setTimeout(() => global.__antiLinkDeletedIds.delete(msgId), 10000);
    try {
        await hisoka.sendMessage(remoteJid, {
            delete: { remoteJid, fromMe: false, id: msgId, participant }
        });
        return true;
    } catch (err) {
        console.error('\x1b[31m[AntiLink] Gagal hapus pesan:\x1b[39m', err.message);
        return false;
    }
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
    return {
        totalMembers, totalAdmins, totalMembers_, warnBar, adminBar,
        adminPct: totalMembers > 0 ? Math.round((totalAdmins / totalMembers) * 100) : 0
    };
}

function getWaktuStr() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
    return { timeStr, dateStr };
}

// ═══════════════════════════════════════════════════════════════
//  Handler Utama — Auto-deteksi link di setiap pesan grup
//  HANYA berjalan di bot utama (hisoka.isMainBot !== false)
// ═══════════════════════════════════════════════════════════════
export default async function handleAntiLink(message, hisoka) {
    try {
        // ── HANYA BOT UTAMA — jadibot tidak punya fitur antilink ──
        if (hisoka?.isMainBot === false) return;

        if (!message?.key?.remoteJid) return;
        if (!message.message) return;

        const remoteJid = message.key.remoteJid;
        if (!isJidGroup(remoteJid)) return;
        if (message.key?.fromMe) return;

        // Cek config global aktif
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
        const senderNumberClean = senderJid.split('@')[0];

        const botJid = jidNormalizedUser(hisoka.user?.id || '');
        const botNumber = botJid.split('@')[0];

        // Skip bot sendiri
        if (areJidsSameUser(senderJid, botJid)) return;

        // Cek owner
        const isOwner = isOwnerJid(senderJid, senderNumber, config);

        // Cek admin bot status (realtime)
        const { groupMeta, isAdmin: botIsAdmin } = await getBotAdminStatus(remoteJid, botNumber, hisoka);

        // Cek apakah pengirim admin/owner grup
        let senderIsAdmin = false;
        if (groupMeta?.participants) {
            const sp = findParticipant(groupMeta.participants, senderNumberClean);
            senderIsAdmin = !!sp?.admin;
        }

        const maxWarnings = antiLinkConfig.maxWarnings ?? 3;

        // ── KASUS: Admin/Owner GC me-reply (quote) pesan berisi link ──────────
        // Jika admin/owner reply ke pesan orang lain yang ada link-nya
        // → bot hapus pesan yang di-quote itu
        if (isOwner || senderIsAdmin) {
            const ctxInfo = getContextInfo(message);
            if (ctxInfo?.stanzaId && ctxInfo?.quotedMessage) {
                const quotedText = extractTextFromMsgObj(ctxInfo.quotedMessage);
                if (detectLink(quotedText)) {
                    // Quoted message punya link — hapus pesan tersebut
                    const quotedMsgId = ctxInfo.stanzaId;
                    const quotedParticipant = ctxInfo.participant || ctxInfo.remoteJid;
                    const quotedSenderNum = quotedParticipant
                        ? (jidDecode(jidNormalizedUser(quotedParticipant))?.user || quotedParticipant.split('@')[0])
                        : '-';
                    const links = extractLinks(quotedText);
                    const linkPreview = links.length > 0
                        ? links[0].slice(0, 60) + (links[0].length > 60 ? '…' : '')
                        : '-';

                    console.log(`\x1b[33m[AntiLink] Admin/Owner @${senderNumberClean} reply pesan berisi link → hapus pesan quoted (${quotedMsgId})\x1b[39m`);

                    if (botIsAdmin) {
                        const deleted = await deleteMsg(remoteJid, quotedMsgId, quotedParticipant, hisoka);
                        await hisoka.sendMessage(remoteJid, {
                            text: deleted
                                ? `╭───〔 *✅ ANTI-LINK* 〕───╮\n│\n│ 🗑️ Pesan berisi link berhasil dihapus!\n│\n│ 👤 Pengirim : @${quotedSenderNum}\n│ 🔗 Link     : \`${linkPreview}\`\n│\n│ _(Dihapus oleh admin/owner)_\n│\n╰────────────────────────────────────╯`
                                : `❌ Gagal hapus pesan. Pastikan bot adalah *admin* grup.`,
                            contextInfo: { mentionedJid: quotedParticipant ? [jidNormalizedUser(quotedParticipant)] : [] }
                        }, { quoted: message });
                    } else {
                        await hisoka.sendMessage(remoteJid, {
                            text: `╭───〔 *⚠️ ANTI-LINK* 〕───╮\n│\n│ ⚠️ Bot *bukan admin* — tidak bisa hapus!\n│\n│ 🔗 Link terdeteksi di pesan quoted:\n│    \`${linkPreview}\`\n│\n│ 💡 Jadikan bot *admin* agar bisa\n│    hapus pesan otomatis.\n│\n╰────────────────────────────────────╯`
                        }, { quoted: message });
                    }
                }
            }
            // Admin/Owner bebas kirim link sendiri — tidak perlu proses lebih lanjut
            return;
        }

        // ── KASUS: Member biasa kirim pesan berisi link ───────────────────────
        const msgType = getContentType(message.message);
        if (!msgType || !TEXT_MSG_TYPES.includes(msgType)) return;

        const text = extractText(message);
        if (!text || !detectLink(text)) return;

        const links = extractLinks(text);
        const linkPreview = links.length > 0
            ? links[0].slice(0, 60) + (links[0].length > 60 ? '…' : '')
            : '-';

        console.log(`\x1b[33m[AntiLink] Link terdeteksi! Sender: ${senderNumber} | BotAdmin: ${botIsAdmin} | Link: ${linkPreview}\x1b[39m`);

        if (!botIsAdmin) {
            console.log('\x1b[33m[AntiLink] Bot bukan admin, hanya kirim peringatan (tanpa hapus/kick).\x1b[39m');
        }

        // Update warning
        const freshData = loadData();
        if (!freshData.warnings) freshData.warnings = {};
        if (!freshData.warnings[remoteJid]) freshData.warnings[remoteJid] = {};
        if (!freshData.warnings[remoteJid][senderJid]) freshData.warnings[remoteJid][senderJid] = 0;
        freshData.warnings[remoteJid][senderJid] += 1;
        const newWarn = freshData.warnings[remoteJid][senderJid];
        saveData(freshData);

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

            const kickStatusLine = botIsAdmin
                ? `💥 *Status*    ﹕ Telah di-*KICK* dari grup!`
                : `⚠️ *Bot bukan admin* — tidak bisa kick!\n💡 Jadikan bot admin agar bisa kick otomatis.`;

            const kickMsg =
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
                `✦ 🔗 *ANTI-LINK* 🔗 ✦\n` +
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n\n` +
                _pelanggarLabel +
                `🕐 *Waktu*     ﹕${timeStr} • ${dateStr}\n` +
                `🔗 *Link*      ﹕\`${linkPreview}\`\n\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  📊 *STATISTIK GRUP*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `👥 *Total Member*  ﹕ ${stats.totalMembers} orang\n` +
                `🛡️ *Total Admin*   ﹕ ${stats.totalAdmins} orang\n` +
                `🙋 *Member Biasa* ﹕ ${stats.totalMembers_} orang\n` +
                `📈 *Rasio Admin*   ﹕ ${stats.adminPct}%\n` +
                `     [${stats.adminBar}]\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  ⚠️ *PELANGGARAN*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `🚫 Mengirim *link* di grup!\n\n` +
                `🔴 *Peringatan* ﹕ ◆◆◆ ${maxWarnings}/${maxWarnings}\n` +
                `${kickStatusLine}\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                `_Dilarang menyebarkan link sembarangan di grup ini!_ 😤`;

            await hisoka.sendMessage(remoteJid, {
                text: kickMsg,
                contextInfo: { mentionedJid: _mentionList }
            }, { quoted: message });

            if (botIsAdmin) {
                await deleteMsg(remoteJid, message.key.id, message.key.participant, hisoka);
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
            const deleteInfo = botIsAdmin
                ? `🗑️ *Pesan*     ﹕ Telah dihapus otomatis.\n`
                : `⚠️ *Pesan*     ﹕ Bot bukan admin, tidak bisa hapus.\n`;
            const nextWarnInfo = (newWarn >= maxWarnings - 1)
                ? `⚡ *Peringatan berikutnya = KICK otomatis!*`
                : `💡 Sisa *${maxWarnings - newWarn}x* lagi sebelum di-kick!`;

            const warnMsg =
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n` +
                `✦ ⚠️ *ANTI-LINK* ⚠️ ✦\n` +
                `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n\n` +
                _pelanggarLabel +
                `🕐 *Waktu*     ﹕${timeStr} • ${dateStr}\n` +
                `🔗 *Link*      ﹕\`${linkPreview}\`\n` +
                `${deleteInfo}\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  📊 *STATISTIK GRUP*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `👥 *Total Member*  ﹕ ${stats.totalMembers} orang\n` +
                `🛡️ *Total Admin*   ﹕ ${stats.totalAdmins} orang\n` +
                `🙋 *Member Biasa* ﹕ ${stats.totalMembers_} orang\n` +
                `📈 *Rasio Admin*   ﹕ ${stats.adminPct}%\n` +
                `     [${stats.adminBar}]\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `  ⚠️ *PERINGATAN ke-${newWarn}/${maxWarnings}*\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                `🚫 Mengirim *link* di grup!\n\n` +
                `🟡 *Warn* ﹕ [${stats.warnBar}] ${newWarn}/${maxWarnings}\n` +
                `${nextWarnInfo}\n` +
                `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                `_Dilarang mengirim link sembarangan di grup ini!_ 🚫`;

            await hisoka.sendMessage(remoteJid, {
                text: warnMsg,
                contextInfo: { mentionedJid: _mentionList }
            }, { quoted: message });

            if (botIsAdmin) {
                await deleteMsg(remoteJid, message.key.id, message.key.participant, hisoka);
            }
        }

    } catch (err) {
        console.error('\x1b[31m[AntiLink] Error:\x1b[39m', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
//  Command Handler — .antilink on/off/status/reset/list/warn/log
//  HANYA untuk bot utama
// ═══════════════════════════════════════════════════════════════
export async function handleAntilink({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig: _lc, saveConfig: _sc }) {
    // ── Hanya bot utama — jadibot tidak punya fitur ini ──
    if (hisoka?.isMainBot === false) return;

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
                `╭───〔 *✅ ANTI-LINK GLOBAL* 〕───╮\n│\n│ 🟢 Anti-Link *diaktifkan* secara global!\n│\n│ ℹ️ Aktifkan per grup: *.antilink on*\n│\n╰────────────────────────────────────╯`
            );
        } else if (act === 'off') {
            config.antiLink.enabled = false;
            sc(config);
            logCommand(m, hisoka, 'antilink global off');
            return tolak(hisoka, m,
                `╭───〔 *🔴 ANTI-LINK GLOBAL* 〕───╮\n│\n│ 🔴 Anti-Link *dinonaktifkan* secara global!\n│\n╰────────────────────────────────────╯`
            );
        }
        return tolak(hisoka, m, `❌ Format: *.antilink global on* atau *.antilink global off*`);
    }

    // ── .antilink warn <n> — khusus owner ────────────────────────────────────
    if (subCmd === 'warn' && subParts[1]) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk *Owner bot*!');
        const n = parseInt(subParts[1], 10);
        if (isNaN(n) || n < 1 || n > 20) return tolak(hisoka, m, `❌ Angka warning tidak valid! Gunakan 1-20.\nContoh: *.antilink warn 3*`);
        const config = lc();
        if (!config.antiLink) config.antiLink = {};
        config.antiLink.maxWarnings = n;
        sc(config);
        logCommand(m, hisoka, `antilink warn ${n}`);
        return tolak(hisoka, m,
            `╭───〔 *⚙️ ANTI-LINK WARN* 〕───╮\n│\n│ ✅ Maks. warning diset ke *${n}x*!\n│\n│ ℹ️ Member akan di-kick setelah ${n}x kirim link.\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── Semua perintah di bawah butuh admin/owner ─────────────────────────────
    if (!isAdminOrOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk *Admin grup* atau *Owner bot*!');

    // Cek status bot admin secara realtime
    const botJid = jidNormalizedUser(hisoka.user?.id || '');
    const botNumber = botJid.split('@')[0];
    const { groupMeta, isAdmin: botIsAdmin } = await getBotAdminStatus(m.from, botNumber, hisoka);

    const config = lc();
    const antiLinkConfig = config.antiLink || {};
    const globalEnabled = antiLinkConfig.enabled ?? false;
    const maxWarnings = antiLinkConfig.maxWarnings ?? 3;

    // ── .antilink on ──────────────────────────────────────────────────────────
    if (subCmd === 'on' || subCmd === '') {
        if (!globalEnabled) {
            return tolak(hisoka, m,
                `╭───〔 *⚠️ ANTI-LINK* 〕───╮\n│\n│ ❌ Anti-Link *belum aktif secara global*!\n│\n│ 💡 Minta owner aktifkan dulu:\n│    *.antilink global on*\n│\n╰────────────────────────────────────╯`
            );
        }
        toggleAntiLink(m.from, true);
        logCommand(m, hisoka, 'antilink on');
        const botAdminNote = botIsAdmin
            ? `│ 🤖 Bot : 🟢 Admin — bisa hapus & kick\n`
            : `│ 🤖 Bot : 🔴 *Bukan admin* — hanya peringatan!\n│ ⚠️ Jadikan bot admin agar bisa hapus & kick.\n`;
        return tolak(hisoka, m,
            `╭───〔 *✅ ANTI-LINK ON* 〕───╮\n│\n│ 🟢 Anti-Link *diaktifkan* di grup ini!\n│\n` +
            botAdminNote +
            `│\n│ ⚙️ Konfigurasi:\n│ • Maks. warning : *${maxWarnings}x*\n│ • Setelah ${maxWarnings}x warn → *KICK otomatis*\n│\n│ ℹ️ Admin & Owner GC bebas kirim link.\n│ ℹ️ Admin bisa reply pesan link → bot hapus.\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── .antilink off ─────────────────────────────────────────────────────────
    if (subCmd === 'off') {
        toggleAntiLink(m.from, false);
        logCommand(m, hisoka, 'antilink off');
        return tolak(hisoka, m,
            `╭───〔 *🔴 ANTI-LINK OFF* 〕───╮\n│\n│ 🔴 Anti-Link *dinonaktifkan* di grup ini!\n│ ⚠️ Semua warning di grup ini direset.\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── .antilink reset ───────────────────────────────────────────────────────
    if (subCmd === 'reset') {
        if (subParts[1] === 'all' && !m.isOwner) return tolak(hisoka, m, '❌ Reset all hanya untuk *Owner bot*!');
        const target = (subParts[1] === 'all' && m.isOwner) ? null : m.from;
        resetAntiLinkWarnings(target);
        logCommand(m, hisoka, `antilink reset${target ? '' : ' all'}`);
        return tolak(hisoka, m,
            `╭───〔 *🔄 ANTI-LINK RESET* 〕───╮\n│\n│ ✅ Warning berhasil direset!\n│ ${target ? '📌 Grup ini saja.' : '🌐 Semua grup.'}\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── .antilink list — khusus owner ─────────────────────────────────────────
    if (subCmd === 'list') {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk *Owner bot*!');
        const allGroups = getAllAntiLinkGroups();
        if (!allGroups.length) {
            return tolak(hisoka, m,
                `╭───〔 *📋 DAFTAR ANTI-LINK* 〕───╮\n│\n│ ℹ️ Belum ada grup yang terdaftar.\n│\n│ 💡 Ketik *.antilink on* di grup.\n│\n╰────────────────────────────────────╯`
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
        if (subLog === 'clear') {
            if (subParts[2] === 'all' && m.isOwner) {
                clearAntiLinkLog(null);
                return tolak(hisoka, m, `╭───〔 *🗑️ LOG ANTI-LINK* 〕───╮\n│\n│ ✅ Semua log berhasil dihapus!\n│\n╰────────────────────────────────────╯`);
            }
            clearAntiLinkLog(m.from);
            logCommand(m, hisoka, 'antilink log clear');
            return tolak(hisoka, m, `╭───〔 *🗑️ LOG ANTI-LINK* 〕───╮\n│\n│ ✅ Log grup ini berhasil dihapus!\n│\n╰────────────────────────────────────╯`);
        }
        const rawLogs = getAntiLinkLog(subLog === 'all' && m.isOwner ? null : m.from);
        if (!rawLogs.length) {
            return tolak(hisoka, m, `╭───〔 *📜 LOG ANTI-LINK* 〕───╮\n│\n│ ℹ️ Belum ada riwayat pelanggaran.\n│\n╰────────────────────────────────────╯`);
        }
        const totalWarn = rawLogs.filter(l => l.action === 'warn').length;
        const totalKick = rawLogs.filter(l => l.action === 'kick').length;
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
                `│    🔗 ${l.link || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n│\n`;
        }
        return tolak(hisoka, m,
            `╭───〔 *📜 LOG ANTI-LINK* 〕───╮\n│\n` +
            `│ 📊 Total: *${rawLogs.length}* | 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n│\n` +
            logBaris +
            `│ 📋 Sub-perintah:\n│ • *.antilink log* → Log grup ini\n│ • *.antilink log clear* → Hapus log\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── .antilink status (default) ────────────────────────────────────────────
    const isEnabled = isAntiLinkEnabled(m.from);
    let grupStatus = isEnabled ? '🟢 Aktif' : globalEnabled ? '🔴 Nonaktif *(belum diaktifkan)*' : '🔴 Nonaktif';
    const warns = getAntiLinkWarnings(m.from);
    const totalWarned = Object.keys(warns).length;
    const botAdminStatus = botIsAdmin ? '🟢 Ya (hapus & kick)' : '🔴 Tidak (hanya peringatan)';

    return tolak(hisoka, m,
        `╭───〔 *ℹ️ ANTI-LINK* 〕───╮\n│\n` +
        `│ 🌐 Global   : ${globalEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
        `│ 📌 Grup ini : ${grupStatus}\n` +
        `│ 🤖 Bot Admin: ${botAdminStatus}\n│\n` +
        `│ ⚙️ Konfigurasi:\n│ • Maks. warning: *${maxWarnings}x*\n` +
        `│ • Member warned: *${totalWarned} orang*\n│\n` +
        `│ ℹ️ Owner & Admin GC bebas kirim link\n` +
        `│ ℹ️ Admin reply pesan link → bot hapus\n│\n` +
        `│ 📋 Perintah:\n│ • *.antilink on/off*    → Toggle grup\n` +
        `│ • *.antilink reset*     → Reset warning\n` +
        `│ • *.antilink log*       → Riwayat\n` +
        (m.isOwner ?
        `│ • *.antilink list*      → Daftar grup\n` +
        `│ • *.antilink warn <n>*  → Set maks warn\n` +
        `│ • *.antilink global on/off* → Toggle global\n` : '') +
        `│\n╰────────────────────────────────────╯`
    );
}
