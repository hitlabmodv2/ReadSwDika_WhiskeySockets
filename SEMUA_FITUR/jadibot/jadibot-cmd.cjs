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

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// Helper: kirim interactiveMessage (cta_copy / cta_url) via relay
// sendMessage biasa tidak support { interactiveMessage: ... } → "Invalid media type"
async function _sendInteractive(hisoka, jid, payload, quotedMsg) {
  const im = payload.interactiveMessage;
  try {
    const waMsg = generateWAMessageFromContent(jid, {
      interactiveMessage: proto.Message.InteractiveMessage.create({
        body:   proto.Message.InteractiveMessage.Body.create({ text: im.title || '' }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: im.footer || '' }),
        header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: (im.buttons || []).map(b =>
            proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create({
              name: b.name,
              buttonParamsJson: b.buttonParamsJson,
            })
          ),
        }),
      }),
    }, { quoted: quotedMsg });
    await hisoka.relayMessage(waMsg.key.remoteJid, waMsg.message, { messageId: waMsg.key.id });
    return waMsg;
  } catch (err) {
    // Fallback plain text kalau relay gagal
    console.log('[JADIBOT][v1-notif] interactiveMessage fallback plain text:', err?.message);
    return await hisoka.sendMessage(jid, { text: im.title || '' }, { quoted: quotedMsg });
  }
}


function parseJadibotCommandQuery(raw = '') {
    const text = String(raw || '').trim();
    if (!text) return { number: '', durationInput: '', rawNumberPart: '' };

    let numberPart = '';
    let durationRaw = '';

    // Support comma format: "628xxx,1h" atau "+628xxx,p"
    const commaIdx = text.indexOf(',');
    if (commaIdx !== -1) {
        numberPart = text.slice(0, commaIdx).trim();
        durationRaw = text.slice(commaIdx + 1).trim();
    } else {
        // Space-separated: "628xxx 1h" atau "628xxx permanent"
        const durationMatch = text.match(/\s((?:\d+\s*(?:menit|mnt|min|minute|minutes|m|jam|hour|hours|j|hari|day|days|h|d))|(?:permanent|permanen|perm|perma|selamanya|p))\s*$/i);
        durationRaw = durationMatch ? durationMatch[1].trim() : '';
        numberPart = durationMatch ? text.slice(0, durationMatch.index).trim() : text;
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

async function handleJadibot({ hisoka, m, query, tolak, logCommand, isMainBot, path, fs, jadibotMap, parseJadibotDuration, startJadibot, maskNumber, getJadibotExpirySummary, scheduleJadibotExpiry, setPermanentJadibot, removeJadibotExpiry, ensureJadibotExpiry }) {
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

        await startJadibot(
                number,
                async (msg) => {
                        try {
                                if (msg && typeof msg === 'object' && msg.interactiveMessage) {
                                        return await _sendInteractive(hisoka, m.from, msg, m);
                                }
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
                durationInfo.ms,
                hisoka,
                async (emoji) => {
                        try { await hisoka.sendMessage(m.from, { react: { text: emoji, key: m.key } }); } catch {}
                },
                m.sender
        );
}

async function handleUpbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, parseJadibotCommandQuery, parseJadibotDuration, maskNumber, getJadibotExpirySummary, getJadibotExpiry, extendJadibotExpiry, scheduleJadibotExpiry, setPermanentJadibot }) {
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
                        `_${upPfx}upbot 628xxx,p_ → ubah ke permanent\n\n` +
                        `📌 *Format spasi juga bisa:*\n` +
                        `_${upPfx}upbot 628xxx 2j_\n\n` +
                        `⏱️ *Singkatan: m=menit, j=jam, h=hari, p=permanent*`
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
        if (upDurationInfo.ms === 'permanent') {
                setPermanentJadibot(upNum, 'active');
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Durasi diperbarui!*\n` +
                        `📱 +${maskNumber(upNum)}\n\n` +
                        `📊 *Perubahan masa berlaku:*\n` +
                        `⏮️ Sebelumnya : *${oldCmdLabel}*\n` +
                        `✨ Terbaru    : *Permanent* ♾️\n\n` +
                        `Bot tetap aktif tanpa batas waktu.`
                );
        } else {
                extendJadibotExpiry(upNum, upDurationInfo.ms, 'active');
                scheduleJadibotExpiry(upNum, upSendReplyFn);
                const upInfo = getJadibotExpirySummary(upNum);
                await sendUpBtn(
                        `╔══════════════════════╗\n` +
                        `║   ⏫  *U P B O T*   ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✅ *Durasi diperbarui!*\n` +
                        `📱 +${maskNumber(upNum)}\n\n` +
                        `📊 *Perubahan masa berlaku:*\n` +
                        `⏮️ Sebelumnya : *${oldCmdLabel}*\n` +
                        `   Exp lama   : ${oldCmdExpire}\n` +
                        `➕ Ditambah   : *${upDurationInfo.label}*\n` +
                        `✨ Total baru : *${upInfo.remaining}*\n` +
                        `   Exp baru   : ${upInfo.expiresAtText}\n\n` +
                        `Bot tetap aktif, durasi diperpanjang.`
                );
        }
        logCommand(m, hisoka, 'upbot');
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

module.exports = { handleJadibot, handleUpbot, handleStopbot, normalizeJadibotNumber };
