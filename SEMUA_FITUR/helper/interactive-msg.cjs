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
 *  interactive-msg.cjs — Interactive message helper
 *  Fungsi pembantu kirim pesan interaktif: button, list, dan poll WhatsApp
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Interactive Message Helper
 *  Fungsi pembantu untuk membuat & mengirim pesan interaktif
 *  WhatsApp: button (tombol aksi), list (daftar pilihan),
 *  dan poll — digunakan di seluruh fitur bot.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const {
        generateWAMessageFromContent,
        prepareWAMessageMedia,
        proto,
} = require('@whiskeysockets/baileys');

function resolveThumbnailMedia(thumbnailUrl) {
        if (!thumbnailUrl) return null;
        if (/^https?:\/\//i.test(thumbnailUrl)) return { url: thumbnailUrl };
        const thumbnailPath = path.isAbsolute(thumbnailUrl)
                ? thumbnailUrl
                : path.join(process.cwd(), thumbnailUrl);
        if (!fs.existsSync(thumbnailPath)) return null;
        return fs.readFileSync(thumbnailPath);
}

function startTyping(hisoka, m) {
        const jid = m?.from;
        if (!hisoka || !jid) return () => {};
        let active = true;
        try { hisoka.sendPresenceUpdate('composing', jid); } catch (_) {}
        const interval = setInterval(() => {
                if (active) { try { hisoka.sendPresenceUpdate('composing', jid); } catch (_) {} }
        }, 2500);
        const stop = () => {
                if (!active) return;
                active = false;
                clearInterval(interval);
                try { hisoka.sendPresenceUpdate('paused', jid); } catch (_) {}
        };
        setTimeout(stop, 60000);
        return stop;
}

function makeInteractiveMsg({ loadConfig, tolak }) {
        async function listbut2(jid, teks, listnye, m, hisoka) {
                const cfg = loadConfig();
                const botReply      = cfg.botReply || {};
                const thumbnailUrl  = botReply.thumbnailUrl  || '';
                const botName       = botReply.botName       || 'Wily Bot';
                const newsletterJid = botReply.newsletterJid || '';
                const newsletterName= botReply.newsletterName|| '';

                const thumbnailMedia = resolveThumbnailMedia(thumbnailUrl);
                const headerMedia = thumbnailMedia
                        ? await prepareWAMessageMedia({ image: thumbnailMedia }, { upload: hisoka.waUploadToServer })
                        : {};

                const msg = generateWAMessageFromContent(jid, {
                        messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                        },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                                contextInfo: {
                                        mentionedJid: [m.sender],
                                        forwardingScore: 999,
                                        isForwarded: true,
                                        forwardedNewsletterMessageInfo: {
                                                newsletterJid,
                                                newsletterName,
                                                serverMessageId: Math.floor(Math.random() * 9999) + 1
                                        }
                                },
                                body: proto.Message.InteractiveMessage.Body.create({
                                        text: teks
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({
                                        text: `✨ Powered By ${botName}`
                                }),
                                header: proto.Message.InteractiveMessage.Header.create({
                                        title: ``,
                                        subtitle: ``,
                                        gifPlayback: true,
                                        hasMediaAttachment: !!thumbnailMedia,
                                        ...headerMedia
                                }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [
                                                {
                                                        name: 'single_select',
                                                        buttonParamsJson: JSON.stringify(listnye)
                                                }
                                        ]
                                })
                        })
                }, { quoted: m });

                await hisoka.relayMessage(msg.key.remoteJid, msg.message, {
                        messageId: msg.key.id
                });
        }

        async function sendConfirmWithButtons(hisoka, m, txt, buttons, opts = {}) {
                const quoteSource = (opts.quoteBot && m.quoted?.key?.id) ? m.quoted : m;
                const contextInfo = quoteSource.key?.id ? {
                        stanzaId: quoteSource.key.id,
                        participant: quoteSource.sender || quoteSource.key?.participant || quoteSource.key?.remoteJid || '',
                        quotedMessage: quoteSource.raw || quoteSource.message || {},
                } : {};
                let sent = false;
                try {
                        const msg = generateWAMessageFromContent(
                                m.from,
                                {
                                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                        interactiveMessage: {
                                                contextInfo,
                                                body: { text: txt },
                                                nativeFlowMessage: {
                                                        buttons: buttons.map(b => ({
                                                                name: 'quick_reply',
                                                                buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
                                                        }))
                                                }
                                        }
                                },
                                {},
                                {}
                        );
                        await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
                        sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, txt);
        }

        async function sendAudioWithButtons(hisoka, m, audioBuf, bodyTxt, rows, opts = {}) {
                const quoteSource = (opts.quoteBot && m.quoted?.key?.id) ? m.quoted : m;
                const contextInfo = quoteSource.key?.id ? {
                        stanzaId: quoteSource.key.id,
                        participant: quoteSource.sender || quoteSource.key?.participant || quoteSource.key?.remoteJid || '',
                        quotedMessage: quoteSource.raw || quoteSource.message || {},
                } : {};
                const fileName = opts.fileName || 'audio.mp3';
                const listTitle = opts.listTitle || '🎵 Pilih Aksi';
                const sectionTitle = opts.sectionTitle || 'Opsi';
                const sections = opts.sections || [{ title: sectionTitle, rows }];
                const coverBuf = opts.coverBuf || null;
                const noAudio = opts.noAudio || false;

                if (!noAudio && audioBuf) {
                        await hisoka.sendMessage(m.from, {
                                audio: audioBuf,
                                mimetype: 'audio/mpeg',
                                ptt: false,
                                fileName,
                        }, { quoted: m }).catch(() => {});
                }

                let sent = false;
                try {
                        const headerMedia = coverBuf
                                ? await prepareWAMessageMedia({ image: coverBuf }, { upload: hisoka.waUploadToServer })
                                : null;
                        const msg = generateWAMessageFromContent(
                                m.from,
                                {
                                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                        interactiveMessage: {
                                                contextInfo,
                                                ...(headerMedia ? { header: { hasMediaAttachment: true, ...headerMedia } } : {}),
                                                body: { text: bodyTxt },
                                                nativeFlowMessage: {
                                                        buttons: [
                                                                {
                                                                        name: 'single_select',
                                                                        buttonParamsJson: JSON.stringify({ title: listTitle, sections })
                                                                }
                                                        ]
                                                }
                                        }
                                },
                                {},
                                {}
                        );
                        await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
                        sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, bodyTxt);
        }

        return { listbut2, sendConfirmWithButtons, sendAudioWithButtons };
}

module.exports = { resolveThumbnailMedia, startTyping, makeInteractiveMsg };
