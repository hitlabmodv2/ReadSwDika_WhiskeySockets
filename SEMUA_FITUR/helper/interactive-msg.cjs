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
 * Kirim listMessage (format resmi Baileys terbaru) — bekerja di WA Mobile & WA Web.
 * Menggunakan hisoka.sendMessage() langsung sesuai official @whiskeysockets/baileys API.
 * Respons masuk sebagai listResponseMessage.singleSelectReply.selectedRowId
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
 *   @param {Array}    opts.sections    - [{title, rows:[{rowId,title,description}]}]
 */
async function sendListMessage(hisoka, jid, m, opts = {}) {
        const {
                title      = '',
                body       = '',
                buttonText = '📋 Pilih',
                footer     = '',
                sections   = [],
        } = opts;

        // Format resmi official Baileys latest (@whiskeysockets/baileys)
        // Ref: https://www.npmjs.com/package/@whiskeysockets/baileys
        const listPayload = {
                text:       body,
                title:      title || undefined,
                footer:     footer || undefined,
                buttonText,
                listType:   1, // ListType.SINGLE_SELECT
                sections:   sections.map(sec => ({
                        title: sec.title || '',
                        rows: (sec.rows || []).map(r => ({
                                rowId:       r.rowId || r.id || '',
                                title:       r.title || '',
                                description: r.description || '',
                        })),
                })),
        };

        // Hapus field undefined agar tidak error di proto
        if (!listPayload.title)  delete listPayload.title;
        if (!listPayload.footer) delete listPayload.footer;

        await hisoka.sendMessage(jid, listPayload, { quoted: m });
}

function makeInteractiveMsg({ loadConfig, tolak }) {

        /**
         * listbut2 — kirim menu list pilihan (dipakai di fitur menu, dsb.)
         * listnye format: { title, sections: [{title, rows:[{id,title,description}]}] }
         */
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

        /**
         * sendConfirmWithButtons — kirim pesan konfirmasi dengan pilihan tombol.
         * buttons: [{ text, id }]
         * Menggunakan listMessage agar muncul di WA Mobile & WA Web.
         * Respons: m.text === button.id
         */
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

        /**
         * sendAudioWithButtons — kirim audio lalu list pilihan aksi.
         * rows: [{ id, title, description }]
         * opts.sections override rows jika ada.
         * Menggunakan listMessage agar muncul di WA Mobile & WA Web.
         * Respons: m.text === row.id
         */
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
