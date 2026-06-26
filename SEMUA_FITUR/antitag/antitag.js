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
 *  antitag.js — Anti-Tag Nomor Bot di Grup
 *  Hapus otomatis pesan yang men-tag nomor bot sendiri di GC.
 *  Aman untuk: owner, admin grup.
 *  Syarat hapus: bot harus admin di grup.
 * ───────────────────────────────
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { isJidGroup, jidNormalizedUser, areJidsSameUser, getContentType } = _require('@whiskeysockets/baileys');

import { kvGet, kvSet } from '../../src/db/datadb.js';

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (_) {}
    return {};
}

function saveConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (err) {
        console.error('\x1b[31m[AntiTagBot] Gagal simpan config:\x1b[39m', err.message);
    }
}

export function isAntiTagBotEnabled() {
    return !!(loadConfig()?.antiTagBot?.enabled);
}

function getBotJid(hisoka) {
    return jidNormalizedUser(hisoka.user?.id || '');
}

function getBotNumber(hisoka) {
    return (hisoka.user?.id || '').split('@')[0].split(':')[0];
}

function getSenderNumber(message) {
    const raw = message.key?.participant || message.participant || message.key?.remoteJid || '';
    return raw.split('@')[0].split(':')[0];
}

function getSenderJid(message) {
    const raw = message.key?.participant || message.participant || '';
    if (!raw) return null;
    return jidNormalizedUser(raw);
}

function isOwnerNumber(num, config) {
    const owners = config.owners || [];
    return owners.some(o => String(o) === String(num));
}

function findParticipant(participants, targetNumber) {
    return (participants || []).find(p => {
        const pNum = (p.jid || p.phoneNumber || p.id || '').split('@')[0].split(':')[0];
        return pNum === targetNumber;
    });
}

/**
 * Deteksi apakah pesan ini men-tag nomor bot.
 * Cek 1: mentionedJid array di contextInfo (semua tipe pesan)
 * Cek 2: teks @nomor secara harfiah
 */
function isBotMentioned(message, botJid, botNumber) {
    try {
        const msg = message?.message;
        if (!msg) return false;

        // Cari contextInfo di semua lapisan pesan yang mungkin ada mentionedJid
        const msgType = getContentType(msg);

        // Daftar objek yang mungkin punya contextInfo
        const candidates = [
            msg[msgType],
            msg.extendedTextMessage,
            msg.imageMessage,
            msg.videoMessage,
            msg.audioMessage,
            msg.documentMessage,
            msg.stickerMessage,
            msg.buttonsMessage,
            msg.listMessage,
            msg.templateMessage?.hydratedTemplate,
        ].filter(Boolean);

        for (const obj of candidates) {
            const mentioned = obj?.contextInfo?.mentionedJid;
            if (Array.isArray(mentioned)) {
                for (const jid of mentioned) {
                    if (!jid) continue;
                    if (areJidsSameUser(jid, botJid)) return true;
                    const jidNum = jid.split('@')[0].split(':')[0];
                    if (botNumber && jidNum === botNumber) return true;
                }
            }
        }

        // Fallback: cek teks harfiah @nomor
        const textContent =
            msg?.conversation ||
            msg?.extendedTextMessage?.text ||
            msg?.imageMessage?.caption ||
            msg?.videoMessage?.caption ||
            msg?.documentMessage?.caption ||
            '';

        if (textContent && botNumber && textContent.includes(`@${botNumber}`)) return true;

    } catch (_) {}
    return false;
}

// ── Auto-handler: dipanggil dari message.js ──────────────────────────────────
export default async function handleAntiTagBot(message, hisoka) {
    try {
        if (!message?.key?.remoteJid) return;
        if (!message?.message) return;

        const remoteJid = message.key.remoteJid;
        if (!isJidGroup(remoteJid)) return;
        if (message.key?.fromMe) return;

        // Cek config aktif
        if (!isAntiTagBotEnabled()) return;

        const botJid    = getBotJid(hisoka);
        const botNumber = getBotNumber(hisoka);

        // Apakah pesan ini tag nomor bot?
        if (!isBotMentioned(message, botJid, botNumber)) return;

        console.log(`\x1b[36m[AntiTagBot] Tag terdeteksi di grup ${remoteJid.split('@')[0]}\x1b[39m`);

        // Ambil sender
        const senderJid    = getSenderJid(message);
        const senderNumber = getSenderNumber(message);

        const config = loadConfig();

        // ── Exempt: owner selalu aman ──────────────────────────────────────────
        if (isOwnerNumber(senderNumber, config)) {
            console.log(`\x1b[33m[AntiTagBot] Owner (${senderNumber}) tag bot — aman, skip.\x1b[39m`);
            return;
        }

        // ── Cek apakah bot admin di grup ini (live fetch dulu, fallback KV) ────
        let isAdmin = false;
        let groupMeta = null;
        let senderIsGroupAdmin = false;

        try {
            // Live fetch — paling akurat
            groupMeta = await hisoka.groupMetadata(remoteJid);
            if (groupMeta) hisoka.groups?.write(remoteJid, groupMeta);

            const botP    = findParticipant(groupMeta?.participants, botNumber);
            isAdmin       = !!botP?.admin;

            // Update KV cache
            const botAdminData = kvGet('botadmin/botadmin', {});
            botAdminData[remoteJid] = isAdmin;
            kvSet('botadmin/botadmin', botAdminData);

            // Cek apakah sender adalah admin grup
            const senderP = senderJid
                ? groupMeta?.participants?.find(p => areJidsSameUser(p.id || p.jid || '', senderJid))
                : findParticipant(groupMeta?.participants, senderNumber);
            senderIsGroupAdmin = !!senderP?.admin;

        } catch (_fetchErr) {
            // Fallback: KV cache
            const botAdminData = kvGet('botadmin/botadmin', {});
            if (remoteJid in botAdminData) {
                isAdmin = botAdminData[remoteJid] === true;
            }
            // Fallback: memory cache
            if (!groupMeta) {
                groupMeta = hisoka.groups?.read(remoteJid) || null;
                if (groupMeta) {
                    const botP = findParticipant(groupMeta?.participants, botNumber);
                    isAdmin    = !!botP?.admin;
                    const senderP = senderJid
                        ? groupMeta?.participants?.find(p => areJidsSameUser(p.id || p.jid || '', senderJid))
                        : findParticipant(groupMeta?.participants, senderNumber);
                    senderIsGroupAdmin = !!senderP?.admin;
                }
            }
        }

        console.log(`\x1b[36m[AntiTagBot] grup=${remoteJid.split('@')[0]} | botAdmin=${isAdmin} | sender=${senderNumber} | senderAdmin=${senderIsGroupAdmin}\x1b[39m`);

        // ── Exempt: admin grup aman ────────────────────────────────────────────
        if (senderIsGroupAdmin) {
            console.log(`\x1b[33m[AntiTagBot] Admin grup (${senderNumber}) tag bot — aman, skip.\x1b[39m`);
            return;
        }

        // ── Bot harus admin untuk bisa hapus ──────────────────────────────────
        if (!isAdmin) {
            console.log(`\x1b[33m[AntiTagBot] Bot bukan admin di ${remoteJid.split('@')[0]} — tidak bisa hapus.\x1b[39m`);
            return;
        }

        // ── Hapus pesan ────────────────────────────────────────────────────────
        await hisoka.sendMessage(remoteJid, { delete: message.key });
        console.log(`\x1b[32m[AntiTagBot] ✅ Pesan tag bot dari ${senderNumber} dihapus di ${remoteJid.split('@')[0]}\x1b[39m`);

    } catch (err) {
        console.error('\x1b[31m[AntiTagBot] Error:\x1b[39m', err?.message || err);
    }
}

// ── Command handler: .antitag on/off ─────────────────────────────────────────
export async function handleAntitag({ hisoka, m, query, tolak, logCommand }) {
    if (!m.isOwner) return;
    logCommand?.(m, 'antitag');

    const arg = (query || '').trim().toLowerCase();
    const cfg = loadConfig();

    if (!cfg.antiTagBot) cfg.antiTagBot = { enabled: false };
    const isOn = cfg.antiTagBot.enabled;

    const BOX_TOP    = `╭══『 🚫 *ANTI-TAG BOT* 』══╮`;
    const BOX_BTM    = `╰══════════════════════════╯`;
    const STATUS_STR = isOn ? '✅ *ON*' : '❌ *OFF*';

    if (!arg || arg === 'status') {
        await tolak(hisoka, m,
            `${BOX_TOP}\n` +
            `│\n` +
            `│ 🔍 *Status:* ${STATUS_STR}\n` +
            `│\n` +
            `│ Hapus otomatis pesan yang\n` +
            `│ men-tag nomor bot di GC.\n` +
            `│\n` +
            `│ 📌 *Syarat aktif:*\n` +
            `│  • Bot harus *admin* di grup\n` +
            `│  • Fitur ini *ON*\n` +
            `│\n` +
            `│ 🛡️ *Yang aman (tidak dihapus):*\n` +
            `│  • Owner bot\n` +
            `│  • Admin grup\n` +
            `│\n` +
            `│ 📝 *Penggunaan:*\n` +
            `│  .antitag on  → Aktifkan\n` +
            `│  .antitag off → Matikan\n` +
            `│\n` +
            `${BOX_BTM}`
        );
        return;
    }

    if (arg === 'on') {
        if (isOn) {
            await tolak(hisoka, m,
                `${BOX_TOP}\n│\n│ ℹ️ Fitur sudah *ON*.\n│\n${BOX_BTM}`
            );
            return;
        }
        cfg.antiTagBot.enabled = true;
        saveConfig(cfg);
        await tolak(hisoka, m,
            `${BOX_TOP}\n` +
            `│\n` +
            `│ ✅ Anti-Tag Bot *AKTIF*\n` +
            `│\n` +
            `│ Member yang tag nomor bot\n` +
            `│ di GC akan dihapus pesannya.\n` +
            `│\n` +
            `│ 🛡️ Owner & admin grup aman.\n` +
            `│\n` +
            `${BOX_BTM}`
        );
        return;
    }

    if (arg === 'off') {
        if (!isOn) {
            await tolak(hisoka, m,
                `${BOX_TOP}\n│\n│ ℹ️ Fitur sudah *OFF*.\n│\n${BOX_BTM}`
            );
            return;
        }
        cfg.antiTagBot.enabled = false;
        saveConfig(cfg);
        await tolak(hisoka, m,
            `${BOX_TOP}\n` +
            `│\n` +
            `│ ❌ Anti-Tag Bot *NONAKTIF*\n` +
            `│\n` +
            `│ Fitur berhasil dimatikan.\n` +
            `│\n` +
            `${BOX_BTM}`
        );
        return;
    }

    await tolak(hisoka, m,
        `${BOX_TOP}\n│\n│ ❓ Perintah tidak dikenal.\n│ Gunakan: *on* atau *off*\n│\n${BOX_BTM}`
    );
}
