/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
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
