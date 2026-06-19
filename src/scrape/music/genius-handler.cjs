'use strict';

async function handleCarilagu({ hisoka, m, query, tolak, logCommand, logError, _require, path }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';
		if (!input) {
			await tolak(hisoka, m,
				`╭─「 🎵 *GENIUS SEARCH* 」\n│\n│ Cari info lagu dari Genius.\n│\n│ *Contoh:*\n│ • ${pfx}genius lucid dreams\n│ • ${pfx}genius eminem lose yourself\n│ • ${pfx}geniusdetail 11513410\n╰────────────────────`
			);
			return;
		}
		const { geniusSearch, formatGeniusSearch } = _require(path.resolve('./src/scrape/music/genius.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔎', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🔎 Mencari lagu *${input}* di Genius...`);
		const results = await geniusSearch(input);
		const report  = formatGeniusSearch(results, input, pfx);
		if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }
		await tolak(hisoka, m, report);
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'genius');
	} catch (error) {
		console.error('\x1b[31m[Genius] Error:\x1b[39m', error.message);
		logError(error, 'command:genius');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m, `❌ Gagal mencari lagu.\n\n_${error.message}_\n\nContoh: *.genius lucid dreams*`);
	}
}

async function handleDetailgenius({ hisoka, m, query, tolak, logCommand, logError, _require, path }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';
		if (!input || isNaN(Number(input))) {
			await tolak(hisoka, m,
				`╭─「 🎼 *GENIUS DETAIL* 」\n│\n│ Ambil detail lagu pakai ID Genius.\n│\n│ *Contoh:*\n│ • ${pfx}geniusdetail 11513410\n│ • ${pfx}genius lucid dreams\n╰────────────────────`
			);
			return;
		}
		const { geniusDetail, formatGeniusDetail } = _require(path.resolve('./src/scrape/music/genius.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🎼', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🎼 Mengambil detail lagu ID *${input}*...`);
		const result = await geniusDetail(input);
		const report = formatGeniusDetail(result);
		if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }
		let sent = false;
		if (result.image) {
			try {
				await hisoka.sendMessage(m.from, { image: { url: result.image }, caption: report }, { quoted: m });
				sent = true;
			} catch (_) {}
		}
		if (!sent) await tolak(hisoka, m, report);
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'geniusdetail');
	} catch (error) {
		console.error('\x1b[31m[GeniusDetail] Error:\x1b[39m', error.message);
		logError(error, 'command:geniusdetail');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m, `❌ Gagal mengambil detail lagu.\n\n_${error.message}_\n\nContoh: *.geniusdetail 11513410*`);
	}
}

module.exports = { handleCarilagu, handleDetailgenius };
