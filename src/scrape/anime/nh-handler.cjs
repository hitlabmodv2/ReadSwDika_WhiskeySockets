'use strict';

async function handleNh({ hisoka, m, query, tolak, logError, _require, path }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';
		if (!input) {
			await tolak(hisoka, m,
				`╭─「 📖 *NHENTAI* 」\n│\n│ *Search:*\n│ ${pfx}nh <judul/tag>\n│ ${pfx}nh naruto\n│ ${pfx}nh english translated\n│\n│ *Random:*\n│ ${pfx}nh random\n│ ${pfx}nhrand\n│\n│ *Download PDF:*\n│ ${pfx}nhget <id>\n│ ${pfx}nhget <id> <hal>\n│ ${pfx}nhdl random\n╰──────────────────────`
			);
			return;
		}
		const { nhentaiSearch, nhentaiRandom, nhentaiCover, formatSearchResults, formatGalleryInfo } = _require(path.resolve('./src/scrape/anime/nhentai.cjs'));
		if (input.toLowerCase() === 'random') {
			await hisoka.sendMessage(m.from, { react: { text: '🎲', key: m.key } });
			await tolak(hisoka, m, `🎲 Mengambil doujin random...`);
			const gallery = await nhentaiRandom();
			const infoText = formatGalleryInfo(gallery, pfx);
			const coverBuf = await nhentaiCover(gallery).catch(() => null);
			if (coverBuf) {
				await hisoka.sendMessage(m.from, { image: coverBuf, caption: infoText }, { quoted: m });
			} else {
				await tolak(hisoka, m, infoText);
			}
			await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		} else {
			await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
			await tolak(hisoka, m, `🔍 Mencari *${input}* di nhentai...`);
			const results = await nhentaiSearch(input);
			await tolak(hisoka, m, formatSearchResults(results, input));
			await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		}
	} catch (err) {
		console.error('[NH] Search error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'nhentai-search');
		await tolak(hisoka, m, `❌ Gagal nhentai.\n💬 ${err?.message || 'Coba lagi nanti'}`);
	}
}

module.exports = { handleNh };
