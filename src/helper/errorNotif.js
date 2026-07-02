/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  errorNotif.js — Kirim notifikasi error ke WA
 *  + button copy error code saja
 *  + filter pattern — error jaringan tidak spam
 *  + global hook — cover SEMUA file/script bot
 * ───────────────────────────────
 */
'use strict';

import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.resolve('./config.json');

const DAYS_ID   = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ── Simpan referensi hisoka agar bisa dipakai dari mana saja ─────────────────
let _hisokaRef = null;

export function setErrorNotifSocket(hisoka) {
    _hisokaRef = hisoka;
}

function _loadCfg() {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
    catch { return {}; }
}

function _formatDate(d) {
    return `${DAYS_ID[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function _formatTime(d) {
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2,'0')).join(':');
}

/**
 * Cek apakah error ini harus dilewati (terfilter).
 */
function _isFiltered(errMsg, ignorePatterns) {
    if (!Array.isArray(ignorePatterns) || ignorePatterns.length === 0) return false;
    const lower = errMsg.toLowerCase();
    for (const pat of ignorePatterns) {
        if (!pat || typeof pat !== 'string') continue;
        if (lower.includes(pat.toLowerCase())) return true;
    }
    return false;
}

/**
 * Build teks pesan error notif.
 */
function _buildText(prefix, command, senderName, senderNum, groupName, errMsg, stackRaw, now) {
    return (
        `${prefix}\n\n` +
        `╭─〔 🐛 ᴅᴇᴛᴀɪʟ ᴇʀʀᴏʀ 〕\n` +
        `│ 📌 ᴄᴏᴍᴍᴀɴᴅ   : ${command}\n` +
        `│ 👤 ᴘᴇɴɢɢᴜɴᴀ  : ${senderName}\n` +
        `│ 📞 ɴᴜᴍʙᴇʀ    : ${senderNum}\n` +
        `│ 👥 Grup        : ${groupName}\n` +
        `│ 🕒 ᴡᴀᴋᴛᴜ     : ${_formatTime(now)}\n` +
        `│ 📅 ᴛᴀɴɢɢᴀʟ   : ${_formatDate(now)}\n` +
        `╰────────────────⬣\n\n` +
        `╭─〔 💥 ᴘᴇsᴀɴ ᴇʀʀᴏʀ 〕\n` +
        `│ ${errMsg}${stackRaw ? '\n│\n' + stackRaw : ''}\n` +
        `╰────────────────⬣`
    );
}

/**
 * Kirim notifikasi error dari command handler (message.js).
 * @param {object}   hisoka  - socket Baileys
 * @param {object}   m       - message object
 * @param {Error}    error   - error yang terjadi
 * @param {Function} Button  - Button class (opsional, untuk copy button)
 */
export async function sendErrorNotif(hisoka, m, error, Button) {
    try {
        const cfg      = _loadCfg();
        const notifCfg = cfg?.errorNotif;
        if (!notifCfg?.enabled || !notifCfg?.target) return;

        const errMsg = error?.message || String(error);
        if (_isFiltered(errMsg, notifCfg.ignorePatterns)) return;

        const targetJid  = `${notifCfg.target}@s.whatsapp.net`;
        const now        = new Date();
        const command    = m?.command ? `.${m.command}` : '?';
        const senderName = m?.pushName || 'Unknown';
        const senderNum  = m?.sender ? '+' + String(m.sender).split('@')[0].split(':')[0] : '?';
        const groupName  = m?.isGroup ? (m?.groupSubject || 'Grup') : 'Private Chat';

        const stackRaw = (error?.stack || '')
            .split('\n')
            .filter(l => l.trim() && !l.includes(errMsg))
            .slice(0, 2)
            .map(l => `│ ${l.trim()}`)
            .join('\n');

        const text = _buildText(
            '⚠️ *ERROR REPORT — WILY BOT*',
            command, senderName, senderNum, groupName, errMsg, stackRaw, now
        );

        if (Button) {
            let sent = false;
            try {
                await new Button()
                    .setBody(text)
                    .addCopy('📋 Copy Error Code', errMsg, 'copy_errnotif')
                    .run(targetJid, hisoka);
                sent = true;
            } catch (_) {}
            if (!sent) await hisoka.sendMessage(targetJid, { text });
        } else {
            await hisoka.sendMessage(targetJid, { text });
        }
    } catch (_) {}
}

/**
 * Kirim notifikasi error GLOBAL — dipanggil dari crashGuard.js
 * untuk error uncaughtException / unhandledRejection dari semua file.
 * Tidak pakai Button (tidak ada akses di level global).
 * @param {Error}  error   - error yang terjadi
 * @param {string} source  - sumber error (mis. 'uncaughtException', 'hotReload')
 */
export async function sendGlobalErrorNotif(error, source) {
    try {
        const hisoka = _hisokaRef;
        if (!hisoka) return;

        const cfg      = _loadCfg();
        const notifCfg = cfg?.errorNotif;
        if (!notifCfg?.enabled || !notifCfg?.target) return;

        const errMsg = error?.message || String(error);
        if (_isFiltered(errMsg, notifCfg.ignorePatterns)) return;

        const targetJid = `${notifCfg.target}@s.whatsapp.net`;
        const now       = new Date();

        const stackRaw = (error?.stack || '')
            .split('\n')
            .filter(l => l.trim() && !l.includes(errMsg))
            .slice(0, 2)
            .map(l => `│ ${l.trim()}`)
            .join('\n');

        const text = _buildText(
            '🚨 *GLOBAL ERROR — WILY BOT*',
            `[${source || 'system'}]`,
            '-', '-', '-',
            errMsg, stackRaw, now
        );

        await hisoka.sendMessage(targetJid, { text });
    } catch (_) {}
}
