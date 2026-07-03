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
 *  readchat.cjs — Auto Read Chat handler
 *  Perintah .readchat on/off untuk baca otomatis pesan private (centang biru)
 *  Berlaku untuk bot utama (config.json) dan jadibot (data_jadibot/settings.json)
 *  Menggunakan single_select button Mode On/Off
 * ───────────────────────────────
 */
'use strict';

// ── Helper bangun body status ────────────────────────────────────────────────
function _buildBody(rc, isJadibot, jadibotNum) {
    const jadibotNote = isJadibot ? `\n> ⚙️ _Setting khusus jadibot +${jadibotNum}_` : '';
    return (
        `╭═══『 👁️ *AUTO READ CHAT* 』═══╮\n` +
        `│\n` +
        `│ ${rc.enabled ? '✅' : '❌'} *Status  :* ${rc.enabled ? '*Aktif*' : '*Nonaktif*'}\n` +
        `│ 🎯 *Berlaku :* Private chat saja\n` +
        `│\n` +
        `│ ℹ️ _Pesan masuk di private otomatis_\n` +
        `│ _ditandai sudah dibaca (centang biru)_\n` +
        `│ _tanpa perlu membuka chat._\n` +
        `│\n` +
        `╰═════════════════════════╯` +
        jadibotNote
    );
}

// ── Map key pesan terakhir per JID untuk auto-delete ─────────────────────────
const _lastMsgMap = new Map();

async function _deleteLastMsg(hisoka, jid) {
    const key = _lastMsgMap.get(jid);
    if (!key) return;
    try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
    _lastMsgMap.delete(jid);
}

// ── Kirim selection button + fallback teks ──────────────────────────────────
async function _sendSelection(hisoka, m, Button, tolak, bodyText, pref, rc) {
    if (Button) {
        let sent = false;
        try {
            const isMode   = (key) => (key === 'on' ? rc.enabled : !rc.enabled);
            const markMode = (key) => isMode(key) ? '✓ ' : '';
            const activeDesc = (base) => `⚡ Sedang Aktif — ${base}`;

            const btn = new Button()
                .setBody(bodyText)
                .setFooter('⚡ Wily Bot • Auto Read Chat')
                .addSelection('🎛️ Pilih Pengaturan')
                .makeSections('⚙️ Mode')
                .makeRow(
                    markMode('on') + '✅ Aktif',
                    'Nyalakan Auto Read Chat',
                    isMode('on')  ? activeDesc('Pesan private otomatis ditandai dibaca') : 'Pesan private otomatis ditandai dibaca',
                    `${pref}readchat on`
                )
                .makeRow(
                    markMode('off') + '❌ Nonaktif',
                    'Matikan Auto Read Chat',
                    isMode('off') ? activeDesc('Pesan private tidak otomatis dibaca') : 'Pesan private tidak otomatis ditandai dibaca',
                    `${pref}readchat off`
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

// ── Fallback teks biasa (format WA: bold, monospace, list, quote) ───────────
async function _sendFallback(tolak, hisoka, m, bodyText, pref) {
    await tolak(hisoka, m,
        bodyText + `\n\n` +
        `*Penggunaan:*\n` +
        `1. \`${pref}readchat on\` — Aktifkan auto read\n` +
        `2. \`${pref}readchat off\` — Nonaktifkan\n\n` +
        `> 💡 _Tips: pakai tombol di atas biar lebih_\n` +
        `> _cepat & tidak salah ketik perintah._`
    );
}

async function handleReadchat({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadchat, setJadibotUserSetting, Button }) {
    const _isJadibotUserCtx = hisoka?.isMainBot === false && (() => {
        const _sn = (m.sender || '').split('@')[0].split(':')[0];
        const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
        return !!_jn && _sn === _jn;
    })();
    if (!m.isOwner && !_isJadibotUserCtx) return;

    try {
        const isJadibot  = hisoka?.isMainBot === false;
        const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;
        const pref       = m.prefix || '.';

        const getReadchat  = () => isJadibot
            ? getJadibotReadchat(jadibotNum)
            : (loadConfig().readChat || { enabled: false });

        const saveReadchat = (val) => {
            if (isJadibot) {
                setJadibotUserSetting(jadibotNum, 'readchat', val);
            } else {
                const cfg = loadConfig();
                cfg.readChat = val;
                saveConfig(cfg);
            }
        };

        const argLower = (query || '').trim().toLowerCase();
        const _send = (rc, prefixText = '') => _sendSelection(hisoka, m, Button, tolak, prefixText + _buildBody(rc, isJadibot, jadibotNum), pref, rc);

        if (!argLower) {
            await _send(getReadchat());
            logCommand(m, hisoka, 'readchat');
            return;
        }

        if (argLower === 'on') {
            const rc = getReadchat();
            if (rc.enabled) {
                await _send(rc, 'ℹ️ *Auto Read Chat sudah aktif sebelumnya!*\n\n');
            } else {
                const n = { enabled: true };
                saveReadchat(n);
                await _send(n, '✅ *Auto Read Chat diaktifkan!*\n\n');
            }
        } else if (argLower === 'off') {
            const rc = getReadchat();
            if (!rc.enabled) {
                await _send(rc, 'ℹ️ *Auto Read Chat sudah nonaktif sebelumnya!*\n\n');
            } else {
                const n = { enabled: false };
                saveReadchat(n);
                await _send(n, '❌ *Auto Read Chat dinonaktifkan!*\n\n');
            }
        } else {
            await tolak(hisoka, m, `❌ Perintah tidak valid. Ketik \`${pref}readchat\` untuk bantuan.`);
        }

        logCommand(m, hisoka, 'readchat');
    } catch (err) {
        console.error('\x1b[31m[ReadChat] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `Error: ${err.message}`);
    }
}

module.exports = { handleReadchat };
