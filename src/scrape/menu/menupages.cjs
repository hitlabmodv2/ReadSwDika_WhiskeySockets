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
 *  menupages.cjs — Menu pages
 *  Halaman daftar perintah singkat dan kategori fitur bot
 * ───────────────────────────────
 */
'use strict';

async function handleAllmenu({ hisoka, m, query, loadConfig, logCommand, fs, path }) {
	if (!m.prefix && m.query) return;
	const cfg      = loadConfig();
	const botReply = cfg.botReply || {};
	const botName  = botReply.botName || 'Wily Bot';
	hisoka.sendMessage(m.from, { react: { text: `⏱️`, key: m.key } });
	const allTeks =
`「 🤖 *AUTO FITUR* 」
typing | recording | online | readsw
telegram | autocleaner | sessioncleaner

「 🛡️ *ANTI FITUR* 」
antidel | antidel private/group/all on/off
antidel sendto self/chat/both
anticall (.ac) | anticall msg/add/del/list
anticallvid (.acv) | anticallvid msg/add/del/list
antitagsw | antitagsw global on/off | antitagsw status/reset

「 💬 *PESAN & STICKER* 」
s/sticker | toimg | tovn | tomp3 | stickerly | stickerpack
rvo | quoted | react/reaksi | cekreact

「 👥 *FITUR GRUP* 」
hidetag (.ht) | ghosttag (.gt)
welcome | goodbye | welgod
listgroup | group

「 📡 *STATUS & STORY* 」
sw/getsw | upswgc | sendstatus/swgc | readsw

「 📥 *DOWNLOAD* 」
tt | ig | fb | ytmp3 | ytmp4 | play
hd/remini/hdr | hdvid/hdvideo

「 🔍 *INFO & CEK* 」
ping (.p) | info | owner/own
cekhp/spechp/infohp | bandingkan
cuaca | ba/bluearchive
genius/carilagu | geniusdetail
whatsmusik/wmusik | infomusik/infolirik
speedtest/speed | musikai/aimusik | musikai2/aimusik2
pixiv | pixivr18

「 🤖 *AI CHAT* 」
ai/tanya | mymemory | forgetme

「 🎌 *ANIME & MANGA* 」
kusonime/anime | kusonimeupdate
alq/alqanime | alqupdate | alqdl
komik/komiktap | komikinfo | komikget | komikupdate

「 🔞 *KONTEN 18+* 」
nh/nhentai | nhget | nhrand | nhdl
cosplay | cosplayrandom | pixivr18

「 🌐 *WEB & TOOLS* 」
ss/screenshot | ssweb/webinfo
tmail/tempmail | tminbox | tmread | tmwait | tmdel

「 🤖 *JADIBOT* 」
jadibot [nomor] [durasi] | stopbot | listbot | setpairing v1/v2

「 👑 *OWNER ONLY* 」
listowner | addowner | delowner
all | swgrup/statusgroup | infowibu | animasu | tvone | alqanimenotif | malnews | ceksw | cekauto | cekauto gc
wily | simi | wilyai on/off | wilyai pm/gc/all | wilyai reset
setreactapi | emojiadd | emojidel | emojilist
upbot | restart/rebot | backup | ceksesi | clearsesi/cs | eval | bash
ram | ceksize/disksize | autosholat | credsjson
dbstats | sessiondb | listcontact
cekerror | cekerror reset | contact

`;
	const imgPath = path.join(process.cwd(), 'image', 'menu1.jpg');
	if (fs.existsSync(imgPath)) {
		await hisoka.sendMessage(m.from, { image: fs.readFileSync(imgPath), caption: allTeks }, { quoted: m });
	} else {
		await hisoka.sendMessage(m.from, { text: allTeks }, { quoted: m });
	}
	logCommand(m, hisoka, 'allmenu');
}

async function handleOwnermenu({ hisoka, m, query, loadConfig, logCommand, fs, path }) {
	if (!m.prefix && m.query) return;
	const cfg      = loadConfig();
	const botReply = cfg.botReply || {};
	const botName  = botReply.botName || 'Wily Bot';
	hisoka.sendMessage(m.from, { react: { text: `👑`, key: m.key } });
	const ownerTeks =
`🔒 _Khusus pemilik bot_

╭─「 👑 *MANAJEMEN OWNER* 」
│
├➤ *.listowner*
│   _Lihat daftar semua owner bot_
├➤ *.addowner [nomor]*
│   _Tambah owner baru_
╰➤ *.delowner [nomor]*
   _Hapus owner_

╭─「 🤖 *AI & FITUR BOT* 」
│
├➤ *.wily [teks]*  _→ Tanya AI manual_
├➤ *.simi*  _→ AI Simi_
├➤ *.wilyai on/off*
│   _Auto-reply pakai AI_
│   ├ *.wilyai pm/gc/all*  _→ Mode target_
│   ├ *.wilyai replay on/off*
│   ╰ *.wilyai reset*
╰➤ *.setreactapi [key]*
   _Set API key untuk fitur react_

╭─「 📡 *BROADCAST & STATUS* 」
│
├➤ *.all [teks]*
│   _Tag/broadcast ke semua grup_
├➤ *.swgrup / .statusgroup [reply media]*
│   _Kirim status ke semua grup_
├➤ *.infowibu*
│   _Kirim info wibu otomatis ke grup_
├➤ *.animasu on/off/test/status*
├➤ *.malnews on/off/test/status*
│   _Auto notif episode Sub Indo dari Animasu_
├➤ *.tvone on/off/test/status*
│   _Auto notif berita dari TV One_
├➤ *.alqanimenotif on/off/test/status*
│   _Auto notif episode Sub Indo dari Alqanime_
├➤ *.ceksw on/off/reset*
│   _Statistik & tracking story WA kontak_
├➤ *.cekauto*
│   _Cek status semua fitur auto (aktif/nonaktif)_
╰➤ *.cekauto gc*
   _Cek & toggle fitur per-grup ini_

╭─「 🛠️ *TOOLS TEKNIS* 」
│
├➤ *.mati / .shutdown*  _→ Matikan bot sepenuhnya_
├➤ *.restart / .rebot / .rb*  _→ Restart bot_
├➤ *.upbot*  _→ Update & restart bot_
├➤ *.backup*  _→ Backup sesi bot_
├➤ *.ceksesi*  _→ Cek status sesi aktif_
├➤ *.ram*  _→ Cek penggunaan RAM & memori_
├➤ *.ceksize / .disksize*  _→ Cek ukuran folder & disk_
├➤ *.credsjson*  _→ Export sesi ke creds.json_
├➤ *.autosholat on/off/test/status*  _→ Notif jadwal sholat_
├➤ *.eval [kode JS]*  _→ Eksekusi kode_
├➤ *.bash [perintah]*  _→ Eksekusi shell_
├➤ *.dbstats*  _→ Statistik database_
├➤ *.sessiondb*  _→ Info session DB_
├➤ *.listcontact*  _→ Daftar kontak bot_
├➤ *.cekerror*  _→ Log error bot_
├➤ *.cekerror reset*  _→ Reset log error_
╰➤ *.contact*  _→ Info kontak bot_

╭─「 🎨 *EMOJI CUSTOM* 」
│
├➤ *.emojiadd [nama] [reply sticker]*
│   _Tambah emoji custom_
├➤ *.emojidel [nama]*
│   _Hapus emoji custom_
╰➤ *.emojilist*
   _Daftar semua emoji custom_

`;
	const imgPath = path.join(process.cwd(), 'image', 'menu1.jpg');
	if (fs.existsSync(imgPath)) {
		await hisoka.sendMessage(m.from, { image: fs.readFileSync(imgPath), caption: ownerTeks }, { quoted: m });
	} else {
		await hisoka.sendMessage(m.from, { text: ownerTeks }, { quoted: m });
	}
	logCommand(m, hisoka, 'ownermenu');
}

module.exports = { handleAllmenu, handleOwnermenu };
