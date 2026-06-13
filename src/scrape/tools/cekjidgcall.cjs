'use strict';

/**
 * Fetch semua grup yang diikuti bot + format jadi chunks teks
 * Return: { chunks: string[], total: number }
 */
async function getAllGCInfo(hisoka) {
        const allGroupsObj = await hisoka.groupFetchAllParticipating();
        if (!allGroupsObj || typeof allGroupsObj !== 'object') {
                throw new Error('Gagal fetch daftar grup dari server');
        }

        const groups = Object.values(allGroupsObj)
                .filter(g => g && g.id && g.id.endsWith('@g.us'))
                .sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));

        const total = groups.length;
        if (total === 0) throw new Error('BOT_NOT_IN_ANY_GROUP');

        // Header
        const header = `╭══ 🏠 *SEMUA JID GRUP BOT* ══╮\n│ 📊 Total: *${total} grup*\n╰══════════════════════════╯\n`;

        // Build lines per grup
        const lines = groups.map((g, i) => {
                const nama  = g.subject || '(tanpa nama)';
                const jid   = g.id;
                const count = Array.isArray(g.participants) ? g.participants.length : '?';
                return `*${i + 1}. ${nama}*\n🆔 \`${jid}\`\n👥 ${count} member`;
        });

        // Split jadi chunks max ~3500 char supaya gak dipotong WA
        const MAX = 3500;
        const chunks = [];
        let current = header;

        for (let i = 0; i < lines.length; i++) {
                const line = lines[i] + '\n\n';
                if ((current + line).length > MAX && current !== header) {
                        chunks.push(current.trimEnd());
                        current = line;
                } else {
                        current += line;
                }
        }
        if (current.trim()) chunks.push(current.trimEnd());

        return { chunks, total };
}

module.exports = { getAllGCInfo };
