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
 *  menu_utama.js — Builder teks menu utama bot
 *  Tampilkan semua command, info uptime, fitur aktif/nonaktif
 * ───────────────────────────────
 */
import { getBotVersion } from '../../src/helper/utils.js';

export function buildMenuUtama({ pushName, isOwner, uptimeStr, tgl, jam, browserLabel, totalCmdCount, totalSemuaFitur, fiturAktif, fiturTidakAktif }) {
        return `╭═════════════════════╮
║   🤖 *WILY BOT ${getBotVersion()}*   
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
│ .setlogsw
│ .typing
│ .recording
│ .online
│ .readsw
│ .ramdisk
│ .readchat
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
│ .delbot
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
║   🔤 *FONT & LOGO*   
├═════════════════════┤
│ .font [teks]
│ .fontuntik [teks]
│ .logo [style]|[teks]
│ .logo list
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
│ .sv [NamaDepan|NamaBelakang]
│ .savekontak / .svgc
│ .savekontakstop / .svcstop
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
│ .animgif
│ .animgif list
│ .kusonime / .anime
│ .kusonimeupdate
│ .alq / .alqanime
│ .alqupdate
│ .alqdl
│ .alqanimenotif on/off
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
│ .hentaidad
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
│ .upbot
│ .downbot
│ .stopbot
│ .listbot
│ .setpairing
├═════════════════════┤
║   👑 *OWNER ONLY*   
├═════════════════════┤
│ .owner / .own
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
