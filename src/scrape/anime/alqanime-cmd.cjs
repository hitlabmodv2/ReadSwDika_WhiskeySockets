'use strict';

async function handleAlqupdate({ hisoka, m, tolak, logCommand, logError, _require, path, getJadibotChoiceKey, pendingAlqUpdateChoices }) {
	if (!m.prefix && m.query) return;
	try {
		const _alqPath2 = path.resolve('./src/scrape/anime/alqanime.cjs');
		delete _require.cache[_alqPath2];
		const { getLatestAlqanime } = _require(_alqPath2);

		await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
		await tolak(hisoka, m, `📺 Mengambil rilisan terbaru Alqanime...`);

		const items = await getLatestAlqanime();

		if (!items.length) {
			await tolak(hisoka, m, `❌ Gagal ambil data terbaru.`);
			return;
		}

		const showItems = items.slice(0, 15);
		let text = `🎌 *Rilisan Terbaru — Alqanime*\n`;
		text += `━━━━━━━━━━━━━━━━━━━\n`;
		showItems.forEach((a, i) => {
			text += `${i + 1}. ${a.title}\n`;
		});
		text += `━━━━━━━━━━━━━━━━━━━\n`;
		text += `🌐 alqanime.net\n\n`;
		text += `📌 *Reply pesan ini:*\n`;
		text += `• *1* — lihat episode & pilih resolusi\n`;
		text += `• *1 720p* — langsung download ep terbaru 720p\n`;
		text += `• *batal* — batalkan\n`;
		text += `⏳ Menu berlaku *5 menit*`;

		const updMenuMsg = await hisoka.sendMessage(m.from, { text }, { quoted: m });
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

		const alqUpdKey2 = getJadibotChoiceKey(m);
		const oldUpd = pendingAlqUpdateChoices.get(alqUpdKey2);
		if (oldUpd?.timeout) clearTimeout(oldUpd.timeout);
		const updTimeout = setTimeout(() => pendingAlqUpdateChoices.delete(alqUpdKey2), 5 * 60 * 1000);
		pendingAlqUpdateChoices.set(alqUpdKey2, {
			items: showItems,
			botMsgId: updMenuMsg?.key?.id || '',
			expiresAt: Date.now() + 5 * 60 * 1000,
			timeout: updTimeout,
		});

	} catch (err) {
		console.error('[ALQUPDATE] Error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqanimeupdate');
		await tolak(hisoka, m, `❌ Gagal ambil update Alqanime.\n💬 ${err?.message?.slice(0, 100) || 'Coba lagi nanti'}`);
	}
}

module.exports = { handleAlqupdate };
