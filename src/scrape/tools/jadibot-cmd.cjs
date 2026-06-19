'use strict';

async function handleJadibot({ hisoka, m, query, tolak, logCommand, isMainBot, path, fs, jadibotMap, parseJadibotCommandQuery, parseJadibotDuration, startJadibot, maskNumber, getJadibotExpirySummary, scheduleJadibotExpiry, setPermanentJadibot, removeJadibotExpiry, ensureJadibotExpiry, getPhoneCountryInfo }) {
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

module.exports = { handleJadibot, handleUpbot, handleStopbot };
