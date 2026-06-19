'use strict';

async function handleAd({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAntidel, setJadibotUserSetting }) {
	const _isJadibotUserCtx_adel = hisoka?.isMainBot === false && (() => {
		const _sn = (m.sender || '').split('@')[0].split(':')[0];
		const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
		return !!_jn && _sn === _jn;
	})();
	if (!m.isOwner && !_isJadibotUserCtx_adel) return;
	try {
		const isJadibot  = hisoka?.isMainBot === false;
		const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;

		const getAntiDelete  = () => isJadibot
			? getJadibotAntidel(jadibotNum)
			: (loadConfig().antiDelete || { enabled: false, privateChat: false, groupChat: false, sendTo: 'self' });

		const saveAntiDelete = (newVal) => {
			if (isJadibot) setJadibotUserSetting(jadibotNum, 'antidel', newVal);
			else { const cfg = loadConfig(); cfg.antiDelete = newVal; saveConfig(cfg); }
		};

		const antiDelete = getAntiDelete();
		const args       = query ? query.toLowerCase().split(' ') : [];
		const sendTo     = antiDelete.sendTo || 'self';
		const jadibotNote = isJadibot ? `\n_⚙️ Setting khusus jadibot +${jadibotNum}_` : '';

		const sendToLabel = {
			self: '📲 Saved Messages (bot)',
			chat: '💬 Chat / Grup Asal',
			both: '📲 Saved Messages + 💬 Chat Asal'
		};

		if (args.length === 0) {
			const text =
				`╔═══════════════════════╗\n║  🗑️  *ANTI DELETE*  🗑️  ║\n╚═══════════════════════╝\n\n` +
				`📊 *Status:* ${antiDelete.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n` +
				`💬 *Private Chat:* ${antiDelete.privateChat ? '✅' : '❌'}\n` +
				`👥 *Group Chat:* ${antiDelete.groupChat ? '✅' : '❌'}\n` +
				`📤 *Kirim ke:* ${sendToLabel[sendTo] || sendToLabel.self}\n\n` +
				`📋 *Perintah:*\n` +
				`• *.antidel on/off* — Aktifkan/nonaktifkan\n` +
				`• *.antidel private on/off* — Untuk chat pribadi\n` +
				`• *.antidel group on/off* — Untuk grup\n` +
				`• *.antidel all on/off* — Private + Group\n` +
				`• *.antidel sendto self* — Kirim ke saved messages bot\n` +
				`• *.antidel sendto chat* — Kirim balik ke chat/grup asal\n` +
				`• *.antidel sendto both* — Kirim ke keduanya\n\n` +
				`📦 *Didukung:* Teks, Gambar, Video, Audio, Sticker, Dokumen` +
				jadibotNote;
			await tolak(hisoka, m, text);
			return;
		}

		if (args[0] === 'on') {
			if (antiDelete.enabled) await tolak(hisoka, m, 'ℹ️ Anti Delete sudah aktif.');
			else {
				saveAntiDelete({ ...antiDelete, enabled: true });
				await tolak(hisoka, m,
					`✅ *Anti Delete diaktifkan!*\n\n📤 Pesan dihapus akan dikirim ke:\n*${sendToLabel[sendTo] || sendToLabel.self}*\n\n💡 Atur tujuan dengan: *.antidel sendto self/chat/both*` + jadibotNote
				);
			}
		} else if (args[0] === 'off') {
			if (!antiDelete.enabled) await tolak(hisoka, m, 'ℹ️ Anti Delete sudah nonaktif.');
			else { saveAntiDelete({ ...antiDelete, enabled: false }); await tolak(hisoka, m, '✅ *Anti Delete dinonaktifkan.*' + jadibotNote); }
		} else if (args[0] === 'private' && args[1]) {
			const enabled = args[1] === 'on';
			saveAntiDelete({ ...antiDelete, privateChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Anti Delete *Private Chat* ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.` + jadibotNote);
		} else if (args[0] === 'group' && args[1]) {
			const enabled = args[1] === 'on';
			saveAntiDelete({ ...antiDelete, groupChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Anti Delete *Group Chat* ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.` + jadibotNote);
		} else if (args[0] === 'all' && args[1]) {
			const enabled = args[1] === 'on';
			saveAntiDelete({ ...antiDelete, privateChat: enabled, groupChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Anti Delete *Private + Group* ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.` + jadibotNote);
		} else if (args[0] === 'sendto' && args[1]) {
			const valid = ['self', 'chat', 'both'];
			const val   = args[1];
			if (!valid.includes(val)) {
				await tolak(hisoka, m,
					`❌ Nilai tidak valid!\n\nGunakan salah satu:\n• *.antidel sendto self* — Kirim ke saved messages bot\n• *.antidel sendto chat* — Kirim balik ke chat/grup asal\n• *.antidel sendto both* — Kirim ke keduanya`
				);
				return;
			}
			saveAntiDelete({ ...antiDelete, sendTo: val });
			await tolak(hisoka, m,
				`✅ *Tujuan pengiriman anti delete diubah!*\n\n📤 Sekarang dikirim ke:\n*${sendToLabel[val]}*\n\n` +
				`${val === 'chat' ? '⚠️ Semua orang di grup/chat bisa melihat pesan yang dihapus.' : ''}` + jadibotNote
			);
		} else {
			await tolak(hisoka, m, `❌ Perintah tidak valid.\nKetik *.antidel* untuk melihat bantuan.`);
		}
		logCommand(m, hisoka, 'antidel');
	} catch (error) {
		console.error('\x1b[31m[AntiDelete] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
	}
}

module.exports = { handleAd };
