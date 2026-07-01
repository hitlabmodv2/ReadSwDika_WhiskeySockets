'use strict';

/**
 * emoji-msgmap.cjs — Shared map untuk auto-delete pesan emoji
 * Dipakai oleh info.cjs (.emoji, .emojilist) dan emoji-cmd.cjs (.emojicustom, .emojidefault, .emojiclear)
 * Satu map untuk semua command, sehingga saat pilih button antar command, pesan lama selalu terhapus
 */

const _map = new Map();

async function emojiDeleteLast(hisoka, jid) {
	const key = _map.get(jid);
	if (!key) return;
	try { await hisoka.sendMessage(jid, { delete: key }); } catch (_) {}
	_map.delete(jid);
}

function emojiSaveLast(jid, key) {
	_map.set(jid, key);
}

module.exports = { emojiDeleteLast, emojiSaveLast };
