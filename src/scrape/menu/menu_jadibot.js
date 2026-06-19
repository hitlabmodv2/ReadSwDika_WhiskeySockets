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
╰➤ *.antidel sendto self/chat/both*

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
╰➤ *.rvo / .viewonce / .vo*

╭─「 🎨 *STICKER & GAMBAR* 」
├➤ *.sticker / .s*
├➤ *.toimg*
╰➤ *.hd / .remini*

╭─「 😊 *EMOJI REAKSI SW* 」
├➤ *.emojiadd 😊,😄*
├➤ *.emojidel 😊*
├➤ *.emojiclear*
├➤ *.emojilist*
├➤ *.emojidefault*
╰➤ *.emojicustom*

╭─「 📡 *STATUS & STORY* 」
╰➤ *.upswgc [caption]*

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
_📦 Powered by Wily Bot V22_ 🤖`;
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
║   🤖 *WILY BOT V22*   
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
