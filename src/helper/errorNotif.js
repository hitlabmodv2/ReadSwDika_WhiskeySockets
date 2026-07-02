/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  errorNotif.js — Kirim notifikasi error ke WA
 *  Aktif/nonaktif via .errornotif on/off
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
 * Kirim notifikasi error ke nomor tujuan via WhatsApp.
 * @param {object} hisoka  - socket Baileys
 * @param {object} m       - message object
 * @param {Error}  error   - error yang terjadi
 */
export async function sendErrorNotif(hisoka, m, error) {
    try {
        const cfg      = _loadCfg();
        const notifCfg = cfg?.errorNotif;
        if (!notifCfg?.enabled || !notifCfg?.target) return;

        const target = `${notifCfg.target}@s.whatsapp.net`;
        const now    = new Date();

        const command    = m?.command ? `.${m.command}` : '?';
        const senderName = m?.pushName || 'Unknown';
        const senderNum  = m?.sender
            ? '+' + String(m.sender).split('@')[0].split(':')[0]
            : '?';
        const groupName  = m?.isGroup
            ? (m?.groupSubject || 'Grup')
            : 'Private Chat';

        const errMsg    = error?.message || String(error);
        const stackRaw  = (error?.stack || '')
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

        await hisoka.sendMessage(target, { text });
    } catch (_) {}
}
