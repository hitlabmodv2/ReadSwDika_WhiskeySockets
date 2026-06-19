'use strict';
const nodePath = require('path');
const nodeFs   = require('fs');

async function handleSetpairing({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	const spQuery = (query || '').trim().toLowerCase();
	if (!spQuery) {
		const spCfg     = loadConfig();
		const spCurrent = spCfg.jadibotPairingMode || 'v2';
		await tolak(hisoka, m,
			`╔══════════════════════╗\n║  ⚙️  *PAIRING MODE*   ║\n╚══════════════════════╝\n\n` +
			`📌 *Mode aktif sekarang:* *${spCurrent.toUpperCase()}*\n\n` +
			`📋 *Pilihan mode:*\n` +
			`• *.setpairing v1* → Kode & notif tampil di *GC* (tidak ke nomor tujuan)\n` +
			`• *.setpairing v2* → Kode & notif dikirim ke *private nomor tujuan*\n\n` +
			`💡 Contoh: _.setpairing v1_`
		);
		return;
	}
	if (spQuery !== 'v1' && spQuery !== 'v2') {
		await tolak(hisoka, m, `❌ *Mode tidak valid!*\n\nGunakan:\n• *.setpairing v1* → kode ke GC/owner\n• *.setpairing v2* → kode ke nomor tujuan`);
		return;
	}
	const spCfg = loadConfig();
	spCfg.jadibotPairingMode = spQuery;
	saveConfig(spCfg);
	const spDesc = spQuery === 'v1'
		? 'Kode & notif tampil di GC — tidak dikirim ke nomor tujuan'
		: 'Kode & notif dikirim langsung ke private nomor tujuan';
	await tolak(hisoka, m,
		`╔══════════════════════╗\n║  ✅  *PAIRING MODE*   ║\n╚══════════════════════╝\n\n` +
		`🔄 *Mode diperbarui ke: ${spQuery.toUpperCase()}*\n\n📌 ${spDesc}\n\n_Berlaku untuk jadibot berikutnya._`
	);
	logCommand(m, hisoka, 'setpairing');
}

async function handleJadibotmenu({ hisoka, m, tolak, logCommand, loadConfig }) {
	if (!m.prefix && m.query) return;
	hisoka.sendMessage(m.from, { react: { text: `🤖`, key: m.key } });
	const jadibotTeks =
`╭─「 🤖 *JADIBOT* 」
│
├➤ *.jadibot [nomor] [durasi]*
│
├➤ *.stopbot [nomor]*
│
├➤ *.listbot*
│
╰➤ *.setpairing v1/v2*

`;
	const imgPath = nodePath.join(process.cwd(), 'image', 'menu1.jpg');
	if (nodeFs.existsSync(imgPath)) {
		await hisoka.sendMessage(m.from, { image: nodeFs.readFileSync(imgPath), caption: jadibotTeks }, { quoted: m });
	} else {
		await hisoka.sendMessage(m.from, { text: jadibotTeks }, { quoted: m });
	}
	logCommand(m, hisoka, 'jadibotmenu');
}

async function handleAddEmoji({ hisoka, m, query, tolak, logCommand, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	if (!query || !query.toLowerCase().startsWith('emoji')) return;
	try {
		const { addEmojis, listEmojis } = await import('../helper/emoji.js');
		const emojiInput = query.replace(/^emoji\s*/i, '').trim();
		if (!emojiInput) { await tolak(hisoka, m, `❌ Format: add emoji 😊,😄,😁\n\nContoh:\nadd emoji 😊\nadd emoji 😊,😄,😁`); return; }
		const emojisToAdd = emojiInput.split(',').map(e => e.trim()).filter(e => e);
		if (!emojisToAdd.length) { await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk ditambahkan'); return; }
		const results = addEmojis(emojisToAdd);
		const newList = listEmojis();
		let response = `╭═══『 *ADD EMOJI* 』═══╮\n│\n`;
		if (results.added.length > 0) response += `│ ✅ *Berhasil (${results.added.length}):* ${results.added.join(',')}\n`;
		if (results.alreadyExists.length > 0) response += `│ ⚠️ *Sudah ada (${results.alreadyExists.length}):* ${results.alreadyExists.join(',')}\n`;
		response += `│\n│ 📊 *Total:* ${newList.count} emoji\n│ *Daftar:* ${newList.emojis.join(',')}\n╰═════════════════╯`;
		await tolak(hisoka, m, response);
		logCommand(m, hisoka, 'add emoji');
	} catch (error) {
		console.error('\x1b[31m[AddEmoji] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

async function handleListEmoji({ hisoka, m, query, tolak, logCommand, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	if (!query || !query.toLowerCase().startsWith('emoji')) return;
	try {
		const { listEmojis } = await import('../helper/emoji.js');
		const data = listEmojis();
		let response = `╭═══『 *LIST EMOJI* 』═══╮\n│\n│ 📊 *Total:* ${data.count} emoji\n│\n`;
		if (data.emojis.length > 0) response += `│ *Daftar:* ${data.emojis.join(',')}\n`;
		else response += `│ ❌ Belum ada emoji tersimpan\n`;
		response += `│\n│ *Command:*\n│ add emoji 😊,😄\n│ del emoji 😊,😄\n╰═════════════════╯`;
		await tolak(hisoka, m, response);
		logCommand(m, hisoka, 'list emoji');
	} catch (error) {
		console.error('\x1b[31m[ListEmoji] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleSetpairing, handleJadibotmenu, handleAddEmoji, handleListEmoji };
