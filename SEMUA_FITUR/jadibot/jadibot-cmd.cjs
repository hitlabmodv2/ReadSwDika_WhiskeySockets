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
 *  jadibot-cmd.cjs — JadiBot command handler
 *  Perintah .jadibot, .upbot, .stopbot untuk manajemen sesi multi-bot
 * ───────────────────────────────
 */
'use strict';


// Satuan durasi tunggal, misal "1h" atau "20m". Dipakai untuk menyusun pola
// durasi gabungan seperti "1h,20m" atau "1h.20m" (1 hari + 20 menit) — harus
// identik dengan pattern di src/helper/jadibot.js#parseJadibotDuration supaya
// konsisten. Pemisah antar-satuan boleh koma (,) ATAU titik (.).
const JADIBOT_DURATION_UNIT_SRC = '(?:\\d+\\s*(?:menit|mnt|min|minute|minutes|m|jam|hour|hours|j|hari|day|days|h|d))';
const JADIBOT_DURATION_PERM_SRC = '(?:permanent|permanen|perm|perma|selamanya|p)';
const JADIBOT_DURATION_COMPOUND_SRC = `${JADIBOT_DURATION_UNIT_SRC}(?:\\s*[,.]\\s*${JADIBOT_DURATION_UNIT_SRC})*`;
// Boundary durasi: dipisah spasi, koma, ATAU titik dari nomor, lalu durasi itu
// sendiri bisa gabungan beberapa satuan dipisah koma/titik. Contoh yang valid:
//   "628xxx 1h,20m"  → nomor "628xxx", durasi "1h,20m" (1 hari 20 menit)
//   "628xxx 1h.20m"  → sama seperti di atas, titik = koma
//   "628xxx,1h"      → format lama, tetap didukung
//   "628xxx.1h"      → format lama dengan titik, tetap didukung
//   "628xxx,1h,20m"  → format lama + gabungan, tetap didukung
const JADIBOT_DURATION_AT_END_RE = new RegExp(`[ ,.]\\s*(${JADIBOT_DURATION_COMPOUND_SRC}|${JADIBOT_DURATION_PERM_SRC})\\s*$`, 'i');





function parseJadibotCommandQuery(raw = '') {
    const text = String(raw || '').trim();
    if (!text) return { number: '', durationInput: '', rawNumberPart: '' };

    let numberPart = '';
    let durationRaw = '';

    // Cari batas nomor/durasi dari kiri ke kanan: posisi pertama di mana sisa
    // teks setelah pemisah (spasi/koma) adalah durasi valid sampai akhir string.
    const durationMatch = text.match(JADIBOT_DURATION_AT_END_RE);
    if (durationMatch) {
        durationRaw = durationMatch[1].trim();
        numberPart = text.slice(0, durationMatch.index).trim();
    } else {
        numberPart = text;
        durationRaw = '';
    }

    const rawNumberPart = numberPart;
    // Karakter valid nomor telepon: angka, +, spasi, -, (), .
    const hasInvalidPhoneChars = rawNumberPart ? /[^0-9+\-\s().]/.test(rawNumberPart) : false;
    let number = numberPart.replace(/[^0-9]/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('08')) number = '62' + number.slice(1);
    else if (number.startsWith('8')) number = '62' + number;

    return { number, durationInput: durationRaw, rawNumberPart, hasInvalidPhoneChars };
}

function normalizeJadibotNumber(raw = '') {
    let number = String(raw || '').replace(/[^0-9]/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('08')) number = '62' + number.slice(1);
    else if (number.startsWith('8')) number = '62' + number;
    return number;
}

// Deteksi negara dari nomor WA (E.164 tanpa +)
function getPhoneCountryInfo(number = '') {
    const n = String(number).replace(/[^0-9]/g, '');
    // Sorted longest-first untuk match paling spesifik
    const codes = [
        ['1684','🇦🇸','Samoa Amerika'],['1242','🇧🇸','Bahamas'],['1246','🇧🇧','Barbados'],
        ['1264','🇦🇮','Anguilla'],['1268','🇦🇬','Antigua & Barbuda'],['1284','🇻🇬','British Virgin Islands'],
        ['1340','🇻🇮','US Virgin Islands'],['1345','🇰🇾','Cayman Islands'],['1441','🇧🇲','Bermuda'],
        ['1473','🇬🇩','Grenada'],['1649','🇹🇨','Turks & Caicos'],['1664','🇲🇸','Montserrat'],
        ['1670','🇲🇵','Northern Mariana Islands'],['1671','🇬🇺','Guam'],['1684','🇦🇸','American Samoa'],
        ['1721','🇸🇽','Sint Maarten'],['1758','🇱🇨','Saint Lucia'],['1767','🇩🇲','Dominica'],
        ['1784','🇻🇨','St. Vincent & Grenadines'],['1809','🇩🇴','Dominika Republic'],
        ['1829','🇩🇴','Dominika Republic'],['1849','🇩🇴','Dominika Republic'],
        ['1868','🇹🇹','Trinidad & Tobago'],['1869','🇰🇳','Saint Kitts & Nevis'],
        ['1876','🇯🇲','Jamaika'],['1939','🇵🇷','Puerto Rico'],
        ['7840','🇬🇪','Abkhazia'],['7940','🇬🇪','Abkhazia'],
        ['212','🇲🇦','Maroko'],['213','🇩🇿','Aljazair'],['216','🇹🇳','Tunisia'],['218','🇱🇾','Libya'],
        ['220','🇬🇲','Gambia'],['221','🇸🇳','Senegal'],['222','🇲🇷','Mauritania'],['223','🇲🇱','Mali'],
        ['224','🇬🇳','Guinea'],['225','🇨🇮','Pantai Gading'],['226','🇧🇫','Burkina Faso'],
        ['227','🇳🇪','Niger'],['228','🇹🇬','Togo'],['229','🇧🇯','Benin'],['230','🇲🇺','Mauritius'],
        ['231','🇱🇷','Liberia'],['232','🇸🇱','Sierra Leone'],['233','🇬🇭','Ghana'],
        ['234','🇳🇬','Nigeria'],['235','🇹🇩','Chad'],['236','🇨🇫','Republik Afrika Tengah'],
        ['237','🇨🇲','Kamerun'],['238','🇨🇻','Tanjung Verde'],['239','🇸🇹','São Tomé & Príncipe'],
        ['240','🇬🇶','Guinea Khatulistiwa'],['241','🇬🇦','Gabon'],['242','🇨🇬','Kongo'],
        ['243','🇨🇩','DR Kongo'],['244','🇦🇴','Angola'],['245','🇬🇼','Guinea-Bissau'],
        ['248','🇸🇨','Seychelles'],['249','🇸🇩','Sudan'],['250','🇷🇼','Rwanda'],
        ['251','🇪🇹','Ethiopia'],['252','🇸🇴','Somalia'],['253','🇩🇯','Djibouti'],
        ['254','🇰🇪','Kenya'],['255','🇹🇿','Tanzania'],['256','🇺🇬','Uganda'],
        ['257','🇧🇮','Burundi'],['258','🇲🇿','Mozambik'],['260','🇿🇲','Zambia'],
        ['261','🇲🇬','Madagaskar'],['263','🇿🇼','Zimbabwe'],['264','🇳🇦','Namibia'],
        ['265','🇲🇼','Malawi'],['266','🇱🇸','Lesotho'],['267','🇧🇼','Botswana'],
        ['268','🇸🇿','Eswatini'],['269','🇰🇲','Komoro'],
        ['290','🇸🇭','Saint Helena'],['291','🇪🇷','Eritrea'],
        ['297','🇦🇼','Aruba'],['298','🇫🇴','Faroe Islands'],['299','🇬🇱','Greenland'],
        ['350','🇬🇮','Gibraltar'],['351','🇵🇹','Portugal'],['352','🇱🇺','Luksemburg'],
        ['353','🇮🇪','Irlandia'],['354','🇮🇸','Islandia'],['355','🇦🇱','Albania'],
        ['356','🇲🇹','Malta'],['357','🇨🇾','Siprus'],['358','🇫🇮','Finlandia'],
        ['359','🇧🇬','Bulgaria'],['370','🇱🇹','Lithuania'],['371','🇱🇻','Latvia'],
        ['372','🇪🇪','Estonia'],['373','🇲🇩','Moldova'],['374','🇦🇲','Armenia'],
        ['375','🇧🇾','Belarus'],['376','🇦🇩','Andorra'],['377','🇲🇨','Monako'],
        ['378','🇸🇲','San Marino'],['380','🇺🇦','Ukraina'],['381','🇷🇸','Serbia'],
        ['382','🇲🇪','Montenegro'],['385','🇭🇷','Kroasia'],['386','🇸🇮','Slovenia'],
        ['387','🇧🇦','Bosnia & Herzegovina'],['389','🇲🇰','Makedonia Utara'],
        ['420','🇨🇿','Ceko'],['421','🇸🇰','Slovakia'],['423','🇱🇮','Liechtenstein'],
        ['500','🇫🇰','Kepulauan Falkland'],['501','🇧🇿','Belize'],['502','🇬🇹','Guatemala'],
        ['503','🇸🇻','El Salvador'],['504','🇭🇳','Honduras'],['505','🇳🇮','Nikaragua'],
        ['506','🇨🇷','Kosta Rika'],['507','🇵🇦','Panama'],['509','🇭🇹','Haiti'],
        ['590','🇬🇵','Guadeloupe'],['591','🇧🇴','Bolivia'],['592','🇬🇾','Guyana'],
        ['593','🇪🇨','Ekuador'],['595','🇵🇾','Paraguay'],['597','🇸🇷','Suriname'],
        ['598','🇺🇾','Uruguay'],['670','🇹🇱','Timor-Leste'],['673','🇧🇳','Brunei'],
        ['674','🇳🇷','Nauru'],['675','🇵🇬','Papua Nugini'],['676','🇹🇴','Tonga'],
        ['677','🇸🇧','Kepulauan Solomon'],['678','🇻🇺','Vanuatu'],['679','🇫🇯','Fiji'],
        ['680','🇵🇼','Palau'],['682','🇨🇰','Kepulauan Cook'],['685','🇼🇸','Samoa'],
        ['686','🇰🇮','Kiribati'],['687','🇳🇨','Kaledonia Baru'],['688','🇹🇻','Tuvalu'],
        ['689','🇵🇫','Polinesia Prancis'],['691','🇫🇲','Mikronesia'],
        ['692','🇲🇭','Kepulauan Marshall'],['850','🇰🇵','Korea Utara'],
        ['852','🇭🇰','Hong Kong'],['853','🇲🇴','Makau'],['855','🇰🇭','Kamboja'],
        ['856','🇱🇦','Laos'],['880','🇧🇩','Bangladesh'],['886','🇹🇼','Taiwan'],
        ['960','🇲🇻','Maladewa'],['961','🇱🇧','Lebanon'],['962','🇯🇴','Yordania'],
        ['963','🇸🇾','Suriah'],['964','🇮🇶','Irak'],['965','🇰🇼','Kuwait'],
        ['966','🇸🇦','Arab Saudi'],['967','🇾🇪','Yaman'],['968','🇴🇲','Oman'],
        ['970','🇵🇸','Palestina'],['971','🇦🇪','Uni Emirat Arab'],['972','🇮🇱','Israel'],
        ['973','🇧🇭','Bahrain'],['974','🇶🇦','Qatar'],['975','🇧🇹','Bhutan'],
        ['976','🇲🇳','Mongolia'],['977','🇳🇵','Nepal'],
        ['992','🇹🇯','Tajikistan'],['993','🇹🇲','Turkmenistan'],['994','🇦🇿','Azerbaijan'],
        ['995','🇬🇪','Georgia'],['996','🇰🇬','Kirgizstan'],['998','🇺🇿','Uzbekistan'],
        ['20','🇪🇬','Mesir'],['27','🇿🇦','Afrika Selatan'],['30','🇬🇷','Yunani'],
        ['31','🇳🇱','Belanda'],['32','🇧🇪','Belgia'],['33','🇫🇷','Prancis'],
        ['34','🇪🇸','Spanyol'],['36','🇭🇺','Hungaria'],['39','🇮🇹','Italia'],
        ['40','🇷🇴','Rumania'],['41','🇨🇭','Swiss'],['43','🇦🇹','Austria'],
        ['44','🇬🇧','Inggris'],['45','🇩🇰','Denmark'],['46','🇸🇪','Swedia'],
        ['47','🇳🇴','Norwegia'],['48','🇵🇱','Polandia'],['49','🇩🇪','Jerman'],
        ['51','🇵🇪','Peru'],['52','🇲🇽','Meksiko'],['53','🇨🇺','Kuba'],
        ['54','🇦🇷','Argentina'],['55','🇧🇷','Brasil'],['56','🇨🇱','Chile'],
        ['57','🇨🇴','Kolombia'],['58','🇻🇪','Venezuela'],
        ['60','🇲🇾','Malaysia'],['61','🇦🇺','Australia'],['62','🇮🇩','Indonesia'],
        ['63','🇵🇭','Filipina'],['64','🇳🇿','Selandia Baru'],['65','🇸🇬','Singapura'],
        ['66','🇹🇭','Thailand'],
        ['81','🇯🇵','Jepang'],['82','🇰🇷','Korea Selatan'],['84','🇻🇳','Vietnam'],
        ['86','🇨🇳','Tiongkok'],
        ['90','🇹🇷','Turki'],['91','🇮🇳','India'],['92','🇵🇰','Pakistan'],
        ['93','🇦🇫','Afghanistan'],['94','🇱🇰','Sri Lanka'],['95','🇲🇲','Myanmar'],
        ['98','🇮🇷','Iran'],
        ['7','🇷🇺','Rusia'],['1','🇺🇸','Amerika Serikat / 🇨🇦 Kanada'],
    ];
    for (const [code, flag, name] of codes) {
        if (n.startsWith(code)) return { flag, name };
    }
    return { flag: '🌐', name: 'Tidak diketahui' };
}

async function handleJadibot({ hisoka, m, query, tolak, logCommand, isMainBot, path, fs, jadibotMap, parseJadibotDuration, startJadibot, maskNumber, getJadibotExpirySummary, getJadibotExpiry, scheduleJadibotExpiry, setPermanentJadibot, removeJadibotExpiry, ensureJadibotExpiry, getLogoutSavedMs, formatRemainingTime }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;

        const jbPfx = m.prefix || '.';

        const sendJbBtn = async (bodyText) => {
                await tolak(hisoka, m, bodyText);
        };

        const { number: parsedJadibotNumber, durationInput, rawNumberPart, hasInvalidPhoneChars } = parseJadibotCommandQuery(query || '');
        let number = parsedJadibotNumber;
        let finalDurationInput = durationInput;

        if (m.isQuoted && m.quoted?.sender && !m.quoted?.key?.fromMe) {
                const queryTrimmed = (query || '').trim();
                const noValidNumber = !parsedJadibotNumber || parsedJadibotNumber.length < 7;
                if (noValidNumber && queryTrimmed) {
                        const trialDuration = parseJadibotDuration(queryTrimmed);
                        if (trialDuration !== null) {
                                let quotedNum = (m.quoted.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                                if (quotedNum.startsWith('00')) quotedNum = quotedNum.slice(2);
                                if (quotedNum.startsWith('08')) quotedNum = '62' + quotedNum.slice(1);
                                else if (quotedNum.startsWith('8')) quotedNum = '62' + quotedNum;
                                number = quotedNum;
                                finalDurationInput = queryTrimmed;
                        }
                }
        }

        const durationInfo = parseJadibotDuration(finalDurationInput);

        if (!number) {
                const activeList = [...jadibotMap.keys()];
                const activeInfo = activeList.length
                        ? `📊 *Bot aktif sekarang: ${activeList.length}*`
                        : `📭 Belum ada jadibot aktif.`;
                await sendJbBtn(
                        `╔══════════════════════╗\n` +
                        `║   🤖  *J A D I B O T*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Nomor tidak boleh kosong!*\n\n` +
                        `📌 *Format pakai koma (direkomendasikan):*\n` +
                        `_${jbPfx}jadibot 628xxx,30m_ → 30 menit\n` +
                        `_${jbPfx}jadibot 628xxx,2j_ → 2 jam\n` +
                        `_${jbPfx}jadibot 628xxx,3h_ → 3 hari\n` +
                        `_${jbPfx}jadibot 628xxx,p_ → permanent\n\n` +
                        `📌 *Format spasi juga bisa:*\n` +
                        `_${jbPfx}jadibot 628xxx 1 jam_\n` +
                        `_${jbPfx}jadibot 628xxx 1 hari_\n` +
                        `_${jbPfx}jadibot 628xxx permanent_\n\n` +
                        `⏱️ *Singkatan durasi:*\n` +
                        `• *m* = menit  • *j* = jam  • *h* = hari  • *p* = permanent\n\n` +
                        `💡 *Reply pesan seseorang:*\n` +
                        `_${jbPfx}jadibot 1j_ atau _${jbPfx}jadibot 3h_\n\n` +
                        `⏳ Jika durasi kosong, otomatis *1 hari*.\n\n` +
                        `${activeInfo}`
                );
                return;
        }

        if (hasInvalidPhoneChars) {
                const badPart = rawNumberPart || (query || '').split(',')[0].trim();
                await sendJbBtn(
                        `╔══════════════════════╗\n` +
                        `║   🤖  *J A D I B O T*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Format penulisan nomor salah!*\n\n` +
                        `📱 Yang kamu tulis: \`${badPart || '-'}\`\n\n` +
                        `✅ *Format yang diterima:*\n` +
                        `• \`+62 896-6792-3162\` (dengan spasi & strip)\n` +
                        `• \`+6289667923162\` (dengan +)\n` +
                        `• \`6289667923162\` (tanpa +)\n` +
                        `• \`08xxxxxxxxxx\` (otomatis jadi 62xxx)\n\n` +
                        `🌏 *Contoh berbagai negara:*\n` +
                        `🇮🇩 Indo: _${jbPfx}jadibot 6289xxx,1h_\n` +
                        `🇲🇾 Malay: _${jbPfx}jadibot 601xxx,1h_\n` +
                        `🇺🇸 USA: _${jbPfx}jadibot 1555xxx,1h_\n` +
                        `🇸🇬 SG: _${jbPfx}jadibot 6581xxx,1h_\n\n` +
                        `❌ Tidak boleh ada huruf atau simbol aneh.`
                );
                return;
        }

        if (number.length < 8) {
                const badPart = rawNumberPart || number || (query || '').split(',')[0].trim();
                await sendJbBtn(
                        `╔══════════════════════╗\n` +
                        `║   🤖  *J A D I B O T*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Nomor terlalu pendek!*\n\n` +
                        `📱 Yang kamu tulis: \`${badPart || '-'}\`\n` +
                        `Nomor WA harus minimal 8 digit dan\n` +
                        `menggunakan kode negara.\n\n` +
                        `✅ *Format yang diterima:*\n` +
                        `• \`+62 896-6792-3162\` (dengan spasi & strip)\n` +
                        `• \`+6289667923162\` (dengan +)\n` +
                        `• \`6289667923162\` (tanpa +)\n` +
                        `• \`08xxxxxxxxxx\` (otomatis jadi 62xxx)\n\n` +
                        `🌏 *Contoh berbagai negara:*\n` +
                        `🇮🇩 Indo: _${jbPfx}jadibot 6289xxx,1h_\n` +
                        `🇲🇾 Malay: _${jbPfx}jadibot 601xxx,1h_\n` +
                        `🇺🇸 USA: _${jbPfx}jadibot 1555xxx,1h_\n` +
                        `🇸🇬 SG: _${jbPfx}jadibot 6581xxx,1h_`
                );
                return;
        }

        if (!durationInfo) {
                const badDur = finalDurationInput || '-';
                await sendJbBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏰  *MASA BERLAKU*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Format durasi tidak valid!*\n\n` +
                        `⌨️ Yang kamu tulis: \`${badDur}\`\n\n` +
                        `📌 *Contoh yang benar:*\n` +
                        `_${jbPfx}jadibot ${number},30m_ → 30 menit\n` +
                        `_${jbPfx}jadibot ${number},2j_ → 2 jam\n` +
                        `_${jbPfx}jadibot ${number},3h_ → 3 hari\n` +
                        `_${jbPfx}jadibot ${number},p_ → permanent\n\n` +
                        `⏱️ *Singkatan durasi valid:*\n` +
                        `• *m* = menit  • *j* = jam\n` +
                        `• *h* = hari   • *p* = permanent\n\n` +
                        `✅ Contoh: _${jbPfx}jadibot ${number},1h_`
                );
                return;
        }

        if (number.startsWith('08')) number = '62' + number.slice(1);

        if (jadibotMap.has(number)) {
                if (!durationInfo.isDefault) {
                        const sendReplyFn = async (msg) => tolak(hisoka, m, msg);
                        if (durationInfo.ms === 'permanent') {
                                setPermanentJadibot(number, 'active');
                                await sendJbBtn(
                                        `╔══════════════════════╗\n` +
                                        `║   🤖  *J A D I B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `✅ *Masa berlaku diperbarui!*\n` +
                                        `📱 +${maskNumber(number)}\n` +
                                        `⏳ Masa berlaku: *Permanent* ♾️\n\n` +
                                        `Bot tetap aktif tanpa batas waktu.`
                                );
                        } else {
                                removeJadibotExpiry(number);
                                ensureJadibotExpiry(number, durationInfo.ms, 'active');
                                scheduleJadibotExpiry(number, sendReplyFn);
                                const info = getJadibotExpirySummary(number);
                                await sendJbBtn(
                                        `╔══════════════════════╗\n` +
                                        `║   🤖  *J A D I B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `✅ *Masa berlaku diperbarui!*\n` +
                                        `📱 +${maskNumber(number)}\n` +
                                        `⏳ Sisa: *${info.remaining}*\n` +
                                        `📅 Habis: ${info.expiresAtText}\n\n` +
                                        `Bot tetap aktif, durasi diperbarui.`
                                );
                        }
                } else {
                        await sendJbBtn(
                                `╔══════════════════════╗\n` +
                                `║   🤖  *J A D I B O T*  ║\n` +
                                `╚══════════════════════╝\n\n` +
                                `⚠️ *Nomor sudah aktif!*\n` +
                                `+${maskNumber(number)} sedang berjalan sebagai jadibot.\n\n` +
                                `💡 Hentikan dulu: *${jbPfx}stopbot ${number}*`
                        );
                }
                return;
        }

        const mainNum = hisoka.mainBotNumber || hisoka.user?.id?.split(':')[0] || '';

        const sessionDir = path.join(process.cwd(), 'jadibot', number);
        const hasExistingSession = fs.existsSync(path.join(sessionDir, 'creds.json'));
        if (!hasExistingSession) {
                try {
                        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
                        const waResult = await hisoka.onWhatsApp(number + '@s.whatsapp.net');
                        const isRegistered = Array.isArray(waResult) && waResult.length > 0 && waResult[0]?.exists;
                        if (!isRegistered) {
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                const { flag: cFlag, name: cName } = getPhoneCountryInfo(number);
                                await sendJbBtn(
                                        `╔══════════════════════╗\n` +
                                        `║   🤖  *J A D I B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `❌ *Nomor tidak terdaftar di WhatsApp!*\n\n` +
                                        `${cFlag} *Negara:* ${cName}\n` +
                                        `📱 *Nomor:* +${number}\n\n` +
                                        `Nomor ini tidak ditemukan atau belum\n` +
                                        `terdaftar sebagai akun WhatsApp aktif.\n\n` +
                                        `💡 *Pastikan:*\n` +
                                        `• Nomor sudah benar termasuk kode negara\n` +
                                        `• Nomor aktif dan punya akun WhatsApp\n` +
                                        `• Format: _${jbPfx}jadibot 628xxx,1h_\n\n` +
                                        `📌 *Contoh kode negara:*\n` +
                                        `🇮🇩 Indonesia: 62xxx\n` +
                                        `🇲🇾 Malaysia: 60xxx\n` +
                                        `🇺🇸 Amerika: 1xxx\n` +
                                        `🇸🇬 Singapura: 65xxx`
                                );
                                return;
                        }
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                } catch {
                        // Gagal cek → tetap lanjut agar tidak block user
                }
        }

        try { await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } }); } catch {}

        // ── Cek: nomor masih punya waktu tersimpan (realtime.json ATAU logoutSaved) ──
        // Kalau owner kasih durasi eksplisit tapi waktu lama belum habis → pakai waktu lama
        // Dua sumber:
        //   1. getJadibotExpiry   → bot masih ada di realtime.json (belum pernah logout)
        //   2. getLogoutSavedMs   → bot sudah logout, sisa waktu disimpan sementara
        let finalDurationMs = durationInfo.ms;
        let isResumedFromLogout = false;
        let savedRemainingLabel = '';
        let isBlockedByExisting = false;   // flag: ada waktu aktif → durasi baru diabaikan

        if (!durationInfo.isDefault) {
                // Cek sumber 1: realtime.json (bot sedang tidak running tapi waktu belum expired)
                if (getJadibotExpiry) {
                        const existingMeta = getJadibotExpiry(number);
                        if (existingMeta) {
                                const stillValid = existingMeta.permanent === true || Number(existingMeta.expiresAt) > Date.now();
                                if (stillValid) {
                                        isBlockedByExisting = true;
                                        if (existingMeta.permanent === true) {
                                                savedRemainingLabel = 'Permanent ♾️';
                                        } else {
                                                const remMs = Number(existingMeta.expiresAt) - Date.now();
                                                savedRemainingLabel = formatRemainingTime ? formatRemainingTime(remMs) : `${Math.ceil(remMs / 60000)} menit`;
                                        }
                                        finalDurationMs = undefined; // pakai data realtime.json
                                }
                        }
                }

                // Cek sumber 2: logoutSaved (bot sudah logout, waktu belum dipakai habis)
                if (!isBlockedByExisting && getLogoutSavedMs) {
                        const savedLogout = getLogoutSavedMs(number);
                        if (savedLogout) {
                                if (savedLogout.permanent === true) {
                                        isBlockedByExisting = true;
                                        isResumedFromLogout = true;
                                        savedRemainingLabel = 'Permanent ♾️';
                                        finalDurationMs = 'permanent';
                                } else if (savedLogout.remainingMs > 0) {
                                        isBlockedByExisting = true;
                                        isResumedFromLogout = true;
                                        savedRemainingLabel = formatRemainingTime ? formatRemainingTime(savedLogout.remainingMs) : `${Math.ceil(savedLogout.remainingMs / 60000)} menit`;
                                        finalDurationMs = savedLogout.remainingMs;
                                }
                        }
                }

                // Kalau ada waktu aktif → beritahu owner, jalankan dengan waktu lama
                if (isBlockedByExisting) {
                        const sumberLabel = isResumedFromLogout ? 'sisa dari logout sebelumnya' : 'masih aktif di sistem';
                        await tolak(hisoka, m,
                                `╔══════════════════════╗\n` +
                                `║   ⚠️  *J A D I B O T*  ║\n` +
                                `╚══════════════════════╝\n\n` +
                                `📱 *Nomor:* +${maskNumber(number)}\n\n` +
                                `⚠️ *Maaf, waktu jadibot nomor ini masih ada!*\n` +
                                `_Data waktu (${sumberLabel}) masih tersimpan di sistem._\n\n` +
                                `⏳ *Sisa waktu:* _${savedRemainingLabel}_\n\n` +
                                `✅ *Bot otomatis melanjutkan dari sisa waktu tersebut*\n` +
                                `_(durasi baru \`${durationInfo.label || finalDurationInput}\` diabaikan)_\n\n` +
                                `━━━━━━━━━━━━━━━━━━━━━\n` +
                                `💡 Untuk *override* waktu, gunakan:\n` +
                                `• \`.upbot ${number} ${finalDurationInput}\` — perpanjang\n` +
                                `• \`.downbot ${number} ${finalDurationInput}\` — persingkat`
                        );
                }
        }

        // Cek sisa waktu dari logout — hanya kalau durasi default (tidak ada override di atas)
        if (!isBlockedByExisting && getLogoutSavedMs && durationInfo.isDefault) {
                const savedLogout = getLogoutSavedMs(number);
                if (savedLogout) {
                        if (savedLogout.permanent === true) {
                                finalDurationMs = 'permanent';
                                isResumedFromLogout = true;
                                savedRemainingLabel = 'Permanent ♾️';
                        } else if (savedLogout.remainingMs > 0) {
                                finalDurationMs = savedLogout.remainingMs;
                                isResumedFromLogout = true;
                                savedRemainingLabel = formatRemainingTime ? formatRemainingTime(savedLogout.remainingMs) : `${Math.ceil(savedLogout.remainingMs / 60000)} menit`;
                        }
                }
        }

        // Notif ke owner/GC bahwa waktu jadibot dilanjutkan dari sisa sebelumnya
        // (hanya kalau tidak ada notif blocked yang sudah dikirim di atas)
        if (isResumedFromLogout && !isBlockedByExisting) {
                try {
                        await tolak(hisoka, m,
                                `╔══════════════════════╗\n` +
                                `║   🔄  *J A D I B O T*  ║\n` +
                                `╚══════════════════════╝\n\n` +
                                `💾 *Sisa waktu tersimpan ditemukan!*\n` +
                                `📱 +${maskNumber(number)}\n\n` +
                                `⏳ Sisa waktu: *${savedRemainingLabel}*\n\n` +
                                `✅ Bot akan melanjutkan dari sisa waktu tersebut\n` +
                                `(bukan mulai dari awal)`
                        );
                } catch {}
        }

        await startJadibot(
                number,
                async (msg) => {
                        try {
                                const payload = typeof msg === 'string' ? { text: msg } : msg;
                                return await hisoka.sendMessage(m.from, payload, { quoted: m });
                        } catch (e) {
                                console.error('[JADIBOT][v1-notif] Gagal kirim ke GC:', e?.message);
                        }
                },
                mainNum,
                async (key, text) => {
                        try {
                                await hisoka.sendMessage(m.from, { edit: key, text });
                        } catch {}
                },
                null,
                finalDurationMs,
                hisoka,
                async (emoji) => {
                        try { await hisoka.sendMessage(m.from, { react: { text: emoji, key: m.key } }); } catch {}
                },
                m.sender,
                m.from
        );
}

// NB: parseJadibotCommandQuery TIDAK didestrukturisasi dari parameter — dia sudah
// tersedia sebagai fungsi top-level di file ini. Kalau didestrukturisasi di sini,
// dia akan shadow fungsi aslinya jadi `undefined` setiap kali caller (message.js)
// tidak mengirimkannya, dan `.upbot` akan selalu crash (bug lama yang sudah diperbaiki).

// ── Helper: format waktu sekarang (WIB) ──────────────────────────────────────
function _nowStrCmd() {
        const d = new Date()
        const hari  = d.toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'Asia/Jakarta' })
        const tgl   = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' })
        const waktu = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/\./g, ':')
        return `${hari}, ${tgl} | ${waktu} WIB`
}

// ── Helper: kirim notif ke semua owner + ke nomor jadibot (msg berbeda) ───────
async function _kirimNotifDurasi({ hisoka, jadibotMap, loadConfig, number, msgOwner, msgUser }) {
        const cfg    = loadConfig()
        const owners = (cfg.owners || []).map(n => String(n).replace(/[^0-9]/g, '')).filter(Boolean)
        const excl   = String(number).replace(/[^0-9]/g, '')

        // Ke semua owner (skip jika owner = nomor jadibot itu sendiri)
        for (const ownerNum of owners) {
                if (ownerNum === excl) continue
                try {
                        await hisoka.sendMessage(`${ownerNum}@s.whatsapp.net`, { text: msgOwner })
                        console.log(`[NOTIF-DURASI] ✅ Notif owner → +${ownerNum}`)
                } catch (e) {
                        console.log(`[NOTIF-DURASI] ⚠️ Gagal notif owner +${ownerNum}: ${e?.message}`)
                }
        }

        // Ke nomor jadibot via main bot, fallback via socket jadibot sendiri
        try {
                await hisoka.sendMessage(`${number}@s.whatsapp.net`, { text: msgUser })
                console.log(`[NOTIF-DURASI] ✅ Notif user → +${number}`)
        } catch (_) {
                const jSock = jadibotMap ? jadibotMap.get(number) : null
                if (jSock) {
                        try {
                                await jSock.sendMessage(`${number}@s.whatsapp.net`, { text: msgUser })
                                console.log(`[NOTIF-DURASI] ✅ Notif user via self-sock → +${number}`)
                        } catch (e2) {
                                console.log(`[NOTIF-DURASI] ⚠️ Gagal notif user +${number}: ${e2?.message}`)
                        }
                }
        }
}

async function handleUpbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, parseJadibotDuration, maskNumber, getJadibotExpirySummary, getJadibotExpiry, extendJadibotExpiry, scheduleJadibotExpiry, setPermanentJadibot, loadConfig }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;

        const upPfx = m.prefix || '.';
        const sendUpBtn = async (bodyText) => { await tolak(hisoka, m, bodyText); };

        const { number: upNumber, durationInput: upDurationInput } = parseJadibotCommandQuery(query || '');
        let upNum = upNumber;

        if (m.isQuoted && m.quoted?.sender && !m.quoted?.key?.fromMe && (!upNum || upNum.length < 7)) {
                let qNum = (m.quoted.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                if (qNum.startsWith('00')) qNum = qNum.slice(2);
                if (qNum.startsWith('08')) qNum = '62' + qNum.slice(1);
                else if (qNum.startsWith('8')) qNum = '62' + qNum;
                upNum = qNum;
        }

        if (upNum && upNum.startsWith('08')) upNum = '62' + upNum.slice(1);

        const upDurationInfo = parseJadibotDuration(upDurationInput);

        if (!upNum) {
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Nomor tidak boleh kosong!*\n\n` +
                        `📌 *Format koma (direkomendasikan):*\n` +
                        `_${upPfx}upbot 628xxx,30m_ → perpanjang 30 menit\n` +
                        `_${upPfx}upbot 628xxx,2j_ → perpanjang 2 jam\n` +
                        `_${upPfx}upbot 628xxx,3h_ → perpanjang 3 hari\n` +
                        `_${upPfx}upbot 628xxx,1h,20m_ → perpanjang 1 hari 20 menit\n` +
                        `_${upPfx}upbot 628xxx,1h.20m_ → sama, titik juga bisa\n` +
                        `_${upPfx}upbot 628xxx,p_ → ubah ke permanent\n\n` +
                        `📌 *Format spasi juga bisa:*\n` +
                        `_${upPfx}upbot 628xxx 2j_\n` +
                        `_${upPfx}upbot 628xxx 1h,20m_\n\n` +
                        `⏱️ *Singkatan: m=menit, j=jam, h=hari, p=permanent*\n` +
                        `💡 Mau kurangi durasi? Pakai *${upPfx}downbot*`
                );
                return;
        }

        if (!upDurationInfo || upDurationInput === '') {
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Format durasi tidak valid!*\n\n` +
                        `📌 *Contoh:*\n` +
                        `_${upPfx}upbot ${upNum},30m_\n` +
                        `_${upPfx}upbot ${upNum},2j_\n` +
                        `_${upPfx}upbot ${upNum},3h_\n` +
                        `_${upPfx}upbot ${upNum},1h,20m_\n` +
                        `_${upPfx}upbot ${upNum},1h.20m_\n` +
                        `_${upPfx}upbot ${upNum},p_\n\n` +
                        `⏱️ *Singkatan: m=menit, j=jam, h=hari, p=permanent*`
                );
                return;
        }

        if (!jadibotMap.has(upNum)) {
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `⚠️ *Bot tidak aktif!*\n` +
                        `+${maskNumber(upNum)} tidak ditemukan dalam daftar jadibot aktif.\n\n` +
                        `💡 Aktifkan dulu: _${upPfx}jadibot ${upNum},${upDurationInput}_`
                );
                return;
        }

        const upSendReplyFn = async (msg) => tolak(hisoka, m, msg);
        const oldCmdInfo = getJadibotExpirySummary(upNum);
        const oldCmdLabel = oldCmdInfo?.remaining || 'Tidak ada data';
        const oldCmdExpire = oldCmdInfo?.expiresAtText || '-';
        const _cfg     = loadConfig ? loadConfig() : {}
        const _ver     = _cfg.botVersion || 'V26'
        const _contact = (_cfg.botReply?.sourceUrl) || (_cfg.owners?.[0] ? `https://wa.me/${_cfg.owners[0]}` : 'https://wa.me/6289688206739')

        if (upDurationInfo.ms === 'permanent') {
                setPermanentJadibot(upNum, 'active');
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Durasi diperbarui!*\n` +
                        `📱 \`+${maskNumber(upNum)}\`\n\n` +
                        `📊 *Perubahan masa berlaku:*\n` +
                        `1. ~${oldCmdLabel}~ _(sebelumnya)_\n` +
                        `2. ✨ *Permanent* ♾️ _(terbaru)_\n\n` +
                        `> _Bot tetap aktif tanpa batas waktu._`
                );
                // ── Notif ke owner & nomor jadibot ──
                if (loadConfig) {
                        const _ts = _nowStrCmd()
                        await _kirimNotifDurasi({
                                hisoka, jadibotMap, loadConfig, number: upNum,
                                msgOwner:
                                        `╔══════════════════════╗\n` +
                                        `║   ⏫  *U P B O T*   ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `📱 *Nomor :* \`+${upNum}\`\n` +
                                        `🕐 *Waktu :* _${_ts}_\n\n` +
                                        `📋 *Rincian perubahan:*\n` +
                                        `1. ~${oldCmdLabel}~ _(sebelumnya)_\n` +
                                        `2. ✨ *Permanent ♾️* _(status baru)_\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_ver}_ 🤖`,
                                msgUser:
                                        `╔══════════════════════╗\n` +
                                        `║   ⏫  *U P B O T*   ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `🎉 *Botmu kini berstatus Permanent!*\n\n` +
                                        `📱 *Nomor kamu :* \`+${upNum}\`\n` +
                                        `🕐 *Waktu      :* _${_ts}_\n` +
                                        `♾️ *Status     :* *Permanent — Aktif tanpa batas waktu*\n\n` +
                                        `✅ _Semua fitur lanjut berjalan normal._\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_ver}_ 🤖`,
                        })
                }
        } else {
                extendJadibotExpiry(upNum, upDurationInfo.ms, 'active');
                scheduleJadibotExpiry(upNum, upSendReplyFn);
                const upInfo = getJadibotExpirySummary(upNum);
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Durasi diperbarui!*\n` +
                        `📱 \`+${maskNumber(upNum)}\`\n\n` +
                        `📊 *Perubahan masa berlaku:*\n` +
                        `1. ~${oldCmdLabel}~ _(sebelumnya)_\n` +
                        `2. ➕ *+${upDurationInfo.label}* _(ditambah)_\n` +
                        `3. ✨ *${upInfo.remaining}* _(total baru)_\n\n` +
                        `📅 _Exp lama : ${oldCmdExpire}_\n` +
                        `📅 _Exp baru : ${upInfo.expiresAtText}_\n\n` +
                        `> _Bot tetap aktif, durasi diperpanjang._`
                );
                // ── Notif ke owner & nomor jadibot ──
                if (loadConfig) {
                        const _ts = _nowStrCmd()
                        await _kirimNotifDurasi({
                                hisoka, jadibotMap, loadConfig, number: upNum,
                                msgOwner:
                                        `╔══════════════════════╗\n` +
                                        `║   ⏫  *U P B O T*   ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `📱 *Nomor :* \`+${upNum}\`\n` +
                                        `🕐 *Waktu :* _${_ts}_\n\n` +
                                        `📋 *Rincian perubahan:*\n` +
                                        `1. ~${oldCmdLabel}~ _(sebelumnya)_\n` +
                                        `2. ➕ *+${upDurationInfo.label}* _(ditambah)_\n` +
                                        `3. ✨ *${upInfo.remaining}* _(sisa baru)_\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_ver}_ 🤖`,
                                msgUser:
                                        `╔══════════════════════╗\n` +
                                        `║   ⏫  *U P B O T*   ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `🎉 *Masa aktif botmu diperpanjang!*\n\n` +
                                        `📱 *Nomor kamu :* \`+${upNum}\`\n` +
                                        `🕐 *Waktu      :* _${_ts}_\n\n` +
                                        `📋 *Rincian:*\n` +
                                        `- ➕ Ditambah : *${upDurationInfo.label}*\n` +
                                        `- ⏳ Sisa baru: *${upInfo.remaining}*\n\n` +
                                        `✅ _Semua fitur lanjut berjalan normal._\n` +
                                        `💡 _Pertanyaan? Hubungi owner._\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_ver}_ 🤖`,
                        })
                }
        }
        logCommand(m, hisoka, 'upbot');
}

// Kebalikan dari .upbot — mengurangi sisa masa berlaku jadibot. Tidak bisa
// dipakai untuk bot permanent (harus di-upbot ke durasi tertentu dulu).
// Sama seperti handleUpbot: parseJadibotCommandQuery TIDAK didestrukturisasi dari
// parameter supaya tidak shadow fungsi top-level-nya sendiri.
async function handleDownbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, parseJadibotDuration, maskNumber, getJadibotExpirySummary, getJadibotExpiry, reduceJadibotExpiry, scheduleJadibotExpiry, loadConfig }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;

        const downPfx = m.prefix || '.';
        const sendDownBtn = async (bodyText) => { await tolak(hisoka, m, bodyText); };

        const { number: downNumber, durationInput: downDurationInput } = parseJadibotCommandQuery(query || '');
        let downNum = downNumber;

        if (m.isQuoted && m.quoted?.sender && !m.quoted?.key?.fromMe && (!downNum || downNum.length < 7)) {
                let qNum = (m.quoted.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                if (qNum.startsWith('00')) qNum = qNum.slice(2);
                if (qNum.startsWith('08')) qNum = '62' + qNum.slice(1);
                else if (qNum.startsWith('8')) qNum = '62' + qNum;
                downNum = qNum;
        }

        if (downNum && downNum.startsWith('08')) downNum = '62' + downNum.slice(1);

        const downDurationInfo = parseJadibotDuration(downDurationInput);

        if (!downNum) {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏬  *D O W N B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Nomor tidak boleh kosong!*\n\n` +
                        `📌 *Format koma (direkomendasikan):*\n` +
                        `_${downPfx}downbot 628xxx,30m_ → kurangi 30 menit\n` +
                        `_${downPfx}downbot 628xxx,2j_ → kurangi 2 jam\n` +
                        `_${downPfx}downbot 628xxx,3h_ → kurangi 3 hari\n` +
                        `_${downPfx}downbot 628xxx,1h,20m_ → kurangi 1 hari 20 menit\n` +
                        `_${downPfx}downbot 628xxx,1h.20m_ → sama, titik juga bisa\n\n` +
                        `📌 *Format spasi juga bisa:*\n` +
                        `_${downPfx}downbot 628xxx 2j_\n\n` +
                        `⏱️ *Singkatan: m=menit, j=jam, h=hari*\n` +
                        `⚠️ Tidak berlaku untuk bot *Permanent*.`
                );
                return;
        }

        if (!downDurationInfo || downDurationInput === '') {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏬  *D O W N B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Format durasi tidak valid!*\n\n` +
                        `📌 *Contoh:*\n` +
                        `_${downPfx}downbot ${downNum},30m_\n` +
                        `_${downPfx}downbot ${downNum},2j_\n` +
                        `_${downPfx}downbot ${downNum},3h_\n` +
                        `_${downPfx}downbot ${downNum},1h,20m_\n` +
                        `_${downPfx}downbot ${downNum},1h.20m_\n\n` +
                        `⏱️ *Singkatan: m=menit, j=jam, h=hari*`
                );
                return;
        }

        if (downDurationInfo.ms === 'permanent') {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏬  *D O W N B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Tidak valid!*\n` +
                        `*downbot* cuma buat mengurangi durasi (angka), bukan "permanent".\n\n` +
                        `💡 Mau ubah ke permanent? Pakai *${downPfx}upbot ${downNum},p*`
                );
                return;
        }

        if (!jadibotMap.has(downNum)) {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏬  *D O W N B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `⚠️ *Bot tidak aktif!*\n` +
                        `+${maskNumber(downNum)} tidak ditemukan dalam daftar jadibot aktif.`
                );
                return;
        }

        const downSendReplyFn = async (msg) => tolak(hisoka, m, msg);
        const oldDownInfo = getJadibotExpirySummary(downNum);
        const oldDownLabel = oldDownInfo?.remaining || 'Tidak ada data';
        const oldDownExpire = oldDownInfo?.expiresAtText || '-';

        const downResult = reduceJadibotExpiry(downNum, downDurationInfo.ms, 'active');

        if (!downResult) {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏬  *D O W N B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `⚠️ *Gagal!*\n` +
                        `Data masa berlaku +${maskNumber(downNum)} tidak ditemukan.`
                );
                return;
        }

        if (downResult.error === 'permanent') {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏬  *D O W N B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `❌ *Tidak bisa!*\n` +
                        `+${maskNumber(downNum)} statusnya *Permanent* ♾️, tidak punya batas waktu yang bisa dikurangi.\n\n` +
                        `💡 Set durasi tertentu dulu: *${downPfx}upbot ${downNum},1h*`
                );
                return;
        }

        // Hanya reschedule timer kalau sisa waktu masih ada.
        // Kalau expiredNow=true, scheduleJadibotExpiry akan langsung trigger
        // expireJadibot (double cleanup+notif). Fix: skip, biarkan branch
        // expiredNow di bawah yang handle notif & cleanup-nya sendiri.
        if (!downResult.expiredNow) scheduleJadibotExpiry(downNum, downSendReplyFn);

        const _dcfg     = loadConfig ? loadConfig() : {}
        const _dver     = _dcfg.botVersion || 'V26'
        const _dcontact = (_dcfg.botReply?.sourceUrl) || (_dcfg.owners?.[0] ? `https://wa.me/${_dcfg.owners[0]}` : 'https://wa.me/6289688206739')

        if (downResult.expiredNow) {
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║  ⏬  *D O W N B O T*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Durasi dikurangi!*\n` +
                        `📱 \`+${maskNumber(downNum)}\`\n\n` +
                        `📊 *Perubahan masa berlaku:*\n` +
                        `1. ~${oldDownLabel}~ _(sebelumnya)_\n` +
                        `2. ➖ *-${downDurationInfo.label}* _(dikurangi)_\n` +
                        `3. ~Kedaluwarsa~ _(sisa habis)_\n\n` +
                        `📅 _Exp lama : ${oldDownExpire}_\n\n` +
                        `> _⚠️ Sisa waktu habis — bot langsung dihentikan & sesi dihapus._`
                );
                // ── Notif ke owner & nomor jadibot (bot habis/dihentikan) ──
                if (loadConfig) {
                        const _ts = _nowStrCmd()
                        await _kirimNotifDurasi({
                                hisoka, jadibotMap, loadConfig, number: downNum,
                                msgOwner:
                                        `╔══════════════════════╗\n` +
                                        `║  ⏬  *D O W N B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `📱 *Nomor :* \`+${downNum}\`\n` +
                                        `🕐 *Waktu :* _${_ts}_\n\n` +
                                        `📋 *Rincian perubahan:*\n` +
                                        `1. ~${oldDownLabel}~ _(sebelumnya)_\n` +
                                        `2. ➖ *-${downDurationInfo.label}* _(dikurangi)_\n` +
                                        `3. ~Kedaluwarsa — Bot dihentikan~ _(sisa habis)_\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_dver}_ 🤖`,
                                msgUser:
                                        `╔══════════════════════╗\n` +
                                        `║  ⏬  *D O W N B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `⚠️ *Masa aktif botmu telah habis!*\n\n` +
                                        `📱 *Nomor kamu :* \`+${downNum}\`\n` +
                                        `🕐 *Waktu      :* _${_ts}_\n\n` +
                                        `📋 *Rincian:*\n` +
                                        `- ➖ Dikurangi : *${downDurationInfo.label}*\n` +
                                        `- ⏳ Sisa      : ~Kedaluwarsa~\n\n` +
                                        `🛑 _Bot langsung dihentikan._\n` +
                                        `💡 _Hubungi owner untuk perpanjang._\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_dver}_ 🤖`,
                        })
                }
        } else {
                const downInfo = getJadibotExpirySummary(downNum);
                await sendDownBtn(
                        `╔══════════════════════╗\n` +
                        `║  ⏬  *D O W N B O T*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Durasi dikurangi!*\n` +
                        `📱 \`+${maskNumber(downNum)}\`\n\n` +
                        `📊 *Perubahan masa berlaku:*\n` +
                        `1. ~${oldDownLabel}~ _(sebelumnya)_\n` +
                        `2. ➖ *-${downDurationInfo.label}* _(dikurangi)_\n` +
                        `3. ✨ *${downInfo.remaining}* _(sisa baru)_\n\n` +
                        `📅 _Exp lama : ${oldDownExpire}_\n` +
                        `📅 _Exp baru : ${downInfo.expiresAtText}_\n\n` +
                        `> _Bot tetap aktif, durasi dikurangi._`
                );
                // ── Notif ke owner & nomor jadibot ──
                if (loadConfig) {
                        const _ts = _nowStrCmd()
                        await _kirimNotifDurasi({
                                hisoka, jadibotMap, loadConfig, number: downNum,
                                msgOwner:
                                        `╔══════════════════════╗\n` +
                                        `║  ⏬  *D O W N B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `📱 *Nomor :* \`+${downNum}\`\n` +
                                        `🕐 *Waktu :* _${_ts}_\n\n` +
                                        `📋 *Rincian perubahan:*\n` +
                                        `1. ~${oldDownLabel}~ _(sebelumnya)_\n` +
                                        `2. ➖ *-${downDurationInfo.label}* _(dikurangi)_\n` +
                                        `3. ✨ *${downInfo.remaining}* _(sisa baru)_\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_dver}_ 🤖`,
                                msgUser:
                                        `╔══════════════════════╗\n` +
                                        `║  ⏬  *D O W N B O T*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `ℹ️ *Masa aktif botmu dikurangi oleh owner.*\n\n` +
                                        `📱 *Nomor kamu :* \`+${downNum}\`\n` +
                                        `🕐 *Waktu      :* _${_ts}_\n\n` +
                                        `📋 *Rincian:*\n` +
                                        `- ➖ Dikurangi : *${downDurationInfo.label}*\n` +
                                        `- ⏳ Sisa baru : *${downInfo.remaining}*\n\n` +
                                        `💡 _Pertanyaan? Hubungi owner._\n\n` +
                                        `> _Notif otomatis — Wily Bot ${_dver}_ 🤖`,
                        })
                }
        }
        logCommand(m, hisoka, 'downbot');
}

async function handleStopbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, stopJadibot, maskNumber, getJadibotExpiry, formatRemainingTime, getJadibotChoiceKey, pendingJadibotChoices }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        const stopChoiceKey = getJadibotChoiceKey(m);
        const existingStopChoice = pendingJadibotChoices.get(stopChoiceKey);
        if (existingStopChoice?.timeout) clearTimeout(existingStopChoice.timeout);
        pendingJadibotChoices.delete(stopChoiceKey);

        const pfx = m.prefix || '.';
        const rawQuery = (query || '').trim();

        const sendStopBtn = async (bodyText) => {
                await tolak(hisoka, m, bodyText);
        };

        if (rawQuery.toLowerCase() === 'batal') {
                await sendStopBtn(
                        `╔══════════════════════╗\n` +
                        `║  🛑  *STOP JADIBOT*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Dibatalkan!*\n` +
                        `Bot tidak dihentikan.\n\n` +
                        `💡 Ketik *${pfx}listbot* untuk lihat bot aktif.`
                );
                return;
        }

        const confirmMatch = rawQuery.match(/^(\d+)\s+confirm$/i);
        if (confirmMatch) {
                let number = confirmMatch[1];
                if (number.startsWith('08')) number = '62' + number.slice(1);
                await stopJadibot(number, async (text) => {
                        await sendStopBtn(text);
                });
                return;
        }

        let number = rawQuery.replace(/[^0-9]/g, '');
        if (!number) {
                const list = [...jadibotMap.keys()];

                if (!list.length) {
                        await sendStopBtn(
                                `╔══════════════════════╗\n` +
                                `║  🛑  *STOP JADIBOT*  ║\n` +
                                `╚══════════════════════╝\n\n` +
                                `📭 *Tidak ada jadibot yang aktif.*\n\n` +
                                `💡 Ketik *${pfx}jadibot <nomor>* untuk tambah bot.`
                        );
                        return;
                }

                let bodyText =
                        `╔══════════════════════╗\n` +
                        `║  🛑  *STOP JADIBOT*  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `📊 *Bot aktif: ${list.length}*\n\n`;

                for (const [i, num] of list.entries()) {
                        const meta = getJadibotExpiry(num);
                        const sisa = !meta ? 'belum tercatat' : meta.permanent === true ? 'Permanent ♾️' : formatRemainingTime(Number(meta.expiresAt) - Date.now());
                        bodyText += `${i + 1}. *+${num}*\n   🟢 Aktif · Sisa ${sisa}\n`;
                }

                bodyText +=
                        `\n💡 Ketik:\n` +
                        `*${pfx}stopbot <nomor>*\n` +
                        `untuk menghentikan bot.`;

                await sendStopBtn(bodyText);
                return;
        }

        if (number.startsWith('08')) number = '62' + number.slice(1);

        const isRunning = jadibotMap.has(number);
        const maskedNum = maskNumber(number);

        await sendStopBtn(
                `╔══════════════════════╗\n` +
                `║  🛑  *STOP JADIBOT*  ║\n` +
                `╚══════════════════════╝\n\n` +
                `📱 *Nomor:* +${maskedNum}\n` +
                `📶 *Status:* ${isRunning ? '🟢 Aktif' : '🔴 Tidak aktif'}\n\n` +
                `⚠️ Yakin ingin menghentikan bot ini?\n\n` +
                `✅ Ketik: *${pfx}stopbot ${number} confirm*\n` +
                `❌ Batal: *${pfx}stopbot batal*`
        );
}

module.exports = { handleJadibot, handleUpbot, handleDownbot, handleStopbot, normalizeJadibotNumber };
