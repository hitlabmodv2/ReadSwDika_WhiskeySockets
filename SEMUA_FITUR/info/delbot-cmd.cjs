/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  delbot-cmd.cjs — Bulk delete semua pesan bot di satu chat
 *  Perintah .delbot untuk hapus semua pesan bot sendiri di chat aktif
 *  Tiap session (bot utama / jadibot) terisolasi, tidak bentrok
 * ───────────────────────────────
 */
'use strict';

async function handleDelbot({ hisoka, m, query, tolak, logCommand, kvGet, kvSet }) {
        if (!m.prefix && m.query) return;

        // Ambil session key: nomor HP bot (unik per session, tidak bentrok antar jadibot)
        const _sessKey = hisoka.user?.id?.split(':')[0] || 'hisoka';
        const _store   = kvGet(`msgkeys/${_sessKey}`, {});

        // Filter hanya pesan bot di chat ini (remoteJid = m.from)
        const _keys = Object.values(_store).filter(v => v.remoteJid === m.from);

        if (_keys.length === 0) {
                await tolak(hisoka, m, [
                        '⚠️ *Tidak ada data pesan bot* yang tersimpan di chat ini.',
                        '',
                        '_Data mulai tersimpan sejak fitur ini aktif._',
                        '_Semakin banyak bot ngobrol, semakin banyak yang bisa dihapus._',
                ].join('\n'));
                return;
        }

        // Kirim pesan status awal
        let _statusKey = null;
        try {
                const _statusMsg = await hisoka.sendMessage(m.from, {
                        text: `⏳ Menghapus *${_keys.length}* pesan bot di chat ini...`,
                });
                _statusKey = _statusMsg?.key || null;
        } catch (_) {}

        let successCount = 0;
        let failCount    = 0;

        for (const keyData of _keys) {
                try {
                        const deleteKey = {
                                remoteJid: keyData.remoteJid,
                                fromMe   : true,
                                id       : keyData.id,
                                ...(keyData.participant ? { participant: keyData.participant } : {}),
                        };
                        await hisoka.sendMessage(m.from, { delete: deleteKey });
                        successCount++;
                } catch (_) {
                        failCount++;
                }
                // Jeda kecil agar tidak flood WA server
                await new Promise(r => setTimeout(r, 120));
        }

        // Hapus entry yang sudah diproses dari persistent store
        const _freshStore = kvGet(`msgkeys/${_sessKey}`, {});
        for (const keyData of _keys) delete _freshStore[keyData.id];
        kvSet(`msgkeys/${_sessKey}`, _freshStore);

        // Hapus pesan status + pesan .delbot milik user (silent)
        if (_statusKey) {
                try { await hisoka.sendMessage(m.from, { delete: _statusKey }); } catch (_) {}
        }
        try { await hisoka.sendMessage(m.from, { delete: m.key }); } catch (_) {}

        // Laporan akhir kalau ada yang gagal
        if (failCount > 0) {
                await hisoka.sendMessage(m.from, {
                        text: [
                                `╭═══『 *DELBOT* 』═══╮`,
                                `│ ✅ Terhapus : *${successCount}* pesan`,
                                `│ ❌ Gagal    : *${failCount}* pesan`,
                                `│`,
                                `│ _Pesan gagal mungkin sudah terlalu_`,
                                `│ _lama atau sudah dihapus sebelumnya._`,
                                `╰═════════════════╯`,
                        ].join('\n'),
                });
        }

        logCommand(m, hisoka, 'delbot');
}

module.exports = { handleDelbot };
