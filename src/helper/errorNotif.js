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
 * ───────────────────────────────
 */
'use strict';

import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.resolve('./config.json');

const DAYS_ID   = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function _loadCfg() {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
    catch { return {}; }
}

function _formatDate(d) {
    const day   = DAYS_ID[d.getDay()];
    const tgl   = String(d.getDate()).padStart(2, '0');
    const bulan = MONTHS_ID[d.getMonth()];
    const thn   = d.getFullYear();
    return `${day}, ${tgl} ${bulan} ${thn}`;
}

function _formatTime(d) {
    const h  = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    const s  = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${mn}:${s}`;
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
 * Kirim notifikasi error ke nomor tujuan via WhatsApp.
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

        // ── Filter: lewati error jaringan/timeout biasa ──────────────────────
        if (_isFiltered(errMsg, notifCfg.ignorePatterns)) return;

        const targetJid = `${notifCfg.target}@s.whatsapp.net`;
        const now       = new Date();

        const command    = m?.command ? `.${m.command}` : '?';
        const senderName = m?.pushName || 'Unknown';
        const senderNum  = m?.sender
            ? '+' + String(m.sender).split('@')[0].split(':')[0]
            : '?';
        const groupName  = m?.isGroup
            ? (m?.groupSubject || 'Grup')
            : 'Private Chat';

        const stackRaw = (error?.stack || '')
            .split('\n')
            .filter(l => l.trim() && !l.includes(errMsg))
            .slice(0, 2)
            .map(l => `│ ${l.trim()}`)
            .join('\n');

        const text =
`⚠️ *ERROR REPORT — WILY BOT*

╭─〔 🐛 ᴅᴇᴛᴀɪʟ ᴇʀʀᴏʀ 〕
│ 📌 ᴄᴏᴍᴍᴀɴᴅ   : ${command}
│ 👤 ᴘᴇɴɢɢᴜɴᴀ  : ${senderName}
│ 📞 ɴᴜᴍʙᴇʀ    : ${senderNum}
│ 👥 Grup        : ${groupName}
│ 🕒 ᴡᴀᴋᴛᴜ     : ${_formatTime(now)}
│ 📅 ᴛᴀɴɢɢᴀʟ   : ${_formatDate(now)}
╰────────────────⬣

╭─〔 💥 ᴘᴇsᴀɴ ᴇʀʀᴏʀ 〕
│ ${errMsg}${stackRaw ? '\n│\n' + stackRaw : ''}
╰────────────────⬣`;

        // ── Kirim dengan copy button jika Button tersedia ────────────────────
        if (Button) {
            let sent = false;
            try {
                await new Button()
                    .setBody(text)
                    .addCopy('📋 Copy Error Code', errMsg, 'copy_errnotif')
                    .run(targetJid, hisoka);
                sent = true;
            } catch (_) {}
            // Fallback plain text jika button gagal
            if (!sent) await hisoka.sendMessage(targetJid, { text });
        } else {
            await hisoka.sendMessage(targetJid, { text });
        }
    } catch (_) {}
}
