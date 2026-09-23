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
 *  aturbrowser.cjs — Atur browser command
 *  Perintah .aturbrowser untuk atur dan batalkan pilihan tampilan perangkat bot
 * ───────────────────────────────
 */
'use strict';

const { sendBrowserConfirm } = require('./setbrowser-cmd.cjs');

async function handleAturBrowser({ hisoka, m, query, tolak, logCommand, loadConfig, isMainBot, BROWSER_LIST, listAturBrowserMap, pendingAturBrowser, Button }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                const config  = loadConfig();
                const args    = (query || '').trim().toLowerCase().split(/\s+/);
                const vKey    = args[0] || '';
                const konfirm = args[1] || '';

                const _listPending = listAturBrowserMap.get(m.sender);
                if (!vKey && m.quoted?.key?.id && _listPending && m.quoted.key.id === _listPending.keyId && Date.now() < _listPending.expiresAt) {
                        // body kosong tapi reply ke list → abaikan, tampilkan list lagi
                } else if (m.quoted?.key?.id && _listPending && m.quoted.key.id === _listPending.keyId && Date.now() < _listPending.expiresAt && BROWSER_LIST.find(b => b.key === vKey)) {
                        // reply ke list dengan vKey valid → langsung masuk alur pilihan (lanjut ke bawah)
                } else if (!vKey) {
                        const currentKey    = (global.__activeBrowserKey || config.browserDevice?.selected || 'v1').toLowerCase();
                        const _abHasPairNum = !!(process.env.BOT_NUMBER_PAIR || config?.botNumber || '').replace(/[^0-9]/g, '');
                        const listTeks   = BROWSER_LIST.map(b =>
                                `│ ${b.key === currentKey ? '✅' : '▪️'} *${b.key.toUpperCase()}* — ${b.label}`
                        ).join('\n');
                        const _activeLabel = global.__activeBrowserArr && global.__activeBrowserArr.length >= 2
                                ? `${global.__activeBrowserArr[0]} + ${global.__activeBrowserArr[1]} (${global.__activeBrowserArr[2] || ''})`.trim()
                                : (BROWSER_LIST.find(b => b.key === currentKey) || BROWSER_LIST[0]).label;
                        const listBody =
                                `╭═══════════════════════════╮\n` +
                                `║  🖥️  *ATUR BROWSER BOT*  🖥️  ║\n` +
                                `╚═══════════════════════════╝\n\n` +
                                `📱 *Browser aktif saat ini:*\n` +
                                `✅ *${_activeLabel}*\n\n` +
                                `Pilih perangkat dari tombol di bawah.\n` +
                                `Bot lama tetap aktif sampai perangkat baru berhasil terhubung.\n\n` +
                                `📲 *${_abHasPairNum ? 'Pairing code' : 'QR Code'} akan dikirim ke chat ini setelah pilihan dikonfirmasi.*`;
                        const listFallback =
                                `${listBody}\n\n` +
                                `📋 *Pilihan Browser:*\n` +
                                `${listTeks}\n\n` +
                                `📌 *Cara manual:*\n` +
                                `Reply pesan ini dengan *v2*, atau ketik *.setbrowser v2*.\n\n` +
                                `⚠️ Ketik *.setbrowser* lagi untuk menampilkan menu.`;
                        let listMsg;
                        try {
                                if (typeof Button !== 'function') throw new Error('Button builder tidak tersedia');
                                const _browserBtn = new Button()
                                        .setBody(listBody)
                                        .setFooter('Pilih satu perangkat tertaut')
                                        .addSelection('🖥️ Pilih Browser');
                                _browserBtn.makeSections('Profil V1–V6');
                                BROWSER_LIST.slice(0, 6).forEach(b => {
                                        _browserBtn.makeRow(
                                                b.key.toUpperCase(),
                                                `${b.key === currentKey ? '✅ ' : ''}${b.label}`,
                                                b.value.join(' | '),
                                                b.key
                                        );
                                });
                                _browserBtn.makeSections('Profil V7–V11 & V13–V16');
                                BROWSER_LIST.slice(6).forEach(b => {
                                        _browserBtn.makeRow(
                                                b.key.toUpperCase(),
                                                `${b.key === currentKey ? '✅ ' : ''}${b.label}`,
                                                b.value.join(' | '),
                                                b.key
                                        );
                                });
                                listMsg = await _browserBtn.run(m.from, hisoka, m);
                        } catch (buttonError) {
                                console.warn('[AturBrowser] single_select gagal, memakai fallback teks:', buttonError?.message || buttonError);
                                listMsg = await tolak(hisoka, m, listFallback);
                        }
                        listAturBrowserMap.set(m.sender, { keyId: listMsg?.key?.id, expiresAt: Date.now() + 120000 });
                        return;
                }

                const pilihan = BROWSER_LIST.find(b => b.key === vKey);
                if (!pilihan) {
                        await tolak(hisoka, m,
                                `❌ *Pilihan tidak valid!*\n\n` +
                                `Pilihan tersedia: ${BROWSER_LIST.map(b => `*${b.key.toUpperCase()}*`).join(', ')}\n\n` +
                                `Ketik *.setbrowser* untuk lihat semua pilihan.`
                        );
                        return;
                }

                const currentKey = (global.__activeBrowserKey || config.browserDevice?.selected || 'v1').toLowerCase();
                if (currentKey === pilihan.key) {
                        await tolak(hisoka, m, `ℹ️ Browser sudah menggunakan *${pilihan.label}*. Tidak ada perubahan.`);
                        return;
                }

                const _abExec = async (progMsg) => {
                        const _edit = async (txt) => {
                                try { await hisoka.sendMessage(m.from, { edit: progMsg.key, text: txt }); } catch {}
                        };
                        const _abExecHasPair = !!(process.env.BOT_NUMBER_PAIR || config?.botNumber || '').replace(/[^0-9]/g, '');
                        await _edit(
                                `⏳ *Memulai koneksi baru...*\n` +
                                `🖥️ Browser: *${pilihan.label}*\n\n` +
                                `🔄 Bot lama tetap aktif sampai koneksi baru berhasil.\n` +
                                `📲 *${_abExecHasPair ? 'Pairing code' : 'QR Code'} akan dikirim ke chat ini.*`
                        );
                        logCommand(m, hisoka, m.command || 'setbrowser');
                        const { startBrowserSwitch: _abSwitch } = await import('../../src/helper/browserSwitch.js');
                        _abSwitch(hisoka, pilihan.value, m.from, _edit, pilihan.key).catch(async (e) => {
                                await hisoka.sendMessage(m.from, { text: `❌ *Error browser switch:* ${e?.message}` }).catch(() => {});
                        });
                };

                if (konfirm === 'ya' || konfirm === 'yes') {
                        pendingAturBrowser.delete(m.sender);
                        const progMsg = await tolak(hisoka, m, `⏳ *Memproses...*`);
                        await _abExec(progMsg);
                        return;
                }

                const _abPending = pendingAturBrowser.get(m.sender);
                if (_abPending && _abPending.vKey === vKey && Date.now() < _abPending.expiresAt) {
                        clearTimeout(_abPending.timer);
                        pendingAturBrowser.delete(m.sender);
                        const progMsg = await m.reply(`⏳ *Memproses...*`);
                        await _abExec(progMsg);
                        return;
                }

                pendingAturBrowser.delete(m.sender);
                const konfirmMsg = await sendBrowserConfirm({
                        hisoka, m, Button, pilihan, config,
                        fallbackReply: text => tolak(hisoka, m, text),
                });
                const _abTimer = setTimeout(() => {
                        if (pendingAturBrowser.has(m.sender)) {
                                pendingAturBrowser.delete(m.sender);
                                hisoka.sendMessage(m.from, {
                                        edit: konfirmMsg?.key,
                                        text: `⏳ *Konfirmasi kadaluarsa.* Ketik *.setbrowser* lagi untuk memulai ulang.`
                                }).catch(() => {});
                        }
                }, 30000);
                pendingAturBrowser.set(m.sender, { vKey, expiresAt: Date.now() + 30000, timer: _abTimer, botMsg: konfirmMsg });

        } catch (error) {
                console.error('\x1b[31m[AturBrowser Cmd] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
        }
}

async function handleBatalBrowser({ hisoka, m, tolak, isMainBot, pendingAturBrowser }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        if (pendingAturBrowser.has(m.sender)) {
                const _p = pendingAturBrowser.get(m.sender);
                clearTimeout(_p?.timer);
                pendingAturBrowser.delete(m.sender);
                if (_p?.botMsg?.key) {
                        await hisoka.sendMessage(m.from, { edit: _p.botMsg.key, text: `❌ *Ganti browser dibatalkan.*` }).catch(() => {});
                }
                await tolak(hisoka, m, `❌ *Ganti browser dibatalkan.*`);
        } else {
                await tolak(hisoka, m, `ℹ️ Tidak ada konfirmasi ganti browser yang aktif.`);
        }
}

module.exports = { handleAturBrowser, handleBatalBrowser };
