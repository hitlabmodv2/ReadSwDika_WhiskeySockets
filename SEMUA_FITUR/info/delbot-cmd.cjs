/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  delbot-cmd.cjs — Bulk delete semua pesan bot di satu chat
 *  Sumber: persistent store + cacheMsg + WA history fetch
 *  Terisolasi per-session (bot utama & tiap jadibot masing-masing)
 * ───────────────────────────────
 */
'use strict';

/**
 * Ambil history pesan dari WA server via fetchMessageHistory.
 * Menggunakan referenceKey (misal key pesan .delbot) sebagai titik awal.
 * Hasilnya datang async via event 'messaging-history.set'.
 * Terisolasi per-socket (hisoka) — no bentrok antar session.
 */
async function _fetchHistoryFromWA(hisoka, chatJid, referenceKey, count = 100) {
        return new Promise((resolve) => {
                const collected = [];
                const TIMEOUT_MS = 8000;

                const timer = setTimeout(() => {
                        hisoka.ev.off('messaging-history.set', handler);
                        resolve(collected);
                }, TIMEOUT_MS);

                const handler = ({ messages }) => {
                        if (!Array.isArray(messages)) return;
                        for (const msg of messages) {
                                // Filter: harus fromMe dan di chat yang sama
                                if (msg.key?.fromMe && msg.key?.remoteJid === chatJid) {
                                        collected.push({
                                                remoteJid  : msg.key.remoteJid,
                                                fromMe     : true,
                                                id         : msg.key.id,
                                                participant: msg.key.participant || null,
                                        });
                                }
                        }
                };

                hisoka.ev.on('messaging-history.set', handler);

                // Trigger WA server untuk kirim history sebelum referenceKey
                hisoka.fetchMessageHistory(count, referenceKey, Date.now()).catch(() => {
                        clearTimeout(timer);
                        hisoka.ev.off('messaging-history.set', handler);
                        resolve(collected);
                });
        });
}

async function handleDelbot({ hisoka, m, query, tolak, logCommand, kvGet, kvSet }) {
        if (!m.prefix && m.query) return;

        const _sessKey = hisoka.user?.id?.split(':')[0] || 'hisoka';
        const _chatJid = m.from;

        // ── 1. Kumpulkan dari persistent store ──────────────────────────────
        const _store   = kvGet(`msgkeys/${_sessKey}`, {});
        const _storeEntries = Object.values(_store).filter(v => v.remoteJid === _chatJid);

        // ── 2. Kumpulkan dari cacheMsg in-memory ────────────────────────────
        const _cacheEntries = [];
        if (hisoka.cacheMsg instanceof Map) {
                for (const [, msg] of hisoka.cacheMsg) {
                        if (msg.key?.fromMe && msg.key?.remoteJid === _chatJid && !_store[msg.key.id]) {
                                _cacheEntries.push({
                                        remoteJid  : msg.key.remoteJid,
                                        fromMe     : true,
                                        id         : msg.key.id,
                                        participant: msg.key.participant || null,
                                });
                        }
                }
        }

        // ── 3. Fetch history dari WA server ─────────────────────────────────
        // Pakai key pesan .delbot sebagai referensi (paling baru di chat)
        // WA akan kirim pesan SEBELUM referensi ini → semua history lama
        let _historyEntries = [];
        let _statusKey = null;

        try {
                const _statusMsg = await hisoka.sendMessage(_chatJid, {
                        text: '⏳ Mengambil riwayat pesan dari server WA...',
                });
                _statusKey = _statusMsg?.key || null;
        } catch (_) {}

        try {
                _historyEntries = await _fetchHistoryFromWA(hisoka, _chatJid, m.key, 100);
        } catch (_) {}

        // ── 4. Gabung + deduplikasi berdasarkan ID ───────────────────────────
        const _allById = {};
        for (const entry of [..._storeEntries, ..._cacheEntries, ..._historyEntries]) {
                if (entry?.id && !_allById[entry.id]) _allById[entry.id] = entry;
        }
        const _allKeys = Object.values(_allById);

        // Hapus pesan status fetch
        if (_statusKey) {
                try { await hisoka.sendMessage(_chatJid, { delete: _statusKey }); } catch (_) {}
        }

        if (_allKeys.length === 0) {
                await tolak(hisoka, m, [
                        '⚠️ *Tidak ada pesan bot* yang ditemukan di chat ini.',
                        '',
                        '_Kemungkinan:_',
                        '• _Pesan sudah sangat lama (WA tidak simpan history)_',
                        '• _Bot belum pernah kirim pesan di chat ini_',
                ].join('\n'));
                try { await hisoka.sendMessage(_chatJid, { delete: m.key }); } catch (_) {}
                return;
        }

        // ── 5. Update pesan status menjadi progress hapus ───────────────────
        let _progKey = null;
        try {
                const _progMsg = await hisoka.sendMessage(_chatJid, {
                        text: `🗑️ Menghapus *${_allKeys.length}* pesan bot...`,
                });
                _progKey = _progMsg?.key || null;
        } catch (_) {}

        // ── 6. Loop hapus ────────────────────────────────────────────────────
        let successCount = 0;
        let failCount    = 0;

        for (const entry of _allKeys) {
                try {
                        const deleteKey = {
                                remoteJid: entry.remoteJid,
                                fromMe   : true,
                                id       : entry.id,
                                ...(entry.participant ? { participant: entry.participant } : {}),
                        };
                        await hisoka.sendMessage(_chatJid, { delete: deleteKey });
                        successCount++;
                } catch (_) {
                        failCount++;
                }
                await new Promise(r => setTimeout(r, 120));
        }

        // ── 7. Hapus dari persistent store ──────────────────────────────────
        const _freshStore = kvGet(`msgkeys/${_sessKey}`, {});
        for (const entry of _allKeys) delete _freshStore[entry.id];
        kvSet(`msgkeys/${_sessKey}`, _freshStore);

        // ── 8. Hapus pesan progress + pesan .delbot ──────────────────────────
        if (_progKey) {
                try { await hisoka.sendMessage(_chatJid, { delete: _progKey }); } catch (_) {}
        }
        try { await hisoka.sendMessage(_chatJid, { delete: m.key }); } catch (_) {}

        // ── 9. Laporan akhir kalau ada yang gagal ────────────────────────────
        if (failCount > 0) {
                await hisoka.sendMessage(_chatJid, {
                        text: [
                                `╭═══『 *DELBOT* 』═══╮`,
                                `│ ✅ Terhapus : *${successCount}* pesan`,
                                `│ ❌ Gagal    : *${failCount}* pesan`,
                                `│`,
                                `│ _Gagal = sudah terlalu lama atau_`,
                                `│ _sudah dihapus sebelumnya._`,
                                `╰═════════════════╯`,
                        ].join('\n'),
                });
        }

        logCommand(m, hisoka, 'delbot');
}

module.exports = { handleDelbot };
