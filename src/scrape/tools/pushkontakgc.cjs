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
async function pushKontakGC(hisoka, { targetGid, pesanKirim, delayDetik, mediaBuffer, mediaType, onStart, onDone }) {
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
                                // Kirim media (gambar/video) + caption
                                if (mediaType === 'imageMessage') {
                                        await hisoka.sendMessage(jid, { image: mediaBuffer, caption: pesanKirim });
                                } else if (mediaType === 'videoMessage') {
                                        await hisoka.sendMessage(jid, { video: mediaBuffer, caption: pesanKirim });
                                } else {
                                        await hisoka.sendMessage(jid, { document: mediaBuffer, caption: pesanKirim, mimetype: 'application/octet-stream' });
                                }
                        } else {
                                // Kirim teks via relayMessage (no AI badge)
                                const waMsg = generateWAMessageFromContent(jid, {
                                        conversation: pesanKirim
                                }, { userJid: hisoka.user?.id });
                                await hisoka.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
                        }
                        berhasil++;
                } catch (_) {
                        gagal++;
                }

                await new Promise(res => setTimeout(res, delayDetik * 1000));
        }

        if (onDone) await onDone({ namaGrup, berhasil, gagal, delayDetik, modeMedia });

        return { namaGrup, berhasil, gagal };
}

module.exports = { pushKontakGC, getMemberList };
