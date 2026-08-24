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
 *  cekjidch.cjs — Cek JID channel/saluran WhatsApp
 *  Ambil informasi channel secara realtime
 *
 *  Sumber ID:
 *    .cekjidch https://whatsapp.com/channel/0029...
 *    .cekjidch di dalam channel
 * ───────────────────────────────
 */
'use strict';

// Kode invite channel WhatsApp terdiri dari karakter alfanumerik.
// Membatasi capture di sini mencegah "_", titik, atau tanda baca akhir
// ikut dianggap bagian dari link saat teks memakai format WhatsApp.
const CHANNEL_LINK_RE = /https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9]+)/i;
const CHANNEL_JID_RE = /^([0-9]+(?:\.[0-9]+)?)@newsletter$/i;

function extractChannelJid(input, currentJid = '') {
        const current = String(currentJid || '').trim();
        if (CHANNEL_JID_RE.test(current)) return current;

        const text = String(input || '').trim();
        const match = text.match(CHANNEL_LINK_RE);
        if (!match) return null;

        // Link invite memakai invite token, bukan JID.
        return { inviteCode: match[1] };
}

function firstText(...values) {
        for (const value of values) {
                const text = typeof value === 'object' && value !== null
                        ? (value.text || value.value || '')
                        : value;
                if (String(text || '').trim()) return String(text).trim();
        }
        return '';
}

function firstNumber(...values) {
        for (const value of values) {
                if (value === null || value === undefined || value === '') continue;
                const number = Number(value);
                if (Number.isFinite(number) && number >= 0) return number;
        }
        return 0;
}

function formatChannelInfo(meta, jid, inviteCode = '') {
        const thread = meta?.thread_metadata || meta?.threadMetadata || {};
        const name = firstText(
                meta?.name,
                meta?.subject,
                thread?.name,
                thread?.subject
        ) || '(nama channel tidak tersedia)';
        const description = firstText(meta?.description, thread?.description);
        const subscribers = firstNumber(
                meta?.subscribers,
                meta?.subscribersCount,
                meta?.subscribers_count,
                thread?.subscribers,
                thread?.subscribersCount,
                thread?.subscribers_count
        );
        let text = `📢 *INFO CHANNEL*\n\n`;
        text += `📛 *Nama:* _${name}_\n`;
        text += `🆔 *JID:* \`${jid}\`\n`;
        text += `👥 *Total pengikut:* \`${subscribers}\` orang`;
        if (description) text += `\n📝 *Deskripsi:* _${description}_`;
        if (inviteCode) {
                text += `\n🔗 *Link channel:* https://whatsapp.com/channel/${inviteCode}`;
        }
        text += `\n\n> Data diambil realtime dari metadata WhatsApp.`;
        return text;
}

async function resolveChannel(input, currentJid, hisoka) {
        const extracted = extractChannelJid(input, currentJid);
        if (!extracted) throw new Error('INVALID_CHANNEL_TARGET');
        if (typeof extracted === 'string') {
                const meta = await hisoka.newsletterMetadata('jid', extracted);
                const inviteCode = String(meta?.invite || '')
                        .replace(/^https?:\/\/(?:www\.)?whatsapp\.com\/channel\//i, '')
                        .match(/^[A-Za-z0-9]+/)?.[0] || '';
                return { jid: extracted, meta, inviteCode };
        }
        const meta = await hisoka.newsletterMetadata('invite', extracted.inviteCode);
        const jid = meta?.id || meta?.jid;
        if (!jid || !CHANNEL_JID_RE.test(jid)) throw new Error('CHANNEL_NOT_FOUND');
        return { jid, meta, inviteCode: extracted.inviteCode };
}

async function handleCekjidch({ hisoka, m, query, tolak, logCommand, Button }) {
        try {
                const { jid, meta, inviteCode } = await resolveChannel(query, m.from, hisoka);
                const body = formatChannelInfo(meta, jid, inviteCode);
                if (Button) {
                        await new Button()
                                .setTitle('📢 Info Channel')
                                .setBody(body)
                                .setFooter('Tap tombol di bawah untuk copy JID')
                                .addCopy('📋 Copy JID Channel', jid, 'copy_jidch')
                                .run(m.from, hisoka, m);
                } else {
                        await hisoka.sendMessage(m.from, { text: body }, { quoted: m });
                }
                try { await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } }); } catch (_) {}
                logCommand(m, hisoka, 'cekjidch');
        } catch (err) {
                const message = err?.message === 'INVALID_CHANNEL_TARGET'
                        ? '❌ Kirim link channel WhatsApp atau jalankan perintah ini langsung di dalam channel.'
                        : '❌ Gagal mengambil info channel. Pastikan link masih valid dan channel dapat diakses bot.';
                return tolak(hisoka, m, message);
        }
}

module.exports = { extractChannelJid, resolveChannel, formatChannelInfo, handleCekjidch };