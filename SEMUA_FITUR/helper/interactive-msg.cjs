/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *
 *  interactive-msg.cjs — Interactive message helper
 *  Kirim pesan interaktif: list (single_select via nativeFlowMessage)
 *  Kompatibel dengan WA Mobile, WA Business, WA Messenger.
 * ───────────────────────────────
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const {
        generateWAMessageFromContent,
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

/**
 * sendListMessage — kirim interactive single_select via nativeFlowMessage.
 *
 * Format ini kompatibel di WA Mobile, WA Business, dan WA Messenger.
 * Response diterima sebagai nativeFlowResponseMessage.paramsJson { id }
 * yang sudah dipetakan ke m.text oleh inject.js.
 *
 * @param {object} hisoka  - Baileys socket
 * @param {string} jid     - remoteJid tujuan
 * @param {object} m       - pesan asal (untuk quoted)
 * @param {object} opts
 *   @param {string}   opts.title       - judul header (opsional)
 *   @param {string}   opts.body        - teks utama pesan
 *   @param {string}   opts.buttonText  - label tombol yang membuka list
 *   @param {string}   opts.footer      - footer teks (opsional)
 *   @param {Array}    opts.sections    - [{title, rows:[{rowId|id, title, description}]}]
 */
async function sendListMessage(hisoka, jid, m, opts = {}) {
        const {
                title      = '',
                body       = '',
                buttonText = '📋 Pilih',
                footer     = '',
                sections   = [],
        } = opts;

        // Konversi sections ke format nativeFlow single_select
        const nativeSections = sections.map(sec => ({
                title: sec.title || '',
                rows: (sec.rows || []).map(r => ({
                        header:      r.title || '',
                        title:       r.title || '',
                        description: r.description || '',
                        id:          r.rowId || r.id || '',
                })),
        }));

        const buttonParamsJson = JSON.stringify({
                title: buttonText,
                sections: nativeSections,
        });

        try {
                // ── Format utama: interactiveMessage + nativeFlowMessage ──────────────
                // Bekerja di WA Business, WA Messenger, WA Mobile terbaru.
                // Response: nativeFlowResponseMessage.paramsJson.id → m.text (via inject.js)
                const msg = generateWAMessageFromContent(jid, {
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                                body: proto.Message.InteractiveMessage.Body.create({
                                        text: body,
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({
                                        text: footer || '',
                                }),
                                header: proto.Message.InteractiveMessage.Header.create({
                                        title: title || '',
                                        hasMediaAttachment: false,
                                }),
                                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                        buttons: [
                                                proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create({
                                                        name: 'single_select',
                                                        buttonParamsJson,
                                                }),
                                        ],
                                }),
                        }),
                }, { quoted: m });

                await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });

        } catch (errInteractive) {
                // ── Fallback: listMessage proto (WA Mobile lama) ──────────────────────
                // Kalau interactiveMessage gagal, coba listMessage biasa.
                try {
                        const msgList = generateWAMessageFromContent(jid, {
                                listMessage: proto.Message.ListMessage.create({
                                        title,
                                        description: body,
                                        buttonText,
                                        listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
                                        sections: sections.map(sec => ({
                                                title: sec.title || '',
                                                rows: (sec.rows || []).map(r => ({
                                                        rowId:       r.rowId || r.id || '',
                                                        title:       r.title || '',
                                                        description: r.description || '',
                                                })),
                                        })),
                                        footerText: footer,
                                }),
                        }, { quoted: m });
                        await hisoka.relayMessage(msgList.key.remoteJid, msgList.message, { messageId: msgList.key.id });
                } catch (errList) {
                        // ── Fallback terakhir: plain text ────────────────────────────────
                        const rowLines = sections.flatMap(sec =>
                                (sec.rows || []).map(r => `• ${r.title || r.rowId || r.id}`)
                        ).join('\n');
                        await hisoka.sendMessage(jid, {
                                text: `${body}\n\n${rowLines}`,
                        }, { quoted: m }).catch(() => {});
                }
        }
}

function makeInteractiveMsg({ loadConfig, tolak }) {

        async function listbut2(jid, teks, listnye, m, hisoka) {
                const cfg     = loadConfig();
                const botName = (cfg.botReply || {}).botName || 'Wily Bot';

                await sendListMessage(hisoka, jid, m, {
                        body:       teks,
                        buttonText: listnye.title || '📋 Pilih',
                        footer:     `✨ Powered By ${botName}`,
                        sections:   listnye.sections || [],
                });
        }

        async function sendConfirmWithButtons(hisoka, m, txt, buttons, opts = {}) {
                let sent = false;
                try {
                        await sendListMessage(hisoka, m.from, m, {
                                body:       txt,
                                buttonText: '📋 Pilih',
                                footer:     opts.footer || '',
                                sections: [{
                                        title: opts.sectionTitle || 'Pilihan',
                                        rows: buttons.map(b => ({
                                                rowId:       b.id,
                                                title:       b.text,
                                                description: b.description || '',
                                        })),
                                }],
                        });
                        sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, txt);
        }

        async function sendAudioWithButtons(hisoka, m, audioBuf, bodyTxt, rows, opts = {}) {
                const fileName    = opts.fileName    || 'audio.mp3';
                const listTitle   = opts.listTitle   || '🎵 Pilih Aksi';
                const sectionTitle= opts.sectionTitle|| 'Opsi';
                const sections    = opts.sections    || [{ title: sectionTitle, rows }];
                const noAudio     = opts.noAudio     || false;

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
                        await sendListMessage(hisoka, m.from, m, {
                                body:       bodyTxt,
                                buttonText: listTitle,
                                footer:     opts.footer || '',
                                sections,
                        });
                        sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, bodyTxt);
        }

        return { listbut2, sendConfirmWithButtons, sendAudioWithButtons };
}

module.exports = { resolveThumbnailMedia, startTyping, makeInteractiveMsg, sendListMessage };
