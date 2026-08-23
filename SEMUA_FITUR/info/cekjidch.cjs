/**
 * cekjidch.cjs — Cek JID channel/saluran WhatsApp
 *
 * Sumber ID:
 *   .cekjidch https://whatsapp.com/channel/0029...
 *   .cekjidch di dalam channel
 */
'use strict';

const CHANNEL_LINK_RE = /https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9._-]+)/i;
const CHANNEL_JID_RE = /^([0-9]+(?:\.[0-9]+)?)@newsletter$/i;

function extractChannelJid(input, currentJid = '') {
        const current = String(currentJid || '').trim();
        if (CHANNEL_JID_RE.test(current)) return current;

        const text = String(input || '').trim();
        const match = text.match(CHANNEL_LINK_RE);
        if (!match) return null;

        // Link invite memakai invite token, bukan JID. Metadata API akan
        // mengubah token ini menjadi JID channel yang sebenarnya.
        return { inviteCode: match[1] };
}

function formatChannelInfo(meta, jid) {
        const name = meta?.name || meta?.subject || '(tanpa nama)';
        const description = String(meta?.description || '').trim();
        const subscribers = Number(meta?.subscribers || meta?.subscribersCount || 0);
        let text = `╭══ 📢 *INFO CHANNEL* ══╮\n│\n`;
        text += `│ 📛 *Nama :* ${name}\n`;
        text += `│ 🆔 *JID  :* \`${jid}\`\n`;
        if (subscribers > 0) text += `│ 👥 *Pengikut :* ${subscribers}\n`;
        if (description) text += `│ 📝 *Deskripsi :* ${description}\n`;
        text += `│\n╰════════════════════╯`;
        return text;
}

async function resolveChannel(input, currentJid, hisoka) {
        const extracted = extractChannelJid(input, currentJid);
        if (!extracted) throw new Error('INVALID_CHANNEL_TARGET');
        if (typeof extracted === 'string') {
                const meta = await hisoka.newsletterMetadata('jid', extracted);
                return { jid: extracted, meta };
        }
        const meta = await hisoka.newsletterMetadata('invite', extracted.inviteCode);
        const jid = meta?.id || meta?.jid;
        if (!jid || !CHANNEL_JID_RE.test(jid)) throw new Error('CHANNEL_NOT_FOUND');
        return { jid, meta };
}

async function handleCekjidch({ hisoka, m, query, tolak, logCommand, Button }) {
        try {
                const { jid, meta } = await resolveChannel(query, m.from, hisoka);
                const body = formatChannelInfo(meta, jid);
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