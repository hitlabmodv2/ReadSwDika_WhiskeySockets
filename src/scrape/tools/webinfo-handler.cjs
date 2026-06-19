'use strict';

async function handleWebinfo({ hisoka, m, query, tolak, logCommand, path, _require }) {
	try {
		const { screenshotWeb, checkWebStatus } = _require(path.resolve('./src/scrape/tools/screenshot.cjs'));
		const targetUrl = (query || '').trim();
		if (!targetUrl) {
			await tolak(hisoka, m,
				`╭═══『 📸 *SS Web* 』═══╮\n│\n│ Screenshot + cek status website realtime!\n│\n│ *Cara Pakai:*\n│ *.ssweb* example.com\n│\n│ *Contoh:*\n│ *.ssweb* kusonime.com\n│ *.ssweb* https://kusonime.com\n│\n│ ℹ️ Dengan atau tanpa https:// bisa!\n│\n╰══════════════════════════╯`
			);
			return;
		}

		await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
		const loadMsg = await hisoka.sendMessage(m.from, {
			text:
				`╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *Target:* ${targetUrl}\n│\n│ 🔍 *Step 1/2:* Mengecek status website...\n│ ⏳ Mohon tunggu sebentar\n│\n╰══════════════════════════╯`
		}, { quoted: m }).catch(() => null);

		const _edit = async (txt) => {
			if (!loadMsg?.key) return;
			try { await hisoka.sendMessage(m.from, { text: txt, edit: loadMsg.key }); } catch (_) {}
		};

		const status    = await checkWebStatus(targetUrl);
		const pingEmoji = !status.online ? '🔴' : status.responseTime < 500 ? '🟢' : status.responseTime < 1500 ? '🟡' : '🔴';
		const statusLine = status.online ? status.statusText : `Offline / ${status.error || 'Tidak dapat dijangkau'}`;

		await _edit(
			`╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *Target:* ${status.url}\n│\n│ ✅ *Step 1/2:* Status OK\n│ 📊 *Status:* ${statusLine}\n│ ${pingEmoji} *Ping:* ${status.responseTime}ms\n` +
			(status.title ? `│ 📌 *Judul:* ${status.title}\n` : '') +
			`│\n│ 📸 *Step 2/2:* Mengambil screenshot...\n│ ⏳ Proses ~10-20 detik\n│\n╰══════════════════════════╯`
		);

		await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });
		const imgBuffer = await screenshotWeb(targetUrl);

		await _edit(
			`╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *Target:* ${status.url}\n│\n│ ✅ *Step 1/2:* Status OK\n│ 📊 *Status:* ${statusLine}\n│ ${pingEmoji} *Ping:* ${status.responseTime}ms\n` +
			(status.title ? `│ 📌 *Judul:* ${status.title}\n` : '') +
			`│\n│ ✅ *Step 2/2:* Screenshot selesai!\n│ 📤 Mengirim hasil...\n│\n╰══════════════════════════╯`
		);

		let caption = `╭═══『 📸 *SS Web* 』═══╮\n│\n│ 🌐 *URL:* ${status.url}\n│ 📊 *Status:* ${statusLine}\n│ ${pingEmoji} *Ping:* ${status.responseTime}ms\n│\n`;
		if (status.title)       caption += `│ 📌 *Judul:* ${status.title}\n`;
		if (status.description) caption += `│ 📝 *Desc:* ${status.description.substring(0, 120)}\n`;
		caption += `│\n╰══════════════════════════╯`;

		await hisoka.sendMessage(m.from, { image: imgBuffer, caption }, { quoted: m });
		if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'ssweb');
	} catch (error) {
		console.error('\x1b[31m[SSWEB] Error:\x1b[39m', error.message);
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
		await tolak(hisoka, m, `❌ Gagal SS Web: ${error.message}`);
	}
}

module.exports = { handleWebinfo };
