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
 *  sendstatus.cjs — Send status command handler
 *  Perintah untuk kirim pesan/status WA ke semua kontak terdaftar
 * ───────────────────────────────
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');

async function handleSendstatus({ hisoka, m, tolak, logCommand, generateWAMessageContent, generateWAMessageFromContent }) {
        if (!m.isOwner) return;

        const ssArgs = m.text.trim().split(/ +/);
        if (ssArgs.length < 3) return;

        const ssTarget = ssArgs[1];
        const ssEncoded = ssArgs.slice(2).join(' ');

        let ssMeta;
        try {
                ssMeta = JSON.parse(decodeURIComponent(ssEncoded));
        } catch (e) {
                return tolak(hisoka, m, '❌ Gagal memparse konten: ' + (e.message || e));
        }

        const ssAllGids = hisoka.groups.keys().filter(id => id.endsWith('@g.us'));
        const ssTargets = ssTarget === 'all' ? ssAllGids : [ssTarget];

        if (!ssTargets.length) return tolak(hisoka, m, '❌ Tidak ada grup tujuan.');

        let ssRawContent;
        let ssAudioCaption = null;
        let ssTextDirect = null;
        if (ssMeta.type === 'text') {
                ssTextDirect = ssMeta.text;
        } else if (ssMeta.type === 'image') {
                ssRawContent = { image: { url: ssMeta.file } };
                if (ssMeta.caption) ssRawContent.caption = ssMeta.caption;
        } else if (ssMeta.type === 'video') {
                ssRawContent = { video: { url: ssMeta.file } };
                if (ssMeta.caption) ssRawContent.caption = ssMeta.caption;
        } else if (ssMeta.type === 'audio') {
                ssRawContent = { audio: { url: ssMeta.file }, mimetype: ssMeta.mime || 'audio/ogg; codecs=opus', ptt: false };
                if (ssMeta.caption) ssAudioCaption = ssMeta.caption;
        } else {
                return tolak(hisoka, m, '❌ Tipe konten tidak dikenali.');
        }

        await tolak(hisoka, m, `⏳ Mengirim sebagai Group Status ke *${ssTargets.length}* grup, mohon tunggu...`);

        let ssOk = 0, ssFail = 0;
        for (const gid of ssTargets) {
                try {
                        let ssInside;
                        if (ssTextDirect !== null) {
                                ssInside = {
                                        extendedTextMessage: {
                                                text: ssTextDirect,
                                                backgroundArgb: 4278190080,
                                                font: 0
                                        }
                                };
                        } else {
                                ssInside = await generateWAMessageContent(ssRawContent, {
                                        upload: hisoka.waUploadToServer
                                });
                        }
                        const ssSecret = crypto.randomBytes(32);
                        const ssMsg = generateWAMessageFromContent(gid, {
                                messageContextInfo: { messageSecret: ssSecret },
                                groupStatusMessageV2: {
                                        message: {
                                                ...ssInside,
                                                messageContextInfo: { messageSecret: ssSecret }
                                        }
                                }
                        }, {});
                        await hisoka.relayMessage(gid, ssMsg.message, { messageId: ssMsg.key.id });

                        if (ssAudioCaption) {
                                await new Promise(r => setTimeout(r, 800));
                                const ssCaptionInside = await generateWAMessageContent({ text: ssAudioCaption }, {
                                        upload: hisoka.waUploadToServer
                                });
                                const ssCaptionSecret = crypto.randomBytes(32);
                                const ssCaptionMsg = generateWAMessageFromContent(gid, {
                                        messageContextInfo: { messageSecret: ssCaptionSecret },
                                        groupStatusMessageV2: {
                                                message: {
                                                        ...ssCaptionInside,
                                                        messageContextInfo: { messageSecret: ssCaptionSecret }
                                                }
                                        }
                                }, {});
                                await hisoka.relayMessage(gid, ssCaptionMsg.message, { messageId: ssCaptionMsg.key.id });
                        }

                        ssOk++;
                        if (ssTargets.length > 1) await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                        console.error(`[sendstatus] Gagal ke ${gid}:`, e.message);
                        ssFail++;
                }
        }

        if (ssMeta.file && fs.existsSync(ssMeta.file)) {
                try { fs.unlinkSync(ssMeta.file); } catch (_) {}
        }

        await tolak(hisoka, m,
                `✅ *Selesai Kirim Group Status!*\n\n` +
                `📊 *Hasil:*\n` +
                `• ✅ Berhasil : ${ssOk} grup\n` +
                `• ❌ Gagal    : ${ssFail} grup\n` +
                `• 📦 Total    : ${ssTargets.length} grup`
        );

        logCommand(m, hisoka, 'sendstatus');
}

module.exports = { handleSendstatus };
