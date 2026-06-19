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
 *  cekjidgcall.cjs — Ambil semua JID grup bot
 *  List JID semua grup yang diikuti bot saat ini
 * ───────────────────────────────
 */
'use strict';

/**
 * Fetch semua grup yang diikuti bot, return sorted by member count (terbanyak di atas)
 * Return: { groups: [{nama, jid, count}], total }
 */
async function getAllGCInfo(hisoka) {
        const allGroupsObj = await hisoka.groupFetchAllParticipating();
        if (!allGroupsObj || typeof allGroupsObj !== 'object') {
                throw new Error('Gagal fetch daftar grup dari server');
        }

        const groups = Object.values(allGroupsObj)
                .filter(g => g && g.id && g.id.endsWith('@g.us'))
                .sort((a, b) => {
                        const countB = Array.isArray(b.participants) ? b.participants.length : 0;
                        const countA = Array.isArray(a.participants) ? a.participants.length : 0;
                        return countB - countA;
                })
                .map(g => ({
                        nama:  g.subject || '(tanpa nama)',
                        jid:   g.id,
                        count: Array.isArray(g.participants) ? g.participants.length : 0
                }));

        const total = groups.length;
        if (total === 0) throw new Error('BOT_NOT_IN_ANY_GROUP');

        return { groups, total };
}

module.exports = { getAllGCInfo };

// ── HANDLER: alljidgc ─────────────────────────────────────────────────────────

async function handleAlljidgc({ hisoka, m, tolak, logCommand, Button }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk owner bot.');

        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

        let cjgaResult;
        try {
                cjgaResult = await getAllGCInfo(hisoka);
        } catch (err) {
                if (err.message === 'BOT_NOT_IN_ANY_GROUP') return tolak(hisoka, m, '❌ Bot tidak tergabung di grup manapun saat ini.');
                return tolak(hisoka, m, '❌ Gagal fetch daftar grup: ' + (err.message || 'Unknown error'));
        }

        const { groups, total } = cjgaResult;

        const SEP = '─────────────────────────────';
        let bodyText = `╭══ 🏠 *SEMUA JID GRUP BOT* ══╮\n│ 📊 Total: *${total} grup* | Urutan: member terbanyak\n╰══════════════════════════╯\n\n`;
        const copyLines = [];

        for (let i = 0; i < groups.length; i++) {
                const { nama, jid, count } = groups[i];
                bodyText += `*${i + 1}. ${nama}*\n🆔 \`${jid}\`\n👥 ${count} member\n${SEP}\n`;
                copyLines.push(`${i + 1}. ${nama}\n🆔 ${jid}\n👥 ${count} member\n${SEP}`);
        }

        const copyCode = copyLines.join('\n');

        await new Button()
                .setTitle('🏠 Semua JID Grup Bot')
                .setBody(bodyText.trimEnd())
                .setFooter(`Total ${total} grup • Tap tombol untuk copy semua JID`)
                .addCopy('📋 Copy Semua JID', copyCode, 'copy_all_jidgc')
                .run(m.from, hisoka, m);

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        logCommand(m, hisoka, 'cekjidgcall');
}

module.exports.handleAlljidgc = handleAlljidgc;
