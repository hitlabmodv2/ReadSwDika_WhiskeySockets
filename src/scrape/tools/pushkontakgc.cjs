'use strict';

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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
 * Kirim pesan ke semua member grup secara private
 * - Pakai relayMessage agar tidak ada badge AI
 * - Delay tetap (dipilih user, 3–10 detik)
 */
async function pushKontakGC(hisoka, { targetGid, pesanKirim, delayDetik, onStart, onDone }) {
        const { meta, members } = await getMemberList(hisoka, targetGid);
        const namaGrup = meta?.subject || targetGid;
        const botJid = (hisoka.user?.id || '').split(':')[0] + '@s.whatsapp.net';

        if (!members.length) throw new Error('EMPTY_MEMBER');

        if (onStart) await onStart({ namaGrup, total: members.length });

        let berhasil = 0;
        let gagal = 0;

        for (const jid of members) {
                const numOnly = jid.split('@')[0];
                if (numOnly === botJid.split('@')[0]) continue;

                try {
                        const waMsg = generateWAMessageFromContent(jid, {
                                conversation: pesanKirim
                        }, { userJid: hisoka.user?.id });
                        await hisoka.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
                        berhasil++;
                } catch (_) {
                        gagal++;
                }

                await new Promise(res => setTimeout(res, delayDetik * 1000));
        }

        if (onDone) await onDone({ namaGrup, berhasil, gagal, delayDetik });

        return { namaGrup, berhasil, gagal };
}

module.exports = { pushKontakGC, getMemberList };
