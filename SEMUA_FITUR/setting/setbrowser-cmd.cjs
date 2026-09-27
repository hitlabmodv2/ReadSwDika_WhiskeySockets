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

function buildBrowserConfirmText(pilihan, hasPairingCode) {
        return (
                `╭─「 ⚠️ *KONFIRMASI GANTI BROWSER* 」\n` +
                `╰────────────────────────────\n\n` +
                `🖥️ *Pilihan:* ${pilihan.label}\n` +
                `🔑 *Kode:* \`${pilihan.key}\`\n` +
                `📦 *Profil:* \`${pilihan.value.join(' | ')}\`\n\n` +
                `📋 *Proses yang akan dilakukan:*\n` +
                `1. Koneksi baru dibuka dengan profil tersebut.\n` +
                `2. ${hasPairingCode ? 'Pairing code' : 'QR Code'} dikirim ke chat ini.\n` +
                `3. Bot lama tetap aktif sampai koneksi baru berhasil.\n` +
                `4. Session lama dihapus setelah koneksi baru sukses.\n\n` +
                `✅ *Lanjutkan hanya jika kamu siap.*\n` +
                `• Jangan tutup bot selama proses berlangsung.\n` +
                `• ${hasPairingCode ? 'Masukkan pairing code' : 'Scan QR Code'} dari perangkat tertaut WhatsApp.\n\n` +
                `> _Proses ini berjalan tanpa mematikan bot lama terlebih dahulu._\n\n` +
                `⏳ _Konfirmasi berlaku selama 30 detik._`
        );
}

/**
 * Kirim konfirmasi ganti browser dengan quick-reply.
 * selfReply() dipakai agar pesan interaktif punya konteks reply yang jelas
 * ketika user menekan tombol Ya/Tidak.
 */
async function sendBrowserConfirm({ hisoka, m, Button, pilihan, config, fallbackReply }) {
        const hasPairingCode = !!(process.env.BOT_NUMBER_PAIR || config?.botNumber || '').replace(/[^0-9]/g, '');
        const body = buildBrowserConfirmText(pilihan, hasPairingCode);
        try {
                if (typeof Button !== 'function') throw new Error('Button builder tidak tersedia');
                return await new Button()
                        .selfReply()
                        .setBody(body)
                        .setFooter('Pilih tindakan di bawah')
                        .addReply('✅ Ya, Lanjutkan', 'ya')
                        .addReply('❌ Tidak, Batalkan', 'tidak')
                        .run(m.from, hisoka, m);
        } catch (error) {
                console.warn('[SetBrowser] quick-reply gagal, memakai fallback teks:', error?.message || error);
                return await fallbackReply(body + `\n\n*Balas dengan:* \`ya\` atau \`tidak\``);
        }
}

/**
 * Handle reply ke pesan list .setbrowser (pilih browser).
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses
 */
async function handleSetbrowserListReply({
        hisoka, m,
        listAturBrowserMap, pendingAturBrowser,
        isMainBot, loadConfig, getQuotedStanzaId,
        BROWSER_LIST, logCommand, Button,
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
        const _labKonfirmMsg = await sendBrowserConfirm({
                hisoka, m, Button, pilihan: _labPilihan, config: _labConfig,
                fallbackReply: text => m.reply(text),
        });
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
                logCommand(m, hisoka, m.command || 'setbrowser');
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

module.exports = {
        buildBrowserConfirmText,
        sendBrowserConfirm,
        handleSetbrowserListReply,
        handleSetbrowserConfirmReply,
};
