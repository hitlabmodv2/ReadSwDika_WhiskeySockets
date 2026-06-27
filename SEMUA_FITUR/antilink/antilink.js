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

// Tandai pesan yang dihapus oleh antilink agar anti-delete tidak notif
if (!global.__antiLinkDeletedIds) global.__antiLinkDeletedIds = new Set();

// ─── Regex deteksi link ───────────────────────────────────────────────────────
const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|id|co|io|me|info|biz|tv|online|site|web|app|shop|store|link|cc|to|ly|gg|lol|wtf|xyz|top|pro|live|news|tech|digital|media|click|page|space|chat|group|my|asia|be|in|us|uk|de|fr|ru|jp|au|ca|it|es|br|nl|pl|se|no|fi|dk|sg|ph|vn|th|hk|tw|nz|za|ae|tr|mx|ar|cl|pe)\b(?:[\/\w\-._~:/?#[\]@!$&'()*+,;=%]*)?/gi;

// Tipe pesan yang bisa mengandung teks / caption
const TEXT_MSG_TYPES = [
    'conversation', 'extendedTextMessage',
    'imageMessage', 'videoMessage', 'documentMessage',
    'documentWithCaptionMessage', 'audioMessage',
    'buttonsMessage', 'listMessage', 'templateMessage',
];

// ─── Config & Data helpers ────────────────────────────────────────────────────

function loadConfig() {
    try {
        const p = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (_) {}
    return {};
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(path.join(process.cwd(), 'config.json'), JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (err) {
        console.error('\x1b[31m[AntiLink] Gagal simpan config:\x1b[39m', err.message);
    }
}

function loadData() {
    return kvGet('security/antilink', { groups: [], warnings: {} });
}

function saveData(d) {
    try { kvSet('security/antilink', d); }
    catch (err) { console.error('\x1b[31m[AntiLink] Gagal simpan data:\x1b[39m', err.message); }
}

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function isAntiLinkEnabled(groupId) {
    const d = loadData();
    return Array.isArray(d.groups) && d.groups.includes(groupId);
}

export function toggleAntiLink(groupId, enable) {
    const d = loadData();
    if (!Array.isArray(d.groups)) d.groups = [];
    if (!d.warnings) d.warnings = {};
    if (enable) {
        if (!d.groups.includes(groupId)) d.groups.push(groupId);
    } else {
        d.groups = d.groups.filter(g => g !== groupId);
        if (d.warnings[groupId]) delete d.warnings[groupId];
    }
    saveData(d);
}

export function getAntiLinkWarnings(groupId) {
    const d = loadData();
    return (d.warnings || {})[groupId] || {};
}

export function resetAntiLinkWarnings(groupId) {
    const d = loadData();
    if (!d.warnings) d.warnings = {};
    if (groupId) delete d.warnings[groupId];
    else d.warnings = {};
    saveData(d);
}

export function getAllAntiLinkGroups() {
    const d = loadData();
    return Array.isArray(d.groups) ? [...d.groups] : [];
}

// ─── Log ──────────────────────────────────────────────────────────────────────

const _LOG_KEY = 'security/antilink_log';
const _LOG_MAX  = 500;

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
        kvSet(_LOG_KEY, kvGet(_LOG_KEY, []).filter(l => l.gid !== groupId));
    } catch (_) {}
}

// ─── Ambil teks dari berbagai tipe pesan ─────────────────────────────────────

function extractTextFromMsgObj(msgObj) {
    if (!msgObj || typeof msgObj !== 'object') return '';
    const t = getContentType(msgObj);
    if (!t) return '';
    const inner = msgObj[t] || {};
    if (t === 'conversation') return inner || '';
    if (t === 'extendedTextMessage') return inner.text || '';
    if (['imageMessage','videoMessage','documentMessage','documentWithCaptionMessage','audioMessage'].includes(t))
        return inner.caption || '';
    if (t === 'buttonsMessage') return inner.contentText || inner.footerText || '';
    if (t === 'listMessage') return inner.description || inner.title || '';
    if (t === 'templateMessage')
        return inner.hydratedTemplate?.hydratedContentText
            || inner.hydratedFourRowTemplate?.hydratedContentText || '';
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
        const t = getContentType(msgObj);
        if (!t) return null;
        const inner = msgObj[t];
        if (typeof inner === 'object' && inner?.contextInfo) return inner.contextInfo;
    } catch (_) {}
    return null;
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

function findParticipant(participants, targetNumber) {
    return participants?.find(p => {
        const num = (p.jid || p.phoneNumber || p.id || '').split('@')[0].split(':')[0];
        return num === targetNumber;
    });
}

function loadBotAdminFile() { return kvGet('botadmin/botadmin', {}); }
function saveBotAdminFile(d) { try { kvSet('botadmin/botadmin', d); } catch (_) {} }

function isOwnerJid(senderJid, senderNumber, config) {
    const owners = config.owners || [];
    return owners.some(o => areJidsSameUser(o + '@s.whatsapp.net', senderJid) || o === senderNumber);
}

async function getBotAdminStatus(remoteJid, botNumber, hisoka) {
    let groupMeta = null, isAdmin = false;
    try {
        groupMeta = await hisoka.groupMetadata(remoteJid);
        if (groupMeta) hisoka.groups?.write(remoteJid, groupMeta);
        isAdmin = !!findParticipant(groupMeta?.participants, botNumber)?.admin;
        const bad = loadBotAdminFile(); bad[remoteJid] = isAdmin; saveBotAdminFile(bad);
    } catch (_) {
        const bad = loadBotAdminFile();
        if (remoteJid in bad) isAdmin = bad[remoteJid] === true;
        groupMeta = hisoka.groups?.read(remoteJid) || null;
        if (groupMeta) isAdmin = !!findParticipant(groupMeta?.participants, botNumber)?.admin;
    }
    return { groupMeta, isAdmin };
}

async function deleteMsg(remoteJid, msgId, participant, hisoka) {
    global.__antiLinkDeletedIds.add(msgId);
    setTimeout(() => global.__antiLinkDeletedIds.delete(msgId), 10000);
    try {
        await hisoka.sendMessage(remoteJid, { delete: { remoteJid, fromMe: false, id: msgId, participant } });
        return true;
    } catch (err) {
        console.error('\x1b[31m[AntiLink] Gagal hapus pesan:\x1b[39m', err.message);
        return false;
    }
}

function buildGroupStats(groupMeta, newWarn, maxWarnings) {
    const parts = groupMeta?.participants || [];
    const totalMembers = parts.length;
    const totalAdmins = parts.filter(p => p.admin).length;
    const totalMembers_ = totalMembers - totalAdmins;
    const filled = '◆'.repeat(Math.min(newWarn, maxWarnings));
    const empty  = '◇'.repeat(Math.max(maxWarnings - newWarn, 0));
    const warnBar = filled + empty;
    const ap = totalMembers > 0 ? Math.round((totalAdmins / totalMembers) * 10) : 0;
    const adminBar = '█'.repeat(ap) + '░'.repeat(10 - ap);
    return { totalMembers, totalAdmins, totalMembers_, warnBar, adminBar,
             adminPct: totalMembers > 0 ? Math.round((totalAdmins / totalMembers) * 100) : 0 };
}

function getWaktuStr() {
    const now = new Date();
    return {
        timeStr: now.toLocaleTimeString('id-ID', { timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit', second:'2-digit' }),
        dateStr: now.toLocaleDateString('id-ID',  { timeZone:'Asia/Jakarta', day:'2-digit', month:'2-digit', year:'numeric' })
    };
}

// ═══════════════════════════════════════════════════════════════
//  Auto-deteksi link — HANYA bot utama (bukan jadibot)
// ═══════════════════════════════════════════════════════════════
export default async function handleAntiLink(message, hisoka) {
    try {
        if (hisoka?.isMainBot === false) return;
        if (!message?.key?.remoteJid || !message.message) return;

        const remoteJid = message.key.remoteJid;
        if (!isJidGroup(remoteJid)) return;
        if (message.key?.fromMe) return;

        const config = loadConfig();
        const antiLinkConfig = config.antiLink || {};
        if (!antiLinkConfig.enabled) return;

        const data = loadData();
        if (!Array.isArray(data.groups) || !data.groups.includes(remoteJid)) return;

        const senderJid = jidNormalizedUser(
            message.key.participant || message.participant || message.key.remoteJid
        );
        if (!senderJid) return;

        const isLid = senderJid.includes('@lid');
        const senderNumber      = isLid ? '[LID]' : (jidDecode(senderJid)?.user || senderJid.split('@')[0] || '');
        const senderNumberClean = senderJid.split('@')[0];

        const botJid    = jidNormalizedUser(hisoka.user?.id || '');
        const botNumber = botJid.split('@')[0];

        if (areJidsSameUser(senderJid, botJid)) return;

        const isOwner = isOwnerJid(senderJid, senderNumber, config);
        const { groupMeta, isAdmin: botIsAdmin } = await getBotAdminStatus(remoteJid, botNumber, hisoka);

        let senderIsAdmin = false;
        if (groupMeta?.participants) {
            senderIsAdmin = !!findParticipant(groupMeta.participants, senderNumberClean)?.admin;
        }

        const maxWarnings = antiLinkConfig.maxWarnings ?? 3;

        // ── Admin / Owner GC me-reply pesan berisi link → hapus pesan quoted ──
        if (isOwner || senderIsAdmin) {
            const ctx = getContextInfo(message);
            if (ctx?.stanzaId && ctx?.quotedMessage) {
                const quotedText = extractTextFromMsgObj(ctx.quotedMessage);
                if (detectLink(quotedText)) {
                    const qId          = ctx.stanzaId;
                    const qParticipant = ctx.participant || ctx.remoteJid;
                    const qNum         = qParticipant
                        ? (jidDecode(jidNormalizedUser(qParticipant))?.user || qParticipant.split('@')[0])
                        : '-';
                    const links       = extractLinks(quotedText);
                    const linkPreview = links[0] ? links[0].slice(0, 60) + (links[0].length > 60 ? '…' : '') : '-';

                    console.log(`\x1b[33m[AntiLink] Admin/Owner @${senderNumberClean} reply pesan link → hapus quoted (${qId})\x1b[39m`);

                    if (botIsAdmin) {
                        const deleted = await deleteMsg(remoteJid, qId, qParticipant, hisoka);
                        const _delTxt = deleted
                            ? `╭───〔 *✅ ANTI-LINK* 〕───╮\n│\n│ 🗑️ Pesan berisi link berhasil dihapus!\n│\n│ 👤 Pengirim : @${qNum}\n│ 🔗 Link     : \`${linkPreview}\`\n│\n│ _(Dihapus oleh ${isOwner ? 'owner' : 'admin'})_\n│\n╰────────────────────────────────────╯`
                            : `❌ Gagal hapus pesan. Pastikan bot adalah *admin* grup.`;
                        await hisoka.sendMessage(remoteJid, {
                            text: _delTxt,
                            contextInfo: { mentionedJid: qParticipant ? [jidNormalizedUser(qParticipant)] : [] }
                        }, { quoted: message });
                    } else {
                        await hisoka.sendMessage(remoteJid, {
                            text: `╭───〔 *⚠️ ANTI-LINK* 〕───╮\n│\n│ ⚠️ Bot *bukan admin* — tidak bisa hapus!\n│\n│ 🔗 Link di pesan quoted:\n│    \`${linkPreview}\`\n│\n│ 💡 Jadikan bot *admin* agar bisa hapus otomatis.\n│\n╰────────────────────────────────────╯`
                        }, { quoted: message });
                    }
                }
            }
            return; // Owner/Admin bebas kirim link sendiri
        }

        // ── Member biasa kirim pesan berisi link ──────────────────────────────
        const msgType = getContentType(message.message);
        if (!msgType || !TEXT_MSG_TYPES.includes(msgType)) return;

        const text = extractText(message);
        if (!text || !detectLink(text)) return;

        const links       = extractLinks(text);
        const linkPreview = links[0] ? links[0].slice(0, 60) + (links[0].length > 60 ? '…' : '') : '-';

        console.log(`\x1b[33m[AntiLink] Link terdeteksi! Sender: ${senderNumber} | BotAdmin: ${botIsAdmin} | Link: ${linkPreview}\x1b[39m`);
        if (!botIsAdmin) console.log('\x1b[33m[AntiLink] Bot bukan admin, hanya peringatan.\x1b[39m');

        const freshData = loadData();
        if (!freshData.warnings) freshData.warnings = {};
        if (!freshData.warnings[remoteJid]) freshData.warnings[remoteJid] = {};
        if (!freshData.warnings[remoteJid][senderJid]) freshData.warnings[remoteJid][senderJid] = 0;
        freshData.warnings[remoteJid][senderJid] += 1;
        const newWarn = freshData.warnings[remoteJid][senderJid];
        saveData(freshData);

        appendLog({ gid: remoteJid, senderJid, senderNum: senderNumber,
            action: newWarn >= maxWarnings ? 'kick' : 'warn',
            warnCount: newWarn, maxWarn: maxWarnings, link: linkPreview, ts: Date.now() });

        const { timeStr, dateStr } = getWaktuStr();
        const stats = buildGroupStats(groupMeta, newWarn, maxWarnings);
        const _mention = isLid ? [] : [senderJid];
        const _pelanggar = isLid
            ? `👤 *Pelanggar* ﹕_(ID tidak dikenal / akun privat)_\n`
            : `👤 *Pelanggar* ﹕@${senderNumber}\n`;

        if (newWarn >= maxWarnings) {
            delete freshData.warnings[remoteJid][senderJid];
            saveData(freshData);

            const kickLine = botIsAdmin
                ? `💥 *Status*    ﹕ Telah di-*KICK* dari grup!`
                : `⚠️ *Bot bukan admin* — tidak bisa kick!\n💡 Jadikan bot admin agar bisa kick otomatis.`;

            await hisoka.sendMessage(remoteJid, {
                text:
                    `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n✦ 🔗 *ANTI-LINK* 🔗 ✦\n⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n\n` +
                    _pelanggar +
                    `🕐 *Waktu*     ﹕${timeStr} • ${dateStr}\n` +
                    `🔗 *Link*      ﹕\`${linkPreview}\`\n\n` +
                    `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n  📊 *STATISTIK GRUP*\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                    `👥 *Total Member*  ﹕ ${stats.totalMembers} orang\n🛡️ *Total Admin*   ﹕ ${stats.totalAdmins} orang\n🙋 *Member Biasa* ﹕ ${stats.totalMembers_} orang\n📈 *Rasio Admin*   ﹕ ${stats.adminPct}%\n     [${stats.adminBar}]\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                    `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n  ⚠️ *PELANGGARAN*\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                    `🚫 Mengirim *link* di grup!\n\n🔴 *Peringatan* ﹕ ◆◆◆ ${maxWarnings}/${maxWarnings}\n${kickLine}\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                    `_Dilarang menyebarkan link sembarangan di grup ini!_ 😤`,
                contextInfo: { mentionedJid: _mention }
            }, { quoted: message });

            if (botIsAdmin) {
                await deleteMsg(remoteJid, message.key.id, message.key.participant, hisoka);
                try {
                    await hisoka.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
                    console.log(`\x1b[31m[AntiLink] ✓ Kicked ${senderNumber} dari ${remoteJid}\x1b[39m`);
                } catch (kickErr) {
                    console.error('\x1b[31m[AntiLink] Gagal kick:\x1b[39m', kickErr.message);
                    await hisoka.sendMessage(remoteJid, {
                        text: `❌ Gagal kick ${isLid ? '_(LID)_' : '@' + senderNumber}. Pastikan bot adalah admin grup.`,
                        contextInfo: { mentionedJid: _mention }
                    });
                }
            }
        } else {
            const deleteInfo  = botIsAdmin ? `🗑️ *Pesan*     ﹕ Telah dihapus otomatis.\n` : `⚠️ *Pesan*     ﹕ Bot bukan admin, tidak bisa hapus.\n`;
            const nextWarnInfo = (newWarn >= maxWarnings - 1)
                ? `⚡ *Peringatan berikutnya = KICK otomatis!*`
                : `💡 Sisa *${maxWarnings - newWarn}x* lagi sebelum di-kick!`;

            await hisoka.sendMessage(remoteJid, {
                text:
                    `⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n✦ ⚠️ *ANTI-LINK* ⚠️ ✦\n⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n\n` +
                    _pelanggar +
                    `🕐 *Waktu*     ﹕${timeStr} • ${dateStr}\n` +
                    `🔗 *Link*      ﹕\`${linkPreview}\`\n` +
                    deleteInfo + `\n` +
                    `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n  📊 *STATISTIK GRUP*\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                    `👥 *Total Member*  ﹕ ${stats.totalMembers} orang\n🛡️ *Total Admin*   ﹕ ${stats.totalAdmins} orang\n🙋 *Member Biasa* ﹕ ${stats.totalMembers_} orang\n📈 *Rasio Admin*   ﹕ ${stats.adminPct}%\n     [${stats.adminBar}]\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                    `◈━━━━━━━━━━━━━━━━━━━━━━━◈\n  ⚠️ *PERINGATAN ke-${newWarn}/${maxWarnings}*\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n` +
                    `🚫 Mengirim *link* di grup!\n\n🟡 *Warn* ﹕ [${stats.warnBar}] ${newWarn}/${maxWarnings}\n${nextWarnInfo}\n◈━━━━━━━━━━━━━━━━━━━━━━━◈\n\n` +
                    `_Dilarang mengirim link sembarangan di grup ini!_ 🚫`,
                contextInfo: { mentionedJid: _mention }
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
//  Command Handler — .antilink [sub-perintah]
//  HANYA bot utama
// ═══════════════════════════════════════════════════════════════
export async function handleAntilink({ hisoka, m, query, tolak, logCommand, loadConfig: _lc, saveConfig: _sc }) {
    if (hisoka?.isMainBot === false) return;
    if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di grup!');
    if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

    const lc = _lc || loadConfig;
    const sc = _sc || saveConfig;

    const arg = (query || '').trim().toLowerCase();

    // ── global on/off ─────────────────────────────────────────────────────────
    if (arg === 'global on' || arg === 'global off') {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner bot yang bisa mengubah pengaturan global!');
        const enable = arg === 'global on';
        const config = lc();
        if (!config.antiLink) config.antiLink = {};
        config.antiLink.enabled = enable;
        sc(config);
        logCommand(m, hisoka, `antilink ${arg}`);
        return tolak(hisoka, m,
            `╭───〔 *🌐 ANTILINK GLOBAL* 〕───╮\n│\n` +
            `│ ${enable ? '✅ *Global AntiLink DIAKTIFKAN!*' : '🔴 *Global AntiLink DINONAKTIFKAN!*'}\n│\n` +
            (enable
                ? `│ ℹ️ Sekarang admin grup bisa\n│    mengaktifkan fitur ini di\n│    masing-masing grup.\n`
                : `│ ℹ️ Fitur tidak akan aktif\n│    di semua grup.\n`) +
            `│\n╰────────────────────────────────────╯`
        );
    }

    // ── on ────────────────────────────────────────────────────────────────────
    if (arg === 'on') {
        const config = lc();
        let globalAutoEnabled = false;
        if (!config.antiLink?.enabled) {
            if (!m.isOwner) return tolak(hisoka, m, '❌ Fitur AntiLink dinonaktifkan secara global oleh owner bot.\nMinta owner aktifkan dengan perintah: *.antilink global on*');
            if (!config.antiLink) config.antiLink = {};
            config.antiLink.enabled = true;
            sc(config);
            globalAutoEnabled = true;
        }
        toggleAntiLink(m.from, true);
        logCommand(m, hisoka, 'antilink on');

        // Cek bot admin realtime
        const botJid = jidNormalizedUser(hisoka.user?.id || '');
        const { isAdmin: botIsAdmin } = await getBotAdminStatus(m.from, botJid.split('@')[0], hisoka);
        const botNote = botIsAdmin
            ? `│ 🤖 Bot Admin : ✅ Bisa hapus & kick\n`
            : `│ 🤖 Bot Admin : ❌ *Bukan admin!*\n│    ⚠️ Jadikan bot admin agar bisa\n│    hapus pesan & kick otomatis.\n`;

        return tolak(hisoka, m,
            `╭───〔 *✅ ANTI-LINK* 〕───╮\n│\n│ 🟢 *Fitur AntiLink AKTIF!*\n` +
            (globalAutoEnabled ? `│ 🌐 *Global juga diaktifkan otomatis!*\n` : '') +
            `│\n` + botNote +
            `│\n│ ⚙️ Konfigurasi:\n│ • Maks. warning: *${config.antiLink?.maxWarnings ?? 3}x*\n│\n` +
            `│ ℹ️ Link yang dikirim member akan\n│    dihapus & dapat peringatan/kick!\n│\n` +
            `│ 👑 Admin & Owner GC bebas kirim link.\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── off ───────────────────────────────────────────────────────────────────
    if (arg === 'off') {
        toggleAntiLink(m.from, false);
        logCommand(m, hisoka, 'antilink off');
        return tolak(hisoka, m,
            `╭───〔 *❌ ANTI-LINK* 〕───╮\n│\n│ 🔴 *Fitur AntiLink NONAKTIF!*\n│\n` +
            `│ ℹ️ Semua warning di grup ini\n│    juga telah direset.\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── add ───────────────────────────────────────────────────────────────────
    if (arg === 'add') {
        const config = lc();
        if (!config.antiLink?.enabled) {
            if (!m.isOwner) return tolak(hisoka, m, '❌ Fitur AntiLink dinonaktifkan secara global.\nMinta owner aktifkan dulu: *.antilink global on*');
            if (!config.antiLink) config.antiLink = {};
            config.antiLink.enabled = true;
            sc(config);
        }
        const alreadyAdded = isAntiLinkEnabled(m.from);
        toggleAntiLink(m.from, true);
        logCommand(m, hisoka, 'antilink add');
        return tolak(hisoka, m,
            `╭───〔 *✅ ANTI-LINK* 〕───╮\n│\n` +
            `│ ${alreadyAdded ? '🔄 Grup ini *sudah terdaftar* sebelumnya.' : '➕ Grup ini berhasil *ditambahkan!*'}\n│\n` +
            `│ 🌐 Global   : 🟢 Aktif\n│ 📌 Grup ini : 🟢 *Aktif*\n│\n` +
            `│ ⚙️ Konfigurasi:\n│ • Maks. warning: *${config.antiLink?.maxWarnings ?? 3}x*\n│\n` +
            `│ ℹ️ Link yang dikirim member akan\n│    dihapus & dapat peringatan/kick!\n│\n` +
            `│ 👑 Admin & Owner GC bebas kirim link.\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── reset ─────────────────────────────────────────────────────────────────
    if (arg === 'reset') {
        resetAntiLinkWarnings(m.from);
        logCommand(m, hisoka, 'antilink reset');
        return tolak(hisoka, m, '✅ Semua warning AntiLink di grup ini telah direset!');
    }

    // ── warn <n> ──────────────────────────────────────────────────────────────
    if (arg.startsWith('warn')) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mengubah batas warning!');
        const warnNum = parseInt(arg.replace(/^warn\s*/,'').trim(), 10);
        if (!warnNum || isNaN(warnNum) || warnNum < 1 || warnNum > 100) {
            return tolak(hisoka, m,
                `╭───〔 *⚠️ ANTILINK WARN* 〕───╮\n│\n│ ❌ Angka tidak valid!\n│\n` +
                `│ 📌 Format: *.antilink warn <angka>*\n│ 📌 Contoh: *.antilink warn 5*\n│\n│ ℹ️ Angka valid: *1 - 100*\n│\n╰────────────────────────────────────╯`
            );
        }
        const config = lc();
        if (!config.antiLink) config.antiLink = {};
        const oldMax = config.antiLink.maxWarnings ?? 3;
        config.antiLink.maxWarnings = warnNum;
        sc(config);
        logCommand(m, hisoka, `antilink warn ${warnNum}`);
        return tolak(hisoka, m,
            `╭───〔 *⚠️ ANTILINK WARN* 〕───╮\n│\n│ ✅ Batas warning berhasil diubah!\n│\n` +
            `│ 📊 Sebelum : *${oldMax}x*\n│ 📊 Sekarang: *${warnNum}x*\n│\n` +
            `│ ℹ️ Anggota akan dikick setelah\n│    melanggar sebanyak *${warnNum}x*\n│\n` +
            `│ 💾 Tersimpan ke config.json\n│\n╰────────────────────────────────────╯`
        );
    }

    // ── list ──────────────────────────────────────────────────────────────────
    if (arg === 'list') {
        const allGroups = getAllAntiLinkGroups();
        if (!allGroups.length) {
            return tolak(hisoka, m,
                `╭───〔 *📋 DAFTAR ANTILINK* 〕───╮\n│\n│ ❌ Belum ada grup yang terdaftar.\n│\n` +
                `│ Gunakan *.antilink add* di grup\n│ yang ingin diaktifkan.\n│\n╰────────────────────────────────────╯`
            );
        }

        const botAdminCache = loadBotAdminFile();
        const botNum = (hisoka.user?.id || '').split(':')[0].split('@')[0];

        const grupInfoList = [];
        for (let i = 0; i < allGroups.length; i++) {
            const gid = allGroups[i];
            let namaGrup = '-', totalMember = '?', totalAdmin = '?';
            let botIsAdminGrup = botAdminCache[gid] === true;
            try {
                const meta = await hisoka.groupMetadata(gid);
                if (meta) {
                    namaGrup = meta.subject || '-';
                    const parts = meta.participants || [];
                    totalMember = parts.length;
                    totalAdmin  = parts.filter(p => p.admin).length;
                    const botP  = parts.find(p => (p.jid || p.id || '').split('@')[0].split(':')[0] === botNum);
                    botIsAdminGrup = botP !== undefined ? !!botP.admin : (botAdminCache[gid] === true);
                }
            } catch {
                try {
                    const cached = hisoka.groups?.read(gid);
                    if (cached) {
                        namaGrup = cached.subject || '-';
                        const parts = cached.participants || [];
                        totalMember = parts.length;
                        totalAdmin  = parts.filter(p => p.admin).length;
                    }
                } catch {}
            }
            const warns      = getAntiLinkWarnings(gid);
            const totalWarned = Object.keys(warns).length;
            grupInfoList.push({ gid, namaGrup, totalMember, totalAdmin, totalWarned, botIsAdmin: botIsAdminGrup });
        }

        let listBaris = '';
        for (let i = 0; i < grupInfoList.length; i++) {
            const { gid, namaGrup, totalMember, totalAdmin, totalWarned, botIsAdmin } = grupInfoList[i];
            listBaris +=
                `│ *${i + 1}.* ${namaGrup}\n` +
                `│    🆔 \`${gid}\`\n` +
                `│    👥 Anggota : *${totalMember}* | 🛡️ Admin: *${totalAdmin}*\n` +
                `│    🤖 Bot Admin: ${botIsAdmin ? '✅ Ya' : '❌ Bukan'}\n` +
                `│    ⚠️ Warned  : *${totalWarned} orang*\n│\n`;
        }

        const listText =
            `╭───〔 *📋 DAFTAR ANTILINK* 〕───╮\n│\n│ 🟢 Total aktif: *${allGroups.length} grup*\n│\n` +
            listBaris +
            `│ ─────────────────────────────────\n│ 🗑️ *Cara hapus:*\n` +
            `│ Reply pesan ini dengan nomor urut\n│ Contoh: *1* atau *1,2* atau *1,2,3*\n│\n` +
            `│ Ketik *semua* → hapus semua grup\n│ Ketik *reset* → reset warning semua\n│\n╰────────────────────────────────────╯`;

        if (!global.__antiLinkListSessions) global.__antiLinkListSessions = new Map();
        const sentList = await hisoka.sendMessage(m.from, { text: listText }, { quoted: m }).catch(() => null);
        if (sentList?.key?.id) {
            global.__antiLinkListSessions.set(sentList.key.id, {
                groups: grupInfoList, from: m.from,
                by: m.sender || m.key?.participant || m.from, ts: Date.now()
            });
            setTimeout(() => global.__antiLinkListSessions?.delete(sentList.key.id), 5 * 60 * 1000);
        }
        logCommand(m, hisoka, 'antilink list');
        return;
    }

    // ── log ───────────────────────────────────────────────────────────────────
    if (arg === 'log' || arg.startsWith('log ')) {
        const logSub  = arg.slice(3).trim();

        if (logSub === 'clear all') {
            if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa clear semua log!');
            clearAntiLinkLog();
            return tolak(hisoka, m, '✅ Semua log AntiLink berhasil dihapus!');
        }
        if (logSub === 'clear') {
            clearAntiLinkLog(m.from);
            return tolak(hisoka, m, '✅ Log AntiLink grup ini berhasil dihapus!');
        }

        const showAll = (logSub === 'all') && m.isOwner;
        const rawLogs = getAntiLinkLog(showAll ? null : m.from);

        if (!rawLogs.length) {
            return tolak(hisoka, m,
                `╭───〔 *📜 LOG ANTILINK* 〕───╮\n│\n│ ℹ️ Belum ada riwayat pelanggaran${showAll ? '' : ' di grup ini'}.\n│\n` +
                `│ 📋 Sub-perintah:\n│ • *.antilink log*           → Log grup ini\n` +
                (m.isOwner ? `│ • *.antilink log all*        → Semua grup\n` : '') +
                `│ • *.antilink log clear*      → Hapus log grup ini\n` +
                (m.isOwner ? `│ • *.antilink log clear all*  → Hapus semua\n` : '') +
                `│\n╰────────────────────────────────────╯`
            );
        }

        const _fmtWaktu  = ts => new Date(ts).toLocaleString('id-ID', { timeZone:'Asia/Jakarta', day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
        const _fmtAction = l  => l.action === 'kick' ? `🔴 KICK` : `🟡 WARN ${l.warnCount}/${l.maxWarn}`;
        const totalWarn  = rawLogs.filter(l => l.action === 'warn').length;
        const totalKick  = rawLogs.filter(l => l.action === 'kick').length;

        if (showAll) {
            const byGid = {};
            for (const l of rawLogs) { if (!byGid[l.gid]) byGid[l.gid] = []; byGid[l.gid].push(l); }
            const uniqueGids = Object.keys(byGid);
            const namaCache  = {};
            await Promise.all(uniqueGids.map(async gid => {
                try { namaCache[gid] = (await hisoka.groupMetadata(gid))?.subject || gid.split('@')[0]; }
                catch { try { namaCache[gid] = hisoka.groups?.read(gid)?.subject || gid.split('@')[0]; } catch { namaCache[gid] = gid.split('@')[0]; } }
            }));
            const header =
                `╭───〔 *📜 LOG ANTILINK — SEMUA GRUP* 〕───╮\n│\n` +
                `│ 🏘️ Jumlah grup: *${uniqueGids.length}*\n│ 📊 Total log  : *${rawLogs.length}*\n` +
                `│ 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n│\n╰────────────────────────────────────╯`;
            const GRUP_PER_MSG = 5;
            for (let gi = 0; gi < uniqueGids.length; gi += GRUP_PER_MSG) {
                const batch = uniqueGids.slice(gi, gi + GRUP_PER_MSG);
                let batchTxt = '';
                for (const gid of batch) {
                    const logs  = byGid[gid].slice(-10).reverse();
                    const gWarn = byGid[gid].filter(l => l.action === 'warn').length;
                    const gKick = byGid[gid].filter(l => l.action === 'kick').length;
                    batchTxt += `┌─〔 *🏘️ ${namaCache[gid]}* 〕\n│ 📊 Total: *${byGid[gid].length}* | 🟡 ${gWarn} | 🔴 ${gKick}\n│\n`;
                    for (let i = 0; i < logs.length; i++) {
                        const l = logs[i];
                        batchTxt += `│ *${i+1}.* ${_fmtAction(l)}\n│    👤 @${l.senderNum}\n│    🔗 ${l.link || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n│\n`;
                    }
                    batchTxt += `└────────────────────────────────\n\n`;
                }
                const finalTxt = gi === 0 ? header + '\n\n' + batchTxt.trim() : batchTxt.trim();
                await tolak(hisoka, m, finalTxt);
                if (gi + GRUP_PER_MSG < uniqueGids.length) await new Promise(r => setTimeout(r, 600));
            }
        } else {
            const recent = rawLogs.slice(-25).reverse();
            let logBaris = '';
            for (let i = 0; i < recent.length; i++) {
                const l = recent[i];
                logBaris += `│ *${i+1}.* ${_fmtAction(l)}\n│    👤 @${l.senderNum || l.senderJid?.split('@')[0]}\n│    🔗 ${l.link || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n│\n`;
            }
            await tolak(hisoka, m,
                `╭───〔 *📜 LOG ANTILINK* 〕───╮\n│\n│ 📊 Total log grup ini: *${rawLogs.length}*\n` +
                `│ 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n│ (Tampil 25 terbaru)\n│\n` +
                logBaris +
                `│ 📋 Sub-perintah:\n│ • *.antilink log*           → Log grup ini\n` +
                (m.isOwner ? `│ • *.antilink log all*        → Semua grup\n` : '') +
                `│ • *.antilink log clear*      → Hapus log grup ini\n` +
                (m.isOwner ? `│ • *.antilink log clear all*  → Hapus semua\n` : '') +
                `│\n╰────────────────────────────────────╯`
            );
        }
        logCommand(m, hisoka, 'antilink log');
        return;
    }

    // ── status (default) ──────────────────────────────────────────────────────
    const config       = lc();
    const globalEnabled = config.antiLink?.enabled ?? false;
    const maxWarnings   = config.antiLink?.maxWarnings ?? 3;
    const isEnabled     = isAntiLinkEnabled(m.from);
    const warns         = getAntiLinkWarnings(m.from);
    const totalWarned   = Object.keys(warns).length;

    // Cek bot admin realtime
    const botJid = jidNormalizedUser(hisoka.user?.id || '');
    const { isAdmin: botIsAdmin } = await getBotAdminStatus(m.from, botJid.split('@')[0], hisoka);

    let grupStatus;
    if (isEnabled) grupStatus = '🟢 Aktif';
    else if (globalEnabled) grupStatus = '🔴 Nonaktif *(belum ditambahkan)*';
    else grupStatus = '🔴 Nonaktif';

    const hintAdd = globalEnabled && !isEnabled
        ? `│ 💡 Ketik *.antilink add* untuk\n│    mengaktifkan di grup ini!\n│\n` : '';

    return tolak(hisoka, m,
        `╭───〔 *ℹ️ ANTI-LINK* 〕───╮\n│\n` +
        `│ 🌐 Global   : ${globalEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
        `│ 📌 Grup ini : ${grupStatus}\n` +
        `│ 🤖 Bot Admin: ${botIsAdmin ? '✅ Ya (hapus & kick)' : '❌ Tidak (hanya warn)'}\n│\n` +
        `│ ⚙️ Konfigurasi:\n│ • Maks. warning: *${maxWarnings}x*\n│ • Member warned: *${totalWarned} orang*\n│\n` +
        `│ ℹ️ Mendeteksi semua jenis link\n│    (http, www, wa.me, dll)\n│ 👑 Owner & Admin GC bebas kirim link\n│\n` +
        hintAdd +
        `│ 📋 Cara penggunaan:\n` +
        `│ • *.antilink add*       → Tambah grup ini\n` +
        `│ • *.antilink on*        → Aktifkan\n` +
        `│ • *.antilink off*       → Nonaktifkan\n` +
        `│ • *.antilink reset*     → Reset warning\n` +
        `│ • *.antilink status*    → Info ini\n` +
        `│ • *.antilink log*       → Riwayat\n` +
        (m.isOwner
            ? `│ • *.antilink list*      → Daftar grup\n` +
              `│ • *.antilink warn <n>*  → Set maks warn\n` +
              `│ • *.antilink global on*  → Aktifkan global\n` +
              `│ • *.antilink global off* → Nonaktifkan\n`
            : '') +
        `│\n╰────────────────────────────────────╯`
    );
}

// ═══════════════════════════════════════════════════════════════
//  Callbacks — Tangani reply dari .antilink list (sesi interaktif)
// ═══════════════════════════════════════════════════════════════
export async function handleAntilinkCallbacks({ hisoka, m, tolak }) {
    if (!global.__antiLinkListSessions?.size) return false;
    if (!m.quoted?.key?.id) return false;
    if (!m.isOwner && !m.isAdmin) return false;

    const sessId = m.quoted.key.id;
    const sess   = global.__antiLinkListSessions?.get(sessId);
    if (!sess || sess.from !== m.from) return false;

    const rawReply = (m.text || m.body || '').trim().toLowerCase();
    if (!rawReply) return false;

    global.__antiLinkListSessions.delete(sessId);

    try {
        const { groups: sessGroups } = sess;
        if (rawReply === 'semua') {
            const total = sessGroups.length;
            for (const g of sessGroups) toggleAntiLink(g.gid, false);
            await tolak(hisoka, m,
                `╭───〔 *🗑️ HAPUS SEMUA* 〕───╮\n│\n│ ✅ Semua grup dihapus!\n│ 🗑️ Total: *${total} grup*\n│ ⚠️ Semua warning juga direset.\n│\n╰────────────────────────────────────╯`
            );
        } else if (rawReply === 'reset') {
            for (const g of sessGroups) resetAntiLinkWarnings(g.gid);
            await tolak(hisoka, m,
                `╭───〔 *🔄 RESET WARNING* 〕───╮\n│\n│ ✅ Warning direset!\n│ 📊 Total: *${sessGroups.length} grup*\n│ 🟢 Grup tetap terdaftar.\n│\n╰────────────────────────────────────╯`
            );
        } else {
            const nums = rawReply.split(/[,\s]+/)
                .map(n => parseInt(n.trim(), 10))
                .filter(n => !isNaN(n) && n >= 1 && n <= sessGroups.length);
            const uniq = [...new Set(nums)];
            if (!uniq.length) {
                await tolak(hisoka, m,
                    `❌ Nomor tidak valid!\nMasukkan angka 1-${sessGroups.length}, contoh: *1* atau *1,2,3*\nAtau ketik *semua* / *reset*`
                );
            } else {
                const dihapus = [];
                for (const n of uniq) {
                    const g = sessGroups[n - 1];
                    if (g) { toggleAntiLink(g.gid, false); dihapus.push(`${n}. *${g.namaGrup}*`); }
                }
                const listDihapus = dihapus.map(d => `│ ✅ ${d}`).join('\n');
                await tolak(hisoka, m,
                    `╭───〔 *🗑️ ANTILINK REMOVED* 〕───╮\n│\n│ ✅ *${dihapus.length} grup* berhasil dihapus!\n│\n` +
                    listDihapus + `\n│\n│ ⚠️ Warning di grup tersebut direset.\n│\n╰────────────────────────────────────╯`
                );
            }
        }
    } catch (e) {
        await tolak(hisoka, m, `❌ Gagal proses: ${e.message}`);
    }
    return true;
}
