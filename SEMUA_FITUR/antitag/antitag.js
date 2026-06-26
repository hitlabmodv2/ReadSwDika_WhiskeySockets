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
 *  Hapus otomatis pesan yang men-tag nomor bot sendiri di GC
 *  (hanya aktif jika bot admin di grup tersebut)
 * ───────────────────────────────
 */

'use strict';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { isJidGroup, jidNormalizedUser, areJidsSameUser, getContentType } = _require('@whiskeysockets/baileys');

import { kvGet } from '../../src/db/datadb.js';

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

function isBotAdminInGroup(groupJid) {
    try {
        const data = kvGet('botadmin/botadmin', {});
        return data[groupJid] === true;
    } catch (_) {
        return false;
    }
}

function isBotMentioned(message, botJid, botNumber) {
    try {
        const msg = message?.message || {};
        const msgType = getContentType(msg);
        if (!msgType) return false;

        const inner = msg[msgType] || {};
        const ctx = inner?.contextInfo || {};

        if (Array.isArray(ctx?.mentionedJid)) {
            for (const jid of ctx.mentionedJid) {
                if (!jid) continue;
                if (areJidsSameUser(jid, botJid)) return true;
                const jidNum = jid.split('@')[0].split(':')[0];
                if (botNumber && jidNum === botNumber) return true;
            }
        }

        const textContent = inner?.text || inner?.caption || msg?.conversation || '';
        if (textContent && botNumber && textContent.includes(`@${botNumber}`)) return true;

    } catch (_) {}
    return false;
}

// ── Auto-handler: dipanggil dari index.js di messages.upsert ──────────────────
export default async function handleAntiTagBot(message, hisoka) {
    try {
        if (!message?.key?.remoteJid) return;
        if (!message?.message) return;

        const remoteJid = message.key.remoteJid;
        if (!isJidGroup(remoteJid)) return;
        if (message.key?.fromMe) return;

        if (!isAntiTagBotEnabled()) return;

        const botJid    = getBotJid(hisoka);
        const botNumber = getBotNumber(hisoka);

        if (!isBotMentioned(message, botJid, botNumber)) return;

        const isAdmin = isBotAdminInGroup(remoteJid);
        if (!isAdmin) {
            console.log(`\x1b[33m[AntiTagBot] Di-tag di ${remoteJid.split('@')[0]} tapi bot bukan admin — skip.\x1b[39m`);
            return;
        }

        await hisoka.sendMessage(remoteJid, { delete: message.key });
        console.log(`\x1b[32m[AntiTagBot] ✅ Pesan tag bot dihapus di ${remoteJid.split('@')[0]}\x1b[39m`);

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
            `│ Siapapun yang tag nomor bot\n` +
            `│ di GC akan dihapus pesannya\n` +
            `│ (jika bot admin di grup).\n` +
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
