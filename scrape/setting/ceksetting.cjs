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
 *  ceksetting.cjs — Cek setting command
 *  Perintah .ceksetting untuk tampilkan ringkasan semua konfigurasi aktif bot
 * ───────────────────────────────
 */
'use strict';

async function handleCeksetting({ hisoka, m, tolak, logCommand, getJadibotNumber, getJadibotReadsw, getJadibotAntidel, getJadibotAnticall, getJadibotAnticallvid, getJadibotAutoOnline, getJadibotAutoTyping, getJadibotAutoRecording, listJadibotEmojis }) {
        if (hisoka?.isMainBot !== false) return;
        const _isJadibotUserCtx_ceks = (() => {
                const _sn = (m.sender || '').split('@')[0].split(':')[0];
                const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
                return !!_jn && _sn === _jn;
        })();
        if (!m.isOwner && !_isJadibotUserCtx_ceks) return;
        try {
                const jadibotNum = getJadibotNumber(hisoka);
                const readsw    = getJadibotReadsw(jadibotNum);
                const antidel   = getJadibotAntidel(jadibotNum);
                const anticall  = getJadibotAnticall(jadibotNum);
                const acv       = getJadibotAnticallvid(jadibotNum);
                const ao        = getJadibotAutoOnline(jadibotNum);
                const at        = getJadibotAutoTyping(jadibotNum);
                const ar        = getJadibotAutoRecording(jadibotNum);

                const yn  = (v) => v ? '✅ ON' : '❌ OFF';
                const yns = (v) => v !== false ? '✅' : '❌';

                let txt = `╭═══『 *SETTING JADIBOT* 』═══╮\n`;
                txt += `│\n`;
                txt += `│ 📖 *Read SW*  : ${yn(readsw.enabled)}\n`;
                txt += `│   └ Reaction : ${yn(readsw.autoReaction)}\n`;
                txt += `│   └ Delay    : ${readsw.randomDelay ? `Random ${readsw.delayMinMs/1000}-${readsw.delayMaxMs/1000}s` : `Fixed ${readsw.fixedDelayMs/1000}s`}\n`;
                txt += `│\n`;
                txt += `│ 🗑️ *Anti Del* : ${yn(antidel.enabled)}\n`;
                txt += `│   └ Private  : ${yn(antidel.privateChat)}\n`;
                txt += `│   └ Group    : ${yn(antidel.groupChat)}\n`;
                txt += `│   └ Kirim ke : ${antidel.sendTo || 'self'}\n`;
                txt += `│\n`;
                txt += `│ 📵 *Anti Call*    : ${yn(anticall.enabled)}\n`;
                txt += `│ 📵 *Anti VidCall* : ${yn(acv.enabled)}\n`;
                txt += `│\n`;
                txt += `│ 🌐 *Auto Online*  : ${yn(ao.enabled)}\n`;
                txt += `│   └ Interval : ${ao.intervalSeconds || 30} detik\n`;
                txt += `│\n`;
                txt += `│ ⌨️ *Auto Typing*  : ${yn(at.enabled)}\n`;
                txt += `│   └ Private  : ${yns(at.privateChat)}\n`;
                txt += `│   └ Group    : ${yns(at.groupChat)}\n`;
                txt += `│   └ Delay    : ${at.delaySeconds || 5} detik\n`;
                txt += `│\n`;
                txt += `│ 🎙️ *Auto Recording*: ${yn(ar.enabled)}\n`;
                txt += `│   └ Private  : ${yns(ar.privateChat)}\n`;
                txt += `│   └ Group    : ${yns(ar.groupChat)}\n`;
                txt += `│   └ Delay    : ${ar.delaySeconds || 5} detik\n`;
                txt += `│\n`;
                const emojiData = listJadibotEmojis(jadibotNum);
                const _eMode = emojiData.mode === 'custom' ? '🎨 Custom' : '🌐 Default (bot utama)';
                txt += `│ 😊 *Emoji SW* : ${_eMode}\n`;
                txt += `│   └ Total   : ${emojiData.count} emoji tersimpan\n`;
                if (emojiData.count > 0 && emojiData.mode === 'custom') txt += `│   └ Daftar : ${emojiData.emojis.slice(0, 20).join(' ')}${emojiData.count > 20 ? ' ...' : ''}\n`;
                txt += `│\n`;
                txt += `│ *Ubah via:*\n`;
                txt += `│ .readsw • .antidel • .anticall\n`;
                txt += `│ .anticallvid • .online\n`;
                txt += `│ .typing • .recording\n`;
                txt += `│ .emojidefault • .emojicustom\n`;
                txt += `│ .emojiadd • .emojidel\n`;
                txt += `│ .emojiclear • .emojilist\n`;
                txt += `│\n`;
                txt += `╰══════════════════════╯`;

                await tolak(hisoka, m, txt);
                logCommand(m, hisoka, 'ceksetting');
        } catch (err) {
                await tolak(hisoka, m, `❌ Error: ${err.message}`);
        }
}

module.exports = { handleCeksetting };
