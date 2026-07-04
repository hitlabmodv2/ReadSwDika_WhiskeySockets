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
 *  menu_jadibot.js — Builder teks menu sesi jadibot
 *  Hitung command otomatis via countMenuJadibotCmd()
 * ───────────────────────────────
 */
import { getBotVersion } from '../../src/helper/utils.js';

export function getMenuJadibotBody() {
        return `
━━━━━━━━━━━━━━━━━━━━━━

╭─「 📌 *UMUM* 」
├➤ *.p / .ping*
╰➤ *.menu*

╭─「 ⚙️ *SETTING* 」
├➤ *.readsw on/off*
├➤ *.readsw true*
├➤ *.readsw false*
├➤ *.antidel on/off*
├➤ *.antidel private on/off*
├➤ *.antidel group on/off*
├➤ *.antidel sendto self/chat/both*
├➤ *.readchat on/off*
╰➤ *.readchat true/false*

╭─「 💬 *AUTO PRESENCE* 」
├➤ *.online on/off*
├➤ *.online set [detik]*
├➤ *.typing on/off*
├➤ *.typing set [detik]*
├➤ *.typing private on/off*
├➤ *.typing group on/off*
├➤ *.recording on/off*
├➤ *.recording set [detik]*
├➤ *.recording private on/off*
╰➤ *.recording group on/off*

╭─「 📊 *CEK & INFO* 」
├➤ *.ceksetting*
├➤ *.ceksw*
├➤ *.ceksesi*
╰➤ *.clearsesi / .cs*

╭─「 🛡️ *ANTI CALL* 」
├➤ *.anticall on/off*
├➤ *.anticall msg [teks]*
├➤ *.anticall add [nomor]*
├➤ *.anticall del [nomor]*
╰➤ *.anticall list*

╭─「 📵 *ANTI CALL VIDEO* 」
├➤ *.anticallvid on/off*
├➤ *.anticallvid msg [teks]*
├➤ *.anticallvid add [nomor]*
├➤ *.anticallvid del [nomor]*
╰➤ *.anticallvid list*

╭─「 👁️ *VIEW ONCE* 」
├➤ *.rvo / .viewonce / .vo*
╰➤ *.rvo2*

╭─「 🗑️ *HAPUS PESAN* 」
├➤ *.del / .d*
╰➤ *.delbot*

╭─「 🎨 *STICKER & GAMBAR* 」
├➤ *.sticker / .s*
├➤ *.wm / .swm [Pack|Author]*
├➤ *.toimg*
╰➤ *.hd / .remini*

╭─「 🔤 *FONT & LOGO* 」
├➤ *.font [teks]*
├➤ *.fontuntik [teks]*
├➤ *.logo [style]|[teks]*
╰➤ *.logo list*

╭─「 😊 *EMOJI REAKSI SW* 」
├➤ *.emoji*
├➤ *.emojiadd 😊,😄*
├➤ *.emojidel 😊*
├➤ *.emojiclear*
├➤ *.emojilist*
├➤ *.emojidefault*
╰➤ *.emojicustom*

╭─「 📡 *STATUS & STORY* 」
├➤ *.upswgc [caption]*
╰➤ *.swgcv2 [teks]|[warna]|[grup]*

╭─「 🎌 *ANIME GIF* 」
├➤ *.animgif*
├➤ *.animgif [kategori]*
╰➤ *.animgif list*

╭─「 📥 *DOWNLOAD* 」
├➤ *.allunduh [link]*
├➤ *.tt [link]*
├➤ *.ig [link]*
├➤ *.fb [link]*
├➤ *.twdl [link]*
├➤ *.ytmp3 [link]*
├➤ *.ytmp4 [link]*
╰➤ *.play [judul]*

━━━━━━━━━━━━━━━━━━━━━━
_📦 Powered by Wily Bot ${getBotVersion()}_ 🤖`;
}

function countMenuJadibotCmd() {
        const body = getMenuJadibotBody();
        const cmdSet = new Set();
        const matches = body.matchAll(/[├╰]➤[^.]*\.([a-z0-9]+)/g);
        for (const m of matches) {
                cmdSet.add(m[1]);
        }
        return cmdSet.size;
}

export const JADIBOT_CMD_COUNT = countMenuJadibotCmd();

export function buildMenuJadibot({ pushName, jadibotNum, juh, jum, jus, masaAktifLine, tglFmt, jamFmt, totalAutoFitur, fiturCount, autoTidakAktif }) {
        const body = getMenuJadibotBody();
        return `╭═══════════════════════╮
║   🤖 *WILY BOT ${getBotVersion()}*   
├═══════════════════════╣
║   🤖  *MENU JADIBOT*   
├═══════════════════════╣
│ 👤 » ${pushName}
│ 📱 » +${jadibotNum}
│ ⏱️ » ${juh}j ${jum}m ${jus}d
│ ${masaAktifLine}
│ 📅 » ${tglFmt}
│ 🕐 » ${jamFmt} WIB
│ 📜 » ${JADIBOT_CMD_COUNT} Total Semua Command
│ 🗂️ » ${totalAutoFitur} Total Fitur Auto
│ ✅ » ${fiturCount} Fitur Auto Aktif
│ ❌ » ${autoTidakAktif} Fitur Auto Tidak Aktif
│ 🌐 » Online 🟢
╰═══════════════════════╯${body}`;
}
