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
 *  setbrowser-cmd.cjs — Set browser command handler
 *  Perintah .setbrowser untuk ubah identitas browser/OS yang ditampilkan bot
 * ───────────────────────────────
 */
'use strict';

/**
 * Handle reply ke pesan list .setbrowser (pilih browser).
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleSetbrowserListReply({
        hisoka, m,
        listAturBrowserMap, pendingAturBrowser,
        isMainBot, loadConfig, getQuotedStanzaId,
        BROWSER_LIST, logCommand,
}) {
        if (!(isMainBot(hisoka) && m.isOwner && m.isQuoted && !m.prefix && listAturBrowserMap.has(m.sender))) return false;

        const _labPending  = listAturBrowserMap.get(m.sender);
        const _labQuotedId = getQuotedStanzaId(m);
        const _labRaw      = (m.text || '').trim().toLowerCase();
        const _labIsReply  = _labPending && (!_labPending.keyId || _labQuotedId === _labPending.keyId) && Date.now() < _labPending.expiresAt;

        if (!(_labIsReply && BROWSER_LIST.find(b => b.key === _labRaw))) return false;

        const _labConfig  = loadConfig();
        const _labCurKey  = (global.__activeBrowserKey || _labConfig.browserDevice?.selected || 'v1').toLowerCase();
        const _labPilihan = BROWSER_LIST.find(b => b.key === _labRaw);
        if (_labCurKey === _labRaw) {
                await m.reply(`ℹ️ Browser sudah menggunakan *${_labPilihan.label}*. Tidak ada perubahan.`);
                return true;
        }
        listAturBrowserMap.delete(m.sender);
        pendingAturBrowser.delete(m.sender);
        const _labKonfirmMsg = await m.reply(
                `╭══════════════════════════╮\n` +
                `║  ⚠️  *KONFIRMASI GANTI BROWSER*  ⚠️  ║\n` +
                `╰══════════════════════════╯\n\n` +
                `🖥️ *Pilihan:* ${_labPilihan.label}\n` +
                `📦 *Detail:* ${_labPilihan.value.join(' | ')}\n\n` +
                `ℹ️ *Proses (tanpa downtime):*\n` +
                `• Koneksi baru dibuka dengan browser baru\n` +
                `• *${!!(process.env.BOT_NUMBER_PAIR || loadConfig()?.botNumber || '').replace(/[^0-9]/g, '') ? 'Pairing code' : 'QR Code'} dikirim ke chat ini*\n` +
                `• Bot lama tetap aktif sampai terhubung\n` +
                `• Session lama dihapus *setelah* koneksi baru berhasil\n\n` +
                `✅ *Reply pesan ini* dengan *ya* untuk lanjut\n` +
                `❌ *Reply pesan ini* dengan *tidak* untuk batal\n\n` +
                `⏳ *Berlaku 30 detik...*`
        );
        const _labTimer = setTimeout(() => {
                if (pendingAturBrowser.has(m.sender)) {
                        pendingAturBrowser.delete(m.sender);
                        hisoka.sendMessage(m.from, {
                                edit: _labKonfirmMsg?.key,
                                text: `⏳ *Konfirmasi kadaluarsa.* Ketik *.setbrowser* lagi untuk memulai ulang.`
                        }).catch(() => {});
                }
        }, 30000);
        pendingAturBrowser.set(m.sender, { vKey: _labRaw, expiresAt: Date.now() + 30000, timer: _labTimer, botMsg: _labKonfirmMsg });
        return true;
}

/**
 * Handle reply ke pesan konfirmasi .setbrowser (ya/tidak).
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleSetbrowserConfirmReply({
        hisoka, m,
        pendingAturBrowser,
        isMainBot, loadConfig, getQuotedStanzaId,
        BROWSER_LIST, logCommand,
}) {
        if (!(isMainBot(hisoka) && m.isOwner && m.isQuoted && !m.prefix && pendingAturBrowser.has(m.sender))) return false;

        const _cabPending  = pendingAturBrowser.get(m.sender);
        const _cabQuotedId = getQuotedStanzaId(m);
        const _cabRaw      = (m.text || '').trim().toLowerCase();
        const _cabIsReply  = _cabPending?.botMsg?.key?.id && _cabQuotedId === _cabPending.botMsg.key.id && Date.now() < _cabPending.expiresAt;

        if (!_cabIsReply) return false;

        if (/^(ya|yes)$/i.test(_cabRaw)) {
                clearTimeout(_cabPending.timer);
                pendingAturBrowser.delete(m.sender);
                const _cabConfig  = loadConfig();
                const _cabPilihan = BROWSER_LIST.find(b => b.key === _cabPending.vKey);
                if (!_cabPilihan) { await m.reply(`❌ Pilihan tidak valid.`); return true; }
                const _cabProgMsg = await m.reply(`⏳ *Memproses...*`);
                const _cabEdit = async (txt) => { try { await hisoka.sendMessage(m.from, { edit: _cabProgMsg.key, text: txt }); } catch {} };
                const _cabHasPair = !!(process.env.BOT_NUMBER_PAIR || _cabConfig?.botNumber || '').replace(/[^0-9]/g, '');
                await _cabEdit(
                        `⏳ *Memulai koneksi baru...*\n` +
                        `🖥️ Browser: *${_cabPilihan.label}*\n\n` +
                        `🔄 Bot lama tetap aktif sampai koneksi baru berhasil.\n` +
                        `📲 *${_cabHasPair ? 'Pairing code' : 'QR Code'} akan dikirim ke chat ini.*`
                );
                logCommand(m, hisoka, 'setbrowser');
                const { startBrowserSwitch: _cabSwitch } = await import('../../src/helper/browserSwitch.js');
                _cabSwitch(hisoka, _cabPilihan.value, m.from, _cabEdit, _cabPilihan.key).catch(async (e) => {
                        await hisoka.sendMessage(m.from, { text: `❌ *Error browser switch:* ${e?.message}` }).catch(() => {});
                });
                return true;
        } else if (/^(tidak|batal|no|cancel)$/i.test(_cabRaw)) {
                clearTimeout(_cabPending.timer);
                pendingAturBrowser.delete(m.sender);
                if (_cabPending?.botMsg?.key) {
                        await hisoka.sendMessage(m.from, { edit: _cabPending.botMsg.key, text: `❌ *Ganti browser dibatalkan.*` }).catch(() => {});
                }
                await m.reply(`❌ *Ganti browser dibatalkan.*`);
                return true;
        }
        return false;
}

module.exports = { handleSetbrowserListReply, handleSetbrowserConfirmReply };
