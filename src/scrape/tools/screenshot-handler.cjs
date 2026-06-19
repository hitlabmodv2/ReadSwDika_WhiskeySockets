'use strict';
const nodePath = require('path');

async function handleScreenshot({ hisoka, m, query, tolak, logCommand, _require }) {
	try {
		const { screenshotWeb } = _require(nodePath.resolve('./src/scrape/tools/screenshot.cjs'));
		const targetUrl = query || '';
		if (!targetUrl) {
			await tolak(hisoka, m,
				`╭═══『 📸 *Screenshot Web* 』═══╮\n│\n` +
				`│ Ambil screenshot tampilan website!\n│\n` +
				`│ *Cara Pakai:*\n│ *.ss* https://example.com\n│\n` +
				`│ *Contoh:*\n│ *.ss* https://kusonime.com\n│\n` +
				`╰══════════════════════════╯`
			);
			return;
		}
		await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
		await tolak(hisoka, m, `⏳ Sedang mengambil screenshot *${targetUrl}*...\nMohon tunggu sebentar.`);
		const imgBuffer = await screenshotWeb(targetUrl);
		await hisoka.sendMessage(m.from, {
			image: imgBuffer,
			caption: `╭═══『 📸 *Screenshot Web* 』═══╮\n│\n│ 🌐 *URL:* ${targetUrl}\n│ ✅ Screenshot berhasil diambil!\n│\n╰══════════════════════════╯`
		}, { quoted: m });
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'ss');
	} catch (error) {
		console.error('\x1b[31m[SS] Error:\x1b[39m', error.message);
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
		await tolak(hisoka, m, `❌ Gagal screenshot: ${error.message}`);
	}
}

module.exports = { handleScreenshot };
