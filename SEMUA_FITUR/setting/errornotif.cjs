/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  errornotif.cjs — Handler .errornotif
 *  Aktif/nonaktif + filter pattern notifikasi error
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
function _buildBody(enabled, target, ignorePatterns) {
    const statusIcon   = enabled ? '✅' : '🔕';
    const statusText   = enabled ? 'Aktif' : 'Nonaktif';
    const filterCount  = Array.isArray(ignorePatterns) ? ignorePatterns.length : 0;
    return (
        `╭═══『 🐛 *ERROR NOTIF* 』═══╮\n` +
        `│\n` +
        `│ ${statusIcon} *Status  :* ${statusText}\n` +
        `│ 📞 *Target  :* +${target || '-'}\n` +
        `│ 🔇 *Filter  :* ${filterCount} pattern dilewati\n` +
        `│\n` +
        `│ _Error penting → kirim ke WA_\n` +
        `│ _Error jaringan/timeout → dilewati_\n` +
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

                // ── Section 1: Status ON/OFF ──────────────────────────────────
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

                // ── Section 2: Filter ─────────────────────────────────────────
                .makeSections('🔇 Kelola Filter')
                .makeRow(
                    '📋 Lihat Filter',
                    'Daftar Pattern Diabaikan',
                    'Lihat semua pattern error yang tidak dikirim notif',
                    `${pref}errornotif filter`
                )
                .makeRow(
                    '🔄 Reset Filter',
                    'Kembalikan Filter Default',
                    'Reset ke filter bawaan (timeout, network, dll)',
                    `${pref}errornotif filter reset`
                )

                // ── Section 3: Uji Coba ───────────────────────────────────────
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
        if (!sent) await _sendFallback(tolak, hisoka, m, bodyText, pref);
    } else {
        await _sendFallback(tolak, hisoka, m, bodyText, pref);
    }
}

// ── Fallback teks biasa ───────────────────────────────────────────────────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `${pref}errornotif on/off — Aktif/nonaktifkan\n` +
        `${pref}errornotif filter — Lihat daftar filter\n` +
        `${pref}errornotif filter add <kata> — Tambah filter\n` +
        `${pref}errornotif filter del <no> — Hapus filter\n` +
        `${pref}errornotif filter reset — Reset ke default\n` +
        `${pref}errornotif test — Simulasi kirim notif`
    );
}

// ── Filter default ────────────────────────────────────────────────────────────
const _DEFAULT_PATTERNS = [
    'timeout',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'socket hang up',
    'network error',
    'getaddrinfo',
    'Request failed with status code 4',
    'Request failed with status code 5',
];

// ── Build teks daftar filter ──────────────────────────────────────────────────
function _buildFilterList(ignorePatterns, pref) {
    const list = Array.isArray(ignorePatterns) ? ignorePatterns : [];
    const lines = [
        `╭═══『 🔇 *FILTER ERROR NOTIF* 』═══╮`,
        `│`,
        `│ _Error yang cocok pattern di bawah_`,
        `│ _ini TIDAK akan dikirim ke WA._`,
        `│`,
    ];
    if (list.length === 0) {
        lines.push(`│ _(kosong — semua error dikirim)_`);
    } else {
        list.forEach((p, i) => {
            lines.push(`│ *${String(i + 1).padStart(2, '0')}.* \`${p}\``);
        });
    }
    lines.push(`│`);
    lines.push(`╰═════════════════════════╯`);
    lines.push(``);
    lines.push(`*Kelola filter:*`);
    lines.push(`${pref}errornotif filter add <kata> — Tambah`);
    lines.push(`${pref}errornotif filter del <no> — Hapus`);
    lines.push(`${pref}errornotif filter reset — Reset default`);
    return lines.join('\n');
}

// ── Format tanggal Indonesia ──────────────────────────────────────────────────
const _DAYS_ID   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const _MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];

function _fmtDate(d) {
    return `${_DAYS_ID[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${_MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}
function _fmtTime(d) {
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2,'0')).join(':');
}

// ── Kirim test notification ───────────────────────────────────────────────────
async function _sendTestNotif(hisoka, m, target, Button) {
    const now     = new Date();
    const errMsg  = 'TypeError: Cannot read properties of undefined (reading \'buffer\')';
    const stack1  = 'at handleBratgreen (SEMUA_FITUR/tools/bratgreen.cjs:42:18)';
    const stack2  = 'at handleMessage (message.js:1730:12)';

    const command    = `.${m.command}`;
    const senderName = m.pushName || 'Test User';
    const senderNum  = '+' + String(m.sender || '').split('@')[0].split(':')[0];
    const groupName  = m.isGroup ? (m.groupSubject || 'Grup') : 'Private Chat';
    const targetJid  = `${target}@s.whatsapp.net`;

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
│ ${errMsg}
│
│ ${stack1}
│ ${stack2}
╰────────────────⬣

_Ini adalah pesan uji coba. Jika kamu menerima ini, fitur Error Notif berjalan dengan benar! ✅_`;

    // ── Kirim dengan copy button ──────────────────────────────────────────────
    // Compact copy: command + error + stack dalam 200 char
    const compactRaw =
        `${command} | ${senderNum} | ${groupName}\n` +
        `${errMsg}\n` +
        `${stack1}\n` +
        `${stack2}`;
    const copyCode = compactRaw.trim().slice(0, 200);

    if (Button) {
        let sent = false;
        try {
            await new Button()
                .setBody(text)
                .addCopy('📋 Copy Semua', copyCode, 'copy_errnotif_test')
                .run(targetJid, hisoka);
            sent = true;
        } catch (_) {}
        if (!sent) await hisoka.sendMessage(targetJid, { text });
    } else {
        await hisoka.sendMessage(targetJid, { text });
    }
}

// ── Handler utama ─────────────────────────────────────────────────────────────
async function handleErrornotif({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, Button }) {
    try {
        const pref  = m.prefix || '.';
        const cfg   = loadConfig();
        if (!cfg.errorNotif) cfg.errorNotif = { enabled: true, target: '6289688206739', ignorePatterns: [..._DEFAULT_PATTERNS] };
        const notif = cfg.errorNotif;
        if (!Array.isArray(notif.ignorePatterns)) notif.ignorePatterns = [..._DEFAULT_PATTERNS];

        const rawQuery = (query || '').trim();
        const args     = rawQuery.toLowerCase();

        // ── Tanpa argumen → tampil status + button ────────────────────────────
        if (!rawQuery) {
            const bodyText = _buildBody(notif.enabled, notif.target, notif.ignorePatterns);
            await _sendSelection(hisoka, m, Button, tolak, bodyText, pref, notif.enabled);
            logCommand(m, 'errornotif');
            return;
        }

        // ── ON ────────────────────────────────────────────────────────────────
        if (args === 'on') {
            if (notif.enabled) {
                const body = `ℹ️ *Error Notif sudah aktif sebelumnya!*\n\n` + _buildBody(true, notif.target, notif.ignorePatterns);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, true);
            } else {
                cfg.errorNotif.enabled = true;
                saveConfig(cfg);
                const body = `✅ *Error Notif Diaktifkan!*\n\n` + _buildBody(true, notif.target, cfg.errorNotif.ignorePatterns);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, true);
            }
            logCommand(m, 'errornotif on');
            return;
        }

        // ── OFF ───────────────────────────────────────────────────────────────
        if (args === 'off') {
            if (!notif.enabled) {
                const body = `ℹ️ *Error Notif sudah nonaktif sebelumnya!*\n\n` + _buildBody(false, notif.target, notif.ignorePatterns);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, false);
            } else {
                cfg.errorNotif.enabled = false;
                saveConfig(cfg);
                const body = `🔕 *Error Notif Dimatikan!*\n\n` + _buildBody(false, notif.target, cfg.errorNotif.ignorePatterns);
                await _sendSelection(hisoka, m, Button, tolak, body, pref, false);
            }
            logCommand(m, 'errornotif off');
            return;
        }

        // ── FILTER (view) ─────────────────────────────────────────────────────
        if (args === 'filter') {
            await tolak(hisoka, m, _buildFilterList(notif.ignorePatterns, pref));
            logCommand(m, 'errornotif filter');
            return;
        }

        // ── FILTER ADD ────────────────────────────────────────────────────────
        if (args.startsWith('filter add ')) {
            const kata = rawQuery.slice('filter add '.length).trim();
            if (!kata) {
                await tolak(hisoka, m, `❌ Tulis kata yang ingin difilter.\nContoh: *${pref}errornotif filter add socket*`);
                return;
            }
            if (notif.ignorePatterns.some(p => p.toLowerCase() === kata.toLowerCase())) {
                await tolak(hisoka, m, `ℹ️ Pattern \`${kata}\` sudah ada di daftar filter.`);
                return;
            }
            cfg.errorNotif.ignorePatterns.push(kata);
            saveConfig(cfg);
            await tolak(hisoka, m,
                `✅ *Filter ditambahkan!*\n\n` +
                `Pattern: \`${kata}\`\n\n` +
                _buildFilterList(cfg.errorNotif.ignorePatterns, pref)
            );
            logCommand(m, 'errornotif filter add');
            return;
        }

        // ── FILTER DEL ────────────────────────────────────────────────────────
        if (args.startsWith('filter del ')) {
            const noStr = rawQuery.slice('filter del '.length).trim();
            const no    = parseInt(noStr, 10);
            const list  = notif.ignorePatterns;
            if (isNaN(no) || no < 1 || no > list.length) {
                await tolak(hisoka, m, `❌ Nomor tidak valid. Ketik *${pref}errornotif filter* untuk lihat daftar.`);
                return;
            }
            const removed = list.splice(no - 1, 1)[0];
            cfg.errorNotif.ignorePatterns = list;
            saveConfig(cfg);
            await tolak(hisoka, m,
                `✅ *Filter dihapus!*\n\nPattern: \`${removed}\`\n\n` +
                _buildFilterList(cfg.errorNotif.ignorePatterns, pref)
            );
            logCommand(m, 'errornotif filter del');
            return;
        }

        // ── FILTER RESET ──────────────────────────────────────────────────────
        if (args === 'filter reset') {
            cfg.errorNotif.ignorePatterns = [..._DEFAULT_PATTERNS];
            saveConfig(cfg);
            await tolak(hisoka, m,
                `🔄 *Filter direset ke default!*\n\n` +
                _buildFilterList(cfg.errorNotif.ignorePatterns, pref)
            );
            logCommand(m, 'errornotif filter reset');
            return;
        }

        // ── TEST ──────────────────────────────────────────────────────────────
        if (args === 'test') {
            const target = notif.target;
            if (!target) {
                await tolak(hisoka, m, `❌ Nomor target belum diset di config.json!`);
                return;
            }
            await tolak(hisoka, m, `🧪 *Mengirim simulasi error notif...*\n📞 Target: +${target}`);
            await _sendTestNotif(hisoka, m, target, Button);
            await tolak(hisoka, m,
                `✅ *Simulasi berhasil dikirim!*\n` +
                `Cek WA nomor *+${target}*\n\n` +
                `_Jika pesan diterima, fitur berjalan normal ✅_\n` +
                `_Jika tidak diterima, pastikan bot terhubung ke WA_`
            );
            logCommand(m, 'errornotif test');
            return;
        }

        // ── Tidak dikenal ─────────────────────────────────────────────────────
        await tolak(hisoka, m, `❌ Perintah tidak valid.\nKetik *${pref}errornotif* untuk melihat pilihan.`);

    } catch (error) {
        console.error('\x1b[31m[ErrorNotif] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `❌ Error: ${error.message}`);
    }
}

module.exports = { handleErrornotif };
