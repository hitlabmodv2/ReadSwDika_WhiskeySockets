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
 *  pushkontakgc.cjs — Push kontak ke grup WA
 *  Kirim vCard kontak massal via generateWAMessageFromContent
 * ───────────────────────────────
 */
'use strict';

const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');

/**
 * Ambil daftar member dari grup, resolve LID ke nomor asli kalau bisa
 */
async function getMemberList(hisoka, targetGid) {
        const meta = await hisoka.groupMetadata(targetGid);
        const members = (meta?.participants || [])
                .map(p => {
                        const rawJid = p.id || p.jid || '';
                        if (!rawJid) return null;
                        if (rawJid.endsWith('@lid')) {
                                const resolved = global.__lookupLidPn ? global.__lookupLidPn(rawJid) : null;
                                if (resolved) return resolved.endsWith('@s.whatsapp.net') ? resolved : resolved.split('@')[0] + '@s.whatsapp.net';
                                return rawJid;
                        }
                        return rawJid.endsWith('@s.whatsapp.net') ? rawJid : rawJid.split('@')[0] + '@s.whatsapp.net';
                })
                .filter(Boolean);
        return { meta, members };
}

/**
 * Kirim pesan (teks / gambar / video) ke semua member grup secara private
 * - Teks: pakai relayMessage → tidak ada badge AI
 * - Media: pakai sendMessage → support gambar & video + caption
 * - Delay tetap (dipilih user, 3–10 detik)
 */
function makeBar(done, total, len = 10) {
        const filled = Math.round((done / total) * len);
        return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + ']';
}

async function pushKontakGC(hisoka, { targetGid, pesanKirim, delayDetik, mediaBuffer, mediaType, onStart, onProgress, onDone }) {
        // Proses \\n\\n (double) dulu sebelum \\n (single) biar tidak dobel replace
        // \\n  → 2 newline asli = 1 baris kosong
        // \\n\\n → 3 newline asli = 2 baris kosong
        pesanKirim = (pesanKirim || '')
                .replace(/\\n\\n/g, '\n\n\n')
                .replace(/\\n/g, '\n\n');

        const modeMedia = !!(mediaBuffer && mediaBuffer.length > 0);
        console.log(`[PushKontakGC] Mode: ${modeMedia ? mediaType : 'text'}`);
        if (!modeMedia) {
                console.log('[PushKontakGC] Preview pesan:\n' + pesanKirim.replace(/\n/g, '↵'));
        }

        const { meta, members } = await getMemberList(hisoka, targetGid);
        const namaGrup = meta?.subject || targetGid;
        const botJid = (hisoka.user?.id || '').split(':')[0] + '@s.whatsapp.net';

        if (!members.length) throw new Error('EMPTY_MEMBER');

        if (onStart) await onStart({ namaGrup, total: members.length, modeMedia, mediaType });

        let berhasil = 0;
        let gagal = 0;

        for (const jid of members) {
                const numOnly = jid.split('@')[0];
                if (numOnly === botJid.split('@')[0]) continue;

                try {
                        if (modeMedia) {
                                if (mediaType === 'imageMessage') {
                                        await hisoka.sendMessage(jid, { image: mediaBuffer, caption: pesanKirim });
                                } else if (mediaType === 'videoMessage') {
                                        await hisoka.sendMessage(jid, { video: mediaBuffer, caption: pesanKirim });
                                } else {
                                        await hisoka.sendMessage(jid, { document: mediaBuffer, caption: pesanKirim, mimetype: 'application/octet-stream' });
                                }
                        } else {
                                const waMsg = generateWAMessageFromContent(jid, {
                                        conversation: pesanKirim
                                }, { userJid: hisoka.user?.id });
                                await hisoka.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
                        }
                        berhasil++;
                } catch (_) {
                        gagal++;
                }

                const sent = berhasil + gagal;
                if (onProgress) {
                        try { await onProgress({ sent, total: members.length, berhasil, gagal, namaGrup, modeMedia }); } catch (_) {}
                }

                await new Promise(res => setTimeout(res, delayDetik * 1000));
        }

        if (onDone) await onDone({ namaGrup, berhasil, gagal, delayDetik, modeMedia });

        return { namaGrup, berhasil, gagal };
}

module.exports = { pushKontakGC, getMemberList };

// ── HANDLER: pushkontakgc ─────────────────────────────────────────────────────

async function handlePushkontakgc({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

        if (!query || !query.includes('|')) return tolak(hisoka, m,
                '❌ *Format salah!*\n\n' +
                '📌 *Cara pakai (teks):*\n' +
                '`.pushkontakgc <JID> | <pesan> | <delay>`\n\n' +
                '🖼️ *Cara pakai (gambar/video):*\n' +
                '_Kirim/reply gambar dengan caption:_\n' +
                '`.pushkontakgc <JID> | <caption> | <delay>`\n' +
                '_Caption boleh kosong jika tidak perlu_\n\n' +
                '📝 *Contoh teks:*\n' +
                '`.pushkontakgc 120363192554714254@g.us | Halo kak! | 5`\n\n' +
                '⏱ *Delay:* pilih 3–10 detik\n\n' +
                '↩️ *Garis baru dalam pesan:*\n' +
                '• `\\n` = 1 baris kosong\n' +
                '_Contoh:_ `.pushkontakgc 120363192554714254@g.us | Halo kak!\\nLagi apa nih? | 5`\n\n' +
                '• `\\n\\n` = 2 baris kosong\n' +
                '_Contoh:_ `.pushkontakgc 120363192554714254@g.us | Halo kak!\\n\\nLagi apa nih? | 5`\n\n' +
                '💡 *Bisa dipakai dari mana saja:*\n' +
                '• Di dalam grup target langsung\n' +
                '• Di grup lain (asal JID target benar)\n' +
                '• Di chat private bot\n\n' +
                '🔍 *Belum tahu JID grupnya?*\n' +
                '• Ketik `.cekjidgc` — di dalam grup untuk lihat JID grup tersebut\n' +
                '• Ketik `.cekjidgcall` — untuk lihat semua JID grup yang diikuti bot'
        );

        const pkgParts = query.split('|');
        const pkgTargetGid = pkgParts[0].trim();
        const pkgPesan = (pkgParts[1] || '').trim();
        const pkgDelayInput = parseInt((pkgParts[2] || '').trim());
        const pkgDelay = (!isNaN(pkgDelayInput) && pkgDelayInput >= 3 && pkgDelayInput <= 10) ? pkgDelayInput : null;

        const pkgMediaTypes = ['imageMessage', 'videoMessage'];
        let pkgMediaBuffer = null;
        let pkgMediaType = null;

        if (m.isMedia && pkgMediaTypes.includes(m.type)) {
                try { pkgMediaBuffer = await m.downloadMedia(); pkgMediaType = m.type; } catch (_) {}
        } else if (m.isQuoted && m.quoted?.isMedia && pkgMediaTypes.includes(m.quoted?.type)) {
                try { pkgMediaBuffer = await getQuotedMediaBuffer(hisoka, m); pkgMediaType = m.quoted.type; } catch (_) {}
        }

        const pkgAdaMedia = !!(pkgMediaBuffer && pkgMediaBuffer.length > 0);

        if (!pkgTargetGid || !pkgTargetGid.endsWith('@g.us')) return tolak(hisoka, m,
                '❌ *JID grup tidak valid!*\n\n' +
                '_Contoh format yang benar:_\n`120363192554714254@g.us`\n\n' +
                '🔍 *Cara cari JID:*\n' +
                '• `.cekjidgc` — ketik di dalam grup yang dituju\n' +
                '• `.cekjidgcall` — tampilkan semua JID grup bot sekaligus'
        );
        if (!pkgAdaMedia && !pkgPesan) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
        if (pkgParts.length < 3 || pkgDelay === null) return tolak(hisoka, m,
                '❌ *Delay tidak valid!*\n\n⏱ Masukkan delay antara *3–10 detik*\n\n📝 *Contoh:*\n`.pushkontakgc 120363192554714254@g.us | Halo kak! | 5`'
        );

        try {
                let pkgProgMsg = null;
                await pushKontakGC(hisoka, {
                        targetGid: pkgTargetGid,
                        pesanKirim: pkgPesan,
                        delayDetik: pkgDelay,
                        mediaBuffer: pkgMediaBuffer,
                        mediaType: pkgMediaType,
                        onStart: async ({ namaGrup, total, modeMedia, mediaType: mt }) => {
                                pkgProgMsg = await m.reply(
                                        `⏳ *Push Kontak GC dimulai...*\n\n` +
                                        `👥 *Grup :* ${namaGrup}\n` +
                                        `📋 *Total :* ${total} orang\n` +
                                        `📤 *Mode :* ${modeMedia ? (mt === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video') : '💬 Teks'}\n` +
                                        `⏱ *Delay :* ${pkgDelay} detik/pesan\n\n` +
                                        `_Sedang mengirim ke semua member..._`
                                );
                        },
                        onProgress: async ({ sent, total, berhasil, gagal, namaGrup: ng, modeMedia: mm }) => {
                                if (!pkgProgMsg?.key) return;
                                const filled = Math.round((sent / total) * 10);
                                const bar = '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']';
                                const pct = Math.round((sent / total) * 100);
                                try {
                                        await m.reply({
                                                edit: pkgProgMsg.key,
                                                text:
                                                        `📤 *Push Kontak GC — Mengirim...*\n\n` +
                                                        `👥 *Grup :* ${ng}\n` +
                                                        `📊 *Progress :* ${bar} ${pct}%\n` +
                                                        `📬 *Terkirim :* ${sent}/${total} orang\n` +
                                                        `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                                        `📤 *Mode :* ${mm ? '🖼️ Media' : '💬 Teks'}\n\n` +
                                                        `_Harap tunggu..._`
                                        });
                                } catch (_) {}
                        },
                        onDone: async ({ namaGrup, berhasil, gagal, delayDetik: dd, modeMedia }) => {
                                const doneText =
                                        `✅ *Push Kontak GC selesai!*\n\n` +
                                        `👥 *Grup :* ${namaGrup}\n` +
                                        `📤 *Mode :* ${modeMedia ? '🖼️ Media' : '💬 Teks'}\n` +
                                        `⏱ *Delay :* ${dd} detik/pesan\n` +
                                        `✔️ *Berhasil :* ${berhasil} orang\n` +
                                        `❌ *Gagal :* ${gagal} orang`;
                                if (pkgProgMsg?.key) {
                                        await m.reply({ edit: pkgProgMsg.key, text: doneText });
                                } else {
                                        await m.reply(doneText);
                                }
                        }
                });
        } catch (err) {
                await tolak(hisoka, m,
                        err.message === 'EMPTY_MEMBER'
                                ? `❌ *Grup tidak memiliki member atau gagal ambil data member.*\n\nPastikan bot masih ada di grup tersebut.`
                                : `❌ Terjadi error: ${err.message}`
                );
                return;
        }

        logCommand(m, hisoka, 'pushkontakgc');
}

module.exports.handlePushkontakgc = handlePushkontakgc;
