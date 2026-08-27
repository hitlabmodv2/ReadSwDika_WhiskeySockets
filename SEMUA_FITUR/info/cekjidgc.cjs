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
 *  cekjidgc.cjs — Cek JID satu grup WhatsApp
 *  Ambil Jabber ID grup untuk keperluan config/debug
 * ───────────────────────────────
 */
'use strict';

/**
 * Ambil & format info grup secara realtime
 * Mengembalikan object: { teks, namaGrup, jidGrup, totalMember, totalAdmin, admins }
 */
async function getGCInfo(hisoka, groupJid) {
        const meta = await hisoka.groupMetadata(groupJid);

        const namaGrup   = String(
                meta?.subject ||
                meta?.name ||
                meta?.groupName ||
                '(nama grup tidak tersedia)'
        ).trim();
        const deskripsi  = meta?.desc || '';
        const jidGrup    = groupJid;
        const participants = meta?.participants || [];
        // groupMetadata() mengambil data terbaru dari WhatsApp. Gunakan
        // jumlah participants sebagai sumber realtime, dengan size sebagai
        // fallback bila respons hanya berisi ringkasan metadata.
        const totalMember  = participants.length || Number(meta?.size) || 0;

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
        teks += `🏠 *INFO GRUP*\n\n`;
        teks += `📛 *Nama:* _${namaGrup}_\n`;
        teks += `🆔 *JID:* \`${jidGrup}\`\n`;
        teks += `👥 *Total pengikut:* \`${totalMember}\` orang\n\n`;
        teks += `> _Data diambil langsung dari metadata grup saat perintah dijalankan._`;

        return { teks, namaGrup, jidGrup, totalMember, totalAdmin, admins };
}

async function handleCekjidgc({ hisoka, m, tolak, logCommand, Button }) {
        if (!m.isGroup) return tolak(hisoka, m, '❌ Perintah ini hanya bisa dipakai di dalam grup!');
        let cjgMeta;
        try {
                cjgMeta = await getGCInfo(hisoka, m.from);
        } catch (err) {
                return tolak(hisoka, m, '❌ Gagal ambil info grup: ' + (err.message || 'Unknown error'));
        }
        const { teks, jidGrup } = cjgMeta;
        await new Button()
                .setTitle('🏠 Info Grup')
                .setBody(teks)
                .setFooter('Tap tombol di bawah untuk copy JID')
                .addCopy('📋 Copy JID Grup', jidGrup, 'copy_jidgc')
                .run(m.from, hisoka, m);
        logCommand(m, hisoka, 'cekjidgc');
}

module.exports = { getGCInfo, handleCekjidgc };
