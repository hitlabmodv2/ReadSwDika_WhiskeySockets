'use strict';

async function handleEmojidefault({ hisoka, m, tolak, logCommand, getJadibotNumber, resetToDefaultEmojis }) {
	if (hisoka?.isMainBot !== false) return;
	if (!m.prefix && m.query) return;
	try {
		const _jbNum = getJadibotNumber(hisoka);
		const count = resetToDefaultEmojis(_jbNum);
		let response = `╭═══『 *DEFAULT EMOJI* 』═══╮\n│\n`;
		response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
		response += `│ ✅ Mode diubah ke *Default*\n`;
		response += `│\n│ 🌐 Reaksi SW sekarang pakai\n`;
		response += `│ emoji dari *bot utama* (${count} emoji)\n`;
		response += `│\n│ 💡 Ketik *.emojicustom* untuk\n`;
		response += `│ balik ke emoji kamu sendiri\n│\n`;
		response += `│ *.emojilist* — cek daftar emoji\n`;
		response += `╰═════════════════════╯`;
		await tolak(hisoka, m, response);
		logCommand(m, hisoka, 'emojidefault');
	} catch (error) {
		console.error('\x1b[31m[EmojiDefault] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `❌ Error: ${error.message}`);
	}
}

async function handleEmojicustom({ hisoka, m, tolak, logCommand, getJadibotNumber, setCustomEmojiMode, listJadibotEmojis }) {
	if (hisoka?.isMainBot !== false) return;
	if (!m.prefix && m.query) return;
	try {
		const _jbNum = getJadibotNumber(hisoka);
		setCustomEmojiMode(_jbNum);
		const data = listJadibotEmojis(_jbNum);
		let response = `╭═══『 *CUSTOM EMOJI* 』═══╮\n│\n`;
		response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
		response += `│ ✅ Mode diubah ke *Custom*\n`;
		response += `│\n│ 🎨 Reaksi SW sekarang pakai\n`;
		response += `│ emoji dari *file kamu sendiri*\n`;
		response += `│ (${data.count} emoji tersimpan)\n`;
		response += `│\n│ 💡 Atur emoji kamu:\n`;
		response += `│ .emojiadd 😊,😄 — tambah\n`;
		response += `│ .emojidel 😊 — hapus\n`;
		response += `│ .emojiclear — reset ke seed WA\n`;
		response += `│ .emojilist — lihat daftar\n`;
		response += `│ .emojidefault — balik ke default\n`;
		response += `╰═════════════════════╯`;
		await tolak(hisoka, m, response);
		logCommand(m, hisoka, 'emojicustom');
	} catch (error) {
		console.error('\x1b[31m[EmojiCustom] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `❌ Error: ${error.message}`);
	}
}

async function handleEmojiclear({ hisoka, m, tolak, logCommand, getJadibotNumber, clearJadibotEmojis }) {
	if (hisoka?.isMainBot !== false) return;
	if (!m.prefix && m.query) return;
	try {
		const _jbNum = getJadibotNumber(hisoka);
		const seedEmojis = clearJadibotEmojis(_jbNum);
		let response = `╭═══『 *CLEAR EMOJI* 』═══╮\n│\n`;
		response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
		response += `│ ✅ Emoji berhasil di-reset!\n│\n`;
		response += `│ 💚 Sekarang pakai *1 emoji* seed WA:\n`;
		response += `│ ${seedEmojis.join(' ')}\n│\n`;
		response += `│ ⚙️ Mode otomatis: *Custom*\n│\n`;
		response += `│ 💡 Tambah emoji kamu sendiri:\n`;
		response += `│ .emojiadd 😊,😄,😁\n│\n`;
		response += `│ Balik ke 1900 emoji bot utama:\n`;
		response += `│ .emojidefault\n`;
		response += `╰═════════════════════╯`;
		await tolak(hisoka, m, response);
		logCommand(m, hisoka, 'emojiclear');
	} catch (error) {
		console.error('\x1b[31m[ClearEmoji] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `❌ Error: ${error.message}`);
	}
}

module.exports = { handleEmojidefault, handleEmojicustom, handleEmojiclear };
