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
 *  hidetag.cjs — Hide tag command handler
 *  Perintah .hidetag untuk mention tersembunyi ke seluruh anggota grup
 * ───────────────────────────────
 */
'use strict';

async function handleHidetag({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer }) {
        if (!m.isOwner) return;
        if (!m.isGroup) return;

        if (!query) return tolak(hisoka, m,
                '❌ *Wajib isi teks/caption!*\n\n' +
                '📌 *Cara pakai:*\n' +
                '• `.hidetag Halo semua!`\n' +
                '• Kirim gambar/video dengan caption `.hidetag Teks kamu`\n' +
                '• Quote gambar/video lalu ketik `.hidetag Teks kamu`'
        );

        const group = hisoka.groups.read(m.from);
        if (!group) return tolak(hisoka, m, '❌ Data grup tidak ditemukan.');

        const participants = (group.participants || [])
                .map(v => v.phoneNumber || v.id)
                .filter(Boolean);

        if (!participants.length) return tolak(hisoka, m, '❌ Tidak ada member yang ditemukan.');

        const htMediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];

        let htBuffer = null;
        let htMediaType = null;

        if (m.isMedia && htMediaTypes.includes(m.type)) {
                try { htBuffer = await m.downloadMedia(); htMediaType = m.type; } catch (_) {}
        } else if (m.isQuoted && m.quoted?.isMedia && htMediaTypes.includes(m.quoted?.type)) {
                try { htBuffer = await getQuotedMediaBuffer(hisoka, m); htMediaType = m.quoted.type; } catch (_) {}
        }

        let htPayload;
        if (htBuffer && htBuffer.length > 0 && htMediaType) {
                if (htMediaType === 'imageMessage') {
                        htPayload = { image: htBuffer, caption: query, mentions: participants };
                } else if (htMediaType === 'videoMessage') {
                        htPayload = { video: htBuffer, caption: query, mentions: participants };
                } else if (htMediaType === 'audioMessage') {
                        htPayload = { audio: htBuffer, mentions: participants, mimetype: 'audio/mp4' };
                } else {
                        htPayload = { document: htBuffer, caption: query, mentions: participants, mimetype: 'application/octet-stream' };
                }
        } else {
                htPayload = { text: query, mentions: participants };
        }

        await hisoka.sendMessage(m.from, htPayload, { quoted: m });
        logCommand(m, hisoka, 'hidetag');
}

module.exports = { handleHidetag };
