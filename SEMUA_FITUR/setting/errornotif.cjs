/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  errornotif.cjs — Handler .errornotif
 *  Aktif/nonaktif notifikasi error via WA
 *  Hanya bot utama, bukan jadibot
 * ───────────────────────────────
 */
'use strict';

// ── Auto-delete pesan terakhir per JID ───────────────────────────────────────
const _lastMsgMap = new Map();

async function _deleteLastMsg(hisoka, jid) {
    const key = _lastMsgMap.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    _lastMsgMap.delete(jid);
}

// ── Build body status ────────────────────────────────────────────────────────
function _buildBody(enabled, target) {
    const statusIcon = enabled ? '✅' : '🔕';
    const statusText = enabled ? 'Aktif' : 'Nonaktif';
    return (
        `╭═══『 🐛 *ERROR NOTIF* 』═══╮\n` +
        `│\n` +
        `│ ${statusIcon} *Status  :* ${statusText}\n` +
        `│ 📞 *Target  :* +${target || '-'}\n` +
        `│\n` +
        `│ _Notifikasi error dikirim ke_\n` +
        `│ _nomor tujuan via WhatsApp_\n` +
        `│\n` +
        `╰═════════════════════════╯`
    );
}

// ── Kirim button selection ───────────────────────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, enabled) {
    if (Button) {
        let sent = false;
        try {
            const mark = (state) => (enabled === state) ? '✓ ' : '';

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Error Notif')
                .addSelection('🎛️ Pilih Pengaturan')
                .makeSections('⚙️ Status Notifikasi')
                .makeRow(
                    mark(true) + '✅ Aktifkan',
                    'Error Notif ON',
                    enabled ? '⚡ Sedang Aktif — Notifikasi error dikirim ke WA' : 'Aktifkan notifikasi error ke WhatsApp',
                    `${pref}errornotif on`
                )
                .makeRow(
                    mark(false) + '🔕 Matikan',
                    'Error Notif OFF',
                    !enabled ? '⚡ Sedang Aktif — Notifikasi error dimatikan' : 'Matikan notifikasi error ke WhatsApp',
                    `${pref}errornotif off`
                )
                .makeSections('🧪 Uji Coba')
                .makeRow(
                    '🧪 Test Kirim',
                    'Simulasi Error Notif',
                    'Kirim contoh pesan error notif ke nomor tujuan',
                    `${pref}errornotif test`
                );

            await _deleteLastMsg(hisoka, m.from);
            const result = await btn.run(m.from, hisoka, m);
            if (result?.key) _lastMsgMap.set(m.from, result.key);
            sent = true;
        } catch (_) {}
        if (!sent) await _sendFallback(tolak, hisoka, m, bodyText, pref, enabled);
    } else {
        await _sendFallback(tolak, hisoka, m, bodyText, pref, enabled);
    }
}

// ── Fallback teks biasa ───────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref, enabled) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `${pref}errornotif on  — Aktifkan notif error\n` +
        `${pref}errornotif off — Matikan notif error\n` +
        `${pref}errornotif test — Kirim simulasi error ke nomor tujuan`
    );
}

// ── Format tanggal Indonesia ─────────────────────────────────────────────────
const _DAYS_ID   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const _MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];

function _fmtDate(d) {
    return `${_DAYS_ID[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${_MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}
function _fmtTime(d) {
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2,'0')).join(':');
}

// ── Kirim test notification ──────────────────────────────────────────────────
async function _sendTestNotif(hisoka, m, target) {
    const now     = new Date();
    const fakeErr = new Error('timeout of 60000ms exceeded');
    fakeErr.stack = `Error: timeout of 60000ms exceeded\n    at createTimeoutError (axios/lib/adapters/http.js:608:16)\n    at RedirectableRequest.handleTimeout (axios/lib/adapters/http.js:1331:17)`;

    const command    = `.${m.command}`;
    const senderName = m.pushName || 'Test User';
    const senderNum  = '+' + String(m.sender || '').split('@')[0].split(':')[0];
    const groupName  = m.isGroup ? (m.groupSubject || 'Grup') : 'Private Chat';
    const errMsg     = fakeErr.message;
    const stackLines = (fakeErr.stack || '')
        .split('\n')
        .filter(l => l.trim() && !l.includes(errMsg))
        .slice(0, 2)
        .map(l => `│ ${l.trim()}`)
        .join('\n');

    const text =
`🧪 *[TEST] ERROR REPORT — WILY BOT*

╭─〔 🐛 ᴅᴇᴛᴀɪʟ ᴇʀʀᴏʀ 〕
│ 📌 ᴄᴏᴍᴍᴀɴᴅ   : ${command}
│ 👤 ᴘᴇɴɢɢᴜɴᴀ  : ${senderName}
│ 📞 ɴᴜᴍʙᴇʀ    : ${senderNum}
│ 👥 Grup        : ${groupName}
│ 🕒 ᴡᴀᴋᴛᴜ     : ${_fmtTime(now)}
│ 📅 ᴛᴀɴɢɢᴀʟ   : ${_fmtDate(now)}
╰────────────────⬣

╭─〔 💥 ᴘᴇsᴀɴ ᴇʀʀᴏʀ 〕
│ ${errMsg}${stackLines ? '\n│\n' + stackLines : ''}
╰────────────────⬣

_Ini adalah pesan uji coba. Jika kamu menerima ini, fitur Error Notif berjalan dengan benar! ✅_`;

    const targetJid = `${target}@s.whatsapp.net`;
    await hisoka.sendMessage(targetJid, { text });
}

// ── Handler utama ────────────────────────────────────────────────────────────
async function handleErrornotif({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, Button }) {
    try {
        const pref  = m.prefix || '.';
        const cfg   = loadConfig();
        const notif = cfg.errorNotif || { enabled: true, target: '6289688206739' };
        const args  = (query || '').toLowerCase().trim();

        // ── Tanpa argumen → tampil status + button ────────────────────────────
        if (!args) {
            const bodyText = _buildBody(notif.enabled, notif.target);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, notif.enabled);
            logCommand(m, 'errornotif');
            return;
        }

        // ── ON ────────────────────────────────────────────────────────────────
        if (args === 'on') {
            if (notif.enabled) {
                const body = `ℹ️ *Error Notif sudah aktif sebelumnya!*\n\n` + _buildBody(true, notif.target);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, true);
            } else {
                cfg.errorNotif = { ...notif, enabled: true };
                saveConfig(cfg);
                const body = `✅ *Error Notif Diaktifkan!*\n\n` + _buildBody(true, cfg.errorNotif.target);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, true);
            }
            logCommand(m, 'errornotif on');
            return;
        }

        // ── OFF ───────────────────────────────────────────────────────────────
        if (args === 'off') {
            if (!notif.enabled) {
                const body = `ℹ️ *Error Notif sudah nonaktif sebelumnya!*\n\n` + _buildBody(false, notif.target);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, false);
            } else {
                cfg.errorNotif = { ...notif, enabled: false };
                saveConfig(cfg);
                const body = `🔕 *Error Notif Dimatikan!*\n\n` + _buildBody(false, cfg.errorNotif.target);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, false);
            }
            logCommand(m, 'errornotif off');
            return;
        }

        // ── TEST ──────────────────────────────────────────────────────────────
        if (args === 'test') {
            const target = notif.target;
            if (!target) {
                await tolak(hisoka, m, `❌ Nomor target belum diset di config.json!\n\nTambahkan: _"target": "628xxx"_ di bagian *errorNotif* config.`);
                return;
            }
            await tolak(hisoka, m, `🧪 *Mengirim simulasi error notif...*\n📞 Target: +${target}`);
            await _sendTestNotif(hisoka, m, target);
            await tolak(hisoka, m, `✅ *Simulasi berhasil dikirim!*\nCek WA nomor *+${target}* — jika pesan diterima, fitur berjalan normal.`);
            logCommand(m, 'errornotif test');
            return;
        }

        // ── Perintah tidak dikenal ────────────────────────────────────────────
        await tolak(hisoka, m, `❌ Perintah tidak valid.\nKetik *${pref}errornotif* untuk melihat pilihan.`);

    } catch (error) {
        console.error('\x1b[31m[ErrorNotif] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `❌ Error: ${error.message}`);
    }
}

module.exports = { handleErrornotif };
