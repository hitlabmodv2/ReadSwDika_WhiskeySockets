'use strict';

async function handleDel({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet }) {
	if (!m.prefix && m.query) return;

	if (m.isQuoted && !query) {
		try {
			const quotedKey = m.quoted.key;
			const isOwnMessage = quotedKey.fromMe === true;

			if (m.isGroup) {
				const botAdminData = kvGet('botadmin/botadmin', {});
				const isBotGroupAdmin = botAdminData[m.from] === true;

				if (!isOwnMessage && !isBotGroupAdmin) {
					await tolak(hisoka, m, '❌ Bot bukan admin di grup ini!\nHanya bisa hapus pesan bot sendiri.');
					return;
				}
			} else {
				if (!isOwnMessage) {
					await tolak(hisoka, m, '❌ Hanya bisa hapus pesan bot sendiri di chat pribadi.');
					return;
				}
			}

			const deleteKey = {
				remoteJid: m.from,
				fromMe: quotedKey.fromMe,
				id: quotedKey.id,
				...(m.isGroup && quotedKey.participant ? { participant: quotedKey.participant } : {}),
			};
			await hisoka.sendMessage(m.from, { delete: deleteKey });
			try { await hisoka.sendMessage(m.from, { delete: m.key }); } catch (_) {}
		} catch (error) {
			await tolak(hisoka, m, `❌ Gagal menghapus pesan: ${error.message}`);
		}
		return;
	}

	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	if (!query || !query.toLowerCase().startsWith('emoji')) return;
	try {
		const { deleteEmojis, listEmojis } = await import('../helper/emoji.js');
		
		const emojiInput = query.replace(/^emoji\s*/i, '').trim();
		
		if (!emojiInput) {
			await tolak(hisoka, m, `❌ Format: del emoji 😊,😄\n\nContoh:\ndel emoji 😊\ndel emoji 😊,😄,😁`);
			return;
		}

		const emojisToDelete = emojiInput.split(',').map(e => e.trim()).filter(e => e);
		
		if (emojisToDelete.length === 0) {
			await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
			return;
		}

		const results = deleteEmojis(emojisToDelete);
		const newList = listEmojis();
		
		let response = `╭═══『 *DEL EMOJI* 』═══╮\n│\n`;

		if (results.deleted.length > 0) {
			response += `│ ✅ *Dihapus (${results.deleted.length}):* ${results.deleted.join(',')}\n`;
		}

		if (results.notFound.length > 0) {
			response += `│ ⚠️ *Tidak ada (${results.notFound.length}):* ${results.notFound.join(',')}\n`;
		}

		response += `│\n│ 📊 *Sisa:* ${newList.count} emoji\n`;
		if (newList.emojis.length > 0) {
			response += `│ *Daftar:* ${newList.emojis.join(',')}\n`;
		}
		response += `╰═════════════════╯`;
		
		await tolak(hisoka, m, response);
		logCommand(m, hisoka, 'del emoji');
	} catch (error) {
		console.error('\x1b[31m[DelEmoji] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleDel };
