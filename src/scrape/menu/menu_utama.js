export function buildMenuUtama({ pushName, isOwner, uptimeStr, tgl, jam, browserLabel, totalCmdCount, totalSemuaFitur, fiturAktif, fiturTidakAktif }) {
        return `╭═════════════════════╮
║   🤖 *WILY BOT V22*   
├═════════════════════┤
│ 👤 » ${pushName} ${isOwner ? '👑' : ''}
│ ⏱️ » ${uptimeStr}
│ 📅 » ${tgl}
│ 🕐 » ${jam} WIB
│ 🖥️ » ${browserLabel}
│ 📜 » ${totalCmdCount} Total Semua Command
│ 🗂️ » ${totalSemuaFitur} Total Fitur Auto
│ ✅ » ${fiturAktif} Fitur Auto Aktif
│ ❌ » ${fiturTidakAktif} Fitur Auto Tidak Aktif
│ 🌐 » Online 🟢
├═════════════════════┤
║   🤖 *AUTO FITUR*   
├═════════════════════┤
│ .setbrowser
│ .typing
│ .recording
│ .online
│ .readsw
│ .telegram
│ .autocleaner
│ .sessioncleaner
├═════════════════════┤
║   🛡️ *ANTI FITUR*   
├═════════════════════┤
│ .antidel
│ .anticall / .ac
│ .anticallvid / .acv
│ .antitagsw
├═════════════════════┤
║  💬 *PESAN & STICKER*  
├═════════════════════┤
│ .del / .d
│ .s / .sticker
│ .wm / .swm
│ .toimg
│ .tovn
│ .tomp3
│ .stickerly
│ .stickerpack
│ .rvo / .viewonce
│ .quoted / .q
│ .react / .reaksi
├═════════════════════┤
║   👥 *FITUR GRUP*   
├═════════════════════┤
│ .hidetag / .ht
│ .ghosttag / .gt
│ .welcome
│ .goodbye
│ .welgod
│ .listgroup
│ .group
├═════════════════════┤
║  📡 *STATUS & STORY*  
├═════════════════════┤
│ .sw / .getsw
│ .upswgc
│ .sendstatus / .swgc
├═════════════════════┤
║   📥 *DOWNLOAD*   
├═════════════════════┤
│ .allunduh
│ .tt
│ .ig
│ .fb
│ .twdl
│ .ytmp3
│ .ytmp4
│ .play
│ .hd / .remini / .hdr
│ .hdvid / .hdvideo
├═════════════════════┤
║   🔍 *INFO & CEK*   
├═════════════════════┤
│ .ping / .p
│ .info
│ .infoupdate / .changelog
│ .owner / .own
│ .cekhp / .spechp
│ .bandingkan
│ .cuaca
│ .ba / .bluearchive
│ .genius / .carilagu
│ .geniusdetail
│ .whatsmusik / .wmusik
│ .infomusik / .infolirik
│ .musikai / .aimusik
│ .musikai2 / .aimusik2
│ .speedtest / .speed
│ .pixiv / .pixivr18
├═════════════════════┤
║   🤖 *AI CHAT*   
├═════════════════════┤
│ .ai / .tanya
│ .mymemory
│ .forgetme
├═════════════════════┤
║  🎌 *ANIME & MANGA*  
├═════════════════════┤
│ .kusonime / .anime
│ .kusonimeupdate
│ .alq / .alqanime
│ .alqupdate
│ .alqdl
│ .komik / .komiktap
│ .komikinfo
│ .komikget / .komikdl
│ .komikupdate
├═════════════════════┤
║   🔞 *KONTEN 18+*   
├═════════════════════┤
│ .nh / .nhentai
│ .nhget
│ .nhrand
│ .nhdl
│ .cosplay
│ .cosplayrandom
│ .pixivr18
├═════════════════════┤
║   🌐 *WEB & TOOLS*   
├═════════════════════┤
│ .ss / .screenshot
│ .ssweb / .webinfo
│ .tmail / .tempmail
│ .tminbox
│ .tmread
│ .tmwait
│ .tmdel
├═════════════════════┤
║   🤖 *JADIBOT*   
├═════════════════════┤
│ .jadibot
│ .stopbot
│ .listbot
│ .setpairing
├═════════════════════┤
║   👑 *OWNER ONLY*   
├═════════════════════┤
│ .listowner
│ .addowner
│ .delowner
│ .all
│ .swgrup / .statusgroup
│ .infowibu
│ .animasu
│ .tvone
│ .malnews
│ .alqanimenotif
│ .cekauto
│ .ceksw
│ .wilyai
│ .wily / .simi
│ .setreactapi / .cekreact
│ .emojiadd
│ .emojidel
│ .emojilist
│ .ram
│ .ceksize / .disksize
│ .restart / .rebot / .rb
│ .upbot
│ .backup
│ .ceksesi
│ .autosholat
│ .credsjson
│ .eval / .bash
│ .dbstats / .sessiondb
│ .listcontact
│ .cekerror
│ .contact
│ .mati / .shutdown
├═════════════════════┤
║   📋 *SUB MENU*   
├═════════════════════┤
│ .settingmenu
│ .groupmenu
│ .statusmenu
│ .downloadmenu
│ .jadibotmenu
│ .ownermenu
│ .allmenu
╰═════════════════════╯`;
}
