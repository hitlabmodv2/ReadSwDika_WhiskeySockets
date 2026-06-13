'use strict';

/**
 * Ambil & format info grup secara realtime
 * Mengembalikan object: { teks, namaGrup, jidGrup, totalMember, totalAdmin, admins }
 */
async function getGCInfo(hisoka, groupJid) {
        const meta = await hisoka.groupMetadata(groupJid);

        const namaGrup   = meta?.subject || groupJid;
        const deskripsi  = meta?.desc || '';
        const jidGrup    = groupJid;
        const participants = meta?.participants || [];
        const totalMember  = participants.length;

        const admins = participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => {
                        const rawJid = p.id || p.jid || '';
                        const isSuper = p.admin === 'superadmin';
                        let nomor = rawJid.split('@')[0].split(':')[0];
                        // Resolve LID kalau ada
                        if (rawJid.endsWith('@lid') && global.__lookupLidPn) {
                                const resolved = global.__lookupLidPn(rawJid);
                                if (resolved) nomor = resolved.split('@')[0].split(':')[0];
                        }
                        return { nomor, isSuper };
                });

        const totalAdmin = admins.length;

        // Format teks info
        let teks = '';
        teks += `╭══ 🏠 *INFO GRUP* ══╮\n`;
        teks += `│\n`;
        teks += `│ 📛 *Nama   :* ${namaGrup}\n`;
        teks += `│ 🆔 *JID    :* \`${jidGrup}\`\n`;
        teks += `│ 👥 *Member :* ${totalMember} orang\n`;
        teks += `│\n`;
        teks += `╰════════════════════╯`;

        return { teks, namaGrup, jidGrup, totalMember, totalAdmin, admins };
}

module.exports = { getGCInfo };
